'use strict';

let workbookClipboard = null;

function workbookEditableReferences(address = workbookRange()) {
  if (!workbookDocument(true) || activeWorkbook.saving) throw new Error('Dokumen tidak dapat diedit saat ini.');
  const sheet = activeWorkbook.book.sheets[activeWorkbook.sheetIndex];
  const refs = WorkbookFormat.references(WorkbookFormat.range(sheet, address));
  for (const reference of refs) {
    const point = XlsxPackage.position(reference), cell = sheet.cells.get(reference);
    if (WorkbookEngine.child(cell, 'f') || sheet.merges.some(merge => reference !== merge.start && point.row >= merge.first.row && point.row <= merge.last.row && point.column >= merge.first.column && point.column <= merge.last.column)) throw new Error('Area berisi rumus atau bagian sel gabungan. Pilih sel yang dapat diedit.');
  }
  return refs;
}

function commitWorkbookValues(changes) {
  for (const change of changes) { workbookEditableReferences(change.reference); XlsxPackage.inputValue(change.value); }
  workbookCheckpoint();
  for (const change of changes) WorkbookEngine.setCell(activeWorkbook.book, activeWorkbook.sheetIndex, change.reference, change.value);
  activeWorkbook.historyGroup = null; workbookChanged(); restoreWorkbookFocus();
}

function parseWorkbookClipboard(text) {
  if (text.length > 1024 * 1024) throw new Error('Data tempel maksimal 1 MB.');
  const rows = [[]]; let value = '', quoted = false, count = 0;
  const push = () => { if (++count > 5000) throw new Error('Tempel maksimal 5.000 sel sekaligus.'); rows[rows.length - 1].push(value); value = ''; };
  text = text.replace(/\r\n?/g, '\n');
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index++; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"' && !value) quoted = true;
    else if (character === '\t') push();
    else if (character === '\n') { push(); rows.push([]); }
    else value += character;
  }
  if (quoted) throw new Error('Data clipboard mempunyai tanda kutip yang belum ditutup.');
  if (value || rows[rows.length - 1].length || rows.length === 1) push(); else rows.pop();
  return rows;
}

function pasteWorkbookMatrix(matrix) {
  const start = XlsxPackage.position(activeWorkbook.selected), sheet = activeWorkbook.book.sheets[activeWorkbook.sheetIndex], changes = [];
  matrix.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (start.row + rowIndex > sheet.rows || start.column + columnIndex > sheet.columns) throw new Error('Data tempel melewati batas worksheet.');
    changes.push({ reference: XlsxPackage.address(start.column + columnIndex, start.row + rowIndex), value });
  }));
  if (changes.length > 5000) throw new Error('Tempel maksimal 5.000 sel sekaligus.');
  commitWorkbookValues(changes);
}

function copyWorkbookSelection(cut) {
  if (!workbookDocument()) return;
  const state = activeWorkbook, sheet = state.book.sheets[state.sheetIndex];
  const area = WorkbookFormat.range(sheet, workbookRange());
  const refs = cut ? workbookEditableReferences() : WorkbookFormat.references(area);
  const matrix = [];
  for (let row = area.first.row; row <= area.last.row; row++) {
    const values = [];
    for (let column = area.first.column; column <= area.last.column; column++) values.push(WorkbookEngine.value(state.book, sheet.cells.get(XlsxPackage.address(column, row))));
    matrix.push(values);
  }
  const text = matrix.map(row => row.map(value => /[\t\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value).join('\t')).join('\n');
  workbookClipboard = { actorId: currentUser.id, sourceId: state.id, matrix };
  state.copyArea={area,sheetIndex:state.sheetIndex};paintWorkbookSelection();
  // Keep an app clipboard too, so file:// and denied browser clipboard still work.
  navigator.clipboard?.writeText(text).catch(() => {});
  if (cut) commitWorkbookValues(refs.map(reference => ({ reference, value: '' })));
  toast(refs.length + ' sel ' + (cut ? 'dipotong.' : 'disalin.')); restoreWorkbookFocus();
}

async function showWorkbookPaste(external = false) {
  const doc = workbookDocument(true);
  if (!doc) return;
  const originalState = activeWorkbook, actorId = currentUser.id;
  const target={sheetIndex:originalState.sheetIndex,selected:originalState.selected,key:originalState.key,version:originalState.recordVersion,edits:originalState.edits};
  const targetValid=()=>activeWorkbook===originalState&&currentUser?.id===actorId&&Boolean(workbookDocument(true))&&originalState.sheetIndex===target.sheetIndex&&originalState.selected===target.selected&&originalState.key===target.key&&originalState.recordVersion===target.version&&originalState.edits===target.edits&&!originalState.saving;
  let systemText;
  if (!external && navigator.clipboard && navigator.permissions) {
    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' });
      if (permission.state === 'granted') systemText = await navigator.clipboard.readText();
    } catch { /* Keep explicit paste available without a clipboard permission prompt. */ }
  }
  if (!targetValid()) return;
  if (systemText !== undefined) { pasteWorkbookMatrix(parseWorkbookClipboard(systemText)); return; }
  if (!external && workbookClipboard?.actorId === currentUser.id && canRead(documentRecord(workbookClipboard.sourceId))) { pasteWorkbookMatrix(workbookClipboard.matrix); return; }
  const state = activeWorkbook;
  showModal(`${modalHeading('Paste ke ' + esc(state.selected))}<form id="workbook-paste-form"><div class="field"><label for="workbook-paste">Tempel dari Excel dengan Ctrl+V</label><textarea id="workbook-paste" rows="7" maxlength="1048576" required></textarea><small>Tab memisahkan kolom. Baris baru memisahkan baris. Maksimal 5.000 sel.</small></div><div id="ribbon-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">Tempel Data</button></div></form>`);
  document.getElementById('workbook-paste-form').onsubmit = event => {
    event.preventDefault();
    try { if (!targetValid()) throw new Error('Tujuan tempel berubah. Buka kembali Paste.'); pasteWorkbookMatrix(parseWorkbookClipboard(document.getElementById('workbook-paste').value)); modal.close(); }
    catch (failure) { document.getElementById('ribbon-error').textContent = failure.message; }
  };
}

function showWorkbookDimension(axis) {
  const state = activeWorkbook, sheet = state.book.sheets[state.sheetIndex], area = WorkbookFormat.range(sheet, workbookRange());
  const isRow = axis === 'row', label = isRow ? 'Tinggi baris (pt)' : 'Lebar kolom (karakter)', max = isRow ? 409 : 255;
  const metadata=isRow?WorkbookEngine.elements(sheet.xml,'row').find(row=>Number(row.getAttribute('r'))===area.first.row):WorkbookEngine.elements(sheet.xml,'col').findLast(col=>Number(col.getAttribute('min'))<=area.first.column&&Number(col.getAttribute('max'))>=area.first.column);
  const attribute=isRow?'ht':'width',edges=state.gridLayout[isRow?'y':'x'],number=area.first[axis],current=isRow&&metadata?.hasAttribute(attribute)?Number(metadata.getAttribute(attribute)):WorkbookEngine.sizeValue(axis,edges[number]-edges[number-1]);
  showModal(`${modalHeading(isRow ? 'Row Height' : 'Column Width')}<form id="workbook-dimension-form"><div class="field"><label for="workbook-dimension">${label}</label><input id="workbook-dimension" type="number" min="0" max="${max}" step="any" value="${current}" required><small>Berlaku pada ${esc(workbookRange())}. Nilai 0 menyembunyikan ${isRow ? 'baris' : 'kolom'}.</small></div><div id="ribbon-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Terapkan Ukuran</button></div></form>`);
  document.getElementById('workbook-dimension-form').onsubmit = event => {
    event.preventDefault();
    try {
      if (activeWorkbook !== state || !workbookCheckpoint()) throw new Error('Dokumen tidak dapat diedit.');
      WorkbookFormat.resize(state.book, state.sheetIndex, workbookRange(), axis, Number(document.getElementById('workbook-dimension').value));
      state.historyGroup = null; workbookChanged(); modal.close(); restoreWorkbookFocus();
    } catch (failure) { document.getElementById('ribbon-error').textContent = failure.message; }
  };
}

function showWorkbookFind() {
  const state = activeWorkbook;
  showModal(`${modalHeading('Find')}<form id="workbook-find-form"><div class="field"><label for="workbook-find">Cari isi pada sheet ini</label><input id="workbook-find" type="search" maxlength="200" required></div><div id="ribbon-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Temukan</button></div></form>`);
  document.getElementById('workbook-find-form').onsubmit = event => {
    event.preventDefault();
    if (activeWorkbook !== state || !workbookDocument()) return;
    const query = document.getElementById('workbook-find').value.toLowerCase();
    const match = [...state.book.sheets[state.sheetIndex].cells].find(([, cell]) => WorkbookEngine.value(state.book, cell).toLowerCase().includes(query));
    if (!match) { document.getElementById('ribbon-error').textContent = 'Isi tidak ditemukan pada sheet ini.'; return; }
    state.range = match[0]; state.anchor = match[0]; selectWorkbookCell(match[0]); ensureWorkbookCellVisible(match[0]); modal.close();
  };
}

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-ribbon-tab]');
  if (tab) {
    document.querySelectorAll('[data-ribbon-tab]').forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; document.getElementById('ribbon-' + button.dataset.ribbonTab).hidden = !selected; });
    return;
  }
  const property = event.target.closest('[data-ribbon-property]');
  if (property) { applyWorkbookFormat(property.dataset.ribbonProperty, property.dataset.value); return; }
  const button = event.target.closest('[data-ribbon-action]');
  if (!button || !workbookDocument(true) || activeWorkbook.saving) return;
  try {
    const action = button.dataset.ribbonAction;
    if (action === 'save') saveWorkbookChanges();
    else if (action === 'copy' || action === 'cut') copyWorkbookSelection(action === 'cut');
    else if (action === 'paste' || action === 'paste-external') showWorkbookPaste(action === 'paste-external').catch(failure => toast(failure.message, true));
    else if (action === 'clear') commitWorkbookValues(workbookEditableReferences().map(reference => ({ reference, value: '' })));
    else if (action === 'row-height' || action === 'column-width') showWorkbookDimension(action === 'row-height' ? 'row' : 'column');
    else if (action === 'find') showWorkbookFind();
  } catch (failure) { toast(failure.message, true); }
});
document.addEventListener('change', event => {
  if (!event.target.matches('[data-ribbon-view]') || !workbookDocument()) return;
  const view = event.target.dataset.ribbonView;
  activeWorkbook.view ||= {}; activeWorkbook.view[view] = event.target.checked;
  document.getElementById('workbook-grid').classList.toggle('hide-gridlines', activeWorkbook.view.gridlines === false);
  document.querySelector('.workbook-formula-bar').hidden = activeWorkbook.view.formula === false;
});
document.addEventListener('keydown', event => {
  if (event.target.matches('.workbook-cell') && event.key === 'Tab' && workbookDocument() && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const state = activeWorkbook, sheet = state.book.sheets[state.sheetIndex], point = XlsxPackage.position(event.target.dataset.cell);
    const merged = sheet.merges.find(merge => merge.start === event.target.dataset.cell);
    let row = point.row, column = (merged ? event.shiftKey ? merged.first.column : merged.last.column : point.column) + (event.shiftKey ? -1 : 1);
    if (column > sheet.columns) { column = 1; row++; }
    if (column < 1) { column = sheet.columns; row--; }
    if (row < 1 || row > sheet.rows) return;
    event.preventDefault();
    const targetMerge = sheet.merges.find(merge => row >= merge.first.row && row <= merge.last.row && column >= merge.first.column && column <= merge.last.column);
    const reference = targetMerge?.start || XlsxPackage.address(column, row);
    state.range = reference; state.anchor = reference; selectWorkbookCell(reference); ensureWorkbookCellVisible(reference);
    document.querySelector(`.workbook-cell[data-cell="${reference}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (!event.target.matches('[data-ribbon-tab]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[data-ribbon-tab]')], index = tabs.indexOf(event.target);
  const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : tabs[(index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length];
  next.click(); next.focus();
});
