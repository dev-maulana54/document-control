'use strict';

function workbookPointerScale(grid) {
  const rect=grid.getBoundingClientRect();return {x:rect.width/grid.offsetWidth||1,y:rect.height/grid.offsetHeight||1};
}
function layoutWorkbookViewport(repaint=true) {
  if(!workbookDocument())return;
  const editor=document.getElementById('workbook-editor'),grid=document.getElementById('workbook-grid'),heading=document.querySelector('.workbook-heading'),workspace=document.querySelector('.workbook-workspace');
  // offsetHeight rounds to an integer. Dividing the measured height by it feeds
  // that rounding error back into our next height/width and can oscillate forever.
  let scale=1;for(let node=workspace;node;node=node.parentElement)scale*=Number(getComputedStyle(node).zoom)||1;
  const zoom=(activeWorkbook.view?.zoom||100)/100,px=value=>Math.round(value*64)/64+'px';
  const setStyle=(node,key,value)=>{if(node.style[key]!==String(value))node.style[key]=value;};
  setStyle(workspace,'height',px(window.innerHeight/scale));setStyle(workspace,'width',px(window.innerWidth/scale));if(workspace.scrollLeft)workspace.scrollLeft=0;
  const other=[heading,editor.querySelector('.excel-ribbon'),editor.querySelector('.workbook-formula-bar'),editor.querySelector('.workbook-bottom-bar')].reduce((sum,node)=>sum+(node&&!node.hidden?node.getBoundingClientRect().height/scale:0),0);
  setStyle(grid,'zoom',zoom);setStyle(grid,'width','100%');if(grid.style.getPropertyValue('--sheet-zoom')!==String(zoom))grid.style.setProperty('--sheet-zoom',zoom);setStyle(grid,'minHeight',px(120/zoom));
  setStyle(grid,'height',px(Math.max(120,window.innerHeight/scale-other-40)/zoom));
  if(repaint!==false){let actualZoom=1;for(let node=grid;node;node=node.parentElement)actualZoom*=Number(getComputedStyle(node).zoom)||1;if(activeWorkbook.gridLayout&&Math.abs(actualZoom-activeWorkbook.gridLayout.zoom)>.0001)renderWorkbookGrid(activeWorkbook,Boolean(workbookDocument(true)),grid);else activeWorkbook.renderViewport?.();}
}
function syncWorkbookRibbon() {
  if(!workbookDocument())return;
  const ribbon=document.querySelector('.excel-ribbon');if(!ribbon){layoutWorkbookViewport();return;}
  const state=activeWorkbook;state.view ||= {};
  ribbon.classList.toggle('is-collapsed',Boolean(state.view.ribbonCollapsed));ribbon.classList.toggle('is-pinned',state.view.ribbonPinned!==false);
  ribbon.querySelector('[data-ribbon-display=pin]').setAttribute('aria-pressed',String(state.view.ribbonPinned!==false));
  ribbon.querySelector('[data-ribbon-display=toggle]').setAttribute('aria-expanded',String(!state.view.ribbonCollapsed));
  layoutWorkbookViewport();
}
function observeWorkbookViewport() {
  const state=activeWorkbook;state.viewportObserver?.disconnect();let frame;
  state.viewportObserver=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layoutWorkbookViewport);});
  for(const node of document.querySelectorAll('.workbook-heading,.excel-ribbon,.workbook-formula-bar,.workbook-bottom-bar'))state.viewportObserver.observe(node);
  syncWorkbookRibbon();
}
window.addEventListener('resize',layoutWorkbookViewport);
document.addEventListener('click',event=>{
  if(!workbookDocument())return;
  const control=event.target.closest('[data-ribbon-display]'),state=activeWorkbook;state.view ||= {};
  if(control){
    if(control.dataset.ribbonDisplay==='pin'){state.view.ribbonPinned=state.view.ribbonPinned===false;state.view.ribbonCollapsed=!state.view.ribbonPinned;}
    else state.view.ribbonCollapsed=!state.view.ribbonCollapsed;
    syncWorkbookRibbon();
  }else if(event.target.closest('[data-ribbon-tab]')){state.view.ribbonCollapsed=false;syncWorkbookRibbon();}
});
document.addEventListener('pointerdown',event=>{
  if(!workbookDocument())return;
  const edge=event.target.closest('[data-resize-column],[data-resize-row]');
  if(!edge||event.button!==0||!workbookDocument(true)||activeWorkbook.saving)return;
  event.preventDefault();event.stopPropagation();
  const state=activeWorkbook,index=state.sheetIndex,grid=document.getElementById('workbook-grid'),axis=edge.dataset.resizeColumn?'column':'row',number=Number(edge.dataset.resizeColumn||edge.dataset.resizeRow),scale=workbookPointerScale(grid),edges=state.gridLayout[axis==='column'?'x':'y'];
  const size=edges[number]-edges[number-1],start=axis==='column'?event.clientX:event.clientY,guide=document.createElement('div');guide.className='workbook-resize-guide '+axis;grid.querySelector('.workbook-canvas').appendChild(guide);let pixels=size;
  const move=e=>{pixels=Math.max(0,Math.min(WorkbookEngine.sizePixels(axis,axis==='column'?255:409),size+((axis==='column'?e.clientX:e.clientY)-start)/(axis==='column'?scale.x:scale.y)));guide.style[axis==='column'?'left':'top']=edges[number-1]+pixels+'px';};
  const finish=e=>{
    edge.removeEventListener('pointermove',move);edge.removeEventListener('pointerup',finish);edge.removeEventListener('pointercancel',finish);guide.remove();
    if(e.type==='pointercancel'||state!==activeWorkbook||state.sheetIndex!==index||!workbookDocument(true)||state.saving||Math.abs(size-pixels)<.5)return;
    try{if(!workbookCheckpoint())return;WorkbookFormat.resize(state.book,index,XlsxPackage.address(axis==='column'?number:1,axis==='row'?number:1),axis,WorkbookEngine.sizeValue(axis,pixels));state.historyGroup=null;workbookChanged();restoreWorkbookFocus();}catch(error){toast(error.message,true);}
  };
  edge.setPointerCapture(event.pointerId);edge.addEventListener('pointermove',move);edge.addEventListener('pointerup',finish);edge.addEventListener('pointercancel',finish);move(event);
});
document.addEventListener('pointerup',event=>{
  if(workbookDocument()&&event.target.closest('#workbook-grid')&&activeWorkbook.view?.ribbonPinned===false){activeWorkbook.view.ribbonCollapsed=true;syncWorkbookRibbon();}
});

function beginWorkbookCellEdit(cell,replace=false){
  if(!cell||cell.readOnly||!workbookDocument(true)||activeWorkbook.saving||activeWorkbook.selected!==cell.dataset.cell)return false;
  const state=activeWorkbook;if(state.editingCell===cell.dataset.cell)return true;state.editingCell=cell.dataset.cell;state.editingOriginal=WorkbookEngine.value(state.book,state.book.sheets[state.sheetIndex].cells.get(state.editingCell));
  cell.classList.add('is-editing');if(replace)cell.value='';scheduleWorkbookOverflow();return true;
}
function moveWorkbookCell(dx,dy){
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],point=XlsxPackage.position(state.selected),merge=sheet.merges.find(m=>m.start===state.selected);
  let row=Math.max(1,Math.min(sheet.rows,(merge&&dy?(dy>0?merge.last.row:merge.first.row):point.row)+dy)),column=Math.max(1,Math.min(sheet.columns,(merge&&dx?(dx>0?merge.last.column:merge.first.column):point.column)+dx));
  const {x,y}=state.gridLayout;
  while(dy&&row>=1&&row<=sheet.rows&&y[row]===y[row-1])row+=dy;
  while(dx&&column>=1&&column<=sheet.columns&&x[column]===x[column-1])column+=dx;
  if(row<1||row>sheet.rows)row=point.row;
  if(column<1||column>sheet.columns)column=point.column;
  const target=sheet.merges.find(m=>row>=m.first.row&&row<=m.last.row&&column>=m.first.column&&column<=m.last.column);
  state.editingCell=null;state.historyGroup=null;state.selectedPicture=null;state.range=target?.start||XlsxPackage.address(column,row);state.anchor=state.range;selectWorkbookCell(state.range);ensureWorkbookCellVisible(state.selected);restoreWorkbookFocus();paintWorkbookPictureSelection();
}
document.addEventListener('keydown',event=>{
  const cell=event.target.closest('.workbook-cell');if(!cell||!workbookDocument()||event.ctrlKey||event.metaKey||event.isComposing)return;
  const state=activeWorkbook,editing=state.editingCell===cell.dataset.cell;
  if(event.key==='F2'){event.preventDefault();if(beginWorkbookCellEdit(cell))cell.setSelectionRange(cell.value.length,cell.value.length);return;}
  if(event.key==='Escape'&&editing){event.preventDefault();const original=state.editingOriginal;state.editingCell=null;cell.classList.remove('is-editing');if(workbookDocument(true)){updateWorkbookCell(cell.dataset.cell,original);cell.value=original;}state.historyGroup=null;restoreWorkbookFocus();return;}
  if(event.key==='Tab'){state.editingCell=null;cell.classList.remove('is-editing');return;}
  if(event.key==='Enter'&&!event.altKey){event.preventDefault();cell.classList.remove('is-editing');moveWorkbookCell(0,event.shiftKey?-1:1);return;}
  if(!editing&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const [dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];moveWorkbookCell(dx,dy);return;}
  if(!editing&&['Backspace','Delete'].includes(event.key)&&workbookDocument(true)){event.preventDefault();try{commitWorkbookValues(workbookEditableReferences().map(reference=>({reference,value:''})));}catch(error){toast(error.message,true);}return;}
  if(!editing&&event.key.length===1&&!event.altKey&&!beginWorkbookCellEdit(cell,true))event.preventDefault();
});
document.addEventListener('beforeinput',event=>{
  if(event.target.matches('.workbook-cell')&&workbookDocument(true)&&activeWorkbook.editingCell!==event.target.dataset.cell){if(beginWorkbookCellEdit(event.target))event.target.select();}
});
document.addEventListener('focusout',event=>{
  if(event.target.matches('.workbook-cell')&&activeWorkbook){event.target.classList.remove('is-editing');if(activeWorkbook.editingCell===event.target.dataset.cell){activeWorkbook.editingCell=null;activeWorkbook.historyGroup=null;}}
});
