import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("runtime styles and CSP are self-contained", async () => {
  const [manifestText, popupCss, optionsCss] = await Promise.all([
    read("manifest.json"),
    read("popup/popup.css"),
    read("options/options.css")
  ]);
  const manifest = JSON.parse(manifestText);

  assert.doesNotMatch(popupCss, /@import|https?:\/\//i);
  assert.doesNotMatch(optionsCss, /@import|https?:\/\//i);
  assert.doesNotMatch(manifest.content_security_policy.extension_pages, /https?:\/\//i);
  assert.match(manifest.content_security_policy.extension_pages, /default-src 'self';/);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self';/);
  assert.match(popupCss, /Vazirmatn\.woff2/);
  assert.match(optionsCss, /Vazirmatn\.woff2/);
});

test("popup exposes grid, tab, dialog, and reduced-motion accessibility hooks", async () => {
  const [html, javascript, css] = await Promise.all([
    read("popup/popup.html"),
    read("popup/popup.js"),
    read("popup/popup.css")
  ]);

  assert.match(html, /role="grid"/);
  assert.match(html, /aria-rowcount="6"/);
  assert.match(html, /aria-colcount="7"/);
  assert.match(html, /aria-labelledby="jumpDatePickerTitle"/);
  assert.match(javascript, /role="gridcell"/);
  assert.match(javascript, /class="day-cell"/);
  assert.match(javascript, /tabindex="\$\{isSelected/);
  assert.match(javascript, /ArrowRight/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("historical patch labels and commented duplicate popup markup are gone", async () => {
  const [html, popupCss, optionsCss] = await Promise.all([
    read("popup/popup.html"),
    read("popup/popup.css"),
    read("options/options.css")
  ]);

  assert.doesNotMatch(popupCss, /Patch\s+\d+/i);
  assert.doesNotMatch(optionsCss, /Patch\s+\d+/i);
  assert.doesNotMatch(html, /today-data-cache|selectedHolidayChips/);
});
