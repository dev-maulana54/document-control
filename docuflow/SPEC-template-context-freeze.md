# Template fidelity, cell context menu and Freeze Panes

Keep the imported workbook's saved sheet zoom, row/column sizes, merge geometry,
font/fill/border colors and drawing media. Read indexed/custom/theme colors and
tints instead of substituting application colors. Preserve original package parts
on export. Tests use a synthetic workbook; the user's original file stays outside
the repository and publication archive.

Right-click a cell preserves an existing selection when clicked inside it, or
selects that cell/merged area. Provide Cut, Copy, Paste, Paste Special, Insert,
Delete, Clear Contents, Format Cells and Hyperlink, with a quick formatting bar.
Insert/Delete offer whole rows/columns, using the existing safe structure engine.
Read-only documents allow Copy and view controls, never content changes.

View offers Freeze Panes (above/left of active cell), Freeze Top Row, Freeze First
Column and Unfreeze Panes. Frozen cells remain visible and selectable while the
other cells scroll on both axes and at different zoom levels. Preserve each
sheet's own setting. For editable requests save native sheetView/pane metadata,
with Undo/Redo; read-only view changes are temporary. No business-data resets.

Build order: reproduce template defect → read native formatting/view → cell menu
→ freeze renderer/view/persistence → regression checks → publish existing Site.

Validation: npm run check; npm test; focused Playwright browser checks for template,
cell menu/freeze, header menu, borders and editor stability. Confirm native XLSX
roundtrip and no browser errors. Native pane contract:
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.spreadsheet.pane

Column-width encoding reference:
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.spreadsheet.column
Bitmap-in-metafile reference:
https://learn.microsoft.com/en-us/windows/desktop/api/wingdi/ns-wingdi-emrstretchblt

Verified with isolated Chromium: native file no-op export retained every package
entry byte; all 10 original drawing anchors render, including the nested safety
icons. Synthetic regression covers indexed/automatic colors, widths, groups and
bitmap records. Cell menu tests cover invalid hyperlink rejection/Undo cleanup,
55/175% frozen hit testing, per-sheet metadata, export and read-only view changes.
Borders, native shapes, small dimensions, editor stability, header context and
approval regressions pass. npm syntax check and all 37 unit tests pass; dependency
audit reports zero findings. The color regression also rejects an intentionally
wrong indexed-64 mutation. No test uses the user's browser profile or business DB.

Native text follow-up: DrawingML font sizes now use a CSS-sized coordinate frame
per axis so the browser cannot clamp EMU-sized font attributes or stretch letters
with non-uniform group scaling. Body insets follow the same coordinate conversion.
Centered/bottom-aligned cell text measures its real wrapped height in one batch;
the grid retains the original cell/merge dimensions. The original HELMET through
KACAMATA labels and two-line green banner are verified at 55/100/175% zoom by
`tests/browser-template-text.py --workbook PATH`. The synthetic regression failed
before the fix with 1px-high labels and a clipped second banner line.
