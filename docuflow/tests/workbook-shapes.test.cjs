const {test}=require('node:test');const assert=require('node:assert/strict');
const Shapes=require('../dist/workbook-shapes.js');
test('gallery provides unique usable presets in all requested groups',()=>{
 assert.ok(Shapes.items.length>=50);assert.equal(new Set(Shapes.items.map(x=>x.id)).size,Shapes.items.length);
 for(const group of ['Basic Shapes','Lines','Arrows','Callouts','Symbols','Flowchart','Stars and Banners'])assert.ok(Shapes.items.some(x=>x.group===group));
 for(const item of Shapes.items){assert.ok(/^[a-zA-Z][a-zA-Z0-9]+$/.test(item.preset));assert.ok(Shapes.svg(item.id).includes('<svg'));assert.ok(!Shapes.svg(item.id).includes('script'));}
 assert.throws(()=>Shapes.svg('unknown'));
});
test('shape properties bound text/geometry/style and reject injection payloads',()=>{
 const shape={id:'rect',text:'<script>literal text</script>',fill:'#ffffff',stroke:'#123456',textColor:'#000000',lineWidth:2,fontSize:12};
 assert.doesNotThrow(()=>Shapes.validate(shape));
 for(const patch of [{id:'unknown'},{fill:'url(https://example.test)'},{stroke:'red;display:none'},{lineWidth:0},{fontSize:410},{fontName:'bad\u0000'},{fontName:'<script>'},{text:'x'.repeat(1001)},{text:'bad\u0000'}])assert.throws(()=>Shapes.validate({...shape,...patch}));
 for(const fontSize of [1,6,24,200,409])assert.doesNotThrow(()=>Shapes.validate({...shape,fontSize,fontName:'Times New Roman'}));
});

function primitive(markup, tag){
 const match=markup.match(new RegExp('<'+tag+'\\s+([^>]+)'));
 assert.ok(match,tag+' must use a native vector primitive');
 return Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]+)"/g)].map(([,key,value])=>[key,Number(value)]));
}

test('resized ovals fit their selection bounds with an even outline',()=>{
 for(const [width,height] of [[260,70],[70,260],[160,90],[8,8]]){
  const markup=Shapes.svg('ellipse',{width,height,lineWidth:2}),oval=primitive(markup,'ellipse');
  assert.ok(markup.includes(`viewBox="0 0 ${width} ${height}"`));
  assert.equal(oval.cx,width/2);assert.equal(oval.cy,height/2);
  assert.equal(oval.rx,width/2-1);assert.equal(oval.ry,height/2-1);
 }
});

test('rounded corners remain circular as the object becomes wide or tall',()=>{
 for(const id of ['roundRect','flowChartAlternateProcess','flowChartTerminator']){
  for(const [width,height] of [[260,70],[70,260]]){
   const rect=primitive(Shapes.svg(id,{width,height,lineWidth:2}),'rect');
   assert.equal(rect.x,1);assert.equal(rect.y,1);
   assert.equal(rect.width,width-2);assert.equal(rect.height,height-2);
   assert.equal(rect.rx,rect.ry,'Both radii must share worksheet pixel units');
   assert.ok(rect.rx>0&&rect.rx<=Math.min(rect.width,rect.height)/2);
   if(id==='flowChartTerminator')assert.equal(rect.rx,Math.min(rect.width,rect.height)/2);
  }
 }
});
