# Format Cells

The existing Format Cells command for a cell range or row/column header opens an Excel-inspired, keyboard-accessible dialog with Number, Alignment, Font, Border and Fill tabs. The dialog edits a draft; changing tabs, cancelling or closing does not mutate the workbook. OK applies only changed settings to the captured selection in one undoable, atomic operation. Stale, read-only or saving documents reject changes. Existing formatting that was not changed, including custom number formats and fills, remains intact.

Number provides native General, Number, Currency (USD), Percentage, Fraction, Date, Time, Scientific and Text formats and a sample. Alignment provides horizontal/vertical alignment, wrapping and merge for cell ranges. Font controls family, style, size, underline, strikethrough and color with a live preview. Border provides clickable line styles, colors, none/outline/inside/all presets and a preview with individually selectable edges. Applying an individual edge preserves unrelated edges; changing the selected line style alone does not change the workbook. Fill supports a palette, custom color and no fill. Controls must not promise unsupported Excel features. Protection is shown as unavailable until sheet protection is implemented.

All supported changes survive save/reload and native XLSX export. Header formatting retains existing axis-default semantics and limits. A range whose merge or border change cannot be completed rolls back entirely. Test cell and header entry, all tabs, sample, draft/cancel, atomic Undo/Redo, no-op preservation, inaccessible modes, small viewport, and exported XML using the project browser and unit suites.

Text-formatted cells and inherited row/column text formats store newly typed digits as strings. Applying or removing a merge through the dialog supports reopening the merged anchor. An untouched custom number format or uncommon alignment remains in the workbook when another property changes.

Verification: `npm run check`, `npm test`, `tests/browser-format-cells.py`, `tests/browser-header-context.py`, `tests/browser-cell-panes.py`, `tests/browser-borders.py`, and `tests/browser-overflow-zoom.py`.

Worksheet row headers and merged text clips reserve the rendered grid-border width at fractional zoom, so the table's row heights stay aligned with native border and drawing overlays. `tests/browser-zoom-geometry.py` checks this alignment from 25% through 200%, including merged footer cells.

When a border overlaps only part of an adjacent merged cell's edge, preserve the remaining segments and their native styles while changing the shared segment. Render merged borders per segment, and retain the result through Undo, save, reload and export. Partial selections inside a merged cell are still rejected.
