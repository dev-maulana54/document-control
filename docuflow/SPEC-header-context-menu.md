# Text Box dan menu header spreadsheet

Text Box tidak memiliki outline permanen pada web maupun XLSX. Bingkai seleksi sementara tetap tersedia untuk drag/resize; bentuk lain mempertahankan garisnya.

Klik kanan header kolom/baris membuka menu yang bisa dicari dan memakai pilihan header yang sedang aktif. Aksi: Cut/Copy/Paste/Paste Special (nilai, mengikuti clipboard aplikasi), Insert/Delete, Clear Contents, Format Cells, Column Width/Row Height, Hide/Unhide. Toolbar kecil menyediakan bold/italic dan warna. Menu mendukung keyboard, Escape, klik luar, scroll/resize untuk menutup, serta batas viewport/zoom. Mode baca hanya mengizinkan Copy.

Insert/Delete adalah transaksi pada model workbook: alamat sel, rentang merge, lebar/tinggi/hidden/style, rumus relatif/absolut dan lintas-sheet, defined names/print ranges, data validation/conditional formatting/hyperlinks, serta anchor objek ikut bergeser. Shared formula dimaterialisasi sebelum perubahan; string literal formula tetap utuh. Format kompleks yang belum bisa dijamin (tables/charts/pivot/comments, referensi 3D, perubahan sebagian array) ditolak sebelum mutasi. File meminta kalkulasi ulang di Excel; editor tetap menampilkan cached formula values.

Undo/Redo untuk struktur mencakup semua sheet, workbook names, metadata drawing, dan hidden-sheet XML. Ekspor lalu Undo wajib memulihkan bagian file yang sudah pernah diekspor. Riwayat tetap 20 langkah/8 MB (satu snapshot besar minimum) dan data disimpan hanya setelah otorisasi/versi/route diperiksa ulang setelah pekerjaan async.

Hide/Unhide menyimpan atribut XML dan menghilangkan baris/kolom dari grid tanpa merusak koordinat logical; merged cell dan image anchor memakai sumbu visible yang sama. Corner menyediakan Unhide All Rows/Columns ketika seluruh sumbu tersembunyi. Format header berlaku pada sel yang sudah ada serta style default sumbu untuk sel baru. Pembatasan kerja clipboard yang sudah ada tetap berlaku; operasi row metadata dibatasi 10.000 baris per aksi kecuali Hide/Unhide All yang memakai default XML.

Verifikasi unit transform formula/range dan browser context actions + Undo/Redo + save/reload/export, cross-sheet/hidden formulas dan names, shared/array preflight, drawing shifts, hidden geometry, no-outline textbox, readonly, popup search/keyboard/viewport, dan regresi editor.
