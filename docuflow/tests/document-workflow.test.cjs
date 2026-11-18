const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../dist/document-workflow.js');
function fixture(){
 const users=[{id:'author',role:'user',departmentId:'qa'},{id:'a',role:'user',departmentId:'qa'},{id:'b',role:'admin',departmentId:'qa'}];
 const db={users,documents:[],documentRequests:[],documentCategories:[{id:'cat'}],departments:[{id:'qa'}],departmentAuthorizations:{qa:['cat']}};
 const r={id:'r',entityType:'request',requesterId:'author',ownerId:'author',categoryId:'cat',status:'draft',contentVersion:1,workbookKey:'file1',title:'IK',code:'IK/QA/1',revision:0,events:[],reviews:[]};db.documentRequests.push(r);return {db,r,users};
}
test('all parallel approvals required and only admin publishes exact reviewed artifact',()=>{
 const {db,r,users}=fixture();W.submit(db,users[0],r,['a','b'],'now');
 assert.equal(db.documents.length,0);assert.equal(W.canEdit(db,users[0],r),false);
 W.decide(db,users[1],r,'approved','','now');assert.equal(r.status,'in_review');
 assert.throws(()=>W.publish(db,users[2],r,'doc','now'));
 W.decide(db,users[2],r,'approved','','now');assert.equal(r.status,'approved');assert.equal(db.documents.length,0);
 assert.throws(()=>W.publish(db,users[0],r,'doc','now'));
 const doc=W.publish(db,users[2],r,'doc','now');assert.equal(doc.workbookKey,'file1');assert.equal(r.status,'published');assert.equal(db.documents.length,1);
 assert.throws(()=>W.publish(db,users[2],r,'again','now'));
});
test('duplicate or unknown approvers, repeated votes and changed content are rejected',()=>{
 const {db,r,users}=fixture();assert.throws(()=>W.submit(db,users[0],r,['a','a'],'now'));assert.throws(()=>W.submit(db,users[0],r,['missing'],'now'));
 W.submit(db,users[0],r,['a','b'],'now');assert.equal(W.canRead(db,{id:'stranger',role:'user',departmentId:'qa'},r),false);
 W.decide(db,users[1],r,'approved','','now');assert.throws(()=>W.decide(db,users[1],r,'approved','','now'));
 r.contentVersion++;assert.throws(()=>W.decide(db,users[2],r,'approved','','now'));
});

test('admin assigns a unique document number and any user, including the author, can approve alone',()=>{
 const {db,r,users}=fixture();r.adminReviewRequired=true;W.submitToAdmin(db,users[0],r,'now');
 assert.throws(()=>W.assignNumber(db,users[0],r,'WI/123','now'));assert.throws(()=>W.assignNumber(db,users[2],r,'  ','now'));
 db.documents.push({id:'other',code:'WI/TAKEN',status:'active'});assert.throws(()=>W.assignNumber(db,users[2],r,'wi/taken','now'));
 r.attachment={name:'final.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0=',size:5};assert.throws(()=>W.submit(db,users[2],r,['author'],'now'));
 W.assignNumber(db,users[2],r,'WI/123','now');assert.equal(r.code,'WI/123');assert.throws(()=>W.submit(db,users[2],r,[],'now'));
 W.submit(db,users[2],r,['author'],'now');W.decide(db,users[0],r,'approved','','now');assert.equal(r.status,'approved');assert.equal(W.publish(db,users[2],r,'new','later').code,'WI/123');
});
test('document numbers reject control characters and reserved requests while revisions may retain their source number',()=>{
 const {db,r,users}=fixture();r.adminReviewRequired=true;W.submitToAdmin(db,users[0],r,'now');
 assert.throws(()=>W.assignNumber(db,users[2],r,'WI/\n123','now'));
 db.documentRequests.push({id:'legacy',code:'WI/PENDING',status:'in_review'});
 assert.throws(()=>W.assignNumber(db,users[2],r,'wi/pending','now'));
 db.documentRequests.push({id:'pending',code:'WI/ASSIGNED',status:'admin_review',adminNumberSet:true});
 assert.throws(()=>W.assignNumber(db,users[2],r,'wi/assigned','now'));
 db.documents.push({id:'source',code:'WI/REVISION',status:'active'});r.sourceId='source';
 assert.equal(W.assignNumber(db,users[2],r,'WI/REVISION','now'),'WI/REVISION');
});
test('return requires notes and resubmit starts a new round, withdrawal invalidates approvals',()=>{
 const {db,r,users}=fixture();W.submit(db,users[0],r,['a','b'],'now');assert.throws(()=>W.decide(db,users[1],r,'returned','','now'));
 W.decide(db,users[1],r,'returned','Perbaiki','now');assert.ok(W.canEdit(db,users[0],r));r.contentVersion++;
 r.workbookKey='file2';W.submit(db,users[0],r,['a','b'],'later');assert.equal(r.reviewRound,2);assert.equal(r.submissions[0].workbookKey,'file1');assert.equal(r.submissions[1].workbookKey,'file2');assert.equal(r.reviews.filter(v=>v.round===2&&v.status==='pending').length,2);
 W.withdraw(db,users[0],r,'later');assert.equal(r.status,'draft');assert.equal(r.submittedVersion,null);
});
test('old official remains active until publication and stale revision is rejected',()=>{
 const {db,r,users}=fixture();db.documents.push({id:'old',code:r.code,status:'active',revision:0,updatedAt:'before',history:[]});r.sourceId='old';r.sourceUpdatedAt='before';r.revision=1;
 W.submit(db,users[0],r,['a','b'],'now');assert.equal(db.documents[0].status,'active');W.decide(db,users[1],r,'approved','','now');W.decide(db,users[2],r,'approved','','now');
 db.documents[0].updatedAt='changed';assert.throws(()=>W.publish(db,users[2],r,'doc','now'));assert.equal(db.documents[0].status,'active');db.documents[0].updatedAt='before';W.publish(db,users[2],r,'doc','now');assert.equal(db.documents.find(d=>d.id==='old').status,'archive');
});

test('metadata mutation cannot inherit approval for older title',()=>{const {db,r,users}=fixture();W.submit(db,users[0],r,['a','b'],'now');r.title='Changed';assert.throws(()=>W.decide(db,users[1],r,'approved','','now'));});

test('new Excel request moves from author to editable admin review before PDF approval',()=>{
 const {db,r,users}=fixture();r.adminReviewRequired=true;db.users.push({id:'c',role:'user',departmentId:'qa'});
 assert.throws(()=>W.submit(db,users[0],r,['a','b'],'now'));assert.throws(()=>W.submitToAdmin(db,users[1],r,'now'));
 W.submitToAdmin(db,users[0],r,'now');assert.equal(r.status,'admin_review');assert.equal(W.canEdit(db,users[0],r),false);assert.equal(W.canEdit(db,users[2],r),true);assert.equal(W.canEdit(db,users[1],r),false);
 assert.throws(()=>W.submit(db,users[2],r,['a','c'],'now'));W.assignNumber(db,users[2],r,'IK/QA/1','now');r.attachment={name:'final.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0=',size:5};r.workbookKey='admin-edited';r.contentVersion++;
 W.submit(db,users[2],r,['a','c'],'now');assert.equal(r.status,'in_review');assert.equal(W.canEdit(db,users[2],r),false);assert.equal(r.submissions[0].workbookKey,'admin-edited');assert.equal(r.submissions[0].attachment.name,'final.pdf');
});

test('admin may return a review with a note and author can resubmit',()=>{
 const {db,r,users}=fixture();r.adminReviewRequired=true;W.submitToAdmin(db,users[0],r,'first');
 assert.throws(()=>W.returnToAuthor(db,users[1],r,'fix','now'));assert.throws(()=>W.returnToAuthor(db,users[2],r,'','now'));
 W.returnToAuthor(db,users[2],r,'Perbaiki nomor','now');assert.equal(r.status,'returned');assert.equal(r.events.at(-1).note,'Perbaiki nomor');assert.equal(W.canEdit(db,users[0],r),true);assert.equal(W.canEdit(db,users[2],r),false);
 W.submitToAdmin(db,users[0],r,'again');assert.equal(r.status,'admin_review');
});

test('migration adds admin review to existing drafts without changing approval history',()=>{
 const {db,r}=fixture();db.requestWorkflowVersion=1;const pending={...r,id:'pending',status:'in_review',events:[],reviews:[]};db.documentRequests.push(pending);
 assert.equal(W.migrate(db),true);assert.equal(r.adminReviewRequired,true);assert.equal(pending.adminReviewRequired,undefined);assert.equal(W.migrate(db),false);
});

test('assigned approvers without category access can review only their assigned request',()=>{
 const {db,r,users}=fixture();db.departments.push({id:'other'});db.departmentAuthorizations.other=[];
 const outsider={id:'cross',role:'user',departmentId:'other'};db.users.push(outsider);r.adminReviewRequired=true;
 assert.equal(W.canRead(db,outsider,r),false);W.submitToAdmin(db,users[0],r,'first');W.assignNumber(db,users[2],r,'IK/QA/1','now');
 r.attachment={name:'final.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0=',size:5};
 assert.throws(()=>W.submit(db,users[2],r,['a','missing'],'now'));assert.equal(r.status,'admin_review');
 W.submit(db,users[2],r,['a','cross'],'now');assert.equal(W.canRead(db,outsider,r),true);assert.equal(W.canEdit(db,outsider,r),false);
 assert.equal(W.canRead(db,outsider,{...r,id:'other-request',approverIds:['a']}),false);assert.equal(require('../dist/document-access.js').canRead(db,outsider,{categoryId:'cat'}),false);
 W.decide(db,outsider,r,'approved','','now');W.withdraw(db,users[0],r,'later');assert.equal(W.canRead(db,outsider,r),false);
});

test('request-specific access ends when an unprivileged approver returns a request',()=>{
 const {db,r,users}=fixture();db.departments.push({id:'other'});db.departmentAuthorizations.other=[];const reviewer={id:'cross',role:'user',departmentId:'other'};db.users.push(reviewer);r.adminReviewRequired=true;
 W.submitToAdmin(db,users[0],r,'first');W.assignNumber(db,users[2],r,'IK/QA/1','now');r.attachment={name:'final.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0=',size:5};W.submit(db,users[2],r,['a','cross'],'now');
 assert.equal(W.canRead(db,reviewer,r),true);W.decide(db,reviewer,r,'returned','Perlu diperbaiki','later');assert.equal(W.canRead(db,reviewer,r),false);assert.equal(W.canEdit(db,users[0],r),true);assert.equal(W.canRead(db,users[1],r),true);
});

test('only a current admin may delete requests at any stage, preserving official documents',()=>{
 const {db,r,users}=fixture();const source={id:'source',status:'active',workbookKey:'shared'};db.documents.push(source);r.sourceId=source.id;
 for(const user of [users[0],users[1],{...users[0],role:'admin'},null]){assert.equal(W.canDelete(db,user,r),false);assert.throws(()=>W.remove(db,user,r.id));}
 for(const status of ['draft','returned','admin_review','in_review','approved','published']){r.status=status;assert.equal(W.canDelete(db,users[2],r),true);}
 r.status='returned';assert.equal(W.canDelete(db,users[2],r),true);const removed=W.remove(db,users[2],r.id);assert.equal(removed,r);assert.equal(db.documentRequests.length,0);assert.deepEqual(db.documents,[source]);assert.throws(()=>W.remove(db,users[2],r.id));
});

test('deleting a published request preserves its history and original document',()=>{
 for(const reference of ['requestId','publishedDocumentId']){const {db,r,users}=fixture();const doc={id:'official',status:'active'};r.status='published';r.events.push({action:'Diterbitkan'});if(reference==='requestId')doc.requestId=r.id;else r.publishedDocumentId=doc.id;db.documents.push(doc);assert.equal(W.canDelete(db,users[2],r),true);W.remove(db,users[2],r.id);assert.equal(db.documentRequests.length,0);assert.equal(db.documents[0],doc);assert.deepEqual(doc.requestArchive.events,r.events);assert.notEqual(doc.requestArchive,r);}
});
