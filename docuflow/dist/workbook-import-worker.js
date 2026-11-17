'use strict';
importScripts('vendor/xlsx-0.20.3.min.js');
self.onmessage=event=>{
  try {
    const book=XLSX.read(event.data,{type:'array',cellStyles:true,cellFormula:true,bookVBA:false});
    if(!book.SheetNames.length||Object.values(book.Sheets).some(s=>s['!type']==='macro')||book.Workbook?.Names?.some(n=>/auto_open|auto_close/i.test(n.Name)))throw new Error();
    const bytes=XLSX.write(book,{type:'array',bookType:'xlsx',compression:true,cellStyles:true});self.postMessage({bytes},[bytes]);
  }catch{self.postMessage({error:'File Excel tidak dapat dikonversi. Periksa file atau simpan sebagai XLSX.'});}
};
