# PT Century Batteries Indonesia — Document Control

Website prototipe menggunakan HTML, CSS, dan JavaScript murni. Seluruh aset runtime tersedia lokal sehingga aplikasi tetap dapat dibuka tanpa instalasi atau proses build. Dependency npm hanya diperlukan untuk pengujian dan pemeliharaan library lokal.

## Menjalankan

Cara termudah: **klik dua kali `index.html` di folder `document-control` atau di folder `docuflow`**. Halaman ini langsung membuka aplikasi lengkap, dengan CSS, JavaScript, dan font lokal. Tidak memerlukan koneksi internet.

Dari folder `docuflow`, jalankan:

```powershell
npm start
```

Buka http://localhost:4173. `npm start` juga dapat dijalankan dari folder utama `document-control`. Gunakan alamat yang sama saat membuka ulang karena file lokal, localhost, dan situs online menyimpan data secara terpisah.

## Akun demo

| Role | Email | Password | Departemen | Seksi |
| --- | --- | --- | --- | --- |
| Admin | admin@docuflow.id | admin123 | Engineering | Process Engineering |
| User | user@docuflow.id | user123 | Production | Assembly |

Tombol Demo Admin dan Demo User mengisi kredensial; klik **Masuk ke workspace** untuk login.

## Fitur

- Home berisi kategori dokumen, panduan alur pengendalian dokumen, dan aktivitas terbaru dengan nomor, judul, revisi, serta tanggal pembaruan. Sidebar memakai logo CBI tanpa latar putih, nama PT Century Batteries Indonesia, dan Document Control.
- Master Dokumen dengan pencarian daftar, filter jenis/departemen yang dapat diketik, navigasi keyboard pada pilihan filter, dan pagination. Reset filter dilengkapi ikon. Tombol **Tambah Dokumen** hanya untuk admin dan membuka modal formulir tanpa berpindah halaman. Tombol **Simpan Dokumen** menyimpan draft permintaan lalu kembali ke tabel Create / Revise; daftar resmi belum berubah. Tabel menyediakan Edit Excel (hanya draft/returned milik pembuat) dan Lihat Excel (hanya baca). Sesudah submit, Edit Excel nonaktif. Batal, tutup, dan Escape menutup modal. Pembuatan juga tersedia melalui menu Create / Revise Dokumen. Pencarian header dan tombol ekspor tetap dihapus.
- Kolom daftar: No, Nama Dokumen, Nomor Dokumen, Jenis Dokumen, Departement, Revisi, Tanggal Efektif, dan Aksi. Nomor urut mengikuti pagination dan dimulai lagi dari 1 pada hasil filter. Tanggal Efektif memakai `effectiveDate`, terpisah dari tanggal pembaruan aktivitas.
- View membuka editor untuk dokumen Excel, preview untuk PDF, atau detail metadata. Ajukan Update membuat permintaan revisi terpisah; dokumen resmi tidak diedit langsung. Delete hanya dapat dijalankan admin untuk dokumen lama yang tidak dirujuk revisi atau riwayat permintaan. User tidak memiliki tombol Delete atau Tambah Dokumen di Master; pembuatan tetap tersedia melalui Create / Revise.
- Kategori Checksheet, Instruksi Kerja, Standard Engineering, Operation Manual, Inspection Manual.
- Menu **Create / Revise** menampilkan permintaan dokumen baru (revisi 0) atau revisi (revisi +1, nomor sama). Draft terpisah dari Dokumen resmi. Semua approver wajib setuju tanpa urutan, lalu admin menerbitkan manual; baru saat itu versi sebelumnya diarsipkan. Revisi ditampilkan 0, 1, 2, dan seterusnya, tanpa nol tambahan.
- Pilihan jenis dokumen, departemen, seksi, dokumen sumber revisi, dan select pada formulir admin dapat dicari dengan mengetik. Mendukung ArrowUp/ArrowDown/Enter/Escape; pilihan seksi otomatis menyesuaikan departemen. Label tanggal menjadi **Tanggal Efektif**. Kolom deskripsi/isi serta catatan nomor otomatis dihapus dari formulir.
- Lampiran baru hanya PDF, maksimal 2 MB per file, dengan pemeriksaan ekstensi dan header PDF. Preview tersedia sebelum penyimpanan, lewat tombol View pada tabel, dan lewat Preview PDF di detail dokumen; semuanya membuka halaman preview sendiri di tab baru. Preview tanpa header atas, tombol unduh, atau revisi; footer hanya menampilkan nomor dan judul dokumen beserta nama perusahaan. Toolbar melayang menyediakan zoom 25–300%, sesuaikan halaman, dan layar penuh. Isi dirender oleh pembaca PDF bawaan browser dalam iframe tanpa library atau layanan eksternal. Judul dokumen tetap membuka detail metadata; unduh tetap tersedia di detail dokumen sesuai izin.
- Header tidak memiliki lonceng atau daftar notifikasi. Form non-IK menyediakan **Notifikasi Email** melalui pencarian beberapa penerima. Pilihan disimpan pada dokumen; layanan email belum terhubung sehingga email belum dikirim dan tidak ada pesan sukses pengiriman. Form IK tidak menyediakan penerima email atau unggah lampiran.
- Status permintaan: Draft, Menunggu persetujuan, Perlu perbaikan, Siap diterbitkan, Sudah diterbitkan. Pilih minimal dua approver selain pembuat. Isi dikunci selama persetujuan dan setelah disetujui. Pengembalian atau penarikan ke draft mengharuskan persetujuan ulang; riwayat putaran tetap tersedia. Menu Persetujuan Dokumen menampilkan permintaan yang ditugaskan kepada akun.
- Admin mengelola pengguna, departemen, dan seksi.
- Menu admin **Jenis Dokumen** mendukung tambah, edit nama/kode awalan, dan hapus jenis yang belum dipakai dokumen. Data jenis otomatis dipakai oleh sidebar, kategori Home, filter, dan formulir. Nama jenis yang dirujuk permintaan tidak dapat diubah agar riwayat persetujuan tetap konsisten. Untuk jenis lain, mengganti nama memperbarui dokumen terkait; nomor dokumen yang sudah ada dipertahankan. Jenis yang masih dipakai, termasuk oleh arsip, tidak dapat dihapus.
- User membaca dokumen yang tersedia untuk akunnya serta membuat dan merevisi dokumen untuk departemennya.
- Layout responsif dan sidebar untuk perangkat seluler.
- Identitas login, sidebar, footer, serta judul halaman memakai **PT Century Batteries Indonesia**. Akun demo dan key penyimpanan lama dipertahankan.
- **Kategori Dokumen** terpisah dari jenis dokumen, tersedia di formulir, detail, daftar, dan filter. Admin mengelola kode/nama dan jenis dokumen kategori; kategori yang dipakai dokumen, versi lama, atau permintaan tidak dapat dihapus. Lima kategori awal: OM-PR2-ASY, OM-PR2-CHG, OM-PR1-CST, OM-PR1-LPP, dan OM-PR1-FRM.

## Otorisasi departemen

1. Masuk sebagai admin, buka **Otorisasi Dokumen**, lalu pilih departemen.
2. Centang kategori yang boleh dibuka dan klik **Simpan Otorisasi**. Tanpa pilihan, user di departemen tersebut tidak dapat membuka dokumen. Admin tetap memiliki seluruh akses.
3. Untuk menyamakan akses, klik **Salin Otorisasi**, pilih departemen sumber dan beberapa departemen tujuan, lalu **Terapkan Salinan**. Izin tujuan diganti dengan izin sumber yang sudah disimpan. Salinan berdiri sendiri; menyalin sumber kosong mengosongkan izin tujuan.

Dokumen lama dimigrasikan sekali ke **LEGACY · Belum Dikategorikan**. Departemen lama hanya mendapat izin kategori tersebut; kategori baru dan departemen baru tidak mendapat izin otomatis. Permintaan baru memilih kategori yang diizinkan. Revisi mempertahankan identitas dan kategori sumber. Dokumen lama tetap tersedia tanpa persetujuan buatan; hanya permintaan baru yang memakai alur persetujuan.

Daftar, detail, PDF, editor Excel, unduh, edit, revisi, dan aktivitas mengikuti izin kategori. Halaman Otorisasi Dokumen memakai tabel kategori dengan pencarian serta checkbox izin; fitur salin tetap tersedia. Kepemilikan dokumen tidak melewati pembatasan kategori. Akses diperiksa kembali sebelum handoff PDF dan penyimpanan setelah pembacaan file.

## Template dan editor Excel

1. Admin membuka **Template Dokumen**, memilih jenis **Instruksi Kerja**, lalu mengunggah format softcopy `.xlsx` dan menyimpan template.
2. User membuka **Create / Revise**, mengisi identitas IK, dan memilih kategori yang diizinkan. Form tidak memiliki lampiran atau penerima email. Tanpa template, simpan ditolak dengan petunjuk untuk admin.
3. **Simpan Dokumen** membuat salinan workbook dan kembali ke tabel permintaan. Klik **Edit Excel** pada baris untuk mulai mengedit. User dapat mengubah teks/angka, menempel blok sel, berpindah sheet, menyimpan perubahan, membuka ulang, dan mengunduh Excel.
4. Revisi menyalin workbook versi sumber, sehingga perubahan tidak mengubah versi sebelumnya. Penggantian template hanya memengaruhi dokumen baru. IK lama yang belum memiliki workbook tetap mempertahankan file lamanya tanpa konversi otomatis; kontrol lampiran/email disembunyikan.

Setiap sheet langsung menyediakan **1.000 baris dan 1.000 kolom (A-ALL)**, termasuk workbook lama dan dokumen hanya baca. Tidak perlu menambah area bertahap. Baris dan kolom dirender di sekitar viewport, sehingga satu juta sel logis tidak menjadi satu juta elemen halaman. Kotak alamat mendukung Go To dan rentang A1:D5; Tab/Shift+Tab melewati batas jendela tampilan serta berpindah baris pada kolom ke-1.000.

Halaman Excel memakai seluruh ruang tanpa sidebar/header aplikasi, dengan tombol kembali ke permintaan. Drag memilih area sel; header memilih baris/kolom; Shift+klik tetap tersedia. Format berlaku ke pilihan sekaligus, lalu fokus kembali ke sel aktif (formula bar bila anchor di luar viewport). Font bisa dicari, ukuran diketik antara 1-409 pt dalam kelipatan 0,5. Ribbon Home memakai ikon dan kelompok Clipboard, Font, Alignment, Number, Cells, dan Editing. Insert menambahkan PNG/JPG, simbol, dan teks ke workbook; View mengatur gridlines dan formula bar. Copy/Cut/Paste, tempel TSV dari Excel, Clear Contents, Find, tinggi baris, dan lebar kolom tersedia. Clipboard aplikasi menjadi fallback; Paste... selalu menyediakan tempel dari luar. Toolbar menyediakan font/ukuran, bold/italic/underline, warna teks/sel, perataan, wrap, border, format angka/tanggal/persen, merge/unmerge, dan undo/redo. Pilih rentang seperti A1:D5 atau Shift+klik. Merge mengikuti [mekanisme Excel](https://support.microsoft.com/en-us/excel/get-started/merge-and-unmerge-cells-in-excel): hanya isi sel kiri atas dipertahankan, termasuk bila kosong; isi lainnya dihapus. Ctrl+Z mengembalikan seluruh isi, rumus, format, dan gabungan sebelumnya. Grup shared formula yang terpotong atau hasil array/tabel data yang berubah sebagian tetap ditolak agar rumus di luar pilihan utuh. Kalkulasi ulang diminta saat file dibuka di Excel. Shortcut editor: Ctrl/Cmd+Z Undo, Ctrl/Cmd+Y atau Ctrl/Cmd+Shift+Z Redo, Ctrl/Cmd+S Simpan, dan Ctrl/Cmd+B/I/U bold/italic/underline. Input pencarian/font/ukuran tetap memakai undo teks bawaan; mode baca tidak mengubah workbook. Riwayat undo maksimal 20 langkah dan dibatasi ukuran; tidak disimpan setelah reload.

Editor mempertahankan bagian ZIP/XML yang tidak diedit, termasuk style, merge, gambar, rumus, worksheet lain, dan pengaturan cetak. Antarmuka menampilkan gaya utama dan gambar PNG/JPEG; objek Excel lain tetap disimpan di file, tetapi tidak semuanya ditampilkan. Sel rumus hanya-baca dan menampilkan nilai tersimpan; kalkulasi formula serta seluruh fitur desktop Excel bukan bagian editor ini. File meminta kalkulasi ulang ketika dibuka di Excel.

Batas: `.xlsx` maksimal 2 MB, 16 MB total bagian yang diekstrak, 8 MB per bagian, maksimal 20 sheet terlihat, dan 1.000 baris/1.000 kolom per sheet terlihat. Sheet tersembunyi dipertahankan tanpa dirender. Input setiap sel maksimal 4.000 karakter. Paket terenkripsi, macro standar, XML DTD, traversal path, dan karakter XML terlarang ditolak. Relasi eksternal tidak dimuat oleh website. Penyimpanan file versi lama yang tidak dirujuk lagi dibersihkan setelah metadata baru berhasil disimpan.

Workbook disimpan di IndexedDB pada browser/origin yang sama, bukan dibagikan lintas perangkat. Metadata tetap memakai localStorage yang sudah ada. Menekan Back/tautan keluar dengan perubahan belum tersimpan meminta konfirmasi; kegagalan simpan mempertahankan file sebelumnya.

## Struktur file

```text
index.html          Halaman pembuka lokal di folder docuflow
dist/
  index.html       Kerangka halaman dan font
  styles.css       Seluruh styling dan breakpoint responsif
  app.js           UI, login, alur dokumen, dan penyimpanan
  document-access.js Kebijakan kategori, migrasi, dan salin otorisasi
  document-workflow.js Aturan status, persetujuan paralel, dan penerbitan
  document-requests.js Daftar permintaan, approver, keputusan, dan audit
  workbook-format.js Gaya XLSX, merge, snapshot undo, tampilan angka
  workbook-toolbar.js Ribbon Home/View, rentang, dan riwayat undo/redo
  workbook-ribbon-actions.js Clipboard, cari, ukuran sel, dan navigasi keyboard
  workbook-selection.js Drag grid/header, seleksi, autoscroll, dan fokus
  workbook-fonts.js Font searchable dan input ukuran
  workbook-media.js Validasi gambar dan drawing/rels/assets XLSX
  workbook-insert.js Tab Insert: Pictures, Symbol, Text
  document-settings.js UI admin kategori dan otorisasi departemen
  recipient-picker.js Pencarian dan pemilihan penerima email non-IK
  document-templates.js Pengelolaan format softcopy per jenis
  workbook-editor.js Editor nilai sel, perluasan area, simpan, dan unduh
  workbook-grid.js Renderer baris di sekitar viewport untuk sheet besar
  workbook-engine.js Pembacaan XML dan penyimpanan paket XLSX
  workbook-store.js Penyimpanan file Excel di IndexedDB
  xlsx-package.js Validasi ZIP, alamat sel, dan input XML
  vendor/          JSZip lokal beserta lisensi
  pdf-viewer.html  Halaman preview PDF di tab baru
  pdf-viewer.js    Handoff PDF, zoom, fit, dan layar penuh
  pdf-viewer.css   Tampilan preview dan toolbar melayang
  favicon.svg      Ikon aplikasi
  assets/fonts/    Font lokal Plus Jakarta Sans beserta lisensi OFL
.openai/hosting.json  Konfigurasi hosting Sites
```

## Model data localStorage

Key `docuflow.database.v1` menyimpan objek dengan koleksi yang menyerupai tabel:

- `users`: id, nama, email, password demo, role, departmentId, sectionId.
- `departments`: id, nama, kode.
- `sections`: id, departmentId, nama.
- `documentTypes`: id stabil, name, prefix. Data lama mendapat koleksi ini secara otomatis tanpa mengganti dokumen atau akun. Jenis khusus pada data lama juga dipertahankan. Bookmark lama seperti `#type-0` tetap didukung; tautan baru memakai id jenis.
- `documentCategories`: id stabil, code, name, documentTypeId. Jenis dipilih saat tambah/edit kategori dan tampil di tabel. Kategori baru wajib memiliki jenis; pilihan kategori formulir mengikuti jenis dan otorisasi. Migrasi memakai jenis aktual dokumen/permintaan bila tunggal, lalu awalan kode untuk kategori kosong. Kategori lama campuran tetap tidak terikat satu jenis. Migrasi tidak mengubah dokumen atau izin. Jenis yang dirujuk kategori tidak bisa dihapus; kategori terpakai tidak bisa diganti ke jenis yang bertentangan. `documents.categoryId` merujuk kategori tersebut.
- `departmentAuthorizations`: pemetaan id departemen ke array id kategori yang diizinkan. Pengaturan hilang/kosong berarti tidak ada izin. `documentAccessVersion: 1` menandai migrasi sekali; hilangnya pengaturan setelah migrasi tidak memberikan izin ulang.
- `documents`: id, kode, judul, jenis, categoryId, departmentId, sectionId, ownerId, revisi, lampiran, supersedesId, history, tanggal. `status` active/archive menandai versi resmi. Dokumen baru masuk koleksi ini hanya melalui publikasi admin setelah persetujuan lengkap; legacy ditandai tanpa persetujuan buatan.
- `documentRequests`: metadata draft, requesterId, sourceId, status, contentVersion, reviews per putaran, submissions (snapshot metadata/file per putaran), events, dan id dokumen terbit. File tiap putaran tetap tersedia untuk audit.
- `documentTemplates`: typeId, fileName, workbookKey, updatedAt, updatedBy. Data workbook berada di IndexedDB `cbi.workbooks.v1`, object store `files`. `documents.workbookKey` merujuk salinan milik dokumen.
- `activities`: id, userId, documentId, aksi, waktu, serta salinan nomor dokumen, judul, revisi, dan tanggal pembaruan saat aktivitas dibuat. Entri lama yang belum memiliki salinan metadata tetap ditampilkan menggunakan data dokumen yang tersedia.
- `notifications`: data lama dipertahankan untuk kompatibilitas; tidak ditampilkan atau ditambah. `documents.emailRecipientIds` menyimpan pilihan penerima non-IK, dengan `emailStatus: not_configured` selama layanan pengirim belum tersedia.

Key `docuflow.session.v1` menyimpan id pengguna yang sedang login. Data contoh dibuat sekali pada kunjungan pertama, lalu perubahan bertahan setelah refresh. Tab dalam origin yang sama menyinkronkan data melalui event `storage`.

Penyimpanan lokal terbatas per browser dan origin, sehingga data tidak dibagikan antar perangkat. PDF disimpan sebagai data URL Base64 di dalam record dokumen setelah **Simpan Dokumen**. Memilih file dan menjalankan preview saja belum menyimpan dokumen. File tetap tersedia setelah refresh pada browser/alamat yang sama.

Total kuota localStorage sekitar 5 MiB per origin, termasuk seluruh metadata dan lampiran, bukan 5 MiB untuk setiap PDF. Base64 menambah ukuran data sehingga batas 2 MB per file tidak menjamin kuota masih cukup. Jika kuota penuh, penyimpanan dibatalkan dan data sebelumnya dipertahankan. Menghapus data situs akan menghapus file prototipe. Lihat [kuota penyimpanan browser](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) dan [FileReader Base64](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL).

Preview membuka `pdf-viewer.html`, lalu mengirim PDF melalui `postMessage` dengan pemeriksaan sumber, origin, dan token per tab. Halaman preview memvalidasi PDF, membuat Blob bertipe `application/pdf` sendiri, lalu melepas opener. PDF tetap dapat dilihat setelah aplikasi utama di-refresh. URL Blob tidak disimpan sebagai data permanen dan dilepas ketika tab preview ditutup; zoom memakai URL baru agar parameter zoom diterapkan ulang oleh pembaca browser. Zoom memuat ulang tampilan PDF dari awal. Layar penuh mengikuti dukungan/izin browser; jika tidak tersedia, tampil petunjuk. Tidak ada PDF yang diunggah ke server. Jika pop-up diblokir, aplikasi meminta pengguna mengizinkannya. Lampiran lama non-PDF tidak dihapus otomatis; mengganti atau menyimpan ulang dokumen tersebut memerlukan PDF.

Notifikasi dalam aplikasi dan lonceng sudah dihapus. Email otomatis belum aktif karena belum ada layanan pengirim. Tidak ada email yang dikirim saat simpan atau pengujian. Pilihan penerima non-IK hanya disimpan sebagai metadata; alur IK tidak memakainya.

Autentikasi dan pembatasan role ini merupakan simulasi di frontend. Password demo disimpan sebagai teks biasa. Untuk pemakaian produksi perlu backend, database, hash password, validasi izin di server, dan penyimpanan berkas. Gunakan data contoh selama prototipe.

Font: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), disimpan lokal beserta lisensi OFL; tidak bergantung pada Google Fonts saat website dibuka. Ikon berupa SVG inline tanpa library eksternal.

Penyempurnaan UI memakai skill [frontend-ui-engineering](../.agents/skills/frontend-ui-engineering/SKILL.md). Lihat [kontrak desain dan verifikasi](UI-DESIGN.md). Perubahan mencakup login, pilihan yang dapat dicari, tabel bertumpuk di layar kecil, fokus keyboard, dialog berlabel, dan skip link.

## Pemeriksaan

```powershell
npm ci --ignore-scripts
npm run check
npm test
npm audit --omit=dev
```

Perintah ini memeriksa sintaks JavaScript, ketersediaan halaman HTML beserta asetnya, font lokal, serta kebijakan akses/migrasi/salin otorisasi. Dua belas tes otomatis lulus. Mutasi kebijakan akses dalam memori yang membalik izin ditangkap oleh lima tes; file produksi tidak dimodifikasi oleh percobaan tersebut.

Verifikasi perubahan kategori/otorisasi dilakukan melalui Playwright dengan Chromium terisolasi: CRUD kategori, larangan menghapus kategori terpakai, simpan izin departemen, salin ke dua tujuan, salinan independen, sumber kosong, tujuan wajib, refresh, akses user diizinkan/ditolak, pencabutan akses dokumen milik sendiri, penyembunyian notifikasi tanpa izin, pencarian beberapa penerima lintas kata pencarian, keyboard, chip/hapus pilihan, dan dropdown seluler. Preview tanpa unduh/revisi serta nomor dokumen pada preview file pengganti update/revisi lulus. Pemindahan kategori seluruh versi lulus. Login/otorisasi diperiksa pada 320/768/1024/1440px, modal penerima pada 320/768px, dan entrypoint file lokal lulus. Tidak ada error JavaScript atau peringatan console pada pengujian tambahan. Chrome DevTools MCP tidak tersedia pada sesi ini sehingga pemeriksaan browser memakai Playwright.

Verifikasi Excel yang dapat diulang (server `npm start` berjalan di terminal terpisah):

```powershell
python -m pip install playwright
python -m playwright install chromium
python tests/browser-workbook.py
```

Tes browser memakai profil terisolasi dan workbook uji dengan dua sheet, logo, merge, style, formula, pengaturan cetak, dan bagian XML tambahan. Pengujian memeriksa roundtrip XLSX, bagian tak diedit identik, template asli utuh, refresh, revisi independen, batas role/kategori, cleanup file, Back, form IK, email belum aktif, ukuran responsif, dan entrypoint file lokal. Tidak mengirim email atau mengubah data browser pengguna. Lihat SPEC-spreadsheet-workflow.md dan THIRD-PARTY.md.

Pengujian alur request dan toolbar: `python tests/browser-approval.py` (server lokal port 4173). Kontrak lengkap: [SPEC-request-approval.md](SPEC-request-approval.md).

Pengujian ribbon/area satu juta sel: `python tests/browser-ribbon.py`. Batas dan kontrak: [SPEC-excel-ribbon.md](SPEC-excel-ribbon.md).

Pengujian UX editor dan Insert: `python tests/browser-editor-ux.py`. Kontrak terbaru: [SPEC-editor-ux.md](SPEC-editor-ux.md).

Pembaruan kompatibilitas editor: unggah gambar PNG/JPEG/GIF/BMP/WebP (GIF diam; format tambahan dinormalisasi PNG). Gambar unggahan bisa digeser, di-undo/redo, disimpan dan diekspor dengan offset DrawingML. Gambar bawaan template juga bisa digeser dengan posisi yang tersimpan. Copy dan Ctrl+C menampilkan marching ants pada range asal; Escape membatalkannya; preferensi reduced motion dihormati. Template XLSX tetap utuh; XLTX/XLSM/XLTM dinormalisasi menjadi XLSX tanpa VBA; XLS/XLT/XLSB dikonversi via SheetJS lokal dalam worker (timeout 20 detik), dengan peringatan sebelum simpan tentang format/gambar/objek yang bisa hilang pada konversi lama. Hasil dan unduhan berupa XLSX. File maksimal 2 MB, batas ZIP terurai tetap berlaku. Dimensi impor kini mengikuti batas Excel (1.048.576 baris dan 16.384 kolom); tinggi tampilan sheet yang sangat besar disesuaikan agar baris terakhir tetap terjangkau dalam batas scroll browser, dengan grid virtual dan validasi merge tanpa bitmap seluruh sheet. Area kosong awal tetap 1.000 x 1.000. Tes browser-five-editor-fixes.py mencakup impor format sebenarnya, sel AMP2001, format gambar tambahan, drag/Undo/Redo, save/reload/export, Copy/Escape dan mode baca.

Mulai kosong: pada pemuatan pertama setelah reset yang diminta pemilik (marker docuflow.clean-start.2026-11-16), seluruh data bisnis dan file WorkbookStore dibersihkan sekali. Satu admin dengan kredensial serta departemen/seksinya dipertahankan. Jenis/kategori/dokumen/template/permintaan/pengguna lain/aktivitas/otorisasi kosong. Sesi logout; data baru tidak dihapus pada refresh berikutnya. Marker ditulis setelah reset berhasil. Instalasi baru juga mulai tanpa contoh; fixture demo hanya diinisialisasi eksplisit oleh tes browser terisolasi.

Interaksi editor: ribbon bisa dipin atau disembunyikan lewat kontrol di kanan atas; pin menjaga ribbon saat scroll, unpin membuat alat muncul sementara lewat tab. Workspace/ribbon/grid dapat digulir pada viewport pendek dan zoom. Header memiliki batas drag untuk mengubah lebar kolom/tinggi baris; dialog angka tetap ada. Border box sel, tinggi textarea (termasuk border template), outline dan hit testing memakai koordinat yang sama. Klik sekali memilih tanpa caret; double-click/F2 mengedit isi, mengetik dari mode pilih mengganti isi, Arrow berpindah sel dan Enter mengakhiri edit. Mode edit/caret dipertahankan saat virtual DOM dirender ulang. Gambar mempunyai delapan handle resize dan penyimpanan anchor/extent untuk gambar asli maupun unggahan. Resize gambar menjaga rasio; Shift membebaskannya. Handle sisi pada bentuk tetap mengubah satu sumbu. Undo/Redo, save/reload/export dan mode baca diuji di browser-editor-interactions.py. Lihat SPEC-editor-interactions.md.

Insert Shapes: galeri 83 bentuk dalam Basic Shapes, Lines, Arrows, Callouts, Symbols, Flowchart, Stars and Banners, dengan pencarian dan recently used. Pilih sel, buka Insert > Shapes, pilih bentuk; drag/handle mengubah posisi/ukuran; double-click atau Edit Bentuk mengubah teks, isi, garis, warna/ukuran teks; Hapus atau Delete menghapus bentuk. Undo/Redo dan save/reload/export didukung. Bentuk ditulis sebagai vektor DrawingML xdr:sp dan teks xdr:txBody, sehingga tetap dapat diedit dalam Excel. Geometry-only drag/resize pada native shape mempertahankan teks kaya/gradient/garis template; Format Shape menerapkan format teks/warna sederhana yang ditampilkan di editor. Bentuk yang belum didukung tetap dipertahankan dalam file. Batas 200 bentuk per sheet, 1.000 karakter teks, mode baca tanpa kontrol perubahan. Tidak mengirim data ke layanan eksternal dan tidak menambah dependency. Rujukan struktur: https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.spreadsheet.shape.textbody ; https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.shapetypevalues . Lihat SPEC-insert-shapes.md dan tests/browser-shapes*.py.

Insert > Text Box tersedia sebagai tombol langsung: isi teks lalu sisipkan objek kotak teks mengambang pada sel aktif. Text Sel tetap menyisipkan nilai sel. Text Box memakai DrawingML cNvSpPr txBox=1, noFill, dan txBody; dapat digeser/di-resize, diedit dengan double-click, Undo/Redo, save/reload/export. Form Batal tidak membuat objek. Logika penyisipan bentuk dipakai bersama galeri Shapes dan tombol Text Box. Tes: tests/browser-text-box.py.


Menu klik kanan header kolom/baris menyediakan pencarian, format cepat, Cut/Copy/Paste/Paste Special (nilai), Insert/Delete, Clear Contents, Format Cells, Column Width/Row Height, dan Hide/Unhide. Klik kanan pojok kiri atas menyediakan Unhide All Rows/Columns. Hide tersimpan dalam XLSX; style header menjadi default untuk sel baru. Insert/Delete memindahkan referensi rumus, merge, hyperlink internal, defined names, dan anchor objek; Undo/Redo mencakup sheet tersembunyi. Workbook dengan tabel/chart/pivot/komentar, tautan eksternal, referensi 3D, atau perubahan sebagian rumus array ditolak untuk perubahan struktur agar isi file tetap utuh. Text Box tidak memiliki outline permanen di web maupun ekspor; bingkai seleksi sementara tetap tersedia untuk drag/resize. Tes: `python tests/browser-header-context.py` dan `python tests/browser-text-box.py`. Kontrak: [SPEC-header-context-menu.md](SPEC-header-context-menu.md).


Ukuran baris/kolom menerima nilai positif kecil dan desimal dari dialog maupun drag; nilai 0 menyembunyikan sumbu. Batas Excel tetap 255 karakter untuk lebar kolom dan 409 pt untuk tinggi baris; tinggi baris tidak lagi dipaksa minimal 18 pt dan kolom tidak lagi minimal 3 karakter. Grid dan bingkai seleksi mempertahankan keselarasan pada ukuran tipis. Gambar template editAs=oneCell memakai extent tetap, sehingga perubahan lebar kolom tidak memperbesar gambar. Resize gambar mengunci rasio dari semua handle; tahan Shift untuk ukuran bebas. Data PNG/JPEG asli dipertahankan, tanpa resampling ketika resize; ketajaman pembesaran tetap mengikuti resolusi sumber. Ekspor menormalkan anchor gambar tetap yang berubah menjadi oneCellAnchor tanpa mengganti isi pic. Tes: `python tests/browser-small-sizes.py`.


Teks panjang satu baris tanpa Wrap Text tampil meluber ke sel kosong, tanpa mengisi sel tetangga. Isi lain (termasuk formula dengan hasil kosong) atau area merge menghentikannya. Rata kiri/tengah/kanan dan sumber teks di luar viewport didukung. Lembar memiliki zoom25-400% lewat kontrol kanan bawah, Ctrl/Cmd+plus/minus/0 atau Ctrl/Cmd+wheel di grid; ribbon/formula bar/tabs tetap pada ukuran UI. Zoom hanya mengubah tampilan dan tersedia dalam mode baca. Scroll horizontal dibatasi ke grid dan tetap bisa kembali ke kolom A pada zoom browser. Header dan handle tetap terbaca; batas scroll memperhitungkan zoom sehingga XFD1048576 tetap terjangkau. Uji: `python tests/browser-overflow-zoom.py`; kontrak [SPEC-text-overflow-zoom.md](SPEC-text-overflow-zoom.md).

Stabilitas viewport: ukuran area kerja memakai zoom CSS yang dideklarasikan, bukan rasio tinggi hasil render terhadap offsetHeight yang dibulatkan browser. Rasio sebelumnya memberi feedback pembulatan dan memicu ResizeObserver setiap frame pada zoom pecahan. Ukuran ditulis dalam satuan layout yang stabil dan hanya saat nilainya berubah. `python tests/browser-editor-stability.py` memeriksa posisi/ukuran/scroll grid dan outline serta jumlah layout/render selama 90 frame idle pada beberapa kombinasi viewport dan zoom. Fixture 110% sebelumnya memanggil layout 90 kali dengan ukuran berganti, sesudah perbaikan tidak ada pergantian ukuran atau layout ulang saat idle.


Home > Borders memakai split button dan menu seperti Excel: semua pilihan sisi/luar/tebal/dobel, warna, gaya garis, serta More Borders dengan preview dan pilihan sisi. Tombol utama mengulangi preset terakhir, termasuk sisi custom. Draw Border/Grid dan Erase Border bekerja langsung di grid; drag membentuk area, klik tunggal memilih sisi terdekat, Escape mengakhiri mode. Undo/Redo dan ekspor XLSX menyimpan tipe garis native; dash-dot ditampilkan sebagai dashed di web. Border divisualkan tanpa mengubah ukuran sel, termasuk row tipis. Format Cells pada header memakai rekonsiliasi sisi yang sama. Pemilihan sebagian merge atau penghapusan sebagian border merge tetangga ditolak agar tidak mengubah garis di luar area; pilih sepanjang seluruh sisinya. Batas format tetap 5.000 sel. Verifikasi: `python tests/browser-borders.py`, `python tests/browser-approval.py`, dan `python tests/browser-editor-stability.py`; kontrak [SPEC-home-borders.md](SPEC-home-borders.md).


Template Excel mempertahankan zoom tersimpan per sheet (termasuk contoh 55%), warna indexed/automatic/custom palette/theme beserta tint, ukuran OOXML kolom tanpa penambahan padding ganda, dan gridlines yang tertutup solid fill. UI Column Width diubah ke satuan file saat simpan agar ukuran tidak melebar setelah dibuka lagi. Border digambar pada koordinat grid sebagai layer terpisah dan dijepit per pane; ketebalannya tidak memengaruhi tinggi baris atau posisi seleksi.

DrawingML native dan grup bertingkat memiliki preview SVG inert. Gambar EMF dengan bitmap StretchBlt menampilkan piksel DIB asli; fallback vektor memakai EMFJS 3.0.9 yang dibundel lokal (MIT, `dist/vendor/RTFJS-LICENSE.txt`, tarball SHA512 diverifikasi saat vendoring). File asli tidak dikirim ke layanan konversi. Resize grup hanya mengubah transform root, mempertahankan ukuran/posisi anak dan byte media. Native shape yang dikenali tetap bisa digeser, diubah ukuran dan dibuka Format Shape; mengubah format secara eksplisit memakai format sederhana editor. Preview mendukung preset dasar, path custom move/line/cubic/quadratic dan warna solid; effect, gradient, cropping gambar, rotasi grup dan kombinasi metafile kompleks belum memiliki kesetaraan penuh dengan Excel. XML/media aslinya tetap tersimpan. File contoh pengguna digunakan hanya untuk pemeriksaan lokal, tidak disertakan dalam repository atau deploy.

Klik kanan **sel** membuka Cut, Copy, Paste/Paste Special (nilai), Insert/Delete (entire row/column), Clear Contents, Format Cells, Hyperlink, dan format cepat. Area yang sudah dipilih tidak menyempit ketika klik kanan di dalamnya. Shift+F10/Context Menu juga didukung. Hyperlink menerima http/https/mailto/lokasi internal dan menyimpan relasi native, termasuk Undo tanpa meninggalkan target baru di relasi ekspor. Mode baca hanya mengizinkan Copy.

**View ? Freeze Panes** menyediakan Freeze Panes berdasarkan sel aktif, Freeze Top Row, Freeze First Column dan Unfreeze Panes. Sel yang dibekukan tetap dirender sebagai sel asli yang bisa dipilih saat scroll kedua sumbu. Pengaturan editable tersimpan sebagai `sheetView/pane`, bisa Undo/Redo dan berbeda per sheet; tombol Freeze Panes pada viewer baca mengubah tampilan sementara. Menu tidak memberikan hak mengedit konten. Verifikasi: `python tests/browser-template-fidelity.py`, `python tests/browser-cell-panes.py`, `python tests/browser-header-context.py`, `python tests/browser-small-sizes.py`, `python tests/browser-borders.py`, `python tests/browser-shapes-preservation.py`, `python tests/browser-editor-stability.py`. Kontrak: [SPEC-template-context-freeze.md](SPEC-template-context-freeze.md).


Teks grup DrawingML memakai ukuran font yang aman untuk SVG, dengan konversi terpisah pada kedua sumbu. Label ikon mempertahankan ukuran font dan baris paragrafnya tanpa mengecil menjadi sekitar 1px atau melebar saat grup memiliki skala berbeda. Teks sel ber-Wrap Text diratakan berdasarkan tinggi hasil pembungkusan browser, termasuk banner hijau yang terdiri dari dua baris. Perubahan ini hanya pada tampilan; XML dan isi workbook tetap dipertahankan. Uji reproduksi: `python tests/browser-template-text.py`; pengujian form asli secara lokal: `python tests/browser-template-text.py --workbook PATH`.

Form Tambah Kategori hanya meminta jenis dokumen dan nama kategori. Tabel Kategori Dokumen menampilkan nama kategori, jenis dokumen, jumlah dokumen, dan aksi tanpa kolom kode kategori. Kode kompatibilitas dibuat otomatis dari awalan jenis dan nomor yang belum digunakan (misalnya IK-001); kode kategori lama dan form edit tetap dipertahankan. ID kategori tetap menjadi acuan otorisasi. Verifikasi tambah tanpa input kode, dua kode unik, refresh, pemilihan kategori dan pengaturan akses: `python tests/browser-category-types.py`.

Tabel Create / Revise Dokumen menyediakan tombol Hapus untuk admin pada permintaan Draft atau Perlu perbaikan, termasuk draft milik pembuat lain. Dialog konfirmasi menampilkan judul, nomor, dan revisi; Batal mempertahankan data. Status sedang ditinjau/siap diterbitkan harus ditarik ke Draft oleh pembuat dahulu; riwayat yang sudah diterbitkan tidak dapat dihapus. Kebijakan diperiksa kembali saat konfirmasi, termasuk perubahan data/akun. Penghapusan menghapus record permintaan, melepas cache editor, dan membersihkan file workbook aktif maupun putaran lama setelah penyimpanan metadata berhasil. File yang dirujuk dokumen resmi, template, atau permintaan lain tetap dipertahankan. Unit policy dan pengujian browser meliputi user biasa, status terkunci, referensi penerbitan, Batal, dialog stale, kegagalan penyimpanan, file bersama, refresh dan responsivitas: `node --test tests/document-workflow.test.cjs`; `python tests/browser-request-delete.py`.


Shape dan Text Box: klik dua kali untuk mengetik langsung di dalam objek. Klik di luar atau Ctrl+Enter untuk menerapkan teks; Escape untuk membatalkan ketikan. Pilih objek lalu gunakan Home untuk font, ukuran, warna teks/isi, tebal/miring/garis bawah, wrap dan perataan. Text Box tetap tanpa outline; Rectangle dan shape lainnya memiliki garis bentuk. Format tersimpan dalam XLSX dan mendukung Undo/Redo. Pengujian: `python tests/browser-shape-toolbar.py`.


Pemilih warna di Home menampilkan Theme Colors dan Standard Colors terlebih dahulu. Gunakan More Colors untuk warna khusus atau kode HEX, dan No Fill untuk menghapus warna isi sel/shape/text box. Palet mendukung keyboard dan layar kecil; pilihan ikut tersimpan dalam XLSX. Pengujian: `python tests/browser-colors.py`.
