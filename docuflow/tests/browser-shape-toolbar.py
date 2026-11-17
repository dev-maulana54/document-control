import importlib.util, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('shapes',Path(__file__).with_name('browser-shapes.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
f=s.f

def set_color(page,label,value):
    page.get_by_role('button',name=label,exact=True).click()
    page.locator('#workbook-color-menu').get_by_role('button',name='More Colors...',exact=True).click()
    page.get_by_label('Kode warna HEX',exact=True).fill(value)
    page.get_by_role('button',name='Terapkan Warna',exact=True).click()


def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1600,'height':1050},accept_downloads=True);page.set_default_timeout(5000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(s.BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto(s.BASE+'#create');page.locator('#doc-title').fill('Shape toolbar');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for();s.ux.go(page,'J4')
  before=page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[0].xml)')
  s.insert(page,'Rectangle');shape=page.locator('.workbook-shape');expect(shape).to_be_visible()
  assert shape.locator('rect').evaluate('(n)=>getComputedStyle(n).stroke')!='none'
  shape.dblclick();editor=page.get_by_role('textbox',name='Teks bentuk',exact=True);expect(editor).to_be_visible();expect(page.locator('#modal')).not_to_be_visible()
  editor.fill('Proses <QA> & Produksi\nTahap 1');page.get_by_role('tab',name='Home',exact=True).click();expect(shape).to_contain_text('Tahap 1')
  page.get_by_role('spinbutton',name='Ukuran',exact=True).fill('24');page.keyboard.press('Enter');page.get_by_role('button',name='Tebal',exact=True).click();page.get_by_role('button',name='Miring',exact=True).click();page.get_by_role('button',name='Garis bawah',exact=True).click()
  font=page.get_by_role('combobox',name='Font',exact=True);font.fill('Times New Roman');page.keyboard.press('Enter')
  set_color(page,'Warna teks','#cc0000');set_color(page,'Warna sel','#ffdd44');page.get_by_role('button',name='Rata kiri',exact=True).click()
  label=shape.locator('.workbook-shape-label');assert label.evaluate('(n)=>getComputedStyle(n).fontSize')=='32px';assert label.evaluate('(n)=>getComputedStyle(n).fontWeight')=='700';assert 'Times New Roman' in label.evaluate('(n)=>getComputedStyle(n).fontFamily');assert label.evaluate('(n)=>getComputedStyle(n).color')=='rgb(204, 0, 0)'
  assert page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[0].xml)')==before,'Shape formatting must not change cells'
  expect(shape).to_be_focused();expect(page.get_by_role('button',name='Gabungkan sel',exact=True)).to_be_disabled()
  shape.dblclick();editor.fill('Cancelled');page.keyboard.press('Escape');expect(shape).to_contain_text('Proses <QA> & Produksi')
  shape.dblclick();editor.fill('Safe <img src=x onerror=alert(1)>\nShape');page.keyboard.press('Control+Enter');expect(shape).to_contain_text('Safe <img');expect(shape.locator('img')).to_have_count(0)
  page.keyboard.press('Control+z');expect(shape).to_contain_text('Proses <QA> & Produksi');page.keyboard.press('Control+y');expect(shape).to_contain_text('Safe <img')
  page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();expect(shape).to_contain_text('Safe <img');shape.click();page.get_by_role('tab',name='Home',exact=True).click();expect(page.get_by_role('spinbutton',name='Ukuran',exact=True)).to_have_value('24')
  data=s.exported(page);sp=ET.fromstring(data['xl/drawings/drawing1.xml']).find('.//'+s.XDR+'sp');r=sp.find('.//'+s.A+'rPr');assert r.attrib['sz']=='2400' and r.attrib['b']=='1' and r.attrib['i']=='1' and r.attrib['u']=='sng';assert r.find(s.A+'latin').attrib['typeface']=='Times New Roman';assert sp.find(s.XDR+'spPr/'+s.A+'solidFill/'+s.A+'srgbClr').attrib['val']=='ffdd44'
  s.ux.go(page,'M9');s.insert(page,'Text Box');box=page.locator('.workbook-shape').last;box.dblclick();editor.fill('Text box');page.keyboard.press('Control+Enter');page.get_by_role('tab',name='Home',exact=True).click();page.get_by_role('spinbutton',name='Ukuran',exact=True).fill('6');page.keyboard.press('Enter');set_color(page,'Warna teks','#006600');assert box.locator('g').get_attribute('stroke')=='none';assert box.locator('.workbook-shape-label').evaluate('(n)=>getComputedStyle(n).fontSize')=='8px'
  box.dblclick();editor.fill('Click away commits');cell=page.locator('.workbook-cell[data-cell="J12"]');cell.click();expect(box).to_contain_text('Click away commits');page.get_by_role('button',name='Tebal',exact=True).click();assert cell.evaluate('(n)=>getComputedStyle(n).fontWeight')=='700';assert box.locator('.workbook-shape-label').evaluate('(n)=>getComputedStyle(n).fontSize')=='8px'
  shape=page.locator('.workbook-shape').first;shape.dblclick();editor.fill('Change selected object');box.click();expect(shape).to_contain_text('Change selected object');expect(box).to_be_focused();page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.screenshot(path=str(f.ARTIFACTS/'shape-toolbar.png'));page.goto(page.url+'?view');expect(page.locator('.workbook-shape.is-movable')).to_have_count(0);expect(page.locator('.workbook-shape-editor')).to_have_count(0);assert not errors,errors
  print('PASS visible shape outlines, inline double-click text, shared toolbar shape/text box formatting, cell isolation, Escape/Undo/Redo, reload/native XLSX, readonly; screenshot:',f.ARTIFACTS/'shape-toolbar.png',flush=True);browser.close()

if __name__=='__main__':run()
