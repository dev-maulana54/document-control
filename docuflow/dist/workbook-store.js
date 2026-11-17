'use strict';

const WorkbookStore = (() => {
  let connection;
  function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('cbi.workbooks.v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = null; }; resolve(request.result); };
      request.onerror = () => { connection = null; reject(new Error('Penyimpanan file browser tidak tersedia.')); };
      request.onblocked = () => reject(new Error('Tutup tab lama sebelum memperbarui penyimpanan workbook.'));
    });
    return connection;
  }

  async function operation(mode, action) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('files', mode);
      const request = action(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error('File tidak dapat disimpan. Periksa ruang penyimpanan browser.'));
    });
  }

  return {
    clear() { return operation('readwrite', store => store.clear()); },
    async get(key) { const bytes = await operation('readonly', store => store.get(key)); if (!(bytes instanceof ArrayBuffer)) throw new Error('File Excel tidak ditemukan di browser ini. Unggah kembali template atau gunakan browser asal dokumen.'); return bytes; },
    put(key, bytes) { return operation('readwrite', store => store.put(bytes, key)); },
    remove(key) { return operation('readwrite', store => store.delete(key)); }
  };
})();
