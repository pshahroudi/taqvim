# Chrome Web Store media kit

Upload these files in the Chrome Web Store developer dashboard:

- `taqvim-store-icon-128.png`: 128x128 store icon
- `taqvim-small-promo-440x280.png`: required small promotional tile
- `taqvim-marquee-1400x560.png`: optional marquee promotional image
- `screenshots/*.png`: five 1280x800 screenshots, ordered by filename

The screenshots show the current light calendar, dark calendar, date converter, Jalali date picker, and settings page. They are generated from the repository's real HTML, CSS, JavaScript, data, and bundled font by `npm run assets:capture`.

The source layouts are in `design/`. Run `npm run assets:render` after changing the icon or promotional artwork, and `npm run assets:capture` after changing the interface.

Chrome Web Store image guidance: <https://developer.chrome.com/docs/webstore/images>
