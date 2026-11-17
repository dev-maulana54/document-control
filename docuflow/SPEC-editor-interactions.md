# Interaksi editor spreadsheet

- Ribbon memiliki tombol tampil/sembunyi dan pin. Ribbon yang dipin tetap terbuka saat memilih sel; ribbon tanpa pin terbuka sementara lewat tab, lalu menutup saat kembali ke grid. Preferensi tampilan tidak mengubah isi workbook.
- Pada browser zoom dan viewport pendek, pengguna dapat menggulir grid dua arah, ribbon dua arah bila melampaui ruang, serta keseluruhan workspace secara vertikal. Kontrol, tab sheet, dan scrollbar tetap terjangkau.
- Batas kanan header kolom dan batas bawah header baris menyediakan handle drag; perubahan satu dimensi disimpan dalam XLSX, mendukung Undo/Redo dan menjaga ukuran lain. Dialog angka tetap tersedia.
- Posisi seleksi dan hit testing menggunakan ukuran layout yang sama dengan sel, termasuk ukuran kecil, merged cell, fractional pixels dan zoom CSS/browser. Header baris tidak memaksakan tinggi minimum di luar model.
- Klik gambar menampilkan bingkai dan delapan handle resize. Drag memindahkan; resize gambar mempertahankan rasio dari semua handle secara default; Shift membebaskan rasio. Handle sisi pada bentuk tetap mengubah satu sumbu. Gambar template dan unggahan, termasuk sesudah reload, menyimpan ukuran/posisi dalam anchor/extent DrawingML. Satu gesture adalah satu langkah Undo; mode baca tidak mengubah file.
- Klik sekali memilih sel tanpa caret edit. Double click atau F2 mengedit isi lama. Mengetik dari mode pilih mengganti isi. Arrow berpindah sel pada mode pilih, tetap menggerakkan caret pada mode edit; Enter mengakhiri edit dan berpindah baris, Alt+Enter baris baru. Formula template tetap hanya baca. Format, clipboard, dan shortcut yang sudah ada dipertahankan.

Verifikasi: browser terisolasi dengan workbook dua sheet, template merged/image/formula; dimensi baris kecil/kolom berbeda; drag header/gambar/handle, Undo/Redo, save/reload/export XML; mode pilih/edit; browser/CSS zoom, viewport sempit dan pendek; pin/collapse/ribbon scroll; guard readonly.
