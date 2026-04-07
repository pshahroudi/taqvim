const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const openSettings = document.getElementById("openSettings");

async function getSettings() {
  const result = await chrome.storage.sync.get(["theme", "showHijri"]);

  return {
    theme: result.theme || "system",
    showHijri: result.showHijri ?? false,
  };
}

function applyTheme(theme) {
  if (theme === "dark") {
    root.classList.add("dark");
    return;
  }

  if (theme === "light") {
    root.classList.remove("dark");
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", prefersDark);
}

async function loadUi() {
  const settings = await getSettings();
  applyTheme(settings.theme);

  const hijriRow = document.getElementById("hijriDate");
  hijriRow.classList.toggle("hidden", !settings.showHijri);
}

async function cycleTheme() {
  const settings = await getSettings();
  const order = ["system", "light", "dark"];
  const currentIndex = order.indexOf(settings.theme);
  const nextTheme = order[(currentIndex + 1) % order.length];

  await chrome.storage.sync.set({ theme: nextTheme });
  applyTheme(nextTheme);
}

themeToggle.addEventListener("click", cycleTheme);

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", async () => {
    const settings = await getSettings();
    if (settings.theme === "system") {
      applyTheme("system");
    }
  });

loadUi();
