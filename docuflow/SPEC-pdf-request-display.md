# PDF approval quality and request handoff display

PDF approval uses a canvas bitmap sized for the display density independently of its CSS size, following https://mozilla.github.io/pdf.js/examples/. Fit the page to the actual viewer width, redraw after viewport changes, and keep PDF/signature coordinates independent of bitmap density. Render nearby pages only and limit each canvas allocation so a multi-page PDF does not retain a high resolution bitmap for every page. Preserve the uploaded PDF bytes; signing adds the signature to the original PDF rather than flattening its page.

Create / Revise retains every readable request after admin handoff. Hide the Persetujuan column and review counts on this list; show Selesai for in_review, approved and published. Draft, admin_review and returned keep their existing labels. Actual workflow status, signatures, decisions, publication rules and the detailed status on Persetujuan Dokumen are unchanged. The last request-list stage reads Selesai. Empty table rows span five columns here and six on the approvals list.

Verify a high-DPI PDF preview with small vector text, resize and signature placement, the full admin/parallel approval/publication flow, and request list status before/after handoff and return.
