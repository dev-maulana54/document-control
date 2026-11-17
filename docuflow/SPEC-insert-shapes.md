# Insert Shapes

User menunjuk galeri Shapes pada tab Insert. Tambahkan galeri bergroup Basic Shapes, Lines, Arrows, Callouts, Symbols, Flowchart, Stars and Banners, recent shapes serta pencarian. Semua tombol yang terlihat menyisipkan bentuk yang berfungsi.

Bentuk ditempatkan pada sel aktif sebagai objek vektor yang bisa dipilih, digeser, di-resize melalui handle yang sudah ada, diberi teks/warna garis/warna isi/ukuran font, dan dihapus. Operasi satu langkah Undo/Redo; metadata dokumen dan status approval tetap diperiksa sebelum mutasi. Mode baca menampilkan objek tanpa kontrol edit.

Simpan bentuk sebagai DrawingML xdr:sp pada oneCellAnchor dengan a:prstGeom dan xdr:txBody, sehingga hasil unduhan tetap merupakan shape Excel yang dapat diedit. Teks memakai DOM textContent; geometri dan preset berasal dari katalog lokal; warna/ukuran divalidasi. Native shape yang didukung dibaca kembali dari drawing, dengan anchorIndex yang stabil. Objek template lain tetap dipertahankan. Jangan menggandakan shape/media pada ekspor berulang atau meninggalkan drawing/shape yang sudah dibatalkan lewat Undo.

Re-use gerakan/handle gambar dengan shape model kind=shape tanpa membuat raster/media file. Maksimal 200 bentuk per sheet dan 1.000 karakter per teks. Tes unit katalog/validasi serta browser galeri→insert→edit→drag→resize→Undo/Redo→save/reload→export/native XML→delete/Undo dan readonly, termasuk drawing baru, bersama gambar, dan shape original.

Rujukan: https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.shapetypevalues ; https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.spreadsheet.onecellanchor ; https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.spreadsheet.shape.textbody


## Edit teks dan toolbar bersama

Klik satu kali memilih/menyeret shape; klik dua kali membuka textarea langsung di tengah objek. Teks dikomit saat klik di luar atau Ctrl+Enter; Escape membatalkan sesi ketik, Ctrl+S mengomit lalu menyimpan. Berpindah ke sel atau objek lain tetap mengomit teks tanpa membatalkan gerakan pointer. Delete/Backspace di dalam teks tidak menghapus objek.

Font, ukuran 1?409 pt, bold/italic/underline, warna teks/isi, wrap serta alignment di Home mengikuti objek shape/text box yang dipilih; pemilihan sel kembali mengarahkan toolbar ke sel. Operasi yang hanya berlaku pada sel dinonaktifkan selama shape terpilih. Format dipertahankan dalam DrawingML, Undo/Redo, save/reload, dan unduhan XLSX. Outline setiap preset digambar eksplisit; Text Box tetap tanpa outline dan ikonnya dibedakan dari Rectangle. Preview drawing yang gagal dimuat kembali ke geometri vektor.

Verifikasi: `python tests/browser-shape-toolbar.py`, tes shapes/text-box/preservation, `npm run check`, `npm test`.


## Palet warna Home

Warna isi dan warna teks membuka palet Theme Colors (warna theme workbook bila tersedia, beserta variasinya) dan Standard Colors. Dialog pemilih warna khusus/HEX hanya dibuka melalui More Colors. No Fill pada warna isi menghapus fill asli, bukan menggantinya dengan putih; berlaku pada sel, shape, dan text box. Warna toolbar mengikuti pilihan aktif. Pilihan/rentang tetap dipertahankan selama popover/dialog, mutasi ditolak bila dokumen atau versi telah berubah, dan Escape/klik luar menutup palet. Uji: `python tests/browser-colors.py`.
