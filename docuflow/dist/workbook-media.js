'use strict';

const WorkbookMedia = (() => {
  const E = WorkbookEngine;
  const ns = { sheet:'http://schemas.openxmlformats.org/spreadsheetml/2006/main', xdr:'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', a:'http://schemas.openxmlformats.org/drawingml/2006/main', r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships', rel:'http://schemas.openxmlformats.org/package/2006/relationships' };
  const writer = () => new XMLSerializer();
  const relPath = part => part.slice(0, part.lastIndexOf('/') + 1) + '_rels/' + part.slice(part.lastIndexOf('/') + 1) + '.rels';
  const clone = xml => E.parseXml(writer().serializeToString(xml));
  const blankRels = () => E.parseXml(`<Relationships xmlns="${ns.rel}"/>`);
  function relationship(xml, id, type, path) {
    const node = xml.createElementNS(ns.rel, 'Relationship'); node.setAttribute('Id',id); node.setAttribute('Type',ns.r + '/' + type); node.setAttribute('Target','/' + path); xml.documentElement.appendChild(node);
  }
  function uniqueId(xml, prefix) { let id = prefix; while (E.elements(xml,'Relationship').some(node => node.getAttribute('Id') === id)) id += 'x'; return id; }
  function override(types, path, type) {
    if (E.elements(types,'Override').some(node => node.getAttribute('PartName') === '/' + path)) return;
    const node = types.createElementNS(types.documentElement.namespaceURI,'Override'); node.setAttribute('PartName','/' + path); node.setAttribute('ContentType',type); types.documentElement.appendChild(node);
  }
  async function initialize(book, sheet) {
    if (sheet.mediaBase) return sheet.mediaBase;
    const sheetRels = await E.readXml(book.zip,relPath(sheet.path)) || blankRels();
    const drawing = E.elements(sheet.xml,'drawing')[0];
    let path, id, original = false;
    if (drawing) {
      id = drawing.getAttributeNS(ns.r,'id');
      const relation = E.elements(sheetRels,'Relationship').find(node => node.getAttribute('Id') === id && node.getAttribute('TargetMode') !== 'External');
      if (!relation) throw new Error('Relasi gambar template tidak dapat diperbarui.');
      path = XlsxPackage.resolvePart(sheet.path,relation.getAttribute('Target')); original = true;
    } else { path = 'xl/drawings/cbi-' + crypto.randomUUID() + '.xml'; id = uniqueId(sheetRels,'cbiDrawing'); }
    const drawingXml = original ? await E.readXml(book.zip,path,true) : E.parseXml(`<xdr:wsDr xmlns:xdr="${ns.xdr}" xmlns:a="${ns.a}" xmlns:r="${ns.r}"/>`);
    const drawingRels = original ? await E.readXml(book.zip,relPath(path)) || blankRels() : blankRels();
    sheet.mediaBase = { path,id,original,sheetRels,drawingXml,drawingRels };
    return sheet.mediaBase;
  }
  function picture(xml, image, id, relationId) {
    const create = (space,name) => xml.createElementNS(ns[space],space + ':' + name);
    const append = (parent,space,name,attrs={},value) => { const node = create(space,name); for (const [key,val] of Object.entries(attrs)) node.setAttribute(key,val); if(value!==undefined)node.textContent=value; parent.appendChild(node); return node; };
    const anchor = create('xdr','oneCellAnchor'), from = append(anchor,'xdr','from');
    append(from,'xdr','col',{},image.column); append(from,'xdr','colOff',{},Math.round((image.x||0)*9525)); append(from,'xdr','row',{},image.row); append(from,'xdr','rowOff',{},Math.round((image.y||0)*9525));
    const extent = {cx:Math.round(image.width*9525),cy:Math.round(image.height*9525)};
    append(anchor,'xdr','ext',extent);
    const pic = append(anchor,'xdr','pic'), props = append(pic,'xdr','nvPicPr');
    append(props,'xdr','cNvPr',{id,name:'Picture ' + id}); const locks = append(props,'xdr','cNvPicPr'); append(locks,'a','picLocks',{noChangeAspect:'1'});
    const fill = append(pic,'xdr','blipFill'), blip = append(fill,'a','blip'); blip.setAttributeNS(ns.r,'r:embed',relationId); append(append(fill,'a','stretch'),'a','fillRect');
    const shape = append(pic,'xdr','spPr'), transform = append(shape,'a','xfrm'); append(transform,'a','off',{x:0,y:0}); append(transform,'a','ext',extent); append(append(shape,'a','prstGeom',{prst:'rect'}),'a','avLst');
    append(anchor,'xdr','clientData'); return anchor;
  }
  async function serialize(book) {
    const changedAxes=new Map();
    const fixedPicturesChanged=sheet=>{if(!changedAxes.has(sheet))changedAxes.set(sheet,sheet.images.some(image=>image.fixedSize)&&sheet.pictureAxisSignature!==E.pictureAxisSignature(sheet));return changedAxes.get(sheet);};
    if (!book.sheets.some(sheet => sheet.mediaBase || sheet.insertedImages?.length || sheet.imageMoves || sheet.axisChanges?.length || sheet.images.some(image=>image.kind==='shape'&&image.id==='textBox') || fixedPicturesChanged(sheet))) return;
    book.mediaContentTypes ||= await E.readXml(book.zip,'[Content_Types].xml',true);
    const types = clone(book.mediaContentTypes), activeFiles = new Set();
    book.insertedMediaPaths ||= new Set();
    for (const sheet of book.sheets) {
      if (!sheet.mediaBase && !sheet.insertedImages?.length && !sheet.imageMoves && !sheet.axisChanges?.length && !sheet.images.some(image=>image.kind==='shape'&&image.id==='textBox') && !fixedPicturesChanged(sheet)) continue;
      const base = await initialize(book,sheet), images = (sheet.insertedImages || []).filter(image=>!image.hidden);
      const sheetRels = clone(base.sheetRels), drawing = clone(base.drawingXml), drawingRels = clone(base.drawingRels);
      WorkbookStructure.drawingAnchors(drawing,sheet.axisChanges);
      for(const anchor of [...drawing.documentElement.children])if(WorkbookShapes.isTextBox(anchor))WorkbookShapes.removeOutline(anchor);
      const originalAnchors=[...drawing.documentElement.children];
      for(const [index,image] of Object.entries(sheet.imageMoves||{})) {
        const anchor=originalAnchors[Number(index)];if(!anchor)continue;
        if(image.hidden){anchor.remove();continue;}
        if(image.kind==='shape'&&image.shapeStyleChanged)WorkbookShapes.applyProperties(anchor,image);
        const extent=E.child(anchor,'ext');if(extent){extent.setAttribute('cx',Math.round(image.width*9525));extent.setAttribute('cy',Math.round(image.height*9525));}
        // A group's descendants use their own coordinate system. Resize the
        // root transform only; overwriting every child destroys the drawing.
        const object=[...anchor.children].find(n=>['pic','sp','grpSp','cxnSp'].includes(n.localName)),properties=object&&E.child(object,object.localName==='grpSp'?'grpSpPr':'spPr'),transform=properties&&E.child(properties,'xfrm'),size=transform&&E.child(transform,'ext');
        if(size){size.setAttribute('cx',Math.round(image.width*9525));size.setAttribute('cy',Math.round(image.height*9525));}
        const offset=transform&&E.child(transform,'off');if(offset){offset.setAttribute('x',Math.round((E.axisOffset(sheet,'column',image.column)+image.x)*9525));offset.setAttribute('y',Math.round((E.axisOffset(sheet,'row',image.row)+image.y)*9525));}
        for(const [name,col,row,dx,dy] of [['from',image.column,image.row,image.x,image.y],['to',image.toColumn,image.toRow,image.toX,image.toY]]) {
          const marker=E.child(anchor,name);if(!marker)continue;
          for(const [key,value] of Object.entries({col,row,colOff:Math.round(dx*9525),rowOff:Math.round(dy*9525)}))E.child(marker,key).textContent=value;
        }
      }
      // A one-cell picture retains its physical size when worksheet dimensions change.
      // Normalize legacy two-cell/editAs=oneCell anchors, preserving the original pic subtree.
      for(const original of sheet.images.filter(image=>image.fixedSize)){
        const image=sheet.imageMoves?.[original.anchorIndex]||original,anchor=originalAnchors[original.anchorIndex];
        if(image.hidden||!anchor?.parentNode||anchor.localName!=='twoCellAnchor'||!fixedPicturesChanged(sheet)&&!sheet.imageMoves?.[original.anchorIndex])continue;
        const fixed=drawing.createElementNS(ns.xdr,'xdr:oneCellAnchor');
        for(const child of [...anchor.children])if(child.localName!=='to')fixed.appendChild(child);
        const extent=drawing.createElementNS(ns.xdr,'xdr:ext');extent.setAttribute('cx',Math.round(image.width*9525));extent.setAttribute('cy',Math.round(image.height*9525));fixed.insertBefore(extent,E.child(fixed,'from').nextSibling);anchor.replaceWith(fixed);
      }
      let node = E.elements(sheet.xml,'drawing')[0];
      if (images.length || base.original) {
        if (!base.original) relationship(sheetRels,base.id,'drawing',base.path);
        if (!node) {
          node = sheet.xml.createElementNS(ns.sheet,'drawing'); node.setAttributeNS(ns.r,'r:id',base.id);
          const following = [...sheet.xml.documentElement.children].find(child => ['legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'].includes(child.localName));
          sheet.xml.documentElement.insertBefore(node,following || null);
        }
        let id = Math.max(0,...E.elements(drawing,'cNvPr').map(node => Number(node.getAttribute('id')) || 0));
        for (const image of images) {
          if(image.kind==='shape'){drawing.documentElement.appendChild(WorkbookShapes.anchor(drawing,image,++id));continue;}
          const relationId = uniqueId(drawingRels,'cbiImage' + (++id));
          relationship(drawingRels,relationId,'image',image.path); drawing.documentElement.appendChild(picture(drawing,image,id,relationId));
          book.zip.file(image.path,image.bytes); book.insertedMediaPaths.add(image.path); activeFiles.add(image.path);
          override(types,image.path,image.mime);
        }
        override(types,base.path,'application/vnd.openxmlformats-officedocument.drawing+xml');
        book.zip.file(base.path,writer().serializeToString(drawing)); book.zip.file(relPath(base.path),writer().serializeToString(drawingRels));
      } else {
        if (node?.getAttributeNS(ns.r,'id') === base.id) node.remove();
        book.zip.remove(base.path); book.zip.remove(relPath(base.path));
      }
      if (sheetRels.documentElement.children.length) book.zip.file(relPath(sheet.path),writer().serializeToString(sheetRels)); else book.zip.remove(relPath(sheet.path));
    }
    for (const path of book.insertedMediaPaths) if (!activeFiles.has(path)) book.zip.remove(path);
    book.zip.file('[Content_Types].xml',writer().serializeToString(types));
  }
  function inspectImage(bytes) {
    const png = bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value);
    const jpeg = bytes.length >= 4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    let width=0,height=0;
    if (png && bytes[12]===73 && bytes[13]===72 && bytes[14]===68 && bytes[15]===82) { width=view.getUint32(16); height=view.getUint32(20); }
    else if (jpeg) {
      let offset=2;
      while (offset+4<=bytes.length) {
        if (bytes[offset++]!==255) break;
        while (bytes[offset]===255) offset++;
        const marker=bytes[offset++];
        if (marker===217 || marker===218 || offset+2>bytes.length) break;
        const length=view.getUint16(offset);
        if (length<2 || offset+length>bytes.length) break;
        if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length>=7) { height=view.getUint16(offset+3); width=view.getUint16(offset+5); break; }
        offset+=length;
      }
    }
    if (!width || !height) throw new Error('Isi file gambar tidak valid.');
    if (width>4096 || height>4096 || width*height>10000000) throw new Error('Resolusi gambar maksimal 4096 px dan 10 megapiksel.');
    return {width,height,mime:png?'image/png':'image/jpeg'};
  }
  async function readImage(file) {
    if (!file?.size || file.size > 1024*1024 || !/\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name)) throw new Error('Pilih PNG, JPG, GIF, BMP atau WebP, maksimal 1 MB.');
    let bytes = new Uint8Array(await file.arrayBuffer());
    let mime;
    if (/\.(png|jpe?g)$/i.test(file.name)) mime=inspectImage(bytes).mime;
    else {
      const valid=(bytes[0]===71&&bytes[1]===73&&bytes[2]===70)||(bytes[0]===66&&bytes[1]===77)||(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP');
      if(!valid)throw new Error('Isi file gambar tidak valid.');
      mime=bytes[0]===71?'image/gif':bytes[0]===66?'image/bmp':'image/webp';
    }
    if(!['image/png','image/jpeg'].includes(mime)) {
      const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let w=0,h=0;
      if(mime==='image/gif'&&bytes.length>=10){w=v.getUint16(6,true);h=v.getUint16(8,true);}
      if(mime==='image/bmp'&&bytes.length>=26){w=Math.abs(v.getInt32(18,true));h=Math.abs(v.getInt32(22,true));}
      if(mime==='image/webp'&&bytes.length>=30){const kind=String.fromCharCode(...bytes.slice(12,16));if(kind==='VP8X'){w=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);h=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}else if(kind==='VP8 '){w=v.getUint16(26,true)&16383;h=v.getUint16(28,true)&16383;}else if(kind==='VP8L'){const n=v.getUint32(21,true);w=1+(n&16383);h=1+((n>>>14)&16383);}}
      if(!w||!h||w>4096||h>4096||w*h>10000000)throw new Error('Dimensi gambar tidak didukung atau melebihi 4096 px / 10 megapiksel.');
    }
    const bitmap = await createImageBitmap(new Blob([bytes],{type:mime})).catch(() => { throw new Error('Gambar tidak dapat dibaca.'); });
    const width = bitmap.width, height = bitmap.height;
    if (!width || !height || width>4096 || height>4096 || width*height>10000000) {bitmap.close();throw new Error('Resolusi gambar maksimal 4096 px dan 10 megapiksel.');}
    if(!['image/png','image/jpeg'].includes(mime)) {
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(bitmap,0,0);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Gambar tidak dapat dikonversi.');bytes=new Uint8Array(await blob.arrayBuffer());mime='image/png';
    }
    bitmap.close();const png=mime==='image/png';
    let binary=''; for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
    return {bytes,mime,source:'data:'+mime+';base64,'+btoa(binary),naturalWidth:width,naturalHeight:height,path:'xl/media/cbi-'+crypto.randomUUID()+(png?'.png':'.jpeg')};
  }
  return { serialize, readImage, inspectImage };
})();
