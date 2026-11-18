'use strict';
const WorkbookBorders=(()=>{
  const E=WorkbookEngine,F=WorkbookFormat;
  const styles=[['thin','Thin'],['medium','Medium'],['thick','Thick'],['double','Double'],['dotted','Dotted'],['dashed','Dashed'],['dashDot','Dash Dot'],['dashDotDot','Dash Dot Dot'],['mediumDashed','Medium Dashed'],['mediumDashDot','Medium Dash Dot'],['mediumDashDotDot','Medium Dash Dot Dot'],['slantDashDot','Slant Dash Dot'],['hair','Hairline']];
  const presets=[['bottom','Bottom Border'],['top','Top Border'],['left','Left Border'],['right','Right Border'],['none','No Border'],['all','All Borders'],['outside','Outside Borders'],['thickOutside','Thick Outside Borders'],['bottomDouble','Bottom Double Border'],['bottomThick','Thick Bottom Border'],['topBottom','Top and Bottom Border'],['topThickBottom','Top and Thick Bottom Border'],['topDoubleBottom','Top and Double Bottom Border']];
  const sides=['left','right','top','bottom'],opposite={left:'right',right:'left',top:'bottom',bottom:'top'};
  function apply(book,index,address,preset,options={}){
    const sheet=book.sheets[index],area=F.range(sheet,address),refs=F.references(area),color=options.color||'#000000',line=options.lineStyle||'thin';
    if(!presets.some(([id])=>id===preset)&&preset!=='custom'||!styles.some(([id])=>id===line)||!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Pengaturan border tidak valid.');
    if(options.erase!==undefined&&typeof options.erase!=='boolean'||options.preserveUnselected!==undefined&&typeof options.preserveUnselected!=='boolean')throw new Error('Mode border tidak valid.');
    if(preset==='custom'&&(!options.sides||Object.keys(options.sides).some(s=>!['top','bottom','left','right','insideH','insideV'].includes(s))||Object.values(options.sides).some(v=>typeof v!=='boolean')))throw new Error('Pilihan sisi border tidak valid.');
    const merged=sheet.merges.filter(m=>area.first.row<=m.last.row&&area.last.row>=m.first.row&&area.first.column<=m.last.column&&area.last.column>=m.first.column);
    if(merged.some(m=>area.first.row>m.first.row||area.last.row<m.last.row||area.first.column>m.first.column||area.last.column<m.last.column))throw new Error('Pilih seluruh sel gabungan untuk mengatur border.');
    const edges=new Map(),patches=new Map();
    const patch=(ref,side,value)=>{if(!patches.has(ref))patches.set(ref,{});patches.get(ref)[side]=value;};
    for(const ref of refs){const p=XlsxPackage.position(ref),merge=merged.find(m=>p.row>=m.first.row&&p.row<=m.last.row&&p.column>=m.first.column&&p.column<=m.last.column);
      if(preset==='none')for(const side of ['diagonal','vertical','horizontal','start','end'])patch(ref,side,null);
      for(const side of sides){
        const horizontal=side==='top'||side==='bottom',first=side==='top'||side==='left',axis=horizontal?'row':'column',value=p[axis],outer=value===(first?area.first[axis]:area.last[axis]);
        if(merge&&value!==(first?merge.first[axis]:merge.last[axis])&&preset!=='none')continue;
        let chosen;
        if(preset==='none')chosen=null;
        else if(preset==='all')chosen=line;
        else if(preset==='custom')chosen=options.sides[outer?side:horizontal?'insideH':'insideV']?line:options.preserveUnselected?undefined:null;
        else if(outer){
          if(preset==='outside')chosen=line;
          else if(preset==='thickOutside')chosen='thick';
          else if(preset===side)chosen=line;
          else if(side==='bottom'&&['bottomDouble','topDoubleBottom'].includes(preset))chosen='double';
          else if(side==='bottom'&&['bottomThick','topThickBottom'].includes(preset))chosen='thick';
          else if((side==='top'||side==='bottom')&&preset==='topBottom'||side==='top'&&['topThickBottom','topDoubleBottom'].includes(preset))chosen=line;
        }
        if(chosen===undefined)continue;if(options.erase)chosen=null;
        const key=horizontal?'h:'+p.column+':'+(p.row+(side==='bottom'?1:0)):'v:'+p.row+':'+(p.column+(side==='right'?1:0)),old=edges.get(key);
        if(!old||side==='bottom'||side==='right')edges.set(key,{ref,p,side,value:chosen});
      }
    }
    const xml=F.styles(book),root=xml.documentElement,xfs=E.child(root,'cellXfs'),borders=E.child(root,'borders');if(!xfs?.children.length||!borders?.children.length)throw new Error('Struktur style Excel tidak lengkap.');
    const rowStyles=new Map(E.elements(sheet.xml,'row').filter(r=>r.hasAttribute('s')).map(r=>[Number(r.getAttribute('r')),r.getAttribute('s')])),columns=E.elements(sheet.xml,'col'),styleIds=new Map();
    const styleId=ref=>{if(!styleIds.has(ref)){const p=XlsxPackage.position(ref);styleIds.set(ref,Number(sheet.cells.get(ref)?.getAttribute('s')??rowStyles.get(p.row)??columns.findLast(c=>Number(c.getAttribute('min'))<=p.column&&Number(c.getAttribute('max'))>=p.column)?.getAttribute('style'))||0);}return styleIds.get(ref);};
    const nativeBorder=ref=>borders.children[Number((xfs.children[styleId(ref)]||xfs.children[0]).getAttribute('borderId'))||0]||borders.children[0];
    const materialized=new Set();
    for(const edge of edges.values()){
      patch(edge.ref,edge.side,edge.value);const p={...edge.p};p.row+=edge.side==='top'?-1:edge.side==='bottom'?1:0;p.column+=edge.side==='left'?-1:edge.side==='right'?1:0;
      if(p.row<1||p.column<1||p.row>XlsxPackage.limits.rows||p.column>XlsxPackage.limits.columns)continue;
      const ref=XlsxPackage.address(p.column,p.row),side=opposite[edge.side],merge=sheet.merges.find(m=>p.row>=m.first.row&&p.row<=m.last.row&&p.column>=m.first.column&&p.column<=m.last.column),fallback=merge&&!sheet.cells.get(ref)?.hasAttribute('s')?E.child(nativeBorder(merge.start),side):null;
      const oldLine=E.child(nativeBorder(ref),side)?.getAttribute('style')||fallback?.getAttribute('style');
      if(oldLine&&oldLine!=='none'){
        const horizontal=side==='top'||side==='bottom',axis=horizontal?'column':'row';
        if(merge&&(area.first[axis]>merge.first[axis]||area.last[axis]<merge.last[axis])){
          // A merged edge can touch several independently formatted neighbors. Materialize
          // the inherited anchor edge before changing just the shared segment.
          const key=merge.start+':'+side;if(!materialized.has(key)){
            materialized.add(key);const anchor=E.child(nativeBorder(merge.start),side);
            for(let n=merge.first[axis];n<=merge.last[axis];n++){
              const part=horizontal?XlsxPackage.address(n,side==='top'?merge.first.row:merge.last.row):XlsxPackage.address(side==='left'?merge.first.column:merge.last.column,n);
              const source=sheet.cells.get(part)?.hasAttribute('s')?E.child(nativeBorder(part),side):anchor;
              patch(part,side,source?.getAttribute('style')&&source.getAttribute('style')!=='none'?source.cloneNode(true):null);
            }
          }
        }
        patch(ref,side,null);
      }
    }
    // Freeze original style IDs before any cell or XF is rewritten.
    for(const ref of patches.keys())styleId(ref);
    const writer=new XMLSerializer(),interned=new Map([borders,xfs].map(parent=>[parent,new Map([...parent.children].map((n,id)=>[writer.serializeToString(n),id]))])),intern=(parent,node)=>{const key=writer.serializeToString(node),map=interned.get(parent);if(map.has(key))return map.get(key);const id=parent.children.length;parent.appendChild(node);parent.setAttribute('count',parent.children.length);map.set(key,id);return id;},cache=new Map(),order=['start','end','left','right','top','bottom','diagonal','vertical','horizontal'];
    for(const [ref,changes] of patches){const old=styleId(ref),key=old+':'+JSON.stringify(changes,(name,value)=>value?.nodeType?writer.serializeToString(value):value);if(!cache.has(key)){
      const xf=(xfs.children[old]||xfs.children[0]).cloneNode(true),border=nativeBorder(ref).cloneNode(true);
      for(const [side,value] of Object.entries(changes)){if(['start','end'].includes(side)&&!E.child(border,side))continue;const edge=value?.nodeType?value.cloneNode(true):xml.createElementNS(root.namespaceURI,side);if(value&&!value.nodeType){edge.setAttribute('style',value);const c=xml.createElementNS(root.namespaceURI,'color');c.setAttribute('rgb','FF'+color.slice(1).toUpperCase());edge.appendChild(c);}const previous=E.child(border,side);if(previous)previous.replaceWith(edge);else border.insertBefore(edge,[...border.children].find(n=>order.indexOf(n.localName)>order.indexOf(side))||null);}
      if(preset==='none'){border.removeAttribute('diagonalUp');border.removeAttribute('diagonalDown');}
      xf.setAttribute('borderId',intern(borders,border));xf.setAttribute('applyBorder','1');cache.set(key,intern(xfs,xf));
    }E.ensureCell(sheet,ref).setAttribute('s',cache.get(key));}
    book.styles=E.stylesFrom(xml,book);book.stylesModified=true;book.modified.add(index);E.verifySheet(sheet);
  }
  return {styles,presets,apply};
})();
