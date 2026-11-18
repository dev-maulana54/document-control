'use strict';

function workbookContextObject(key=activeWorkbook?.selectedPicture){
  if(!workbookDocument()||key===null||key===undefined)return null;
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],original=String(key).startsWith('original-'),index=Number(String(key).replace('original-',''));
  const image=original?sheet.imageMoves?.[index]||sheet.images.find(image=>image.anchorIndex===index):sheet.insertedImages?.[index];
  return image&&!image.hidden?{state,sheet,key:String(key),original,index,image}:null;
}
function validWorkbookObjectContext(c){
  const current=workbookContextObject(c.key);
  return current&&current.state===c.state&&c.sheet===current.sheet&&c.version===c.state.recordVersion&&current.image===c.image&&String(c.state.selectedPicture)===c.key&&workbookDocument(true)&&!c.state.saving;
}
function focusWorkbookObject(c){
  if(workbookContextObject(c.key)?.sheet!==c.sheet)return;
  document.querySelector('#workbook-grid .workbook-image[data-inserted-image="'+CSS.escape(c.key)+'"]')?.focus({preventScroll:true});
}
function changeWorkbookContextObject(c,patch){
  if(!validWorkbookObjectContext(c))return false;
  const next={...c.image,...patch};if(next.kind==='shape')WorkbookShapes.validate(next);
  if(!workbookCheckpoint())return false;
  if(c.original)c.sheet.imageMoves={...c.sheet.imageMoves,[c.index]:next};else c.sheet.insertedImages[c.index]=next;
  c.image=next;c.state.book.modified.add(c.state.sheetIndex);c.state.historyGroup=null;workbookChanged();return true;
}
function deleteWorkbookObject(selected=workbookContextObject()){
  if(!selected||document.getElementById('modal')?.open)return false;
  const context={...selected,version:selected.state.recordVersion};
  if(!changeWorkbookContextObject(context,{hidden:true}))return false;
  context.state.selectedPicture=null;paintWorkbookPictureSelection();syncWorkbookFormatControls();restoreWorkbookFocus();return true;
}
function workbookObjectSizePatch(c,width,height){
  const patch={width,height};
  // Keep native two-cell anchors valid when the drawing is exported or reloaded.
  if(Number.isInteger(c.image.toColumn)&&Number.isInteger(c.image.toRow)){
    const {x,y}=c.state.gridLayout,right=x[c.image.column]+c.image.x+width,bottom=y[c.image.row]+c.image.y+height;
    const at=(edges,value)=>{const next=edges.findIndex(edge=>edge>value);return Math.max(0,Math.min(edges.length-2,next<0?edges.length-2:next-1));};
    patch.toColumn=at(x,right);patch.toX=right-x[patch.toColumn];patch.toRow=at(y,bottom);patch.toY=bottom-y[patch.toRow];
  }
  return patch;
}
function showWorkbookObjectSize(c){
  if(!validWorkbookObjectContext(c))return;
  const node=document.querySelector('.workbook-image[data-inserted-image="'+CSS.escape(c.key)+'"]'),width=parseFloat(node?.style.width)||c.image.width,height=parseFloat(node?.style.height)||c.image.height;
  showModal(`${modalHeading('Size and Properties')}<form id="object-size-form"><div class="form-grid"><div class="field"><label for="object-width">Lebar objek (px)</label><input id="object-width" name="width" type="number" min="1" max="${Math.max(2000,width)}" step="any" value="${width}" required></div><div class="field"><label for="object-height">Tinggi objek (px)</label><input id="object-height" name="height" type="number" min="1" max="${Math.max(2000,height)}" step="any" value="${height}" required></div></div><p class="small muted">Ukuran mengikuti koordinat worksheet pada zoom 100%.</p><div id="object-size-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Terapkan Ukuran</button></div></form>`);
  document.getElementById('object-size-form').onsubmit=event=>{
    event.preventDefault();try{
      if(!validWorkbookObjectContext(c))throw new Error('Dokumen berubah. Buka kembali ukuran objek.');
      const data=new FormData(event.target),nextWidth=Number(data.get('width')),nextHeight=Number(data.get('height'));
      if(!Number.isFinite(nextWidth)||!Number.isFinite(nextHeight)||nextWidth<1||nextHeight<1||nextWidth>Math.max(2000,width)||nextHeight>Math.max(2000,height))throw new Error('Ukuran objek tidak valid.');
      if(changeWorkbookContextObject(c,workbookObjectSizePatch(c,nextWidth,nextHeight))){modal.close();focusWorkbookObject(c);}
    }catch(error){document.getElementById('object-size-error').textContent=error.message;}
  };
}
function openWorkbookObjectContext(node,x,y){
  if(!workbookDocument(true)||activeWorkbook.saving||modal.open)return;
  const selected=workbookContextObject(node.dataset.insertedImage);if(!selected)return;
  closeWorkbookContext();const c={...selected,version:selected.state.recordVersion};
  c.state.editingCell=null;c.state.selectedPicture=c.key;paintWorkbookPictureSelection();syncWorkbookFormatControls();
  const shape=c.image.kind==='shape',menu=document.createElement('div');menu.id='workbook-context-menu';menu.className='workbook-context-menu';menu.setAttribute('role','dialog');menu.setAttribute('aria-label',shape?'Menu bentuk':'Menu gambar');
  const actions=[...(shape?[['text','Edit Text'],['format','Format Shape...']]:[]),['size','Size and Properties...'],['delete','Delete']];
  menu.innerHTML=(shape?`<div class="context-mini-toolbar" aria-label="Format cepat bentuk">${[['bold','Bold','<b>B</b>'],['italic','Italic','<i>I</i>'],['underline','Underline','<u>U</u>']].map(([property,label,icon])=>`<button type="button" data-object-format="${property}" aria-label="${label}" aria-pressed="${Boolean(c.image[property])}">${icon}</button>`).join('')}<label title="Warna teks">A<input type="color" data-object-color="textColor" aria-label="Warna teks bentuk" value="${c.image.textColor}"></label><label title="Warna isi">&#9632;<input type="color" data-object-color="fill" aria-label="Warna isi bentuk" value="${c.image.fill}"></label></div><div class="context-mini-toolbar" aria-label="Alignment bentuk">${[['left','Left'],['center','Center'],['right','Right']].map(([value,label])=>`<button type="button" data-object-align="${value}" aria-label="Align ${label}" aria-pressed="${(c.image.horizontal||'center')===value}">${ribbonIcon(value)}</button>`).join('')}</div>`:'')+`<div role="menu">${actions.map(([action,label])=>`<button type="button" role="menuitem" data-object-action="${action}">${label}</button>`).join('')}</div>`;
  document.body.appendChild(menu);
  for(const icon of menu.querySelectorAll('svg')){icon.setAttribute('width','18');icon.setAttribute('height','18');}
  const scale=workbookPointerScale(document.querySelector('.workbook-workspace'));menu.style.maxHeight=(innerHeight-16)/scale.y+'px';menu.style.maxWidth=(innerWidth-16)/scale.x+'px';const rect=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x,innerWidth-rect.width-8))/scale.x+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-rect.height-8))/scale.y+'px';
  const format=patch=>{
    try{if(!validWorkbookObjectContext(c)){closeWorkbookContext();return;}if(updateWorkbookShape(patch)){c.image=workbookContextObject(c.key).image;for(const button of menu.querySelectorAll('[data-object-format]'))button.setAttribute('aria-pressed',String(Boolean(c.image[button.dataset.objectFormat])));for(const button of menu.querySelectorAll('[data-object-align]'))button.setAttribute('aria-pressed',String((c.image.horizontal||'center')===button.dataset.objectAlign));}}
    catch(error){toast(error.message,true);}
  };
  menu.onclick=event=>{
    const toggle=event.target.closest('[data-object-format]'),align=event.target.closest('[data-object-align]');if(toggle)format({[toggle.dataset.objectFormat]:!c.image[toggle.dataset.objectFormat]});if(align)format({horizontal:align.dataset.objectAlign});
    const button=event.target.closest('[data-object-action]');if(!button)return;
    closeWorkbookContext();if(!validWorkbookObjectContext(c))return;
    const action=button.dataset.objectAction;
    if(action==='text'){focusWorkbookObject(c);beginWorkbookShapeText(document.querySelector('.workbook-shape[data-inserted-image="'+CSS.escape(c.key)+'"]'));}
    else if(action==='format')editWorkbookShape();
    else if(action==='size')showWorkbookObjectSize(c);
    else if(action==='delete')deleteWorkbookObject(c);
  };
  menu.onchange=event=>{const input=event.target.closest('[data-object-color]');if(input)format({[input.dataset.objectColor]:input.value,...(input.dataset.objectColor==='fill'?{noFill:false}:{})});};
  menu.onkeydown=event=>{
    const buttons=[...menu.querySelectorAll('[data-object-action]')],at=buttons.indexOf(document.activeElement);
    if(event.key==='Escape'){event.preventDefault();closeWorkbookContext();focusWorkbookObject(c);}
    else if(at>=0&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}
  };
  menu.addEventListener('focusout',()=>setTimeout(()=>{if(menu.isConnected&&!menu.contains(document.activeElement))closeWorkbookContext();},0));
  menu.querySelector('[data-object-action]')?.focus({preventScroll:true});
}
document.addEventListener('contextmenu',event=>{
  const node=event.target.closest('#workbook-grid .workbook-image.is-movable');if(!node||event.target.closest('.workbook-shape-editor')||!workbookDocument(true))return;
  event.preventDefault();openWorkbookObjectContext(node,event.clientX,event.clientY);
});
document.addEventListener('keydown',event=>{
  if(!(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)||event.target.matches('input,textarea'))return;
  const node=event.target.closest('#workbook-grid .workbook-image.is-movable');if(!node||!workbookDocument(true))return;
  event.preventDefault();event.stopImmediatePropagation();const rect=node.getBoundingClientRect();openWorkbookObjectContext(node,rect.left+Math.min(20,rect.width),rect.top+Math.min(20,rect.height));
},true);
document.addEventListener('keydown',event=>{
  if(!['Delete','Backspace'].includes(event.key)||event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  const target=event.target;if(!(target instanceof Element)||target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
  const selected=workbookContextObject(),node=target.closest('#workbook-grid .workbook-image.is-movable'),handle=target.closest('#workbook-grid .workbook-picture-selection [data-picture-resize]');
  if(!selected||!node&&!handle||node&&node.dataset.insertedImage!==selected.key)return;
  try{if(deleteWorkbookObject(selected))event.preventDefault();}catch(error){toast(error.message,true);}
});
