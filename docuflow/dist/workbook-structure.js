'use strict';
const WorkbookStructure=(()=>{
  const E=WorkbookEngine,R=WorkbookReference,writer=()=>new XMLSerializer(),clone=xml=>E.parseXml(writer().serializeToString(xml));
  const node=(xml,name)=>xml.createElementNS(xml.documentElement.namespaceURI,name);
  function sharedFormulas(xml){
    const masters=new Map();let total=0;
    for(const cell of E.elements(xml,'c')){const f=E.child(cell,'f');if(f?.getAttribute('t')==='shared'&&f.textContent)masters.set(f.getAttribute('si'),{text:f.textContent,point:R.parse(cell.getAttribute('r'))});}
    for(const cell of E.elements(xml,'c')){const f=E.child(cell,'f');if(!f)continue;if(f.getAttribute('t')==='shared'){const master=masters.get(f.getAttribute('si')),point=R.parse(cell.getAttribute('r'));if(!master||!point)throw new Error('Rumus bersama tidak lengkap. Perbaiki workbook di Excel.');f.textContent=R.translate(master.text,point.row-master.point.row,point.column-master.point.column);for(const attr of ['t','si','ref'])f.removeAttribute(attr);}total+=f.textContent.length;if(total>XlsxPackage.limits.part)throw new Error('Rumus workbook terlalu besar untuk diubah di browser.');}
  }
  function transformSheet(xml,name,op,target){
    sharedFormulas(xml);
    if(target){
      for(const f of E.elements(xml,'f'))if(['array','dataTable'].includes(f.getAttribute('t'))&&f.hasAttribute('ref')){
        const points=f.getAttribute('ref').split(':').map(R.parse);if(!points.every(Boolean))throw new Error('Rentang rumus array tidak valid.');const first=points[0][op.axis],last=points[points.length-1][op.axis];
        if(op.mode==='insert'?first<op.at&&op.at<=last:op.at<=last&&op.at+op.count-1>=first&&!(op.at<=first&&op.at+op.count-1>=last))throw new Error('Tidak dapat mengubah sebagian rumus array/tabel data. Pilih seluruh area rumus.');
      }
      if(op.axis==='row')for(const row of E.elements(xml,'row')){const next=R.point(Number(row.getAttribute('r')),op);if(next===null||next>R.limits.row){if(next>R.limits.row&&E.elements(row,'c').some(cell=>E.child(cell,'v')||E.child(cell,'f')||E.child(cell,'is')))throw new Error('Penyisipan akan melewati batas baris Excel.');row.remove();}else row.setAttribute('r',next);}
      for(const cell of E.elements(xml,'c')){const point=R.parse(cell.getAttribute('r'));if(!point)throw new Error('Alamat sel tidak valid.');const next=R.point(point[op.axis],op);if(next===null){cell.remove();continue;}if(next>R.limits[op.axis]){if(E.child(cell,'v')||E.child(cell,'f')||E.child(cell,'is'))throw new Error('Penyisipan akan melewati batas Excel.');cell.remove();continue;}point[op.axis]=next;cell.setAttribute('r',R.cell(point));}
      if(op.axis==='column')for(const col of E.elements(xml,'col')){const next=R.interval(Number(col.getAttribute('min')),Number(col.getAttribute('max')),op);if(!next||next[0]>R.limits.column){col.remove();continue;}col.setAttribute('min',next[0]);col.setAttribute('max',Math.min(R.limits.column,next[1]));}
      for(const element of [...E.elements(xml,'*')]){
        for(const attr of ['ref','sqref'])if(element.hasAttribute(attr)&&element.localName!=='dimension'){
          const next=element.getAttribute(attr).trim().split(/\s+/).map(ref=>R.range(ref,op)).filter(ref=>ref&&ref!=='#REF!');
          if(!next.length){if(element.localName==='selection')element.setAttribute(attr,'A1');else element.remove();}else element.setAttribute(attr,next.join(' '));
        }
        for(const attr of ['activeCell','topLeftCell'])if(element.hasAttribute(attr)){const p=R.parse(element.getAttribute(attr));if(p){p[op.axis]=Math.min(R.limits[op.axis],R.point(p[op.axis],op)??op.at);element.setAttribute(attr,R.cell(p));}}
      }
      for(const name of ['mergeCells','dataValidations'])for(const container of E.elements(xml,name)){container.setAttribute('count',container.children.length);if(!container.children.length)container.remove();}
      for(const pane of E.elements(xml,'pane'))if(['frozen','frozenSplit'].includes(pane.getAttribute('state'))){const attribute=op.axis==='row'?'ySplit':'xSplit',previous=Number(pane.getAttribute(attribute))||0;if(previous){const next=R.point(previous+1,op)??op.at;pane.setAttribute(attribute,Math.max(0,next-1));}}
      for(const name of [op.axis==='row'?'rowBreaks':'colBreaks'])for(const container of E.elements(xml,name)){for(const brk of [...container.children]){const value=R.point(Number(brk.getAttribute('id')),op);if(value===null)brk.remove();else brk.setAttribute('id',value);}container.setAttribute('count',container.children.length);container.setAttribute('manualBreakCount',[...container.children].filter(n=>n.getAttribute('man')==='1').length);}
    }
    for(const link of E.elements(xml,'hyperlink'))if(link.hasAttribute('location')){const location=link.getAttribute('location');if(R.has3D(location))throw new Error('Referensi hyperlink 3D belum didukung.');link.setAttribute('location',R.formula(location,op,name));}
    for(const tag of ['f','formula','formula1','formula2'])for(const f of E.elements(xml,tag)){if(R.has3D(f.textContent))throw new Error('Referensi rumus 3D belum dapat diubah di browser. Ubah struktur file ini di Excel.');f.textContent=R.formula(f.textContent,op,name);}
  }
  function moveObject(image,op){
    const key=op.axis==='row'?'row':'column',end=op.axis==='row'?'toRow':'toColumn',limit=R.limits[op.axis];
    const result={...image,[key]:R.point(image[key]+1,op)??op.at};result[key]--;
    if(result[key]>=limit)throw new Error('Objek akan melewati batas Excel.');
    if(image[end]!==null){result[end]=(R.point(image[end]+1,op)??op.at)-1;if(result[end]<result[key])result[end]=result[key];if(result[end]===result[key]&&(op.axis==='row'?image.toY<=image.y:image.toX<=image.x))result[end]=Math.min(limit-1,result[key]+1);}
    return result;
  }
  async function plan(book,index,axis,at,count,mode){
    if(!['row','column'].includes(axis)||!['insert','delete'].includes(mode)||![at,count].every(Number.isInteger)||at<1||count<1||at+count-1>book.sheets[index][axis==='row'?'rows':'columns'])throw new Error('Pilihan baris/kolom tidak valid.');
    if(Object.keys(book.zip.files).some(path=>/^xl\/(tables|charts|pivotTables|pivotCache|externalLinks|threadedComments)\//i.test(path)||/^xl\/comments/i.test(path)))throw new Error('Workbook ini memiliki tabel/chart/pivot/komentar atau tautan eksternal. Ubah struktur di Excel agar referensinya tetap utuh.');
    const op={axis,at,count,mode,sheet:book.sheets[index].name},workbook=clone(book.workbook),rels=await E.readXml(book.zip,'xl/_rels/workbook.xml.rels',true),all=[],hiddenParts=new Map(book.hiddenParts||[]),hiddenOriginals=new Map(book.hiddenOriginals||[]);
    for(const record of E.elements(workbook,'sheet')){
      const id=record.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),relation=E.elements(rels,'Relationship').find(n=>n.getAttribute('Id')===id&&n.getAttribute('TargetMode')!=='External');if(!relation)continue;
      const path=XlsxPackage.resolvePart('xl/workbook.xml',relation.getAttribute('Target')),visible=book.sheets.findIndex(sheet=>sheet.path===path);
      const original=visible>=0?book.sheets[visible].xml:hiddenParts.has(path)?E.parseXml(hiddenParts.get(path)):await E.readXml(book.zip,path,true),xml=clone(original);
      if(visible<0&&!hiddenOriginals.has(path))hiddenOriginals.set(path,writer().serializeToString(original));
      transformSheet(xml,record.getAttribute('name'),op,visible===index);
      if(visible>=0)all[visible]=xml;else hiddenParts.set(path,writer().serializeToString(xml));
    }
    const names=E.elements(workbook,'sheet').map(n=>n.getAttribute('name'));
    for(const name of E.elements(workbook,'definedName')){if(R.has3D(name.textContent))throw new Error('Defined name dengan referensi 3D belum didukung.');name.textContent=R.formula(name.textContent,op,name.hasAttribute('localSheetId')?names[Number(name.getAttribute('localSheetId'))]:null);}
    const changes=book.sheets.map((sheet,i)=>{
      const xml=all[i]||clone(sheet.xml),moves={...(sheet.imageMoves||{})},inserted=[...(sheet.insertedImages||[])],axisChanges=[...(sheet.axisChanges||[])];
      if(i===index){for(const image of sheet.images)moves[image.anchorIndex]=moveObject(moves[image.anchorIndex]||image,op);for(let n=0;n<inserted.length;n++)inserted[n]=moveObject(inserted[n],op);axisChanges.push(op);
        const rows=axis==='row'?Math.max(1000,Math.min(R.limits.row,sheet.rows+(mode==='insert'?count:-count))):sheet.rows,columns=axis==='column'?Math.max(1000,Math.min(R.limits.column,sheet.columns+(mode==='insert'?count:-count))):sheet.columns;
        let dimension=E.elements(xml,'dimension')[0];if(!dimension){dimension=node(xml,'dimension');xml.documentElement.insertBefore(dimension,[...xml.documentElement.children].find(n=>n.localName!=='sheetPr')||null);}dimension.setAttribute('ref','A1:'+XlsxPackage.address(columns,rows));
      }
      const fake={...sheet,xml,cells:new Map(E.elements(xml,'c').map(c=>[c.getAttribute('r'),c])),imageMoves:moves,insertedImages:inserted,axisChanges};E.verifySheet(fake);return fake;
    });
    const sizes=changes.map(sheet=>writer().serializeToString(sheet.xml).length).concat([...hiddenParts.values()].map(x=>x.length));if(sizes.some(n=>n>XlsxPackage.limits.part)||sizes.reduce((a,b)=>a+b,0)>XlsxPackage.limits.expanded)throw new Error('Hasil perubahan melebihi ukuran workbook yang didukung.');
    return {sheets:changes,workbook,hiddenParts,hiddenOriginals,op};
  }
  function commit(book,change){
    change.sheets.forEach((next,index)=>{const sheet=book.sheets[index],changed=writer().serializeToString(sheet.xml)!==writer().serializeToString(next.xml);for(const key of ['xml','cells','rows','columns','merges','imageMoves','insertedImages','axisChanges'])sheet[key]=next[key];if(changed||index===book.sheets.findIndex(s=>s.name===change.op.sheet))book.modified.add(index);});book.workbook=change.workbook;book.hiddenParts=change.hiddenParts;book.hiddenOriginals=change.hiddenOriginals;book.formulasRemoved=true;
  }
  function drawingAnchors(drawing,operations){
    for(const op of operations||[])for(const anchor of [...drawing.documentElement.children]){
      const tag=op.axis==='row'?'row':'col',from=E.child(anchor,'from'),to=E.child(anchor,'to');if(!from)continue;
      for(const marker of [from,to]){if(!marker)continue;const coordinate=E.child(marker,tag);if(coordinate)coordinate.textContent=Math.min(R.limits[op.axis]-1,(R.point(Number(coordinate.textContent)+1,op)??op.at)-1);}
      if(to){const a=E.child(from,tag),b=E.child(to,tag),offTag=tag==='row'?'rowOff':'colOff';if(a&&b&&(Number(b.textContent)<Number(a.textContent)||Number(b.textContent)===Number(a.textContent)&&Number(E.child(to,offTag)?.textContent)<=Number(E.child(from,offTag)?.textContent)))b.textContent=Math.min(R.limits[op.axis]-1,Number(a.textContent)+1);}
    }
  }
  function editColumns(xml,start,end,apply){
    let container=E.elements(xml,'cols')[0];if(!container){container=node(xml,'cols');xml.documentElement.insertBefore(container,E.elements(xml,'sheetData')[0]);}
    const previous=[...container.children],bounds=new Set([start,end+1]);for(const col of previous){bounds.add(Number(col.getAttribute('min')));bounds.add(Number(col.getAttribute('max'))+1);}const edges=[...bounds].sort((a,b)=>a-b),result=[];
    for(let i=0;i<edges.length-1;i++){const first=edges[i],last=edges[i+1]-1,old=previous.findLast(c=>Number(c.getAttribute('min'))<=first&&Number(c.getAttribute('max'))>=first);if(!old&&(first<start||first>end))continue;const col=old?old.cloneNode(true):node(xml,'col');col.setAttribute('min',first);col.setAttribute('max',last);if(first>=start&&last<=end)apply(col);result.push(col);}container.replaceChildren(...result);
  }
  function visibility(book,index,axis,start,end,hidden){
    const sheet=book.sheets[index],xml=sheet.xml;
    if(axis==='column')editColumns(xml,start,end,col=>{if(hidden)col.setAttribute('hidden','1');else{col.removeAttribute('hidden');if(col.hasAttribute('width')&&Number(col.getAttribute('width'))<=0)col.removeAttribute('width');}});
    else {
      let format=E.elements(xml,'sheetFormatPr')[0];const all=start===1&&end>=sheet.rows;
      if(!hidden&&all){format?.removeAttribute('zeroHeight');for(const row of E.elements(xml,'row')){row.removeAttribute('hidden');if(row.hasAttribute('ht')&&Number(row.getAttribute('ht'))<=0)row.removeAttribute('ht');}}
      else if(hidden&&all){if(!format){format=node(xml,'sheetFormatPr');xml.documentElement.insertBefore(format,E.elements(xml,'cols')[0]||E.elements(xml,'sheetData')[0]);}format.setAttribute('zeroHeight','1');for(const row of E.elements(xml,'row'))row.setAttribute('hidden','1');}
      else {if(end-start+1>10000)throw new Error('Pilih maksimal 10.000 baris per aksi atau gunakan Hide/Unhide All.');const data=E.elements(xml,'sheetData')[0];for(let n=start;n<=end;n++){let row=E.elements(xml,'row').find(row=>Number(row.getAttribute('r'))===n);if(!row){row=node(xml,'row');row.setAttribute('r',n);data.insertBefore(row,[...data.children].find(r=>Number(r.getAttribute('r'))>n)||null);}if(hidden)row.setAttribute('hidden','1');else{row.setAttribute('hidden','0');if(row.hasAttribute('ht')&&Number(row.getAttribute('ht'))<=0)row.removeAttribute('ht');}}}
    }
    book.modified.add(index);
  }
  function clear(book,index,axis,start,end){
    const sheet=book.sheets[index],xml=clone(sheet.xml);let removed=false;
    for(const f of E.elements(xml,'f'))if(['array','dataTable'].includes(f.getAttribute('t'))&&f.hasAttribute('ref')){
      const points=f.getAttribute('ref').split(':').map(R.parse);if(!points.every(Boolean))throw new Error('Rentang rumus array tidak valid.');
      const first=points[0][axis],last=points[points.length-1][axis];if(start<=last&&end>=first&&!(start<=first&&end>=last))throw new Error('Tidak dapat menghapus sebagian rumus array/tabel data. Pilih seluruh area rumus.');
    }
    sharedFormulas(xml);
    const cells=new Map(E.elements(xml,'c').map(cell=>[cell.getAttribute('r'),cell]));
    for(const [reference,cell] of cells){const p=R.parse(reference);if(p[axis]<start||p[axis]>end)continue;if(E.child(cell,'f'))removed=true;for(const child of [...cell.children])if(['v','is','f'].includes(child.localName))child.remove();for(const attr of ['t','cm','vm','ph'])cell.removeAttribute(attr);}
    sheet.xml=xml;sheet.cells=cells;if(removed)book.formulasRemoved=true;book.modified.add(index);
  }
  function formatAxis(book,index,axis,start,end,properties,borderOptions={color:'#64748b'}){
    if(axis==='row'&&end-start+1>10000)throw new Error('Pilih maksimal 10.000 baris per perubahan format.');
    const sheet=book.sheets[index],borderAddress=axis==='column'?XlsxPackage.address(start,1)+':'+XlsxPackage.address(end,sheet.rows):XlsxPackage.address(1,start)+':'+XlsxPackage.address(sheet.columns,end);
    if(properties.borders!==undefined)WorkbookFormat.references(WorkbookFormat.range(sheet,borderAddress));
    const cache=new Map(),style=(old)=>{old=Number(old)||0;if(cache.has(old))return cache.get(old);const xml=E.parseXml(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" s="${old}"/></row></sheetData></worksheet>`),temp={xml,rows:1,columns:1,cells:new Map(),images:[],merges:[]};temp.cells.set('A1',E.elements(xml,'c')[0]);const position=book.sheets.length;book.sheets.push(temp);try{for(const [property,value] of Object.entries(properties))if(property==='borders')WorkbookBorders.apply(book,position,'A1',value,borderOptions);else WorkbookFormat.format(book,position,'A1',property,value);const result=Number(temp.cells.get('A1').getAttribute('s'))||0;cache.set(old,result);return result;}finally{book.sheets.pop();book.modified.delete(position);}};
    style(0);
    for(const [reference,cell] of sheet.cells){const p=R.parse(reference);if(p[axis]>=start&&p[axis]<=end)cell.setAttribute('s',style(cell.getAttribute('s')||defaultStyle(sheet,p.row,p.column)));}
    if(axis==='column')editColumns(sheet.xml,start,end,col=>col.setAttribute('style',style(col.getAttribute('style'))));
    else {const data=E.elements(sheet.xml,'sheetData')[0];for(let n=start;n<=end;n++){let row=E.elements(sheet.xml,'row').find(row=>Number(row.getAttribute('r'))===n);if(!row){row=node(sheet.xml,'row');row.setAttribute('r',n);data.insertBefore(row,[...data.children].find(r=>Number(r.getAttribute('r'))>n)||null);}row.setAttribute('s',style(row.getAttribute('s')));row.setAttribute('customFormat','1');}}
    if(properties.borders!==undefined)WorkbookBorders.apply(book,index,borderAddress,properties.borders,borderOptions);
    book.modified.add(index);
  }
  function defaultStyle(sheet,row,column){const r=E.elements(sheet.xml,'row').find(n=>Number(n.getAttribute('r'))===row);if(r?.hasAttribute('s'))return Number(r.getAttribute('s'));const c=E.elements(sheet.xml,'col').findLast(n=>Number(n.getAttribute('min'))<=column&&Number(n.getAttribute('max'))>=column);return Number(c?.getAttribute('style')||0);}
  return {plan,commit,drawingAnchors,visibility,clear,formatAxis,defaultStyle};
})();
