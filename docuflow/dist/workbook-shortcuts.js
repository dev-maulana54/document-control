'use strict';

document.addEventListener('keydown', event => {
  if(event.key==='Escape'&&workbookDocument()&&activeWorkbook.copyArea){activeWorkbook.copyArea=null;paintWorkbookSelection();return;}
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing || event.defaultPrevented || !workbookDocument() || document.getElementById('modal')?.open) return;
  if (!event.target.closest('.workbook-workspace')) return;
  const key=event.key.toLowerCase();
  if((key==='c'||key==='x')&&!workbookSelectedShape()&&(!event.target.matches('input,textarea')||event.target.matches('.workbook-cell, #workbook-cell-value')&&event.target.selectionStart===event.target.selectionEnd)){event.preventDefault();if(key==='c'||workbookDocument(true)){try{copyWorkbookSelection(key==='x');}catch(error){toast(error.message,true);}}return;}
  if (key==='s') {
    event.preventDefault();
    if (workbookDocument(true) && !activeWorkbook.saving) { if(event.target.matches('input'))event.target.blur(); saveWorkbookChanges(); }
    return;
  }
  // Search fields, font/size inputs and dialogs retain their own text undo behavior.
  if (event.target.matches('input, textarea, [contenteditable="true"]') && !event.target.matches('.workbook-cell, #workbook-cell-value')) return;
  if (!['z','y','b','i','u'].includes(key)) return;
  event.preventDefault();
  if (!workbookDocument(true) || activeWorkbook.saving) return;
  if (key==='z' || key==='y') { workbookHistory(key==='y' || event.shiftKey ? 'redo' : 'undo'); return; }
  const property={b:'bold',i:'italic',u:'underline'}[key],style=workbookCurrentStyle();
  applyWorkbookFormat(property,!style[property]);
});
