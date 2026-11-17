# Permintaan, persetujuan paralel, dan penerbitan dokumen

User menetapkan: Create / Revise adalah fitur request, semua approver wajib setuju tanpa urutan, dan admin menerbitkan manual setelah lengkap. Editor tetap berada di aplikasi, alur IK tanpa email. Implementasi melanjutkan prototype penyimpanan browser yang sudah ada; tidak mengklaim identitas/otorisasi server atau sinkronisasi lintas komputer.

| Kemampuan | Modul | Bukti |
| --- | --- | --- |
| Request terpisah dari daftar resmi | documentRequests vs documents | Tes browser memastikan draft/submitted/approved belum ada di katalog |
| Aturan status dan otorisasi request | document-workflow.js | Tes unit self approval, semua approver, vote ulang, stale source, metadata berubah |
| Daftar, pengajuan, keputusan, audit, publikasi | document-requests.js | Tes browser tiga akun, return/edit/resubmit/publish/revisi |
| Salinan file dan simpan draft | app.js, workbook-editor.js, workbook-store.js | Roundtrip/save/reload, official readonly, file asal tidak berubah |
| Toolbar XLSX dan rentang | workbook-format.js, workbook-toolbar.js | Format tersimpan di XML/export, merge/unmerge/undo/redo |

## Kontrak status

Admin dapat menghapus request Draft/returned dari tabel Create / Revise dengan
konfirmasi judul/nomor/revisi. User biasa tidak mendapat tombol atau izin hapus.
Request in_review/approved perlu ditarik dahulu oleh pembuat; published atau
request yang dirujuk dokumen resmi tetap menjadi riwayat. Konfirmasi memeriksa
identitas aktor, snapshot database/record dan kebijakan pada transaksi terbaru.
Kegagalan save tidak menghapus record/file. Setelah sukses, file workbook aktif,
submitted dan tiap putaran dilepas melalui pemeriksaan referensi bersama; dokumen
resmi dan template tidak berubah. Cache editor request yang dihapus dibuang.
Verifikasi: tests/document-workflow.test.cjs dan tests/browser-request-delete.py.

`draft → in_review → approved → published`; satu keputusan pengembalian membuat `in_review → returned`. Draft/returned hanya dapat diedit pembuat. Pembuat dapat menarik in_review/approved ke draft dengan konfirmasi; persetujuan sebelumnya batal. Minimal dua approver berbeda selain pembuat; semuanya harus memiliki akses kategori pada saat pengajuan. Tidak ada urutan. Approver hanya memutuskan sekali per putaran; pengembalian wajib catatan. Pengajuan ulang membuat putaran baru dengan semua keputusan pending dan riwayat sebelumnya dipertahankan.

Request hanya terlihat oleh pembuat, approver yang ditugaskan, dan admin, dengan izin kategori. User biasa yang sekadar mempunyai kategori sama tidak melihat draft orang lain. Admin dapat meninjau tetapi tidak mengedit draft orang lain. Dokumen resmi selalu hanya baca di editor; Ajukan Update membuat salinan baru. Simpan metadata/file tidak pernah menulis ke documents.

Pengajuan mengikat counter versi isi, identitas file workbook/isi PDF, serta metadata yang akan diterbitkan. Keputusan dan publikasi memeriksa snapshot itu. Admin baru dapat menerbitkan ketika semua keputusan putaran aktif approved atas snapshot sama. Publikasi memakai file yang disetujui, tidak meminta file pengganti. Revisi lama tetap active sampai publikasi; publikasi memeriksa sumber masih versi resmi terbaru dan tidak berubah, lalu mengarsipkannya. Publikasi ganda ditolak.

Workbook terbit dan request terbit berbagi file immutable. Revisi berikutnya menyalin file itu ke key baru. Setiap putaran menyimpan snapshot submission; file lama dapat diunduh dari Versi yang Ditinjau. File yang dirujuk request/riwayat tidak dibersihkan. Cache dirty editor dibuang saat status atau versi record berubah antar tab; unduh hanya baca selalu memakai file tersimpan. Dokumen yang dirujuk riwayat request tidak dapat dihapus. Kategori dan jenis yang dipakai request tidak dapat dihapus; nama jenis yang dipakai request tidak dapat diganti. Migration sekali mempertahankan dokumen lama dengan approvalOrigin legacy, tanpa membuat persetujuan palsu.

## Toolbar

Font, ukuran, bold/italic/underline, warna teks/sel, horizontal/vertical alignment, wrap, border semua/tanpa, format angka/persen/tanggal/teks, merge/unmerge, undo/redo. Rentang menggunakan A1:D5 atau Shift+klik. Maksimal 5.000 sel per aksi format. Merge yang membuang isi atau memotong merge lama ditolak. Style XML asli diklon dan direferensikan sel; format baru ikut diserialisasi dalam XLSX. Undo/redo menyimpan snapshot XML sheet/style, maksimal 20 langkah dengan anggaran ukuran; mengetik pada satu sel dikelompokkan sampai fokus berpindah. Riwayat tidak persisten setelah reload.

Rumus template tetap hanya baca, nilai hasil memakai cache Excel. Tidak ada kalkulasi formula penuh, grafik/pivot/macros baru atau seluruh fitur Excel desktop. Bagian paket yang tidak disentuh dipertahankan, termasuk gambar, sheet lain, dan pengaturan cetak. Batas XLSX dan area 1.000×1.000 tetap berlaku.

## Validasi

`npm run check`, `npm test`, `npm audit --omit=dev`, `python tests/browser-workbook.py`, `python tests/browser-approval.py`. Browser terisolasi: upload invalid/macro, template tidak berubah, copy/save/reload/download, style/merge/image/formula/print settings, batas dan virtualisasi 1.000.000 sel, izin dicabut, official readonly, email metadata tanpa kirim, draft tidak masuk resmi, semua approver, pengembalian, versi sumber tetap sampai admin terbit, dan layar 320/768/1024/1440.

Pengujian pergantian akun terjadi di browser/origin sama. Untuk pemakaian perusahaan lintas perangkat, data/file, autentikasi, audit, dan transisi persetujuan harus dipindahkan ke backend bersama sebelum dinyatakan sebagai otorisasi produksi.

Format dan merge memakai SpreadsheetML Open XML ([Microsoft: merge cells](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/how-to-merge-two-adjacent-cells-in-a-spreadsheet)). Format tanggal menghormati workbookPr/date1904; perbedaan sistem tanggal dijelaskan di [Microsoft: date systems](https://support.microsoft.com/en-us/excel/date-systems-in-excel).

UX terbaru: Simpan Create/Update kembali ke tabel permintaan dengan Edit Excel terpisah dari Lihat Excel. Edit nonaktif ketika bukan draft/returned milik pembuat; Lihat selalu hanya baca. Viewer/editor memakai ruang penuh, tanpa header/sidebar aplikasi. Lihat SPEC-editor-ux.md.
