export const THEME_ORDER = ["system", "light", "dark"];

export function getResolvedTheme(theme, win = window) {
  if (theme === "dark" || theme === "light") return theme;

  return win.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

export function applyTheme(theme, root = document.documentElement, win = window) {
  root.classList.toggle("dark", getResolvedTheme(theme, win) === "dark");
}

export function getThemeIcon(theme) {
  const iconMap = {
    system: "●",
    light: "☼",
    dark: "☾"
  };

  return iconMap[theme] || iconMap.system;
}

export function getNextTheme(theme) {
  const currentIndex = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
}
