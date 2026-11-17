'use strict';
(function(root){
  const items=[];
  const path=d=>`<path d="${d}"/>`,rect='<rect x="3" y="3" width="94" height="94"/>',ellipse='<ellipse cx="50" cy="50" rx="47" ry="47"/>',round='<rect x="3" y="3" width="94" height="94" rx="15"/>';
  const polygon=(n,star=false)=>'<polygon points="'+Array.from({length:star?n*2:n},(_,i)=>{const angle=-Math.PI/2+i*Math.PI*2/(star?n*2:n),r=star&&i%2?22:47;return (50+Math.cos(angle)*r).toFixed(2)+','+(50+Math.sin(angle)*r).toFixed(2);}).join(' ')+'"/>';
  const add=(group,id,label,markup,preset=id,options={})=>items.push({group,id,label,markup,preset,...options});
  const basic='Basic Shapes',lines='Lines',arrows='Arrows',callouts='Callouts',symbols='Symbols',flow='Flowchart',stars='Stars and Banners';
  add(basic,'textBox','Text Box',rect,'rect',{textBox:true});add(basic,'rect','Rectangle',rect);add(basic,'roundRect','Rounded Rectangle',round);add(basic,'ellipse','Oval',ellipse);
  add(basic,'triangle','Triangle',polygon(3));add(basic,'rtTriangle','Right Triangle',path('M3 3V97H97Z'));add(basic,'diamond','Diamond',path('M50 3 97 50 50 97 3 50Z'));
  add(basic,'parallelogram','Parallelogram',path('M25 3H97L75 97H3Z'));add(basic,'trapezoid','Trapezoid',path('M3 3H97L75 97H25Z'));
  for(const [id,n] of [['pentagon',5],['hexagon',6],['heptagon',7],['octagon',8],['decagon',10],['dodecagon',12]])add(basic,id,id[0].toUpperCase()+id.slice(1),polygon(n));
  add(basic,'donut','Donut',path('M50 3A47 47 0 1 1 49.99 3ZM50 28A22 22 0 1 0 50.01 28Z'));
  add(basic,'can','Cylinder',path('M3 18C3-2 97-2 97 18V82C97 102 3 102 3 82ZM3 18C3 38 97 38 97 18'));
  add(basic,'cube','Cube',path('M3 23 77 3 97 22V77L23 97 3 77ZM3 23 23 42 97 22M23 42V97'));
  add(basic,'foldedCorner','Folded Corner',path('M3 3H97V73L73 97H3ZM73 97V73H97'));
  add(basic,'frame','Frame',path('M3 3H97V97H3ZM20 20V80H80V20Z'));
  add(lines,'line','Line',path('M3 3 97 97'),'line',{line:true});add(lines,'lineArrow','Line Arrow',path('M3 3 94 94M76 92 95 95 92 76'),'line',{line:true,arrow:true});
  add(lines,'bentConnector3','Elbow Connector',path('M3 3H50V97H97'),'bentConnector3',{line:true});add(lines,'curvedConnector3','Curved Connector',path('M3 3C95 3 5 97 97 97'),'curvedConnector3',{line:true});
  add(lines,'arc','Arc',path('M3 97A94 94 0 0 1 97 3'),'arc',{line:true});
  add(lines,'leftBracket','Left Bracket',path('M75 3H25V97H75'),'leftBracket',{line:true});add(lines,'rightBracket','Right Bracket',path('M25 3H75V97H25'),'rightBracket',{line:true});
  add(lines,'leftBrace','Left Brace',path('M75 3Q30 3 40 25T20 50Q50 50 40 75T75 97'),'leftBrace',{line:true});add(lines,'rightBrace','Right Brace',path('M25 3Q70 3 60 25T80 50Q50 50 60 75T25 97'),'rightBrace',{line:true});
  const arrow=path('M3 30H60V3L97 50 60 97V70H3Z');
  for(const [id,label,angle] of [['rightArrow','Right Arrow',0],['leftArrow','Left Arrow',180],['upArrow','Up Arrow',-90],['downArrow','Down Arrow',90]])add(arrows,id,label,`<g transform="rotate(${angle} 50 50)">${arrow}</g>`);
  add(arrows,'leftRightArrow','Left Right Arrow',path('M3 50 30 3V30H70V3L97 50 70 97V70H30V97Z'));
  add(arrows,'upDownArrow','Up Down Arrow',path('M50 3 97 30H70V70H97L50 97 3 70H30V30H3Z'));
  add(arrows,'quadArrow','Quad Arrow',path('M50 3 68 22H58V42H78V32L97 50 78 68V58H58V78H68L50 97 32 78H42V58H22V68L3 50 22 32V42H42V22H32Z'));
  add(arrows,'chevron','Chevron',path('M3 3H60L97 50 60 97H3L40 50Z'));
  add(arrows,'bentArrow','Bent Arrow',path('M3 97V40Q3 18 30 18H60V3L97 30 60 57V42H35Q27 42 27 50V97Z'));
  add(arrows,'uturnArrow','U Turn Arrow',path('M3 97V35Q3 3 40 3T77 35V60H97L65 97 33 60H53V35Q53 25 40 25T27 35V97Z'));
  add(callouts,'wedgeRectCallout','Rectangular Callout',path('M3 3H97V73H53L25 97V73H3Z'));
  add(callouts,'wedgeRoundRectCallout','Rounded Callout',path('M15 3H85Q97 3 97 15V60Q97 73 85 73H53L25 97V73H15Q3 73 3 60V15Q3 3 15 3Z'));
  add(callouts,'wedgeEllipseCallout','Oval Callout',path('M30 70C-20 40 5 3 50 3S120 50 70 72L25 97Z'));
  const cloud=path('M20 75C-3 75-3 45 15 40-2 20 25 3 38 16 42-3 70-1 75 17 100 5 110 35 90 43 110 65 85 88 70 75 60 100 30 95 30 77Z');
  add(callouts,'cloudCallout','Cloud Callout',cloud+'<circle cx="16" cy="90" r="5"/>');
  add(callouts,'borderCallout1','Line Callout',rect+path('M40 60 20 97 3 97'));
  add(symbols,'mathPlus','Plus',path('M35 3H65V35H97V65H65V97H35V65H3V35H35Z'));
  add(symbols,'mathMinus','Minus','<rect x="3" y="37" width="94" height="26"/>');
  add(symbols,'mathMultiply','Multiply',path('M3 20 20 3 50 33 80 3 97 20 67 50 97 80 80 97 50 67 20 97 3 80 33 50Z'));
  add(symbols,'mathDivide','Divide','<circle cx="50" cy="16" r="12"/><rect x="3" y="38" width="94" height="24"/><circle cx="50" cy="84" r="12"/>');
  add(symbols,'mathEqual','Equal','<path d="M3 25H97V42H3ZM3 58H97V75H3Z"/>');
  add(symbols,'mathNotEqual','Not Equal',path('M3 25H97V42H3ZM3 58H97V75H3ZM70 3 82 10 30 97 18 90Z'));
  add(symbols,'heart','Heart',path('M50 97 8 53C-15 15 25-10 50 20 75-10 115 15 92 53Z'));
  add(symbols,'lightningBolt','Lightning Bolt',path('M43 3H80L58 40H92L30 97 43 58H8Z'));
  add(symbols,'sun','Sun',polygon(12,true)+'<circle cx="50" cy="50" r="22"/>');
  add(symbols,'moon','Moon',path('M75 3C-18 3-18 97 75 97 25 70 25 30 75 3Z'));
  add(symbols,'smileyFace','Smiley Face',ellipse+'<circle cx="32" cy="35" r="3"/><circle cx="68" cy="35" r="3"/>'+path('M25 62Q50 92 75 62'));
  add(symbols,'noSmoking','No Symbol',ellipse+path('M17 17 83 83'));
  for(const [id,label,markup] of [
    ['flowChartProcess','Process',rect],['flowChartAlternateProcess','Alternate Process',round],['flowChartDecision','Decision',path('M50 3 97 50 50 97 3 50Z')],
    ['flowChartInputOutput','Data',path('M25 3H97L75 97H3Z')],['flowChartPredefinedProcess','Predefined Process',rect+path('M20 3V97M80 3V97')],
    ['flowChartInternalStorage','Internal Storage',rect+path('M20 3V97M3 20H97')],['flowChartDocument','Document',path('M3 3H97V80Q75 65 50 83T3 80Z')],
    ['flowChartTerminator','Terminator','<rect x="3" y="15" width="94" height="70" rx="35"/>'],['flowChartPreparation','Preparation',polygon(6)],
    ['flowChartManualInput','Manual Input',path('M3 25 97 3V97H3Z')],['flowChartManualOperation','Manual Operation',path('M3 3H97L75 97H25Z')],
    ['flowChartConnector','Connector',ellipse],['flowChartOffpageConnector','Off-page Connector',path('M3 3H97V65L50 97 3 65Z')],['flowChartMagneticDisk','Database',items.find(x=>x.id==='can').markup],
    ['flowChartSummingJunction','Summing Junction',ellipse+path('M18 18 82 82M18 82 82 18')],['flowChartOr','Or',ellipse+path('M3 50H97M50 3V97')]
  ])add(flow,id,label,markup);
  for(const n of [4,5,6,8,10,12,16,24,32])add(stars,'star'+n,'Star '+n,polygon(n,true));
  add(stars,'ribbon','Ribbon',path('M3 25H20V3H80V25H97L85 50 97 75H80V97H20V75H3L15 50ZM20 25V75M80 25V75'));
  add(stars,'wave','Wave',path('M3 20Q25 3 50 20T97 20V80Q75 97 50 80T3 80Z'));
  const get=id=>items.find(item=>item.id===id);
  function svg(id){const item=get(id);if(!item)throw new Error('Bentuk tidak valid.');return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g fill="${item.line?'none':'currentColor'}" fill-opacity=".12" stroke="currentColor" stroke-width="2" fill-rule="evenodd" stroke-linejoin="round">${item.markup}</g></svg>`;}
  function validate(shape){
    if(!get(shape.id)||typeof shape.text!=='string'||shape.text.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(shape.text))throw new Error('Bentuk atau teks tidak valid (maksimal 1.000 karakter).');
    if(!['fill','stroke','textColor'].every(key=>/^#[0-9a-f]{6}$/i.test(shape[key]))||!Number.isFinite(shape.lineWidth)||shape.lineWidth<1||shape.lineWidth>12||!Number.isFinite(shape.fontSize)||shape.fontSize<1||shape.fontSize>409)throw new Error('Warna atau ukuran bentuk tidak valid.');
    if(shape.fontName!==undefined&&(typeof shape.fontName!=='string'||!shape.fontName.trim()||shape.fontName.length>100||/[\u0000-\u001f<>]/.test(shape.fontName)))throw new Error('Nama font tidak valid.');
  }
  const ns={xdr:'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',a:'http://schemas.openxmlformats.org/drawingml/2006/main'};
  function append(xml,parent,space,name,attrs={},text){const node=xml.createElementNS(ns[space],space+':'+name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;if(space==='a'&&name==='t')node.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');parent.appendChild(node);return node;}
  function applyProperties(anchor,shape){
    validate(shape);const E=WorkbookEngine,sp=E.child(anchor,'sp');if(!sp)return;
    const xml=anchor.ownerDocument,properties=E.child(sp,'spPr'),item=get(shape.id);
    for(const name of ['solidFill','noFill','gradFill','blipFill','pattFill','grpFill','ln'])[...properties.children].filter(node=>node.localName===name).forEach(node=>node.remove());
    if(item.line||shape.noFill)append(xml,properties,'a','noFill');else append(xml,append(xml,properties,'a','solidFill'),'a','srgbClr',{val:shape.fill.slice(1)});
    const line=append(xml,properties,'a','ln',{w:Math.round(shape.lineWidth*9525)});if(shape.noLine||item.textBox)append(xml,line,'a','noFill');else append(xml,append(xml,line,'a','solidFill'),'a','srgbClr',{val:shape.stroke.slice(1)});if(item.arrow)append(xml,line,'a','tailEnd',{type:'triangle',w:'med',len:'med'});
    const order=['xfrm','prstGeom','custGeom','noFill','solidFill','gradFill','blipFill','pattFill','grpFill','ln','effectLst','effectDag','scene3d','sp3d','extLst'];
    [...properties.children].sort((a,b)=>order.indexOf(a.localName)-order.indexOf(b.localName)).forEach(node=>properties.appendChild(node));
    E.child(sp,'txBody')?.remove();const body=append(xml,sp,'xdr','txBody');append(xml,body,'a','bodyPr',{wrap:shape.wrap===false?'none':'square',anchor:{top:'t',bottom:'b'}[shape.vertical]||'ctr',lIns:45720,rIns:45720,tIns:22860,bIns:22860});append(xml,body,'a','lstStyle');
    for(const text of shape.text.split('\n')){const p=append(xml,body,'a','p');append(xml,p,'a','pPr',{algn:{left:'l',right:'r'}[shape.horizontal]||'ctr'});const run=append(xml,p,'a','r'),style=append(xml,run,'a','rPr',{lang:'id-ID',sz:Math.round(shape.fontSize*100),b:shape.bold?'1':'0',i:shape.italic?'1':'0',u:shape.underline?'sng':'none'});append(xml,append(xml,style,'a','solidFill'),'a','srgbClr',{val:shape.textColor.slice(1)});append(xml,style,'a','latin',{typeface:shape.fontName||'Arial'});append(xml,run,'a','t',{},text);append(xml,p,'a','endParaRPr',{lang:'id-ID',sz:Math.round(shape.fontSize*100)});}
  }
  function anchor(xml,shape,id){
    validate(shape);const item=get(shape.id),node=xml.createElementNS(ns.xdr,'xdr:oneCellAnchor'),from=append(xml,node,'xdr','from');
    for(const [name,value] of Object.entries({col:shape.column,colOff:Math.round((shape.x||0)*9525),row:shape.row,rowOff:Math.round((shape.y||0)*9525)}))append(xml,from,'xdr',name,{},value);
    const extent={cx:Math.round(shape.width*9525),cy:Math.round(shape.height*9525)};append(xml,node,'xdr','ext',extent);
    const sp=append(xml,node,'xdr','sp'),nv=append(xml,sp,'xdr','nvSpPr');append(xml,nv,'xdr','cNvPr',{id,name:'CBI Shape '+shape.id});append(xml,nv,'xdr','cNvSpPr',item.textBox?{txBox:'1'}:{});
    const props=append(xml,sp,'xdr','spPr'),transform=append(xml,props,'a','xfrm');append(xml,transform,'a','off',{x:0,y:0});append(xml,transform,'a','ext',extent);append(xml,append(xml,props,'a','prstGeom',{prst:item.preset}),'a','avLst');applyProperties(node,shape);append(xml,node,'xdr','clientData');return node;
  }
  async function read(book,sheet){
    const E=WorkbookEngine,drawing=E.elements(sheet.xml,'drawing')[0];if(!drawing)return [];
    const relPath=sheet.path.slice(0,sheet.path.lastIndexOf('/')+1)+'_rels/'+sheet.path.split('/').pop()+'.rels',rels=await E.readXml(book.zip,relPath);if(!rels)return [];
    const id=drawing.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),rel=E.elements(rels,'Relationship').find(n=>n.getAttribute('Id')===id&&n.getAttribute('TargetMode')!=='External');if(!rel)return [];
    const xml=await E.readXml(book.zip,XlsxPackage.resolvePart(sheet.path,rel.getAttribute('Target')));if(!xml)return [];const result=[];
    for(const [index,node] of [...xml.documentElement.children].entries()){
      const sp=E.child(node,'sp'),props=sp&&E.child(sp,'spPr'),preset=props&&E.child(props,'prstGeom')?.getAttribute('prst');if(!preset)continue;
      const own=E.elements(sp,'cNvPr')[0]?.getAttribute('name')?.replace(/^CBI Shape /,''),item=(['1','true'].includes(E.elements(sp,'cNvSpPr')[0]?.getAttribute('txBox'))?get('textBox'):null)||(get(own)?.preset===preset?get(own):null)||items.find(item=>item.preset===preset&&!item.textBox);if(!item)continue;
      const from=E.child(node,'from'),to=E.child(node,'to'),extent=E.child(node,'ext');if(!from)continue;
      const number=(parent,name)=>Number(E.child(parent,name)?.textContent||0),color=(parent,fallback)=>{const value=parent&&E.elements(parent,'srgbClr')[0]?.getAttribute('val');return /^[0-9a-f]{6}$/i.test(value)?'#'+value:fallback;};
      const line=E.child(props,'ln'),body=E.child(sp,'txBody'),font=body&&E.elements(body,'rPr')[0];
      const shape={kind:'shape',id:item.id,noLine:Boolean(item.textBox||E.child(line,'noFill')),anchorIndex:index,column:number(from,'col'),row:number(from,'row'),x:number(from,'colOff')/9525,y:number(from,'rowOff')/9525,toColumn:to?number(to,'col'):null,toRow:to?number(to,'row'):null,toX:to?number(to,'colOff')/9525:0,toY:to?number(to,'rowOff')/9525:0,width:extent?Number(extent.getAttribute('cx'))/9525:160,height:extent?Number(extent.getAttribute('cy'))/9525:90,text:body?E.elements(body,'p').map(p=>[...p.children].map(run=>run.localName==='br'?'\n':E.elements(run,'t').map(t=>t.textContent).join('')).join('')).join('\n'):'',fill:color(E.child(props,'solidFill'),'#dce9ff'),stroke:color(line,'#1f4e78'),noFill:Boolean(E.child(props,'noFill')),lineWidth:Math.max(1,Math.min(12,Number(line?.getAttribute('w')||19050)/9525)),fontSize:Math.max(8,Math.min(96,Number(font?.getAttribute('sz')||1100)/100)),textColor:color(font,'#173250')};
      const bodyProps=E.child(body,'bodyPr'),paragraph=body&&E.elements(body,'pPr')[0];
      Object.assign(shape,{fontName:E.child(font,'latin')?.getAttribute('typeface')||'Arial',fontSize:Math.max(1,Math.min(409,Number(font?.getAttribute('sz')||1100)/100)),bold:['1','true'].includes(font?.getAttribute('b')),italic:['1','true'].includes(font?.getAttribute('i')),underline:!!font?.getAttribute('u')&&font.getAttribute('u')!=='none',horizontal:{l:'left',r:'right'}[paragraph?.getAttribute('algn')]||'center',vertical:{t:'top',b:'bottom'}[bodyProps?.getAttribute('anchor')]||'center',wrap:bodyProps?.getAttribute('wrap')!=='none'});
      if(shape.text.length>1000||![shape.column,shape.row,shape.x,shape.y,shape.width,shape.height].every(Number.isFinite)||shape.column<0||shape.row<0)continue;
      result.push(shape);if(result.length>200)throw new Error('Maksimal 200 bentuk per worksheet.');
    }
    return result;
  }
  function isTextBox(anchor){return ['1','true'].includes(WorkbookEngine.elements(anchor,'cNvSpPr')[0]?.getAttribute('txBox'));}
  function removeOutline(anchor){const properties=WorkbookEngine.child(WorkbookEngine.child(anchor,'sp'),'spPr');if(!properties)return;let line=WorkbookEngine.child(properties,'ln');if(!line){line=anchor.ownerDocument.createElementNS(ns.a,'a:ln');properties.insertBefore(line,[...properties.children].find(n=>['effectLst','effectDag','scene3d','sp3d','extLst'].includes(n.localName))||null);}for(const child of [...line.children])if(['solidFill','gradFill','pattFill','noFill'].includes(child.localName))child.remove();line.insertBefore(anchor.ownerDocument.createElementNS(ns.a,'a:noFill'),line.firstChild);}
  const api={isTextBox,removeOutline,items,get,svg,validate,anchor,applyProperties,read};if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkbookShapes=api;
})(globalThis);
