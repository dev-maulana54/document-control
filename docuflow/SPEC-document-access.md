# Kategori dan otorisasi dokumen

Permintaan pengguna mengizinkan implementasi perubahan berikut pada aplikasi yang ada.

| Modul | Tanggung jawab | Dependensi |
| --- | --- | --- |
| preview | Hapus aksi unduh dan revisi di preview; pertahankan nomor/judul | — |
| recipient-search | Pencarian penerima dengan pilihan banyak nama di dropdown | — |
| company-brand | Ganti merek yang terlihat dengan PT Century Batteries Indonesia | — |
| document-categories | Kategori dokumen, pilihan formulir, filter, pengelolaan admin | — |
| department-access | Izin kategori per departemen dan salin izin | document-categories |

Urutan: preview/recipient-search/company-brand, kategori, otorisasi, verifikasi integrasi.

## Tujuan dan kriteria penerimaan

- Preview tanpa header, tombol unduh, atau revisi. Footer tetap memuat nomor dan judul dokumen; zoom/fit/fullscreen berfungsi.
- Penerima tidak ditampilkan sebelum pencarian. Dropdown hasil pencarian mendukung checkbox banyak nama; pilihan dipertahankan saat kata pencarian berubah dan terlihat sebagai chip yang bisa dihapus. Escape/klik luar menutup dropdown.
- Nama perusahaan menggantikan merek Docuflow pada login, sidebar, footer, judul halaman, dan metadata HTML. Identitas storage serta akun demo lama dipertahankan.
- Kategori terpisah dari jenis dokumen. Lima kode awal: OM-PR2-ASY, OM-PR2-CHG, OM-PR1-CST, OM-PR1-LPP, OM-PR1-FRM. Admin dapat tambah/edit/hapus kategori yang belum digunakan.
- Dokumen menyimpan categoryId; formulir tambah/update/revisi, detail, daftar, dan filter mendukung kategori.
- Pengguna mengonfirmasi otorisasi per kategori. Admin tetap memiliki seluruh akses. Pengguna hanya dapat membuka kategori yang diizinkan bagi departemennya; kepemilikan tidak melewati pembatasan ini.
- Departemen tanpa pengaturan tidak mendapat akses. Saat migrasi, dokumen lama masuk kategori tersendiri Belum Dikategorikan; departemen lama diberi akses kategori tersebut saja agar dokumen lama tetap tersedia. Kategori baru tidak otomatis diberikan.
- Admin dapat menyimpan izin departemen dan menyalin izin tersimpan dari satu sumber ke beberapa tujuan. Salinan mengganti izin tujuan, termasuk bila sumber kosong, dan berdiri sendiri setelah disimpan.
- Daftar/pencarian/detail/preview/unduh/aktivitas/notifikasi/edit/revisi memeriksa izin. Pengguna hanya dapat menyimpan kategori yang diizinkan. Notifikasi tidak memberikan akses tambahan.
- Data lama tidak dihapus. Kegagalan penyimpanan tidak mengganti state yang sudah tersimpan.

## Struktur dan gaya

HTML/CSS/JavaScript tanpa dependency baru. `dist/document-access.js` berisi kebijakan murni dan migrasi; `dist/document-settings.js` berisi UI kategori/otorisasi admin; `dist/app.js` mengintegrasikan alur dokumen. Format mengikuti kode saat ini: 2 spasi, single quotes, fungsi kecil, output pengguna melalui esc/textContent.

## Batasan

Penyimpanan dan login masih prototipe localStorage. Pemeriksaan di aplikasi ini bukan batas keamanan terhadap pengguna yang mengubah JavaScript/storage. Pemakaian produksi memerlukan backend yang memeriksa izin pada setiap pengambilan PDF dan metadata. Tidak menambah server, layanan eksternal, atau sistem login baru dalam perubahan ini.

## Verifikasi

- `npm run check`: seluruh skrip lolos pemeriksaan sintaks.
- `npm test`: aset/entrypoint serta kebijakan deny-by-default, admin, migrasi, salin izin, dan validasi kategori.
- Browser terisolasi: admin menyimpan/salin izin; user diperbolehkan/ditolak, termasuk milik sendiri; notifikasi dengan beberapa pencarian; PDF tanpa aksi/revisi; persistensi setelah refresh; tampilan 320/768/1024/1440px.

Alur edit langsung dan notifikasi aplikasi pada spesifikasi awal digantikan oleh SPEC-spreadsheet-workflow.md dan SPEC-request-approval.md. Izin kategori tetap berlaku, ditambah keterlibatan pada request dan status yang mengunci edit.

Jenis kategori: documentTypeId merujuk jenis stabil dan ditampilkan dalam tabel Kategori Dokumen. Tambah kategori wajib memilih jenis. Form permintaan menyaring kategori berdasarkan jenis dan izin, lalu memvalidasi kecocokan sebelum simpan. Kategori terpakai tidak dapat diubah ke jenis yang bertentangan; jenis yang dirujuk kategori tidak dapat dihapus. Migrasi memilih jenis aktual tunggal dari dokumen/permintaan, lalu prefix untuk kategori kosong. Kategori lama campuran tetap tidak terikat jenis agar data lama tersedia tanpa perubahan izin. browser-category-types.py menguji CRUD/persistensi/filter, required type, rename stabil, pembatasan tipe terpakai dan layout 320/768/1440.
