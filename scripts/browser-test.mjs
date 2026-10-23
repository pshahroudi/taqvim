// Loads the extension into headless Chrome and checks it works as a whole:
// the service worker sets the badge, the popup renders a 42-cell month with no
// console errors, settings apply live, and the options page shows the version.
//
//   node scripts/browser-test.mjs [extension-dir]   (default: this repo)
//
// Branded Chrome ignores --load-extension, so the extension is loaded over
// CDP with Extensions.loadUnpacked, which needs --enable-unsafe-extension-debugging.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toJalali } from "../src/calendar/jalali.js";
import { formatNumber } from "../src/utils/format.js";
import { delay, launchChrome } from "./cdp.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const extensionDir = resolve(process.argv[2] || rootDir);
const manifest = JSON.parse(await readFile(join(extensionDir, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
const profileDir = await mkdtemp(join(tmpdir(), "taqvim-browser-test-"));

const failures = [];
const problems = [];

function check(condition, message) {
  console.log(`${condition ? "ok  " : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
}

function todayBadge(usePersianNumerals) {
  const now = new Date();
  const { jd } = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return formatNumber(jd, usePersianNumerals);
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description || result.exceptionDetails.text,
    );
  }
  return result.result?.value;
}

async function waitFor(client, sessionId, expression, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = await evaluate(client, sessionId, expression).catch(() => null);
    if (value) return value;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

function watchForErrors(client, sessions) {
  client.onEvent(({ method, params, sessionId }) => {
    const where = sessions.get(sessionId);
    if (!where) return;

    if (method === "Runtime.exceptionThrown") {
      const details = params.exceptionDetails;
      problems.push(`${where}: ${details.exception?.description || details.text}`);
    } else if (method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(params.type)) {
      const text = params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
      problems.push(`${where}: console.${params.type} ${text}`);
    } else if (method === "Log.entryAdded" && params.entry.level === "error") {
      problems.push(`${where}: ${params.entry.text} ${params.entry.url || ""}`.trim());
    }
  });
}

async function attach(client, sessions, targetId, label) {
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  sessions.set(sessionId, label);
  await client.send("Runtime.enable", {}, sessionId);
  await client.send("Log.enable", {}, sessionId);
  return sessionId;
}

async function openPage(client, sessions, url, label) {
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const sessionId = await attach(client, sessions, targetId, label);
  await client.send("Page.enable", {}, sessionId);
  await client.send("Page.navigate", { url }, sessionId);
  return sessionId;
}

async function findServiceWorker(client, extensionId) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const { targetInfos } = await client.send("Target.getTargets");
    const worker = targetInfos.find(
      (target) =>
        target.type === "service_worker" &&
        target.url.startsWith(`chrome-extension://${extensionId}/`),
    );
    if (worker) return worker.targetId;
    await delay(100);
  }
  throw new Error("The extension service worker did not start.");
}

const { client, close } = await launchChrome(profileDir, [
  "--enable-unsafe-extension-debugging",
  // GitHub's Ubuntu runners block the user namespaces Chrome's sandbox needs.
  ...(process.env.CI ? ["--no-sandbox"] : []),
]);
const sessions = new Map();
watchForErrors(client, sessions);

try {
  const { id } = await client.send("Extensions.loadUnpacked", { path: extensionDir });
  console.log(`Loaded ${extensionDir} as ${id}`);
  const base = `chrome-extension://${id}`;

  const worker = await attach(
    client,
    sessions,
    await findServiceWorker(client, id),
    "service worker",
  );
  // The worker target appears before its extension bindings are installed.
  await waitFor(
    client,
    worker,
    `typeof chrome === "object" && typeof chrome.action === "object"`,
    "the service worker's chrome bindings",
  );
  check(
    (await evaluate(client, worker, "chrome.runtime.getManifest().version")) ===
      packageJson.version,
    `loaded manifest version is ${packageJson.version}`,
  );
  check(manifest.version === packageJson.version, "manifest.json matches package.json");

  const badge = await waitFor(
    client,
    worker,
    "chrome.action.getBadgeText({})",
    "the badge text",
  );
  check(badge === todayBadge(true), `badge shows today's Jalali day (${badge})`);

  const popup = await openPage(client, sessions, `${base}/popup/popup.html`, "popup");
  await waitFor(
    client,
    popup,
    `document.querySelectorAll("#calendarGrid .day-cell").length === 42 &&
      document.querySelector("#selectedJalali")?.textContent.trim()`,
    "the popup month grid",
  );
  const grid = await evaluate(
    client,
    popup,
    `({
      rows: document.querySelectorAll('#calendarGrid > [role="row"]').length,
      cells: document.querySelectorAll('#calendarGrid [role="row"] > .day-cell').length,
      firstLabel: document.querySelector("#calendarGrid button[data-jd]")?.getAttribute("aria-label"),
      clock: document.querySelector(".tehran-time-number")?.textContent,
      weekend: document.querySelectorAll("#calendarGrid .day.weekend").length
    })`,
  );
  check(grid.cells === 42, "popup renders 42 day cells");
  check(grid.rows === 6, "the 42 cells sit in 6 grid rows");
  check(/[؀-ۿ]/.test(grid.firstLabel || ""), `day cells have Persian labels (${grid.firstLabel})`);
  check(/^[۰-۹]{2}:[۰-۹]{2}:[۰-۹]{2}$/.test(grid.clock || ""), `Tehran clock uses Persian digits (${grid.clock})`);
  check(grid.weekend === 6, "Friday weekend marks 6 cells");

  await evaluate(
    client,
    popup,
    `chrome.storage.sync.set({ usePersianNumerals: false, weekendDays: "saturday-sunday" })`,
  );
  const latinClock = await waitFor(
    client,
    popup,
    `(() => {
      const text = document.querySelector(".tehran-time-number")?.textContent || "";
      return /^\\d{2}:\\d{2}:\\d{2}$/.test(text) && text;
    })()`,
    "the clock to switch to Latin digits",
  );
  check(Boolean(latinClock), `Tehran clock follows Latin numerals (${latinClock})`);
  check(
    (await evaluate(client, popup, `document.querySelectorAll("#calendarGrid .day.weekend").length`)) === 12,
    "Saturday and Sunday weekend marks 12 cells",
  );
  const latinBadge = await waitFor(
    client,
    worker,
    `chrome.action.getBadgeText({}).then((text) => /^\\d+$/.test(text) && text)`,
    "the badge to switch to Latin digits",
  );
  check(latinBadge === todayBadge(false), `badge follows Latin numerals (${latinBadge})`);

  const options = await openPage(client, sessions, `${base}/options/options.html`, "options");
  const shownVersion = await waitFor(
    client,
    options,
    `(() => {
      const text = document.getElementById("appVersion")?.textContent.trim();
      return text && text !== "—" && text;
    })()`,
    "the options page version",
  );
  check(shownVersion === packageJson.version, `options page shows version ${shownVersion}`);
  check(
    (await evaluate(client, options, `document.getElementById("weekendDays")?.value`)) ===
      "saturday-sunday",
    "options page reflects the stored weekend setting",
  );

  // Let late errors (a failed fetch, a CSP report) arrive before judging.
  await delay(500);
  check(problems.length === 0, "no console errors or exceptions on any page");
  for (const problem of problems) console.log(`     ${problem}`);
} catch (error) {
  failures.push(error.message);
  console.log(`FAIL ${error.message}`);
  for (const problem of problems) console.log(`     ${problem}`);
} finally {
  await close();
  await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

if (failures.length > 0) {
  console.log(`\n${failures.length} browser check(s) failed.`);
  process.exit(1);
}
console.log("\nBrowser checks passed.");
