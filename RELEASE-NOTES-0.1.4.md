# Taqvim 0.1.4

## Highlights

- Added a verified, source-tagged official Iranian holiday calendar for Solar Hijri year 1405.
- Kept recurring Jalali and calculated Hijri holidays as an automatic fallback for other years.
- Bundled Vazirmatn locally and removed runtime Google Fonts requests.
- Improved calendar-grid, tab, date-picker, keyboard, and reduced-motion accessibility.
- Fixed minimum and maximum supported Jalali-year navigation and negative Persian-number input.
- Refactored holiday, numeral, and Tehran-clock logic into testable modules.
- Added comprehensive automated tests, release validation, packaging, and GitHub Actions checks.
- Replaced the extension artwork with a scalable crescent-and-sun calendar identity, including toolbar-optimized 16px and 32px variants.
- Replaced platform-dependent popup symbols with consistent inline SVG controls and aligned the toolbar badge with the new brand palette.
- Added a complete Chrome Web Store media kit: store icon, promotional tiles, and five current product screenshots.

## Permissions and privacy

- No new extension permissions were added.
- The extension continues to use only `storage` and `alarms`.
- Holiday data and fonts are bundled; Taqvim makes no runtime requests to external APIs.

## Deployment

Run `npm run check` and then `npm run package`. The deployment artifact is written to `dist/taqvim-0.1.4.zip`.
