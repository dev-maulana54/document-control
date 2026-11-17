'use strict';
function workbookZoomControls(){return `<div class="workbook-zoom-controls" role="group" aria-label="Zoom lembar kerja"><button type="button" data-sheet-zoom="minus" aria-label="Perkecil lembar kerja">&#8722;</button><label class="visually-hidden" for="workbook-zoom-slider">Zoom lembar kerja</label><input id="workbook-zoom-slider" type="range" min="25" max="400" step="5" value="100"><button type="button" data-sheet-zoom="plus" aria-label="Perbesar lembar kerja">+</button><label class="visually-hidden" for="workbook-zoom-percent">Zoom lembar kerja (%)</label><input id="workbook-zoom-percent" type="number" min="25" max="400" step="any" value="100" aria-label="Zoom lembar kerja (%)"><span>%</span><button type="button" data-sheet-zoom="reset" aria-label="Reset zoom 100 persen" title="Reset zoom">100%</button></div>`;}
function syncWorkbookZoom(){const zoom=activeWorkbook?.view?.zoom||100;for(const id of ['workbook-zoom-slider','workbook-zoom-percent']){const input=document.getElementById(id);if(input)input.value=zoom;}}
function setWorkbookZoom(value,focus=false){
  if(!workbookDocument()||value===''||!Number.isFinite(Number(value))){syncWorkbookZoom();return;}
  const state=activeWorkbook;state.view||={};const next=Math.max(25,Math.min(400,Math.round(Number(value))));if(state.view.zoom===next){syncWorkbookZoom();return;}state.view.zoom=next;state.editingCell=null;state.historyGroup=null;
  renderWorkbookSheet();syncWorkbookZoom();if(focus)restoreWorkbookFocus();
}
document.addEventListener('input',event=>{if(event.target.id==='workbook-zoom-slider')setWorkbookZoom(event.target.value);});
document.addEventListener('change',event=>{if(event.target.id==='workbook-zoom-percent')setWorkbookZoom(event.target.value);});
document.addEventListener('click',event=>{const button=event.target.closest('[data-sheet-zoom]');if(!button||!workbookDocument())return;const action=button.dataset.sheetZoom;setWorkbookZoom(action==='reset'?100:(activeWorkbook.view?.zoom||100)+(action==='plus'?10:-10));});
document.addEventListener('keydown',event=>{
  if(!workbookDocument()||document.getElementById('modal')?.open)return;
  if(event.target.id==='workbook-zoom-percent'&&event.key==='Enter'){event.preventDefault();setWorkbookZoom(event.target.value);return;}
  if(!(event.ctrlKey||event.metaKey)||event.altKey||!event.target.closest('.workbook-workspace')||!['+','=','-','0'].includes(event.key))return;
  event.preventDefault();setWorkbookZoom(event.key==='0'?100:(activeWorkbook.view?.zoom||100)+(event.key==='-'?-10:10),true);
});
document.addEventListener('wheel',event=>{if(!(event.ctrlKey||event.metaKey)||!event.deltaY||!event.target.closest('#workbook-grid')||!workbookDocument()||document.getElementById('modal')?.open)return;event.preventDefault();setWorkbookZoom((activeWorkbook.view?.zoom||100)+(event.deltaY<0?10:-10));},{passive:false});
