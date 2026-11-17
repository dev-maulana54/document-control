# Small dimensions and picture fidelity

Row/column sizes accept nonnegative fractions. Zero hides the axis; a positive size unhides it. Dialog, header drag, native metadata and grid share conversions. The artificial 3-character and 18-point minimums are removed; native Excel maxima remain 255 characters and 409 points. Positive rendered dimensions occupy at least one CSS pixel. Row metadata changes retain the 10,000-row work limit. Native worksheet default dimensions are respected.

Grid layout quantizes each size to browser layout subpixels before building cumulative coordinates, including CSS zoom. Thin rows clip labels/padding rather than increasing row height. Selection uses an inset shadow instead of a border that would impose a four-pixel minimum. Consecutive fractional rows/columns must remain aligned around row/column 500.

Raster picture resize preserves the starting aspect ratio with all handles; Shift allows independent dimensions. Shape side-handle behavior is unchanged. PNG/JPEG source bytes are preserved without resampling during resize. Existing low-resolution source pixels cannot become sharper merely by enlarging a picture.

Imported one-cell pictures, including twoCellAnchor editAs=oneCell, retain physical extent when axes change. Native xfrm/ext is used where available, otherwise the initial worksheet dimensions define the fallback. Changed fixed pictures normalize to oneCellAnchor during export without replacing their original pic subtree. Untouched drawing parts remain unchanged; Undo restores the baseline. Native two-cell pictures that size with cells retain that behavior.

Browser regression: tests/browser-small-sizes.py covers small/fractional/zero dimensions, drag, repeated fractional dimensions at zoom 1 and 1.75, source XML default sizes, fixed picture sizing, proportional resize, original image bytes, Undo/Redo, save/reload/export and readonly. Existing workbook roundtrip, context-menu and editor interaction suites cover preservation and compatibility. Context menus survive automatic workspace scrolling at zoom and dismiss on user wheel/scrollbar gestures or worksheet scroll.

Excel size bounds: https://support.microsoft.com/en-gb/excel/change-the-column-width-and-row-height?nochrome=true
