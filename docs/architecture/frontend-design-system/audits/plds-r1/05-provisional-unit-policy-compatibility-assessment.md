# PLDS-R1 provisional unit policy compatibility assessment

This compares the requested external baseline with the current repository. It is not the final Property Listify unit policy and does not authorize migrations. `REQUIRES_VISUAL_TESTING` means static source inspection cannot establish real browser behaviour.

| # | Provisional principle | Assessment | Repository evidence and adaptation need |
| --- | --- | --- | --- |
| 1 | Font sizes generally support root-relative scaling. | CONFLICTS_WITH_CURRENT_AUTHORITY; REQUIRES_MIGRATION | Tailwind uses rem broadly, but active `html` clamps root size in px/vw. Decide root authority before changing individual type values. |
| 2 | General spacing may use root-relative tokens. | SUPPORTED_WITH_EXCEPTIONS | Active `--space-*` variables are rem-bounded but viewport-fluid; Tailwind provides rem spacing. Decide whether viewport-fluid spacing remains semantic token behaviour. |
| 3 | Prefer unitless line-height. | SUPPORTED_BY_REPOSITORY | Active body/headings use `1.55` and `1.2`–`1.4`; Tailwind leading utilities are common. |
| 4 | CSS pixels may be used for thin borders and device-independent details. | SUPPORTED_BY_REPOSITORY | Radius deltas, 1px borders, icon sizes, and visual effects appropriately use px. |
| 5 | Widths usually flexible and bounded. | SUPPORTED_WITH_EXCEPTIONS | PageFrame, dialog, toasts, menus, and cards commonly use width/max-width/min(). Fixed grid tracks and card widths need component review. |
| 6 | Prefer content-driven height for text/dynamic data. | SUPPORTED_WITH_EXCEPTIONS; REQUIRES_VISUAL_TESTING | Many cards use min-height/content height, but buttons/tabs/input heights and selected heroes/overlays are fixed. |
| 7 | Prefer min-height to fixed height for content surfaces. | SUPPORTED_WITH_EXCEPTIONS; REQUIRES_VISUAL_TESTING | Loading/marketing cards use min-height; Explore overlay, media heroes, and wizard modal include fixed height patterns. |
| 8 | Percentages only for containing-block relationships. | SUPPORTED_BY_REPOSITORY | `w-full`, grid fractions, overlay insets, and progress widths generally express containing-block relationships. |
| 9 | Use ch for readable text measure. | INSUFFICIENT_EVIDENCE | One active literal `ch` usage was found; no established readable-measure policy exists. |
| 10 | Use intrinsic sizing, fr and minmax for grids. | SUPPORTED_BY_REPOSITORY | Many responsive grids use `fr` and `minmax(0, ...)`; active `w-max`/`min-w-max`/`max-w-max` utilities provide intentional intrinsic `max-content` sizing; dense fixed tracks require reflow validation. |
| 11 | Use viewport units only for viewport relationships. | SUPPORTED_WITH_EXCEPTIONS; REQUIRES_VISUAL_TESTING | Overlays, map canvas, immersive media, carousel widths, and heroes have plausible intent; mobile chrome risks remain. |
| 12 | Distinguish vh, svh, lvh and dvh. | SUPPORTED_WITH_EXCEPTIONS; REQUIRES_VISUAL_TESTING | Active sidebar `min-h-svh`/`h-svh` utilities provide an `svh` precedent, while overlays and media still use legacy `vh`; no product-wide viewport-unit policy or fallback strategy exists. |
| 13 | Consider container queries for reusable components in varied containers. | SUPPORTED_BY_REPOSITORY | `FieldGroup`/responsive `Field` is an active named-container pattern. No evidence supports converting page layouts wholesale. |
| 14 | Keep media queries for page/viewport changes. | SUPPORTED_BY_REPOSITORY | Navbar, page grids, marketing, and dense dashboards correctly make viewport-level decisions. |
| 15 | Justify clamp min/preferred/max values. | SUPPORTED_WITH_EXCEPTIONS; REQUIRES_VISUAL_TESTING | Bounds are explicit in `index.css`, but values duplicate across root/headings/Tailwind and have no recorded rationale. |
| 16 | Test fluid typography/spacing for accessibility. | REQUIRES_VISUAL_TESTING | No browser evidence was produced in this audit; root clamp raises priority. |
| 17 | Tolerate 200% text resizing. | REQUIRES_VISUAL_TESTING | Fixed controls, clamps, line clamps, and bounded overlays are static risks; no conformance claim. |
| 18 | Reflow normal vertical content at 320 CSS px without unnecessary horizontal scroll. | REQUIRES_VISUAL_TESTING | Flexible rails are promising; desktop grids, nonwrapping controls, and carousel/media surfaces need targeted testing. |
| 19 | Tolerate text-spacing overrides without clipping/overlap. | REQUIRES_VISUAL_TESTING | `accessibility.css` contains spacing-related rules but is dormant because it is not runtime-imported; fixed-height/line-clamped surfaces remain unverified. |
| 20 | Do not adopt a 62.5% root convention without evidence. | SUPPORTED_BY_REPOSITORY | No 62.5% root convention found. Current root clamp is a separate, higher-priority decision. |

## Compatibility conclusion

The repository is compatible with a future relationship-based unit policy, but not with an immediate global normalization. First resolve root font-size authority, the role of the active fluid layer, whether legacy viewport heights need modern fallbacks, and breakpoint boundary ownership. The current system already has usable foundations: flexible rails, bounded overlays, Tailwind rem utilities, `minmax()` grids, aspect ratios, and one container-query primitive. It also has a material migration hazard: global root/breakpoint changes would alter most interfaces at once.
