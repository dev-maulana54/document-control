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
test('no self approval, duplicates, strangers, repeated votes or changed content',()=>{
 const {db,r,users}=fixture();assert.throws(()=>W.submit(db,users[0],r,['author','a'],'now'));assert.throws(()=>W.submit(db,users[0],r,['a','a'],'now'));
 W.submit(db,users[0],r,['a','b'],'now');assert.equal(W.canRead(db,{id:'stranger',role:'user',departmentId:'qa'},r),false);
 W.decide(db,users[1],r,'approved','','now');assert.throws(()=>W.decide(db,users[1],r,'approved','','now'));
 r.contentVersion++;assert.throws(()=>W.decide(db,users[2],r,'approved','','now'));
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

test('only a current admin may delete a draft or returned request, preserving official documents',()=>{
 const {db,r,users}=fixture();const source={id:'source',status:'active',workbookKey:'shared'};db.documents.push(source);r.sourceId=source.id;
 for(const user of [users[0],users[1],{...users[0],role:'admin'},null]){assert.equal(W.canDelete(db,user,r),false);assert.throws(()=>W.remove(db,user,r.id));}
 for(const status of ['in_review','approved','published','unknown']){r.status=status;assert.equal(W.canDelete(db,users[2],r),false);assert.throws(()=>W.remove(db,users[2],r.id));assert.equal(db.documentRequests.length,1);}
 r.status='returned';assert.equal(W.canDelete(db,users[2],r),true);const removed=W.remove(db,users[2],r.id);assert.equal(removed,r);assert.equal(db.documentRequests.length,0);assert.deepEqual(db.documents,[source]);assert.throws(()=>W.remove(db,users[2],r.id));
});

test('request deletion cannot erase a publication record even with a draft status',()=>{
 for(const reference of ['requestId','publishedDocumentId']){const {db,r,users}=fixture();const doc={id:'official',status:'active'};if(reference==='requestId')doc.requestId=r.id;else r.publishedDocumentId=doc.id;db.documents.push(doc);assert.equal(W.canDelete(db,users[2],r),false);assert.throws(()=>W.remove(db,users[2],r.id));assert.equal(db.documentRequests.length,1);assert.equal(db.documents[0],doc);}
});
