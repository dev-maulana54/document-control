# Worksheet object layout and zoom

Shape and cell text use the saved horizontal alignment (left, center, right), vertical alignment (top, center, bottom), font and wrap settings during display and editing. Entering edit mode must preserve the text position; adding or removing lines recomputes vertical placement. Escape cancels shape text edits and Ctrl+Enter commits them.

Ovals remain true ellipses within their selection bounds. Rounded rectangles retain smooth circular corners as their width and height change, including live resize. Shapes stay native editable DrawingML objects when exported.

Remove the floating Edit Bentuk and Hapus buttons. Right-clicking a shape or picture selects that object and opens a viewport-clamped context menu. Shapes offer Edit Text, Format Shape, Size and Properties, Delete and quick formatting; pictures offer Size and Properties and Delete. Escape restores object focus. Read-only views cannot mutate objects. Changes use the existing Undo/Redo and save mechanisms.

Worksheet zoom preserves text wrapping, alignment and the proportions of cells, shapes and pictures at small and large zoom levels. Ribbon, context menus and selection handles keep their UI size. Zoom remains view state and does not alter workbook data.

Cell text, overflow labels and shape text lay out at native font metrics before their text layer is scaled. This prevents CSS zoom rounding from changing line breaks near a wrap boundary. Shape text layers follow the actual object dimensions, including during live resize. Vertical alignment measures hidden textarea copies, keeping the active editor and its caret in place. Shape text uses the same flex placement for its label and auto-sized editor; native preview visibility is restored on cancellation or unchanged edits. Numeric object resizing preserves valid two-cell anchor markers for export and reopening.

An extended cell editor raises its text layer so clicks on text over adjacent empty cells keep editing the source cell. Leaving edit mode restores the neighboring cells' hit areas. Grid rerenders preserve focus only when it still matches the selected cell, preventing a stale cell from replacing the selection restored by cross-sheet Undo/Redo. Object context menus support keyboard access to quick formatting and dismiss when focus leaves the menu. Deleted pictures release their slot in the 50-picture limit while retaining the saved object identity for Undo.

Verification: focused shape geometry, edit alignment, object context and zoom fidelity regressions; existing shape toolbar, shapes/preservation, overflow/zoom, small-size and editor interaction browser tests; repository syntax checks and unit tests.

## Verification record — 2026-11-18

Delete and Backspace remove the selected image or shape, including original template drawings, and use the same undoable operation as the object context menu. Keyboard deletion is ignored while a text field is active or the workbook is read-only. Resizing returns focus to the selected object. `browser-object-keyboard-delete.py` covers both keys, inserted and original images, shapes, resize handles, Undo/Redo, export and reload.

`npm run check`, `npm test` (48 passing tests) and `git diff --check` passed. Picture quota tests verify rejection at the limit, replacement after deleting an original or inserted picture, and exclusion of shapes.

Browser checks use isolated Chrome profiles and generated workbook fixtures against the local application. The following 17 suites passed:

- `browser-shape-alignment.py`, `browser-shape-geometry.py`, `browser-object-context.py`, `browser-zoom-fidelity.py`, `browser-edit-spill.py`
- `browser-shapes.py`, `browser-shapes-preservation.py`, `browser-shape-toolbar.py`, `browser-text-box.py`
- `browser-overflow-zoom.py`, `browser-small-sizes.py`, `browser-editor-interactions.py`, `browser-editor-ux.py`
- `browser-cell-panes.py`, `browser-merge.py`, `browser-template-text.py`, `browser-editor-stability.py`

The wrap-boundary, extended-editor hit area, menu keyboard access and cross-sheet history focus regressions were reproduced before their fixes and passed afterward. Changes remain uncommitted in the existing working tree.
