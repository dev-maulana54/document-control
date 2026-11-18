'use strict';
const channel=new URLSearchParams(location.hash.slice(1)).get('channel'), owner=window.opener, origin=location.protocol==='file:'?'*':location.origin;
const pages=document.getElementById('approval-pages'), message=document.getElementById('approval-message'), hint=document.getElementById('approval-hint'), select=document.getElementById('signature-select'), confirmButton=document.getElementById('signature-confirm'), dialog=document.getElementById('signature-dialog');
let signatureUrl='',position=null,placing=false,pdfDocument=null,pageRecords=[],pageObserver=null,resizeTimer=null,documentGeneration=0;
function say(text){hint.textContent=text;}
function paintSignature(){
 document.querySelector('.signature-mark')?.remove();
 const record=position&&pageRecords[position.page-1];if(!record)return;
 const viewport=record.viewport,[x,y]=viewport.convertToViewportPoint(position.x,position.y),mark=document.createElement('img');mark.className='signature-mark';mark.src=signatureUrl;mark.alt='';
 mark.style.left=x/viewport.width*100+'%';mark.style.top=y/viewport.height*100+'%';mark.style.width=Math.min(120*viewport.scale,viewport.width*.4)+'px';mark.style.height=Math.min(50*viewport.scale,viewport.height*.2)+'px';record.box.append(mark);
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
 if(event.data.type==='docuflow:approval-result'){confirmButton.disabled=false;if(event.data.error){say(event.data.error);if(!pageRecords.length){message.hidden=false;message.textContent=event.data.error;}return;}say('Persetujuan berhasil disimpan.');placing=false;select.hidden=true;confirmButton.hidden=true;return;}
 if(event.data.type!=='docuflow:approval-data')return;
 const generation=++documentGeneration;
 try {
  document.getElementById('approval-title').textContent=event.data.title||'Persetujuan dokumen';document.getElementById('approval-code').textContent=event.data.code||'';
  const bytes=new Uint8Array(event.data.pdf), signature=event.data.signature;
  if(signatureUrl){URL.revokeObjectURL(signatureUrl);signatureUrl='';}
  if(signature instanceof ArrayBuffer && signature.byteLength){signatureUrl=URL.createObjectURL(new Blob([signature],{type:'image/png'}));document.getElementById('saved-signature').src=signatureUrl;}
  pageObserver?.disconnect();await Promise.all(pageRecords.map(releasePdfPage));if(pdfDocument)await pdfDocument.destroy();
  if(generation!==documentGeneration)return;
  pageRecords=[];position=null;placing=false;select.hidden=true;confirmButton.hidden=true;message.hidden=false;message.textContent='Menyiapkan dokumen?';pages.replaceChildren(message);
  pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker-3.11.174.min.js';
  const pdf=await pdfjsLib.getDocument({data:bytes,isEvalSupported:false}).promise;
  if(generation!==documentGeneration){await pdf.destroy();return;}pdfDocument=pdf;
  if(pdf.numPages>100)throw Error('PDF memiliki terlalu banyak halaman untuk ditampilkan.');
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i);if(generation!==documentGeneration)return;
   const box=document.createElement('div'),canvas=document.createElement('canvas'),record={page,box,canvas,generation:0,near:i===1,task:null,renderKey:null};
   box.className='approval-page';box.dataset.page=String(i);canvas.width=0;canvas.height=0;box.append(canvas);pages.append(box);pageRecords.push(record);layoutPdfPage(record);
   box.addEventListener('click',event=>{if(!placing||box.dataset.rendered!=='true')return;const rect=canvas.getBoundingClientRect(),viewport=record.viewport,px=(event.clientX-rect.left)*viewport.width/rect.width,py=(event.clientY-rect.top)*viewport.height/rect.height,[x,y]=viewport.convertToPdfPoint(px,py);position={page:i,x,y};paintSignature();confirmButton.hidden=false;say('Periksa posisi tanda tangan, lalu pilih Setujui dan simpan.');});
  }
  await renderPdfPage(pageRecords[0]);if(generation!==documentGeneration)return;
  message.hidden=true;select.hidden=false;
  pageObserver=new IntersectionObserver(entries=>{for(const entry of entries){const record=pageRecords.find(item=>item.box===entry.target);if(!record)continue;record.near=entry.isIntersecting;(record.near?renderPdfPage(record):releasePdfPage(record)).catch(error=>say(error.message||'Halaman PDF tidak dapat ditampilkan.'));}},{root:pages,rootMargin:'500px 0px'});
  for(const record of pageRecords)pageObserver.observe(record.box);
 }catch(error){if(generation===documentGeneration){message.hidden=false;message.textContent=error.message||'PDF tidak dapat dibuka.';}}
});
select.addEventListener('click',()=>{if(!signatureUrl){say('Unggah tanda tangan melalui profil Anda, lalu buka kembali PDF ini.');return;}dialog.showModal();});document.getElementById('signature-cancel').addEventListener('click',()=>dialog.close());document.getElementById('signature-use').addEventListener('click',()=>{dialog.close();placing=true;document.querySelectorAll('.approval-page').forEach(el=>el.classList.add('placing'));say('Klik posisi tanda tangan pada halaman PDF.');});
confirmButton.addEventListener('click',()=>{if(!position)return;confirmButton.disabled=true;say('Menyimpan persetujuan?');owner.postMessage({type:'docuflow:approval-confirm',channel,position},origin);});
document.getElementById('approval-close').addEventListener('click',()=>window.close());
window.addEventListener('pagehide',()=>{++documentGeneration;clearTimeout(resizeTimer);pageObserver?.disconnect();for(const record of pageRecords)record.task?.cancel();pdfDocument?.destroy();if(signatureUrl)URL.revokeObjectURL(signatureUrl);});
if(owner&&channel)owner.postMessage({type:'docuflow:approval-ready',channel},origin);else message.textContent='Buka dokumen dari menu Persetujuan Dokumen.';
