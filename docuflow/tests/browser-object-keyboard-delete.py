"""Delete and Backspace act on selected objects, never on active text inputs."""
import importlib.util, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('shapes',Path(__file__).with_name('browser-shapes.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
f=s.f

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(s.BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto(s.BASE+'#create');page.locator('#doc-title').fill('Keyboard object deletion');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
  # Existing template picture: delete, undo, redo and native Excel export.
  original=page.locator('img.workbook-image.is-movable').first;original.click();expect(original).to_be_focused();page.keyboard.press('Delete');expect(original).to_have_count(0)
  root=ET.fromstring(s.exported(page)['xl/drawings/drawing1.xml']);assert len(root.findall('.//'+s.XDR+'pic'))==0
  page.keyboard.press('Control+z');expect(original).to_have_count(1);page.keyboard.press('Control+y');expect(original).to_have_count(0);page.keyboard.press('Control+z');expect(original).to_have_count(1)
  # User-inserted pictures use the same semantics, including Backspace.
  s.ux.go(page,'L12');page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan gambar',exact=True).click();page.get_by_label('File gambar',exact=True).set_input_files({'name':'test.png','mimeType':'image/png','buffer':s.ux.SMALL_PNG});page.get_by_role('button',name='Masukkan Gambar',exact=True).click()
  inserted=page.locator('img.workbook-image.is-movable').last;expect(page.locator('img.workbook-image.is-movable')).to_have_count(2);inserted.click();page.keyboard.press('Backspace');expect(page.locator('img.workbook-image.is-movable')).to_have_count(1);page.keyboard.press('Control+z');expect(page.locator('img.workbook-image.is-movable')).to_have_count(2)
  inserted.click();handle=page.locator('[data-picture-resize="se"]').bounding_box();page.mouse.move(handle['x']+handle['width']/2,handle['y']+handle['height']/2);page.mouse.down();page.mouse.move(handle['x']+35,handle['y']+35,steps=5);page.mouse.up();expect(inserted).to_be_focused();page.keyboard.press('Delete');expect(page.locator('img.workbook-image.is-movable')).to_have_count(1);page.keyboard.press('Control+z');expect(page.locator('img.workbook-image.is-movable')).to_have_count(2)
  # A shape can be deleted from its resize handle; editing text keeps ordinary keys.
  s.ux.go(page,'O12');s.insert(page,'Rectangle');shape=page.locator('.workbook-shape.is-movable');expect(shape).to_have_count(1);shape.dblclick();editor=page.get_by_role('textbox',name='Teks bentuk',exact=True);editor.fill('AB');editor.press('Backspace');expect(editor).to_have_value('A');expect(shape).to_have_count(1);editor.press('Control+Enter')
  shape.click();page.locator('[data-picture-resize="se"]').focus();page.keyboard.press('Delete');expect(shape).to_have_count(0);page.keyboard.press('Control+z');expect(shape).to_have_count(1)
  # Text in the formula bar must not delete the selected object.
  shape.click();field=page.get_by_role('textbox',name='Rentang sel',exact=True);field.fill('J4');field.press('Backspace');expect(shape).to_have_count(1)
  # Removing one shape must not change the identity or position of its neighbor.
  s.ux.go(page,'R15');s.insert(page,'Oval');shapes=page.locator('.workbook-shape.is-movable');expect(shapes).to_have_count(2);other=shapes.last.get_attribute('data-inserted-image');shapes.first.click();page.keyboard.press('Delete');expect(shapes).to_have_count(1);assert shapes.first.get_attribute('data-inserted-image')==other;page.keyboard.press('Control+z');expect(shapes).to_have_count(2)
  page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();expect(page.locator('.workbook-shape.is-movable')).to_have_count(2);expect(page.locator('img.workbook-image.is-movable')).to_have_count(2)
  page.goto(page.url+'?view');expect(page.locator('.workbook-image.is-movable')).to_have_count(0);page.keyboard.press('Delete');expect(page.locator('.workbook-shape')).to_have_count(2);assert not errors,errors;browser.close()
 print('PASS Delete/Backspace on original and inserted images, shapes, undo, export and text/read-only guards')

if __name__=='__main__':run()
