'use strict';

// Metafiles stay in the XLSX unchanged. The SVG is only a browser preview.
function workbookVectorPreview(bytes){
  if(typeof EMFJS==='undefined'||bytes.length<88||bytes.length>4*1024*1024)throw new Error('Metafile tidak dapat ditampilkan.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(view.getUint32(0,true)!==1||view.getUint32(40,true)!==0x464d4520)throw new Error('Header EMF tidak valid.');
  let offset=0,records=0;const bitmaps=[];while(offset+8<=bytes.length){const type=view.getUint32(offset,true),size=view.getUint32(offset+4,true);if(size<8||size%4||offset+size>bytes.length||++records>50000)throw new Error('Isi EMF tidak valid.');if(type===77&&size>=108)bitmaps.push({offset,size});offset+=size;}if(offset!==bytes.length)throw new Error('Ukuran EMF tidak valid.');
  // Office often wraps a full bitmap in one StretchBlt record. EMFJS skips that
  // record, so retain its original DIB pixels instead of returning a blank SVG.
  if(bitmaps.length===1){const {offset:at,size}=bitmaps[0],info=view.getUint32(at+84,true),infoSize=view.getUint32(at+88,true),bits=view.getUint32(at+92,true),bitsSize=view.getUint32(at+96,true);
    if(info<108||infoSize<40||info+infoSize>size||bits<108||bits+bitsSize>size)throw new Error('Bitmap EMF tidak valid.');
    const w=view.getInt32(at+info+4,true),h=Math.abs(view.getInt32(at+info+8,true));if(w<=0||h<=0||w>10000||h>10000||w*h>16000000)throw new Error('Bitmap EMF terlalu besar.');
    if(view.getInt32(at+44,true)===0&&view.getInt32(at+48,true)===0&&Math.abs(view.getInt32(at+100,true))===w&&Math.abs(view.getInt32(at+104,true))===h){const bmp=new Uint8Array(14+infoSize+bitsSize),header=new DataView(bmp.buffer);bmp[0]=66;bmp[1]=77;header.setUint32(2,bmp.length,true);header.setUint32(10,14+infoSize,true);bmp.set(bytes.subarray(at+info,at+info+infoSize),14);bmp.set(bytes.subarray(at+bits,at+bits+bitsSize),14+infoSize);let binary='';for(let n=0;n<bmp.length;n+=32768)binary+=String.fromCharCode(...bmp.subarray(n,n+32768));return 'data:image/bmp;base64,'+btoa(binary);}
  }
  const width=view.getInt32(16,true)-view.getInt32(8,true),height=view.getInt32(20,true)-view.getInt32(12,true);if(width<=0||height<=0||width>100000||height>100000)throw new Error('Dimensi EMF tidak valid.');
  EMFJS.loggingEnabled(false);const renderer=new EMFJS.Renderer(bytes.slice().buffer),svg=renderer.render({width:width+'px',height:height+'px',wExt:width,hExt:height,xExt:width,yExt:height,mapMode:8});
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
}
