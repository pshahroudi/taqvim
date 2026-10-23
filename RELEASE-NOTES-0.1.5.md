# Taqvim 0.1.5

## Highlights

- Tightened the content security policy of the popup and options pages. `connect-src 'self'` refuses any `fetch()` or similar request to a server, and `default-src 'self'` keeps images, media, frames and other resource types to the extension's own files. Both were checked in Chrome with the extension loaded: under 0.1.4's policy an outside request was sent and an outside image loaded; under 0.1.5 both are refused, and the popup and options page render as before.
- The static-quality test now fails if either directive is missing from the manifest.
- The extension's website link on `chrome://extensions` now opens the case study at https://shahroudi.us/work/taqvim/ (`homepage_url`).
- Includes the fix to the number fields in the date picker and the converter, made just after the 0.1.4 version bump, whose input pattern Chrome could reject as an invalid regular expression.
- The source is public at https://github.com/pshahroudi/taqvim under the MIT licence.
- Added a 300x300 store logo (`store-assets/taqvim-store-logo-300.png`) for the Microsoft Edge Add-ons listing, and the listing text for both stores in `store-assets/LISTING.md`.

## Permissions and privacy

- No new extension permissions were added.
- The extension continues to use only `storage` and `alarms`.
- Holiday data and fonts are bundled; Taqvim makes no runtime requests to external APIs, and the policy now refuses them.

## Deployment

Run `npm run check` and then `npm run package`. The deployment artifact is written to `dist/taqvim-0.1.5.zip`. The same zip goes to the Chrome Web Store and to Microsoft Edge Add-ons.
