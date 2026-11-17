import importlib.util,zipfile,xml.etree.ElementTree as ET,base64
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'));ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux)
f=ux.fixture;BASE='http://127.0.0.1:4173/';N='{'+f.NS+'}';X='{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}'
def size(page,axis,n,value):
 page.locator('th[data-'+axis+'="'+str(n)+'"]').click(button='right');page.get_by_role('menuitem',name='Column Width...' if axis=='column' else 'Row Height...',exact=True).click();page.locator('#workbook-dimension').fill(str(value));assert page.locator('#workbook-dimension').evaluate('(el)=>el.checkValidity()'),'Small size rejected by form';page.get_by_role('button',name='Terapkan Ukuran').click();expect(page.locator('#modal')).not_to_be_visible()
def aligned(page,ref):
 return page.evaluate('''ref=>{const a=document.querySelector('.workbook-cell[data-cell="'+ref+'"]').closest('td').getBoundingClientRect(),b=document.querySelector('.workbook-selection-outline').getBoundingClientRect();return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));}''',ref)
def drag(page,node,dx,dy):
 r=node.bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2;page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=8);page.mouse.up()
def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto(BASE+'#create');page.locator('#doc-title').fill('Small sizes and original picture');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
  # Native defaults must define a legacy picture extent when xfrm/ext is absent.
  drawing=ET.fromstring(f.parts['xl/drawings/drawing1.xml']);anchor=drawing.find(X+'twoCellAnchor')
  for marker in [anchor.find(X+'from'),anchor.find(X+'to')]:
   marker.find(X+'colOff').text='0';marker.find(X+'rowOff').text='0'
  anchor.find(X+'to/'+X+'col').text='1';anchor.find(X+'to/'+X+'row').text='1'
  sheet=f'<worksheet xmlns="{f.NS}" xmlns:r="{f.REL}"><sheetFormatPr defaultRowHeight="15" defaultColWidth="10"/><sheetData/><drawing r:id="rId1"/></worksheet>'
  raw=f.pack({'xl/worksheets/sheet1.xml':sheet,'xl/drawings/drawing1.xml':ET.tostring(drawing)})
  assert page.evaluate('''async data=>{const b=await WorkbookEngine.open(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer),i=b.sheets[0].images[0];if(i.width!==70||i.height!==20)throw Error('Native default dimensions lost');WorkbookFormat.resize(b,0,'A1','column',25);const bytes=await WorkbookEngine.serialize(b),again=await WorkbookEngine.open(bytes),j=again.sheets[0].images[0];return j.width===70&&j.height===20;}''',base64.b64encode(raw).decode())
  image=page.locator('.workbook-image.is-movable').first;original=image.bounding_box();size(page,'column',1,25);assert abs(image.bounding_box()['width']-original['width'])<1,'Fixed-size template picture stretched with columns';assert abs(image.bounding_box()['height']-original['height'])<1
  size(page,'column',10,1);assert page.evaluate('activeWorkbook.gridLayout.x[10]-activeWorkbook.gridLayout.x[9]')<=12;size(page,'column',11,.25);assert page.evaluate('activeWorkbook.gridLayout.x[11]-activeWorkbook.gridLayout.x[10]')<=3
  size(page,'row',12,1);assert page.evaluate('activeWorkbook.gridLayout.y[12]-activeWorkbook.gridLayout.y[11]')<2;ux.go(page,'J12');assert aligned(page,'J12')<1.5,page.evaluate('''()=>({delta:[...document.querySelectorAll("tbody tr")].slice(0,16).map(r=>({row:r.getAttribute("aria-rowindex"),height:r.getBoundingClientRect().height,expected:r.style.height,cell:r.children[1]?.getBoundingClientRect().height})),target:document.querySelector(".workbook-cell[data-cell=J12]").closest("td").getBoundingClientRect().toJSON(),outline:document.querySelector(".workbook-selection-outline").getBoundingClientRect().toJSON()})''')
  size(page,'row',13,.25);ux.go(page,'K13');assert aligned(page,'K13')<1.5,aligned(page,'K13')
  # Direct header drag has the same small sizes as the numeric dialog.
  drag(page,page.locator('[data-resize-column="12"]'),-79,0);assert page.evaluate('activeWorkbook.gridLayout.x[12]-activeWorkbook.gridLayout.x[11]')<15
  drag(page,page.locator('[data-resize-row="14"]'),0,-25);assert page.evaluate('activeWorkbook.gridLayout.y[14]-activeWorkbook.gridLayout.y[13]')<5
  ux.go(page,'I15');assert aligned(page,'I15')<1.5
  size(page,'column',13,0);expect(page.locator('th[data-column="13"]')).to_have_count(0);page.locator('th[data-workbook-corner]').click(button='right');page.get_by_role('menuitem',name='Unhide All Columns',exact=True).click();expect(page.locator('th[data-column="13"]')).to_have_count(1)
  size(page,'row',15,0);expect(page.locator('th[data-row="15"]')).to_have_count(0);page.locator('th[data-workbook-corner]').click(button='right');page.get_by_role('menuitem',name='Unhide All Rows',exact=True).click()
  image.click();before=image.bounding_box();drag(page,page.locator('[data-picture-resize="se"]'),180,20);large=image.bounding_box();assert abs(large['width']/large['height']-before['width']/before['height'])<.03
  drag(page,page.locator('[data-picture-resize="e"]'),60,0);large2=image.bounding_box();assert abs(large2['width']/large2['height']-large['width']/large['height'])<.03,'Picture side resize distorted proportions'
  page.keyboard.press('Control+z');assert abs(image.bounding_box()['width']-large['width'])<1;page.keyboard.press('Control+y');page.keyboard.press('Control+s');expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();expect(image).to_be_visible();assert abs(image.bounding_box()['width']-large2['width'])<1;assert abs(image.bounding_box()['height']-large2['height'])<1
  ux.go(page,'J12');assert aligned(page,'J12')<1.5;page.screenshot(path=str(f.ARTIFACTS/'small-sizes-picture.png'))
  with page.expect_download() as d:page.get_by_role('button',name='Unduh Excel',exact=True).click()
  with zipfile.ZipFile(d.value.path()) as z:
   assert z.read('xl/media/image1.png')==f.parts['xl/media/image1.png'],'Resize must preserve original image bytes';sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));assert float(sheet.find('.//'+N+'row[@r="12"]').attrib['ht'])==1;drawing=ET.fromstring(z.read('xl/drawings/drawing1.xml'));anchor=drawing.find(X+'oneCellAnchor');assert anchor is not None;assert abs(int(anchor.find(X+'ext').attrib['cx'])/9525-large2['width'])<1
  # Consecutive fractional dimensions must not accumulate subpixel positioning error.
  for zoom in [1,1.75]:
   page.evaluate('(zoom)=>document.documentElement.style.zoom=zoom',zoom);page.set_viewport_size({'width':960,'height':700})
   for axis,target in [('row','A500'),('column','SF1')]:
    page.evaluate('''axis=>{const sheet=activeWorkbook.book.sheets[1],NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rows=axis==='row'?Array.from({length:800},(_,i)=>'<row r="'+(i+1)+'" ht="1" customHeight="1"/>').join(''):'';sheet.xml=WorkbookEngine.parseXml('<worksheet xmlns="'+NS+'"><dimension ref="A1:ALL1000"/>'+(axis==='column'?'<cols><col min="1" max="800" width="0.2" customWidth="1"/></cols>':'')+'<sheetData>'+rows+'</sheetData></worksheet>');sheet.cells=new Map();WorkbookEngine.verifySheet(sheet);activeWorkbook.sheetIndex=1;activeWorkbook.selected=activeWorkbook.range='A1';renderWorkbookSheet();}''',axis)
    ux.go(page,target);assert aligned(page,target)<1.5,(zoom,axis,aligned(page,target))
  page.evaluate('document.documentElement.style.zoom=1')
  page.goto(page.url+'?view');expect(page.locator('[data-resize-column]')).to_have_count(0);assert not errors,errors;print('PASS small/fractional/zero sizes, header drag, grid alignment, fixed template images, proportional resize, original PNG bytes, Undo/Redo, save/reload/export and readonly',flush=True);browser.close()
if __name__=='__main__':run()
