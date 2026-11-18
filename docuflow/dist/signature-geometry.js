'use strict';
(function(root){
 function place(imageWidth,imageHeight,position,box,rotation=0){
  const percent=position.percent===undefined?100:position.percent,angle=((rotation%360)+360)%360;
  if(![imageWidth,imageHeight,box.width,box.height].every(value=>Number.isFinite(value)&&value>0)||![box.x,box.y,position.x,position.y].every(Number.isFinite)||![0,90,180,270].includes(angle)||!Number.isInteger(percent)||percent<10||percent>300)throw Error('Ukuran atau posisi tanda tangan tidak valid. Gunakan ukuran 10–300%.');
  const edge=Math.min(box.width,box.height),base=Math.min(120/imageWidth,50/imageHeight,edge*.4/imageWidth,edge*.2/imageHeight),swapped=angle%180!==0;
  const scale=Math.min(base*percent/100,(swapped?box.height:box.width)/imageWidth,(swapped?box.width:box.height)/imageHeight),width=imageWidth*scale,height=imageHeight*scale;
  const halfX=(swapped?height:width)/2,halfY=(swapped?width:height)/2;
  return {width,height,percent,angle,x:Math.max(box.x+halfX,Math.min(box.x+box.width-halfX,position.x)),y:Math.max(box.y+halfY,Math.min(box.y+box.height-halfY,position.y))};
 }
 const api={place};if(typeof module==='object'&&module.exports)module.exports=api;else root.PdfSignatureGeometry=api;
})(globalThis);
