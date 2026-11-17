'use strict';

const WorkbookFormat = (() => {
  const E = WorkbookEngine;
  const fonts = ['Arial','Aptos','Aptos Narrow','Calibri','Cambria','Candara','Comic Sans MS','Consolas','Constantia','Corbel','Courier New','Georgia','Helvetica','Impact','Lucida Console','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Verdana'];
  function range(sheet, address) {
    const parts = String(address).trim().toUpperCase().split(':');
    if (parts.length > 2) throw new Error('Gunakan rentang seperti A1 atau A1:D5.');
    const a = XlsxPackage.position(parts[0]), b = XlsxPackage.position(parts[1] || parts[0]);
    if (Math.max(a.row, b.row) > sheet.rows || Math.max(a.column, b.column) > sheet.columns) throw new Error('Rentang di luar area sheet.');
    return { first: { row: Math.min(a.row, b.row), column: Math.min(a.column, b.column) }, last: { row: Math.max(a.row, b.row), column: Math.max(a.column, b.column) } };
  }
  function references(area) {
    if ((area.last.row - area.first.row + 1) * (area.last.column - area.first.column + 1) > 5000) throw new Error('Pilih maksimal 5.000 sel untuk satu perubahan format.');
    const result = [];
    for (let row = area.first.row; row <= area.last.row; row++) for (let column = area.first.column; column <= area.last.column; column++) result.push(XlsxPackage.address(column, row));
    if (result.length > 5000) throw new Error('Pilih maksimal 5.000 sel untuk satu perubahan format.');
    return result;
  }
  const overlaps = (a, b) => a.first.row <= b.last.row && a.last.row >= b.first.row && a.first.column <= b.last.column && a.last.column >= b.first.column;
  const contains = (a, b) => a.first.row <= b.first.row && a.last.row >= b.last.row && a.first.column <= b.first.column && a.last.column >= b.last.column;
  function styles(book) {
    if (!book.stylesXml) book.stylesXml = E.parseXml('<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>');
    return book.stylesXml;
  }
  function format(book, index, address, property, value) {
    const allowed = ['fontName','fontSize','bold','italic','underline','color','background','horizontal','vertical','wrap','borders','numFmt'];
    if (!allowed.includes(property)) throw new Error('Format tidak didukung.');
    if (['color','background'].includes(property) && !(property==='background'&&value==='none') && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Warna tidak valid.');
    if (property === 'fontName' && !fonts.includes(value) && !book.styles.some(style => style.fontName === value)) throw new Error('Font tidak valid.');
    if (property === 'fontSize' && (!Number.isFinite(Number(value)) || !Number.isInteger(Number(value) * 2) || value < 1 || value > 409)) throw new Error('Ukuran font 1-409, dengan kelipatan 0,5.');
    if (property === 'numFmt' && ![0,1,2,9,10,14,49].includes(Number(value))) throw new Error('Format angka tidak valid.');
    if (property === 'horizontal' && !['left','center','right'].includes(value) || property === 'vertical' && !['top','center','bottom'].includes(value) || property === 'borders' && !['all','none'].includes(value)) throw new Error('Format tidak valid.');
    if(property==='borders')return WorkbookBorders.apply(book,index,address,value,{color:'#64748b'});
    const sheet = book.sheets[index], refs = references(range(sheet, address)), xml = styles(book), root = xml.documentElement;
    const create = name => xml.createElementNS(root.namespaceURI, name);
    const group = name => { const node = E.child(root, name); if (!node) throw new Error('Struktur style Excel tidak lengkap.'); return node; };
    const intern = (container, node) => { const serial = new XMLSerializer().serializeToString(node); let id = [...container.children].findIndex(item => new XMLSerializer().serializeToString(item) === serial); if (id < 0) { id = container.children.length; container.appendChild(node); container.setAttribute('count', container.children.length); } return id; };
    const set = (parent, name, attrs) => { let node = E.child(parent, name); if (!node) { node = create(name); parent.appendChild(node); } for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val); return node; };
    const xfs = group('cellXfs'), cache = new Map();
    for (const ref of refs) {
      const cell = E.ensureCell(sheet, ref), old = Number(cell.getAttribute('s')) || 0;
      if (!cache.has(old)) {
        const xf = (xfs.children[old] || xfs.children[0]).cloneNode(true);
        if (['fontName','fontSize','bold','italic','underline','color'].includes(property)) {
          const fonts = group('fonts'), font = (fonts.children[Number(xf.getAttribute('fontId')) || 0] || fonts.children[0]).cloneNode(true);
          const tag = {fontName:'name',fontSize:'sz',bold:'b',italic:'i',underline:'u',color:'color'}[property];
          if (['bold','italic','underline'].includes(property)) { E.child(font, tag)?.remove(); if (value) font.appendChild(create(tag)); }
          else if (property === 'color') { E.child(font, tag)?.remove(); set(font, tag, {rgb:'FF' + value.slice(1).toUpperCase()}); }
          else set(font, tag, {val:value});
          xf.setAttribute('fontId', intern(fonts,font)); xf.setAttribute('applyFont','1');
        } else if (property === 'background') {
          const fill = create('fill'), pattern = set(fill,'patternFill',{patternType:value==='none'?'none':'solid'}); if(value!=='none'){set(pattern,'fgColor',{rgb:'FF' + value.slice(1).toUpperCase()}); set(pattern,'bgColor',{indexed:64});} xf.setAttribute('fillId',intern(group('fills'),fill)); xf.setAttribute('applyFill','1');
        } else if (property === 'numFmt') { xf.setAttribute('numFmtId',value); xf.setAttribute('applyNumberFormat','1'); }
        else { set(xf,'alignment',{[property === 'wrap' ? 'wrapText' : property]:property === 'wrap' ? (value ? '1' : '0') : value}); xf.setAttribute('applyAlignment','1'); }
        cache.set(old,intern(xfs,xf));
      }
      cell.setAttribute('s',cache.get(old));
    }
    book.styles = E.stylesFrom(xml,book); book.stylesModified = true; book.modified.add(index);
  }
  function merge(book,index,address,unmerge=false) {
    const sheet=book.sheets[index], area=range(sheet,address), refs=references(area), touched=sheet.merges.filter(merge=>overlaps(area,merge));
    const master = refs[0];
    if (!unmerge) {
      if (refs.length<2) throw new Error('Pilih lebih dari satu sel untuk digabung.');
      if (touched.some(merge=>!contains(area,merge))) throw new Error('Rentang memotong sel gabungan. Lepas gabungan terlebih dahulu.');
      const removed=new Set(refs.slice(1)),sharedMasters=new Set();
      // Shared definitions and array results can also be needed by cells outside this range.
      for(const [reference,cell] of sheet.cells) {
        const formula=E.child(cell,'f');if(!formula)continue;
        if(formula.getAttribute('t')==='shared'&&formula.textContent.trim()&&removed.has(reference))sharedMasters.add(formula.getAttribute('si'));
        if(['array','dataTable'].includes(formula.getAttribute('t'))&&formula.hasAttribute('ref')) {
          const formulaArea=range(sheet,formula.getAttribute('ref'));
          if(overlaps(area,formulaArea)&&(!contains(area,formulaArea)||!removed.has(reference)))throw new Error('Rentang memotong rumus array atau tabel data. Pilih seluruh hasil beserta rumusnya agar tidak merusak perhitungan.');
        }
      }
      for(const [reference,cell] of sheet.cells) {
        const formula=E.child(cell,'f');
        if(!removed.has(reference)&&formula?.getAttribute('t')==='shared'&&sharedMasters.has(formula.getAttribute('si')))throw new Error('Rentang memotong rumus bersama. Sertakan seluruh grup rumus atau ubah menjadi rumus biasa di Excel terlebih dahulu.');
      }
      // Excel retains only the physical top-left cell, even when that cell is empty.
      for (const reference of refs.slice(1)) {
        const cell = sheet.cells.get(reference);
        if (!cell) continue;
        if (E.child(cell,'f')) book.formulasRemoved = true;
        for (const node of [...cell.children]) if (['v','is','f'].includes(node.localName)) node.remove();
        for (const attribute of ['t','cm','vm','ph']) cell.removeAttribute(attribute);
      }
    }
    let container=E.elements(sheet.xml,'mergeCells')[0];
    if (!container && !unmerge) { container=sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI,'mergeCells'); const following=[...sheet.xml.documentElement.children].find(node=>['phoneticPr','conditionalFormatting','dataValidations','hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'].includes(node.localName)); sheet.xml.documentElement.insertBefore(container,following||null); }
    if (container) {
      [...container.children].forEach(node=>{const area2=range(sheet,node.getAttribute('ref'));if(overlaps(area,area2))node.remove();});
      if(!unmerge){const node=sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI,'mergeCell');node.setAttribute('ref',refs[0]+':'+refs[refs.length-1]);container.appendChild(node);}
      container.setAttribute('count',container.children.length); if(!container.children.length)container.remove();
    }
    E.verifySheet(sheet);book.modified.add(index);
    return master;
  }
  function resize(book, index, address, axis, value) {
    const sheet = book.sheets[index], area = range(sheet, address), isRow = axis === 'row';
    if (!['row','column'].includes(axis) || !Number.isFinite(value) || value < 0 || value > (isRow ? 409 : 255)) throw new Error('Ukuran di luar batas Excel.');
    if(isRow&&area.last.row-area.first.row+1>10000)throw new Error('Pilih maksimal 10.000 baris per perubahan ukuran.');
    const create = name => sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI, name);
    if (isRow) {
      const data = E.elements(sheet.xml, 'sheetData')[0];
      for (let number = area.first.row; number <= area.last.row; number++) {
        let row = [...data.children].find(node => Number(node.getAttribute('r')) === number);
        if (!row) { row = create('row'); row.setAttribute('r', number); data.insertBefore(row, [...data.children].find(node => Number(node.getAttribute('r')) > number) || null); }
        row.setAttribute('ht', value); row.setAttribute('customHeight', '1');
        row.setAttribute('hidden',value===0?'1':'0');
      }
    } else {
      let container = E.elements(sheet.xml, 'cols')[0];
      if (!container) { container = create('cols'); sheet.xml.documentElement.insertBefore(container, E.elements(sheet.xml, 'sheetData')[0]); }
      const previous = [...container.children], replacement = [];
      // Split existing ranges into non-overlapping columns, retaining all attributes.
      for (let number = 1; number <= sheet.columns; number++) {
        const original = previous.findLast(node => Number(node.getAttribute('min')) <= number && Number(node.getAttribute('max')) >= number);
        if (!original && (number < area.first.column || number > area.last.column)) continue;
        const column = original ? original.cloneNode(true) : create('col');
        column.setAttribute('min', number); column.setAttribute('max', number);
        if (number >= area.first.column && number <= area.last.column) { column.setAttribute('width', E.columnWidth(sheet,E.sizePixels('column',value))); column.setAttribute('customWidth', '1');column.setAttribute('hidden',value===0?'1':'0'); }
        replacement.push(column);
      }
      container.replaceChildren(...replacement);
    }
    book.modified.add(index);
  }
  function sheetSnapshot(sheet){return {xml:new XMLSerializer().serializeToString(sheet.xml),images:[...(sheet.insertedImages||[])],imageMoves:{...(sheet.imageMoves||{})},axisChanges:[...(sheet.axisChanges||[])],linkChanges:[...(sheet.linkChanges||[])]};}
  function snapshot(book,index,wholeBook=false) {const state={index,...sheetSnapshot(book.sheets[index]),styles:book.stylesXml?new XMLSerializer().serializeToString(book.stylesXml):null};if(wholeBook){state.wholeBook=true;state.workbook=new XMLSerializer().serializeToString(book.workbook);state.allSheets=book.sheets.map(sheetSnapshot);state.hiddenParts=[...(book.hiddenParts||[])];}return state;}
  function restoreSheet(book,index,state){const sheet=book.sheets[index];sheet.xml=E.parseXml(state.xml);sheet.insertedImages=[...(state.images||[])];sheet.imageMoves={...(state.imageMoves||{})};sheet.axisChanges=[...(state.axisChanges||[])];sheet.linkChanges=[...(state.linkChanges||[])];sheet.cells=new Map(E.elements(sheet.xml,'c').map(cell=>[cell.getAttribute('r'),cell]));E.verifySheet(sheet);book.modified.add(index);}
  function restore(book,state){if(state.wholeBook){state.allSheets.forEach((sheet,index)=>restoreSheet(book,index,sheet));book.workbook=E.parseXml(state.workbook);book.hiddenParts=new Map(state.hiddenParts);}else restoreSheet(book,state.index,state);book.stylesXml=state.styles?E.parseXml(state.styles):null;styles(book);book.styles=E.stylesFrom(book.stylesXml,book);book.stylesModified=true;}
  function display(book,cell) {
    const value=E.value(book,cell), style=book.styles[Number(cell?.getAttribute('s'))||0]||{}, format=style.numFmt;
    if (!value || !cell || ['s','inlineStr','b','e'].includes(cell.getAttribute('t')) || !Number.isFinite(Number(value))) return value;
    const number=Number(value);
    if(format===1)return number.toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:0});
    if(format===2)return number.toFixed(2);
    if(format===9||format===10)return (number*100).toFixed(format===10?2:0)+'%';
    if (format === 14 && number >= 0 && number < 2958466) {
      const date1904 = ['1','true'].includes(E.child(book.workbook.documentElement, 'workbookPr')?.getAttribute('date1904'));
      // Excel keeps the fictitious 1900-02-29 at serial 60 for compatibility.
      if (!date1904 && Math.floor(number) === 60) return '1900-02-29';
      const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, number < 60 ? 31 : 30);
      return new Date(epoch + Math.floor(number) * 86400000).toISOString().slice(0, 10);
    }
    return value;
  }
  return {fonts,range,references,format,merge,resize,snapshot,restore,display,styles};
})();
