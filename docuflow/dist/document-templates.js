'use strict';

const documentTypeRecord = name => db.documentTypes.find(type => type.name === name);
const templateForType = name => db.documentTemplates.find(template => template.typeId === documentTypeRecord(name)?.id);
const instructionType = name => documentTypeRecord(name)?.id === 'builtin-ik' || documentTypeRecord(name)?.prefix === 'IK';
const spreadsheetType = name => instructionType(name) || Boolean(templateForType(name));

function releaseWorkbookFile(key) {
  if (!key || [...db.documents, ...db.documentRequests].some(doc => doc.workbookKey === key) || db.documentRequests.some(request => request.submissions?.some(submission => submission.workbookKey === key)) || db.documentTemplates.some(template => template.workbookKey === key)) return Promise.resolve();
  return WorkbookStore.remove(key).catch(() => {});
}

function documentTemplatesPage() {
  if (!isAdmin()) return '';
  return `${heading('Template Dokumen', 'Unggah format softcopy Excel yang digunakan saat membuat dokumen.', `<button class="btn btn-primary" data-action="add-template">${icon('upload')} Unggah Template</button>`)}<section class="panel"><div class="table-scroll"><table><caption class="visually-hidden">Template Excel per jenis dokumen</caption><thead><tr><th scope="col">JENIS DOKUMEN</th><th scope="col">FILE TEMPLATE</th><th scope="col">DIPERBARUI</th><th scope="col">AKSI</th></tr></thead><tbody>${db.documentTypes.map(type => { const template = templateForType(type.name); return `<tr><td><strong>${esc(type.name)}</strong></td><td>${template ? esc(template.fileName) : '<span class="muted">Belum ada template</span>'}</td><td>${template ? dateLabel(template.updatedAt) : '—'}</td><td><div class="row-actions"><button class="table-action" data-action="add-template" data-id="${esc(type.id)}">${icon('upload')} ${template ? 'Ganti Template' : 'Unggah Template'}</button>${template ? `<button class="table-action" data-action="download-template" data-id="${esc(type.id)}">${icon('download')} Unduh</button>` : ''}</div></td></tr>`; }).join('')}</tbody></table></div></section><p class="small muted">Setiap dokumen baru memakai salinan template. Mengganti template tidak mengubah dokumen yang sudah dibuat. XLSX, XLTX, XLSM, XLTM, XLS, XLT dan XLSB; maksimal 2 MB.</p>`;
}

function showTemplateForm(typeId = '') {
  if (!isAdmin()) return;
  showModal(`${modalHeading('Unggah Template Excel')}<form id="template-form"><div class="field"><label for="template-type">Jenis dokumen</label><select id="template-type" name="typeId" required>${options(db.documentTypes, typeId || db.documentTypes.find(type => type.prefix === 'IK')?.id)}</select></div><div class="field template-upload"><label for="template-file">Format softcopy Excel</label><input id="template-file" name="workbook" type="file" accept=".xlsx,.xltx,.xlsm,.xltm,.xls,.xlt,.xlsb" required><small>XLSX dipertahankan. Format lain menjadi XLSX tanpa macro. Konversi XLS/XLT/XLSB dapat mengubah format dan tidak menyertakan gambar/objek; periksa hasil sebelum dipakai.</small></div><div id="template-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Simpan Template</button></div></form>`);
  document.getElementById('template-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!isAdmin()) return;
    const form = event.target;
    const error = form.querySelector('#template-error');
    if (form.dataset.saving === 'true') return;
    const snapshot = db, actorId = currentUser.id;
    const data = new FormData(form), file = data.get('workbook'), selectedType = data.get('typeId');
    let key;
    setDocumentBusy(form, true);
    try {
      if (!db.documentTypes.some(type => type.id === selectedType) || !file?.name || !/\.(xlsx|xltx|xlsm|xltm|xls|xlt|xlsb)$/i.test(file.name)) throw new Error('Pilih jenis dokumen dan file Excel yang didukung.');
      if (!file.size || file.size > XlsxPackage.limits.file) throw new Error('Ukuran template maksimal 2 MB.');
      const bytes = await importWorkbook(file);
      await WorkbookEngine.open(bytes);
      if (!form.isConnected || !isAdmin() || currentUser.id !== actorId || db !== snapshot) throw new Error('Data berubah. Buka kembali formulir template.');
      key = 'template-' + uid();
      await WorkbookStore.put(key, bytes);
      if (!form.isConnected || !isAdmin() || currentUser.id !== actorId || db !== snapshot) throw new Error('Data berubah. Buka kembali formulir template.');
      const next = transaction();
      const record = { typeId: selectedType, fileName: file.name.replace(/\.[^.]+$/,'.xlsx'), sourceName:file.name, workbookKey: key, updatedAt: today(), updatedBy: actorId };
      next.documentTemplates = next.documentTemplates.filter(template => template.typeId !== selectedType);
      next.documentTemplates.push(record);
      if (!saveDatabase(next)) throw new Error('Metadata template gagal disimpan. File sebelumnya tetap tersedia.');
      releaseWorkbookFile(snapshot.documentTemplates.find(template => template.typeId === selectedType)?.workbookKey);
      key = null;
      modal.close(); render(); toast('Template Excel berhasil disimpan.');
    } catch (failure) { if (key) await WorkbookStore.remove(key).catch(() => {}); error.textContent = failure.message; }
    finally { if (form.isConnected) setDocumentBusy(form, false); }
  });
}

async function downloadTemplate(typeId) {
  if (!isAdmin()) return;
  const template = db.documentTemplates.find(template => template.typeId === typeId);
  if (!template) return;
  try { const bytes = await WorkbookStore.get(template.workbookKey); if (isAdmin()) downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), template.fileName); }
  catch (failure) { toast(failure.message, true); }
}

function syncDocumentSource(form) {
  if (!form) return;
  syncDocumentCategories(form);
  const typeName = form.querySelector('#doc-type')?.value;
  const editId = form.elements.editId?.value, sourceId = form.elements.sourceId?.value;
  const source = documentRecord(editId || sourceId);
  const spreadsheet = Boolean(source?.workbookKey) || ((!source || (!source.attachment && instructionType(typeName))) && spreadsheetType(typeName));
  form.querySelector('.document-attachment')?.toggleAttribute('hidden', spreadsheet || instructionType(typeName));
  form.querySelector('.document-email-recipients')?.toggleAttribute('hidden', spreadsheet || instructionType(typeName));
  const notice = form.querySelector('.document-template-notice');
  if (notice) {
    notice.hidden = !spreadsheet && !instructionType(typeName);
    notice.textContent = source?.workbookKey ? 'Isi Excel dokumen ini akan dilanjutkan di editor setelah disimpan.' : source && instructionType(typeName) ? 'Dokumen lama tetap memakai file yang sudah tersimpan. Template Excel berlaku untuk dokumen baru.' : templateForType(typeName) ? 'Setelah disimpan, salinan template Excel akan langsung terbuka untuk diedit.' : 'Template Excel belum tersedia. Minta admin mengunggah format softcopy melalui Template Dokumen.';
  }
}

document.addEventListener('change', event => { if (event.target.id === 'doc-type') syncDocumentSource(event.target.form); });
