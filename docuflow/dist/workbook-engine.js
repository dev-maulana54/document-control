'use strict';

const WorkbookEngine = (() => {
  const elements = (node, name) => {
    const root=node.nodeType===9?node.documentElement:node.ownerDocument?.documentElement;
    // Worksheet extensions can contain drawing coordinates named row/col as well.
    const namespace=root?.localName==='worksheet'&&['row','col','c'].includes(name)?root.namespaceURI:'*';
    return [...node.getElementsByTagNameNS(namespace,name)];
  };
  const child = (node, name) => node && [...node.children].find(element => element.localName === name);
  const text = (node, name) => child(node, name)?.textContent || '';
  const relationshipId = node => [...node.attributes].find(attribute => attribute.localName === 'id' && attribute.namespaceURI)?.value;
  const relationshipPath = part => part.slice(0, part.lastIndexOf('/') + 1) + '_rels/' + part.slice(part.lastIndexOf('/') + 1) + '.rels';
  const extractedParts = new WeakMap();

  // Shared conversions keep grid geometry, header dragging and dialogs in sync.
  function sizePixels(axis,value){value=Number(value);if(!Number.isFinite(value))return axis==='row'?28:88;value=Math.max(0,Math.min(axis==='row'?409:255,value));if(value===0)return 0;return Math.max(1,axis==='row'?value*4/3:value<1?value*12:value*7+5);}
  function sizeValue(axis,pixels){if(pixels<=0)return 0;return axis==='row'?pixels*3/4:pixels<12?pixels/12:(pixels-5)/7;}
  // OOXML width already includes padding; UI Column Width does not.
  function columnPixels(sheet,value){const width=Number(value),digit=sheet.digitWidth||7;return width<=0?0:Math.max(1,Math.floor((256*width+Math.floor(128/digit))/256*digit));}
  function columnWidth(sheet,pixels){return pixels<=0?0:Math.floor(pixels/(sheet.digitWidth||7)*256)/256;}
  function axisDefault(sheet,axis){const format=elements(sheet.xml,'sheetFormatPr')[0],attribute=axis==='row'?'defaultRowHeight':'defaultColWidth';return format?.hasAttribute(attribute)?axis==='row'?sizePixels(axis,format.getAttribute(attribute)):columnPixels(sheet,format.getAttribute(attribute)):axis==='row'?28:88;}
  function axisOffset(sheet,axis,index){
    if(axis==='column'){
      const base=axisDefault(sheet,axis),sizes=Array(index).fill(base);
      for(const col of elements(sheet.xml,'col')){const width=['1','true'].includes(col.getAttribute('hidden'))?0:col.hasAttribute('width')?columnPixels(sheet,col.getAttribute('width')):base;for(let n=Math.max(1,Number(col.getAttribute('min')));n<=Math.min(index,Number(col.getAttribute('max')));n++)sizes[n-1]=width;}
      return sizes.reduce((sum,width)=>sum+width,0);
    }
    const hidden=['1','true'].includes(elements(sheet.xml,'sheetFormatPr')[0]?.getAttribute('zeroHeight')),defaultHeight=axisDefault(sheet,axis),base=hidden?0:defaultHeight;let total=index*base;
    for(const row of elements(sheet.xml,'row')){const n=Number(row.getAttribute('r'));if(n<1||n>index)continue;const invisible=row.hasAttribute('hidden')?['1','true'].includes(row.getAttribute('hidden')):hidden;total+=(invisible?0:row.hasAttribute('ht')?sizePixels(axis,row.getAttribute('ht')):defaultHeight)-base;}
    return total;
  }
  function pictureAxisSignature(sheet){return JSON.stringify([elements(sheet.xml,'col').map(col=>['min','max','width','hidden'].map(a=>col.getAttribute(a))),elements(sheet.xml,'row').filter(row=>row.hasAttribute('ht')||row.hasAttribute('hidden')).map(row=>['r','ht','hidden'].map(a=>row.getAttribute(a))),['zeroHeight','defaultRowHeight','defaultColWidth'].map(a=>elements(sheet.xml,'sheetFormatPr')[0]?.getAttribute(a))]);}

  async function readPart(zip, path) {
    const state = extractedParts.get(zip) || { parts: new Map(), total: 0 };
    extractedParts.set(zip, state);
    if (state.parts.has(path)) return state.parts.get(path);
    const file = zip.file(path);
    if (!file) return null;
    const bytes = await new Promise((resolve, reject) => {
      const chunks = []; let size = 0;
      const stream = file.internalStream('uint8array');
      stream.on('data', chunk => {
        size += chunk.length;
        if (size > XlsxPackage.limits.part || state.total + size > XlsxPackage.limits.expanded) { stream.pause(); reject(new Error('Isi terurai workbook melebihi batas.')); return; }
        chunks.push(chunk);
      }).on('error', reject).on('end', () => { const result = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } resolve(result); }).resume();
    });
    state.total += bytes.length; state.parts.set(path, bytes);
    return bytes;
  }

  function parseXml(source) {
    if (source.length > XlsxPackage.limits.part || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('XML template tidak aman atau terlalu besar.');
    const xml = new DOMParser().parseFromString(source, 'application/xml');
    if (elements(xml, 'parsererror').length) throw new Error('Isi XML workbook tidak valid.');
    return xml;
  }

  async function readXml(zip, path, required = false) {
    const bytes = await readPart(zip, path);
    if (!bytes) { if (required) throw new Error('Bagian workbook tidak ditemukan: ' + path); return null; }
    return parseXml(new TextDecoder().decode(bytes));
  }

  async function relationships(zip, part) {
    const xml = await readXml(zip, relationshipPath(part));
    return xml ? new Map(elements(xml, 'Relationship').filter(node => node.getAttribute('TargetMode') !== 'External').map(node => [node.getAttribute('Id'), XlsxPackage.resolvePart(part, node.getAttribute('Target'))])) : new Map();
  }

  const indexedColors=('000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF 000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF 800000 008000 000080 808000 800080 008080 C0C0C0 808080 9999FF 993366 FFFFCC CCFFFF 660066 FF8080 0066CC CCCCFF 000080 FF00FF FFFF00 00FFFF 800080 800000 008080 0000FF 00CCFF CCFFFF CCFFCC FFFF99 99CCFF FF99CC CC99FF FFCC99 3366FF 33CCCC 99CC00 FFCC00 FF9900 FF6600 666699 969696 003366 339966 003300 333300 993300 993366 333399 333333').split(' ').map(v=>'#'+v);
  function color(node, fallback = '', palette = {}) {
    if (!node) return fallback;
    const rgb = node.getAttribute('rgb') || '';
    const theme = ['#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];
    let result=/^[a-f\d]{8}$/i.test(rgb)?'#'+rgb.slice(2):/^[a-f\d]{6}$/i.test(rgb)?'#'+rgb:null;
    if(!result&&node.hasAttribute('indexed')){const index=Number(node.getAttribute('indexed'));result=index===64?'#000000':index===65?'#ffffff':(palette.indexed||indexedColors)[index];}
    if(!result&&node.hasAttribute('theme'))result=(palette.theme||theme)[Number(node.getAttribute('theme'))];
    if(!result&&['1','true'].includes(node.getAttribute('auto')))result='#000000';
    result=result||fallback;const tint=Number(node.getAttribute('tint'));
    if(!tint||!/^#[a-f\d]{6}$/i.test(result))return result;
    // Office tints adjust HSL luminance, preserving the hue/saturation.
    const [r,g,b]=[1,3,5].map(n=>parseInt(result.slice(n,n+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2,s=d?d/(1-Math.abs(2*l-1)):0;
    let h=d?(max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4):0;h=(h+6)%6;
    const light=Math.max(0,Math.min(1,tint<0?l*(1+tint):l*(1-tint)+tint)),c=(1-Math.abs(2*light-1))*s,v=c*(1-Math.abs(h%2-1)),m=light-c/2,components=h<1?[c,v,0]:h<2?[v,c,0]:h<3?[0,c,v]:h<4?[0,v,c]:h<5?[v,0,c]:[c,0,v];
    return '#'+components.map(value=>Math.round((value+m)*255).toString(16).padStart(2,'0')).join('');
  }

  function stylesFrom(xml, book = {}) {
    if (!xml) return [{}];
    const root = xml.documentElement;
    const fonts = child(root, 'fonts')?.children || [];
    const fills = child(root, 'fills')?.children || [];
    const borders = child(root, 'borders')?.children || [];
    const palette={...book.palette};const indexed=child(child(root,'colors'),'indexedColors');if(indexed)palette.indexed=[...indexed.children].map(n=>color(n));
    return [...(child(root, 'cellXfs')?.children || [])].map(xf => {
      const font = fonts[Number(xf.getAttribute('fontId'))];
      const fill = fills[Number(xf.getAttribute('fillId'))];
      const border = borders[Number(xf.getAttribute('borderId'))];
      const alignment = child(xf, 'alignment');
      const enabled=name=>{const n=child(font,name);return Boolean(n)&&!['0','false','none'].includes(n.getAttribute('val'));};
      const pattern=child(fill,'patternFill');
      const style = { fontSize: Math.max(1, Math.min(409, Number(child(font, 'sz')?.getAttribute('val')) || 11)), fontName: child(font, 'name')?.getAttribute('val') || 'Arial', underline: enabled('u'), strike: enabled('strike'), wrap: ['1','true'].includes(alignment?.getAttribute('wrapText')), bold: enabled('b'), italic: enabled('i'), color: color(child(font, 'color'), '#000000',palette), background: pattern?.getAttribute('patternType')==='solid'?color(child(pattern,'fgColor'),'',palette):'', horizontal: alignment?.getAttribute('horizontal'), vertical: alignment?.getAttribute('vertical'), numFmt: Number(xf.getAttribute('numFmtId')) || 0, borders: {} };
      for (const side of ['left', 'right', 'top', 'bottom']) {
        const edge = child(border, side);
        if(edge?.hasAttribute('style')&&edge.getAttribute('style')!=='none'){const line=edge.getAttribute('style');style.borders[side]=`${line==='thick'||line==='double'?3:/medium/i.test(line)?2:1}px ${line==='double'?'double':line==='dotted'?'dotted':/dash/i.test(line)?'dashed':'solid'} ${color(child(edge,'color'),'#000000',palette)}`;}
      }
      return style;
    });
  }

  function cellValue(book, cell) {
    if (!cell) return '';
    const value = text(cell, 'v');
    if (cell.getAttribute('t') === 's') return book.strings[Number(value)] || '';
    if (cell.getAttribute('t') === 'inlineStr') return elements(cell, 't').map(node => node.textContent).join('');
    if (cell.getAttribute('t') === 'b') return value === '1' ? 'TRUE' : 'FALSE';
    return value;
  }

  async function readImages(book, sheet) {
    const drawing = elements(sheet.xml, 'drawing')[0];
    if (!drawing) return [];
    const sheetRels = await relationships(book.zip, sheet.path);
    const path = sheetRels.get(relationshipId(drawing));
    if (!path) return [];
    const xml = await readXml(book.zip, path);
    if (!xml) return [];
    const imageRels = await relationships(book.zip, path);
    const images = [];
    for (const anchor of [...xml.documentElement.children]) {
      const nativeShape=child(anchor,'grpSp')||child(anchor,'sp');
      if(nativeShape&&elements(nativeShape,'cNvPr')[0]?.getAttribute('name')?.startsWith('CBI Shape '))continue;
      const blip = elements(anchor, 'blip')[0];
      const embed = blip && [...blip.attributes].find(attribute => attribute.localName === 'embed')?.value;
      const imagePath = imageRels.get(embed);
      if (!nativeShape&&(!imagePath || !/\.(png|jpe?g|gif|bmp|webp|emf)$/i.test(imagePath))) continue;
      const file = imagePath&&book.zip.file(imagePath);
      if (!nativeShape&&!file) continue;
      const from = child(anchor, 'from'), to = child(anchor, 'to'), extent = child(anchor, 'ext')||child(child(child(child(anchor,'pic'),'spPr'),'xfrm'),'ext')||child(child(child(nativeShape,nativeShape?.localName==='grpSp'?'grpSpPr':'spPr'),'xfrm'),'ext');
      if (!from) continue;
      const bytes = nativeShape?new Uint8Array():await readPart(book.zip, imagePath);
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      let preview;
      if(nativeShape||/\.emf$/i.test(imagePath)){try{preview=nativeShape?await workbookDrawingPreview(book,nativeShape,imageRels):workbookVectorPreview(bytes);}catch{sheet.previewWarnings||=[];sheet.previewWarnings.push('Salah satu drawing belum dapat ditampilkan; data aslinya tetap dipertahankan.');continue;}}
      const mime=png?'png':jpeg?'jpeg':bytes[0]===71&&bytes[1]===73?'gif':bytes[0]===66&&bytes[1]===77?'bmp':bytes[0]===82&&bytes[1]===73?'webp':null;
      if(!preview&&!mime)continue;
      let binary = ''; for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      const image = { anchorIndex:[...xml.documentElement.children].indexOf(anchor), source: preview||'data:image/' + mime + ';base64,' + btoa(binary), column: Number(text(from, 'col')), row: Number(text(from, 'row')), x: Number(text(from, 'colOff')) / 9525, y: Number(text(from, 'rowOff')) / 9525, toColumn: to ? Number(text(to, 'col')) : null, toRow: to ? Number(text(to, 'row')) : null, toX: to ? Number(text(to, 'colOff')) / 9525 : 0, toY: to ? Number(text(to, 'rowOff')) / 9525 : 0, width: extent ? Number(extent.getAttribute('cx')) / 9525 : 120, height: extent ? Number(extent.getAttribute('cy')) / 9525 : 80 };
      image.fixedSize=anchor.localName==='oneCellAnchor'||anchor.getAttribute('editAs')==='oneCell';
      if(image.fixedSize&&!extent&&to){image.width=axisOffset(sheet,'column',image.toColumn)+image.toX-axisOffset(sheet,'column',image.column)-image.x;image.height=axisOffset(sheet,'row',image.toRow)+image.toY-axisOffset(sheet,'row',image.row)-image.y;}
      if (![image.column, image.row, image.x, image.y, image.width, image.height].every(Number.isFinite) || image.column < 0 || image.row < 0) continue;
      images.push(image);
    }
    sheet.pictureAxisSignature=pictureAxisSignature(sheet);return images;
  }

  function verifySheet(sheet) {
    let rows = 1000, columns = 1000;
    const dimension = elements(sheet.xml, 'dimension')[0]?.getAttribute('ref');
    if (dimension) { const end = XlsxPackage.position(dimension.split(':').pop()); rows = Math.max(rows, end.row); columns = Math.max(columns, end.column); }
    for (const row of elements(sheet.xml, 'row')) { const index = Number(row.getAttribute('r')); if (!Number.isInteger(index) || index < 1) throw new Error('Baris worksheet tidak valid.'); rows = Math.max(rows, index); }
    for (const column of elements(sheet.xml, 'col')) { const index = Number(column.getAttribute('max')); if (!Number.isInteger(index) || index < 1) throw new Error('Kolom worksheet tidak valid.'); columns = Math.max(columns, index); }
    for (const reference of sheet.cells.keys()) {
      const point = XlsxPackage.position(reference);
      rows = Math.max(rows, point.row); columns = Math.max(columns, point.column);
    }
    sheet.merges = elements(sheet.xml, 'mergeCell').map(node => {
      const [start, end] = node.getAttribute('ref').split(':');
      const first = XlsxPackage.position(start), last = XlsxPackage.position(end || start);
      if (last.row < first.row || last.column < first.column) throw new Error('Rentang merge tidak valid.');
      rows = Math.max(rows, last.row); columns = Math.max(columns, last.column);
      return { start, first, last };
    });
    for (const image of [...sheet.images.map(image=>sheet.imageMoves?.[image.anchorIndex]||image),...(sheet.insertedImages||[])].filter(image=>!image.hidden)) { rows = Math.max(rows, (image.toRow ?? image.row) + 1); columns = Math.max(columns, (image.toColumn ?? image.column) + 1); }
    if (rows > XlsxPackage.limits.rows || columns > XlsxPackage.limits.columns) throw new Error('Dimensi worksheet melebihi batas Excel.');
    if (sheet.merges.length > 5000) throw new Error('Template memiliki terlalu banyak rentang gabungan.');
    const ordered = [...sheet.merges].sort((a,b)=>a.first.row-b.first.row);
    for(let i=0;i<ordered.length;i++) for(let j=i+1;j<ordered.length && ordered[j].first.row<=ordered[i].last.row;j++) {
      if(ordered[i].first.column<=ordered[j].last.column && ordered[i].last.column>=ordered[j].first.column) throw new Error('Rentang sel gabungan bertumpuk. Perbaiki template di Excel.');
    }
    sheet.rows = rows; sheet.columns = columns;
  }

  function resizeSheet(book, sheetIndex, rows, columns) {
    const sheet = book.sheets[sheetIndex];
    if (!sheet) throw new Error('Worksheet tidak ditemukan.');
    const size = XlsxPackage.sheetSize(sheet.rows, sheet.columns, rows, columns);
    if (size.rows === sheet.rows && size.columns === sheet.columns) return false;
    sheet.rows = size.rows; sheet.columns = size.columns;
    updateDimension(sheet);
    book.modified.add(sheetIndex);
    return true;
  }

  function updateDimension(sheet) {
    let dimension = elements(sheet.xml, 'dimension')[0];
    if (!dimension) {
      dimension = sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI, 'dimension');
      sheet.xml.documentElement.insertBefore(dimension, [...sheet.xml.documentElement.children].find(node => node.localName !== 'sheetPr') || null);
    }
    dimension.setAttribute('ref', 'A1:' + XlsxPackage.address(sheet.columns, sheet.rows));
  }

  async function open(input) {
    XlsxPackage.inspectArchive(input);
    const zip = await JSZip.loadAsync(input);
    const contentTypes = await readXml(zip, '[Content_Types].xml', true);
    const types = elements(contentTypes, 'Override');
    if (elements(contentTypes, '*').some(node => /macroEnabled|vbaProject|activeX/i.test(node.getAttribute('ContentType') || ''))) throw new Error('Workbook dengan macro atau ActiveX tidak didukung.');
    if (!types.some(node => node.getAttribute('PartName') === '/xl/workbook.xml' && node.getAttribute('ContentType') === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml')) throw new Error('Pilih workbook Excel .xlsx yang valid.');
    const workbook = await readXml(zip, 'xl/workbook.xml', true);
    const book = { zip, workbook, strings: [], styles: [], sheets: [], modified: new Set() };
    const stringsXml = await readXml(zip, 'xl/sharedStrings.xml');
    if (stringsXml) book.strings = elements(stringsXml, 'si').map(node => elements(node, 't').map(text => text.textContent).join(''));
    book.stylesXml = await readXml(zip, 'xl/styles.xml');
    const themeRel=await readXml(zip,'xl/_rels/workbook.xml.rels'),themePart=elements(themeRel||workbook,'Relationship').find(n=>n.getAttribute('Type')?.endsWith('/theme')&&n.getAttribute('TargetMode')!=='External');
    const themeXml=themePart?await readXml(zip,XlsxPackage.resolvePart('xl/workbook.xml',themePart.getAttribute('Target'))):null;
    const scheme=themeXml&&elements(themeXml,'clrScheme')[0];
    if(scheme)book.palette={theme:['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'].map(name=>{const node=child(scheme,name)?.firstElementChild,value=node?.getAttribute('lastClr')||node?.getAttribute('val');return /^[a-f\d]{6}$/i.test(value)?'#'+value:undefined;})};
    book.styles = stylesFrom(book.stylesXml,book);
    const rels = await relationships(zip, 'xl/workbook.xml');
    for (const node of elements(workbook, 'sheet')) {
      if (node.getAttribute('state') === 'hidden' || node.getAttribute('state') === 'veryHidden') continue;
      const path = rels.get(relationshipId(node));
      if (!path) throw new Error('Worksheet tidak ditemukan.');
      const xml = await readXml(zip, path, true);
      const cells = new Map(elements(xml, 'c').map(cell => [cell.getAttribute('r'), cell]));
      const sheet = { name: node.getAttribute('name'), path, xml, cells, images: [] };
      sheet.images = await readImages(book, sheet);
      for(const shape of await WorkbookShapes.read(book,sheet)){const image=sheet.images.find(image=>image.anchorIndex===shape.anchorIndex);if(image){const preview=image.source,width=image.width,height=image.height,fixedSize=image.fixedSize;Object.assign(image,shape,{nativePreview:preview,source:preview,width,height,fixedSize});}else sheet.images.push(shape);}
      verifySheet(sheet);
      sheet.initialView=WorkbookPanes.read(sheet);
      book.sheets.push(sheet);
    }
    if (!book.sheets.length || book.sheets.length > 20) throw new Error('Workbook harus memiliki 1–20 sheet yang terlihat.');
    return book;
  }

  function inheritedCellStyle(sheet,point,row=elements(sheet.xml,'row').find(node=>Number(node.getAttribute('r'))===point.row)) {
    return row?.getAttribute('s')??elements(sheet.xml,'col').findLast(col=>Number(col.getAttribute('min'))<=point.column&&Number(col.getAttribute('max'))>=point.column)?.getAttribute('style');
  }

  function ensureCell(sheet, reference) {
    if (sheet.cells.has(reference)) return sheet.cells.get(reference);
    const point = XlsxPackage.position(reference);
    const ns = sheet.xml.documentElement.namespaceURI;
    const create = name => sheet.xml.createElementNS(ns, name);
      const data = elements(sheet.xml, 'sheetData')[0];
      if (!data) throw new Error('Area worksheet tidak ditemukan.');
      let row = [...data.children].find(row => Number(row.getAttribute('r')) === point.row);
      if (!row) { row = create('row'); row.setAttribute('r', point.row); data.insertBefore(row, [...data.children].find(row => Number(row.getAttribute('r')) > point.row) || null); }
      const cell = create('c'); cell.setAttribute('r', reference);
      const inherited=inheritedCellStyle(sheet,point,row);
      if(inherited!==null&&inherited!==undefined)cell.setAttribute('s',inherited);
      row.insertBefore(cell, [...row.children].find(cell => XlsxPackage.position(cell.getAttribute('r')).column > point.column) || null);
      sheet.cells.set(reference, cell);
    return cell;
  }

  function setCell(book, sheetIndex, reference, value) {
    const sheet = book.sheets[sheetIndex];
    const point = XlsxPackage.position(reference);
    if (!sheet || point.row > sheet.rows || point.column > sheet.columns) throw new Error('Sel di luar area template.');
    for (const merge of sheet.merges) if (point.row >= merge.first.row && point.row <= merge.last.row && point.column >= merge.first.column && point.column <= merge.last.column && reference !== merge.start) throw new Error('Pilih sel utama pada area yang digabung.');
    let cell = sheet.cells.get(reference);
    if (!WorkbookFormulas.editable(cell,WorkbookEngine)) throw new Error('Rumus bersama atau array perlu diedit di Excel.');
    const parsed = XlsxPackage.inputValue(value);
    const formula=parsed.value.startsWith('=');
    // Excel's Text format keeps subsequently typed digits as text, including
    // when the format comes from a row or column default.
    if(parsed.type==='n'){
      const styleId=cell?.getAttribute('s')??inheritedCellStyle(sheet,point);
      if(book.styles[Number(styleId)||0]?.numFmt===49)parsed.type='inlineStr';
    }
    if (WorkbookFormulas.input(book,cell,WorkbookEngine) === parsed.value) return false;
    const create = name => sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI, name);
    cell = ensureCell(sheet, reference);
    if(child(cell,'f')||formula)book.formulasRemoved=true;
    for (const node of [...cell.children]) if (['v', 'is','f'].includes(node.localName)) node.remove();
    cell.setAttribute('t', parsed.type);
    if(formula){cell.removeAttribute('t');const node=create('f');node.textContent=parsed.value.slice(1).split(/("(?:[^"]|"")*")/g).map((part,index)=>index%2?part:part.replace(/;/g,',')).join('');cell.appendChild(node);}
    else if (parsed.type === 'n') { const node = create('v'); node.textContent = parsed.value; cell.appendChild(node); }
    else { const inline = create('is'), node = create('t'); node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve'); node.textContent = parsed.value; inline.appendChild(node); cell.appendChild(inline); }
    const dimension = elements(sheet.xml, 'dimension')[0]?.getAttribute('ref');
    const end = dimension ? XlsxPackage.position(dimension.split(':').pop()) : { row: 0, column: 0 };
    if (point.row > end.row || point.column > end.column) updateDimension(sheet);
    book.modified.add(sheetIndex);
    return true;
  }

  async function serialize(book) {
    WorkbookFormulas.recalculate(book,WorkbookEngine);
    const writer = new XMLSerializer();
    await WorkbookMedia.serialize(book);
    await serializeWorkbookCellLinks(book);
    if (book.stylesModified) {
      book.zip.file('xl/styles.xml', writer.serializeToString(book.stylesXml));
      const relPath = 'xl/_rels/workbook.xml.rels';
      const rels = parseXml(await book.zip.file(relPath).async('string'));
      if (!elements(rels, 'Relationship').some(node => /\/styles$/.test(node.getAttribute('Type')))) {
        const node = rels.createElementNS(rels.documentElement.namespaceURI, 'Relationship');
        let id = 'cbiStyles'; while (elements(rels, 'Relationship').some(item => item.getAttribute('Id') === id)) id += 'x';
        node.setAttribute('Id', id); node.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles'); node.setAttribute('Target', 'styles.xml'); rels.documentElement.appendChild(node); book.zip.file(relPath, writer.serializeToString(rels));
      }
      const types = parseXml(await book.zip.file('[Content_Types].xml').async('string'));
      if (!elements(types, 'Override').some(node => node.getAttribute('PartName') === '/xl/styles.xml')) { const node = types.createElementNS(types.documentElement.namespaceURI, 'Override'); node.setAttribute('PartName', '/xl/styles.xml'); node.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'); types.documentElement.appendChild(node); book.zip.file('[Content_Types].xml', writer.serializeToString(types)); }
    }
    if (book.formulasRemoved) {
      // A calculation chain is optional; Excel rebuilds it after formula removal or Undo.
      const path='xl/_rels/workbook.xml.rels',rels=parseXml(await book.zip.file(path).async('string'));
      const types=parseXml(await book.zip.file('[Content_Types].xml').async('string'));
      for(const relation of elements(rels,'Relationship').filter(node=>node.getAttribute('Type')?.endsWith('/calcChain'))) {
        relation.remove();
      }
      // Media serialization can recreate its original content-type table on later exports.
      for(const override of elements(types,'Override').filter(node=>node.getAttribute('ContentType')==='application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml')) {
        book.zip.remove(XlsxPackage.resolvePart('xl/workbook.xml',override.getAttribute('PartName')));override.remove();
      }
      book.zip.file(path,writer.serializeToString(rels));book.zip.file('[Content_Types].xml',writer.serializeToString(types));
    }
    for(const [path,original] of book.hiddenOriginals||[])book.zip.file(path,book.hiddenParts?.get(path)||original);
    for (const index of book.modified) { updateDimension(book.sheets[index]); book.zip.file(book.sheets[index].path, writer.serializeToString(book.sheets[index].xml)); }
    if (book.modified.size) {
      let calculation = child(book.workbook.documentElement, 'calcPr');
      if (!calculation) { calculation = book.workbook.createElementNS(book.workbook.documentElement.namespaceURI, 'calcPr'); const following = [...book.workbook.documentElement.children].find(node => ['oleSize', 'customWorkbookViews', 'pivotCaches', 'smartTagPr', 'smartTagTypes', 'webPublishing', 'fileRecoveryPr', 'webPublishObjects', 'extLst'].includes(node.localName)); book.workbook.documentElement.insertBefore(calculation, following || null); }
      calculation.setAttribute('fullCalcOnLoad', '1'); calculation.setAttribute('forceFullCalc', '1');
      book.zip.file('xl/workbook.xml', writer.serializeToString(book.workbook));
    }
    const bytes = await book.zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    XlsxPackage.inspectArchive(bytes);
    return bytes;
  }

  return { color, open, resizeSheet, setCell, serialize, value: cellValue, elements, child, ensureCell, parseXml, stylesFrom, verifySheet, readXml, readPart, sizePixels, sizeValue, columnPixels,columnWidth,axisDefault, axisOffset, pictureAxisSignature };
})();
