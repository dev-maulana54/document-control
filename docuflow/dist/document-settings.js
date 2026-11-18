'use strict';

let authorizationDepartment = '';
const categoryName = id => db.documentCategories.find(category => category.id === id)?.code || 'Belum Dikategorikan';
const assignableCategories = () => db.documentCategories.filter(category => DocumentAccess.canAssign(db, currentUser, category.id));
const categoryTypeLabel = category => db.documentTypes.find(type => type.id === category.documentTypeId)?.name || DocumentCategories.usedTypeNames(db, category.id).join(', ') || 'Belum ditentukan';

function documentCategoriesPage() {
  if (!isAdmin()) return '';
  return `${heading('Kategori Dokumen', 'Kelompokkan dokumen untuk pengaturan akses departemen.', `<button class="btn btn-primary" data-action="add-category">${icon('plus')} Tambah Kategori</button>`)}<section class="panel"><div class="table-scroll"><table><caption class="visually-hidden">Kategori dokumen</caption><thead><tr><th scope="col">NAMA KATEGORI</th><th scope="col">JENIS DOKUMEN</th><th scope="col">DOKUMEN</th><th scope="col">AKSI</th></tr></thead><tbody>${db.documentCategories.map(category => `<tr><td><strong>${esc(category.name)}</strong></td><td>${esc(categoryTypeLabel(category))}</td><td>${db.documents.filter(doc => doc.categoryId === category.id).length} dokumen</td><td><div class="row-actions"><button class="table-action" data-action="edit-category" data-id="${esc(category.id)}" aria-label="Edit kategori ${esc(category.name)}">${icon('edit')} Edit</button><button class="table-action delete" data-action="delete-category" data-id="${esc(category.id)}" aria-label="Hapus kategori ${esc(category.name)}">${icon('trash')} Hapus</button></div></td></tr>`).join('') || '<tr><td colspan="4">Belum ada kategori dokumen.</td></tr>'}</tbody></table></div></section>`;
}

function showCategoryForm(id = '') {
  if (!isAdmin()) return;
  const category = db.documentCategories.find(category => category.id === id);
  if (id && !category) return;
  showModal(`${modalHeading(category ? 'Edit Kategori Dokumen' : 'Tambah Kategori Dokumen')}<form id="category-form"><div class="form-grid">${category ? `<div class="field full"><label for="category-code">Kode kategori <span>*</span></label><input id="category-code" name="code" value="${esc(category?.code || '')}" placeholder="Contoh: OM-PR2-ASY" maxlength="32" pattern="[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)*" required></div>` : ''}<div class="field full"><label for="category-type">Jenis dokumen <span>*</span></label><select id="category-type" name="documentTypeId" ${!category || category.documentTypeId ? 'required' : ''}><option value="">${category && !category.documentTypeId ? 'Semua jenis (kategori lama)' : 'Pilih jenis dokumen'}</option>${options(db.documentTypes, category?.documentTypeId)}</select></div><div class="field full"><label for="category-name">Nama kategori <span>*</span></label><input id="category-name" name="name" value="${esc(category?.name || '')}" placeholder="Contoh: Operation Manual Assembly PR2" maxlength="100" required></div></div><p class="small muted">Kategori baru belum dapat dibuka user sampai admin memberikan otorisasi departemen.</p><div id="category-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">${icon('save')} Simpan Kategori</button></div></form>`);
  document.getElementById('category-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!isAdmin()) return;
    const data = new FormData(event.target);
    let code = category ? data.get('code').trim().toUpperCase() : '';
    const name = data.get('name').trim().replace(/\s+/g, ' ');
    const error = event.target.querySelector('#category-error');
    const documentTypeId = data.get('documentTypeId') || null;
    try { DocumentCategories.validateType(db, id, documentTypeId); } catch (failure) { error.textContent = failure.message; return; }
    if (!category) {
      const prefix = db.documentTypes.find(type => type.id === documentTypeId).prefix;
      const usedCodes = new Set(db.documentCategories.map(category => category.code.toUpperCase()));
      let number = 1;
      do { code = prefix + '-' + String(number++).padStart(3, '0'); } while (usedCodes.has(code));
    }
    if (!name || name.length > 100 || code.length > 32 || !/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(code)) { error.textContent = 'Lengkapi nama dan kode kategori yang valid.'; return; }
    if (db.documentCategories.some(category => category.id !== id && (category.code === code || category.name.toLowerCase() === name.toLowerCase()))) { error.textContent = 'Nama atau kode kategori sudah digunakan.'; return; }
    const next = transaction();
    const record = { id: category?.id || uid(), code, name, documentTypeId };
    if (category) next.documentCategories[next.documentCategories.findIndex(category => category.id === id)] = record;
    else next.documentCategories.push(record);
    if (saveDatabase(next)) { modal.close(); render(); toast('Kategori dokumen berhasil disimpan.'); }
  });
}

function deleteCategory(id, confirmed = false) {
  if (!isAdmin()) return;
  const category = db.documentCategories.find(category => category.id === id);
  if (!category) return;
  if ([...db.documents, ...db.documentRequests].some(doc => doc.categoryId === id)) {
    showModal(`${modalHeading('Kategori Masih Digunakan')}<p class="detail-body">Pindahkan seluruh dokumen, termasuk versi lama, dari kategori ${esc(category.code)} sebelum menghapusnya.</p><div class="form-actions"><button class="btn btn-secondary" data-action="close-modal">Mengerti</button></div>`);
    return;
  }
  if (!confirmed) {
    showModal(`${modalHeading('Hapus Kategori?')}<p class="detail-body">Kategori ${esc(category.code)} akan dihapus dari pilihan dokumen dan otorisasi departemen.</p><div class="form-actions"><button class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-danger" data-action="confirm-delete-category" data-id="${esc(id)}">Hapus Kategori</button></div>`);
    return;
  }
  const next = transaction();
  next.documentCategories = next.documentCategories.filter(category => category.id !== id);
  for (const departmentId of Object.keys(next.departmentAuthorizations)) {
    const grants = next.departmentAuthorizations[departmentId];
    next.departmentAuthorizations[departmentId] = Array.isArray(grants) ? grants.filter(categoryId => categoryId !== id) : [];
  }
  if (saveDatabase(next)) { if (filter.category === id) filter.category = ''; modal.close(); render(); toast('Kategori berhasil dihapus.'); }
}

function authorizationPage() {
  if (!isAdmin()) return '';
  if (!db.departments.some(department => department.id === authorizationDepartment)) authorizationDepartment = db.departments[0]?.id || '';
  const grants = DocumentAccess.allowedCategoryIds(db, { role: 'user', departmentId: authorizationDepartment });
  return `${heading('Otorisasi Dokumen', 'Atur akses kategori dokumen untuk setiap departemen.', `<button class="btn btn-secondary" data-action="copy-authorization" ${db.departments.length < 2 ? 'disabled' : ''}>${icon('layers')} Salin Otorisasi</button>`)}<section class="panel authorization-panel"><form id="authorization-form"><div class="authorization-header"><div class="field"><label for="authorization-department">Departemen</label><select id="authorization-department" name="authorizationDepartment" required>${options(db.departments, authorizationDepartment)}</select></div><p>Pengaturan berlaku untuk semua user di departemen ini. Admin dapat mengakses seluruh dokumen.</p></div><div class="authorization-toolbar"><div><h2>Akses Kategori Dokumen</h2><p>Pilih kategori yang boleh dibuka oleh departemen ini.</p></div><input id="authorization-search" type="search" aria-label="Cari kategori otorisasi" placeholder="Cari nama kategori..."></div><div class="table-scroll authorization-categories"><table class="authorization-table"><caption class="visually-hidden">Otorisasi kategori dokumen untuk ${esc(departmentName(authorizationDepartment))}</caption><thead><tr><th scope="col">NO</th><th scope="col">NAMA KATEGORI</th><th scope="col">DOKUMEN</th><th scope="col">BOLEH DIBUKA</th></tr></thead><tbody>${db.documentCategories.map((category, index) => `<tr data-category-search="${esc(category.name.toLowerCase())}"><td>${index + 1}</td><td><strong>${esc(category.name)}</strong></td><td>${db.documents.filter(doc => doc.categoryId === category.id).length} dokumen</td><td><label class="authorization-toggle"><input type="checkbox" name="categoryIds" value="${esc(category.id)}" aria-label="Izinkan ${esc(category.name)}" ${grants.includes(category.id) ? 'checked' : ''}><span>Izinkan akses</span></label></td></tr>`).join('') || '<tr><td colspan="4">Belum ada kategori dokumen.</td></tr>'}</tbody></table></div><p id="authorization-no-results" class="small muted" hidden>Tidak ada kategori yang sesuai dengan pencarian.</p><div class="authorization-footer"><p class="authorization-summary" role="status">${grants.length} dari ${db.documentCategories.length} kategori dipilih</p><button type="submit" class="btn btn-primary" ${authorizationDepartment ? '' : 'disabled'}>${icon('save')} Simpan Otorisasi</button></div><p class="small muted">Tanpa kategori terpilih, user tidak dapat membuka dokumen. Salin Otorisasi menggunakan pengaturan yang sudah disimpan.</p><div id="authorization-error" class="form-error" role="alert"></div></form></section>`;
}

document.addEventListener('input', event => {
  if (event.target.id !== 'authorization-search') return;
  const query = event.target.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('[data-category-search]').forEach(row => { row.hidden = !row.dataset.categorySearch.includes(query); if (!row.hidden) shown++; });
  document.getElementById('authorization-no-results').hidden = shown > 0;
});

function showCopyAuthorization() {
  if (!isAdmin() || db.departments.length < 2) return;
  showModal(`${modalHeading('Salin Otorisasi Departemen')}<form id="copy-authorization-form"><div class="field"><label for="authorization-source">Salin dari departemen</label><select id="authorization-source" name="sourceId" required>${options(db.departments, authorizationDepartment)}</select></div><p class="copy-source-summary small muted"></p><fieldset class="copy-targets"><legend>Terapkan ke departemen</legend></fieldset><p class="notice">Otorisasi tujuan akan diganti dengan pengaturan tersimpan dari sumber. Perubahan berikutnya pada sumber tidak mengubah salinannya.</p><div id="copy-authorization-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Terapkan Salinan</button></div></form>`);
  refreshCopyTargets(document.getElementById('copy-authorization-form'));
}

function refreshCopyTargets(form) {
  const sourceId = form.elements.sourceId.value;
  const selected = new Set(new FormData(form).getAll('targetIds'));
  const categories = DocumentAccess.allowedCategoryIds(db, { role: 'user', departmentId: sourceId });
  form.querySelector('.copy-source-summary').textContent = categories.length ? 'Kategori tersimpan: ' + categories.map(id => db.documentCategories.find(category => category.id === id)?.name || 'Kategori tidak ditemukan').join(', ') : 'Sumber tidak memiliki izin kategori. Salinan ini akan mengosongkan izin tujuan.';
  form.querySelector('.copy-targets').innerHTML = `<legend>Terapkan ke departemen</legend>${db.departments.filter(department => department.id !== sourceId).map(department => `<label class="authorization-choice"><input type="checkbox" name="targetIds" value="${esc(department.id)}" ${selected.has(department.id) ? 'checked' : ''}><span><strong>${esc(department.name)}</strong></span></label>`).join('')}`;
}

document.addEventListener('change', event => {
  if (!isAdmin()) return;
  if (event.target.id === 'authorization-department') { authorizationDepartment = event.target.value; render(); }
  if (event.target.id === 'authorization-source') refreshCopyTargets(event.target.form);
  if (event.target.matches('#authorization-form input[name="categoryIds"]')) {
    event.target.form.querySelector('.authorization-summary').textContent = new FormData(event.target.form).getAll('categoryIds').length + ' dari ' + db.documentCategories.length + ' kategori dipilih';
  }
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['authorization-form', 'copy-authorization-form'].includes(form.id)) return;
  event.preventDefault();
  if (!isAdmin()) return;
  const data = new FormData(form);
  const next = transaction();
  const error = form.querySelector('[role="alert"]');
  if (form.id === 'authorization-form') {
    const departmentId = data.get('authorizationDepartment');
    const categoryIds = [...new Set(data.getAll('categoryIds'))];
    if (!db.departments.some(department => department.id === departmentId) || categoryIds.some(id => !db.documentCategories.some(category => category.id === id))) { error.textContent = 'Periksa departemen dan kategori yang dipilih.'; return; }
    next.departmentAuthorizations[departmentId] = categoryIds;
  } else {
    try { DocumentAccess.copyAuthorizations(next, currentUser, data.get('sourceId'), data.getAll('targetIds')); }
    catch (failure) { error.textContent = failure.message; return; }
  }
  if (saveDatabase(next)) { if (form.id === 'copy-authorization-form') modal.close(); render(); toast(form.id === 'authorization-form' ? 'Otorisasi departemen berhasil disimpan.' : 'Otorisasi berhasil disalin.'); }
});

function syncDocumentCategories(form) {
  const select=form?.querySelector('#doc-category'),type=form?.querySelector('#doc-type')?.value;
  if(!select || !type)return;
  const selected=select.value, categories=assignableCategories().filter(category=>DocumentCategories.matches(db,category,type));
  select.innerHTML='<option value="">Pilih kategori dokumen</option>'+categories.map(category=>`<option value="${esc(category.id)}" ${category.id===selected?'selected':''}>${esc(category.code)}${category.name===category.code?'':' - '+esc(category.name)}</option>`).join('');
  refreshSearchSelect(select);
}
