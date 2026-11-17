import importlib.util, xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
spec=importlib.util.spec_from_file_location('shapes',Path(__file__).with_name('browser-shapes.py'));s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
f=s.f

def palette(page,property='background'):
 page.get_by_role('button',name='Warna sel' if property=='background' else 'Warna teks',exact=True).click()
 return page.locator('#workbook-color-menu')

def custom(page,property,color):
 palette(page,property).get_by_role('button',name='More Colors...',exact=True).click();page.get_by_label('Kode warna HEX',exact=True).fill(color);page.get_by_role('button',name='Terapkan Warna',exact=True).click()

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1500,'height':1000},accept_downloads=True);page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(s.BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto(s.BASE+'#create');page.locator('#doc-title').fill('Color palette');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for();s.ux.go(page,'J4:K5')
  menu=palette(page);expect(menu.get_by_role('heading',name='Theme Colors',exact=True)).to_be_visible();expect(menu.get_by_role('heading',name='Standard Colors',exact=True)).to_be_visible();expect(menu.locator('[data-color-value]')).to_have_count(70);expect(menu.locator('input[type=color]')).to_have_count(0)
  page.screenshot(path=str(f.ARTIFACTS/'color-palette.png'));menu.locator('[data-color-value="#ffff00"]').last.click()
  for ref in ['J4','K4','J5','K5']:assert page.locator(f'.workbook-cell[data-cell="{ref}"]').evaluate('(n)=>getComputedStyle(n.parentElement).backgroundColor')=='rgb(255, 255, 0)'
  palette(page).get_by_role('button',name='No Fill',exact=True).click();assert page.evaluate('workbookCurrentStyle().background')=='';page.keyboard.press('Control+z');assert page.evaluate('workbookCurrentStyle().background').lower()=='#ffff00';page.keyboard.press('Control+y');assert page.evaluate('workbookCurrentStyle().background')==''
  menu=palette(page,'color');expect(menu.get_by_role('button',name='No Fill',exact=True)).to_have_count(0);menu.get_by_role('button',name='More Colors...',exact=True).click();page.get_by_label('Kode warna HEX',exact=True).fill('#123456');page.get_by_role('button',name='Batal',exact=True).click();assert page.evaluate('workbookCurrentStyle().color').lower()!='#123456'
  palette(page,'color').get_by_role('button',name='More Colors...',exact=True).click();page.get_by_label('Kode warna HEX',exact=True).fill('invalid');page.get_by_role('button',name='Terapkan Warna',exact=True).click();expect(page.locator('#workbook-color-error')).to_contain_text('kode warna');page.get_by_role('button',name='Batal',exact=True).click();custom(page,'color','#123456');assert page.locator('.workbook-cell[data-cell="J4"]').evaluate('(n)=>getComputedStyle(n).color')=='rgb(18, 52, 86)'
  menu=palette(page);page.keyboard.press('ArrowRight');page.keyboard.press('Escape');expect(menu).to_have_count(0);expect(page.get_by_role('button',name='Warna sel',exact=True)).to_be_focused()
  for width in [320,768,1500]:
   page.set_viewport_size({'width':width,'height':1000});page.locator('[data-color-menu="background"]').scroll_into_view_if_needed();menu=palette(page);box=menu.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1;assert box['y']>=0 and box['y']+box['height']<=1001;page.keyboard.press('Escape')
  page.set_viewport_size({'width':1500,'height':1000});s.ux.go(page,'L8');s.insert(page,'Rectangle');shape=page.locator('.workbook-shape');page.get_by_role('tab',name='Home',exact=True).click();custom(page,'background','#88aacc');assert shape.locator('g').get_attribute('fill')=='#88aacc';palette(page).get_by_role('button',name='No Fill',exact=True).click();assert shape.locator('g').get_attribute('fill')=='none';custom(page,'color','#990000');assert shape.locator('.workbook-shape-label').evaluate('(n)=>getComputedStyle(n).color')=='rgb(153, 0, 0)'
  page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();shape.click();page.get_by_role('tab',name='Home',exact=True).click();assert page.evaluate('workbookShapeStyle().background')=='none'
  data=s.exported(page);sp=ET.fromstring(data['xl/drawings/drawing1.xml']).find('.//'+s.XDR+'sp');assert sp.find(s.XDR+'spPr/'+s.A+'noFill') is not None
  ns='{'+f.NS+'}';sheet=ET.fromstring(data['xl/worksheets/sheet1.xml']);styles=ET.fromstring(data['xl/styles.xml']);cell=next(c for c in sheet.iter(ns+'c') if c.attrib['r']=='J4');xf=styles.find(ns+'cellXfs')[int(cell.attrib['s'])];assert styles.find(ns+'fills')[int(xf.attrib['fillId'])].find(ns+'patternFill').attrib['patternType']=='none'
  page.goto(page.url+'?view');expect(page.locator('[data-color-menu]')).to_have_count(0);assert not errors,errors
  print('PASS theme/standard palettes, More Colors custom/cancel, No Fill cells/shapes, range and target isolation, keyboard/viewport, Undo/Redo, reload/native XLSX and readonly; screenshot:',f.ARTIFACTS/'color-palette.png',flush=True);browser.close()
if __name__=='__main__':run()
