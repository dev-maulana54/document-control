const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../dist/document-categories.js');
function database(){return {documentTypes:[{id:'ik',name:'Instruksi Kerja',prefix:'IK'},{id:'om',name:'Operation Manual',prefix:'OM'}],documentCategories:[{id:'used',code:'OM-PR2-ASY'},{id:'empty',code:'OM-PR1-CST'},{id:'mixed',code:'LEGACY'}],documents:[{categoryId:'used',type:'Instruksi Kerja'},{categoryId:'mixed',type:'Instruksi Kerja'}],documentRequests:[{categoryId:'mixed',type:'Operation Manual'}],departmentAuthorizations:{qa:['used']}};}
test('migration prefers actual document use over a code prefix and preserves mixed legacy categories',()=>{
 const db=database(),before=structuredClone(db.documents),grants=structuredClone(db.departmentAuthorizations);
 assert.equal(C.migrate(db),true);assert.equal(db.documentCategories[0].documentTypeId,'ik');assert.equal(db.documentCategories[1].documentTypeId,'om');assert.equal(db.documentCategories[2].documentTypeId,null);assert.deepEqual(db.documents,before);assert.deepEqual(db.departmentAuthorizations,grants);assert.equal(C.migrate(db),false);
});
test('category types bind by stable ID, constrain new assignments and cannot invalidate used categories',()=>{
 const db=database();C.migrate(db);
 assert.equal(C.matches(db,db.documentCategories[0],'Instruksi Kerja'),true);assert.equal(C.matches(db,db.documentCategories[0],'Operation Manual'),false);assert.equal(C.matches(db,db.documentCategories[2],'Operation Manual'),true);
 assert.throws(()=>C.validateType(db,'used','om'));assert.throws(()=>C.validateType(db,'used','missing'));assert.doesNotThrow(()=>C.validateType(db,'used','ik'));
 assert.throws(()=>C.validateType(db,'new',null));assert.throws(()=>C.validateType(db,'used',null));assert.doesNotThrow(()=>C.validateType(db,'mixed',null));
 db.documentTypes[0].name='IK Baru';assert.equal(C.matches(db,db.documentCategories[0],'IK Baru'),true);
});
