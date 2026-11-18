'use strict';

let activeWorkbook = null;
const workbookRouteId = () => currentRoute().slice(9).split('?')[0];
const workbookReadOnly = () => currentRoute().endsWith('?view');
const workbookCanEdit = doc => !workbookReadOnly() && canEditDocument(doc);

function workbookEditorPage(id) {
  id = id.split('?')[0];
  const doc = documentRecord(id);
  if (!doc || !doc.workbookKey || !canRead(doc)) return `${heading('Dokumen tidak tersedia')}<section class="panel empty"><p>Dokumen Excel ini tidak tersedia untuk akun Anda.</p><a class="btn btn-secondary" href="#master">Kembali ke Master Dokumen</a></section>`;
  return `<div class="workbook-heading"><div><h1>${esc(doc.title)}</h1><p>${esc(doc.entityType==='request'?requestNumberLabel(doc):doc.code)} · ${esc(categoryName(doc.categoryId))} · Revisi ${formatRevision(doc.revision)}</p></div><div class="workbook-actions"><span id="workbook-save-status" role="status">Memuat workbook…</span><a href="#${doc.entityType === 'request' ? 'request-' + esc(doc.id) : 'master'}" class="btn btn-secondary">${doc.entityType === 'request' ? 'Ke Permintaan' : 'Kembali'}</a><button class="btn btn-secondary" data-workbook-action="download">${icon('download')} Unduh Excel</button>${workbookCanEdit(doc) ? `<button class="btn btn-secondary" data-workbook-action="save">${icon('save')} Simpan Perubahan</button>${doc.adminReviewRequired && doc.requesterId===currentUser.id && ['draft','returned'].includes(doc.status) ? '<button class="btn btn-primary" data-workbook-action="submit-admin">Submit ke Admin</button>' : ''}${doc.adminReviewRequired && isAdmin() && doc.status==='admin_review' ? '<button class="btn btn-primary" data-workbook-action="approval">Lanjutkan ke Approval</button>' : ''}` : ''}</div></div><section id="workbook-editor" class="panel workbook-panel" aria-label="Editor Excel">${workbookCanEdit(doc) ? workbookToolbar() : ''}<div class="workbook-formula-bar"><div class="ribbon-address-box"><label class="visually-hidden" for="workbook-range">Rentang sel</label><input id="workbook-range" aria-label="Rentang sel" value="A1" placeholder="A1:D5" spellcheck="false"><button type="button" data-format-action="select-range" aria-label="Pilih rentang" title="Go To">Go To</button></div><span class="ribbon-fx" aria-hidden="true">fx</span><output id="workbook-address" class="visually-hidden" aria-label="Alamat sel">A1</output><label class="visually-hidden" for="workbook-cell-value">Isi sel terpilih</label><textarea id="workbook-cell-value" rows="1" maxlength="4000" disabled placeholder="Pilih sel untuk mengedit isinya"></textarea></div><div id="workbook-loading" class="empty" role="status">Menyiapkan lembar kerja…</div><div id="workbook-grid" class="workbook-grid" role="region" aria-label="Lembar kerja Excel, dapat digeser" tabindex="0"></div><div class="workbook-bottom-bar"><div id="workbook-tabs" class="workbook-tabs" role="tablist" aria-label="Worksheet"></div>${workbookCanEdit(doc)?'':'<div class="workbook-readonly-view-tools">'+workbookFreezeControls()+'</div>'}${workbookZoomControls()}</div></section>`;
}

async function mountWorkbookEditor(id) {
  id = id.split('?')[0];
  const container = document.getElementById('workbook-editor');
  const doc = documentRecord(id);
  if (!container || !doc?.workbookKey || !canRead(doc)) return;
  container.querySelectorAll('.excel-ribbon button, .excel-ribbon input, .excel-ribbon select, .workbook-formula-bar button, .workbook-formula-bar input, [data-workbook-action=save]').forEach(control => { control.disabled = true; });
  const actorId = currentUser.id, snapshot = db;
  try {
    if (!activeWorkbook || activeWorkbook.id !== id || activeWorkbook.key !== doc.workbookKey || activeWorkbook.actorId !== actorId || activeWorkbook.recordVersion !== (doc.contentVersion || doc.updatedAt) || activeWorkbook.editable !== Boolean(workbookCanEdit(doc))) {
      const bytes = await WorkbookStore.get(doc.workbookKey);
      const book = await WorkbookEngine.open(bytes);
      if (!container.isConnected || currentUser?.id !== actorId || db !== snapshot || !canRead(doc)) return;
      activeWorkbook?.viewportObserver?.disconnect();
      activeWorkbook = { id, key: doc.workbookKey, actorId, recordVersion: doc.contentVersion || doc.updatedAt, editable: Boolean(workbookCanEdit(doc)), readOnly: workbookReadOnly(), book, sheetIndex: 0, selected: 'A1', dirty: false, edits: 0, saving: false };
    }
    document.getElementById('workbook-loading').hidden = true;
    renderWorkbookSheet(); observeWorkbookViewport();
  } catch (failure) { if (container.isConnected) { document.getElementById('workbook-loading').hidden = false; document.getElementById('workbook-loading').textContent = failure.message; document.getElementById('workbook-save-status').textContent = 'Workbook tidak dapat dibuka'; } }
}

function workbookDocument(editing = false) {
  if (!activeWorkbook || activeWorkbook.actorId !== currentUser?.id || !currentRoute().startsWith('workbook-') || workbookRouteId() !== activeWorkbook.id) return null;
  const doc = [...db.documents, ...db.documentRequests].find(doc => doc.id === activeWorkbook.id && doc.workbookKey === activeWorkbook.key);
  return doc && activeWorkbook.recordVersion === (doc.contentVersion || doc.updatedAt) && activeWorkbook.editable === Boolean(workbookCanEdit(doc)) && (editing ? workbookCanEdit(doc) : canRead(doc)) ? doc : null;
}

function renderWorkbookSheet() {
  if (!workbookDocument()) return;
  document.querySelectorAll('.excel-ribbon button, .excel-ribbon input, .excel-ribbon select, .workbook-formula-bar button, .workbook-formula-bar input, [data-workbook-action=save]').forEach(control => { control.disabled = false; });
  const state = activeWorkbook;state.editingCell=null;syncWorkbookSheetView();
  const writable = Boolean(workbookDocument(true));
  document.getElementById('workbook-tabs').innerHTML = state.book.sheets.map((sheet, index) => `<button type="button" role="tab" aria-selected="${index === state.sheetIndex}" data-sheet-index="${index}">${esc(sheet.name)}</button>`).join('');
  layoutWorkbookViewport(false);
  renderWorkbookGrid(state, writable, document.getElementById('workbook-grid'));
  document.getElementById('workbook-grid').classList.toggle('hide-gridlines', state.view?.gridlines === false);
  document.querySelector('.workbook-formula-bar').hidden = state.view?.formula === false;
  document.querySelectorAll('[data-ribbon-view]').forEach(input=>{input.checked=state.view?.[input.dataset.ribbonView]!==false;});
  document.getElementById('workbook-save-status').textContent = state.dirty ? 'Perubahan belum disimpan' : writable ? 'Semua perubahan tersimpan' : 'Mode baca';
  selectWorkbookCell(state.selected); syncWorkbookRibbon();syncWorkbookZoom();syncWorkbookBorderTool();
}

function selectWorkbookCell(reference) {
  if (!workbookDocument()) return;
  const state = activeWorkbook, sheet = state.book.sheets[state.sheetIndex];
  const input = document.querySelector(`.workbook-cell[data-cell="${reference}"]`);
  state.selected = reference;
  document.querySelectorAll('.workbook-cell.is-selected').forEach(cell => cell.classList.remove('is-selected'));
  input?.classList.add('is-selected');
  highlightWorkbookRange();
  document.getElementById('workbook-address').textContent = reference;
  const value = document.getElementById('workbook-cell-value'); value.value = WorkbookEngine.value(state.book, sheet.cells.get(reference)); value.disabled = !workbookDocument(true) || Boolean(sheet.cells.get(reference) && WorkbookEngine.child(sheet.cells.get(reference), 'f'));
}

function updateWorkbookCell(reference, value) {
  if (!workbookDocument(true) || activeWorkbook.saving) throw new Error('Akses edit dokumen tidak tersedia.');
  workbookCheckpoint('typing-' + activeWorkbook.sheetIndex + '-' + reference);
  if (WorkbookEngine.setCell(activeWorkbook.book, activeWorkbook.sheetIndex, reference, value)) {
    activeWorkbook.dirty = true;
    activeWorkbook.edits++;
    document.getElementById('workbook-save-status').textContent = 'Perubahan belum disimpan';
  }
}

async function saveWorkbookChanges() {
  const doc = workbookDocument(true), state = activeWorkbook;
  if (!doc || state.saving) return;
  const snapshot = db;
  const savedEdits = state.edits;
  state.saving = true; let key;
  document.querySelectorAll('[data-workbook-action]').forEach(button => { button.disabled = true; });
  try {
    const bytes = await WorkbookEngine.serialize(state.book);
    if (activeWorkbook !== state || db !== snapshot || !workbookDocument(true)) throw new Error('Data atau otorisasi berubah. Buka kembali dokumen.');
    key = 'document-' + uid(); await WorkbookStore.put(key, bytes);
    if (activeWorkbook !== state || db !== snapshot || !workbookDocument(true)) throw new Error('Data atau otorisasi berubah. Buka kembali dokumen.');
    const next = transaction(), updated = next.documentRequests.find(doc => doc.id === state.id);
    updated.workbookKey = key; updated.updatedAt = today(); updated.contentVersion++;
    if (!saveDatabase(next)) throw new Error('Perubahan belum tersimpan. File sebelumnya tetap tersedia.');
    const previousKey = state.key;
    state.key = key; state.recordVersion = updated.contentVersion; key = null; state.dirty = state.edits !== savedEdits;
    releaseWorkbookFile(previousKey);
    document.getElementById('workbook-save-status').textContent = state.dirty ? 'Perubahan belum disimpan' : 'Semua perubahan tersimpan';
    toast('Perubahan Excel berhasil disimpan.');return !state.dirty;
  } catch (failure) { if (key) await WorkbookStore.remove(key).catch(() => {}); toast(failure.message, true);return false; }
  finally { state.saving = false; document.querySelectorAll('[data-workbook-action]').forEach(button => { button.disabled = false; }); restoreWorkbookFocus(); }
}

async function submitWorkbookToAdmin() {
  const state=activeWorkbook,doc=workbookDocument(true);
  if(!doc||!doc.adminReviewRequired||doc.requesterId!==currentUser.id||!['draft','returned'].includes(doc.status)||state.saving)return;
  if(state.dirty && !await saveWorkbookChanges())return;
  const snapshot=db,actor=currentUser.id,key=state.key,version=state.recordVersion;
  state.saving=true;document.querySelectorAll('[data-workbook-action]').forEach(button=>button.disabled=true);
  try {
    await WorkbookStore.get(key);
    if(activeWorkbook!==state||db!==snapshot||currentUser?.id!==actor||state.key!==key||state.recordVersion!==version||state.dirty||!workbookDocument(true))throw new Error('Dokumen berubah. Periksa dan kirim kembali.');
    const next=transaction(),request=next.documentRequests.find(item=>item.id===state.id);
    DocumentWorkflow.submitToAdmin(next,currentUser,request,today());
    if(!saveDatabase(next))throw new Error('Dokumen belum terkirim. Silakan coba kembali.');
    state.dirty=false;navigate('requests');toast('Dokumen berhasil dikirim ke admin untuk diperiksa.');
  } catch(error){toast(error.message,true);}
  finally{state.saving=false;document.querySelectorAll('[data-workbook-action]').forEach(button=>button.disabled=false);}
}

async function continueWorkbookApproval(){
  const state=activeWorkbook,doc=workbookDocument(true);
  if(!doc||!doc.adminReviewRequired||!isAdmin()||doc.status!=='admin_review'||state.saving)return;
  if(state.dirty&&!await saveWorkbookChanges())return;
  if(activeWorkbook!==state||!workbookDocument(true)||state.dirty)return;
  navigate('request-'+state.id);
}

async function downloadWorkbook(id) {
  const doc = [...db.documents, ...db.documentRequests].find(doc => doc.id === id && canRead(doc));
  if (!doc?.workbookKey) return;
  const actorId = currentUser.id, key = doc.workbookKey;
  try {
    const bytes = activeWorkbook?.id === id && workbookDocument(true) ? await WorkbookEngine.serialize(activeWorkbook.book) : await WorkbookStore.get(key);
    if (currentUser?.id !== actorId || ![...db.documents, ...db.documentRequests].some(doc => doc.id === id && doc.workbookKey === key && canRead(doc))) return;
    downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), doc.code.replace(/[^A-Za-z0-9_-]/g, '-') + '-rev' + doc.revision + '.xlsx');
  } catch (failure) { toast(failure.message, true); }
}

document.addEventListener('focusin', event => { if (event.target.matches('.workbook-cell') && workbookDocument()) { const reference = event.target.dataset.cell; if (activeWorkbook.selected !== reference) { const sheet=activeWorkbook.book.sheets[activeWorkbook.sheetIndex],merge=sheet.merges.find(item=>item.start===reference);activeWorkbook.range = workbookMergedSelection(merge,reference); activeWorkbook.anchor = reference; } selectWorkbookCell(reference); event.target.value = WorkbookEngine.value(activeWorkbook.book, activeWorkbook.book.sheets[activeWorkbook.sheetIndex].cells.get(event.target.dataset.cell)); } });
document.addEventListener('input', event => {
  if (!event.target.matches('.workbook-cell, #workbook-cell-value')) return;
  const reference = event.target.dataset.cell || activeWorkbook?.selected;
  try {
    updateWorkbookCell(reference, event.target.value);
    if (event.target.id === 'workbook-cell-value') { const input = document.querySelector(`.workbook-cell[data-cell="${reference}"]`); if (input) input.value = event.target.value; }
    else document.getElementById('workbook-cell-value').value = event.target.value;
  } catch (failure) {
    const original = WorkbookEngine.value(activeWorkbook.book, activeWorkbook.book.sheets[activeWorkbook.sheetIndex].cells.get(reference));
    event.target.value = original;
    const cell = document.querySelector(`.workbook-cell[data-cell="${reference}"]`);
    if (cell) cell.value = original;
    document.getElementById('workbook-cell-value').value = original;
    toast(failure.message, true);
  }
});
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-sheet-index]');
  if (tab && workbookDocument()) { activeWorkbook.selectedPicture=null;activeWorkbook.sheetIndex = Number(tab.dataset.sheetIndex); activeWorkbook.selected = 'A1'; activeWorkbook.range = 'A1'; activeWorkbook.historyGroup = null; const grid = document.getElementById('workbook-grid'); grid.scrollTop = 0; grid.scrollLeft = 0; renderWorkbookSheet(); restoreWorkbookFocus(); return; }
  const button = event.target.closest('[data-workbook-action]');
  if (button?.dataset.workbookAction === 'save') saveWorkbookChanges();
  if (button?.dataset.workbookAction === 'submit-admin') submitWorkbookToAdmin();
  if (button?.dataset.workbookAction === 'approval') continueWorkbookApproval();
  if (button?.dataset.workbookAction === 'download' && workbookDocument()) downloadWorkbook(activeWorkbook.id);
});
document.addEventListener('paste', event => {
  if (!event.target.matches('.workbook-cell') || event.target.readOnly || !workbookDocument(true)) return;
  const pasted = event.clipboardData.getData('text/plain');
  if (!pasted.includes('\t') && !pasted.includes('\n')) return;
  event.preventDefault();
  try {
    pasteWorkbookMatrix(parseWorkbookClipboard(pasted));
  } catch (failure) { toast(failure.message, true); }
});
document.addEventListener('click', event => {
  if (!activeWorkbook?.dirty || !workbookDocument()) return;
  const link = event.target.closest('a[href]'), logout = event.target.closest('[data-action="logout"]');
  if (link?.hasAttribute('download')) return;
  if (!logout && (!link || link.getAttribute('href') === '#' + currentRoute())) return;
  if (!window.confirm('Perubahan Excel belum disimpan. Tinggalkan editor?')) { event.preventDefault(); event.stopImmediatePropagation(); }
  else activeWorkbook = null;
}, true);
window.addEventListener('hashchange', event => {
  if (!activeWorkbook?.dirty || currentRoute().startsWith('workbook-') && workbookRouteId() === activeWorkbook.id && workbookReadOnly() === activeWorkbook.readOnly) return;
  if (window.confirm('Perubahan Excel belum disimpan. Tinggalkan editor?')) { activeWorkbook = null; return; }
  history.replaceState(null, '', event.oldURL);
  event.stopImmediatePropagation();
});
window.addEventListener('beforeunload', event => { if (activeWorkbook?.dirty) { event.preventDefault(); event.returnValue = ''; } });
