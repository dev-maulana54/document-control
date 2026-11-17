# Library runtime lokal

## JSZip 3.10.1

- Sumber resmi: https://github.com/Stuk/jszip/tree/v3.10.1
- Paket npm dipin ke `jszip@3.10.1`, dependency transitif dan integritas terkunci di `package-lock.json`.
- Instalasi menggunakan `npm install --ignore-scripts --save-exact jszip@3.10.1`; tidak ada lifecycle script yang dijalankan.
- `dist/vendor/jszip-3.10.1.min.js` disalin dari `node_modules/jszip/dist/jszip.min.js` tanpa modifikasi.
- SHA-256: `ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E`.
- Lisensi upstream tersedia pada `dist/vendor/JSZip-LICENSE.md` (MIT atau GPLv3; proyek memakai opsi MIT).
- Digunakan untuk membaca/menulis paket ZIP XLSX di browser. Tidak mengirim workbook ke layanan eksternal.

Referensi API: [loadAsync](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html), [generateAsync](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html), dan [internalStream](https://stuk.github.io/jszip/documentation/api_zipobject/internal_stream.html). Ekstraksi memakai stream dengan batas ukuran aktual, selain pemeriksaan central directory sebelum pemuatan.

Sebelum rilis: `npm audit --omit=dev` tidak menemukan kerentanan. Perbarui salinan vendor dan hash bersamaan dengan dependency jika versi dinaikkan.

SheetJS Community Edition 0.20.3 (Apache-2.0), vendored from https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. License: dist/vendor/SHEETJS-LICENSE.txt. Used only in isolated import worker for XLS/XLT/XLSB conversion. Format coverage: https://docs.sheetjs.com/docs/miscellany/formats/.
