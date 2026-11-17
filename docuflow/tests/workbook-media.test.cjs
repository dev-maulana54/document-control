const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context=vm.createContext({WorkbookEngine:{},DataView});
vm.runInContext(fs.readFileSync(require.resolve('../dist/workbook-media.js'),'utf8'),context);
const inspect=vm.runInContext('WorkbookMedia.inspectImage',context);
function png(width,height) {
 const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10],0);bytes.set([73,72,68,82],12);const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);return bytes;
}
test('image dimensions are bounded before decoding PNG or JPEG',()=>{
 assert.equal(inspect(png(100,200)).width,100);
 for(const [width,height] of [[0,20],[100000,100000],[4096,4096]])assert.throws(()=>inspect(png(width,height)));
 const jpeg=new Uint8Array([255,216,255,192,0,9,8,0,100,0,200,1,0]);
 assert.equal(inspect(jpeg).height,100);assert.equal(inspect(jpeg).mime,'image/jpeg');
 jpeg[7]=127;assert.throws(()=>inspect(jpeg));
 assert.throws(()=>inspect(new Uint8Array([1,2,3])));
});
