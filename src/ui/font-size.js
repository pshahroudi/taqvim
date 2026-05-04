export const FONT_SIZE_ORDER = ["small", "medium", "large"];

const FONT_SIZE_LABELS = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const FONT_SIZE_ICONS = {
  small: "A−",
  medium: "A",
  large: "A+",
};

export function normalizeFontSize(value) {
  return FONT_SIZE_ORDER.includes(value) ? value : "medium";
}

export function getFontSizeLabel(value) {
  return FONT_SIZE_LABELS[normalizeFontSize(value)];
}

export function getFontSizeIcon(value) {
  return FONT_SIZE_ICONS[normalizeFontSize(value)];
}

export function getNextFontSize(value) {
  const current = normalizeFontSize(value);
  const currentIndex = FONT_SIZE_ORDER.indexOf(current);
  return FONT_SIZE_ORDER[(currentIndex + 1) % FONT_SIZE_ORDER.length];
}

export function applyFontSize(value, root = globalThis.document?.documentElement) {
  const normalized = normalizeFontSize(value);

  if (!root) {
    return normalized;
  }

  FONT_SIZE_ORDER.forEach((size) => {
    root.classList.remove(`font-${size}`);
  });
  root.classList.add(`font-${normalized}`);
  root.dataset.fontSize = normalized;

  return normalized;
}
