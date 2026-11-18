'use strict';

function ribbonIcon(name) {
  const paths = {
    paste: '<rect x="6" y="5" width="13" height="17" rx="1" fill="#fff5d5"/><path d="M9 5V3h7v2M10 10h5m-5 4h5m-5 4h5"/><path d="M5 8H3v13h10"/>',
    fill: '<path d="m9 3 11 10-8 8L1 11l8-8Z"/><path d="m6 1 6 10M3 13h15m3 2s-3 3-3 5a3 3 0 0 0 6 0c0-2-3-5-3-5Z"/>',
    copy: '<rect x="8" y="7" width="12" height="15" rx="1"/><path d="M15 4H4v14"/>',
    cut: '<circle cx="6" cy="18" r="3"/><circle cx="17" cy="18" r="3"/><path d="M8 15 17 2M15 15 6 2"/>',
    undo: '<path d="m8 5-5 5 5 5M4 10h10a6 6 0 0 1 0 12"/>',
    redo: '<path d="m16 5 5 5-5 5m4-5H10a6 6 0 0 0 0 12"/>',
    left: '<path d="M3 5h18M3 10h12M3 15h18M3 20h12"/>',
    center: '<path d="M3 5h18M6 10h12M3 15h18M6 20h12"/>',
    right: '<path d="M3 5h18M9 10h12M3 15h18M9 20h12"/>',
    top: '<path d="M3 3h18M7 8h10M7 12h10M7 16h10"/>',
    middle: '<path d="M3 3h18M7 9h10M7 13h10M7 17h10M3 23h18"/>',
    bottom: '<path d="M7 8h10M7 12h10M7 16h10M3 21h18"/>',
    wrap: '<path d="M3 5h12M3 10h16a4 4 0 0 1 0 8h-7m3-3-3 3 3 3M3 15h4M3 20h4"/>',
    merge: '<rect x="2" y="5" width="20" height="14"/><path d="M9 5v4m0 6v4m6-14v4m0 6v4M4 12h5m-2-2 2 2-2 2m13-2h-5m2-2-2 2 2 2"/>',
    unmerge: '<rect x="2" y="5" width="20" height="14"/><path d="M10 5v14m4-14v14m-6-7H4m2-2-2 2 2 2m10-2h4m-2-2 2 2-2 2"/>',
    grid: '<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v18m6-18v18"/>',
    clear: '<path d="m14 3 8 7-10 12H5l-4-4L14 3Z"/><path d="m7 11 8 7m-3 4h10"/>',
    find: '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',
    row: '<rect x="2" y="4" width="20" height="16"/><path d="M2 10h20M2 14h20M8 4v16m8-16v16"/><path d="M2 10h20v4H2z" fill="#cfe3ff"/>',
    column: '<rect x="2" y="4" width="20" height="16"/><path d="M2 10h20M2 14h20M8 4v16m8-16v16"/><path d="M8 4h8v16H8z" fill="#cfe3ff"/>'
  };
  return `<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

function workbookToolbar() {
  const button = (action, label, content = label, extra = '') => `<button type="button" data-format-action="${action}" aria-label="${label}" title="${label}${action==='undo'?' (Ctrl+Z)':action==='redo'?' (Ctrl+Y)':''}" ${extra}>${content}</button>`;
  const select = (property, label, items) => `<label class="ribbon-select"><span class="visually-hidden">${label}</span><select data-native-select data-format-property="${property}" aria-label="${label}">${items.map(([value,text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
  const action = (name, label, content, extra = '') => `<button type="button" data-ribbon-action="${name}" aria-label="${label}" title="${label}" ${extra}>${content}</button>`;
  const align = (property, value, label, glyph) => `<button type="button" data-ribbon-property="${property}" data-value="${value}" aria-label="${label}" title="${label}" aria-pressed="false">${ribbonIcon(glyph)}</button>`;
  const group = (label, content, className = '') => `<div class="ribbon-group ${className}" role="group" aria-label="${label} tools"><div class="ribbon-group-content">${content}</div><span class="ribbon-group-caption">${label}</span></div>`;
  return `<div class="excel-ribbon" aria-label="Ribbon editor Excel"><div class="ribbon-quick-access">${action('save','Simpan workbook',icon('save'))}${button('undo','Undo',ribbonIcon('undo'))}${button('redo','Redo',ribbonIcon('redo'))}<span>Document Control</span><span class="ribbon-save-label">Ctrl+Z Undo | Ctrl+Y Redo | Ctrl+S Simpan</span><div class="ribbon-display-controls"><button type="button" data-ribbon-display="toggle" aria-label="Tampilkan/sembunyikan ribbon" aria-expanded="true" title="Tampilkan/sembunyikan ribbon">&#8963;</button><button type="button" data-ribbon-display="pin" aria-label="Pin ribbon" aria-pressed="true" title="Pin ribbon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m16 3 5 5-4 2-2 5-3-3-7 7-1-1 7-7-3-3 5-2Z"/></svg></button></div></div>
    <div class="ribbon-tabs" role="tablist" aria-label="Tab ribbon"><button type="button" role="tab" id="ribbon-home-tab" data-ribbon-tab="home" aria-selected="true" aria-controls="ribbon-home">Home</button><button type="button" role="tab" id="ribbon-insert-tab" data-ribbon-tab="insert" aria-selected="false" aria-controls="ribbon-insert" tabindex="-1">Insert</button><button type="button" role="tab" id="ribbon-view-tab" data-ribbon-tab="view" aria-selected="false" aria-controls="ribbon-view" tabindex="-1">View</button></div>
    <div id="ribbon-home" class="workbook-toolbar ribbon-panel" role="tabpanel" aria-labelledby="ribbon-home-tab">
      ${group('Clipboard', `<div class="ribbon-row">${action('paste','Paste',ribbonIcon('paste') + '<span>Paste</span>', 'class="ribbon-large"')}<div class="ribbon-stack">${action('cut','Cut',ribbonIcon('cut') + '<span>Cut</span>')}${action('copy','Copy',ribbonIcon('copy') + '<span>Copy</span>')}${action('paste-external','Paste dari Excel',ribbonIcon('paste') + '<span>Paste...</span>')}</div></div>`)}
      ${group('Font', `<div class="ribbon-row"><input id="workbook-font-search" type="text" role="combobox" aria-label="Font" aria-autocomplete="list" aria-controls="workbook-font-options" aria-expanded="false" autocomplete="off" value="Arial" placeholder="Cari font..."><input class="ribbon-font-size" type="number" inputmode="decimal" data-format-property="fontSize" aria-label="Ukuran" min="1" max="409" step="0.5" value="11" title="Ukuran font (ketik angka)"></div><div class="ribbon-row">${button('bold','Tebal','<b>B</b>')}${button('italic','Miring','<i>I</i>')}${button('underline','Garis bawah','<u>U</u>')}${workbookBorderTool()}${workbookColorTool('background','Warna sel')}${workbookColorTool('color','Warna teks')}</div>`, 'ribbon-font')}
      ${group('Alignment', `<div class="ribbon-row">${align('vertical','top','Rata atas','top')}${align('vertical','center','Rata tengah vertikal','middle')}${align('vertical','bottom','Rata bawah','bottom')}${button('wrap','Bungkus teks',ribbonIcon('wrap') + '<span>Wrap Text</span>')}</div><div class="ribbon-row">${align('horizontal','left','Rata kiri','left')}${align('horizontal','center','Rata tengah','center')}${align('horizontal','right','Rata kanan','right')}${button('merge','Gabungkan sel',ribbonIcon('merge') + '<span>Merge &amp; Center</span>')}${button('unmerge','Lepas gabungan',ribbonIcon('unmerge'))}</div>`)}
      ${group('Number', `${select('numFmt','Format angka',[[0,'General'],[1,'Number'],[2,'Decimal (0.00)'],[9,'Percentage (0%)'],[10,'Percentage (0.00%)'],[14,'Date'],[49,'Text']])}<div class="ribbon-row"><button type="button" data-ribbon-property="numFmt" data-value="9" aria-label="Format persen" title="Percent Style">%</button><button type="button" data-ribbon-property="numFmt" data-value="2" aria-label="Format desimal" title="Decimal Style">0.00</button></div>`)}
      ${group('Cells', `<div class="ribbon-row">${action('row-height','Tinggi baris',ribbonIcon('row') + '<span>Row<br>Height</span>', 'class="ribbon-large"')}${action('column-width','Lebar kolom',ribbonIcon('column') + '<span>Column<br>Width</span>', 'class="ribbon-large"')}</div>`)}
      ${group('Editing', `<div class="ribbon-stack">${action('clear','Hapus isi sel',ribbonIcon('clear') + '<span>Clear Contents</span>')}${action('find','Cari isi sel',ribbonIcon('find') + '<span>Find</span>')}</div>`)}
    </div><div id="ribbon-insert" class="workbook-toolbar ribbon-panel" role="tabpanel" aria-labelledby="ribbon-insert-tab" hidden>${group('Illustrations','<button type="button" class="ribbon-large" data-workbook-insert="picture" aria-label="Sisipkan gambar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2" y="3" width="20" height="18"/><circle cx="8" cy="8" r="2"/><path d="m3 19 7-7 4 4 3-5 4 8"/></svg><span>Pictures</span></button><button type="button" class="ribbon-large" data-workbook-insert="shape" aria-label="Sisipkan bentuk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2" y="3" width="13" height="12"/><circle cx="16" cy="16" r="6"/></svg><span>Shapes</span></button>')}${group('Text','<button type="button" class="ribbon-large" data-workbook-insert="textbox" aria-label="Sisipkan Text Box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2" y="3" width="20" height="18" stroke-dasharray="3 2"/><path d="m7 17 5-10 5 10M9 13h6"/></svg><span>Text Box</span></button><button type="button" class="ribbon-large" data-workbook-insert="text" aria-label="Sisipkan teks"><span class="ribbon-insert-letter" aria-hidden="true">A</span><span>Text Sel</span></button>')}${group('Symbols','<button type="button" class="ribbon-large" data-workbook-insert="symbol" aria-label="Sisipkan simbol"><span class="ribbon-insert-letter" aria-hidden="true">&#937;</span><span>Symbol</span></button>')}</div><div id="ribbon-view" class="workbook-toolbar ribbon-panel" role="tabpanel" aria-labelledby="ribbon-view-tab" hidden>${group('Show', '<label class="ribbon-check"><input type="checkbox" data-ribbon-view="gridlines" checked>Gridlines</label><label class="ribbon-check"><input type="checkbox" data-ribbon-view="formula" checked>Formula Bar</label>')}${group('Window',workbookFreezeControls())}</div>
</div>`;
}

function workbookCheckpoint(group='action',wholeBook=false) {
  const state=activeWorkbook;
  if(!workbookDocument(true)||state.saving)return false;
  state.undo ||= [];state.redo ||= [];
  if(group!==state.historyGroup){
    state.undo.push({...WorkbookFormat.snapshot(state.book,state.sheetIndex,wholeBook),selected:state.selected,range:state.range});
    while(state.undo.length>20 || (state.undo.length>1&&state.undo.reduce((size,item)=>size+item.xml.length+(item.styles?.length||0)+(item.workbook?.length||0)+(item.allSheets?.reduce((n,s)=>n+s.xml.length,0)||0)+(item.hiddenParts?.reduce((n,s)=>n+s[1].length,0)||0),0)>8*1024*1024))state.undo.shift();
    state.redo=[];
  }
  state.historyGroup=group;return true;
}
function workbookHistory(action) {
  const state=activeWorkbook;
  if(!workbookDocument(true)||state.saving||!state[action]?.length)return;
  const other=action==='undo'?'redo':'undo',snapshot=state[action].pop();
  const view=state.sheetIndex===snapshot.index?state:snapshot;
  state[other] ||= [];state[other].push({...WorkbookFormat.snapshot(state.book,snapshot.index,snapshot.wholeBook),selected:view.selected,range:view.range});
  WorkbookFormat.restore(state.book,snapshot);state.sheetIndex=snapshot.index;state.historyGroup=null;
  state.selected=snapshot.selected||'A1';state.anchor=state.selected;state.range=snapshot.range||state.selected;
  workbookChanged();ensureWorkbookCellVisible(state.selected);restoreWorkbookFocus();
}
function workbookChanged() {activeWorkbook.dirty=true;activeWorkbook.edits++;renderWorkbookSheet();}
function workbookRange() {return activeWorkbook.range || activeWorkbook.selected;}
function workbookSelectedMerge() {
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],area=WorkbookFormat.range(sheet,workbookRange());
  return sheet.merges.find(merge => {
    const exact=area.first.row===merge.first.row&&area.last.row===merge.last.row&&area.first.column===merge.first.column&&area.last.column===merge.last.column;
    const single=area.first.row===area.last.row&&area.first.column===area.last.column&&area.first.row>=merge.first.row&&area.first.row<=merge.last.row&&area.first.column>=merge.first.column&&area.first.column<=merge.last.column;
    return exact||single;
  });
}
function highlightWorkbookRange() {
  if(!workbookDocument())return;
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],area=WorkbookFormat.range(sheet,workbookRange());
  document.querySelectorAll('.workbook-cell').forEach(cell=>{const point=XlsxPackage.position(cell.dataset.cell);cell.classList.toggle('is-range',point.row>=area.first.row&&point.row<=area.last.row&&point.column>=area.first.column&&point.column<=area.last.column);});
  paintWorkbookSelection();
  const input=document.getElementById('workbook-range');if(input&&document.activeElement!==input)input.value=workbookRange();
  syncWorkbookFormatControls();
  for(const name of ['undo','redo']){const button=document.querySelector(`[data-format-action="${name}"]`);if(button)button.disabled=!state[name]?.length||state.saving;}
}
function workbookCurrentStyle(){
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex];
  return workbookShapeStyle()||state.book.styles[Number(sheet.cells.get(state.selected)?.getAttribute('s'))||0]||{};
}
function syncWorkbookFormatControls(){
  if(!workbookDocument())return;
  const shape=workbookSelectedShape(),style=workbookCurrentStyle();
  syncWorkbookColorTools();
  const fontInput=document.getElementById('workbook-font-search');if(fontInput&&document.activeElement!==fontInput)fontInput.value=style.fontName||'Arial';
  document.querySelectorAll('[data-format-property]').forEach(control=>{
    if(document.activeElement===control)return;
    const property=control.dataset.formatProperty,value=style[property];
    if(value!==undefined&&property!=='borders'&&(!['color','background'].includes(property)||/^#[0-9a-f]{6}$/i.test(value)))control.value=String(value);
  });
  for(const property of ['bold','italic','underline','wrap'])document.querySelector(`[data-format-action="${property}"]`)?.setAttribute('aria-pressed',Boolean(style[property]));
  document.querySelector('[data-format-action="merge"]')?.setAttribute('aria-pressed',String(!shape&&Boolean(workbookSelectedMerge())));
  document.querySelectorAll('[data-ribbon-property]').forEach(button => button.setAttribute('aria-pressed', String(style[button.dataset.ribbonProperty]) === button.dataset.value));
  document.querySelectorAll('[data-format-action="merge"], [data-format-action="unmerge"], [data-format-property="numFmt"], [data-ribbon-property="numFmt"], [data-border-ui], [data-ribbon-action="row-height"], [data-ribbon-action="column-width"], [data-ribbon-action="clear"], [data-ribbon-action="copy"], [data-ribbon-action="cut"], [data-ribbon-action="paste"], [data-ribbon-action="paste-external"]').forEach(control=>{control.disabled=Boolean(shape);});
}
function applyWorkbookFormat(property,value,address=workbookRange()) {
  if(workbookSelectedShape()){
    try{formatWorkbookShape(property,value);}catch(failure){toast(failure.message,true);}
    restoreWorkbookFocus();return;
  }
  if(!workbookCheckpoint())return;
  try {WorkbookFormat.format(activeWorkbook.book,activeWorkbook.sheetIndex,address,property,value);workbookChanged();}
  catch(failure){toast(failure.message,true);}
  activeWorkbook.historyGroup=null;restoreWorkbookFocus();
}
document.addEventListener('focusout',event=>{
  if(event.target.matches('.workbook-cell, #workbook-cell-value')&&activeWorkbook){activeWorkbook.historyGroup=null;const sheet=activeWorkbook.book.sheets[activeWorkbook.sheetIndex];if(event.target.matches('.workbook-cell'))event.target.value=WorkbookFormat.display(activeWorkbook.book,sheet.cells.get(event.target.dataset.cell));}
});
document.addEventListener('change',event=>{
  if(event.target.matches('[data-format-property]')) { const target=activeWorkbook?.formatTarget; applyWorkbookFormat(event.target.dataset.formatProperty,event.target.value,target?.control===event.target&&target.sheetIndex===activeWorkbook.sheetIndex?target.range:workbookRange()); }
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-format-action]');
  if(!button||!workbookDocument()||activeWorkbook.saving)return;
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],action=button.dataset.formatAction;
  try{
    if(action==='select-range'){
      const address=document.getElementById('workbook-range').value.toUpperCase().trim();const area=WorkbookFormat.range(sheet,address);WorkbookFormat.references(area);
      const destination=XlsxPackage.address(area.first.column,area.first.row);
      const merge=area.first.row===area.last.row&&area.first.column===area.last.column?sheet.merges.find(merge=>area.first.row>=merge.first.row&&area.first.row<=merge.last.row&&area.first.column>=merge.first.column&&area.first.column<=merge.last.column):null;
      state.selectedPicture=null;paintWorkbookPictureSelection();state.range=merge?workbookMergedSelection(merge,merge.start):address;state.anchor=merge?merge.start:destination;selectWorkbookCell(state.anchor);ensureWorkbookCellVisible(destination);highlightWorkbookRange();return;
    }
    if(!workbookDocument(true))return;
    if(['undo','redo'].includes(action)){workbookHistory(action);return;}
    if(workbookSelectedShape()&&['merge','unmerge'].includes(action))return;
    if(['merge','unmerge'].includes(action)){const unmerge=action==='unmerge'||Boolean(workbookSelectedMerge());if(!workbookCheckpoint())return;const master=WorkbookFormat.merge(state.book,state.sheetIndex,workbookRange(),unmerge);if(!unmerge){state.selected=master;state.anchor=master;WorkbookFormat.format(state.book,state.sheetIndex,workbookRange(),'horizontal','center');}state.historyGroup=null;workbookChanged();restoreWorkbookFocus();return;}
    const style=workbookCurrentStyle();
    applyWorkbookFormat(action,!style[action]);
  }catch(failure){state.historyGroup=null;toast(failure.message,true);}
});
document.addEventListener('keydown',event=>{
  if(event.target.id==='workbook-range'&&event.key==='Enter'){event.preventDefault();document.querySelector('[data-format-action="select-range"]').click();}
});
