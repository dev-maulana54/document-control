const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const W=require('../dist/document-workflow.js');
const names={author:'Maulana Akbar',reviewer:'Aditya Pratama',qa:'Budi QA'};
const context=vm.createContext({document:{addEventListener(){}},DocumentWorkflow:W,userName:id=>names[id]||'Pengguna',esc:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))});
vm.runInContext(fs.readFileSync(require.resolve('../dist/document-requests.js'),'utf8'),context);
const request={title:'Instruksi Baterai',code:'IK-009',requesterId:'author',status:'in_review',reviewRound:2,approverIds:['reviewer','qa'],reviews:[{round:1,userId:'reviewer',status:'approved'},{round:2,userId:'reviewer',status:'pending'},{round:2,userId:'qa',status:'approved'}]};
test('pagination bounds pages and handles empty and partial last pages',()=>{
  const bounds=(...args)=>JSON.parse(JSON.stringify(context.approvalPageWindow(...args)));
  assert.deepEqual(bounds(23,1,10),{page:1,pages:3,start:0,end:10});
  assert.deepEqual(bounds(23,3,10),{page:3,pages:3,start:20,end:23});
  assert.deepEqual(bounds(3,9,10),{page:1,pages:1,start:0,end:3});
  assert.deepEqual(bounds(0,2,10),{page:1,pages:1,start:0,end:0});
  assert.deepEqual(bounds(30,2,25),{page:2,pages:2,start:25,end:30});
});
test('search matches document, code, author and current approvers without case sensitivity',()=>{
  for(const query of ['baterai','ik-009',' MAULANA ','aditya','budi qa'])assert.equal(context.approvalRequestMatches(request,query,''),true,query);
  assert.equal(context.approvalRequestMatches(request,'tidak ada',''),false);
  assert.equal(context.approvalRequestMatches(request,'','in_review'),true);
  assert.equal(context.approvalRequestMatches(request,'','approved'),false);
});
test('approval list shows named decisions from the current round',()=>{
  const html=context.requestApprovalList(request);
  assert.match(html,/1 dari 2 setuju/);
  assert.match(html,/Aditya Pratama/);assert.match(html,/Belum menyetujui/);
  assert.match(html,/Budi QA/);assert.match(html,/Sudah setuju/);
  assert.equal((html.match(/Sudah setuju/g)||[]).length,1);
});
test('inactive rounds are labeled and names are escaped',()=>{
  const html=context.requestApprovalList({...request,status:'draft'});
  assert.match(html,/dibatalkan/i);assert.doesNotMatch(html,/class="approval-progress"/);
  names.qa='<img src=x onerror=alert(1)>';
  assert.doesNotMatch(context.requestApprovalList(request),/<img/);
  assert.match(context.requestApprovalList({...request,reviews:[],reviewRound:0}),/Belum diajukan/);
});
