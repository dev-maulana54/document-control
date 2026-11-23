'use strict';

const requestStatusLabels = { draft: 'Draft', admin_review: 'Pemeriksaan admin', in_review: 'Menunggu persetujuan', returned: 'Perlu perbaikan', approved: 'Siap diterbitkan', published: 'Sudah diterbitkan' };
let requestListTab = 'incoming';
let approvalListSearch = '', approvalListStatus = '';
let approvalListPage = 1, approvalListPageSize = 10;

function approvalPageWindow(count, requestedPage, size) {
  const pages=Math.max(1,Math.ceil(count/size)),page=Math.max(1,Math.min(pages,requestedPage));
  return {page,pages,start:(page-1)*size,end:Math.min(count,page*size)};
}

function approvalPaginationControls() {
  return `<div class="approval-pagination"><div class="approval-page-size"><label for="approval-page-size-search">Dokumen per halaman</label><select id="approval-page-size" aria-label="Dokumen per halaman">${[10,25,50].map(size=>`<option value="${size}" ${size===approvalListPageSize?'selected':''}>${size}</option>`).join('')}</select></div><nav id="approval-page-controls" aria-label="Halaman persetujuan"></nav></div>`;
}
const requestBadge = request => `<span class="request-status request-${esc(request.status)}">${esc(requestStatusLabels[request.status] || request.status)}</span>`;
const requestListBadge = (request, assigned) => !assigned && ['in_review', 'approved', 'published'].includes(request.status) ? '<span class="request-status request-done">Selesai</span>' : requestBadge(request);
const requestNumberLabel = request => request.adminReviewRequired && !request.adminNumberSet && !request.sourceId && ['draft','returned','admin_review'].includes(request.status) ? 'Belum ditetapkan' : request.code;

function approvalRequestMatches(request, search, status) {
  const query=String(search||'').trim().toLocaleLowerCase('id');
  const text=[request.title,request.code,userName(request.requesterId),...DocumentWorkflow.currentReviews(request).map(review=>userName(review.userId))].join(' ').toLocaleLowerCase('id');
  return (!status||request.status===status)&&(!query||text.includes(query));
}

function requestApprovalList(request) {
  const reviews=DocumentWorkflow.currentReviews(request);
  if(!reviews.length)return '<span class="muted">Belum diajukan</span>';
  const approved=reviews.filter(review=>review.status==='approved').length;
  const active=['in_review','approved','published'].includes(request.status);
  const cancelled=['draft','admin_review'].includes(request.status);
  const order={pending:0,returned:1,approved:2};
  return `<div class="approval-list"><div class="approval-list-summary">${cancelled?'Persetujuan sebelumnya dibatalkan':approved+' dari '+reviews.length+' setuju'}</div>${active?`<div class="approval-progress" role="progressbar" aria-label="Progres persetujuan" aria-valuenow="${approved}" aria-valuemin="0" aria-valuemax="${reviews.length}"><span style="width:${approved/reviews.length*100}%"></span></div>`:`<p class="approval-round-note">${cancelled?'Menunggu pengajuan ulang.':'Putaran ini dikembalikan untuk perbaikan.'}</p>`}<ul aria-label="Status setiap approver">${[...reviews].sort((a,b)=>(order[a.status]??3)-(order[b.status]??3)).map(review=>{
    const status=cancelled?'cancelled':review.status;
    const label=cancelled?'Dibatalkan':status==='approved'?'Sudah setuju':status==='returned'?'Dikembalikan':'Belum menyetujui';
    return `<li><span class="approval-person">${esc(userName(review.userId))}</span><span class="approval-person-status approval-person-${esc(status)}">${label}</span></li>`;
  }).join('')}</ul></div>`;
}

function approvalListTools() {
  return `<div class="approval-list-tools"><div class="approval-search-field"><label for="approval-search">Cari persetujuan</label><div>${icon('search')}<input id="approval-search" type="search" maxlength="200" placeholder="Nama / nomor dokumen, pembuat, atau approver" value="${esc(approvalListSearch)}" aria-controls="approval-table-body"></div></div><div class="approval-status-field"><label for="approval-status-filter-search">Status dokumen</label><select id="approval-status-filter" aria-label="Status dokumen" aria-controls="approval-table-body">${[['','Semua status'],...Object.entries(requestStatusLabels)].map(([value,label])=>`<option value="${value}" ${approvalListStatus===value?'selected':''}>${label}</option>`).join('')}</select></div><button type="button" class="btn-link" data-approval-reset>Reset pencarian</button></div><p id="approval-result-count" class="approval-result-count" role="status"></p>`;
}

function updateApprovalListResults() {
  if(currentRoute()!=='approvals')return;
  let total=0;const matches=[];
  const requestsById=new Map(db.documentRequests.map(request=>[request.id,request]));
  for(const row of document.querySelectorAll('#approval-table-body [data-approval-request]')){
    const request=requestsById.get(row.dataset.approvalRequest);
    const visible=Boolean(request&&canRead(request)&&request.approverIds?.includes(currentUser.id));
    row.hidden=true;if(visible)total++;
    if(visible&&approvalRequestMatches(request,approvalListSearch,approvalListStatus))matches.push(row);
  }
  const count=matches.length,bounds=approvalPageWindow(count,approvalListPage,approvalListPageSize);
  approvalListPage=bounds.page;
  matches.slice(bounds.start,bounds.end).forEach(row=>{row.hidden=false;});
  const empty=document.getElementById('approval-no-results');if(empty)empty.hidden=count>0||total===0;
  const countNode=document.getElementById('approval-result-count');
  if(countNode)countNode.textContent=count?`Menampilkan ${bounds.start+1}-${bounds.end} dari ${count} dokumen${count!==total?` (${total} total)`:''}`:`Menampilkan 0 dari ${total} dokumen`;
  const controls=document.getElementById('approval-page-controls');
  if(controls){
    const numbers=[...new Set([1,bounds.page-1,bounds.page,bounds.page+1,bounds.pages])].filter(n=>n>=1&&n<=bounds.pages).sort((a,b)=>a-b);
    const button=(page,label,content,disabled=false)=>`<button type="button" data-approval-page="${page}" aria-label="${label}" ${disabled?'disabled':''} ${page===bounds.page&&/^Halaman \d/.test(label)?'aria-current="page"':''}>${content}</button>`;
    controls.innerHTML=button(bounds.page-1,'Halaman sebelumnya','Sebelumnya',bounds.page===1)+numbers.map((n,i)=>(i&&n>numbers[i-1]+1?'<span aria-hidden="true">…</span>':'')+button(n,'Halaman '+n,n)).join('')+button(bounds.page+1,'Halaman berikutnya','Berikutnya',bounds.page===bounds.pages);
  }
}

document.addEventListener('input',event=>{
  if(event.target.id==='approval-search'){approvalListSearch=event.target.value;approvalListPage=1;updateApprovalListResults();}
});
document.addEventListener('change',event=>{
  if(event.target.id==='approval-status-filter'){approvalListStatus=event.target.value;approvalListPage=1;updateApprovalListResults();}
  if(event.target.id==='approval-page-size'){
    const size=Number(event.target.value);if(![10,25,50].includes(size))return;
    approvalListPageSize=size;approvalListPage=1;updateApprovalListResults();
  }
});
document.addEventListener('click',event=>{
  const pageButton=event.target.closest('[data-approval-page]');
  if(pageButton&&currentRoute()==='approvals'){
    const nextPage=Number(pageButton.dataset.approvalPage);if(!Number.isInteger(nextPage)||pageButton.disabled)return;
    const label=pageButton.getAttribute('aria-label');approvalListPage=nextPage;updateApprovalListResults();
    const controls=document.getElementById('approval-page-controls');
    [...controls.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===label&&!button.disabled)?.focus({preventScroll:true});
    if(!controls.contains(document.activeElement))controls.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
    return;
  }
  if(!event.target.closest('[data-approval-reset]'))return;
  approvalListSearch='';approvalListStatus='';approvalListPage=1;
  const search=document.getElementById('approval-search'),status=document.getElementById('approval-status-filter');
  if(search)search.value='';if(status){status.value='';refreshSearchSelect(status);}updateApprovalListResults();search?.focus();
});

function requestDeleteButton(request) {
  if (!isAdmin()) return '';
  if (!DocumentWorkflow.canDelete(db, currentUser, request)) return '';
  return `<button type="button" class="table-action delete" data-request-action="delete" data-id="${esc(request.id)}" aria-label="Hapus permintaan ${esc(request.title)}" title="Hapus permintaan">${icon('trash')} Hapus</button>`;
}

function showDeleteDocumentRequest(id) {
  const request = db.documentRequests.find(request => request.id === id);
  if (!DocumentWorkflow.canDelete(db, currentUser, request)) return;
  const snapshot = db, actorId = currentUser.id, original = JSON.stringify(request);
  showModal(`${modalHeading('Hapus Permintaan?')}<form id="request-delete-form"><p class="detail-body">Permintaan <strong>${esc(request.title)}</strong> (${esc(request.code)}, Rev. ${formatRevision(request.revision)}) akan dihapus dari daftar. ${['admin_review','in_review','approved'].includes(request.status) ? 'Proses pemeriksaan atau persetujuan yang sedang berjalan akan dihentikan. ' : ''}Dokumen resmi tetap tersedia${request.status === 'published' || request.publishedDocumentId ? ' beserta riwayat penerbitannya' : ''}.</p><p id="request-delete-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-danger">${icon('trash')} Hapus Permintaan</button></div></form>`);
  const form = document.getElementById('request-delete-form');
  form.onsubmit = async event => {
    event.preventDefault();
    try {
      if (!form.isConnected || !modal.open || db !== snapshot || currentUser?.id !== actorId || JSON.stringify(db.documentRequests.find(request => request.id === id)) !== original) throw new Error('Data permintaan berubah. Tutup dialog dan buka kembali.');
      const next = transaction(), removed = DocumentWorkflow.remove(next, currentUser, id);
      addActivity(next, 'menghapus permintaan dokumen', removed, 'request');
      if (!saveDatabase(next)) { form.querySelector('#request-delete-error').textContent = 'Permintaan belum dihapus karena penyimpanan gagal. Coba kembali.'; return; }
      if (activeWorkbook?.id === id) { activeWorkbook.viewportObserver?.disconnect(); activeWorkbook = null; }
      modal.close(); if (currentRoute() === 'request-' + id) navigate('requests'); else render(); toast('Permintaan dokumen berhasil dihapus.');
      const keys = new Set([removed.workbookKey, removed.submittedWorkbookKey, removed.attachment?.storageKey, removed.signedAttachment?.storageKey, ...(removed.submissions || []).flatMap(submission => [submission.workbookKey,submission.attachment?.storageKey])].filter(Boolean));
      await Promise.all([...keys].map(releaseWorkbookFile));
    } catch (failure) { if (form.isConnected) form.querySelector('#request-delete-error').textContent = failure.message; }
  };
}

function documentRequestsPage(assigned = false) {
  const requests = db.documentRequests.filter(request => canRead(request) && (assigned ? request.approverIds?.includes(currentUser.id) : !isAdmin() || (requestListTab==='incoming' ? !['draft','returned'].includes(request.status) : request.requesterId===currentUser.id)));
  return `${heading(assigned ? 'Persetujuan Dokumen' : 'Create / Revise Dokumen', assigned ? 'Tinjau isi dokumen dan berikan keputusan Anda. Semua approver wajib setuju.' : 'Kelola permintaan dokumen baru dan revisi sebelum diterbitkan ke daftar resmi.', assigned ? '' : '<a href="#create" class="btn btn-primary">' + icon('plus') + ' Buat Permintaan</a>')}
    <div class="request-stages" aria-label="Alur permintaan"><span>1. Edit dan submit</span><span>2. Pemeriksaan admin</span><span>3. ${assigned ? 'Persetujuan dan penerbitan' : 'Selesai'}</span></div>
    ${!assigned && isAdmin() ? `<div class="mode-switch" aria-label="Daftar dokumen"><button type="button" data-request-tab="incoming" class="${requestListTab==='incoming'?'active':''}" aria-pressed="${requestListTab==='incoming'}">Permintaan Masuk</button><button type="button" data-request-tab="mine" class="${requestListTab==='mine'?'active':''}" aria-pressed="${requestListTab==='mine'}">Dokumen Saya</button></div>` : ''}
    <section class="panel ${assigned?'approval-table-panel':''}">${assigned?approvalListTools():''}<div class="table-scroll"><table ${assigned?'class="approval-table"':''}><caption class="visually-hidden">${assigned?'Daftar persetujuan dokumen dan status setiap approver':'Daftar permintaan dokumen'}</caption><thead><tr><th>DOKUMEN</th><th>PERMINTAAN</th><th>PEMBUAT</th><th>STATUS</th>${assigned ? '<th>PERSETUJUAN</th>' : ''}<th>AKSI</th></tr></thead><tbody ${assigned?'id="approval-table-body"':''}>${requests.map(request => {
      const reviews = DocumentWorkflow.currentReviews(request);
      return `<tr ${assigned?`data-approval-request="${esc(request.id)}" ${approvalRequestMatches(request,approvalListSearch,approvalListStatus)?'':'hidden'}`:''}><td><a href="#request-${esc(request.id)}"><strong>${esc(request.title)}</strong></a><div class="small muted">${esc(requestNumberLabel(request))} · Rev. ${formatRevision(request.revision)}</div></td><td>${request.sourceId ? 'Revisi dokumen' : 'Dokumen baru'}</td><td>${esc(userName(request.requesterId))}</td><td>${requestListBadge(request, assigned)}</td>${assigned ? `<td>${requestApprovalList(request)}</td>` : ''}<td><div class="request-table-actions">${assigned && request.status === 'in_review' && request.requesterId !== currentUser.id && reviews.some(review => review.userId === currentUser.id && review.status === 'pending') ? (isPdfAttachment(request.attachment) ? `<button type="button" class="btn btn-primary" data-request-action="approval-pdf" data-id="${esc(request.id)}">${icon('eye')} Approval</button>` : `<a class="btn btn-secondary" href="#request-${esc(request.id)}">Approval</a>`) : !assigned && request.workbookKey ? `<button class="table-action" data-request-open="${canEditDocument(request)?'edit':'view'}" data-id="${esc(request.id)}">${icon(canEditDocument(request)?'edit':'eye')} ${canEditDocument(request)?'Edit Excel':'Lihat Excel'}</button>` : assigned?`<a class="table-action" href="#request-${esc(request.id)}">Lihat detail</a>`:''}${!assigned ? requestDeleteButton(request) : ''}</div></td></tr>`;
    }).join('') || '<tr><td colspan="' + (assigned ? 6 : 5) + '"><div class="empty"><h2>Belum ada permintaan</h2><p>' + (assigned ? 'Permintaan yang membutuhkan persetujuan Anda akan muncul di sini.' : 'Mulai dengan membuat permintaan dokumen baru atau revisi.') + '</p></div></td></tr>'}${assigned?'<tr id="approval-no-results" hidden><td colspan="6"><div class="empty"><h2>Tidak ada hasil yang cocok</h2><p>Coba kata kunci lain atau reset pencarian dan status.</p></div></td></tr>':''}</tbody></table></div>${assigned?approvalPaginationControls():''}</section>`;
}

function approverPicker(request) {
  const users=[...db.users].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id'));
  const available=users.filter(user=>['user','admin'].includes(user.role) && db.departments.some(department=>department.id===user.departmentId));
  const selected=available.filter(user=>request.approverIds?.includes(user.id));
  return `<fieldset class="approver-picker"><legend>Pilih approver</legend><p class="approver-help">Approver yang dipilih dapat melihat permintaan ini.</p><label class="approver-select-label" for="approver-select">Tambah approver</label><select id="approver-select" data-native-select aria-describedby="approver-count"><option value="">Pilih approver…</option>${users.map(user=>{
    const department=departmentName(user.departmentId),reason=!available.includes(user)?'Data pengguna tidak lengkap':'';
    return `<option value="${esc(user.id)}" data-approver-name="${esc(user.name||'Pengguna')}" data-unavailable="${Boolean(reason)}" ${reason||selected.includes(user)?'disabled':''}>${esc(user.name||'Pengguna')} · ${esc(department)}${reason?' — '+esc(reason):''}</option>`;
  }).join('')}</select><p class="approver-empty" id="approver-empty" ${selected.length?'hidden':''}>Belum ada approver dipilih.</p><ul id="selected-approvers" class="selected-approvers" aria-label="Approver dipilih">${selected.map(user=>`<li data-approver-id="${esc(user.id)}"><span>${esc(user.name||'Pengguna')}</span><input type="hidden" name="approverIds" value="${esc(user.id)}"><button type="button" data-remove-approver aria-label="Hapus approver ${esc(user.name||'Pengguna')}">×</button></li>`).join('')}</ul><p class="approver-count" id="approver-count" role="status">${selected.length} dipilih</p>${!available.length?'<p class="approver-notice">Belum ada pengguna yang dapat dipilih.</p>':''}</fieldset>`;
}

function documentRequestPage(id) {
  const request = db.documentRequests.find(request => request.id === id);
  if (!request || !canRead(request)) return `${heading('Permintaan tidak tersedia')}<a class="btn btn-secondary" href="#requests">Kembali ke Permintaan</a>`;
  const editable = canEditDocument(request), reviews = DocumentWorkflow.currentReviews(request);
  const mine = reviews.find(review => review.userId === currentUser.id && review.status === 'pending');
  const canSendApproval=editable && (!request.adminReviewRequired || isAdmin() && request.status==='admin_review');
  const visibleSubmissions=(request.submissions||[]).filter(submission=>submission.round===request.reviewRound||DocumentAccess.canRead(db,currentUser,request));
  return `${heading(esc(request.title), `Revisi ${formatRevision(request.revision)} · ${request.sourceId ? 'Permintaan revisi' : 'Permintaan dokumen baru'}`, '<a class="btn btn-secondary" href="#requests">Kembali</a>')}
    <section class="panel request-summary"><div class="request-summary-head"><div class="request-summary-state"><span class="request-summary-label">Status dokumen</span>${requestBadge(request)}<p>${request.status === 'published' ? 'Dokumen sudah diterbitkan.' : 'Dokumen sedang diproses dan belum diterbitkan.'}</p></div><div class="request-summary-number"><span class="request-summary-label">Nomor Dokumen</span><strong>${esc(requestNumberLabel(request))}</strong><small>Revisi ${formatRevision(request.revision)}</small></div></div><dl class="request-metadata"><div><dt>Pembuat</dt><dd>${esc(userName(request.requesterId))}</dd></div><div><dt>Kategori</dt><dd>${esc(db.documentCategories.find(category=>category.id===request.categoryId)?.name||categoryName(request.categoryId))}</dd></div><div><dt>Departemen</dt><dd>${esc(departmentName(request.departmentId))}</dd></div></dl>${request.changeNotes ? `<p class="request-summary-notes">${esc(request.changeNotes)}</p>` : ''}<div class="request-actions">${editable ? `<button class="btn btn-secondary" data-action="edit-draft" data-id="${esc(id)}">Edit Informasi</button>` : ''}${request.workbookKey ? `<a class="btn ${editable ? 'btn-primary' : 'btn-secondary'}" href="#workbook-${esc(id)}">${editable ? 'Edit Excel' : 'Lihat Excel'}</a>` : request.attachment ? `<button class="btn btn-secondary" data-action="preview-pdf" data-id="${esc(id)}">Lihat PDF</button>` : '<span class="muted">Belum ada file. Lengkapi sebelum diajukan.</span>'}${request.workbookKey ? `<button type="button" class="btn btn-secondary" data-request-action="download-excel" data-id="${esc(id)}">${icon('download')} Unduh Excel</button>` : ''}${request.workbookKey && request.attachment ? `<button class="btn btn-secondary" data-action="preview-pdf" data-id="${esc(id)}">Lihat PDF Final</button>` : ''}${request.status === 'published' && canRead(documentRecord(request.publishedDocumentId)) ? `<button class="btn btn-primary" data-action="detail" data-id="${esc(request.publishedDocumentId)}">Lihat Dokumen Resmi</button>` : ''}${requestDeleteButton(request)}</div></section>
    ${canSendApproval ? `<section class="panel request-review-panel"><div class="approval-heading"><h2>Kirim untuk Persetujuan</h2><p>Pastikan dokumen sudah selesai diperiksa, lalu pilih approver untuk meninjau PDF final.</p></div><form id="request-submit-form" data-request-id="${esc(id)}">${request.adminReviewRequired ? `<div class="approval-number-field"><label for="approval-number">Nomor Dokumen <span>*</span></label><input id="approval-number" name="documentNumber" maxlength="100" value="${esc(request.adminNumberSet || request.sourceId ? request.code : '')}" placeholder="Masukkan nomor dokumen" required></div>` : ''}${request.adminReviewRequired && request.workbookKey ? `<div class="approval-file-card"><label for="approval-pdf">PDF final <span>*</span></label><p class="small muted">Unduh Excel yang sudah diperiksa, simpan sebagai PDF, lalu unggah hasilnya (maksimal 5 MB).</p><input id="approval-pdf" name="approvalPdf" type="file" accept=".pdf,application/pdf" required></div>` : ''}${approverPicker(request)}<div class="form-error" role="alert" id="request-error"></div><div class="form-actions"><button class="btn btn-primary" type="submit">${request.adminReviewRequired ? 'Kirim untuk Persetujuan' : 'Ajukan Persetujuan'}</button></div></form></section>` : ''}
    ${request.adminReviewRequired && !request.workbookKey && editable && request.requesterId===currentUser.id && ['draft','returned'].includes(request.status) ? `<section class="panel request-review-panel"><h2>Serahkan ke Admin</h2><button class="btn btn-primary" data-request-action="submit-admin" data-id="${esc(id)}">Submit ke Admin</button></section>` : ''}
    ${request.status === 'in_review' && mine && request.requesterId !== currentUser.id ? `<section class="panel request-review-panel"><h2>Keputusan Anda</h2><p>Periksa isi dokumen sebelum menyetujui. Kembalikan jika masih memerlukan perbaikan.</p><label for="review-note">Catatan (wajib untuk pengembalian)</label><textarea id="review-note" maxlength="2000" rows="3" placeholder="Catatan peninjauan…"></textarea><div class="request-actions"><button class="btn btn-secondary" data-request-action="return" data-id="${esc(id)}">Kembalikan untuk Perbaikan</button>${isPdfAttachment(request.attachment) ? `<button class="btn btn-primary" data-request-action="approval-pdf" data-id="${esc(id)}">Tinjau dan Setujui PDF</button>` : `<button class="btn btn-primary" data-request-action="approve" data-id="${esc(id)}">Setujui Dokumen</button>`}</div></section>` : ''}
    ${request.status === 'approved' && isAdmin() ? `<section class="panel request-review-panel"><h2>Siap Diterbitkan</h2><p>Seluruh approver telah setuju. Terbitkan versi yang disetujui ke daftar Dokumen resmi${request.sourceId ? ' dan arsipkan revisi sebelumnya' : ''}.</p><button class="btn btn-primary" data-request-action="publish" data-id="${esc(id)}">Terbitkan Dokumen</button></section>` : ''}
    ${['admin_review', 'in_review', 'approved'].includes(request.status) && request.requesterId === currentUser.id ? `<div class="request-withdraw"><button class="btn btn-secondary" data-request-action="withdraw" data-id="${esc(id)}">Tarik ke Draft</button><span class="small muted">Persetujuan sebelumnya dibatalkan jika ditarik dan diajukan ulang.</span></div>` : ''}
    ${visibleSubmissions.length ? `<section class="panel request-review-panel"><h2>Dokumen yang Ditinjau</h2><div class="table-scroll"><table><thead><tr><th>PUTARAN</th><th>FILE SAAT DIAJUKAN</th></tr></thead><tbody>${visibleSubmissions.map(submission => `<tr><td>${submission.round}</td><td><button class="table-action" data-request-action="download-round" data-id="${esc(id)}" data-round="${submission.round}">${submission.attachment ? 'Lihat PDF' : 'Unduh Excel'} - Putaran ${submission.round}</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}
`;
}

function syncSelectedApprovers(form){
  const count=form.querySelectorAll('#selected-approvers input[name="approverIds"]').length;
  form.querySelector('#approver-count').textContent=count+' dipilih';form.querySelector('#approver-empty').hidden=count>0;
}
document.addEventListener('change', event => {
  const select=event.target;if(select.id!=='approver-select'||!select.value)return;
  const option=select.selectedOptions[0],form=select.form,list=form.querySelector('#selected-approvers');
  if(!option||option.disabled||[...list.querySelectorAll('input[name="approverIds"]')].some(input=>input.value===option.value)){select.value='';return;}
  const item=document.createElement('li'),name=document.createElement('span'),input=document.createElement('input'),remove=document.createElement('button');
  item.dataset.approverId=option.value;name.textContent=option.dataset.approverName;input.type='hidden';input.name='approverIds';input.value=option.value;remove.type='button';remove.dataset.removeApprover='';remove.setAttribute('aria-label','Hapus approver '+option.dataset.approverName);remove.textContent='×';
  item.append(name,input,remove);list.appendChild(item);option.disabled=true;select.value='';syncSelectedApprovers(form);
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-remove-approver]');if(!button)return;
  const item=button.closest('[data-approver-id]'),form=button.closest('form'),select=form?.querySelector('#approver-select');if(!item||!select)return;
  const option=[...select.options].find(entry=>entry.value===item.dataset.approverId);if(option&&option.dataset.unavailable==='false')option.disabled=false;
  item.remove();syncSelectedApprovers(form);select.focus();
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'request-submit-form') return;
  event.preventDefault();
  const form = event.target, next = transaction(), request = next.documentRequests.find(request => request.id === form.dataset.requestId),data=new FormData(form),approverIds=data.getAll('approverIds'),approvalFile=form.elements.approvalPdf?.files[0];let pdfKey;
  if(form.dataset.saving==='true')return;setDocumentBusy(form,true);
  try {
    // Check that the referenced file is still readable before freezing its identity.
    const snapshot = db, actorId = currentUser.id;
    if(request?.adminReviewRequired)DocumentWorkflow.assignNumber(next,currentUser,request,data.get('documentNumber'),today());
    if (request.workbookKey) await WorkbookStore.get(request.workbookKey);
    if (request.adminReviewRequired && request.workbookKey) {
      const file=approvalFile;
      if(!file || !/\.pdf$/i.test(file.name) || !file.size || file.size>5*1024*1024)throw new Error('Pilih PDF final dengan ukuran maksimal 5 MB.');
      const bytes=await file.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('Isi file bukan PDF yang valid.');
      if(db!==snapshot||currentUser?.id!==actorId||!form.isConnected)throw new Error('Data berubah. Buka kembali permintaan.');
      pdfKey='approval-pdf-'+uid();await WorkbookStore.put(pdfKey,bytes);
      request.attachment={name:file.name,type:'application/pdf',size:file.size,storageKey:pdfKey};
    }
    if (db !== snapshot || currentUser?.id !== actorId || !form.isConnected) throw new Error('Data berubah. Buka kembali permintaan.');
    DocumentWorkflow.submit(next, currentUser, request, approverIds, today());
    if (!saveDatabase(next))throw new Error('Permintaan belum terkirim karena penyimpanan gagal.');
    pdfKey=null;navigate('requests');toast('Permintaan dikirim ke seluruh approver.');
  } catch (failure) { if(pdfKey)await WorkbookStore.remove(pdfKey).catch(()=>{});if(form.isConnected)form.querySelector('#request-error').textContent = failure.message; }
  finally {if(form.isConnected)setDocumentBusy(form,false);}
});
document.addEventListener('click', event => {
  const tab=event.target.closest('[data-request-tab]');if(tab && isAdmin()){requestListTab=tab.dataset.requestTab==='mine'?'mine':'incoming';render();return;}
  const button = event.target.closest('[data-request-action]');
  if (!button || !currentUser) return;
  if (button.dataset.requestAction === 'approval-pdf') { openApprovalPdf(button.dataset.id); return; }
  if (button.dataset.requestAction === 'delete') { showDeleteDocumentRequest(button.dataset.id); return; }
  if (button.dataset.requestAction === 'download-excel') { downloadWorkbook(button.dataset.id); return; }
  if (button.dataset.requestAction === 'download-round') { downloadRequestRound(button.dataset.id, Number(button.dataset.round)); return; }
  const next = transaction(), request = next.documentRequests.find(request => request.id === button.dataset.id);
  try {
    if (button.dataset.requestAction === 'approve' && isPdfAttachment(request?.attachment)) throw new Error('Setujui dokumen melalui PDF dan bubuhkan tanda tangan.');
    if (button.dataset.requestAction === 'submit-admin') DocumentWorkflow.submitToAdmin(next,currentUser,request,today());
    else if (button.dataset.requestAction === 'return-admin') DocumentWorkflow.returnToAuthor(next,currentUser,request,document.getElementById('admin-review-note')?.value,today());
    else if (button.dataset.requestAction === 'withdraw') { if (!confirm('Tarik permintaan ke draft dan batalkan persetujuan sebelumnya?')) return; DocumentWorkflow.withdraw(next, currentUser, request, today()); }
    else if (button.dataset.requestAction === 'publish') { const doc = DocumentWorkflow.publish(next, currentUser, request, uid(), today()); addActivity(next, 'menerbitkan dokumen setelah persetujuan lengkap', doc); }
    else DocumentWorkflow.decide(next, currentUser, request, button.dataset.requestAction === 'approve' ? 'approved' : 'returned', document.getElementById('review-note')?.value, today());
    if (saveDatabase(next)) { if(button.dataset.requestAction==='return' && !canRead(db.documentRequests.find(item=>item.id===button.dataset.id)))navigate('approvals');else render();toast(button.dataset.requestAction === 'publish' ? 'Dokumen resmi berhasil diterbitkan.' : 'Status permintaan diperbarui.'); }
  } catch (failure) { toast(failure.message, true); }
});

async function downloadRequestRound(id, round) {
  const request = db.documentRequests.find(request => request.id === id);
  if (!request || !canRead(request)) return;
  const submission = request.submissions?.find(submission => submission.round === round);
  if (!submission) return;
  if(round!==request.reviewRound && !DocumentAccess.canRead(db,currentUser,request))return toast('Akses hanya tersedia untuk putaran yang ditugaskan.',true);
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

function openApprovalPdf(id) {
  const request = db.documentRequests.find(item => item.id === id), actorId = currentUser?.id;
  const pending = item => item && item.status === 'in_review' && DocumentWorkflow.canRead(db, currentUser, item) && DocumentWorkflow.currentReviews(item).some(review => review.userId === actorId && review.status === 'pending');
  if (!pending(request) || !isPdfAttachment(request.attachment)) return toast('Persetujuan PDF tidak tersedia.', true);
  const round=request.reviewRound, submitted=request.submittedAttachment, viewedAttachment=JSON.stringify(request.signedAttachment||request.attachment), viewedSignature=currentUser.signatureKey||null, channel=uid(), url=new URL('approval-viewer.html',PDF_VIEWER_URL);
  url.hash=new URLSearchParams({channel}).toString();
  const tab=window.open(url.href,'_blank');
  if(!tab)return toast('Izinkan pop-up browser untuk membuka PDF.',true);
  const targetOrigin=location.protocol==='file:'?'*':location.origin;
  let busy=false;
  const reply=(type,data={})=>tab.postMessage({type,channel,...data},targetOrigin);
  const listener=async event=>{
    if(event.source!==tab || event.data?.channel!==channel || (location.protocol!=='file:' && event.origin!==location.origin))return;
    const current=db.documentRequests.find(item=>item.id===id);
    if(currentUser?.id!==actorId || !pending(current) || current.reviewRound!==round || current.submittedAttachment!==submitted || JSON.stringify(current.signedAttachment||current.attachment)!==viewedAttachment){reply('docuflow:approval-result',{error:'Dokumen atau persetujuan sudah berubah. Buka kembali dari daftar.'});return;}
    if(event.data.type==='docuflow:approval-ready'){
      try {
        const attachment=current.signedAttachment || current.attachment;
        const pdf=attachment.storageKey?await WorkbookStore.get(attachment.storageKey):Uint8Array.from(atob(attachment.data.split(',')[1]),c=>c.charCodeAt(0)).buffer;
        const signatureKey=currentUser.signatureKey, signature=signatureKey?await WorkbookStore.get(signatureKey):null;
        if(currentUser?.id!==actorId || !pending(db.documentRequests.find(item=>item.id===id)))throw Error('Akses persetujuan berubah.');
        reply('docuflow:approval-data',{pdf,signature,title:current.title,code:current.code});
      } catch(error) {reply('docuflow:approval-result',{error:error.message});}
      return;
    }
    if(event.data.type!=='docuflow:approval-confirm'||busy)return;
    busy=true;let key;
    try {
      const p=event.data.position, signatureKey=currentUser.signatureKey, snapshot=db;
      if(!signatureKey)throw Error('Unggah tanda tangan melalui profil Anda terlebih dahulu.');
      if(signatureKey!==viewedSignature)throw Error('Tanda tangan berubah. Buka kembali persetujuan.');
      if(!p||!Number.isInteger(p.page)||p.page<1||![p.x,p.y].every(Number.isFinite))throw Error('Posisi tanda tangan tidak valid.');
      const attachment=current.signedAttachment||current.attachment;
      const bytes=attachment.storageKey?await WorkbookStore.get(attachment.storageKey):Uint8Array.from(atob(attachment.data.split(',')[1]),c=>c.charCodeAt(0)).buffer;
      const signature=await WorkbookStore.get(signatureKey), pdf=await PDFLib.PDFDocument.load(bytes), pages=pdf.getPages(), page=pages[p.page-1];
      if(!page||p.page>100)throw Error('Halaman PDF tidak tersedia.');
      const box=page.getCropBox(),angle=((page.getRotation().angle%360)+360)%360;
      if(![0,90,180,270].includes(angle)||p.x<box.x||p.y<box.y||p.x>box.x+box.width||p.y>box.y+box.height)throw Error('Posisi tanda tangan berada di luar halaman.');
      const image=await pdf.embedPng(signature),geometry=PdfSignatureGeometry.place(image.width,image.height,p,box,angle),w=geometry.width,h=geometry.height;
      const radians=angle*Math.PI/180,c=Math.round(Math.cos(radians)),s=Math.round(Math.sin(radians));
      page.drawImage(image,{x:geometry.x-c*w/2+s*h/2,y:geometry.y-s*w/2-c*h/2,width:w,height:h,rotate:PDFLib.degrees(angle)});
      const output=await pdf.save();if(output.length>5*1024*1024)throw Error('PDF bertanda tangan melebihi batas 5 MB.');
      if(db!==snapshot||currentUser?.id!==actorId||currentUser.signatureKey!==signatureKey||!pending(db.documentRequests.find(item=>item.id===id)))throw Error('Data berubah. Buka kembali persetujuan.');
      key='approval-pdf-'+uid();await WorkbookStore.put(key,output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength));
      if(db!==snapshot||currentUser?.id!==actorId||currentUser.signatureKey!==signatureKey||!pending(db.documentRequests.find(item=>item.id===id)))throw Error('Data berubah. Buka kembali persetujuan.');
      const next=transaction(), updated=next.documentRequests.find(item=>item.id===id);
      DocumentWorkflow.decide(next,currentUser,updated,'approved','',today());
      updated.signedAttachment={name:current.attachment.name,type:'application/pdf',size:output.length,storageKey:key};
      const review=DocumentWorkflow.currentReviews(updated).find(item=>item.userId===actorId);review.signature={page:p.page,x:geometry.x,y:geometry.y,width:w,height:h,percent:geometry.percent,signatureKey};
      if(!saveDatabase(next))throw Error('Persetujuan belum tersimpan.');
      key=null;if(current.signedAttachment?.storageKey)releaseWorkbookFile(current.signedAttachment.storageKey);reply('docuflow:approval-result');render();toast('Persetujuan dan tanda tangan berhasil disimpan.');
      cleanup();
    } catch(error){if(key)await WorkbookStore.remove(key).catch(()=>{});reply('docuflow:approval-result',{error:error.message||'Persetujuan gagal disimpan.'});}
    finally {busy=false;}
  };
  const closedCheck=setInterval(()=>{if(tab.closed)cleanup();},2000);
  function cleanup(){clearInterval(closedCheck);window.removeEventListener('message',listener);}
  window.addEventListener('message',listener);
}
