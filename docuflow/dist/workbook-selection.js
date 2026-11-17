'use strict';

let workbookDrag = null;

function workbookSelectionArea() {
  const state = activeWorkbook;
  return WorkbookFormat.range(state.book.sheets[state.sheetIndex], state.range || state.selected);
}

function paintWorkbookSelection() {
  if (!workbookDocument()) return;
  const state = activeWorkbook, area = workbookSelectionArea(), { x, y, grid } = state.gridLayout || {};
  if (!grid) return;
  let copied=grid.querySelector('.workbook-copy-outline');
  if(state.copyArea?.sheetIndex===state.sheetIndex) {
    if(!copied){copied=document.createElement('div');copied.className='workbook-copy-outline';copied.setAttribute('aria-hidden','true');grid.querySelector('.workbook-canvas').appendChild(copied);}
    const a=state.copyArea.area;Object.assign(copied.style,{left:x[a.first.column-1]+'px',top:y[a.first.row-1]+'px',width:x[a.last.column]-x[a.first.column-1]+'px',height:y[a.last.row]-y[a.first.row-1]+'px'});
  }else copied?.remove();
  let outline = grid.querySelector('.workbook-selection-outline');
  if (!outline) { outline = document.createElement('div'); outline.className = 'workbook-selection-outline'; outline.setAttribute('aria-hidden', 'true'); grid.querySelector('.workbook-canvas').appendChild(outline); }
  Object.assign(outline.style, { left: x[area.first.column - 1] + 'px', top: y[area.first.row - 1] + 'px', width: x[area.last.column] - x[area.first.column - 1] + 'px', height: y[area.last.row] - y[area.first.row - 1] + 'px' });
  grid.querySelectorAll('th[data-column]').forEach(header => header.classList.toggle('is-range-header', Number(header.dataset.column) >= area.first.column && Number(header.dataset.column) <= area.last.column));
  grid.querySelectorAll('th[data-row]').forEach(header => header.classList.toggle('is-range-header', Number(header.dataset.row) >= area.first.row && Number(header.dataset.row) <= area.last.row));
  paintWorkbookFrozenLayers();
}

function restoreWorkbookFocus(selectAll = false) {
  if (!workbookDocument() || activeWorkbook.saving || document.getElementById('modal')?.open) return;
  if(workbookSelectedShape()){
    document.querySelector('.workbook-shape[data-inserted-image="'+CSS.escape(String(activeWorkbook.selectedPicture))+'"]')?.focus({preventScroll:true});return;
  }
  const state = activeWorkbook, cell = document.querySelector(`.workbook-cell[data-cell="${state.selected}"]`) || document.getElementById('workbook-cell-value');
  if (!cell || cell.disabled) return;
  const caret = state.caret?.reference === state.selected ? state.caret : null;
  cell.focus({ preventScroll: true });
  if(state.editingCell===state.selected){cell.classList.add('is-editing');if(caret)cell.setSelectionRange(caret.start,caret.end);}
  else {cell.classList.remove('is-editing');if(cell.id==='workbook-cell-value')cell.select();else cell.setSelectionRange(0,0);}
}

function selectionPoint(event, grid) {
  const rect = grid.getBoundingClientRect(), { x, y } = activeWorkbook.gridLayout, scale=workbookPointerScale(grid);
  const freeze=activeWorkbook.gridLayout.freeze||{rows:0,columns:0},px=Math.max(x[0],Math.min(grid.clientWidth-2,(event.clientX-rect.left)/scale.x)),py=Math.max(y[0],Math.min(grid.clientHeight-2,(event.clientY-rect.top)/scale.y));
  const columnOffset = (px<x[freeze.columns]?0:grid.scrollLeft)+px;
  const rowOffset = (py<y[freeze.rows]?0:grid.scrollTop)+py;
  const at = (edges, offset) => { const index = edges.findIndex(edge => edge > offset); return index < 0 ? edges.length - 1 : Math.max(1, index); };
  return { column: at(x, columnOffset), row: at(y, rowOffset) };
}

function extendWorkbookDrag(event) {
  const drag = workbookDrag;
  if (!drag || drag.state !== activeWorkbook || !workbookDocument()) return;
  drag.clientX = event.clientX; drag.clientY = event.clientY;
  const sheet = activeWorkbook.book.sheets[activeWorkbook.sheetIndex], point = selectionPoint(event, drag.grid);
  const first = { row: Math.min(drag.anchor.row, point.row), column: Math.min(drag.anchor.column, point.column) };
  const last = { row: Math.max(drag.anchor.row, point.row), column: Math.max(drag.anchor.column, point.column) };
  if (drag.axis === 'column') { first.row = 1; last.row = sheet.rows; }
  if (drag.axis === 'row') { first.column = 1; last.column = sheet.columns; }
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const merge of sheet.merges) {
      if (first.row > merge.last.row || last.row < merge.first.row || first.column > merge.last.column || last.column < merge.first.column) continue;
      if (merge.first.row < first.row || merge.last.row > last.row || merge.first.column < first.column || merge.last.column > last.column) { first.row = Math.min(first.row,merge.first.row); first.column = Math.min(first.column,merge.first.column); last.row = Math.max(last.row,merge.last.row); last.column = Math.max(last.column,merge.last.column); expanded = true; }
    }
  }
  const reference = XlsxPackage.address(first.column, first.row), end = XlsxPackage.address(last.column, last.row);
  activeWorkbook.range = reference === end ? reference : reference + ':' + end;
  highlightWorkbookRange();
}

function scrollWorkbookDrag() {
  const drag = workbookDrag;
  if (!drag || drag.state !== activeWorkbook || !drag.grid.isConnected) return;
  const rect = drag.grid.getBoundingClientRect(),scale=workbookPointerScale(drag.grid),{x,y}=activeWorkbook.gridLayout;
  const dx = drag.axis === 'row' ? 0 : drag.clientX > rect.right - 24 ? 24 : drag.clientX < rect.left + x[0]*scale.x+1 ? -24 : 0;
  const dy = drag.axis === 'column' ? 0 : drag.clientY > rect.bottom - 24 ? 20 : drag.clientY < rect.top + y[0]*scale.y+1 ? -20 : 0;
  if (dx || dy) { drag.grid.scrollBy(dx, dy); activeWorkbook.renderViewport(); extendWorkbookDrag(drag); }
  drag.frame = requestAnimationFrame(scrollWorkbookDrag);
}

document.addEventListener('pointerdown', event => {
  const grid = event.target.closest('#workbook-grid');
  if (!grid || event.button !== 0 || !workbookDocument() || event.target.closest('.workbook-column-gap,[data-resize-column],[data-resize-row]')) return;
  const cell = event.target.closest('.workbook-cell'), column = event.target.closest('th[data-column]'), row = event.target.closest('th[data-row]');
  if (!cell && !column && !row) return;
  if(cell && activeWorkbook.editingCell===cell.dataset.cell)return;
  if(cell&&!event.shiftKey){const last=activeWorkbook.lastCellPointer,now=performance.now();
    if(last&&last.reference===cell.dataset.cell&&activeWorkbook.selected===cell.dataset.cell&&now-last.time<400&&Math.abs(event.clientX-last.x)<6&&Math.abs(event.clientY-last.y)<6){event.preventDefault();beginWorkbookCellEdit(cell);cell.focus({preventScroll:true});cell.setSelectionRange(cell.value.length,cell.value.length);activeWorkbook.lastCellPointer=null;return;}
    activeWorkbook.lastCellPointer={reference:cell.dataset.cell,time:now,x:event.clientX,y:event.clientY};
  }

  if (event.detail > 1 && cell) return; // Double-click restores normal in-cell text editing.
  event.preventDefault();
  const state = activeWorkbook, sheet = state.book.sheets[state.sheetIndex];
  state.editingCell=null;state.selectedPicture=null;document.querySelectorAll('.workbook-cell.is-editing').forEach(cell=>cell.classList.remove('is-editing'));paintWorkbookPictureSelection();
  let reference = cell?.dataset.cell || XlsxPackage.address(column ? Number(column.dataset.column) : 1, row ? Number(row.dataset.row) : 1);
  const point = XlsxPackage.position(reference), anchor = event.shiftKey ? XlsxPackage.position(state.anchor || state.selected) : point;
  state.anchor = XlsxPackage.address(anchor.column, anchor.row); state.range = state.anchor; state.historyGroup = null;
  selectWorkbookCell(state.anchor);
  workbookDrag = { state, grid, pointerId: event.pointerId, anchor, axis: column ? 'column' : row ? 'row' : 'cell', clientX: event.clientX, clientY: event.clientY };
  grid.setPointerCapture(event.pointerId); grid.classList.add('is-selecting');
  extendWorkbookDrag(event); restoreWorkbookFocus(true);
  if (cell && !event.shiftKey) {
    const merge = sheet.merges.find(merge => merge.start === reference);
    if (merge) { state.range = merge.start + ':' + XlsxPackage.address(merge.last.column, merge.last.row); highlightWorkbookRange(); }
  }
  workbookDrag.frame = requestAnimationFrame(scrollWorkbookDrag);
});
document.addEventListener('pointermove', event => { if (workbookDrag?.pointerId === event.pointerId) extendWorkbookDrag(event); });
function finishWorkbookDrag(event) {
  const drag = workbookDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  cancelAnimationFrame(drag.frame); drag.grid.classList.remove('is-selecting');
  if (drag.grid.hasPointerCapture(event.pointerId)) drag.grid.releasePointerCapture(event.pointerId);
  workbookDrag = null; restoreWorkbookFocus(true);
}
document.addEventListener('pointerup', finishWorkbookDrag);
document.addEventListener('pointercancel', finishWorkbookDrag);
document.addEventListener('dblclick', event => { if (event.target.matches('.workbook-cell') && workbookDocument(true)) { beginWorkbookCellEdit(event.target); event.target.focus(); event.target.setSelectionRange(event.target.value.length, event.target.value.length); } });
document.addEventListener('focusout', event => {
  if (event.target.matches('.workbook-cell') && activeWorkbook) activeWorkbook.caret = { reference: event.target.dataset.cell, start: event.target.selectionStart, end: event.target.selectionEnd };
});
