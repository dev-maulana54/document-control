'use strict';

function clearWorkbookCellContext(c){
  if(!validWorkbookContext(c,true))return;const sheet=c.state.book.sheets[c.index];
  const refs=WorkbookFormat.references(WorkbookFormat.range(sheet,c.address)).filter(ref=>{const p=XlsxPackage.position(ref);return !sheet.merges.some(m=>ref!==m.start&&p.row>=m.first.row&&p.row<=m.last.row&&p.column>=m.first.column&&p.column<=m.last.column);});
  for(const ref of refs)if(WorkbookEngine.child(sheet.cells.get(ref),'f'))throw new Error('Rumus template dipertahankan. Pilih sel tanpa rumus.');
  mutateWorkbookContext(c,()=>{for(const ref of refs)WorkbookEngine.setCell(c.state.book,c.index,ref,'');});restoreWorkbookFocus();
}
function showCellStructureChoice(c,mode){
  if(!validWorkbookContext(c,true))return;const edits=c.state.edits;
  showModal(`${modalHeading(mode==='insert'?'Insert Cells':'Delete Cells')}<form id="context-cell-structure"><p>Pilih baris atau kolom yang akan ${mode==='insert'?'disisipkan':'dihapus'} pada ${esc(c.address)}.</p><div class="field"><label for="context-structure-axis">Geser seluruh</label><select id="context-structure-axis" data-native-select><option value="row">Entire row</option><option value="column">Entire column</option></select></div><p class="small muted">Referensi rumus, gambar, dan sel gabungan ikut disesuaikan.</p><div class="form-error" id="context-structure-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">${mode==='insert'?'Insert':'Delete'}</button></div></form>`);
  document.getElementById('context-cell-structure').onsubmit=async event=>{event.preventDefault();if(!validWorkbookContext(c,true)||c.state.edits!==edits){document.getElementById('context-structure-error').textContent='Data berubah. Buka kembali menu sel.';return;}const axis=document.getElementById('context-structure-axis').value,area=WorkbookFormat.range(c.state.book.sheets[c.index],c.address);modal.close();await changeWorkbookAxis({...c,axis,start:area.first[axis],end:area.last[axis]},mode);};
}

function showWorkbookCellLink(c){
  if(!validWorkbookContext(c,true))return;const E=WorkbookEngine,sheet=c.state.book.sheets[c.index],ref=c.state.selected,existing=E.elements(sheet.xml,'hyperlink').find(n=>n.getAttribute('ref')===ref),edited=sheet.linkChanges?.findLast(n=>n.ref===ref),edits=c.state.edits;
  showModal(`${modalHeading('Hyperlink — '+esc(ref))}<form id="context-cell-link"><div class="field"><label for="context-link-url">Alamat tautan</label><input id="context-link-url" type="text" placeholder="https://... atau #Sheet1!A1" value="${esc(edited?.url||existing?.getAttribute('location')&&'#'+existing.getAttribute('location')||'')}" maxlength="2048"><small>Kosongkan untuk menghapus tautan. Mendukung https, http, email (mailto), dan lokasi sel (#).</small></div><div id="context-link-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Simpan Tautan</button></div></form>`);
  document.getElementById('context-cell-link').onsubmit=event=>{event.preventDefault();try{
    if(!validWorkbookContext(c,true)||c.state.edits!==edits)throw new Error('Data berubah. Buka kembali menu sel.');
    const url=document.getElementById('context-link-url').value.trim();if(url&&!/^https?:\/\/[^\s]+$|^mailto:[^\s@]+@[^\s]+$|^#[^<>\r\n]+$/i.test(url))throw new Error('Gunakan alamat http, https, mailto, atau lokasi sel dengan #.');
    mutateWorkbookContext(c,()=>{
      let links=E.elements(sheet.xml,'hyperlinks')[0];if(!links&&url){links=sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI,'hyperlinks');sheet.xml.documentElement.insertBefore(links,[...sheet.xml.documentElement.children].find(n=>['printOptions','pageMargins','pageSetup','headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','picture','oleObjects','controls','webPublishItems','tableParts','extLst'].includes(n.localName))||null);}
      E.elements(sheet.xml,'hyperlink').filter(n=>n.getAttribute('ref')===ref).forEach(n=>n.remove());const id='cbiLink'+crypto.randomUUID().replace(/-/g,'');
      if(url){const link=sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI,'hyperlink');link.setAttribute('ref',ref);if(url.startsWith('#'))link.setAttribute('location',url.slice(1));else link.setAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','r:id',id);links.appendChild(link);}
      sheet.linkChanges=[...(sheet.linkChanges||[]).filter(n=>n.ref!==ref),{ref,id,url}];c.state.book.modified.add(c.index);
    });modal.close();restoreWorkbookFocus();
  }catch(error){document.getElementById('context-link-error').textContent=error.message;}};
}

async function serializeWorkbookCellLinks(book){
  book.generatedLinks||=new Map();
  for(const sheet of book.sheets){const path=sheet.path.slice(0,sheet.path.lastIndexOf('/')+1)+'_rels/'+sheet.path.split('/').pop()+'.rels',generated=book.generatedLinks.get(path)||new Set();if(!sheet.linkChanges?.length&&!generated.size)continue;const file=book.zip.file(path),xml=file?WorkbookEngine.parseXml(await file.async('string')):WorkbookEngine.parseXml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>');
    for(const rel of WorkbookEngine.elements(xml,'Relationship'))if(generated.has(rel.getAttribute('Id')))rel.remove();
    const activeIds=new Set(WorkbookEngine.elements(sheet.xml,'hyperlink').map(n=>n.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')));
    for(const change of sheet.linkChanges||[]){if(!change.url||change.url.startsWith('#')||!activeIds.has(change.id))continue;const old=WorkbookEngine.elements(xml,'Relationship').find(n=>n.getAttribute('Id')===change.id);if(old)continue;const rel=xml.createElementNS(xml.documentElement.namespaceURI,'Relationship');rel.setAttribute('Id',change.id);rel.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink');rel.setAttribute('Target',change.url);rel.setAttribute('TargetMode','External');xml.documentElement.appendChild(rel);generated.add(change.id);}
    book.generatedLinks.set(path,generated);if(xml.documentElement.children.length)book.zip.file(path,new XMLSerializer().serializeToString(xml));else book.zip.remove(path);
  }
}
