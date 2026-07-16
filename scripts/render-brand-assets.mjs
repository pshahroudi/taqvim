import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const renders = [
  {
    source: "design/icons/render-toolbar.html",
    output: "assets/icons/icon16.png",
    width: 16,
    height: 16,
    transparent: true,
  },
  {
    source: "design/icons/render-toolbar.html",
    output: "assets/icons/icon32.png",
    width: 32,
    height: 32,
    transparent: true,
  },
  {
    source: "design/icons/render-icon.html",
    output: "assets/icons/icon48.png",
    width: 48,
    height: 48,
    transparent: true,
  },
  {
    source: "design/icons/taqvim-icon.svg",
    output: "assets/icons/icon128.png",
    width: 128,
    height: 128,
    transparent: true,
  },
  {
    source: "design/store/promo-small.svg",
    output: "store-assets/taqvim-small-promo-440x280.png",
    width: 440,
    height: 280,
    transparent: false,
  },
  {
    source: "design/store/promo-marquee.svg",
    output: "store-assets/taqvim-marquee-1400x560.png",
    width: 1400,
    height: 560,
    transparent: false,
  },
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : null,
    process.platform === "win32"
      ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      : null,
    process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : null,
    process.platform === "linux" ? "/usr/bin/google-chrome" : null,
    process.platform === "linux" ? "/usr/bin/google-chrome-stable" : null,
    process.platform === "linux" ? "/usr/bin/chromium" : null,
  ].filter(Boolean);

  const chromePath = candidates.find(existsSync);
  if (!chromePath) {
    throw new Error("Google Chrome was not found. Set CHROME_PATH and retry.");
  }

  return chromePath;
}

function runChrome(chromePath, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(chromePath, args, {
      stdio: ["ignore", "ignore", "inherit"],
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Chrome exited with code ${code}.`));
      }
    });
  });
}

function inspectPng(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("Rendered file is not a PNG.");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

async function renderAsset(chromePath, render) {
  const sourcePath = resolve(rootDir, render.source);
  const outputPath = resolve(rootDir, render.output);
  const profilePath = await mkdtemp(join(tmpdir(), "taqvim-brand-assets-"));

  await mkdir(dirname(outputPath), { recursive: true });

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    "--no-first-run",
    `--user-data-dir=${profilePath}`,
    `--window-size=${render.width},${render.height}`,
    `--screenshot=${outputPath}`,
    "--virtual-time-budget=1000",
  ];

  if (render.transparent) {
    args.push("--default-background-color=00000000");
  }

  args.push(pathToFileURL(sourcePath).href);

  try {
    await runChrome(chromePath, args);
  } finally {
    await rm(profilePath, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }

  const png = inspectPng(await readFile(outputPath));
  if (png.width !== render.width || png.height !== render.height) {
    throw new Error(
      `${render.output} is ${png.width}x${png.height}; expected ${render.width}x${render.height}.`,
    );
  }
  if (render.transparent && png.colorType !== 6) {
    throw new Error(`${render.output} does not contain an alpha channel.`);
  }

  console.log(`Rendered ${render.output} (${render.width}x${render.height}).`);
}

const chromePath = findChrome();

for (const render of renders) {
  await renderAsset(chromePath, render);
}

await copyFile(
  resolve(rootDir, "assets/icons/icon128.png"),
  resolve(rootDir, "store-assets/taqvim-store-icon-128.png"),
);
console.log("Copied store-assets/taqvim-store-icon-128.png (128x128).");
