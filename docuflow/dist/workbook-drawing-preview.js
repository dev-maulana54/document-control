'use strict';

// Imported DrawingML is drawn as an inert SVG image; its original XML, EMF/PNG
// media and group hierarchy remain untouched for the next XLSX export.
async function workbookDrawingPreview(book,shape,rels){
  const E=WorkbookEngine,ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),make=(name,attrs={})=>{const n=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
  const num=(node,name,fallback=0)=>{const v=Number(node?.getAttribute(name));return node?.hasAttribute(name)&&Number.isFinite(v)?v:fallback;},part=(node,name)=>E.child(node,name),transform=node=>part(part(node,node.localName==='grpSp'?'grpSpPr':'spPr'),'xfrm');
  const rootTransform=transform(shape),rootOff=part(rootTransform,'off'),rootExt=part(rootTransform,'ext'),rootWidth=num(rootExt,'cx',1),rootHeight=num(rootExt,'cy',1);if(rootWidth<=0||rootHeight<=0)throw new Error('Dimensi drawing tidak valid.');
  svg.setAttribute('xmlns',ns);svg.setAttribute('viewBox',`${num(rootOff,'x')} ${num(rootOff,'y')} ${rootWidth} ${rootHeight}`);svg.setAttribute('width',rootWidth/9525);svg.setAttribute('height',rootHeight/9525);svg.setAttribute('preserveAspectRatio','none');
  const schemeNames=['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'];
  function color(parent,fallback='#000000'){
    const fill=part(parent,'solidFill')||parent,node=fill&&[...fill.children].find(n=>['srgbClr','schemeClr','sysClr'].includes(n.localName));if(!node)return fallback;
    let value=node.getAttribute('lastClr')||node.getAttribute('val');if(node.localName==='schemeClr'){const name={bg1:'lt1',tx1:'dk1',bg2:'lt2',tx2:'dk2'}[value]||value;value=book.palette?.theme?.[schemeNames.indexOf(name)]?.slice(1);}
    return /^[a-f\d]{6}$/i.test(value)?'#'+value:fallback;
  }
  const measure=document.createElement('canvas').getContext('2d');
  function wrapText(value,width,font,wrap){
    measure.font=font;const lines=[],append=value=>{if(count+lines.length>=2000)throw new Error('Drawing terlalu kompleks.');lines.push(value);};
    for(const explicit of value.split('\n')){
      if(!wrap||measure.measureText(explicit).width<=width){append(explicit);continue;}
      let line='';
      for(const token of explicit.match(/\S+\s*|\s+/g)||[]){
        if(line&&measure.measureText(line+token.trimEnd()).width>width){append(line.trimEnd());line='';}
        const word=line?token:token.trimStart();
        if(measure.measureText(word.trimEnd()).width>width){
          for(const character of word){if(line&&measure.measureText(line+character).width>width){append(line.trimEnd());line='';}line+=character;}
        }else line+=word;
      }
      append(line.trimEnd());
    }
    return lines;
  }
  let count=0;
  async function draw(node,depth=0,scaleX=1,scaleY=1){
    if(++count>2000||depth>24)throw new Error('Drawing terlalu kompleks.');
    const xf=transform(node),off=part(xf,'off'),ext=part(xf,'ext'),ox=num(off,'x'),oy=num(off,'y'),w=num(ext,'cx',1),h=num(ext,'cy',1),g=make('g');
    if(node.localName==='grpSp'){
      const origin=part(xf,'chOff'),span=part(xf,'chExt'),cw=num(span,'cx',w),ch=num(span,'cy',h);if(!cw||!ch)throw new Error('Skala drawing tidak valid.');g.setAttribute('transform',`translate(${ox} ${oy}) scale(${w/cw} ${h/ch}) translate(${-num(origin,'x')} ${-num(origin,'y')})`);
      for(const n of node.children)if(['sp','pic','grpSp','cxnSp'].includes(n.localName))g.appendChild(await draw(n,depth+1,scaleX*w/cw,scaleY*h/ch));return g;
    }
    let trans=`translate(${ox} ${oy})`;const rot=num(xf,'rot')/60000;if(rot)trans+=` rotate(${rot} ${w/2} ${h/2})`;if(['1','true'].includes(xf?.getAttribute('flipH')))trans+=` translate(${w} 0) scale(-1 1)`;if(['1','true'].includes(xf?.getAttribute('flipV')))trans+=` translate(0 ${h}) scale(1 -1)`;g.setAttribute('transform',trans);
    if(node.localName==='pic'){
      const blip=E.elements(node,'blip')[0],id=blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed'),path=rels.get(id);if(!path)return g;const bytes=await E.readPart(book.zip,path);if(!bytes)return g;let source;
      if(/\.emf$/i.test(path))source=workbookVectorPreview(bytes);else{const mime=/\.jpe?g$/i.test(path)?'jpeg':/\.png$/i.test(path)?'png':/\.gif$/i.test(path)?'gif':null;if(!mime)return g;let binary='';for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));source='data:image/'+mime+';base64,'+btoa(binary);}
      const image=make('image',{width:w,height:h,preserveAspectRatio:'none',href:source});g.appendChild(image);return g;
    }
    const props=part(node,'spPr'),line=part(props,'ln'),fill=part(props,'noFill')?'none':color(props,'none'),stroke=part(line,'noFill')?'none':color(line,'#000000'),strokeWidth=num(line,'w',9525)/Math.sqrt(Math.abs(scaleX*scaleY)),attributes={fill,stroke,'stroke-width':strokeWidth,'stroke-linejoin':'round'};
    const custom=part(props,'custGeom'),paths=custom&&E.elements(custom,'path');
    if(paths?.length){for(const path of paths){const pw=num(path,'w',w),ph=num(path,'h',h);let d='';for(const command of path.children){const points=[...command.children].map(p=>[num(p,'x'),num(p,'y')].join(','));if(command.localName==='moveTo')d+='M'+points.join(' ');else if(command.localName==='lnTo')d+='L'+points.join(' ');else if(command.localName==='cubicBezTo')d+='C'+points.join(' ');else if(command.localName==='quadBezTo')d+='Q'+points.join(' ');else if(command.localName==='close')d+='Z';}if(d)g.appendChild(make('path',{...attributes,d,transform:`scale(${w/pw} ${h/ph})`,fill:path.getAttribute('fill')==='none'?'none':fill,stroke:path.getAttribute('stroke')==='0'?'none':stroke,'stroke-width':strokeWidth/Math.max(w/pw,h/ph)}));}}
    else{
      const preset=part(props,'prstGeom')?.getAttribute('prst');let geometry;
      if(preset==='ellipse')geometry=make('ellipse',{cx:w/2,cy:h/2,rx:w/2,ry:h/2});
      else if(preset==='triangle')geometry=make('polygon',{points:`${w/2},0 ${w},${h} 0,${h}`});
      else if(preset==='diamond')geometry=make('polygon',{points:`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`});
      else if(preset==='plus')geometry=make('path',{d:`M${w/3} 0H${2*w/3}V${h/3}H${w}V${2*h/3}H${2*w/3}V${h}H${w/3}V${2*h/3}H0V${h/3}H${w/3}Z`});
      else if(preset==='flowChartDelay')geometry=make('path',{d:`M0 0H${w/2}A${w/2} ${h/2} 0 0 1 ${w/2} ${h}H0Z`});
      else geometry=make('rect',{width:w,height:h,rx:preset==='roundRect'?Math.min(w,h)*.12:0});
      for(const [key,value] of Object.entries(attributes))geometry.setAttribute(key,value);g.appendChild(geometry);
    }
    const body=part(node,'txBody');if(body){const bodyProps=part(body,'bodyPr'),paragraphs=[...body.children].filter(n=>n.localName==='p'),lines=[];let total=0;
      // SVG clamps very large font-size values even inside a tiny viewBox.
      // Keep font sizes in CSS-sized units and scale the text's coordinate frame.
      const textUnitX=9525/Math.abs(scaleX),textUnitY=9525/Math.abs(scaleY),left=num(bodyProps,'lIns',91440)/Math.abs(scaleX),rightInset=num(bodyProps,'rIns',91440)/Math.abs(scaleX),top=num(bodyProps,'tIns',45720)/Math.abs(scaleY),bottom=num(bodyProps,'bIns',45720)/Math.abs(scaleY),textWidth=Math.max(0,w-left-rightInset);
      for(const p of paragraphs){
        const paragraphProps=part(p,'pPr'),defaults=part(paragraphProps,'defRPr'),segments=[{value:'',props:null}];
        for(const run of p.children){if(run.localName==='br')segments.push({value:'',props:part(run,'rPr')});else if(['r','fld'].includes(run.localName)){const segment=segments.at(-1);if(!segment.value)segment.props=part(run,'rPr')||segment.props;segment.value+=part(run,'t')?.textContent||'';}}
        for(const {value,props} of segments){
          const size=num(props,'sz',num(defaults,'sz',1100))*127/Math.abs(scaleY),font=part(props,'latin')?.getAttribute('typeface')||part(defaults,'latin')?.getAttribute('typeface')||'Arial',bold=(props?.getAttribute('b')??defaults?.getAttribute('b'))==='1',italic=(props?.getAttribute('i')??defaults?.getAttribute('i'))==='1',spacing=part(paragraphProps,'lnSpc'),lineHeight=part(spacing,'spcPts')?num(part(spacing,'spcPts'),'val')*127/Math.abs(scaleY):size*1.2;
          const fontStyle=`${italic?'italic ':''}${bold?'bold ':''}${size/textUnitY}px "${font.replace(/["\\]/g,'')}"`;
          for(const text of wrapText(value,textWidth/textUnitX,fontStyle,bodyProps?.getAttribute('wrap')!=='none')){count++;lines.push({text,width:measure.measureText(text).width*textUnitX,size,lineHeight,font,bold,italic,color:color(props,color(defaults)),align:paragraphProps?.getAttribute('algn')||'l'});total+=lineHeight;}
        }
      }
      const anchor=bodyProps?.getAttribute('anchor');let baseline=anchor==='ctr'?top+(h-top-bottom-total)/2:anchor==='b'?h-total-bottom:top;
      const textGroup=make('g');
      const clipX=bodyProps?.getAttribute('horzOverflow')==='clip',clipY=bodyProps?.getAttribute('vertOverflow')==='clip';
      if(clipX||clipY){
        // Bound only the requested axis; the other axis must still admit the
        // complete text, including glyph overhang, beyond the shape's insets.
        const widest=lines.reduce((value,line)=>Math.max(value,line.width),0),largest=lines.reduce((value,line)=>Math.max(value,line.size),0),x=clipX?left:Math.min(0,left-widest-largest),right=clipX?w-rightInset:Math.max(w,w-rightInset+widest+largest),y=clipY?top:Math.min(0,top-total-largest),bottomEdge=clipY?h-bottom:Math.max(h,h-bottom+total+largest),id='drawing-text-'+count,clip=make('clipPath',{id});
        clip.appendChild(make('rect',{x,y,width:Math.max(0,right-x),height:Math.max(0,bottomEdge-y)}));g.appendChild(clip);textGroup.setAttribute('clip-path',`url(#${id})`);
      }
      for(const l of lines){baseline+=l.size;const center=l.align==='ctr',right=l.align==='r',text=make('text',{x:(center?left+textWidth/2:right?w-rightInset:left)/textUnitX,y:baseline/textUnitY,transform:`scale(${textUnitX} ${textUnitY})`,'font-size':l.size/textUnitY,'font-family':l.font,'font-weight':l.bold?'bold':'normal','font-style':l.italic?'italic':'normal',fill:l.color,'text-anchor':center?'middle':right?'end':'start'});text.textContent=l.text;textGroup.appendChild(text);baseline+=l.lineHeight-l.size;}
      g.appendChild(textGroup);
    }
    return g;
  }
  svg.appendChild(await draw(shape));return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
}
