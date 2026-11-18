'use strict';
const channel=new URLSearchParams(location.hash.slice(1)).get('channel'), owner=window.opener, origin=location.protocol==='file:'?'*':location.origin;
const pages=document.getElementById('approval-pages'), message=document.getElementById('approval-message'), hint=document.getElementById('approval-hint'), select=document.getElementById('signature-select'), confirmButton=document.getElementById('signature-confirm'), dialog=document.getElementById('signature-dialog');
const sizeControls=document.getElementById('signature-size-controls'),sizeSlider=document.getElementById('signature-size'),sizeInput=document.getElementById('signature-percent');
let signatureUrl='',signatureImage=null,signaturePercent=100,position=null,placing=false,pdfDocument=null,pageRecords=[],pageObserver=null,resizeTimer=null,documentGeneration=0;
function say(text){hint.textContent=text;}
function signatureGeometry(record,point=position){
 const [left,bottom,right,top]=record.page.view;
 return PdfSignatureGeometry.place(signatureImage.width,signatureImage.height,point,{x:left,y:bottom,width:right-left,height:top-bottom},record.page.rotate);
}
function canTransformSignature(){return Boolean(position&&placing&&!confirmButton.disabled);}
function setSignatureSize(value){
 if(!canTransformSignature())return;
 const percent=Number(value);
 if(!Number.isInteger(percent)||percent<10||percent>300){say('Gunakan ukuran tanda tangan antara 10 dan 300%.');sizeInput.value=position.percent;return;}
 position={...position,percent};paintSignature();
}
function paintSignature(){
 let mark=document.querySelector('.signature-mark');const record=position&&pageRecords[position.page-1];
 if(!record||!signatureImage){mark?.remove();sizeControls.hidden=true;return;}
 const geometry=signatureGeometry(record);position={...position,x:geometry.x,y:geometry.y,percent:geometry.percent};signaturePercent=geometry.percent;
 const viewport=record.viewport,[x,y]=viewport.convertToViewportPoint(position.x,position.y);
 if(!mark){
  mark=document.createElement('div');mark.className='signature-mark';mark.tabIndex=0;mark.setAttribute('role','group');mark.setAttribute('aria-label','Tanda tangan pada PDF');mark.title='Geser tanda tangan atau tarik sudut untuk mengubah ukurannya.';
  const image=document.createElement('img');image.src=signatureUrl;image.alt='';image.draggable=false;mark.append(image);
  for(const [direction,label] of Object.entries({nw:'kiri atas',ne:'kanan atas',sw:'kiri bawah',se:'kanan bawah'})){const handle=document.createElement('button');handle.type='button';handle.dataset.signatureResize=direction;handle.setAttribute('aria-label','Ubah ukuran tanda tangan '+label);mark.append(handle);}
  mark.addEventListener('click',event=>event.stopPropagation());mark.addEventListener('pointerdown',beginSignatureTransform);
  mark.addEventListener('keydown',event=>{if(event.target.matches('[data-signature-resize]')&&['ArrowUp','ArrowDown','ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();setSignatureSize(Math.max(10,Math.min(300,signaturePercent+(['ArrowUp','ArrowRight'].includes(event.key)?1:-1)*(event.shiftKey?10:1))));}});
 }
 if(mark.parentElement!==record.box)record.box.append(mark);
 mark.style.left=x/viewport.width*100+'%';mark.style.top=y/viewport.height*100+'%';mark.style.width=geometry.width*viewport.scale+'px';mark.style.height=geometry.height*viewport.scale+'px';mark.classList.toggle('is-locked',!canTransformSignature());
 sizeControls.hidden=!placing;sizeSlider.value=sizeInput.value=String(signaturePercent);
 for(const control of sizeControls.querySelectorAll('button,input'))control.disabled=!canTransformSignature();
 for(const control of mark.querySelectorAll('button'))control.disabled=!canTransformSignature();
}
function beginSignatureTransform(event){
 if(event.button!==0||!canTransformSignature())return;
 event.preventDefault();event.stopPropagation();
 const record=pageRecords[position.page-1],viewport=record.viewport,rect=record.canvas.getBoundingClientRect(),original={...position},geometry=signatureGeometry(record),generation=documentGeneration;
 const [centerX,centerY]=viewport.convertToViewportPoint(position.x,position.y),width=geometry.width*viewport.scale,height=geometry.height*viewport.scale,handle=event.target.closest('[data-signature-resize]'),capture=handle||event.currentTarget,sx=handle?.dataset.signatureResize.includes('w')?-1:1,sy=handle?.dataset.signatureResize.includes('n')?-1:1,startX=event.clientX,startY=event.clientY;
 capture.setPointerCapture(event.pointerId);
 const move=e=>{
  if(!canTransformSignature()||documentGeneration!==generation||record.viewport!==viewport)return;
  const dx=(e.clientX-startX)*viewport.width/rect.width,dy=(e.clientY-startY)*viewport.height/rect.height;let x=centerX+dx,y=centerY+dy,percent=original.percent;
  if(handle){percent=Math.max(10,Math.min(300,Math.round(original.percent*(1+(sx*dx*width+sy*dy*height)/(width*width+height*height)))));const resized=signatureGeometry(record,{...original,percent});x=centerX-sx*width/2+sx*resized.width*viewport.scale/2;y=centerY-sy*height/2+sy*resized.height*viewport.scale/2;}
  const point=viewport.convertToPdfPoint(x,y);position={page:original.page,x:point[0],y:point[1],percent};paintSignature();
 };
 const finish=e=>{
  capture.removeEventListener('pointermove',move);capture.removeEventListener('pointerup',finish);capture.removeEventListener('pointercancel',finish);
  if(capture.hasPointerCapture(event.pointerId))capture.releasePointerCapture(event.pointerId);
  if(e.type==='pointercancel'&&canTransformSignature()&&documentGeneration===generation){position=original;paintSignature();}
 };
 capture.addEventListener('pointermove',move);capture.addEventListener('pointerup',finish);capture.addEventListener('pointercancel',finish);
}
function layoutPdfPage(record){
 const padding=getComputedStyle(pages),width=Math.max(1,pages.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight)),base=record.page.getViewport({scale:1});
 record.viewport=record.page.getViewport({scale:width/base.width});
 for(const element of [record.box,record.canvas]){element.style.width=record.viewport.width+'px';element.style.height=record.viewport.height+'px';}
}
async function releasePdfPage(record){
 const generation=++record.generation,task=record.task;record.task=null;record.renderKey=null;delete record.box.dataset.rendered;
 if(task){task.cancel();await task.promise.catch(()=>{});}
 if(generation===record.generation){record.canvas.width=0;record.canvas.height=0;}
}
async function renderPdfPage(record){
 const viewport=record.viewport,density=Math.max(2,window.devicePixelRatio||1);
 // CSS size and bitmap density are independent; bound each canvas and release
 // distant pages rather than retaining high-resolution bitmaps for all pages.
 const outputScale=Math.min(density,3,16384/Math.max(viewport.width,viewport.height),Math.sqrt(16*1024*1024/(viewport.width*viewport.height))),key=[viewport.width,viewport.height,outputScale].join(':');
 if(record.renderKey===key)return;
 const generation=++record.generation,previous=record.task;record.renderKey=key;delete record.box.dataset.rendered;
 if(previous){previous.cancel();await previous.promise.catch(()=>{});}
 if(generation!==record.generation||!record.near||!record.box.isConnected)return;
 const canvas=record.canvas;canvas.width=Math.ceil(viewport.width*outputScale);canvas.height=Math.ceil(viewport.height*outputScale);
 const task=record.page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[outputScale,0,0,outputScale,0,0]});record.task=task;
 try{await task.promise;if(generation===record.generation)record.box.dataset.rendered='true';}
 catch(error){if(error.name!=='RenderingCancelledException')throw error;}
 finally{if(record.task===task)record.task=null;}
}
function redrawPdfPages(){
 for(const record of pageRecords){layoutPdfPage(record);if(record.near)renderPdfPage(record).catch(error=>say(error.message||'Halaman PDF tidak dapat ditampilkan.'));}
 paintSignature();
}
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(redrawPdfPages,100);});
window.addEventListener('message',async event=>{
 if(event.source!==owner||event.data?.channel!==channel||(location.protocol!=='file:'&&event.origin!==location.origin))return;
 if(event.data.type==='docuflow:approval-result'){confirmButton.disabled=false;if(event.data.error){say(event.data.error);paintSignature();if(!pageRecords.length){message.hidden=false;message.textContent=event.data.error;}return;}say('Persetujuan berhasil disimpan.');placing=false;select.hidden=true;confirmButton.hidden=true;paintSignature();return;}
 if(event.data.type!=='docuflow:approval-data')return;
 const generation=++documentGeneration;
 try {
  document.getElementById('approval-title').textContent=event.data.title||'Persetujuan dokumen';document.getElementById('approval-code').textContent=event.data.code||'';
  const bytes=new Uint8Array(event.data.pdf), signature=event.data.signature;
  if(signatureUrl){URL.revokeObjectURL(signatureUrl);signatureUrl='';}
  signatureImage=null;
  if(signature instanceof ArrayBuffer && signature.byteLength){signatureUrl=URL.createObjectURL(new Blob([signature],{type:'image/png'}));const image=document.getElementById('saved-signature');image.src=signatureUrl;await image.decode();signatureImage={width:image.naturalWidth,height:image.naturalHeight};}
  pageObserver?.disconnect();await Promise.all(pageRecords.map(releasePdfPage));if(pdfDocument)await pdfDocument.destroy();
  if(generation!==documentGeneration)return;
  pageRecords=[];position=null;placing=false;signaturePercent=100;sizeControls.hidden=true;select.hidden=true;confirmButton.hidden=true;message.hidden=false;message.textContent='Menyiapkan dokumen...';pages.replaceChildren(message);
  pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker-3.11.174.min.js';
  const pdf=await pdfjsLib.getDocument({data:bytes,isEvalSupported:false}).promise;
  if(generation!==documentGeneration){await pdf.destroy();return;}pdfDocument=pdf;
  if(pdf.numPages>100)throw Error('PDF memiliki terlalu banyak halaman untuk ditampilkan.');
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i);if(generation!==documentGeneration)return;
   const box=document.createElement('div'),canvas=document.createElement('canvas'),record={page,box,canvas,generation:0,near:i===1,task:null,renderKey:null};
   box.className='approval-page';box.dataset.page=String(i);canvas.width=0;canvas.height=0;box.append(canvas);pages.append(box);pageRecords.push(record);layoutPdfPage(record);
   box.addEventListener('click',event=>{if(!placing||confirmButton.disabled||box.dataset.rendered!=='true'||event.target.closest('.signature-mark'))return;const rect=canvas.getBoundingClientRect(),viewport=record.viewport,px=(event.clientX-rect.left)*viewport.width/rect.width,py=(event.clientY-rect.top)*viewport.height/rect.height,[x,y]=viewport.convertToPdfPoint(px,py);position={page:i,x,y,percent:signaturePercent};paintSignature();confirmButton.hidden=false;say('Tarik sudut untuk mengatur ukuran, lalu pilih Setujui dan simpan.');});
  }
  await renderPdfPage(pageRecords[0]);if(generation!==documentGeneration)return;
  message.hidden=true;select.hidden=false;
  pageObserver=new IntersectionObserver(entries=>{for(const entry of entries){const record=pageRecords.find(item=>item.box===entry.target);if(!record)continue;record.near=entry.isIntersecting;(record.near?renderPdfPage(record):releasePdfPage(record)).catch(error=>say(error.message||'Halaman PDF tidak dapat ditampilkan.'));}},{root:pages,rootMargin:'500px 0px'});
  for(const record of pageRecords)pageObserver.observe(record.box);
 }catch(error){if(generation===documentGeneration){message.hidden=false;message.textContent=error.message||'PDF tidak dapat dibuka.';}}
});
select.addEventListener('click',()=>{if(!signatureUrl){say('Unggah tanda tangan melalui profil Anda, lalu buka kembali PDF ini.');return;}dialog.showModal();});document.getElementById('signature-cancel').addEventListener('click',()=>dialog.close());document.getElementById('signature-use').addEventListener('click',()=>{dialog.close();placing=true;document.querySelectorAll('.approval-page').forEach(el=>el.classList.add('placing'));say('Klik posisi tanda tangan pada halaman PDF.');});
sizeSlider.addEventListener('input',()=>setSignatureSize(sizeSlider.value));sizeInput.addEventListener('change',()=>setSignatureSize(sizeInput.value));sizeInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();setSignatureSize(sizeInput.value);}});
document.getElementById('signature-smaller').addEventListener('click',()=>setSignatureSize(Math.max(10,signaturePercent-10)));document.getElementById('signature-larger').addEventListener('click',()=>setSignatureSize(Math.min(300,signaturePercent+10)));
confirmButton.addEventListener('click',()=>{if(!position)return;confirmButton.disabled=true;paintSignature();say('Menyimpan persetujuan...');owner.postMessage({type:'docuflow:approval-confirm',channel,position},origin);});
document.getElementById('approval-close').addEventListener('click',()=>window.close());
window.addEventListener('pagehide',()=>{++documentGeneration;clearTimeout(resizeTimer);pageObserver?.disconnect();for(const record of pageRecords)record.task?.cancel();pdfDocument?.destroy();if(signatureUrl)URL.revokeObjectURL(signatureUrl);});
if(owner&&channel)owner.postMessage({type:'docuflow:approval-ready',channel},origin);else message.textContent='Buka dokumen dari menu Persetujuan Dokumen.';
