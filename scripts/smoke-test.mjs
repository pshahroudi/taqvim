import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toJalali } from "../src/calendar/jalali.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const holidayFiles = [
  { path: "src/data/holidays-ir.json", category: "officialIran" },
  {
    path: "src/data/holidays-official-1405.json",
    category: "officialIran",
    collection: "holidays",
    requireYear: true
  },
  { path: "src/data/holidays-cultural.json", category: "cultural" },
  { path: "src/data/holidays-islamic.json", category: "islamic" }
];

const importantJsFiles = [
  "background/service-worker.js",
  "popup/popup.js",
  "options/options.js",
  "src/calendar/jalali.js",
  "src/calendar/converter.js",
  "src/calendar/gregorian.js",
  "src/calendar/hijri.js",
  "src/calendar/holidays.js",
  "src/ui/badge.js",
  "src/ui/icons.js",
  "src/ui/storage.js",
  "src/ui/tehran-clock.js",
  "src/ui/theme.js",
  "src/utils/dates.js",
  "src/utils/format.js",
  "src/utils/numerals.js",
  "scripts/package-extension.mjs",
  "scripts/render-brand-assets.mjs",
  "scripts/capture-store-assets.mjs"
];

const expectedIconSizes = {
  "assets/icons/icon16.png": 16,
  "assets/icons/icon32.png": 32,
  "assets/icons/icon48.png": 48,
  "assets/icons/icon128.png": 128
};

const expectedStoreAssets = {
  "store-assets/taqvim-store-icon-128.png": [128, 128],
  "store-assets/taqvim-small-promo-440x280.png": [440, 280],
  "store-assets/taqvim-marquee-1400x560.png": [1400, 560],
  "store-assets/screenshots/01-calendar-light-1280x800.png": [1280, 800],
  "store-assets/screenshots/02-calendar-dark-1280x800.png": [1280, 800],
  "store-assets/screenshots/03-date-converter-1280x800.png": [1280, 800],
  "store-assets/screenshots/04-date-picker-1280x800.png": [1280, 800],
  "store-assets/screenshots/05-settings-1280x800.png": [1280, 800]
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(rootDir, relativePath), "utf8"));
}

function inspectPng(buffer, relativePath) {
  assert(
    buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
    `${relativePath}: expected a PNG file`
  );

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]
  };
}

function validateHolidayRecord(record, expectedCategory, filePath, { requireYear = false } = {}) {
  assert(record && typeof record === "object", `${filePath}: holiday record must be an object`);
  assert(typeof record.id === "string" && record.id.trim(), `${filePath}: missing id`);
  assert(["jalali", "hijri"].includes(record.calendar), `${filePath}: ${record.id} has invalid calendar`);
  assert(Number.isInteger(record.month) && record.month >= 1 && record.month <= 12, `${filePath}: ${record.id} has invalid month`);
  assert(Number.isInteger(record.day) && record.day >= 1 && record.day <= 31, `${filePath}: ${record.id} has invalid day`);
  assert(typeof record.title === "string" && record.title.trim(), `${filePath}: ${record.id} missing title`);
  assert(record.category === expectedCategory, `${filePath}: ${record.id} category must be ${expectedCategory}`);
  assert(typeof record.isHoliday === "boolean", `${filePath}: ${record.id} isHoliday must be boolean`);
  if (requireYear) {
    assert(Number.isInteger(record.year), `${filePath}: ${record.id} must include a Jalali year`);
    assert(typeof record.sourceId === "string" && record.sourceId.trim(), `${filePath}: ${record.id} missing sourceId`);
  }
}

async function checkHolidayData() {
  const ids = new Set();

  for (const file of holidayFiles) {
    const payload = await readJson(file.path);
    const records = file.collection ? payload[file.collection] : payload;
    assert(Array.isArray(records), `${file.path}: expected an array`);

    if (file.collection) {
      assert(payload.source?.id, `${file.path}: missing source metadata`);
      assert(payload.source?.url?.startsWith("https://"), `${file.path}: invalid source URL`);
    }

    for (const record of records) {
      validateHolidayRecord(record, file.category, file.path, {
        requireYear: file.requireYear
      });
      assert(!ids.has(record.id), `Duplicate holiday id: ${record.id}`);
      ids.add(record.id);
    }
  }
}

function checkJalaliConversions() {
  const checks = [
    [2026, 4, 29, 1405, 2, 9],
    [2025, 3, 20, 1403, 12, 30],
    [2026, 3, 20, 1404, 12, 29]
  ];

  for (const [gy, gm, gd, jy, jm, jd] of checks) {
    const actual = toJalali(gy, gm, gd);
    assert(
      actual.jy === jy && actual.jm === jm && actual.jd === jd,
      `${gy}-${gm}-${gd}: expected ${jy}/${jm}/${jd}, got ${actual.jy}/${actual.jm}/${actual.jd}`
    );
  }
}

async function checkPopupDomReferences() {
  const popupHtml = await readFile(join(rootDir, "popup/popup.html"), "utf8");
  const popupJs = await readFile(join(rootDir, "popup/popup.js"), "utf8");
  const idMatches = [...popupHtml.matchAll(/id=["']([^"']+)["']/g)].map((match) => match[1]);
  const ids = new Set(idMatches);
  const referencedIds = [...popupJs.matchAll(/document\.getElementById\(["']([^"']+)["']\)/g)].map(
    (match) => match[1]
  );

  for (const id of referencedIds) {
    assert(ids.has(id), `popup: missing element with id ${id}`);
  }
}

async function checkManifest() {
  const manifest = await readJson("manifest.json");
  const packageJson = await readJson("package.json");
  assert(manifest.manifest_version === 3, "manifest: manifest_version must be 3");
  assert(Array.isArray(manifest.permissions), "manifest: permissions must be an array");
  assert(!manifest.host_permissions, "manifest: host_permissions should not be present");
  assert(manifest.permissions.includes("storage"), "manifest: missing storage permission");
  assert(manifest.permissions.includes("alarms"), "manifest: missing alarms permission");
  assert(manifest.version === packageJson.version, "manifest/package version mismatch");
  assert(!/https?:\/\//.test(manifest.content_security_policy?.extension_pages || ""), "manifest: CSP should be self-contained");

  for (const iconPath of Object.values(manifest.icons || {})) {
    assert(existsSync(join(rootDir, iconPath)), `manifest: missing icon ${iconPath}`);
    const icon = inspectPng(await readFile(join(rootDir, iconPath)), iconPath);
    const expectedSize = expectedIconSizes[iconPath];
    assert(expectedSize, `manifest: unexpected icon path ${iconPath}`);
    assert(
      icon.width === expectedSize && icon.height === expectedSize,
      `${iconPath}: expected ${expectedSize}x${expectedSize}`
    );
    assert(icon.colorType === 6, `${iconPath}: expected an RGBA alpha channel`);
  }

  assert(existsSync(join(rootDir, "assets/fonts/Vazirmatn.woff2")), "manifest: bundled font missing");
  assert(existsSync(join(rootDir, "assets/fonts/OFL-Vazirmatn.txt")), "manifest: font license missing");
}

async function checkStoreAssets() {
  for (const [relativePath, [expectedWidth, expectedHeight]] of Object.entries(
    expectedStoreAssets
  )) {
    const png = inspectPng(await readFile(join(rootDir, relativePath)), relativePath);
    assert(
      png.width === expectedWidth && png.height === expectedHeight,
      `${relativePath}: expected ${expectedWidth}x${expectedHeight}`
    );
  }
}

function checkImportantJsParses() {
  for (const relativePath of importantJsFiles) {
    const result = spawnSync(process.execPath, ["--check", relativePath], {
      cwd: rootDir,
      encoding: "utf8"
    });

    assert(result.status === 0, `${relativePath} failed syntax check:\n${result.stderr}`);
  }
}

await checkHolidayData();
checkJalaliConversions();
await checkManifest();
await checkStoreAssets();
await checkPopupDomReferences();
checkImportantJsParses();

console.log("Smoke checks passed.");
