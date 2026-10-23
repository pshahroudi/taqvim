import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { delay, launchChrome } from "./cdp.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(rootDir, "store-assets/screenshots");
const profileDir = await mkdtemp(join(tmpdir(), "taqvim-store-capture-"));
const manifest = JSON.parse(
  await readFile(resolve(rootDir, "manifest.json"), "utf8"),
);

const CHROME_API_MOCK = `
  (() => {
    const stores = { sync: {}, local: {} };
    const listeners = [];

    function makeArea(name) {
      return {
        async get(keys) {
          const store = stores[name];
          if (keys == null) return { ...store };
          if (typeof keys === "string") return { [keys]: store[keys] };
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, store[key]]));
          }
          return Object.fromEntries(
            Object.entries(keys).map(([key, fallback]) => [
              key,
              store[key] === undefined ? fallback : store[key],
            ]),
          );
        },
        async set(values) {
          Object.assign(stores[name], values);
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            delete stores[name][key];
          }
        },
      };
    }

    globalThis.chrome = {
      storage: {
        sync: makeArea("sync"),
        local: makeArea("local"),
        onChanged: {
          addListener(listener) {
            listeners.push(listener);
          },
        },
      },
      runtime: {
        getManifest() {
          return { version: ${JSON.stringify(manifest.version)} };
        },
        getURL(path) {
          return new URL(path, new URL("../", location.href)).href;
        },
        async openOptionsPage() {},
      },
    };
  })();
`;

const POPUP_CAPTURE_CSS = `
  html,
  body {
    width: 1280px !important;
    min-width: 1280px !important;
    max-width: 1280px !important;
    height: 800px !important;
    min-height: 800px !important;
    max-height: 800px !important;
  }

  body {
    display: grid !important;
    place-items: center !important;
    overflow: hidden !important;
    background:
      radial-gradient(circle at 14% 12%, rgba(90, 162, 255, 0.28), transparent 28%),
      radial-gradient(circle at 88% 86%, rgba(247, 185, 40, 0.16), transparent 24%),
      linear-gradient(135deg, #eaf2ff 0%, #f7f9fc 58%, #e9eef7 100%) !important;
  }

  :root.dark body {
    background:
      radial-gradient(circle at 14% 12%, rgba(90, 162, 255, 0.24), transparent 28%),
      radial-gradient(circle at 88% 86%, rgba(247, 185, 40, 0.1), transparent 24%),
      linear-gradient(135deg, #0b1220 0%, #111a29 58%, #172236 100%) !important;
  }

  .app-shell {
    width: 720px !important;
    height: 560px !important;
    overflow: hidden !important;
    border: 1px solid rgba(23, 58, 112, 0.14) !important;
    border-radius: 24px !important;
    box-shadow: 0 30px 80px rgba(20, 43, 82, 0.24) !important;
  }

  :root.dark .app-shell {
    border-color: rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.42) !important;
  }
`;

const OPTIONS_CAPTURE_CSS = `
  html,
  body {
    width: 1280px !important;
    min-width: 1280px !important;
    height: 800px !important;
    min-height: 800px !important;
    overflow: hidden !important;
  }

  body {
    background:
      radial-gradient(circle at 10% 8%, rgba(90, 162, 255, 0.2), transparent 24%),
      linear-gradient(135deg, #eaf2ff 0%, #f7f9fc 62%, #edf1f7 100%) !important;
  }

  .page {
    padding-top: 22px !important;
  }
`;

function inspectPng(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("Captured file is not a PNG.");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function createPage(client, url, initScript = "") {
  const { targetId } = await client.send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await client.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  if (initScript) {
    await client.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: initScript },
      sessionId,
    );
  }
  await client.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1280,
      screenHeight: 800,
    },
    sessionId,
  );
  await client.send("Page.navigate", { url }, sessionId);

  return { targetId, sessionId };
}

async function evaluate(client, sessionId, expression, awaitPromise = false) {
  const result = await client.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    },
    sessionId,
  );

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Page evaluation failed.",
    );
  }

  return result.result?.value;
}

async function waitForPage(client, sessionId, readyExpression) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(
      client,
      sessionId,
      `document.readyState === "complete" && Boolean(${readyExpression})`,
    ).catch(() => false);

    if (ready) {
      await evaluate(
        client,
        sessionId,
        "document.fonts?.ready || Promise.resolve()",
        true,
      );
      return;
    }

    await delay(100);
  }

  const diagnostic = await evaluate(
    client,
    sessionId,
    `({
      href: location.href,
      title: document.title,
      readyState: document.readyState,
      body: document.body?.innerText?.slice(0, 240)
    })`,
  ).catch(() => null);

  throw new Error(
    `Extension page did not become ready for capture. ${JSON.stringify(diagnostic)}`,
  );
}

async function setCaptureCss(client, sessionId, css) {
  await evaluate(
    client,
    sessionId,
    `(() => {
      let style = document.getElementById("taqvim-store-capture-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "taqvim-store-capture-style";
        document.head.append(style);
      }
      style.textContent = ${JSON.stringify(css)};
      return true;
    })()`,
  );
}

async function capture(client, sessionId, filename) {
  await evaluate(
    client,
    sessionId,
    `new Promise((resolve) => {
      setTimeout(
        () => requestAnimationFrame(() => requestAnimationFrame(resolve)),
        400,
      );
    })`,
    true,
  );

  const { data } = await client.send(
    "Page.captureScreenshot",
    {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    },
    sessionId,
  );
  const buffer = Buffer.from(data, "base64");
  const png = inspectPng(buffer);

  if (png.width !== 1280 || png.height !== 800) {
    throw new Error(
      `${filename} is ${png.width}x${png.height}; expected 1280x800.`,
    );
  }

  await writeFile(resolve(outputDir, filename), buffer);
  console.log(`Captured store-assets/screenshots/${filename}.`);
}

const { client, close } = await launchChrome(profileDir, [
  "--allow-file-access-from-files",
  "--disable-web-security",
  "--window-size=1280,800",
]);

try {
  await mkdir(outputDir, { recursive: true });
  const popupUrl = pathToFileURL(resolve(rootDir, "popup/popup.html")).href;
  const optionsUrl = pathToFileURL(resolve(rootDir, "options/options.html")).href;

  const popup = await createPage(client, popupUrl, CHROME_API_MOCK);
  await waitForPage(
    client,
    popup.sessionId,
    'document.querySelector(".app-shell") && document.querySelector("#selectedJalali")?.textContent.trim()',
  );
  const invalidPatterns = await evaluate(
    client,
    popup.sessionId,
    `Array.from(document.querySelectorAll("input[pattern]")).flatMap((input) => {
      try {
        new RegExp(input.pattern, "v");
        return [];
      } catch (error) {
        return [{ id: input.id, pattern: input.pattern, error: error.message }];
      }
    })`,
  );
  if (invalidPatterns.length > 0) {
    throw new Error(`Invalid HTML input patterns: ${JSON.stringify(invalidPatterns)}`);
  }
  await setCaptureCss(client, popup.sessionId, POPUP_CAPTURE_CSS);

  await evaluate(
    client,
    popup.sessionId,
    `(() => {
      document.documentElement.classList.remove("dark");
      document.getElementById("calendarTab")?.click();
      if (!document.getElementById("miniDatePicker")?.classList.contains("hidden")) {
        document.getElementById("miniPickerClose")?.click();
      }
      return true;
    })()`,
  );
  await capture(client, popup.sessionId, "01-calendar-light-1280x800.png");

  await evaluate(
    client,
    popup.sessionId,
    `(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (document.getElementById("themeToggle")?.title === "Theme: dark") break;
        document.getElementById("themeToggle")?.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      document.getElementById("calendarTab")?.click();
      return true;
    })()`,
    true,
  );
  await capture(client, popup.sessionId, "02-calendar-dark-1280x800.png");

  await evaluate(
    client,
    popup.sessionId,
    `(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (document.getElementById("themeToggle")?.title === "Theme: light") break;
        document.getElementById("themeToggle")?.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      document.getElementById("convertTab")?.click();
      document.getElementById("convertUseToday")?.click();
      return true;
    })()`,
    true,
  );
  await capture(client, popup.sessionId, "03-date-converter-1280x800.png");

  await evaluate(
    client,
    popup.sessionId,
    `(() => {
      document.documentElement.classList.remove("dark");
      document.getElementById("calendarTab")?.click();
      if (document.getElementById("miniDatePicker")?.classList.contains("hidden")) {
        document.getElementById("datePickerToggle")?.click();
      }
      return true;
    })()`,
  );
  await capture(client, popup.sessionId, "04-date-picker-1280x800.png");

  const options = await createPage(client, optionsUrl, CHROME_API_MOCK);
  await waitForPage(client, options.sessionId, 'document.querySelector(".page")');
  await setCaptureCss(client, options.sessionId, OPTIONS_CAPTURE_CSS);
  await evaluate(
    client,
    options.sessionId,
    `(() => {
      document.documentElement.classList.remove("dark");
      window.scrollTo(0, 0);
      return true;
    })()`,
  );
  await capture(client, options.sessionId, "05-settings-1280x800.png");

  const storeIcon = inspectPng(
    await readFile(resolve(rootDir, "store-assets/taqvim-store-icon-128.png")),
  );
  if (storeIcon.width !== 128 || storeIcon.height !== 128) {
    throw new Error("Store icon must be 128x128.");
  }
} finally {
  await close();
  await rm(profileDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}
