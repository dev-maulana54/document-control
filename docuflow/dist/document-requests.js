'use strict';

const requestStatusLabels = { draft: 'Draft', in_review: 'Menunggu persetujuan', returned: 'Perlu perbaikan', approved: 'Siap diterbitkan', published: 'Sudah diterbitkan' };
const requestBadge = request => `<span class="request-status request-${esc(request.status)}">${esc(requestStatusLabels[request.status] || request.status)}</span>`;

function requestDeleteButton(request) {
  if (!isAdmin()) return '';
  const allowed = DocumentWorkflow.canDelete(db, currentUser, request);
  const title = allowed ? 'Hapus permintaan' : request.status === 'published' || request.publishedDocumentId ? 'Riwayat penerbitan tidak dapat dihapus' : 'Tarik permintaan ke Draft sebelum menghapus';
  return `<button type="button" class="table-action delete" data-request-action="delete" data-id="${esc(request.id)}" aria-label="Hapus permintaan ${esc(request.title)}" title="${title}" ${allowed ? '' : 'disabled'}>${icon('trash')} Hapus</button>`;
}

function showDeleteDocumentRequest(id) {
  const request = db.documentRequests.find(request => request.id === id);
  if (!DocumentWorkflow.canDelete(db, currentUser, request)) return;
  const snapshot = db, actorId = currentUser.id, original = JSON.stringify(request);
  showModal(`${modalHeading('Hapus Permintaan?')}<form id="request-delete-form"><p class="detail-body">Permintaan <strong>${esc(request.title)}</strong> (${esc(request.code)}, Rev. ${formatRevision(request.revision)}) beserta draft file dan riwayat permintaannya akan dihapus. Dokumen resmi tetap tersedia.</p><p id="request-delete-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-danger">${icon('trash')} Hapus Permintaan</button></div></form>`);
  const form = document.getElementById('request-delete-form');
  form.onsubmit = async event => {
    event.preventDefault();
    try {
      if (!form.isConnected || !modal.open || db !== snapshot || currentUser?.id !== actorId || JSON.stringify(db.documentRequests.find(request => request.id === id)) !== original) throw new Error('Data permintaan berubah. Tutup dialog dan buka kembali.');
      const next = transaction(), removed = DocumentWorkflow.remove(next, currentUser, id);
      addActivity(next, 'menghapus permintaan dokumen', removed, 'request');
      if (!saveDatabase(next)) { form.querySelector('#request-delete-error').textContent = 'Permintaan belum dihapus karena penyimpanan gagal. Coba kembali.'; return; }
      if (activeWorkbook?.id === id) { activeWorkbook.viewportObserver?.disconnect(); activeWorkbook = null; }
      modal.close(); render(); toast('Permintaan dokumen berhasil dihapus.');
      const keys = new Set([removed.workbookKey, removed.submittedWorkbookKey, ...(removed.submissions || []).map(submission => submission.workbookKey)].filter(Boolean));
      await Promise.all([...keys].map(releaseWorkbookFile));
    } catch (failure) { if (form.isConnected) form.querySelector('#request-delete-error').textContent = failure.message; }
  };
}

function documentRequestsPage(assigned = false) {
  const requests = db.documentRequests.filter(request => canRead(request) && (!assigned || request.approverIds?.includes(currentUser.id)));
  return `${heading(assigned ? 'Persetujuan Dokumen' : 'Create / Revise Dokumen', assigned ? 'Tinjau isi dokumen dan berikan keputusan Anda. Semua approver wajib setuju.' : 'Kelola permintaan dokumen baru dan revisi sebelum diterbitkan ke daftar resmi.', assigned ? '' : '<a href="#create" class="btn btn-primary">' + icon('plus') + ' Buat Permintaan</a>')}
    <div class="request-stages" aria-label="Alur permintaan"><span>1. Draft & edit</span><span>2. Persetujuan semua approver</span><span>3. Admin terbitkan</span></div>
    <section class="panel"><div class="table-scroll"><table><caption class="visually-hidden">Daftar permintaan dokumen</caption><thead><tr><th>DOKUMEN</th><th>PERMINTAAN</th><th>PEMBUAT</th><th>STATUS</th><th>PERSETUJUAN</th><th>AKSI</th></tr></thead><tbody>${requests.map(request => {
      const reviews = DocumentWorkflow.currentReviews(request), approved = reviews.filter(review => review.status === 'approved').length;
      return `<tr><td><strong>${esc(request.title)}</strong><div class="small muted">${esc(request.code)} · Rev. ${formatRevision(request.revision)}</div></td><td>${request.sourceId ? 'Revisi dokumen' : 'Dokumen baru'}</td><td>${esc(userName(request.requesterId))}</td><td>${requestBadge(request)}</td><td>${reviews.length ? approved + ' / ' + reviews.length + ' setuju' : 'Belum diajukan'}</td><td><div class="request-table-actions"><a class="table-action" href="#request-${esc(request.id)}">Buka Permintaan</a>${request.workbookKey ? `<button class="table-action" data-request-open="edit" data-id="${esc(request.id)}" ${canEditDocument(request) ? '' : 'disabled'} title="${canEditDocument(request) ? 'Edit isi draft' : ['draft','returned'].includes(request.status) ? 'Hanya pembuat permintaan yang dapat mengedit' : 'Edit terkunci setelah submit'}">${icon('edit')} Edit Excel</button><button class="table-action" data-request-open="view" data-id="${esc(request.id)}">${icon('eye')} Lihat Excel</button>` : ''}${assigned ? '' : requestDeleteButton(request)}</div></td></tr>`;
    }).join('') || '<tr><td colspan="6"><div class="empty"><h2>Belum ada permintaan</h2><p>' + (assigned ? 'Permintaan yang membutuhkan persetujuan Anda akan muncul di sini.' : 'Mulai dengan membuat permintaan dokumen baru atau revisi.') + '</p></div></td></tr>'}</tbody></table></div></section>`;
}

function documentRequestPage(id) {
  const request = db.documentRequests.find(request => request.id === id);
  if (!request || !canRead(request)) return `${heading('Permintaan tidak tersedia')}<a class="btn btn-secondary" href="#requests">Kembali ke Permintaan</a>`;
  const editable = canEditDocument(request), reviews = DocumentWorkflow.currentReviews(request);
  const mine = reviews.find(review => review.userId === currentUser.id && review.status === 'pending');
  const eligible = db.users.filter(user => user.id !== request.requesterId && DocumentAccess.canRead(db, user, request));
  return `${heading(esc(request.title), `${esc(request.code)} · Revisi ${formatRevision(request.revision)} · ${request.sourceId ? 'Permintaan revisi' : 'Permintaan dokumen baru'}`, '<a class="btn btn-secondary" href="#requests">Kembali</a>')}
    <section class="panel request-summary">${requestBadge(request)}<p>Dokumen resmi ${request.status === 'published' ? 'sudah diterbitkan oleh admin.' : 'belum berubah. Permintaan ini masih terpisah dari daftar Dokumen.'}</p><dl class="request-metadata"><div><dt>Pembuat</dt><dd>${esc(userName(request.requesterId))}</dd></div><div><dt>Kategori</dt><dd>${esc(categoryName(request.categoryId))}</dd></div><div><dt>Departemen</dt><dd>${esc(departmentName(request.departmentId))}</dd></div><div><dt>Versi isi</dt><dd>${request.contentVersion}</dd></div></dl><p>${esc(request.changeNotes || '')}</p><div class="request-actions">${editable ? `<button class="btn btn-secondary" data-action="edit-draft" data-id="${esc(id)}">Edit Informasi</button>` : ''}${request.workbookKey ? `<a class="btn ${editable ? 'btn-primary' : 'btn-secondary'}" href="#workbook-${esc(id)}">${editable ? 'Edit Excel' : 'Lihat Excel'}</a>` : request.attachment ? `<button class="btn btn-secondary" data-action="preview-pdf" data-id="${esc(id)}">Lihat PDF</button>` : '<span class="muted">Belum ada file. Lengkapi sebelum diajukan.</span>'}${request.status === 'published' ? `<button class="btn btn-primary" data-action="detail" data-id="${esc(request.publishedDocumentId)}">Lihat Dokumen Resmi</button>` : ''}</div></section>
    ${editable ? `<section class="panel request-review-panel"><h2>Ajukan Persetujuan</h2><p>Pilih minimal dua approver. Semua harus menyetujui versi yang sama, tanpa urutan. Isi dokumen dikunci setelah diajukan.</p><form id="request-submit-form" data-request-id="${esc(id)}"><fieldset class="approver-picker"><legend>Pilih approver</legend><label class="visually-hidden" for="approver-search">Cari approver</label><input id="approver-search" type="search" placeholder="Cari nama atau email approver…" autocomplete="off"><div class="approver-options">${eligible.map(user => `<label class="approver-option" data-search="${esc((user.name + ' ' + user.email).toLowerCase())}"><input type="checkbox" name="approverIds" value="${esc(user.id)}" ${request.approverIds?.includes(user.id) ? 'checked' : ''}><span><strong>${esc(user.name)}</strong><small>${esc(user.email)} · ${esc(departmentName(user.departmentId))}</small></span></label>`).join('') || '<p>Belum tersedia dua approver dengan akses kategori ini. Hubungi admin.</p>'}</div><p class="small muted" id="approver-count" role="status"></p></fieldset><div class="form-error" role="alert" id="request-error"></div><div class="form-actions"><button class="btn btn-primary" type="submit">Ajukan Persetujuan</button></div></form></section>` : ''}
    ${request.status === 'in_review' && mine ? `<section class="panel request-review-panel"><h2>Keputusan Anda</h2><p>Periksa isi dokumen sebelum menyetujui. Kembalikan jika masih memerlukan perbaikan.</p><label for="review-note">Catatan (wajib untuk pengembalian)</label><textarea id="review-note" maxlength="2000" rows="3" placeholder="Catatan peninjauan…"></textarea><div class="request-actions"><button class="btn btn-secondary" data-request-action="return" data-id="${esc(id)}">Kembalikan untuk Perbaikan</button><button class="btn btn-primary" data-request-action="approve" data-id="${esc(id)}">Setujui Dokumen</button></div></section>` : ''}
    ${request.status === 'approved' && isAdmin() ? `<section class="panel request-review-panel"><h2>Siap Diterbitkan</h2><p>Seluruh approver telah setuju. Terbitkan versi yang disetujui ke daftar Dokumen resmi${request.sourceId ? ' dan arsipkan revisi sebelumnya' : ''}.</p><button class="btn btn-primary" data-request-action="publish" data-id="${esc(id)}">Terbitkan Dokumen</button></section>` : ''}
    ${['in_review', 'approved'].includes(request.status) && request.requesterId === currentUser.id ? `<div class="request-withdraw"><button class="btn btn-secondary" data-request-action="withdraw" data-id="${esc(id)}">Tarik ke Draft</button><span class="small muted">Persetujuan sebelumnya dibatalkan jika ditarik dan diajukan ulang.</span></div>` : ''}
    <section class="panel request-review-panel"><h2>Persetujuan${request.reviewRound ? ' · Putaran ' + request.reviewRound : ''}</h2><div class="table-scroll"><table><thead><tr><th>APPROVER</th><th>KEPUTUSAN</th><th>CATATAN</th></tr></thead><tbody>${reviews.map(review => `<tr><td>${esc(userName(review.userId))}</td><td>${review.status === 'approved' ? 'Disetujui' : review.status === 'returned' ? 'Dikembalikan' : 'Menunggu'}</td><td>${esc(review.note || '—')}</td></tr>`).join('') || '<tr><td colspan="3">Belum diajukan untuk persetujuan.</td></tr>'}</tbody></table></div></section>
    ${request.submissions?.length ? `<section class="panel request-review-panel"><h2>Versi yang Ditinjau</h2><div class="table-scroll"><table><thead><tr><th>PUTARAN</th><th>VERSI ISI</th><th>FILE SAAT DIAJUKAN</th></tr></thead><tbody>${request.submissions.map(submission => `<tr><td>${submission.round}</td><td>${submission.contentVersion}</td><td><button class="table-action" data-request-action="download-round" data-id="${esc(id)}" data-round="${submission.round}">${submission.workbookKey ? 'Unduh Excel' : 'Lihat PDF'} - Putaran ${submission.round}</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}
    <section class="panel request-review-panel"><h2>Riwayat Permintaan</h2><ol class="request-history">${[...request.events].reverse().map(item => `<li><strong>${esc(item.action)}</strong><span>${esc(userName(item.userId))} · ${esc(dateLabel(item.at))}${item.round ? ' · Putaran ' + item.round : ''}</span>${item.note ? '<p>' + esc(item.note) + '</p>' : ''}</li>`).join('')}</ol></section>`;
}

document.addEventListener('input', event => {
  if (event.target.id !== 'approver-search') return;
  const query = event.target.value.toLowerCase().trim();
  document.querySelectorAll('.approver-option').forEach(option => { option.hidden = Boolean(query && !option.dataset.search.includes(query)); });
});
document.addEventListener('change', event => {
  if (event.target.name === 'approverIds') document.getElementById('approver-count').textContent = document.querySelectorAll('[name="approverIds"]:checked').length + ' approver dipilih';
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'request-submit-form') return;
  event.preventDefault();
  const form = event.target, next = transaction(), request = next.documentRequests.find(request => request.id === form.dataset.requestId);
  try {
    // Check that the referenced file is still readable before freezing its identity.
    const snapshot = db, actorId = currentUser.id;
    if (request.workbookKey) await WorkbookStore.get(request.workbookKey);
    if (db !== snapshot || currentUser?.id !== actorId || !form.isConnected) throw new Error('Data berubah. Buka kembali permintaan.');
    DocumentWorkflow.submit(next, currentUser, request, new FormData(form).getAll('approverIds'), today());
    if (saveDatabase(next)) { render(); toast('Permintaan dikirim ke seluruh approver.'); }
  } catch (failure) { form.querySelector('#request-error').textContent = failure.message; }
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-request-action]');
  if (!button || !currentUser) return;
  if (button.dataset.requestAction === 'delete') { showDeleteDocumentRequest(button.dataset.id); return; }
  if (button.dataset.requestAction === 'download-round') { downloadRequestRound(button.dataset.id, Number(button.dataset.round)); return; }
  const next = transaction(), request = next.documentRequests.find(request => request.id === button.dataset.id);
  try {
    if (button.dataset.requestAction === 'withdraw') { if (!confirm('Tarik permintaan ke draft dan batalkan persetujuan sebelumnya?')) return; DocumentWorkflow.withdraw(next, currentUser, request, today()); }
    else if (button.dataset.requestAction === 'publish') { const doc = DocumentWorkflow.publish(next, currentUser, request, uid(), today()); addActivity(next, 'menerbitkan dokumen setelah persetujuan lengkap', doc); }
    else DocumentWorkflow.decide(next, currentUser, request, button.dataset.requestAction === 'approve' ? 'approved' : 'returned', document.getElementById('review-note')?.value, today());
    if (saveDatabase(next)) { render(); toast(button.dataset.requestAction === 'publish' ? 'Dokumen resmi berhasil diterbitkan.' : 'Status permintaan diperbarui.'); }
  } catch (failure) { toast(failure.message, true); }
});

async function downloadRequestRound(id, round) {
  const request = db.documentRequests.find(request => request.id === id);
  if (!request || !canRead(request)) return;
  const submission = request.submissions?.find(submission => submission.round === round);
  if (!submission) return;
  if (submission.attachment) { openPdfPreview(submission.attachment, { title: request.title + ' ? Putaran ' + round, code: request.code }, id); return; }
  const actorId = currentUser.id, snapshot = db;
  try {
    const bytes = await WorkbookStore.get(submission.workbookKey);
    if (db !== snapshot || currentUser?.id !== actorId || !canRead(request)) return;
    downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), request.code.replace(/[^A-Za-z0-9_-]/g, '-') + '-putaran-' + round + '.xlsx');
  } catch (failure) { toast(failure.message, true); }
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-request-open]');
  if (!button || button.disabled || !currentUser) return;
  const request = db.documentRequests.find(request => request.id === button.dataset.id);
  if (!request?.workbookKey || !canRead(request) || (button.dataset.requestOpen === 'edit' && !canEditDocument(request))) return;
  navigate('workbook-' + request.id + (button.dataset.requestOpen === 'view' ? '?view' : ''));
});
