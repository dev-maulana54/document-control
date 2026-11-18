# PDF signature resizing

After placing a signature, show four corner resize handles and size controls (10–300%, slider, typed percentage and smaller/larger buttons). Keep the image aspect ratio and allow dragging to reposition. Clamp its actual image rectangle inside the PDF crop box, including rotated pages. Preview placement/size use PDF points and stay consistent when resizing the viewer or scrolling.

The approval owner independently validates the percentage and derives image dimensions from the stored PNG before stamping with PDF-LIB. The rendered signature in the saved PDF must match the preview; do not resize the original stored signature image or flatten PDF pages. Old confirmation messages without a percentage keep the 100% default. Signing and resize controls lock during save and after a successful approval. Preserve all existing identity, round, source artifact and signature version checks.

Verify pure geometry bounds/ratio/invalid input, browser corner drag and controls, viewer resize, and actual saved PDF image transformation. Source: https://pdf-lib.js.org/docs/api/classes/pdfpage#drawimage.
