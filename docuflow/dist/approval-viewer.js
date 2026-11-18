'use strict';
const channel=new URLSearchParams(location.hash.slice(1)).get('channel'), owner=window.opener, origin=location.protocol==='file:'?'*':location.origin;
const pages=document.getElementById('approval-pages'), message=document.getElementById('approval-message'), hint=document.getElementById('approval-hint'), select=document.getElementById('signature-select'), confirmButton=document.getElementById('signature-confirm'), dialog=document.getElementById('signature-dialog');
let signatureUrl='',position=null,placing=false,viewports=[];
function say(text){hint.textContent=text;}
window.addEventListener('message',async event=>{
 if(event.source!==owner||event.data?.channel!==channel||(location.protocol!=='file:'&&event.origin!==location.origin))return;
 if(event.data.type==='docuflow:approval-result'){confirmButton.disabled=false;if(event.data.error){say(event.data.error);if(!document.querySelector('.approval-page'))message.textContent=event.data.error;return;}say('Persetujuan berhasil disimpan.');select.hidden=true;confirmButton.hidden=true;return;}
 if(event.data.type!=='docuflow:approval-data')return;
 try {
  document.getElementById('approval-title').textContent=event.data.title||'Persetujuan dokumen';document.getElementById('approval-code').textContent=event.data.code||'';
  const bytes=new Uint8Array(event.data.pdf), signature=event.data.signature;
  if(signature instanceof ArrayBuffer && signature.byteLength){signatureUrl=URL.createObjectURL(new Blob([signature],{type:'image/png'}));document.getElementById('saved-signature').src=signatureUrl;}
  pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker-3.11.174.min.js';
  const pdf=await pdfjsLib.getDocument({data:bytes,isEvalSupported:false}).promise;
  if(pdf.numPages>100)throw Error('PDF memiliki terlalu banyak halaman untuk ditampilkan.');
  pages.replaceChildren();
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),base=page.getViewport({scale:1}),scale=Math.min(1.5,Math.max(0.5,(window.innerWidth-50)/base.width)),viewport=page.getViewport({scale});viewports[i-1]=viewport;
   const box=document.createElement('div'),canvas=document.createElement('canvas');box.className='approval-page';box.dataset.page=String(i);canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);box.append(canvas);pages.append(box);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   box.addEventListener('click',event=>{if(!placing)return;const rect=canvas.getBoundingClientRect(), px=(event.clientX-rect.left)*viewport.width/rect.width,py=(event.clientY-rect.top)*viewport.height/rect.height,[x,y]=viewport.convertToPdfPoint(px,py);position={page:i,x,y};document.querySelector('.signature-mark')?.remove();const mark=document.createElement('img');mark.className='signature-mark';mark.src=signatureUrl;mark.alt='';mark.style.left=(event.clientX-rect.left)/rect.width*100+'%';mark.style.top=(event.clientY-rect.top)/rect.height*100+'%';mark.style.width=Math.min(120*scale,rect.width*.4)+'px';mark.style.height=Math.min(50*scale,rect.height*.2)+'px';box.append(mark);confirmButton.hidden=false;say('Periksa posisi tanda tangan, lalu pilih Setujui dan simpan.');});
  }
  select.hidden=false;message.remove();
 }catch(error){message.textContent=error.message||'PDF tidak dapat dibuka.';}
});
select.addEventListener('click',()=>{if(!signatureUrl){say('Unggah tanda tangan melalui profil Anda, lalu buka kembali PDF ini.');return;}dialog.showModal();});document.getElementById('signature-cancel').addEventListener('click',()=>dialog.close());document.getElementById('signature-use').addEventListener('click',()=>{dialog.close();placing=true;document.querySelectorAll('.approval-page').forEach(el=>el.classList.add('placing'));say('Klik posisi tanda tangan pada halaman PDF.');});
confirmButton.addEventListener('click',()=>{if(!position)return;confirmButton.disabled=true;say('Menyimpan persetujuan…');owner.postMessage({type:'docuflow:approval-confirm',channel,position},origin);});
document.getElementById('approval-close').addEventListener('click',()=>window.close());
window.addEventListener('pagehide',()=>{if(signatureUrl)URL.revokeObjectURL(signatureUrl);});
if(owner&&channel)owner.postMessage({type:'docuflow:approval-ready',channel},origin);else message.textContent='Buka dokumen dari menu Persetujuan Dokumen.';
