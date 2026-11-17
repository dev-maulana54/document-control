'use strict';
function paintWorkbookPictureSelection(){
  if(!workbookDocument())return;
  const grid=document.getElementById('workbook-grid'),key=activeWorkbook.selectedPicture;
  let frame=grid.querySelector('.workbook-picture-selection');
  const node=key!==undefined&&key!==null?grid.querySelector('.workbook-image[data-inserted-image="'+CSS.escape(String(key))+'"]'):null;
  if(!node||!workbookDocument(true)){frame?.remove();return;}
  if(!frame){frame=document.createElement('div');frame.className='workbook-picture-selection';frame.setAttribute('role','group');frame.setAttribute('aria-label','Ukuran gambar terpilih');for(const [direction,label] of Object.entries({nw:'kiri atas',n:'atas',ne:'kanan atas',e:'kanan',se:'kanan bawah',s:'bawah',sw:'kiri bawah',w:'kiri'})){const handle=document.createElement('button');handle.type='button';handle.dataset.pictureResize=direction;handle.setAttribute('aria-label','Ubah ukuran gambar '+label);frame.appendChild(handle);}grid.querySelector('.workbook-canvas').appendChild(frame);}
  for(const property of ['left','top','width','height'])frame.style[property]=node.style[property];
  frame.style.transform=node.style.transform;frame.style.zIndex=node.style.transform?'29':'';
  const {x,y}=activeWorkbook.gridLayout,zoom=(activeWorkbook.view?.zoom||100)/100;
  for(const handle of frame.querySelectorAll('[data-picture-resize]')){const direction=handle.dataset.pictureResize;if(direction.includes('w'))handle.style.left=parseFloat(node.style.left)-grid.scrollLeft<=x[0]+1?5/zoom+'px':'';if(direction.includes('n'))handle.style.top=parseFloat(node.style.top)-grid.scrollTop<=y[0]+1?5/zoom+'px':'';}
  let actions=frame.querySelector('.shape-object-actions');
  if(node.classList.contains('workbook-shape')){if(!actions){actions=document.createElement('div');actions.className='shape-object-actions';actions.innerHTML='<button type="button" data-shape-action="edit">Edit Bentuk</button><button type="button" data-shape-action="delete">Hapus</button>';frame.appendChild(actions);}actions.style.top=parseFloat(node.style.top)<38?'calc(100% + 8px)':'-34px';}else actions?.remove();

}
document.addEventListener('pointerdown',event=>{
  const handle=event.target.closest('[data-picture-resize]');
  let node=event.target.closest('.workbook-image.is-movable');
  if(handle&&workbookDocument())node=document.querySelector('.workbook-image[data-inserted-image="'+CSS.escape(String(activeWorkbook.selectedPicture))+'"]');
  if(!node||event.target.closest('.workbook-shape-editor')||event.button!==0||!workbookDocument(true)||activeWorkbook.saving)return;
  event.preventDefault();const state=activeWorkbook,original=node.dataset.insertedImage.startsWith('original-'),index=Number(node.dataset.insertedImage.replace('original-','')),sheetIndex=state.sheetIndex,sheet=state.book.sheets[sheetIndex],image=original ? sheet.imageMoves?.[index]||sheet.images.find(image=>image.anchorIndex===index) : sheet.insertedImages[index];
  state.editingCell=null;state.selectedPicture=node.dataset.insertedImage;paintWorkbookPictureSelection();syncWorkbookFormatControls();node.focus({preventScroll:true});
  const {grid,x,y}=state.gridLayout,scale=workbookPointerScale(grid),start={x:event.clientX,y:event.clientY,scrollX:grid.scrollLeft,scrollY:grid.scrollTop,left:parseFloat(node.style.left),top:parseFloat(node.style.top),width:parseFloat(node.style.width),height:parseFloat(node.style.height)};
  const capture=handle||node,direction=handle?.dataset.pictureResize;
  let left=start.left,top=start.top,width=start.width,height=start.height;capture.setPointerCapture(event.pointerId);
  const move=e=>{
    const freeze=state.gridLayout.freeze||{rows:0,columns:0},dx=(e.clientX-start.x)/scale.x+(image.column+1<=freeze.columns?0:grid.scrollLeft-start.scrollX),dy=(e.clientY-start.y)/scale.y+(image.row+1<=freeze.rows?0:grid.scrollTop-start.scrollY);
    if(!direction){left=Math.max(x[0],Math.min(x[x.length-1]-1,start.left+dx));top=Math.max(y[0],Math.min(y[y.length-1]-1,start.top+dy));}
    else {
      width=direction.includes('w')||direction.includes('e')?Math.max(24,Math.min(Math.max(2000,start.width),start.width+(direction.includes('w')?-dx:dx))):start.width;
      height=direction.includes('n')||direction.includes('s')?Math.max(24,Math.min(Math.max(2000,start.height),start.height+(direction.includes('n')?-dy:dy))):start.height;
      const proportional=!e.shiftKey&&(direction.length===2||image.kind!=='shape');
      if(proportional){const ratio=start.width/start.height;if(direction==='e'||direction==='w'||direction.length===2&&Math.abs(dx/start.width)>=Math.abs(dy/start.height))height=width/ratio;else width=height*ratio;const fit=Math.min(1,Math.max(2000,start.width)/width,Math.max(2000,start.height)/height);width*=fit;height*=fit;}
      left=direction.includes('w')?Math.max(x[0],start.left+start.width-width):start.left;top=direction.includes('n')?Math.max(y[0],start.top+start.height-height):start.top;
      if(proportional&&direction.length===1){if(direction==='e'||direction==='w')top=Math.max(y[0],start.top+(start.height-height)/2);else left=Math.max(x[0],start.left+(start.width-width)/2);}
    }
    Object.assign(node.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});paintWorkbookPictureSelection();
  };
  const finish=e=>{
    capture.removeEventListener('pointermove',move);capture.removeEventListener('pointerup',finish);capture.removeEventListener('pointercancel',finish);
    if(e.type==='pointercancel'||activeWorkbook!==state||state.sheetIndex!==sheetIndex||!workbookDocument(true)||state.saving){renderWorkbookSheet();return;}
    if(Math.abs(left-start.left)+Math.abs(top-start.top)+Math.abs(width-start.width)+Math.abs(height-start.height)<1)return;
    if(!workbookCheckpoint())return;
    const at=(edges,value)=>Math.max(0,Math.min(edges.length-2,edges.findIndex(edge=>edge>value)-1<0?edges.length-2:edges.findIndex(edge=>edge>value)-1));
    const col=at(x,left),row=at(y,top),moved={...image,column:col,row,x:left-x[col],y:top-y[row],width,height};
    if(original){if(image.toColumn!==null){const right=left+width,bottom=top+height;moved.toColumn=at(x,right);moved.toX=right-x[moved.toColumn];moved.toRow=at(y,bottom);moved.toY=bottom-y[moved.toRow];}sheet.imageMoves={...sheet.imageMoves,[index]:moved};}else sheet.insertedImages[index]=moved;
    state.book.modified.add(sheetIndex);state.historyGroup=null;workbookChanged();restoreWorkbookFocus();
  };
  capture.addEventListener('pointermove',move);capture.addEventListener('pointerup',finish);capture.addEventListener('pointercancel',finish);
});
