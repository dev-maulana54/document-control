'use strict';

// Text spill is a display layer only. Neighboring cells keep their own values and hit areas.
function refreshWorkbookOverflow(){
  if(!workbookDocument()||!activeWorkbook.gridLayout)return;
  const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],{grid,x,y,firstRow,lastRow}=state.gridLayout,canvas=grid.querySelector('.workbook-canvas');
  if(!canvas||!firstRow)return;
  alignWorkbookCellText(grid);
  canvas.querySelectorAll('.workbook-text-overflow').forEach(node=>node.remove());
  const inputs=new Map([...grid.querySelectorAll('.workbook-cell')].map(input=>{if(input.dataset.spillDisplay){input.style.color=input.dataset.displayColor;input.style.width='100%';input.style.position='';input.style.zIndex='';delete input.dataset.spillDisplay;}return [input.dataset.cell,input];}));
  const rows=new Map(),candidates=[];
  const visibleRows=state.gridLayout.visibleRows||Array.from({length:lastRow-firstRow+1},(_,i)=>firstRow+i),rowSet=new Set(visibleRows),freeze=state.gridLayout.freeze||{rows:0,columns:0};
  const block=(row,first,last)=>{if(!rowSet.has(row))return;if(!rows.has(row))rows.set(row,[]);rows.get(row).push({first,last});};
  for(const [ref,cell] of sheet.cells){
    const point=XlsxPackage.position(ref);if(!rowSet.has(point.row))continue;
    if([...cell.children].some(node=>['v','is','f'].includes(node.localName)))block(point.row,point.column,point.column);
    if(!['s','inlineStr','str'].includes(cell.getAttribute('t')))continue;
    if(x[point.column]===x[point.column-1])continue;
    const style=state.book.styles[Number(cell.getAttribute('s')??state.gridLayout.rowStyles.get(point.row)??state.gridLayout.columnStyles[point.column-1])]||{};
    if(!style.wrap&&!sheet.merges.some(m=>point.row>=m.first.row&&point.row<=m.last.row&&point.column>=m.first.column&&point.column<=m.last.column))candidates.push({ref,point,style,cell});
  }
  for(const merge of sheet.merges)for(const row of visibleRows)if(row>=merge.first.row&&row<=merge.last.row)block(row,merge.first.column,merge.last.column);
  for(const blockers of rows.values()){blockers.sort((a,b)=>a.first-b.first);let last=0;for(const block of blockers){last=Math.max(last,block.last);block.previousEnd=last;}}
  const boundary=(blocks,column,inclusive)=>{let low=0,high=blocks.length;while(low<high){const mid=(low+high)>>1;if(blocks[mid].first<column||inclusive&&blocks[mid].first===column)low=mid+1;else high=mid;}return low;};
  const measure=document.createElement('canvas').getContext('2d'),fragment=document.createDocumentFragment();
  for(const {ref,point:p,style:s,cell} of candidates){
    const left=x[p.column-1],right=x[p.column],height=y[p.row]-y[p.row-1],width=right-left,align=['left','center','right'].includes(s.horizontal)?s.horizontal:'left',blockers=rows.get(p.row)||[];
    const before=blockers[boundary(blockers,p.column,false)-1],after=blockers[boundary(blockers,p.column,true)],leftLimit=align==='left'?left:x[before?.previousEnd||0],rightLimit=align==='right'?right:x[(after?.first||sheet.columns+1)-1];
    if(rightLimit-leftLimit<=width+.1||p.column>freeze.columns&&(rightLimit<grid.scrollLeft+x[0]||leftLimit>grid.scrollLeft+grid.clientWidth)||height<=0)continue;
    const value=WorkbookEngine.value(state.book,cell);if(!value||value.includes('\n'))continue;
    const fontSize=s.fontSize||11,fontName=s.fontName||'Arial';measure.font=`${s.italic?'italic ':''}${s.bold?'700 ':'400 '}${fontSize*4/3}px "${fontName.replace(/["\\]/g,'')}"`;
    const textWidth=measure.measureText(value).width;if(textWidth+8<=width)continue;
    let start=align==='left'?left:Math.max(leftLimit,align==='right'?right-textWidth-8:(left+right-textWidth)/2-4);
    let end=align==='right'?right:Math.min(rightLimit,align==='center'?(left+right+textWidth)/2+4:left+textWidth+8);
    if(end-start<=width+.1||p.column>freeze.columns&&(end<grid.scrollLeft+x[0]||start>grid.scrollLeft+grid.clientWidth))continue;
    const input=inputs.get(ref);
    if(state.editingCell===ref&&input){if(align==='left'){input.dataset.spillDisplay='true';input.style.width=end-left+'px';input.style.position='relative';input.style.zIndex='2';if(end-left>=textWidth+8)input.scrollLeft=0;}continue;}
    if(input){input.dataset.spillDisplay='true';input.style.color='transparent';}
    const clip=document.createElement('div');clip.className='workbook-text-overflow';clip.dataset.overflowCell=ref;clip.setAttribute('aria-hidden','true');Object.assign(clip.style,{left:start+'px',top:y[p.row-1]+'px',width:end-start+'px',height:Math.max(0,height-1)+'px'});
    const label=document.createElement('span'),labelWidth=textWidth+8,labelLeft=align==='right'?right-labelWidth:align==='center'?(left+right-labelWidth)/2:left;label.textContent=value;Object.assign(label.style,{left:labelLeft-start+'px',width:labelWidth+'px',fontFamily:fontName,fontSize:fontSize+'pt',fontWeight:s.bold?'700':'400',fontStyle:s.italic?'italic':'normal',textDecoration:[s.underline?'underline':'',s.strike?'line-through':''].filter(Boolean).join(' ')||'none',textAlign:'left',color:s.color||'#152c49'});
    let padding=3;if(s.vertical==='center')padding=Math.max(0,(height-1-Math.round(fontSize*1.6))/2);if(s.vertical==='bottom')padding=Math.max(0,height-1-Math.round(fontSize*1.6));label.style.paddingTop=(height<12?0:padding)+'px';clip.appendChild(workbookTextLayer(label,end-start,height-1,state.gridLayout.zoom));fragment.appendChild(clip);
  }
  canvas.appendChild(fragment);
  paintWorkbookFrozenLayers();
}
let workbookOverflowFrame;
function scheduleWorkbookOverflow(){cancelAnimationFrame(workbookOverflowFrame);workbookOverflowFrame=requestAnimationFrame(refreshWorkbookOverflow);}
for(const type of ['input','focusin','focusout','keydown','dblclick'])document.addEventListener(type,event=>{if(event.target.matches('.workbook-cell,#workbook-cell-value'))scheduleWorkbookOverflow();});
