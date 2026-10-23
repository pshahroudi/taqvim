import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  getSettings,
  normalizeSettings,
  saveSettingsPatch
} from "../src/ui/storage.js";

test("invalid settings normalize to supported defaults", () => {
  const settings = normalizeSettings({
    theme: "neon",
    fontSize: "huge",
    weekStart: "thursday",
    weekendDays: "thursday-friday",
    showHijri: "false",
    holidayTypes: { officialIran: "true", cultural: "false" }
  });

  assert.equal(settings.theme, DEFAULT_SETTINGS.theme);
  assert.equal(settings.fontSize, DEFAULT_SETTINGS.fontSize);
  assert.equal(settings.weekStart, DEFAULT_SETTINGS.weekStart);
  assert.equal(settings.weekendDays, "friday");
  assert.equal(normalizeSettings({ weekendDays: "saturday-sunday" }).weekendDays, "saturday-sunday");
  assert.equal(settings.showHijri, false);
  assert.equal(settings.holidayTypes.officialIran, true);
  assert.equal(settings.holidayTypes.cultural, false);
  assert.equal(settings.holidayTypes.islamic, true);
});

test("legacy settings migrate and nested holiday patches preserve sibling values", async () => {
  let stored = {
    settings: {
      theme: "dark",
      holidayTypes: { officialIran: true, cultural: true, islamic: false }
    }
  };

  globalThis.chrome = {
    storage: {
      sync: {
        async get() {
          return structuredClone(stored);
        },
        async set(payload) {
          stored = { ...stored, ...structuredClone(payload) };
        },
        async remove(key) {
          delete stored[key];
        }
      }
    }
  };

  const migrated = await getSettings();
  assert.equal(migrated.theme, "dark");
  assert.equal("settings" in stored, false);
  assert.equal(stored.fontSize, "medium");
  assert.equal(stored.weekendDays, "friday");

  const updated = await saveSettingsPatch({ holidayTypes: { cultural: false } });
  assert.deepEqual(updated.holidayTypes, {
    officialIran: true,
    cultural: false,
    islamic: false
  });
});

test("a 0.1.5 install without weekendDays gets the default written on first read", async () => {
  const flat015 = {
    theme: "light",
    fontSize: "large",
    showHijri: true,
    showTehranTime: true,
    usePersianNumerals: false,
    weekStart: "sunday",
    showHolidays: true,
    holidayTypes: { officialIran: true, cultural: false, islamic: true },
    highlightWeekends: true,
    autoJumpToTodayOnOpen: false
  };
  let stored = structuredClone(flat015);

  globalThis.chrome = {
    storage: {
      sync: {
        async get() {
          return structuredClone(stored);
        },
        async set(payload) {
          stored = { ...stored, ...structuredClone(payload) };
        },
        async remove(key) {
          delete stored[key];
        }
      }
    }
  };

  const settings = await getSettings();
  assert.deepEqual(stored, { ...flat015, weekendDays: "friday" });
  assert.deepEqual(settings, stored);
});
