import importlib.util,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'));ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux)
f=ux.fixture;BASE='http://127.0.0.1:4173/';XDR='{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}';A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
def insert(page,label):
 page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan bentuk',exact=True).click();page.get_by_role('button',name=label,exact=True).first.click()
def exported(page):
 with page.expect_download() as dl:page.get_by_role('button',name='Unduh Excel',exact=True).click()
 with zipfile.ZipFile(dl.value.path()) as z:return {name:z.read(name) for name in z.namelist()}
def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto(BASE+'#create');page.locator('#doc-title').fill('Native Shapes');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
  ux.go(page,'J4');page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan bentuk',exact=True).click()
  for group in ['Basic Shapes','Lines','Arrows','Callouts','Symbols','Flowchart','Stars and Banners']:expect(page.get_by_role('heading',name=group,exact=True)).to_be_visible()
  for width in [320,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#modal').bounding_box()['x']>=0
  page.locator('#shape-search').fill('Decision');expect(page.locator('.shape-choice:visible')).to_have_count(1);page.locator('#shape-search').fill('');page.screenshot(path=str(f.ARTIFACTS/'shapes-gallery.png'),full_page=True);page.get_by_role('button',name='Rectangle',exact=True).first.click();shape=page.locator('.workbook-shape');expect(shape).to_have_count(1);expect(page.locator('[data-picture-resize]')).to_have_count(8)
  page.get_by_role('button',name='Edit Bentuk',exact=True).click();page.locator('#shape-text').fill('Proses <QA> & Produksi\nTahap 1');page.locator('#shape-fill').fill('#ffeeaa');page.locator('#shape-fill').dispatch_event('change');page.locator('#shape-stroke').fill('#993300');page.locator('#shape-font-size').fill('14');page.get_by_role('button',name='Terapkan Bentuk',exact=True).click();expect(shape).to_contain_text('Proses <QA> & Produksi');assert page.locator('.workbook-shape script').count()==0
  before=shape.bounding_box();page.mouse.move(before['x']+15,before['y']+15);page.mouse.down();page.mouse.move(before['x']+85,before['y']+55,steps=8);page.mouse.up();assert shape.bounding_box()['x']>before['x']+60
  edge=page.locator('[data-picture-resize="se"]').bounding_box();page.mouse.move(edge['x']+5,edge['y']+5);page.mouse.down();page.mouse.move(edge['x']+65,edge['y']+35,steps=6);page.mouse.up();assert shape.bounding_box()['width']>before['width']+30
  page.keyboard.press('Control+z');assert abs(shape.bounding_box()['width']-before['width'])<2;page.keyboard.press('Control+y');assert shape.bounding_box()['width']>before['width']+30
  data=exported(page);root=ET.fromstring(data['xl/drawings/drawing1.xml']);assert len(root.findall('.//'+XDR+'sp'))==1;sp=root.find('.//'+XDR+'sp');assert sp.find(XDR+'spPr/'+A+'prstGeom').attrib['prst']=='rect';assert sp.find(XDR+'spPr/'+A+'solidFill/'+A+'srgbClr').attrib['val']=='ffeeaa';assert 'Proses <QA> & Produksi' in ''.join(sp.itertext());assert len(root.findall('.//'+XDR+'pic'))==1
  again=exported(page);assert len(ET.fromstring(again['xl/drawings/drawing1.xml']).findall('.//'+XDR+'sp'))==1
  page.keyboard.press('Control+s');expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();expect(page.locator('.workbook-shape')).to_contain_text('Proses <QA> & Produksi');shape=page.locator('.workbook-shape');shape.dblclick();page.get_by_role('textbox',name='Teks bentuk',exact=True).fill('Edited after reload');page.keyboard.press('Control+Enter');expect(shape).to_contain_text('Edited after reload')
  shape.click();page.get_by_role('button',name='Hapus',exact=True).click();expect(shape).to_have_count(0);assert len(ET.fromstring(exported(page)['xl/drawings/drawing1.xml']).findall('.//'+XDR+'sp'))==0;page.keyboard.press('Control+z');expect(shape).to_have_count(1);assert len(ET.fromstring(exported(page)['xl/drawings/drawing1.xml']).findall('.//'+XDR+'sp'))==1
  page.get_by_role('tab',name='Catatan',exact=True).click();ux.go(page,'D4');insert(page,'Decision');expect(page.locator('.workbook-shape')).to_have_count(1);assert len([path for path,content in exported(page).items() if path.startswith('xl/drawings/') and path.endswith('.xml') and b'<xdr:sp>' in content])==2
  page.keyboard.press('Control+z');expect(page.locator('.workbook-shape')).to_have_count(0);data=exported(page);assert not any(b'flowChartDecision' in content for path,content in data.items() if path.startswith('xl/drawings/'));page.keyboard.press('Control+y');expect(page.locator('.workbook-shape')).to_have_count(1)
  for label in ['Line Arrow','Cloud Callout','Star 5']:
   insert(page,label)
  expect(page.locator('.workbook-shape')).to_have_count(4);page.keyboard.press('Control+s');expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();page.get_by_role('tab',name='Catatan',exact=True).click();expect(page.locator('.workbook-shape')).to_have_count(4);page.goto(page.url+'?view');expect(page.locator('.workbook-shape')).to_have_count(1);expect(page.locator('.workbook-shape.is-movable')).to_have_count(0);expect(page.locator('[data-shape-action]')).to_have_count(0);assert not errors,errors
  print('PASS grouped/searchable Shapes gallery, native shape+image/drawing preservation, text/colors, drag/resize, Undo/Redo, repeated export, reload/edit/delete/undo, new drawing, multiple presets and readonly; screenshot:',f.ARTIFACTS/'shapes-gallery.png',flush=True);browser.close()
if __name__=='__main__':run()
