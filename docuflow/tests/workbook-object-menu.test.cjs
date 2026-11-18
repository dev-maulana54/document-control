const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Shapes=require('../dist/workbook-shapes.js');

function fixture(){
  const shape={kind:'shape',id:'rect',text:'Object',fill:'#ffffff',stroke:'#123456',textColor:'#000000',lineWidth:2,fontSize:12,width:160,height:90};
  const original={anchorIndex:3,source:'data:image/png;base64,AA==',width:80,height:30};
  const sheet={images:[original],insertedImages:[shape]},state={sheetIndex:0,selectedPicture:'0',recordVersion:2,book:{sheets:[sheet],modified:new Set()}};
  const context={activeWorkbook:state,WorkbookShapes:Shapes,document:{addEventListener(){}},writable:true,checkpoints:0,changes:0};
  context.workbookDocument=editing=>!editing||context.writable;
  context.workbookCheckpoint=()=>{context.checkpoints++;return !state.saving;};
  context.workbookChanged=()=>context.changes++;
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/workbook-object-menu.js'),'utf8'),context);
  return {context,state,sheet,shape,original,capture:key=>({...context.workbookContextObject(key),version:state.recordVersion})};
}

test('object changes retain the original picture and record one undo checkpoint',()=>{
  const f=fixture(),c=f.capture('original-3');f.state.selectedPicture='original-3';
  assert.equal(f.context.changeWorkbookContextObject(c,{width:120,height:45,toColumn:null,toRow:null}),true);
  assert.equal(f.sheet.images[0],f.original);assert.equal(f.sheet.imageMoves[3].width,120);
  assert.equal(f.context.checkpoints,1);assert.equal(f.context.changes,1);assert.ok(f.state.book.modified.has(0));
});

test('numeric resizing preserves two-cell anchor semantics and valid endpoint offsets',()=>{
  const f=fixture();Object.assign(f.original,{column:0,row:0,x:10,y:10,toColumn:1,toRow:2,toX:60,toY:10,fixedSize:false});
  f.state.gridLayout={x:[44,144,244,344],y:[28,48,68,88,108]};f.state.selectedPicture='original-3';const c=f.capture('original-3');
  const patch=f.context.workbookObjectSizePatch(c,120,45);
  assert.equal(patch.toColumn,1);assert.equal(patch.toX,30);assert.equal(patch.toRow,2);assert.equal(patch.toY,15);
  assert.equal(f.context.changeWorkbookContextObject(c,patch),true);
  assert.equal(f.sheet.imageMoves[3].fixedSize,false);assert.equal(f.sheet.imageMoves[3].width,120);assert.equal(f.sheet.imageMoves[3].height,45);
});

test('stale object menus cannot resize or delete a different selection or edited object',()=>{
  for(const invalidate of [f=>{f.state.selectedPicture='original-3';},f=>{f.state.recordVersion++;},f=>{f.sheet.insertedImages[0]={...f.shape,text:'Changed elsewhere'};},f=>{f.state.saving=true;},f=>{f.context.writable=false;},f=>{f.context.activeWorkbook={...f.state};}]){
    const f=fixture(),c=f.capture('0');invalidate(f);
    assert.equal(Boolean(f.context.changeWorkbookContextObject(c,{hidden:true})),false);
    assert.equal(f.context.checkpoints,0);assert.equal(f.context.changes,0);assert.equal(f.sheet.insertedImages[0].hidden,undefined);
  }
});

test('object deletion is undoable without shifting another inserted object identity',()=>{
  const f=fixture(),second={...f.shape,text:'Second'};f.sheet.insertedImages.push(second);const c=f.capture('0');
  assert.equal(f.context.changeWorkbookContextObject(c,{hidden:true}),true);
  assert.equal(f.sheet.insertedImages[0].hidden,true);assert.equal(f.sheet.insertedImages[1],second);
  assert.equal(f.context.workbookContextObject('0'),null);assert.equal(f.context.workbookContextObject('1').image,second);
});
