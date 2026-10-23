# Taqvim 0.1.6

## Fixes

- The Tehran time card now follows the numerals setting. With Latin numerals on, the clock showed Persian digits while the date beside it showed Latin ones.
- The converter handles Hijri day 30 in a 29-day month. It used to answer "This Hijri date was not found in the local calendar calculation." (for example 1447, months 1, 3, 7, 10 and 11). It now caps the day field at the month's real length, 29 or 30, taken from the same calendar the popup draws, and says "This Hijri month has 29 days, so day 30 does not exist."
- The settings page no longer mentions a "Today card", which the popup does not have, and no longer names Chrome only, since the same package ships to Microsoft Edge.

## New

- A weekend setting: Friday (Iran, the default) or Saturday and Sunday. It drives the weekend highlight in the month grid and the day panel's status, which reads "تعطیل آخر هفته" for a Saturday or Sunday weekend rather than the official weekly holiday label.
- Alt+Shift+J opens the calendar. It can be changed or removed at `chrome://extensions/shortcuts` (in Edge, `edge://extensions/shortcuts`). It needs no new permission.

## Accessibility

- Each day in the month grid is announced with its full Persian date, plus "تعطیل رسمی" or "مناسبت" when it has one. It used to read "Jalali 1405/8/1" in English.
- The grid now has proper rows, so screen readers can move by week. The layout is unchanged.
- The status shown when the holiday layer is turned off is now in Persian.

## Under the hood

- Every settings read goes through one module. The background worker and the badge no longer read storage on their own, and the list of stored keys comes from the defaults, so a new setting cannot be left unsaved.
- A browser test loads the packaged extension in headless Chrome and checks the badge, the popup (42 day cells in 6 rows, Persian labels, the clock and badge switching numerals, both weekend options), the settings page version, and that no page logs an error. It runs in CI on every push and pull request.
- The release zip is reproducible: building the same source twice gives the same bytes. The packager writes the zip's sha256 beside it, and CI fails if a rebuild changes the hash.
- From this release on, pushing a `v<version>` tag publishes the zip that CI built, with its sha256, as a GitHub Release. The store packages are uploaded from that release.
- The store screenshots are regenerated from this version.

## Permissions and privacy

- No new permissions. Taqvim still uses only `storage` and `alarms`, and the smoke test now fails if that list or the content security policy changes at all.
- No network requests, no account, no analytics. Holiday data and fonts are bundled.

## Deployment

Run `npm run check`, `npm run package` and `npm run test:browser`. The archive is `dist/taqvim-0.1.6.zip`, with its hash in `dist/taqvim-0.1.6.zip.sha256`. After merge, tag the merge commit `v0.1.6`; the GitHub Release carries the zip to upload to the Chrome Web Store and Microsoft Edge Add-ons.
