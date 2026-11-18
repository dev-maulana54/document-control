const {test}=require('node:test');
const assert=require('node:assert/strict');
const Geometry=require('../dist/signature-geometry.js');
const box={x:20,y:30,width:600,height:800};

test('signature resizing preserves aspect ratio and default stamp dimensions',()=>{
 const normal=Geometry.place(400,100,{x:300,y:400},box,0);
 assert.equal(normal.width,120);assert.equal(normal.height,30);assert.equal(normal.percent,100);
 for(const percent of [10,50,150,300]){
  const stamp=Geometry.place(400,100,{x:300,y:400,percent},box,0);
  assert.equal(stamp.width,normal.width*percent/100);assert.equal(stamp.height,normal.height*percent/100);
 }
});
test('resized signatures stay inside cropped and rotated PDF pages',()=>{
 for(const angle of [0,90,180,270])for(const point of [{x:20,y:30},{x:620,y:830}]){
  const stamp=Geometry.place(400,100,{...point,percent:300},box,angle),swap=angle%180!==0,halfX=(swap?stamp.height:stamp.width)/2,halfY=(swap?stamp.width:stamp.height)/2;
  assert.ok(stamp.x-halfX>=box.x-1e-8&&stamp.x+halfX<=box.x+box.width+1e-8);
  assert.ok(stamp.y-halfY>=box.y-1e-8&&stamp.y+halfY<=box.y+box.height+1e-8);
 }
 const small=Geometry.place(400,100,{x:20,y:10,percent:300},{x:0,y:0,width:40,height:20},0);
 assert.ok(small.width<=40&&small.height<=20);assert.equal(small.width/small.height,4);
});
test('invalid signature dimensions, scale, crop boxes and rotations are rejected',()=>{
 for(const percent of [0,9,301,Infinity,NaN,'50',null])assert.throws(()=>Geometry.place(400,100,{x:300,y:400,percent},box,0));
 for(const [width,height] of [[0,100],[400,0],[-1,100],[NaN,100]])assert.throws(()=>Geometry.place(width,height,{x:300,y:400},box,0));
 assert.throws(()=>Geometry.place(400,100,{x:NaN,y:400},box,0));
 assert.throws(()=>Geometry.place(400,100,{x:300,y:400},box,45));
 assert.throws(()=>Geometry.place(400,100,{x:300,y:400},{...box,width:0},0));
});
