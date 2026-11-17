'use strict';

(function (root) {
  const limits = { file: 2 * 1024 * 1024, expanded: 16 * 1024 * 1024, part: 8 * 1024 * 1024, entries: 512, rows: 1048576, columns: 16384 };

  function sheetSize(currentRows, currentColumns, rows, columns) {
    if (![rows, columns].every(Number.isInteger) || rows < currentRows || columns < currentColumns || rows < 1 || columns < 1 || rows > limits.rows || columns > limits.columns) throw new Error('Area kerja dapat diperluas hingga 1.048.576 baris dan 16.384 kolom.');
    return { rows, columns };
  }

  function position(reference) {
    const match = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(reference);
    if (!match) throw new Error('Alamat sel tidak valid.');
    const column = [...match[1]].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0);
    return { row: Number(match[2]), column };
  }

  function address(column, row) {
    if (!Number.isInteger(column) || column < 1 || column > 16384 || !Number.isInteger(row) || row < 1 || row > 1048576) throw new Error('Alamat sel tidak valid.');
    let letters = '';
    while (column) { column--; letters = String.fromCharCode(65 + column % 26) + letters; column = Math.floor(column / 26); }
    return letters + row;
  }

  function resolvePart(source, target) {
    if (!target || /[\\?#]/.test(target) || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) throw new Error('Relasi file Excel tidak valid.');
    const parts = target.startsWith('/') ? [] : source.split('/').slice(0, -1);
    for (const part of target.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (parts.length <= 1) throw new Error('Relasi keluar dari workbook.'); parts.pop(); }
      else parts.push(part);
    }
    if (parts[0] !== 'xl') throw new Error('Relasi keluar dari workbook.');
    return parts.join('/');
  }

  function inputValue(value) {
    const text = String(value);
    if (text.length > 4000) throw new Error('Isi setiap sel maksimal 4.000 karakter.');
    for (const character of text) {
      const point = character.codePointAt(0);
      if (point < 32 && ![9, 10, 13].includes(point) || point >= 0xd800 && point <= 0xdfff || point === 0xfffe || point === 0xffff) throw new Error('Teks memuat karakter yang tidak didukung Excel.');
    }
    return { type: /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text) && Number.isFinite(Number(text)) ? 'n' : 'inlineStr', value: text };
  }

  function inspectArchive(input, allowMacros = false) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 22 || bytes.length > limits.file) throw new Error('Pilih file XLSX, maksimal 2 MB.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
      if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
    }
    if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Paket Excel rusak atau tidak didukung.');
    const entries = view.getUint16(end + 10, true);
    const centralSize = view.getUint32(end + 12, true);
    let offset = view.getUint32(end + 16, true), expanded = 0;
    if (!entries || entries > limits.entries || offset + centralSize !== end) throw new Error('Paket Excel terlalu besar atau tidak didukung.');
    for (let index = 0; index < entries; index++) {
      if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Struktur paket Excel tidak valid.');
      const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
      const size = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const recordLength = 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
      if (offset + recordLength > end) throw new Error('Struktur paket Excel tidak valid.');
      const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      expanded += size;
      if ((flags & 1) || ![0, 8].includes(method) || size > limits.part || expanded > limits.expanded || /[\\\0]/.test(name) || name.startsWith('/') || name.split('/').includes('..') || (!allowMacros && /vbaProject\.bin$/i.test(name))) throw new Error('Workbook terenkripsi, macro, path, atau ukuran terurai tidak didukung.');
      offset += recordLength;
    }
    if (offset !== end) throw new Error('Struktur paket Excel tidak valid.');
    return { entries, expanded };
  }

  const api = { limits, sheetSize, position, address, resolvePart, inputValue, inspectArchive };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XlsxPackage = api;
})(globalThis);
