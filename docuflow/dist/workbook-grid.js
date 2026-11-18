'use strict';

// Lay text out at its native font size, then scale the finished text layer.
// CSS zoom alone rounds font metrics and can change wrapping at small zooms.
function workbookTextLayer(content,width,height,zoom){
  const layer=document.createElement('div');layer.className='workbook-text-layer';
  Object.assign(layer.style,{position:'absolute',left:'0px',top:'0px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px',zoom:1/zoom,transform:`scale(${zoom})`,transformOrigin:'0 0'});
  layer.appendChild(content);return layer;
}
function reconcileWorkbookChildren(parent,nodes){
  const keep=new Set(nodes);for(const child of [...parent.children])if(!keep.has(child))child.remove();
  let previous=null;for(const node of nodes){const next=previous?previous.nextSibling:parent.firstChild;if(node!==next)parent.insertBefore(node,next);previous=node;}
}

// Render both axes around the viewport, keeping the full sheet scrollable.
function renderWorkbookGrid(state, writable, grid) {
  const sheetIndex = state.sheetIndex, sheet = state.book.sheets[sheetIndex];
  // A history action or sheet switch may already have selected a different cell.
  const captureFocus=()=>document.activeElement?.matches('.workbook-cell')&&document.activeElement.dataset.cell===state.selected?{reference:document.activeElement.dataset.cell,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd,editing:state.editingCell===document.activeElement.dataset.cell,original:state.editingOriginal,historyGroup:state.historyGroup}:null;
  let initialFocus=captureFocus();
  const scroll = { top: grid.scrollTop, left: grid.scrollLeft };
  grid.replaceChildren();
  const canvas = document.createElement('div'); canvas.className = 'workbook-canvas';
  const table = document.createElement('table'); table.className = 'workbook-sheet'; table.setAttribute('aria-label', sheet.name); table.setAttribute('aria-rowcount', sheet.rows + 1); table.setAttribute('aria-colcount', sheet.columns + 1);
  const defaultHidden=['1','true'].includes(WorkbookEngine.elements(sheet.xml,'sheetFormatPr')[0]?.getAttribute('zeroHeight'));
  const defaultWidth=WorkbookEngine.axisDefault(sheet,'column'),defaultHeight=WorkbookEngine.axisDefault(sheet,'row');
  const widths = Array(sheet.columns).fill(defaultWidth), heights = Array(sheet.rows).fill(defaultHidden?0:defaultHeight),columnStyles=Array(sheet.columns).fill(0),rowStyles=new Map();
  for (const column of WorkbookEngine.elements(sheet.xml, 'col')) {
    const width = ['1','true'].includes(column.getAttribute('hidden'))||column.hasAttribute('width')&&Number(column.getAttribute('width'))===0?0:(column.hasAttribute('width')?WorkbookEngine.columnPixels(sheet,column.getAttribute('width')):defaultWidth);
    for (let index = Math.max(1, Number(column.getAttribute('min'))); index <= Math.min(sheet.columns, Number(column.getAttribute('max'))); index++) {widths[index - 1] = width;columnStyles[index-1]=Number(column.getAttribute('style'))||0;}
  }
  for (const row of WorkbookEngine.elements(sheet.xml, 'row')) {
    const index = Number(row.getAttribute('r')) - 1;
    if(index>=0&&index<heights.length){const hidden=row.hasAttribute('hidden')?['1','true'].includes(row.getAttribute('hidden')):defaultHidden;heights[index]=hidden||row.hasAttribute('ht')&&Number(row.getAttribute('ht'))===0?0:(row.hasAttribute('ht')?WorkbookEngine.sizePixels('row',row.getAttribute('ht')):defaultHeight);if(row.hasAttribute('s'))rowStyles.set(index+1,Number(row.getAttribute('s'))||0);}
  }
  // Browser table layout rounds each cell to layout subpixels, including CSS zoom.
  // Quantize before summing so hundreds of fractional sizes do not accumulate drift.
  let zoom=1;for(let ancestor=grid;ancestor;ancestor=ancestor.parentElement)zoom*=Number(getComputedStyle(ancestor).zoom)||1;
  // Chromium rounds a CSS border up to one physical pixel at small zooms.
  // Reserve that actual size in cells and headers to prevent row-height drift.
  const gridBorder=Math.max(1,1/zoom);
  // Native scroll limits apply after CSS/sheet zoom on both axes.
  for(const sizes of [widths,heights]){const total=sizes.reduce((sum,n)=>sum+n,0),limit=30000000/zoom;if(total>limit){const factor=limit/total;for(let i=0;i<sizes.length;i++)sizes[i]*=factor;}}
  const layoutSize=value=>Math.floor(value*zoom*64+1e-7)/(zoom*64);
  for(let i=0;i<widths.length;i++)widths[i]=layoutSize(widths[i]);
  for(let i=0;i<heights.length;i++)heights[i]=layoutSize(heights[i]);
  const sheetZoom=(state.view?.zoom||100)/100,headerWidth=layoutSize(44/sheetZoom),headerHeight=layoutSize(28/sheetZoom);
  const freeze=state.view?.freeze||{rows:0,columns:0};
  const x = [headerWidth], y = [headerHeight];
  for (const width of widths) x.push(x[x.length - 1] + width);
  for (const height of heights) y.push(y[y.length - 1] + height);
  state.gridLayout = { x, y, grid, zoom, rowStyles, columnStyles,freeze };
  table.style.width = x[x.length - 1] + 'px';
  const columns = document.createElement('colgroup'), head = document.createElement('thead'), body = document.createElement('tbody');
  table.append(columns, head, body); canvas.appendChild(table);
  for (const original of [...sheet.images, ...(sheet.insertedImages || [])]) {
    const image=original.anchorIndex!==undefined ? sheet.imageMoves?.[original.anchorIndex]||original : original;
    if(image.hidden)continue;
    const node = image.kind==='shape'?workbookShapeNode(image):document.createElement('img'); node.classList.add('workbook-image'); node.alt = 'Gambar pada template ' + sheet.name; node.src = image.source; if(writable){node.dataset.insertedImage=original.anchorIndex!==undefined ? 'original-'+original.anchorIndex : sheet.insertedImages.indexOf(original);node.classList.add('is-movable');node.title=image.kind==='shape'?'Geser atau ubah ukuran bentuk':'Geser atau ubah ukuran gambar. Rasio terkunci; tahan Shift untuk ukuran bebas.';node.draggable=false;node.tabIndex=0;node.setAttribute('aria-label',image.kind==='shape'?'Bentuk '+WorkbookShapes.get(image.id).label:'Geser gambar unggahan');}
    const left = (x[image.column] ?? x[0]) + image.x, top = (y[image.row] ?? y[0]) + image.y;
    const imageWidth=!image.fixedSize&&image.toColumn !== null ? (x[image.toColumn] ?? left + image.width) + image.toX - left : image.width,imageHeight=!image.fixedSize&&image.toRow !== null ? (y[image.toRow] ?? top + image.height) + image.toY - top : image.height;
    if(imageWidth<=0||imageHeight<=0)continue;
    node.style.left = left + 'px'; node.style.top = top + 'px'; node.style.width = imageWidth + 'px'; node.style.height = imageHeight + 'px';
    if(image.kind==='shape'){WorkbookShapes.resizeSvg(node.querySelector('svg'),image.id,imageWidth,imageHeight,image.lineWidth);resizeWorkbookShapeText(node,imageWidth,imageHeight);}
    canvas.appendChild(node);
    node.dataset.paneColumn=image.column+1;node.dataset.paneRow=image.row+1;
  }
  grid.appendChild(canvas);
  let renderedWindow = null, pending = false, renderedColumnsKey=null,rowCache=new Map(),renderedWidth=0,renderedHeight=0;
  const itemAt = (edges, offset) => { const index = edges.findIndex(end => end > offset); return index < 0 ? edges.length - 1 : Math.max(1, index); };
  function gapCell(tag, width) {
    const cell = document.createElement(tag); cell.className = 'workbook-column-gap'; cell.setAttribute('aria-hidden', 'true'); cell.style.width = width + 'px'; return cell;
  }
  function renderViewport() {
    if (!canvas.isConnected || activeWorkbook !== state || state.sheetIndex !== sheetIndex) return;
    const viewport={firstRow:Math.max(freeze.rows+1,itemAt(y,grid.scrollTop+y[freeze.rows])),lastRow:Math.min(sheet.rows,itemAt(y,grid.scrollTop+grid.clientHeight)),firstCol:Math.max(freeze.columns+1,itemAt(x,grid.scrollLeft+x[freeze.columns])),lastCol:Math.min(sheet.columns,itemAt(x,grid.scrollLeft+grid.clientWidth))};
    // Keep the existing cells while the viewport is inside its buffer. Native
    // scrolling then needs no DOM work for each individual row or pixel.
    if(renderedWindow&&renderedWidth===grid.clientWidth&&renderedHeight===grid.clientHeight&&viewport.firstRow>=renderedWindow.firstRow&&viewport.lastRow<=renderedWindow.lastRow&&viewport.firstCol>=renderedWindow.firstCol&&viewport.lastCol<=renderedWindow.lastCol)return;
    const firstRow=Math.max(freeze.rows+1,viewport.firstRow-10),lastRow=Math.min(sheet.rows,Math.max(firstRow+49,viewport.lastRow+10));
    const firstCol=Math.max(freeze.columns+1,viewport.firstCol-5),lastCol=Math.min(sheet.columns,Math.max(firstCol+25,viewport.lastCol+5));
    renderedWindow={firstRow,lastRow,firstCol,lastCol};renderedWidth=grid.clientWidth;renderedHeight=grid.clientHeight;Object.assign(state.gridLayout,renderedWindow);
    const focused = captureFocus()||initialFocus;initialFocus=null;
    const frozenRows=Array.from({length:Math.min(freeze.rows,itemAt(y,grid.clientHeight)+1)},(_,i)=>i+1).filter(n=>heights[n-1]>0),frozenCols=Array.from({length:Math.min(freeze.columns,itemAt(x,grid.clientWidth)+1)},(_,i)=>i+1).filter(n=>widths[n-1]>0);
    const leftGap = x[firstCol - 1] - x[frozenCols.at(-1)||0], rightGap = x[sheet.columns] - x[lastCol];
    const visibleRows=[...frozenRows,...Array.from({length:Math.max(0,lastRow-firstRow+1)},(_,i)=>firstRow+i).filter(n=>heights[n-1]>0)],visibleCols=[...frozenCols,...Array.from({length:Math.max(0,lastCol-firstCol+1)},(_,i)=>firstCol+i).filter(n=>widths[n-1]>0)];
    state.gridLayout.visibleRows=visibleRows;
    const renderedColumns = 1 + visibleCols.length + (leftGap ? 1 : 0) + (rightGap ? 1 : 0);
    const columnsKey=visibleCols.join(':'),sameColumns=renderedColumnsKey===columnsKey;renderedColumnsKey=columnsKey;
    if(!sameColumns){
    columns.replaceChildren();
    for (const width of [x[0],...frozenCols.map(n=>widths[n-1]), ...(leftGap ? [leftGap] : []), ...visibleCols.filter(n=>n>freeze.columns).map(n=>widths[n-1]), ...(rightGap ? [rightGap] : [])]) {
      const column = document.createElement('col'); column.style.width = width + 'px'; columns.appendChild(column);
    }
    const header = document.createElement('tr'),corner=document.createElement('th');corner.dataset.workbookCorner='';corner.setAttribute('aria-label','Semua baris dan kolom');header.appendChild(corner);
    for (const column of visibleCols) {
      if(leftGap&&column===visibleCols.find(n=>n>freeze.columns))header.appendChild(gapCell('th',leftGap));
      const cell = document.createElement('th'); cell.scope = 'col'; cell.dataset.column = column; cell.setAttribute('aria-colindex', column + 1); cell.textContent = XlsxPackage.address(column, 1).replace(/\d+$/, ''); if(writable){const edge=document.createElement('span');edge.className='workbook-column-resizer';edge.dataset.resizeColumn=column;edge.title='Geser untuk mengubah lebar kolom';edge.setAttribute('aria-label','Ubah lebar kolom '+cell.textContent);cell.appendChild(edge);} header.appendChild(cell);
      if(column<=freeze.columns){cell.style.left=x[column-1]+'px';cell.classList.add('is-frozen-column');}
    }
    if (rightGap) header.appendChild(gapCell('th', rightGap));
    head.replaceChildren(header);
    }
    // Materialize merge coverage only inside the current window.
    const merges = new Map(),mergeKeys=new Map(),rowMergeKeys=new Map();
    for(const merge of sheet.merges){const rows=visibleRows.filter(row=>row>=merge.first.row&&row<=merge.last.row),cols=visibleCols.filter(column=>column>=merge.first.column&&column<=merge.last.column);if(!rows.length||!cols.length)continue;
      const key=[merge.start,rows[0],rows.at(-1),cols[0],cols.at(-1)].join(':');mergeKeys.set(merge,key);
      for(const row of rows){rowMergeKeys.set(row,(rowMergeKeys.get(row)||'')+key+';');for(const column of cols)merges.set((row-1)*sheet.columns+column,merge);}
    }
    const rowNodes = [];
    const borderEdges=[],nextRowCache=new Map();
    function spacer(height) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      row.className = 'workbook-spacer'; row.setAttribute('aria-hidden', 'true'); cell.colSpan = renderedColumns; cell.style.height = height + 'px'; row.appendChild(cell); return row;
    }
    for (const row of visibleRows) {
      if(row===visibleRows.find(n=>n>freeze.rows)&&firstRow>freeze.rows+1)rowNodes.push(spacer(y[firstRow-1]-y[frozenRows.at(-1)||0]));
      const cachedRow=rowCache.get(row),mergeKey=rowMergeKeys.get(row)||'';
      if(sameColumns&&cachedRow?.mergeKey===mergeKey){rowNodes.push(cachedRow.node);borderEdges.push(...cachedRow.edges);nextRowCache.set(row,cachedRow);continue;}
      const cells=new Map(),rowEdgeStart=borderEdges.length;
      const line = cachedRow?.node||document.createElement('tr'); line.style.height = heights[row - 1] + 'px'; line.setAttribute('aria-rowindex', row + 1);
      let label=cachedRow?.node.firstElementChild;
      if(!label){label=document.createElement('th');label.scope = 'row'; label.dataset.row = row;const rowNumber=document.createElement('div');rowNumber.className='workbook-row-number';rowNumber.style.height=Math.max(0,heights[row-1]-gridBorder)+'px';rowNumber.style.lineHeight=Math.min(14/sheetZoom,Math.max(0,heights[row-1]-gridBorder))+'px';rowNumber.textContent=row;label.appendChild(rowNumber);if(writable){const edge=document.createElement('span');edge.className='workbook-row-resizer';edge.dataset.resizeRow=row;edge.title='Geser untuk mengubah tinggi baris';edge.setAttribute('aria-label','Ubah tinggi baris '+row);label.appendChild(edge);}}
      const rowChildren=[label];
      if(row<=freeze.rows){label.style.top=y[row-1]+'px';label.classList.add('is-frozen-row');}
      for (const column of visibleCols) {
        if(leftGap&&column===visibleCols.find(n=>n>freeze.columns))rowChildren.push(gapCell('td',leftGap));
        let reference = XlsxPackage.address(column, row), height = heights[row - 1],cellWidth=widths[column-1];
        const merge = merges.get((row - 1) * sheet.columns + column),cellKey=mergeKeys.get(merge)||'',cachedCell=cachedRow?.cells.get(column);
        if(cachedCell?.key===cellKey){rowChildren.push(cachedCell.node);borderEdges.push(...cachedCell.edges);cells.set(column,cachedCell);continue;}
        const td = document.createElement('td'); td.setAttribute('aria-colindex', column + 1);
        if (merge) {
          const mergeRows=visibleRows.filter(n=>n>=merge.first.row&&n<=merge.last.row&&(n<=freeze.rows)===(row<=freeze.rows)),mergeCols=visibleCols.filter(n=>n>=merge.first.column&&n<=merge.last.column&&(n<=freeze.columns)===(column<=freeze.columns)),visibleRow=mergeRows[0],visibleCol=mergeCols[0],bottom=mergeRows.at(-1);
          if (row !== visibleRow || column !== visibleCol) continue;
          reference = merge.start; td.colSpan = mergeCols.length; td.rowSpan = mergeRows.length; height = y[bottom] - y[visibleRow - 1];cellWidth=x[mergeCols.at(-1)]-x[visibleCol-1];
        }
        const cell = sheet.cells.get(reference), style = state.book.styles[Number(cell?.getAttribute('s')??rowStyles.get(row)??columnStyles[column-1]) || 0] || {};
        td.dataset.gridRow=row;td.dataset.gridColumn=column;
        if(row<=freeze.rows||column<=freeze.columns){td.classList.add('is-frozen-cell');td.style.position='sticky';td.style.zIndex=row<=freeze.rows&&column<=freeze.columns?'24':'20';if(!style.background)td.style.backgroundColor='#ffffff';if(row<=freeze.rows)td.style.top=y[row-1]+'px';if(column<=freeze.columns)td.style.left=x[column-1]+'px';}
        if (style.background) {td.style.backgroundColor = style.background;td.style.borderColor='transparent';}
        const bounds={left:x[column-1],top:y[row-1],right:x[column-1]+cellWidth,bottom:y[row-1]+height};
        const cellEdgeStart=borderEdges.length;
        if(merge){
          // Each portion of a merged edge may have a different native style.
          for(const side of ['top','bottom','left','right']){
            const horizontal=side==='top'||side==='bottom',axis=horizontal?'column':'row',first=horizontal?visibleCols:visibleRows;
            if(side==='top'&&row>merge.first.row||side==='left'&&column>merge.first.column||side==='bottom'&&row<=freeze.rows&&merge.last.row>freeze.rows||side==='right'&&column<=freeze.columns&&merge.last.column>freeze.columns)continue;
            for(const n of first){if(n<merge.first[axis]||n>merge.last[axis])continue;
              const ref=horizontal?XlsxPackage.address(n,side==='top'?merge.first.row:merge.last.row):XlsxPackage.address(side==='left'?merge.first.column:merge.last.column,n),part=sheet.cells.get(ref),partStyle=part?.hasAttribute('s')?state.book.styles[Number(part.getAttribute('s'))]:style,border=partStyle?.borders?.[side];
              if(border)borderEdges.push(horizontal?{x1:x[n-1],x2:x[n],y1:bounds[side],y2:bounds[side],border}:{x1:bounds[side],x2:bounds[side],y1:y[n-1],y2:y[n],border});
            }
          }
        }else for(const [side,border] of Object.entries(style.borders||{})){const horizontal=side==='top'||side==='bottom';borderEdges.push({x1:horizontal?bounds.left:bounds[side],x2:horizontal?bounds.right:bounds[side],y1:horizontal?bounds[side]:bounds.top,y2:horizontal?bounds[side]:bounds.bottom,border});}
        const input = document.createElement('textarea'); input.className = 'workbook-cell'; input.rows = 1; input.maxLength = 4000; input.dataset.cell = reference; input.setAttribute('aria-label', 'Sel ' + reference); input.spellcheck = false;
        input.value = WorkbookFormat.display(state.book, cell); input.readOnly = !writable || Boolean(cell && WorkbookEngine.child(cell, 'f'));
        input.dataset.displayColor=style.color||'#152c49';
        input.style.height = Math.max(0, height - gridBorder) + 'px'; input.style.color = style.color || '#152c49'; input.style.fontSize = (style.fontSize || 11) + 'pt'; input.style.fontWeight = style.bold ? '700' : '400'; input.style.fontStyle = style.italic ? 'italic' : 'normal';
        input.style.fontFamily = style.fontName || 'Arial'; input.style.textDecoration = [style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' ')||'none'; input.style.whiteSpace = style.wrap ? 'pre-wrap' : 'pre';
        if (['left', 'center', 'right'].includes(style.horizontal)) input.style.textAlign = style.horizontal;
        input.style.paddingLeft=input.style.paddingRight=Math.min(4,Math.max(0,(cellWidth-1)/2))+'px';
        if(height<12){input.style.paddingTop='0';input.style.paddingBottom='0';}
        if (input.readOnly) input.title = writable && cell && WorkbookEngine.child(cell, 'f') ? 'Rumus template dipertahankan' : 'Akses baca';
        if(merge){const clip=document.createElement('div');clip.className='workbook-merged-clip';clip.style.height=Math.max(0,height-gridBorder)+'px';const content=document.createElement('div');content.className='workbook-merged-content';content.style.left=x[merge.first.column-1]-x[column-1]+'px';content.style.top=y[merge.first.row-1]-y[row-1]+'px';const fullWidth=x[merge.last.column]-x[merge.first.column-1];content.style.width=fullWidth+'px';const fullHeight=y[merge.last.row]-y[merge.first.row-1];input.style.height=Math.max(0,fullHeight-gridBorder)+'px';content.appendChild(workbookTextLayer(input,fullWidth,fullHeight-gridBorder,zoom));clip.appendChild(content);td.appendChild(clip);}else td.appendChild(workbookTextLayer(input,cellWidth-gridBorder,height-gridBorder,zoom));rowChildren.push(td);
        if(['center','bottom'].includes(style.vertical)){input.dataset.textAlign=style.vertical;input.dataset.textHeight=parseFloat(input.style.height);}
        cells.set(column,{node:td,key:cellKey,edges:borderEdges.slice(cellEdgeStart)});
      }
      if (rightGap) rowChildren.push(gapCell('td', rightGap));
      reconcileWorkbookChildren(line,rowChildren);rowNodes.push(line);
      nextRowCache.set(row,{node:line,mergeKey,cells,edges:borderEdges.slice(rowEdgeStart)});
    }
    if (lastRow < sheet.rows) rowNodes.push(spacer(y[sheet.rows] - y[lastRow]));
    rowCache=nextRowCache;reconcileWorkbookChildren(body,rowNodes);alignWorkbookCellText(grid); selectWorkbookCell(state.selected); paintWorkbookPictureSelection();
    state.gridLayout.borderEdges=borderEdges;state.gridLayout.borderVersion=(state.gridLayout.borderVersion||0)+1;
    if (focused) {
      const input = grid.querySelector(`.workbook-cell[data-cell="${focused.reference}"]`);
      if (input) { input.focus({ preventScroll: true }); input.setSelectionRange(focused.start, focused.end);if(focused.editing){state.editingCell=focused.reference;state.editingOriginal=focused.original;state.historyGroup=focused.historyGroup;input.classList.add('is-editing');} }
    }
    refreshWorkbookOverflow();
  }
  renderViewport(); grid.scrollTop = scroll.top; grid.scrollLeft = scroll.left; renderViewport();
  grid.onscroll = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; renderViewport();paintWorkbookFrozenLayers(); }); };
  state.renderViewport = renderViewport;
}

function ensureWorkbookCellVisible(reference) {
  const layout = activeWorkbook?.gridLayout;
  if (!layout) return;
  const point = XlsxPackage.position(reference), { grid, x, y } = layout;
  const freeze=layout.freeze||{rows:0,columns:0};
  if (point.column>freeze.columns&&(x[point.column - 1] < grid.scrollLeft + x[freeze.columns] || x[point.column] > grid.scrollLeft + grid.clientWidth)) grid.scrollLeft = Math.max(0, x[point.column - 1] - x[freeze.columns]);
  if (point.row>freeze.rows&&(y[point.row - 1] < grid.scrollTop + y[freeze.rows] || y[point.row] > grid.scrollTop + grid.clientHeight)) grid.scrollTop = Math.max(0, y[point.row - 1] - y[freeze.rows]);
  activeWorkbook.renderViewport();
}

// Measure the browser's actual wrapping in a batch. Counting only explicit
// newlines puts centered multi-line cells too low and clips their final line.
function alignWorkbookCellText(grid){
  const entries=[...grid.querySelectorAll('.workbook-cell[data-text-align]')].map(input=>({input,height:Number(input.dataset.textHeight)}));
  const clones=entries.map(({input})=>{const clone=input.cloneNode(false);clone.value=input.value;clone.removeAttribute('id');clone.removeAttribute('data-cell');clone.tabIndex=-1;clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{position:'absolute',height:'0px',paddingTop:'0px',paddingBottom:'0px',visibility:'hidden'});input.parentElement.appendChild(clone);return clone;});
  const heights=clones.map(clone=>clone.value?clone.scrollHeight:0);clones.forEach(clone=>clone.remove());
  entries.forEach(({input,height},index)=>{input.style.height=height+'px';input.style.paddingBottom='0px';input.style.paddingTop=Math.max(0,(height-heights[index])/(input.dataset.textAlign==='center'?2:1))+'px';});
}
