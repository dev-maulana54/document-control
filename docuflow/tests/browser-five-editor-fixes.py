import importlib.util,base64,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'));ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux)
f=ux.fixture
from playwright.sync_api import sync_playwright,expect
BASE='http://127.0.0.1:4173/'

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);f.login(page,'admin');page.add_script_tag(url=BASE+'vendor/xlsx-0.20.3.min.js')
  # Real XLS/XLSB bytes pass through the converter, not renamed XLSX fixtures.
  for ext in ['xls','xlsb']:
   result=page.evaluate('''async ext=>{const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet([['Preserved',42]]),'Sheet');const raw=XLSX.write(b,{bookType:ext,type:'array'});const bytes=await importWorkbook(new File([raw],'test.'+ext));const book=await WorkbookEngine.open(bytes);return WorkbookEngine.value(book,book.sheets[0].cells.get('B1'));}''',ext);assert result=='42',(ext,result)
  # XLTX/XLSM preserve workbook drawing parts and convert to regular XLSX.
  data=base64.b64encode(f.WORKBOOK).decode()
  for ext in ['xltx','xlsm','xltm']:
   result=page.evaluate('''async ({data,ext})=>{const raw=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const bytes=await importWorkbook(new File([raw],'test.'+ext));const book=await WorkbookEngine.open(bytes);return book.sheets[0].images.length;}''',{'data':data,'ext':ext});assert result==1
  macro=f.pack({'[Content_Types].xml':f.parts['[Content_Types].xml'].replace('</Types>','<Override PartName="/xl/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>'),'xl/vbaProject.bin':b'VBA payload must be removed'})
  result=page.evaluate('''async data=>{const raw=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const out=await importWorkbook(new File([raw],'macro.xlsm'));const b=await WorkbookEngine.open(out);return !!b.zip.file('xl/vbaProject.bin');}''',base64.b64encode(macro).decode());assert result is False
  xlm=f.pack({'[Content_Types].xml':f.parts['[Content_Types].xml'].replace('</Types>','<Override PartName="/xl/macrosheets/sheet1.xml" ContentType="application/vnd.ms-excel.macrosheet+xml"/></Types>')})
  rejected=page.evaluate('''async data=>{try{await importWorkbook(new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],'xlm.xlsm'));return false;}catch(e){return e.message.includes('Excel 4.0');}}''',base64.b64encode(xlm).decode());assert rejected
  wide=f.parts['xl/worksheets/sheet1.xml'].replace('A1:H15','A1:AMP2001').replace('</sheetData>','<row r="2001"><c r="AMP2001" t="inlineStr"><is><t>Beyond 1000</t></is></c></row></sheetData>')
  f.upload(page,f.pack({'xl/worksheets/sheet1.xml':wide}));page.goto(BASE+'#create');page.locator('#doc-title').fill('Five editor fixes');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page)
  ux.go(page,'AMP2001');expect(page.locator('.workbook-cell[data-cell="AMP2001"]')).to_have_value('Beyond 1000');ux.go(page,'J4')
  # Browser-supported raster types normalize to PNG for interoperable Excel output.
  for ext in ['webp','gif','bmp']:
   result=page.evaluate('''async ext=>{let bytes;if(ext==='gif')bytes=Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),c=>c.charCodeAt(0));else if(ext==='bmp'){bytes=new Uint8Array(58);const v=new DataView(bytes.buffer);bytes.set([66,77]);v.setUint32(2,58,true);v.setUint32(10,54,true);v.setUint32(14,40,true);v.setInt32(18,1,true);v.setInt32(22,1,true);v.setUint16(26,1,true);v.setUint16(28,24,true);}else{const c=document.createElement('canvas');c.width=c.height=2;const b=await new Promise(r=>c.toBlob(r,'image/webp'));bytes=await b.arrayBuffer();}const image=await WorkbookMedia.readImage(new File([bytes],'test.'+ext));return [image.mime,image.naturalWidth];}''',ext);assert result[0]=='image/png' and result[1]>0
  page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan gambar',exact=True).click();page.locator('#workbook-picture-file').set_input_files({'name':'new.png','mimeType':'image/png','buffer':ux.SMALL_PNG});page.get_by_role('button',name='Masukkan Gambar',exact=True).click();node=page.locator('.workbook-image.is-movable').last;expect(page.locator('.workbook-image.is-movable')).to_have_count(2)
  before=node.bounding_box();page.mouse.move(before['x']+10,before['y']+10);page.mouse.down();page.mouse.move(before['x']+175,before['y']+90,steps=8);page.mouse.up();after=node.bounding_box();assert after['x']>before['x']+100 and after['y']>before['y']+50
  page.keyboard.press('Control+z');assert abs(node.bounding_box()['x']-before['x'])<2;page.keyboard.press('Control+y');assert node.bounding_box()['x']>before['x']+100
  page.get_by_role('tab',name='Home',exact=True).click();ux.go(page,'J4:K5');page.keyboard.press('Control+c');outline=page.locator('.workbook-copy-outline');expect(outline).to_be_visible();assert outline.evaluate("el=>getComputedStyle(el).animationName")=='workbook-copy-march';ux.go(page,'M4');expect(outline).to_be_visible();page.keyboard.press('Escape');expect(outline).to_have_count(0)
  page.keyboard.press('Control+s');expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();expect(page.locator('.workbook-image.is-movable')).to_have_count(2)
  node=page.locator('.workbook-image.is-movable').last;start=node.bounding_box();page.mouse.move(start['x']+10,start['y']+10);page.mouse.down();page.mouse.move(start['x']+60,start['y']+40,steps=5);page.mouse.up();assert node.bounding_box()['x']>start['x']+40;page.keyboard.press('Control+z');assert abs(node.bounding_box()['x']-start['x'])<2;page.keyboard.press('Control+y');page.keyboard.press('Control+s');expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
  with page.expect_download() as dl:page.get_by_role('button',name='Unduh Excel',exact=True).click()
  with zipfile.ZipFile(dl.value.path()) as z:
   root=ET.fromstring(z.read('xl/drawings/drawing1.xml'));ns='{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}';anchors=root.findall(ns+'oneCellAnchor');assert len(anchors)==1;assert int(anchors[0].find(ns+'from/'+ns+'col').text)>0
  page.goto(page.url+'?view');expect(page.locator('.workbook-image.is-movable')).to_have_count(0);assert not errors,errors
  print('PASS XLS/XLSB/XLTX/XLSM/XLTM import, >1000 rows/columns, GIF/BMP/WebP, picture drag+Undo/Redo+save/export, animated Copy/Escape and readonly guard',flush=True);browser.close()

if __name__=='__main__':run()
