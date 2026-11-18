'use strict';
async function importWorkbook(file) {
  if(!/\.(xlsx|xltx|xlsm|xltm|xls|xlt|xlsb)$/i.test(file.name))throw new Error('Pilih XLSX, XLTX, XLSM, XLTM, XLS, XLT atau XLSB.');
  if(!file.size||file.size>XlsxPackage.limits.file)throw new Error('Ukuran template maksimal 5 MB.');
  const input=await file.arrayBuffer(),ext=file.name.split('.').pop().toLowerCase();
  if(ext==='xlsx')return input;
  async function checkedZip(){XlsxPackage.inspectArchive(input,true);const zip=await JSZip.loadAsync(input);let total=0;for(const entry of Object.values(zip.files)){if(entry.dir)continue;total+=(await WorkbookEngine.readPart(zip,entry.name)).length;if(total>XlsxPackage.limits.expanded)throw new Error('Ukuran terurai template terlalu besar.');}return zip;}

  if(['xltx','xlsm','xltm'].includes(ext)) {
    const zip=await checkedZip(),writer=new XMLSerializer();
    const ct=await WorkbookEngine.readXml(zip,'[Content_Types].xml',true);if([...ct.documentElement.children].some(n=>/macrosheet/i.test(n.getAttribute('ContentType'))))throw new Error('Macro Excel 4.0 tidak didukung. Simpan sebagai XLSX tanpa macro di Excel.');
    for(const path of Object.keys(zip.files)) {
      if(/vbaProject|vbaData/i.test(path)){zip.remove(path);continue;}
      if(path.endsWith('.rels')) {
        const xml=await WorkbookEngine.readXml(zip,path,true);
        WorkbookEngine.elements(xml,'Relationship').filter(n=>/vbaProject|vbaData/i.test(n.getAttribute('Type'))).forEach(n=>n.remove());zip.file(path,writer.serializeToString(xml));
      }
    }
    const types=await WorkbookEngine.readXml(zip,'[Content_Types].xml',true);
    for(const node of [...types.documentElement.children]) {
      if(/vbaProject|vbaData/i.test(node.getAttribute('ContentType')))node.remove();
      else if(node.getAttribute('PartName')==='/xl/workbook.xml')node.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');
    }
    zip.file('[Content_Types].xml',writer.serializeToString(types));return zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
  }
  if(ext==='xlsb')await checkedZip();
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('workbook-import-worker.js',document.currentScript?.src||document.querySelector('script[src$="workbook-import.js"]').src));
    const timer=setTimeout(()=>{worker.terminate();reject(new Error('Konversi terlalu lama. Simpan file sebagai XLSX di Excel.'));},20000);
    const finish=()=>{clearTimeout(timer);worker.terminate();};
    worker.onmessage=async event=>{
      finish();if(event.data.error){reject(new Error(event.data.error));return;}
      try {
        const zip=await JSZip.loadAsync(event.data.bytes),xml=await WorkbookEngine.readXml(zip,'[Content_Types].xml',true);
        if(!Object.keys(zip.files).some(path=>path.endsWith('.bin')))WorkbookEngine.elements(xml,'Default').filter(n=>n.getAttribute('Extension')==='bin').forEach(n=>n.remove());
        zip.file('[Content_Types].xml',new XMLSerializer().serializeToString(xml));resolve(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}));
      }catch{reject(new Error('Hasil konversi Excel tidak valid.'));}
    };
    worker.onerror=()=>{finish();reject(new Error('Konversi Excel gagal. Simpan file sebagai XLSX.'));};worker.postMessage(input,[input]);
  });
}
