'use strict';

function workbookColorTool(property,label){
  return `<button type="button" class="ribbon-color-tool" data-color-menu="${property}" aria-label="${label}" title="${label}" aria-haspopup="dialog" aria-expanded="false"><span class="ribbon-color-glyph">${property==='background'?ribbonIcon('fill'):'<span aria-hidden="true">A</span>'}<i aria-hidden="true"></i></span><span aria-hidden="true" class="ribbon-color-arrow">⌄</span></button>`;
}
function syncWorkbookColorTools(){
  const style=workbookCurrentStyle();
  document.querySelectorAll('[data-color-menu]').forEach(button=>{const value=style[button.dataset.colorMenu],color=/^#[a-f\d]{6}$/i.test(value)?value:null;button.style.setProperty('--selected-color',color||(button.dataset.colorMenu==='color'?'#000000':'transparent'));button.classList.toggle('is-no-fill',!color&&button.dataset.colorMenu==='background');});
}
function closeWorkbookColors(focus=false){
  const menu=document.getElementById('workbook-color-menu'),button=menu&&document.querySelector('[data-color-menu="'+menu.dataset.property+'"]');menu?.remove();document.querySelectorAll('[data-color-menu]').forEach(n=>n.setAttribute('aria-expanded','false'));if(focus)button?.focus({preventScroll:true});
}
function workbookColorContext(property){
  const state=activeWorkbook,shape=workbookSelectedShape();
  return {state,property,index:state.sheetIndex,address:workbookRange(),key:state.key,version:state.recordVersion,edits:state.edits,shapeKey:shape?.key,shape:shape?.shape};
}
function validWorkbookColorContext(context){
  const shape=workbookSelectedShape();
  return context.state===activeWorkbook&&context.index===activeWorkbook?.sheetIndex&&context.key===activeWorkbook.key&&context.version===activeWorkbook.recordVersion&&context.edits===activeWorkbook.edits&&workbookDocument(true)&&!activeWorkbook.saving&&context.shapeKey===shape?.key&&context.shape===shape?.shape;
}
function applyWorkbookColor(context,value){
  if(!validWorkbookColorContext(context))return false;
  if(value!=='none'&&!/^#[a-f\d]{6}$/i.test(value)||value==='none'&&context.property!=='background')return false;
  applyWorkbookFormat(context.property,value,context.address);return true;
}
function showWorkbookMoreColors(context){
  if(!validWorkbookColorContext(context))return;
  const current=workbookCurrentStyle()[context.property],value=/^#[a-f\d]{6}$/i.test(current)?current:'#000000';
  showModal(`${modalHeading('More Colors')}<form id="workbook-more-colors"><div class="field"><label for="workbook-custom-color">Pilih warna</label><input id="workbook-custom-color" type="color" value="${value}"></div><div class="field"><label for="workbook-color-hex">Kode warna HEX</label><input id="workbook-color-hex" type="text" value="${value}" maxlength="7" autocomplete="off" spellcheck="false" placeholder="#RRGGBB" required></div><div id="workbook-color-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Terapkan Warna</button></div></form>`);
  const form=document.getElementById('workbook-more-colors'),picker=document.getElementById('workbook-custom-color'),hex=document.getElementById('workbook-color-hex');
  picker.oninput=()=>{hex.value=picker.value;};hex.oninput=()=>{if(/^#[a-f\d]{6}$/i.test(hex.value))picker.value=hex.value;};
  form.onsubmit=event=>{
    event.preventDefault();if(!form.isConnected||!modal.open)return;
    const color=hex.value.trim();if(!/^#[a-f\d]{6}$/i.test(color)){document.getElementById('workbook-color-error').textContent='Gunakan kode warna seperti #2463EB.';return;}
    if(!validWorkbookColorContext(context)){document.getElementById('workbook-color-error').textContent='Pilihan berubah. Buka kembali palet warna.';return;}
    modal.close();applyWorkbookColor(context,color);restoreWorkbookFocus();
  };
}
function showWorkbookColors(button){
  if(!workbookDocument(true)||activeWorkbook.saving)return;
  const property=button.dataset.colorMenu;if(!['background','color'].includes(property))return;
  if(document.getElementById('workbook-color-menu')?.dataset.property===property){closeWorkbookColors(true);return;}
  closeWorkbookColors();closeWorkbookFonts();closeWorkbookBorders();
  const context=workbookColorContext(property),book=context.state.book,menu=document.createElement('div');menu.id='workbook-color-menu';menu.className='workbook-color-menu';menu.dataset.property=property;menu.setAttribute('role','dialog');menu.setAttribute('aria-label',property==='background'?'Palet warna isi':'Palet warna teks');
  const fallback=['#ffffff','#000000','#e7e6e6','#0e2841','#156082','#e97132','#196b24','#0f9ed5','#a02b93','#4ea72e'],base=fallback.map((color,i)=>/^#[a-f\d]{6}$/i.test(book.palette?.theme?.[i])?book.palette.theme[i].toLowerCase():color),current=workbookCurrentStyle()[property];
  const swatch=color=>`<button type="button" data-color-value="${color}" aria-label="${color.toUpperCase()}" title="${color.toUpperCase()}" aria-pressed="${String(current?.toLowerCase()===color)}" style="background:${color}"></button>`;
  const tint=(color,value)=>{const node=document.createElement('color');node.setAttribute('rgb',color.slice(1));node.setAttribute('tint',value);return WorkbookEngine.color(node);};
  const shades=base.map((color,i)=>(i===0?[-.05,-.15,-.25,-.35,-.5]:i===1?[.5,.35,.25,.15,.05]:[.8,.6,.4,-.25,-.5]).map(value=>tint(color,value)));
  menu.innerHTML='<h3>Theme Colors</h3><div class="workbook-color-swatches theme-bases" role="group" aria-label="Theme Colors">'+base.map(swatch).join('')+'</div><div class="workbook-color-swatches theme-shades" role="group" aria-label="Variasi Theme Colors">'+Array.from({length:5},(_,row)=>shades.map(column=>swatch(column[row])).join('')).join('')+'</div><h3 class="color-section">Standard Colors</h3><div class="workbook-color-swatches" role="group" aria-label="Standard Colors">'+['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0'].map(swatch).join('')+'</div>'+(property==='background'?'<button type="button" class="workbook-color-option color-section" data-color-none><span aria-hidden="true">▧</span>No Fill</button>':'')+'<button type="button" class="workbook-color-option color-section" data-color-more><span aria-hidden="true">◉</span>More Colors...</button>';
  document.body.appendChild(menu);button.setAttribute('aria-expanded','true');
  const anchor=button.getBoundingClientRect(),scale=workbookPointerScale(document.querySelector('.workbook-workspace'));menu.style.maxWidth=(innerWidth-16)/scale.x+'px';menu.style.maxHeight=(innerHeight-16)/scale.y+'px';const rect=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(anchor.left,innerWidth-rect.width-8))/scale.x+'px';menu.style.top=Math.max(8,Math.min(anchor.bottom+4,innerHeight-rect.height-8))/scale.y+'px';
  menu.onclick=event=>{const option=event.target.closest('button');if(!option)return;closeWorkbookColors();if(option.hasAttribute('data-color-more'))showWorkbookMoreColors(context);else applyWorkbookColor(context,option.hasAttribute('data-color-none')?'none':option.dataset.colorValue);};
  menu.onkeydown=event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeWorkbookColors(true);return;}
    if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();const options=[...menu.querySelectorAll('button')],index=options.indexOf(document.activeElement),offset={ArrowRight:1,ArrowLeft:-1,ArrowDown:10,ArrowUp:-10}[event.key];options[event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,index+offset))]?.focus({preventScroll:true});
  };
  menu.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});if(!menu.contains(document.activeElement))menu.querySelector('button').focus({preventScroll:true});
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-color-menu]');if(button)showWorkbookColors(button);});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#workbook-color-menu,[data-color-menu]'))closeWorkbookColors();},true);
document.addEventListener('focusin',event=>{if(!event.target.closest('#workbook-color-menu,[data-color-menu]'))closeWorkbookColors();});
for(const type of ['resize','hashchange','storage'])window.addEventListener(type,()=>closeWorkbookColors());
