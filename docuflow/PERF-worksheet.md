# Worksheet usability and scroll performance

2026-11-18: compact the editor chrome and reduce scroll work without changing workbook data, sheet zoom, wrapping, selection, frozen panes or XLSX export.

At a 1365 × 613 viewport, the expanded ribbon shrank from 205 to 135 px and the formula bar from 45 to 31 px. The worksheet grew from 244 to 357 px high (+46%), and 1331 to 1343 px wide. Controls retain 24 px hit areas, accessible names, keyboard access and horizontal ribbon scrolling. Workspace height uses measured padding, gaps and borders instead of a fixed subtraction.

Scroll measurements use an isolated Chrome profile, a generated 100-column × 1500-row workbook with narrow columns, borders and merges, and a fixed 398 px worksheet height. Timings include a forced layout read. They measure main-thread viewport work, not guaranteed frame rate on every device.

| Experiment | Result | Decision |
| --- | --- | --- |
| Baseline, 24 vertical one-row scrolls at 55% | 24 viewport replacements; 10,435 ms total; median 432.9 ms, p95 503.7 ms | Baseline |
| Retain the viewport until its overscan buffer is exhausted | 2 replacements; 918 ms total | Keep: avoid rebuilding on every row |
| Retain rows and cells, then reconcile children in place | 2 replacements; 168 ms total; redraws about 83 ms | Keep: unchanged editors remain connected |
| Paint ordinary borders once per buffered window; batch lines into SVG paths by style | Dense border DOM fell from 5,036 line elements to 1 path | Keep: native scrolling reuses the border layer |
| Remove transforms from empty cell text layers | Frame timing improvement was inconsistent | Reject: no production change |
| Add layout/strict containment to text layers | No consistent improvement | Reject: no production change |

The 55% stress fixture still contains more than 6,800 editable controls; occasional paint delays remain possible on slower devices. Timing values are reported for diagnosis. Deterministic regression budgets enforce at most 8 viewport or border replacements per 24 small scrolls, at most 100 border primitives for the dense fixture, valid merged-cell hit targets, stable caret/selection, and frozen-pane editing.

Imported DrawingML labels now preserve explicit line breaks, inherited paragraph fonts, wrapping within text margins and explicit clipping on each requested axis. Emitted text lines share the existing drawing complexity budget, avoiding an unbounded SVG for narrow text boxes. Their native SVG source remains unchanged across 55/100/200% zoom. Double borders retain two distinct opaque lines at 55%, verified by raster pixel sampling. The original screenshot workbook was not available for an exact visual comparison; generated native drawing fixtures and preservation tests cover these rendering defects.

Verification: `browser-scroll-performance.py`, `browser-compact-ribbon.py`, `browser-render-clarity.py`; existing border, pane, ribbon, interaction, zoom, shape and template suites; `npm run check`, `npm test`, and `git diff --check`. The legacy ribbon export expectation now includes Excel's native column-width padding, matching the unchanged serializer.

Final validation passed: all 48 unit tests and JavaScript syntax checks, scroll/merge/caret/frozen-resize guards, compact layouts at 320/768/1365/1440 px, native drawing clarity and template fidelity, and the existing border, pane, ribbon, editor interaction, overflow, zoom, fractional cell size, geometry stability, shape alignment/toolbar, object context and merge browser scenarios. The overflow test checks that its source is outside the viewport; the buffered renderer may deliberately retain that offscreen DOM node.
