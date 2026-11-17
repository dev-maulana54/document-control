# Alur dokumen berbasis template Excel

Permintaan dan jawaban pengguna mengizinkan perubahan berikut: editor berada di dalam aplikasi; alur IK tidak memakai email; belum ada layanan pengirim email.

| Modul | Tanggung jawab | Dependensi |
| --- | --- | --- |
| role-ui | Delete hanya admin; Tambah Dokumen pada Master hanya admin; Create / Revise tetap tersedia bagi user | otorisasi kategori yang sudah ada |
| navigation | Submenu aktif memakai warna primary | — |
| authorization-table | Pengaturan kategori per departemen berupa tabel data, salin izin dipertahankan | document-access |
| email-recipients | Hapus lonceng dan notifikasi dalam aplikasi; simpan penerima email untuk alur non-IK, tanpa klaim pengiriman | — |
| workbook-engine | Baca XLSX, edit nilai sel, simpan tanpa membuang bagian template lain | JSZip lokal |
| document-templates | Admin mengunggah template XLSX per jenis dokumen | workbook-engine |
| workbook-editor | Simpan metadata IK membuat salinan template lalu kembali ke tabel; Edit Excel membuka editor | document-templates, document-access |

Urutan: role/navigasi/tabel/email, mesin XLSX, template admin, integrasi simpan/editor, verifikasi, publikasi situs yang sama.

Perubahan lanjutan: penyimpanan membuat **draft permintaan**, bukan dokumen resmi. Alur persetujuan dan toolbar terbaru ditentukan di [SPEC-request-approval.md](SPEC-request-approval.md). Dokumen resmi hanya baca; revisi mengedit salinan melalui permintaan baru.

## Perilaku

- User tidak melihat atau menjalankan Delete. Tombol Tambah Dokumen hanya pada Master milik admin. User membuat dokumen melalui Create / Revise.
- Form IK hanya meminta identitas; tanpa lampiran dan pilihan penerima. Template admin wajib tersedia sebelum IK baru dibuat. Revisi memakai salinan workbook versi sumber, bukan template terbaru.
- Admin memiliki menu Template Dokumen untuk unggah/ganti XLSX per jenis. Mengganti template tidak mengubah workbook dokumen yang sudah dibuat.
- Editor menampilkan worksheet, nilai sel, merge, gaya template, dan gambar PNG/JPEG. User dapat mengubah teks/angka, menempelkan blok sel, menyimpan, membuka ulang, dan mengunduh XLSX.
- Formula, format, gambar, struktur, dan bagian XLSX yang tidak diedit dipertahankan di paket asli. Formula ditampilkan dari nilai tersimpan dan tidak dievaluasi sebagai JavaScript; editor ini tidak menggantikan seluruh fungsi Excel. Workbook meminta kalkulasi ulang saat dibuka di Excel.
- XLSX maksimal 2 MB, batas ukuran paket terurai, worksheet terlihat maksimal 1.000 baris/1.000 kolom dan 1.000.000 sel; tolak file di luar batas sebelum membuat dokumen. Makro, enkripsi, XML DTD, path traversal, dan relasi eksternal tidak dijalankan.
- File disimpan di IndexedDB browser, metadata pada database lokal yang sudah ada. Akses editor, unduh, revisi, dan simpan mengikuti izin kategori. Template hanya dapat diubah admin. Penyimpanan gagal tidak mengubah versi dokumen yang tersimpan.
- Notifikasi lama tetap disimpan untuk kompatibilitas tetapi tidak ditampilkan atau ditambah. Penerima baru hanya metadata email non-IK. Karena layanan pengirim belum tersedia, tampilkan bahwa email belum dikirim; jangan menampilkan status sukses palsu.

## Struktur dan verifikasi

JavaScript buildless dipertahankan. JSZip dipin dan di-vendor beserta lisensi, instalasi tanpa lifecycle scripts, lockfile disimpan. Modul XLSX, storage, template, dan editor terpisah dari app.js. Teks pengguna melalui textContent/esc; URL workbook tidak dimuat dari internet.

`npm run check`, `npm test`, `npm audit`; tes paket ZIP/range, roundtrip edit XLSX, template tidak berubah, multi-sheet/merge/style/image/formula/extra XML tetap tersedia, copy/revisi independen, input invalid, role admin/user, kategori ditolak, alur tanpa lampiran/email untuk IK, penerima non-IK tidak menjadi notifikasi dalam aplikasi. Browser di 320/768/1024/1440px, keyboard, refresh dan file entrypoint.

Tidak ada layanan email atau backend baru yang diklaim aktif. Penyimpanan browser dan login tetap prototipe; dokumen belum dibagikan lintas perangkat.

IK lama tanpa workbook mempertahankan file lama dan tidak dikonversi diam-diam. Kontrol unggah/email tetap disembunyikan. Worksheet tersembunyi dipertahankan sebagai bagian paket asli tanpa dirender. Ukuran area tampil juga dihitung dari dimension, baris berformat, dan rentang kolom.

## Perluasan area kerja

Permintaan terbaru menggantikan perluasan bertahap: setiap sheet langsung 1.000x1.000, dengan virtualisasi baris dan kolom, Go To, serta ribbon familiar seperti Excel. Lihat SPEC-excel-ribbon.md.

Alur masuk tabel, editor tanpa chrome aplikasi, seleksi drag, font searchable dan Insert mengikuti SPEC-editor-ux.md.
