'use strict';
function workbookSelectedShape(){
  if(!workbookDocument())return null;
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],key=String(state.selectedPicture??''),original=key.startsWith('original-'),index=Number(key.replace('original-',''));
  if(!key)return null;
  const shape=original?sheet.imageMoves?.[index]||sheet.images.find(image=>image.anchorIndex===index):sheet.insertedImages?.[index];
  return shape?.kind==='shape'&&!shape.hidden?{state,sheet,key,index,original,shape}:null;
}
function workbookShapeNode(shape){
  const node=document.createElement('div');node.className='workbook-image workbook-shape';node.innerHTML=WorkbookShapes.svg(shape.id,shape);
  const group=node.querySelector('g');group.setAttribute('fill',WorkbookShapes.get(shape.id).line||shape.noFill?'none':shape.fill);group.setAttribute('fill-opacity','1');group.setAttribute('stroke',shape.noLine||shape.id==='textBox'?'none':shape.stroke);group.setAttribute('stroke-width',shape.lineWidth);
  // Paint the geometry itself as well as its group, so the outline remains
  // explicit for every preset at any sheet zoom or object size.
  node.querySelectorAll('path,rect,circle,ellipse,polygon').forEach(element=>{element.setAttribute('vector-effect','non-scaling-stroke');for(const name of ['fill','stroke','stroke-width'])element.setAttribute(name,group.getAttribute(name));});
  const label=document.createElement('span'),text=document.createElement('span');label.className='workbook-shape-label';text.className='workbook-shape-text';text.textContent=shape.text;label.appendChild(text);
  Object.assign(label.style,{color:shape.textColor,fontSize:shape.fontSize+'pt',fontFamily:shape.fontName||'Arial',fontWeight:shape.bold?'700':'400',fontStyle:shape.italic?'italic':'normal',textDecoration:shape.underline?'underline':'none',textAlign:shape.horizontal||'center',justifyContent:{top:'flex-start',bottom:'flex-end'}[shape.vertical]||'center',whiteSpace:shape.wrap===false?'pre':'pre-wrap'});
  // Label and editor share native font metrics before worksheet scaling.
  const layer=workbookTextLayer(label,shape.width,shape.height,activeWorkbook.gridLayout.zoom);layer.classList.add('workbook-shape-text-layer');node.appendChild(layer);
  if(shape.nativePreview&&!shape.shapeStyleChanged){node.querySelector('svg').style.visibility='hidden';label.style.visibility='hidden';const preview=document.createElement('img');preview.className='workbook-shape-native-preview';preview.alt='';preview.draggable=false;preview.onerror=()=>{node.querySelector('svg').style.visibility='';label.style.visibility='';preview.remove();};preview.src=shape.nativePreview;node.appendChild(preview);}
  return node;
}
function resizeWorkbookShapeText(node,width,height){
  const layer=node.querySelector('.workbook-shape-text-layer');if(layer){layer.style.width=width+'px';layer.style.height=height+'px';}
}
function updateWorkbookShape(patch,repaint=true){
  const current=workbookSelectedShape();if(!current||!workbookDocument(true)||current.state.saving)return false;
  const next={...current.shape,...patch,shapeStyleChanged:true};WorkbookShapes.validate(next);
  if(!workbookCheckpoint())return false;
  if(current.original)current.sheet.imageMoves={...current.sheet.imageMoves,[current.index]:next};else current.sheet.insertedImages[current.index]=next;
  current.state.book.modified.add(current.state.sheetIndex);current.state.historyGroup=null;
  if(repaint)workbookChanged();else{current.state.dirty=true;current.state.edits++;document.getElementById('workbook-save-status').textContent='Perubahan belum disimpan';highlightWorkbookRange();}
  return true;
}
function workbookShapeStyle(){
  const shape=workbookSelectedShape()?.shape;if(!shape)return null;
  return {fontName:shape.fontName||'Arial',fontSize:shape.fontSize,color:shape.textColor,background:shape.noFill?'none':shape.fill,bold:!!shape.bold,italic:!!shape.italic,underline:!!shape.underline,wrap:shape.wrap!==false,horizontal:shape.horizontal||'center',vertical:shape.vertical||'center'};
}
function formatWorkbookShape(property,value){
  const properties={fontName:'fontName',fontSize:'fontSize',color:'textColor',background:'fill',bold:'bold',italic:'italic',underline:'underline',wrap:'wrap',horizontal:'horizontal',vertical:'vertical'};
  if(!properties[property])return false;
  const patch={[properties[property]]:property==='fontSize'?Number(value):value};if(property==='background'){patch.noFill=value==='none';if(patch.noFill)delete patch.fill;}
  return updateWorkbookShape(patch);
}
function beginWorkbookShapeText(node){
  const current=workbookSelectedShape();if(!current||!workbookDocument(true)||current.state.saving||node.querySelector('.workbook-shape-editor'))return;
  const {state,shape,key}=current,index=state.sheetIndex,label=node.querySelector('.workbook-shape-label'),previousVisibility=label.style.visibility,surface=document.createElement('span'),editor=document.createElement('textarea');
  editor.className='workbook-shape-editor';editor.setAttribute('aria-label','Teks bentuk');editor.maxLength=1000;editor.value=shape.text;
  editor.wrap=shape.wrap===false?'off':'soft';surface.className='workbook-shape-label workbook-shape-editing-area';surface.style.cssText=label.style.cssText;surface.style.visibility='';surface.appendChild(editor);label.style.visibility='hidden';label.parentElement.appendChild(surface);node.classList.add('is-text-editing');
  // A textarea cannot vertically align its own text. Size it to the text, then
  // let the same flex layout used by the label place it inside the shape.
  const sizeText=()=>{editor.style.height='0px';editor.style.height=editor.scrollHeight+'px';};
  const observer=new ResizeObserver(sizeText);observer.observe(surface);editor.addEventListener('input',sizeText);sizeText();
  let finished=false;
  const finish=cancel=>{
    if(finished)return;finished=true;
    const selected=workbookSelectedShape();let committed=false;
    if(!cancel&&state===activeWorkbook&&state.sheetIndex===index&&selected?.key===key&&selected.shape===shape&&editor.value!==shape.text){
      try{if(updateWorkbookShape({text:editor.value},false)){committed=true;label.firstElementChild.textContent=editor.value;node.querySelector('svg').style.visibility='';node.querySelector('.workbook-shape-native-preview')?.remove();}}catch(error){toast(error.message,true);}
    }
    observer.disconnect();surface.remove();label.style.visibility=committed?'':previousVisibility;node.classList.remove('is-text-editing');
  };
  editor.addEventListener('blur',()=>finish(false));
  editor.addEventListener('keydown',event=>{
    if(event.key==='Escape'||(event.ctrlKey||event.metaKey)&&['Enter','s'].includes(event.key)){
      event.preventDefault();event.stopPropagation();const save=event.key==='s';finish(event.key==='Escape');restoreWorkbookFocus();if(save)saveWorkbookChanges();
    }
  });
  editor.focus({preventScroll:true});editor.setSelectionRange(editor.value.length,editor.value.length);
}
function insertWorkbookShape(id,text='',reference=activeWorkbook?.selected){
  if(!workbookDocument(true)||activeWorkbook.saving)throw new Error('Dokumen tidak dapat diedit.');
  const state=activeWorkbook,index=state.sheetIndex,sheet=state.book.sheets[index],item=WorkbookShapes.get(id);
  if(!item)throw new Error('Bentuk tidak valid.');
  const point=WorkbookFormat.range(sheet,reference).first;
  if([...sheet.images.map(image=>sheet.imageMoves?.[image.anchorIndex]||image),...(sheet.insertedImages||[])].filter(image=>image.kind==='shape'&&!image.hidden).length>=200)throw new Error('Maksimal 200 bentuk per worksheet.');
  const shape={kind:'shape',id:item.id,text,fill:'#dce9ff',stroke:'#1f4e78',textColor:'#173250',fontName:'Arial',fontSize:11,lineWidth:2,noFill:Boolean(item.textBox||item.line),noLine:Boolean(item.textBox),column:point.column-1,row:point.row-1,x:0,y:0,width:item.textBox?240:160,height:item.line?70:90,toColumn:null,toRow:null,toX:0,toY:0};
  WorkbookShapes.validate(shape);if(!workbookCheckpoint())throw new Error('Dokumen sedang disimpan.');
  sheet.insertedImages ||= [];sheet.insertedImages.push(shape);state.selectedPicture=String(sheet.insertedImages.length-1);state.book.modified.add(index);state.historyGroup=null;workbookChanged();
  try{const recent=JSON.parse(localStorage.getItem('docuflow.recent-shapes')||'[]');localStorage.setItem('docuflow.recent-shapes',JSON.stringify([id,...recent.filter(old=>old!==id&&WorkbookShapes.get(old))].slice(0,10)));}catch{}
  return shape;
}
function showWorkbookTextBox(){
  if(!workbookDocument(true)||activeWorkbook.saving)return;
  const state=activeWorkbook,index=state.sheetIndex,reference=state.selected;
  showModal(`${modalHeading('Text Box')}<form id="text-box-form"><div class="field"><label for="text-box-text">Isi Text Box</label><textarea id="text-box-text" rows="4" maxlength="1000" placeholder="Ketik teks di sini..."></textarea><small>Kotak teks bisa digeser, diubah ukurannya, dan diedit dengan double-click.</small></div><div id="text-box-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Sisipkan Text Box</button></div></form>`);
  document.getElementById('text-box-form').onsubmit=event=>{
    event.preventDefault();if(!event.target.isConnected||!modal.open)return;
    try{if(state!==activeWorkbook||state.sheetIndex!==index||!workbookDocument(true)||state.saving)throw new Error('Dokumen berubah. Buka kembali Text Box.');insertWorkbookShape('textBox',document.getElementById('text-box-text').value,reference);modal.close();document.querySelector('.workbook-shape[data-inserted-image="'+state.selectedPicture+'"]')?.focus({preventScroll:true});}
    catch(error){document.getElementById('text-box-error').textContent=error.message;}
  };
}
function showWorkbookShapes(){
  if(!workbookDocument(true)||activeWorkbook.saving)return;
  const state=activeWorkbook,index=state.sheetIndex,reference=state.selected;
  let recent=[];try{recent=JSON.parse(localStorage.getItem('docuflow.recent-shapes')||'[]').filter(id=>WorkbookShapes.get(id)).slice(0,10);}catch{}
  const button=item=>`<button type="button" class="shape-choice" data-insert-shape="${item.id}" data-shape-search="${esc((item.label+' '+item.group).toLowerCase())}" aria-label="${esc(item.label)}" title="${esc(item.label)}">${item.textBox?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="2" y="2" width="20" height="20" stroke-dasharray="2 2"/><path d="m6 18 6-12 6 12M8 14h8"/></svg>':WorkbookShapes.svg(item.id)}</button>`;
  const groups=[...new Set(WorkbookShapes.items.map(item=>item.group))];
  showModal(`${modalHeading('Shapes')}<div class="field"><label for="shape-search">Cari bentuk</label><input id="shape-search" type="search" placeholder="Rectangle, arrow, flowchart..."></div><div class="shape-gallery">${recent.length?'<section class="shape-gallery-group"><h3>Recently Used Shapes</h3><div class="shape-choice-list">'+recent.map(id=>button(WorkbookShapes.get(id))).join('')+'</div></section>':''}${groups.map(group=>`<section class="shape-gallery-group"><h3>${esc(group)}</h3><div class="shape-choice-list">${WorkbookShapes.items.filter(item=>item.group===group).map(button).join('')}</div></section>`).join('')}</div><p id="shape-no-results" class="small muted" hidden>Bentuk tidak ditemukan.</p><p class="small muted">Pilih bentuk, lalu geser atau ubah ukurannya di lembar kerja. Double-click bentuk untuk mengisi teks dan mengatur warnanya.</p><div id="shape-gallery-error" class="form-error" role="alert"></div>`,'shape-gallery-modal');
  modal.classList.add('shape-gallery-modal');
  document.getElementById('shape-search').oninput=event=>{let count=0;modal.querySelectorAll('.shape-choice').forEach(button=>{button.hidden=!button.dataset.shapeSearch.includes(event.target.value.trim().toLowerCase());if(!button.hidden)count++;});modal.querySelectorAll('.shape-gallery-group').forEach(group=>{group.hidden=![...group.querySelectorAll('.shape-choice')].some(button=>!button.hidden);});document.getElementById('shape-no-results').hidden=Boolean(count);};
  modal.querySelectorAll('[data-insert-shape]').forEach(button=>button.onclick=()=>{
    if(!button.isConnected||!modal.open)return;
    try{
      if(state!==activeWorkbook||state.sheetIndex!==index||!workbookDocument(true)||state.saving)throw new Error('Dokumen berubah. Buka kembali Shapes.');
      insertWorkbookShape(button.dataset.insertShape,'',reference);modal.close();
      document.querySelector('.workbook-shape[data-inserted-image="'+state.selectedPicture+'"]')?.focus({preventScroll:true});
    }catch(error){document.getElementById('shape-gallery-error').textContent=error.message;}
  });
}
function editWorkbookShape(){
  const selected=workbookSelectedShape();if(!selected||!workbookDocument(true)||activeWorkbook.saving)return;
  const {state,shape,key}=selected,index=state.sheetIndex;
  showModal(`${modalHeading('Format Shape')}<form id="shape-format-form"><div class="field"><label for="shape-text">Teks bentuk</label><textarea id="shape-text" name="text" maxlength="1000" rows="3">${esc(shape.text)}</textarea></div><div class="form-grid"><div class="field"><label for="shape-fill">Warna isi</label><input id="shape-fill" name="fill" type="color" value="${esc(shape.fill)}"></div><div class="field" ${shape.id==='textBox'?'hidden':''}><label for="shape-stroke">Warna garis</label><input id="shape-stroke" name="stroke" type="color" value="${esc(shape.stroke)}"></div><div class="field"><label for="shape-text-color">Warna teks</label><input id="shape-text-color" name="textColor" type="color" value="${esc(shape.textColor)}"></div><div class="field"><label for="shape-font-size">Ukuran teks (pt)</label><input id="shape-font-size" name="fontSize" type="number" min="1" max="409" step="any" value="${shape.fontSize}"></div><div class="field" ${shape.id==='textBox'?'hidden':''}><label for="shape-line-width">Tebal garis (px)</label><input id="shape-line-width" name="lineWidth" type="number" min="1" max="12" step="any" value="${shape.lineWidth}"></div><label class="shape-no-fill"><input type="checkbox" name="noFill" ${shape.noFill?'checked':''}> Tanpa warna isi</label></div><div id="shape-format-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Terapkan Bentuk</button></div></form>`);
  document.getElementById('shape-fill').onchange=()=>{document.querySelector('#shape-format-form [name=noFill]').checked=false;};
  document.getElementById('shape-format-form').onsubmit=event=>{
    event.preventDefault();try{
      const current=workbookSelectedShape();if(state!==activeWorkbook||state.sheetIndex!==index||!workbookDocument(true)||state.saving||current?.key!==key||current.shape!==shape)throw new Error('Dokumen berubah. Buka kembali format bentuk.');
      const data=new FormData(event.target),next={...shape,shapeStyleChanged:true,text:String(data.get('text')),fill:String(data.get('fill')),stroke:String(data.get('stroke')),textColor:String(data.get('textColor')),fontSize:Number(data.get('fontSize')),lineWidth:Number(data.get('lineWidth')),noFill:data.has('noFill')};WorkbookShapes.validate(next);
      if(!workbookCheckpoint())return;
      if(current.original)current.sheet.imageMoves={...current.sheet.imageMoves,[current.index]:next};else current.sheet.insertedImages[current.index]=next;
      state.book.modified.add(index);state.historyGroup=null;workbookChanged();modal.close();document.querySelector('.workbook-shape[data-inserted-image="'+CSS.escape(key)+'"]')?.focus({preventScroll:true});
    }catch(error){document.getElementById('shape-format-error').textContent=error.message;}
  };
}
document.addEventListener('dblclick',event=>{const node=event.target.closest('.workbook-shape.is-movable');if(node&&!event.target.closest('textarea')){event.preventDefault();beginWorkbookShapeText(node);}});

// Commit before selection changes. Keep the object DOM in place so the same
// pointer gesture can select/drag another object or a cell without losing text.
document.addEventListener('pointerdown',event=>{const editor=document.querySelector('.workbook-shape-editor');if(editor&&!editor.contains(event.target))editor.blur();},true);
