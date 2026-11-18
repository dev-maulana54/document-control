'use strict';
(function(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./document-access.js') : root.DocumentAccess);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DocumentWorkflow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(Access) {
  const member = (db, user) => user && db.users.some(item => item.id === user.id && item.role === user.role && item.departmentId === user.departmentId);
  const canRead = (db, user, request) => Boolean(member(db, user) && request?.entityType === 'request' && (user.role === 'admin' || request.requesterId === user.id && Access.canRead(db,user,request) || request.approverIds?.includes(user.id) && (Access.canRead(db,user,request) || ['in_review','approved','published'].includes(request.status))));
  const canEdit = (db, user, request) => canRead(db, user, request) && (user.id === request.requesterId && ['draft', 'returned'].includes(request.status) || user.role === 'admin' && request.adminReviewRequired && request.status === 'admin_review');
  const canDelete = (db, user, request) => Boolean(canRead(db, user, request) && user.role === 'admin');
  function remove(db, user, id) {
    const index = db.documentRequests.findIndex(request => request.id === id), request = db.documentRequests[index];
    if (!canDelete(db, user, request)) throw new Error('Hanya admin dapat menghapus permintaan.');
    for (const doc of db.documents.filter(doc => doc.requestId === request.id || doc.id === request.publishedDocumentId)) doc.requestArchive = JSON.parse(JSON.stringify(request));
    db.documentRequests.splice(index, 1);
    return request;
  }
  const currentReviews = request => request.reviews.filter(review => review.round === request.reviewRound);
  const approvedFields = ['title','type','categoryId','departmentId','sectionId','code','revision','ownerId','description','changeNotes','effectiveDate','sourceId','sourceUpdatedAt','emailRecipientIds'];
  const metadata = request => JSON.stringify(approvedFields.map(key => request[key] ?? null));
  const unchanged = request => request.submittedMetadata === metadata(request) && request.submittedVersion === request.contentVersion && request.submittedWorkbookKey === (request.workbookKey || null) && request.submittedAttachment === JSON.stringify(request.attachment || null);
  const event = (request, user, action, now, note = '') => { request.events.push({ userId: user.id, action, at: now, note, round: request.reviewRound || 0 }); request.updatedAt = now; };
  function migrate(db) {
    let changed = false;
    if (db.documentRequests === undefined) { db.documentRequests = []; changed = true; }
    if (!Array.isArray(db.documentRequests)) throw new Error('Format permintaan dokumen tidak sesuai.');
    // Existing drafts can join the new review flow; submitted history stays intact.
    for (const request of db.documentRequests) if (request.adminReviewRequired===undefined && ['draft','returned'].includes(request.status)) {request.adminReviewRequired=true;changed=true;}
    if (!db.requestWorkflowVersion) {
      db.documents.forEach(doc => { doc.approvalOrigin = 'legacy'; if (doc.status !== 'archive') doc.status = 'active'; });
      db.requestWorkflowVersion = 1; changed = true;
    }
    return changed;
  }
  function submitToAdmin(db, user, request, now) {
    if (!request?.adminReviewRequired || !canEdit(db,user,request) || user.id !== request.requesterId || !['draft','returned'].includes(request.status)) throw new Error('Hanya pembuat dapat menyerahkan draft kepada admin.');
    if (!request.workbookKey && !request.attachment) throw new Error('Lengkapi isi dokumen terlebih dahulu.');
    request.status='admin_review';request.attachment=request.workbookKey?null:request.attachment;request.signedAttachment=null;
    event(request,user,'Dikirim untuk pemeriksaan admin',now);
  }
  function returnToAuthor(db,user,request,note,now){
    if(!canEdit(db,user,request)||user.role!=='admin'||!request.adminReviewRequired||request.status!=='admin_review')throw new Error('Dokumen tidak dapat dikembalikan.');
    note=String(note||'').trim();if(!note||note.length>2000)throw new Error('Isi catatan perbaikan (maksimal 2.000 karakter).');
    request.status='returned';event(request,user,'Dikembalikan oleh admin',now,note);
  }
  function validateNumber(db,request,value){
    const raw=String(value||''),number=raw.trim().replace(/\s+/g,' ');
    if(!number||number.length>100||/[\u0000-\u001f\u007f]/.test(raw))throw new Error('Isi nomor dokumen yang valid (maksimal 100 karakter).');
    const key=number.toLocaleLowerCase(),source=request.sourceId&&db.documents.find(doc=>doc.id===request.sourceId),sameSource=Boolean(source&&String(source.code||'').toLocaleLowerCase()===key);
    if(db.documents.some(doc=>String(doc.code||'').toLocaleLowerCase()===key&&!sameSource))throw new Error('Nomor dokumen sudah digunakan.');
    if(db.documentRequests.some(other=>other.id!==request.id&&(other.adminNumberSet||['in_review','approved'].includes(other.status))&&other.status!=='published'&&String(other.code||'').toLocaleLowerCase()===key&&!(sameSource&&other.sourceId===request.sourceId)))throw new Error('Nomor dokumen sudah digunakan oleh permintaan lain.');
    return number;
  }
  function assignNumber(db,user,request,value,now){
    if(!request?.adminReviewRequired||request.status!=='admin_review'||user?.role!=='admin'||!canEdit(db,user,request)||!db.documentRequests.some(item=>item.id===request.id))throw new Error('Hanya admin dapat mengisi nomor saat pemeriksaan.');
    const number=validateNumber(db,request,value),changed=request.code!==number||!request.adminNumberSet;request.code=number;request.adminNumberSet=true;
    if(changed)event(request,user,'Nomor dokumen ditetapkan',now);
    return number;
  }
  function submit(db, user, request, ids, now) {
    if (request?.adminReviewRequired ? !(canEdit(db,user,request) && user.role==='admin' && request.status==='admin_review') : !canEdit(db,user,request)) throw new Error('Dokumen belum siap diajukan untuk persetujuan.');
    if (!request.workbookKey && !request.attachment) throw new Error('Lengkapi isi Excel atau lampiran PDF terlebih dahulu.');
    if(request.adminReviewRequired){if(!request.adminNumberSet)throw new Error('Admin harus mengisi nomor dokumen.');validateNumber(db,request,request.code);}
    if (request.adminReviewRequired && request.workbookKey && !(request.attachment?.type==='application/pdf' && /\.pdf$/i.test(request.attachment.name||'') && request.attachment.size>0 && request.attachment.size<=5*1024*1024 && (/^approval-pdf-[a-z0-9-]+$/i.test(request.attachment.storageKey||'') || /^data:[^,]{0,100};base64,JVBERi0/i.test(request.attachment.data||'')))) throw new Error('Unggah PDF final sebelum mengirim untuk persetujuan.');
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw new Error('Pilih minimal satu approver.');
    if (ids.some(id => {const person=db.users.find(person=>person.id===id);return !person||!['user','admin'].includes(person.role)||!db.departments.some(department=>department.id===person.departmentId);})) throw new Error('Pengguna approver tidak tersedia.');
    request.reviewRound = (request.reviewRound || 0) + 1;
    request.approverIds = [...ids]; request.status = 'in_review'; request.signedAttachment = null;
    request.submissions ||= [];
    request.submissions.push({ round: request.reviewRound, contentVersion: request.contentVersion, workbookKey: request.workbookKey || null, attachment: request.attachment || null, metadata: metadata(request), at: now });
    request.submittedMetadata = metadata(request);
    request.submittedVersion = request.contentVersion; request.submittedWorkbookKey = request.workbookKey || null; request.submittedAttachment = JSON.stringify(request.attachment || null);
    request.reviews.push(...ids.map(userId => ({ userId, round: request.reviewRound, status: 'pending', note: '', at: null })));
    event(request, user, 'Diajukan untuk persetujuan', now);
  }
  function decide(db, user, request, status, note, now) {
    const review = currentReviews(request).find(review => review.userId === user?.id);
    if (!canRead(db, user, request) || request.status !== 'in_review' || !review || review.status !== 'pending' || !unchanged(request)) throw new Error('Persetujuan tidak tersedia atau isi dokumen telah berubah.');
    if (!['approved', 'returned'].includes(status)) throw new Error('Keputusan tidak valid.');
    note = String(note || '').trim();
    if (note.length > 2000 || (status === 'returned' && !note)) throw new Error('Isi catatan perbaikan (maksimal 2.000 karakter).');
    review.status = status; review.note = note; review.at = now;
    if (status === 'returned') { request.status = 'returned'; request.signedAttachment = null; }
    else if (currentReviews(request).every(item => item.status === 'approved')) request.status = 'approved';
    event(request, user, status === 'approved' ? 'Disetujui' : 'Dikembalikan untuk perbaikan', now, note);
  }
  function withdraw(db, user, request, now) {
    if (!canRead(db, user, request) || request.requesterId !== user.id || !['admin_review', 'in_review', 'approved'].includes(request.status)) throw new Error('Permintaan tidak dapat ditarik.');
    request.status = 'draft'; request.submittedVersion = null; request.signedAttachment = null;
    event(request, user, 'Ditarik ke draft; persetujuan sebelumnya dibatalkan', now);
  }
  function publish(db, user, request, id, now) {
    if (!canRead(db, user, request) || user.role !== 'admin' || request.status !== 'approved' || !unchanged(request) || currentReviews(request).length < 1 || !currentReviews(request).every(review => review.status === 'approved')) throw new Error('Hanya admin dapat menerbitkan setelah semua approver menyetujui versi ini.');
    if (db.documents.some(doc => doc.requestId === request.id || doc.id === id)) throw new Error('Permintaan sudah diterbitkan.');
    const source = request.sourceId && db.documents.find(doc => doc.id === request.sourceId);
    if (request.sourceId && (!source || source.status !== 'active' || source.updatedAt !== request.sourceUpdatedAt || db.documents.some(doc => doc.supersedesId === source.id))) throw new Error('Versi resmi telah berubah. Buat permintaan dari revisi terbaru.');
    if(request.adminReviewRequired)validateNumber(db,request,request.code);else if (!source && db.documents.some(doc => doc.code === request.code)) throw new Error('Nomor dokumen telah digunakan.');
    const doc = {};
    for (const key of ['title','type','categoryId','departmentId','sectionId','code','revision','ownerId','description','changeNotes','effectiveDate','attachment','workbookKey','emailRecipientIds','emailStatus']) doc[key] = request[key];
    if (request.signedAttachment) doc.attachment = request.signedAttachment;
    Object.assign(doc, { id, requestId: request.id, status: 'active', supersedesId: source?.id || null, createdAt: now, updatedAt: now, approvalOrigin: 'request', approvals: currentReviews(request).map(review => ({ ...review })), history: [...(source?.history || []), { revision: request.revision, date: now, userId: user.id, notes: request.changeNotes }] });
    if (source) source.status = 'archive';
    db.documents.unshift(doc); request.status = 'published'; request.publishedDocumentId = id; request.publishedAt = now;
    event(request, user, 'Diterbitkan ke Dokumen resmi', now); return doc;
  }
  return { migrate, canRead, canEdit, canDelete, remove, currentReviews, submitToAdmin, returnToAuthor, validateNumber, assignNumber, submit, decide, withdraw, publish };
});
