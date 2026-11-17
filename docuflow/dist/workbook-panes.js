'use strict';

const WorkbookPanes = (()=>{
  function read(sheet){
    const E=WorkbookEngine,view=E.elements(sheet.xml,'sheetView')[0],pane=view&&E.child(view,'pane'),frozen=['frozen','frozenSplit'].includes(pane?.getAttribute('state'));
    return {zoom:Math.max(25,Math.min(400,Number(view?.getAttribute('zoomScale'))||100)),gridlines:!['0','false'].includes(view?.getAttribute('showGridLines')),freeze:{rows:frozen?Math.max(0,Math.min(sheet.rows-1,Math.floor(Number(pane.getAttribute('ySplit')))||0)):0,columns:frozen?Math.max(0,Math.min(sheet.columns-1,Math.floor(Number(pane.getAttribute('xSplit')))||0)):0}};
  }
  function write(book,index,freeze){
    const E=WorkbookEngine,sheet=book.sheets[index],create=name=>sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI,name);
    let views=E.elements(sheet.xml,'sheetViews')[0];if(!views){views=create('sheetViews');sheet.xml.documentElement.insertBefore(views,[...sheet.xml.documentElement.children].find(n=>!['sheetPr','dimension'].includes(n.localName))||null);}
    let view=E.child(views,'sheetView');if(!view){view=create('sheetView');view.setAttribute('workbookViewId','0');views.appendChild(view);}
    E.child(view,'pane')?.remove();for(const selection of E.elements(view,'selection'))selection.removeAttribute('pane');
    const rows=freeze.rows,columns=freeze.columns;
    if(rows||columns){const pane=create('pane'),active=rows&&columns?'bottomRight':rows?'bottomLeft':'topRight';pane.setAttribute('state','frozen');if(rows)pane.setAttribute('ySplit',rows);if(columns)pane.setAttribute('xSplit',columns);pane.setAttribute('topLeftCell',XlsxPackage.address(columns+1,rows+1));pane.setAttribute('activePane',active);view.insertBefore(pane,view.firstChild);let selection=E.child(view,'selection');if(!selection){selection=create('selection');view.appendChild(selection);}selection.setAttribute('pane',active);}
    sheet.initialView=read(sheet);book.modified.add(index);
  }
  return {read,write};
})();

function syncWorkbookSheetView(){
  const state=activeWorkbook;state.view||={};state.sheetViews||={};
  if(state.viewSheetIndex!==state.sheetIndex){if(state.viewSheetIndex!==undefined)state.sheetViews[state.viewSheetIndex]={zoom:state.view.zoom,gridlines:state.view.gridlines};Object.assign(state.view,WorkbookPanes.read(state.book.sheets[state.sheetIndex]),state.sheetViews[state.sheetIndex]);state.viewSheetIndex=state.sheetIndex;}
  state.view.freeze=state.temporaryFreeze?.[state.sheetIndex]||WorkbookPanes.read(state.book.sheets[state.sheetIndex]).freeze;
}

function workbookFreezeControls(){return `<button type="button" class="ribbon-large" data-freeze-menu aria-haspopup="menu" aria-expanded="false" aria-label="Freeze Panes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2" y="3" width="20" height="18"/><path d="M2 9h20M8 3v18" stroke-width="2.5"/></svg><span>Freeze Panes ▾</span></button>`;}
function paintWorkbookNativeBorders(){
  const layout=activeWorkbook?.gridLayout;if(!layout?.borderEdges)return;const {grid,x,y,freeze,borderEdges,zoom}=layout,canvas=grid.querySelector('.workbook-canvas');
  const paintKey=[layout.borderVersion,grid.scrollLeft,grid.scrollTop,grid.clientWidth,grid.clientHeight].join(':');if(layout.borderPaintKey===paintKey)return;layout.borderPaintKey=paintKey;
  canvas.querySelectorAll('.workbook-native-borders').forEach(n=>n.remove());
  const xs=freeze.columns?[[x[0],Math.min(x[freeze.columns],grid.clientWidth),grid.scrollLeft,true],[x[freeze.columns],grid.clientWidth,0,false]]:[[x[0],grid.clientWidth,0,false]],ys=freeze.rows?[[y[0],Math.min(y[freeze.rows],grid.clientHeight),grid.scrollTop,true],[y[freeze.rows],grid.clientHeight,0,false]]:[[y[0],grid.clientHeight,0,false]];
  const snap=value=>Math.round(value*zoom)/zoom;
  for(const [left,right,dx,fx] of xs)for(const [top,bottom,dy,fy] of ys){if(right<=left||bottom<=top)continue;const layer=document.createElement('div');layer.className='workbook-native-borders';layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{left:grid.scrollLeft+left+'px',top:grid.scrollTop+top+'px',width:right-left+'px',height:bottom-top+'px',overflow:'hidden',zIndex:fx||fy?'23':'4'});
    for(const edge of borderEdges){const match=edge.border.match(/^([\d.]+)px (\S+) (.+)$/);if(!match)continue;const [,width,lineStyle,color]=match,horizontal=edge.y1===edge.y2,offsetX=grid.scrollLeft+left-dx,offsetY=grid.scrollTop+top-dy;if(Math.max(edge.x1,edge.x2)<offsetX||Math.min(edge.x1,edge.x2)>offsetX+right-left||Math.max(edge.y1,edge.y2)<offsetY||Math.min(edge.y1,edge.y2)>offsetY+bottom-top)continue;const line=document.createElement('div'),thickness=Math.max(1/zoom,Number(width));line.className='workbook-native-border-line';Object.assign(line.style,{position:'absolute',left:snap(edge.x1-offsetX)-(horizontal?0:thickness/2)+'px',top:snap(edge.y1-offsetY)-(horizontal?thickness/2:0)+'px',width:horizontal?edge.x2-edge.x1+'px':'0px',height:horizontal?'0px':edge.y2-edge.y1+'px',[horizontal?'borderTop':'borderLeft']:thickness+'px '+lineStyle+' '+color});layer.appendChild(line);}
    canvas.appendChild(layer);
  }
}
function closeWorkbookFreezeMenu(){document.getElementById('workbook-freeze-menu')?.remove();document.querySelector('[data-freeze-menu]')?.setAttribute('aria-expanded','false');}
// Sticky cells are still the original editable cells. Only visual selection/text
// overlays are clipped into panes; pointer positions map back to native coordinates.
function paintWorkbookFrozenLayers(){
  const layout=activeWorkbook?.gridLayout;if(!layout)return;const {grid,x,y,freeze}=layout,canvas=grid.querySelector('.workbook-canvas');if(!canvas)return;
  canvas.querySelectorAll('.workbook-pane-overlay').forEach(n=>n.remove());
  const sources=[...canvas.querySelectorAll('.workbook-selection-outline,.workbook-copy-outline,.workbook-text-overflow')].filter(n=>!n.closest('.workbook-pane-overlay'));
  for(const source of sources){source.style.visibility='';if(!freeze.rows&&!freeze.columns)continue;source.style.visibility='hidden';
    const sx=parseFloat(source.style.left)||0,sy=parseFloat(source.style.top)||0,sw=parseFloat(source.style.width)||0,sh=parseFloat(source.style.height)||0;
    const xs=freeze.columns?[[x[0],x[freeze.columns],grid.scrollLeft,true],[x[freeze.columns],grid.clientWidth,0,false]]:[[x[0],grid.clientWidth,0,false]],ys=freeze.rows?[[y[0],y[freeze.rows],grid.scrollTop,true],[y[freeze.rows],grid.clientHeight,0,false]]:[[y[0],grid.clientHeight,0,false]];
    for(const [left,right,dx,fx] of xs)for(const [top,bottom,dy,fy] of ys){if(right<=left||bottom<=top)continue;const nativeLeft=fx?left:left+grid.scrollLeft,nativeRight=fx?right:right+grid.scrollLeft,nativeTop=fy?top:top+grid.scrollTop,nativeBottom=fy?bottom:bottom+grid.scrollTop;if(sx+sw<=nativeLeft||sx>=nativeRight||sy+sh<=nativeTop||sy>=nativeBottom)continue;
      const clip=document.createElement('div');clip.className='workbook-pane-overlay';clip.style.zIndex=source.classList.contains('workbook-text-overflow')?'26':'28';Object.assign(clip.style,{left:grid.scrollLeft+left+'px',top:grid.scrollTop+top+'px',width:Math.max(0,Math.min(right,grid.clientWidth)-left)+'px',height:Math.max(0,Math.min(bottom,grid.clientHeight)-top)+'px'});const clone=source.cloneNode(true);clone.removeAttribute('id');clone.style.visibility='';clone.style.left=sx+dx-grid.scrollLeft-left+'px';clone.style.top=sy+dy-grid.scrollTop-top+'px';clip.appendChild(clone);canvas.appendChild(clip);
    }
  }
  paintWorkbookNativeBorders();
  for(const image of canvas.querySelectorAll('.workbook-image')){const col=image.dataset.paneColumn,row=image.dataset.paneRow;if(!col||!row)continue;const fx=Number(col)<=freeze.columns,fy=Number(row)<=freeze.rows;image.style.transform=fx||fy?`translate(${fx?grid.scrollLeft:0}px,${fy?grid.scrollTop:0}px)`:'';image.style.zIndex=fx||fy?'25':'';}
  const frame=canvas.querySelector('.workbook-picture-selection'),picture=activeWorkbook.selectedPicture!==null&&activeWorkbook.selectedPicture!==undefined?canvas.querySelector('.workbook-image[data-inserted-image="'+CSS.escape(String(activeWorkbook.selectedPicture))+'"]'):null;if(frame&&picture){frame.style.transform=picture.style.transform;frame.style.zIndex=picture.style.transform?'29':'';}
  let lines=canvas.querySelector('.workbook-freeze-lines');if(!freeze.rows&&!freeze.columns){lines?.remove();return;}if(!lines){lines=document.createElement('div');lines.className='workbook-freeze-lines';lines.setAttribute('aria-hidden','true');canvas.appendChild(lines);}lines.replaceChildren();
  for(const axis of ['row','column']){const count=freeze[axis==='row'?'rows':'columns'];if(!count)continue;const line=document.createElement('div');line.className='freeze-line '+axis;Object.assign(line.style,axis==='row'?{left:grid.scrollLeft+x[0]+'px',top:grid.scrollTop+y[count]-1+'px',width:grid.clientWidth-x[0]+'px'}:{top:grid.scrollTop+y[0]+'px',left:grid.scrollLeft+x[count]-1+'px',height:grid.clientHeight-y[0]+'px'});lines.appendChild(line);}
}
function setWorkbookFreeze(mode){
  if(!workbookDocument()||activeWorkbook.saving)return;const state=activeWorkbook,sheet=state.book.sheets[state.sheetIndex],point=XlsxPackage.position(state.selected);
  const freeze=mode==='panes'?{rows:point.row-1,columns:point.column-1}:mode==='row'?{rows:1,columns:0}:mode==='column'?{rows:0,columns:1}:{rows:0,columns:0};
  if(freeze.rows>=sheet.rows||freeze.columns>=sheet.columns)return;
  if(workbookDocument(true)){if(!workbookCheckpoint())return;WorkbookPanes.write(state.book,state.sheetIndex,freeze);state.historyGroup=null;workbookChanged();}
  else{state.temporaryFreeze||={};state.temporaryFreeze[state.sheetIndex]=freeze;renderWorkbookSheet();}
  restoreWorkbookFocus();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-freeze-menu]');if(!button||!workbookDocument())return;
  if(document.getElementById('workbook-freeze-menu')){closeWorkbookFreezeMenu();return;}
  const state=activeWorkbook,index=state.sheetIndex,key=state.key,version=state.recordVersion,menu=document.createElement('div');menu.id='workbook-freeze-menu';menu.className='workbook-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Freeze Panes');
  const freeze=state.view.freeze||{rows:0,columns:0};menu.innerHTML=[['panes','Freeze Panes','Bekukan baris di atas dan kolom di kiri sel aktif'],['row','Freeze Top Row','Baris pertama tetap terlihat'],['column','Freeze First Column','Kolom pertama tetap terlihat'],['none','Unfreeze Panes','Lepaskan baris dan kolom yang dibekukan']].map(([mode,label,description])=>`<button type="button" role="menuitem" data-freeze="${mode}" ${mode==='none'&&!freeze.rows&&!freeze.columns?'disabled':''}>${label}<small>${description}</small></button>`).join('');document.body.appendChild(menu);
  const anchor=button.getBoundingClientRect(),scale=workbookPointerScale(document.querySelector('.workbook-workspace'));menu.style.maxHeight=(innerHeight-16)/scale.y+'px';menu.style.maxWidth=(innerWidth-16)/scale.x+'px';const rect=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(anchor.left,innerWidth-rect.width-8))/scale.x+'px';menu.style.top=Math.max(8,Math.min(anchor.bottom,innerHeight-rect.height-8))/scale.y+'px';button.setAttribute('aria-expanded','true');
  menu.onclick=e=>{const option=e.target.closest('[data-freeze]');if(!option||option.disabled)return;closeWorkbookFreezeMenu();if(activeWorkbook===state&&state.sheetIndex===index&&state.key===key&&state.recordVersion===version)setWorkbookFreeze(option.dataset.freeze);};
  menu.onkeydown=e=>{const options=[...menu.querySelectorAll('button:not(:disabled)')],at=options.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeWorkbookFreezeMenu();button.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();options[e.key==='Home'?0:e.key==='End'?options.length-1:(at+(e.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}};menu.querySelector('button')?.focus({preventScroll:true});
});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#workbook-freeze-menu,[data-freeze-menu]'))closeWorkbookFreezeMenu();},true);
for(const type of ['resize','hashchange','storage'])window.addEventListener(type,closeWorkbookFreezeMenu);
