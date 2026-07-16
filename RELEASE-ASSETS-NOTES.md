# Taqvim visual assets

Taqvim's production artwork is generated from editable SVG sources in `design/`. The icon keeps the blue calendar identity while using a text-free crescent-and-sun mark that remains legible at toolbar size.

## Extension package

- `assets/icons/icon16.png`: optical toolbar variant
- `assets/icons/icon32.png`: optical toolbar variant
- `assets/icons/icon48.png`: standard extension icon
- `assets/icons/icon128.png`: store/install icon with transparent padding

The obsolete, unreferenced `icon.ico` has been removed. The toolbar badge uses the icon's navy brand color and occupies the intentionally quiet lower-right area.

## Chrome Web Store listing

- `store-assets/taqvim-store-icon-128.png`
- `store-assets/taqvim-small-promo-440x280.png`
- `store-assets/taqvim-marquee-1400x560.png`
- `store-assets/screenshots/`: five 1280x800 product screenshots

The listing media is intentionally excluded from the deployable extension ZIP.

## Regeneration and QA

1. Run `npm run assets` to regenerate all PNG assets using Chrome.
2. Run `npm run check` to verify PNG dimensions, icon alpha channels, source data, syntax, and tests.
3. Reload the unpacked extension and confirm the date badge remains readable over the lower-right of the toolbar icon.
4. Run `npm run package` to create the validated release archive.
