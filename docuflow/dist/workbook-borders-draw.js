'use strict';
let workbookBorderGesture=null;
function stopWorkbookBorderMode(){
  if(workbookBorderGesture){const gesture=workbookBorderGesture;workbookBorderGesture=null;finishWorkbookDrag({pointerId:gesture.pointerId,type:'pointercancel'});}
  if(activeWorkbook)activeWorkbook.borderMode=null;
  document.getElementById('workbook-border-mode')?.remove();document.getElementById('workbook-grid')?.classList.remove('is-border-drawing','is-border-erasing');
  if(workbookDocument())syncWorkbookBorderTool();
}
document.addEventListener('pointerdown',event=>{
  if(!activeWorkbook?.borderMode||event.button!==0||!workbookDocument(true)||activeWorkbook.saving||document.getElementById('modal')?.open)return;
  const cell=event.target.closest('#workbook-grid .workbook-cell');if(!cell)return;
  event.preventDefault();event.stopImmediatePropagation();const state=activeWorkbook,grid=document.getElementById('workbook-grid'),p=selectionPoint(event,grid),box=cell.closest('td').getBoundingClientRect();
  const distances=[['left',event.clientX-box.left],['right',box.right-event.clientX],['top',event.clientY-box.top],['bottom',box.bottom-event.clientY]].sort((a,b)=>a[1]-b[1]);
  state.editingCell=null;state.selectedPicture=null;state.copyArea=null;state.lastCellPointer=null;state.anchor=state.range=XlsxPackage.address(p.column,p.row);state.historyGroup=null;selectWorkbookCell(state.anchor);paintWorkbookPictureSelection();
  workbookBorderGesture={context:borderContext(),pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,side:distances[0][0],mode:state.borderMode};
  workbookDrag={state,grid,pointerId:event.pointerId,anchor:p,axis:'cell',clientX:event.clientX,clientY:event.clientY};grid.setPointerCapture(event.pointerId);grid.classList.add('is-selecting');extendWorkbookDrag(event);workbookDrag.frame=requestAnimationFrame(scrollWorkbookDrag);
},true);
function finishWorkbookBorderGesture(event){
  const gesture=workbookBorderGesture;if(!gesture||gesture.pointerId!==event.pointerId)return;
  event.preventDefault();event.stopImmediatePropagation();workbookBorderGesture=null;
  if(event.type==='pointerup'&&validBorderContext(gesture.context))extendWorkbookDrag(event);
  const address=activeWorkbook?.range;finishWorkbookDrag(event);
  if(event.type!=='pointerup'||!validBorderContext(gesture.context))return;
  const single=Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)<4,mode=gesture.mode;
  applyWorkbookBorder(single&&mode!=='grid'?gesture.side:mode==='erase'?'none':mode==='grid'?'all':'outside',{erase:single&&mode==='erase'},{...gesture.context,address});
}
document.addEventListener('pointerup',finishWorkbookBorderGesture,true);document.addEventListener('pointercancel',finishWorkbookBorderGesture,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeWorkbook?.borderMode&&!document.getElementById('workbook-border-menu')&&!document.getElementById('modal')?.open){event.preventDefault();event.stopImmediatePropagation();stopWorkbookBorderMode();restoreWorkbookFocus();}},true);
window.addEventListener('blur',()=>{if(workbookBorderGesture)stopWorkbookBorderMode();});
