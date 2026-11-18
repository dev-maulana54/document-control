const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const xlsx = require('../dist/xlsx-package.js');

test('area kerja dapat diperluas tanpa mengecilkan atau melewati batas', () => {
  assert.deepEqual(xlsx.sheetSize(100,26,2001,1100),{rows:2001,columns:1100});
  assert.deepEqual(xlsx.sheetSize(100, 26, 150, 36), { rows: 150, columns: 36 });
  assert.deepEqual(xlsx.sheetSize(150, 36, 1000, 1000), { rows: 1000, columns: 1000 });
  for (const [rows, columns] of [[99, 26], [100, 25], [1048577, 26], [100, 16385], [NaN, 26], [100.5, 26]]) assert.throws(() => xlsx.sheetSize(100, 26, rows, columns));
});

test('alamat sel dan angka kolom dapat dikonversi tanpa menerima range palsu', () => {
  assert.deepEqual(xlsx.position('AN200'), { row: 200, column: 40 });
  assert.equal(xlsx.address(28, 12), 'AB12');
  assert.equal(xlsx.address(1000, 1000), 'ALL1000');
  assert.deepEqual(xlsx.position('ALL1000'), { row: 1000, column: 1000 });
  for (const bad of ['A0', 'A-1', 'A1:B2', '1A', 'A1<script>']) assert.throws(() => xlsx.position(bad));
});

test('relasi paket hanya mengarah ke bagian lokal workbook', () => {
  assert.equal(xlsx.resolvePart('xl/worksheets/sheet1.xml', '../drawings/drawing1.xml'), 'xl/drawings/drawing1.xml');
  assert.equal(xlsx.resolvePart('xl/workbook.xml', '/xl/worksheets/sheet1.xml'), 'xl/worksheets/sheet1.xml');
  for (const target of ['https://example.com/a', '//example.com/a', '../../../secret', 'file:///tmp/a', '..\\secret', 'sheet.xml?token=x']) assert.throws(() => xlsx.resolvePart('xl/workbook.xml', target));
});

test('nilai input tidak mengubah nol di depan atau formula menjadi eksekusi', () => {
  assert.deepEqual(xlsx.inputValue('0012'), { type: 'inlineStr', value: '0012' });
  assert.deepEqual(xlsx.inputValue('=HYPERLINK("https://example.com")'), { type: 'inlineStr', value: '=HYPERLINK("https://example.com")' });
  assert.deepEqual(xlsx.inputValue('-12.5'), { type: 'n', value: '-12.5' });
  assert.deepEqual(xlsx.inputValue(''), { type: 'inlineStr', value: '' });
});

test('menolak karakter XML terlarang tanpa menolak emoji atau baris baru', () => {
  for (const value of ['teks\u000bakhir', 'a\u0000b', '\uffff', '\ud800', '\udc00']) assert.throws(() => xlsx.inputValue(value));
  assert.equal(xlsx.inputValue('Baterai 🔋\nBaris berikutnya\tOK').value, 'Baterai 🔋\nBaris berikutnya\tOK');
});

test('memeriksa paket valid dan menolak file rusak sebelum dekompresi', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('xl/workbook.xml', '<workbook/>');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  assert.ok(xlsx.inspectArchive(bytes).entries >= 2);
  assert.throws(() => xlsx.inspectArchive(new Uint8Array([1, 2, 3])));
  const truncated = bytes.slice(0, bytes.length - 10);
  assert.throws(() => xlsx.inspectArchive(truncated));
});

test('menerima workbook hingga 5 MiB dan menolak satu byte di atasnya', async () => {
  const limit = 5 * 1024 * 1024;
  const make = async size => {
    const zip = new JSZip(); zip.file('xl/data.bin', new Uint8Array(size));
    return zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  };
  const overhead = (await make(0)).length;
  const atLimit = await make(limit - overhead);
  assert.equal(atLimit.length, limit);
  assert.ok(xlsx.inspectArchive(atLimit).entries);
  assert.throws(() => xlsx.inspectArchive(new Uint8Array(limit + 1)), /5 MB/);
});

test('menolak ukuran terurai berlebih, path traversal, serta macro', async () => {
  const zip = new JSZip();
  zip.file('a.xml', 'x');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const view = new DataView(bytes.buffer);
  let central = 0;
  for (let i = 0; i < bytes.length - 4; i++) if (view.getUint32(i, true) === 0x02014b50) { central = i; break; }
  view.setUint32(central + 24, 32 * 1024 * 1024, true);
  assert.throws(() => xlsx.inspectArchive(bytes));
  for (const name of ['../outside.xml', 'xl/vbaProject.bin']) {
    const unsafe = new JSZip(); unsafe.file(name, 'x');
    const unsafeBytes = await unsafe.generateAsync({ type: 'uint8array' });
    assert.throws(() => xlsx.inspectArchive(unsafeBytes));
  }
});
