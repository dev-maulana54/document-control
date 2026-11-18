'use strict';

function showWorkbookSymbol(textOnly = false) {
  if (!workbookDocument(true)) return;
  const state = activeWorkbook, reference = state.selected;
  const symbols = ['±','×','÷','≤','≥','≠','≈','°','Ø','µ','Ω','α','β','γ','Δ','π','Σ','√','∞','→','←','↑','↓','✓','✗','☐','☑','●','■','▲','©','®'];
  showModal(`${modalHeading(textOnly ? 'Sisipkan Teks' : 'Symbol')}<p class="small muted">Sel aktif: ${esc(reference)}</p>${textOnly ? '' : `<div class="workbook-symbols" role="group" aria-label="Pilihan simbol">${symbols.map(symbol => `<button type="button" data-insert-symbol="${symbol}" aria-label="Simbol ${symbol}">${symbol}</button>`).join('')}</div>`}<form id="workbook-symbol-form"><div class="field"><label for="workbook-symbol-text">${textOnly ? 'Teks' : 'Simbol atau teks lainnya'}</label><input id="workbook-symbol-text" maxlength="4000" required autocomplete="off"></div><div id="insert-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Sisipkan</button></div></form>`);
  const insert = text => {
    try {
      if (activeWorkbook !== state || !workbookDocument(true)) throw new Error('Dokumen tidak dapat diedit.');
      const sheet = state.book.sheets[state.sheetIndex], value = WorkbookEngine.value(state.book,sheet.cells.get(reference));
      commitWorkbookValues([{reference,value:value + text}]); state.caret = {reference,start:value.length + text.length,end:value.length + text.length}; modal.close(); restoreWorkbookFocus();
    } catch (failure) { document.getElementById('insert-error').textContent = failure.message; }
  };
  modal.querySelectorAll('[data-insert-symbol]').forEach(button => { button.onclick = () => insert(button.dataset.insertSymbol); });
  document.getElementById('workbook-symbol-form').onsubmit = event => { event.preventDefault(); insert(document.getElementById('workbook-symbol-text').value); };
}

function showWorkbookPicture() {
  if (!workbookDocument(true)) return;
  const state = activeWorkbook, reference = state.selected, sheetIndex = state.sheetIndex;
  showModal(`${modalHeading('Pictures')}<p class="small muted">Gambar ditempatkan pada ${esc(reference)} dan ikut tersimpan di file Excel.</p><form id="workbook-picture-form"><div class="field"><label for="workbook-picture-file">File gambar</label><input id="workbook-picture-file" type="file" accept=".png,.jpg,.jpeg,.gif,.bmp,.webp,image/png,image/jpeg,image/gif,image/bmp,image/webp" required><small>PNG, JPG, GIF, BMP, WebP. Animasi menjadi gambar diam. Maksimal 1 MB, 4.096 px dan 10 megapiksel. Rasio gambar dipertahankan.</small></div><div class="field"><label for="workbook-picture-width">Lebar maksimum (px)</label><input id="workbook-picture-width" type="number" min="24" max="1200" value="240" required><small>Tinggi disesuaikan otomatis, maksimal 480 px.</small></div><div id="insert-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Masukkan Gambar</button></div></form>`);
  document.getElementById('workbook-picture-form').onsubmit = async event => {
    event.preventDefault();
    const form = event.target, error = form.querySelector('#insert-error'), button = form.querySelector('[type=submit]');
    if (button.disabled) return;
    const file = form.querySelector('[type=file]').files[0], width = Number(document.getElementById('workbook-picture-width').value), snapshot = db, actorId = currentUser.id;
    button.disabled = true;
    try {
      if (!Number.isFinite(width) || width < 24 || width > 1200) throw new Error('Lebar gambar antara 24 dan 1.200 px.');
      const image = await WorkbookMedia.readImage(file);
      if (!form.isConnected || !modal.open || activeWorkbook !== state || state.sheetIndex !== sheetIndex || db !== snapshot || currentUser?.id !== actorId || file !== form.querySelector('[type=file]').files[0] || !workbookDocument(true)) throw new Error('Data berubah. Buka kembali Pictures.');
      const sheet = state.book.sheets[sheetIndex];
      if ([...sheet.images.map(image=>sheet.imageMoves?.[image.anchorIndex]||image),...(sheet.insertedImages||[])].filter(image=>image.kind!=='shape'&&!image.hidden).length >= 50) throw new Error('Maksimal 50 gambar per sheet.');
      if (!workbookCheckpoint()) throw new Error('Dokumen sedang disimpan.');
      const point = XlsxPackage.position(reference), scale = Math.min(width / image.naturalWidth,480 / image.naturalHeight);
      sheet.insertedImages ||= [];
      sheet.insertedImages.push({...image,column:point.column-1,row:point.row-1,width:image.naturalWidth*scale,height:image.naturalHeight*scale,x:0,y:0,toColumn:null,toRow:null,toX:0,toY:0});
      state.book.modified.add(sheetIndex); state.historyGroup = null; workbookChanged(); modal.close(); restoreWorkbookFocus();
    } catch (failure) { if (form.isConnected) error.textContent = failure.message; }
    finally { button.disabled = false; }
  };
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-workbook-insert]');
  if (!button || !workbookDocument(true) || activeWorkbook.saving) return;
  if (button.dataset.workbookInsert === 'picture') showWorkbookPicture();
  else if (button.dataset.workbookInsert === 'shape') showWorkbookShapes();
  else if (button.dataset.workbookInsert === 'textbox') showWorkbookTextBox();
  else showWorkbookSymbol(button.dataset.workbookInsert === 'text');
});
