const {test}=require('node:test');
const assert=require('node:assert/strict');
const Clean=require('../dist/clean-start.js');
const seed=()=>({users:[{id:'admin',role:'admin',email:'admin@example.test',password:'unchanged',departmentId:'eng',sectionId:'sec'},{id:'user',role:'user'}],departments:[{id:'eng'},{id:'qa'}],sections:[{id:'sec',departmentId:'eng'}],documents:[{id:'old'}],documentCategories:[{id:'old'}]});
test('reset retains a valid admin and clears business data exactly once',async()=>{
 const values=new Map([['docuflow.database.v1',JSON.stringify(seed())],['docuflow.session.v1','admin'],['unrelated','keep']]);
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};let cleared=0;
 const files={clear:async()=>{cleared++;}};
 assert.equal(await Clean.run(storage,files,seed),true);const db=JSON.parse(values.get('docuflow.database.v1'));
 assert.equal(db.users.length,1);assert.equal(db.users[0].password,'unchanged');assert.equal(db.departments.length,1);assert.equal(db.sections.length,1);
 for(const key of ['documents','documentCategories','documentTypes','documentTemplates','documentRequests','activities','notifications'])assert.deepEqual(db[key],[]);
 assert.equal(storage.getItem('docuflow.session.v1'),null);assert.equal(storage.getItem('unrelated'),'keep');assert.equal(cleared,1);
 db.documentCategories.push({id:'new'});storage.setItem('docuflow.database.v1',JSON.stringify(db));
 assert.equal(await Clean.run(storage,files,seed),false);assert.equal(cleared,1);assert.equal(JSON.parse(storage.getItem('docuflow.database.v1')).documentCategories[0].id,'new');
});
test('fresh and invalid stores start empty with a usable fallback admin',async()=>{
 for(const previous of [null,{users:[]}]){const db=Clean.database(previous,seed());assert.equal(db.users[0].role,'admin');assert.equal(db.documentAccessVersion,1);assert.equal(db.requestWorkflowVersion,1);assert.equal(db.documents.length,0);}
});
