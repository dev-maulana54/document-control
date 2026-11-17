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
