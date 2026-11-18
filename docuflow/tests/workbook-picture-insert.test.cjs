const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function fixture(images=[],insertedImages=[],imageMoves={}){
  const file={},error={textContent:''},button={disabled:false},fileInput={files:[file]};
  const sheet={images,insertedImages,imageMoves};
  const state={sheetIndex:0,selected:'B3',book:{sheets:[sheet],modified:new Set()}};
  const form={isConnected:true,querySelector:selector=>({'#insert-error':error,'[type=submit]':button,'[type=file]':fileInput})[selector]};
  const context={activeWorkbook:state,db:{},currentUser:{id:'admin'},checkpoints:0,changes:0,
    document:{addEventListener(){},getElementById:id=>({'workbook-picture-form':form,'workbook-picture-width':{value:'240'}})[id]},
    workbookDocument:()=>true,showModal(){},modalHeading:()=>'',esc:value=>value,restoreWorkbookFocus(){},
    modal:{open:true,close(){this.open=false;}},
    WorkbookMedia:{readImage:async()=>({source:'data:image/png;base64,AA==',naturalWidth:100,naturalHeight:50})},
    XlsxPackage:{position:()=>({column:2,row:3})}};
  context.workbookCheckpoint=()=>{context.checkpoints++;return true;};
  context.workbookChanged=()=>{context.changes++;};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../dist/workbook-insert.js'),'utf8'),context);
  context.showWorkbookPicture();
  return {context,sheet,state,error,button,submit:()=>form.onsubmit({preventDefault(){},target:form})};
}

test('picture insertion rejects a fifty-first visible picture without changing the sheet',async()=>{
  const f=fixture(Array.from({length:50},(_,anchorIndex)=>({anchorIndex})));
  await f.submit();
  assert.match(f.error.textContent,/Maksimal 50 gambar/);
  assert.equal(f.sheet.insertedImages.length,0);
  assert.equal(f.context.checkpoints,0);assert.equal(f.context.changes,0);
  assert.equal(f.button.disabled,false);
});

test('deleted original pictures release their insertion quota through imageMoves',async()=>{
  const images=Array.from({length:50},(_,anchorIndex)=>({anchorIndex}));
  const f=fixture(images,[],{49:{...images[49],hidden:true}});
  await f.submit();
  assert.equal(f.error.textContent,'');assert.equal(f.sheet.insertedImages.length,1);
  assert.equal(f.sheet.images.length,50,'Original picture identities remain available for Undo');
  assert.equal(f.context.checkpoints,1);assert.equal(f.context.changes,1);
  assert.ok(f.state.book.modified.has(0));
});

test('deleted inserted pictures release quota and shapes do not consume picture slots',async()=>{
  const inserted=Array.from({length:49},()=>({}));
  inserted[0].hidden=true;
  inserted.push(...Array.from({length:10},()=>({kind:'shape'})));
  const f=fixture([{anchorIndex:0}],inserted);
  await f.submit();
  assert.equal(f.error.textContent,'');assert.equal(f.sheet.insertedImages.length,60);
  assert.equal(f.sheet.insertedImages[0].hidden,true,'Deletion stays undoable');
  assert.equal(f.context.checkpoints,1);assert.equal(f.context.changes,1);
});
