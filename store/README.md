# Store graphics

Google Play graphics for Breath Shape (see [docs/PLAY_STORE.md](../docs/PLAY_STORE.md)).

| File | Size | Use |
| --- | --- | --- |
| `icon-512.png` | 512 × 512 | App icon (from `assets/icon-only.png`) |
| `feature-graphic.png` | 1024 × 500 | Feature graphic |
| `screenshot-1-home.png` … `screenshot-6-history.png` | 1080 × 1920 | Phone screenshots, in this order |

The screenshots are real app screens (dark theme, 393 × 852 at 2.75×, Roboto) captured
with Playwright from the local site, then placed in `source/frame.html` with a caption.
`source/feature.html` renders the feature graphic at 1024 × 500. Both load Roboto from
`/__fonts/`, which the capture script serves from the `@fontsource/roboto` package.
