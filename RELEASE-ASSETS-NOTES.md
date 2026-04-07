# Taqvim release assets patch

This patch adds production-ready extension icons and updates `manifest.json` so Chrome can use them in the toolbar, Extensions page, installation flow, and Chrome Web Store.

## Added
- `assets/icons/icon16.png`
- `assets/icons/icon32.png`
- `assets/icons/icon48.png`
- `assets/icons/icon128.png`

## Updated
- `manifest.json`

## After replacing
1. Reload the extension in `chrome://extensions`
2. Confirm the new icon appears in the toolbar and Extensions page
3. Check that the popup still opens
4. Check that the badge still overlays correctly on the toolbar icon

## Next step
Final QA / bug-fix pass before packaging or publishing.
