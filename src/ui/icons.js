const ICON_PATHS = {
  system: `
    <circle cx="12" cy="12" r="8"></circle>
    <path d="M12 4a8 8 0 0 0 0 16V4Z" fill="currentColor" stroke="none" opacity="0.24"></path>
  `,
  sun: `
    <circle cx="12" cy="12" r="3.5"></circle>
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"></path>
  `,
  moon: `
    <path d="M20 15.4A8.2 8.2 0 0 1 8.6 4a8.2 8.2 0 1 0 11.4 11.4Z"></path>
  `,
};

export function getIconSvg(name) {
  const paths = ICON_PATHS[name] || ICON_PATHS.system;
  return `<svg class="ui-icon-svg" data-icon="${name}" viewBox="0 0 24 24" focusable="false" aria-hidden="true">${paths}</svg>`;
}
