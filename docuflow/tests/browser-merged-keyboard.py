"""Merged-cell keyboard selection matches mouse selection and keeps navigation intact."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
BASE='http://127.0.0.1:4173/'

def select_address(page,address):
    page.get_by_role('textbox',name='Rentang sel',exact=True).fill(address)
    page.get_by_role('button',name='Pilih rentang',exact=True).click()

def selected_merge(page,focused=True):
    assert page.evaluate("activeWorkbook.selected==='G3' && activeWorkbook.range==='G3:AD3'")
    assert page.locator('.workbook-selection-outline').evaluate("el=>{const {x}=activeWorkbook.gridLayout;return Math.abs(parseFloat(el.style.width)-(x[30]-x[6]))<.1}")
    if focused:expect(page.locator('.workbook-cell[data-cell="G3"]')).to_be_focused()

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1600,'height':950});errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  sheet=f.parts['xl/worksheets/sheet1.xml'].replace('<mergeCells count="9">','<mergeCells count="10"><mergeCell ref="G3:AD3"/>').replace('<row r="3" ht="22" customHeight="1"/>','<row r="3" ht="22" customHeight="1"><c r="G3" t="inlineStr"><is><t>Judul gabungan</t></is></c></row>')
  page.goto(BASE);f.login(page,'admin');f.upload(page,f.pack({'xl/worksheets/sheet1.xml':sheet}));page.goto(BASE+'#create');page.locator('#doc-title').fill('Uji navigasi merge');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page)
  page.get_by_role('spinbutton',name='Zoom lembar kerja (%)').fill('55');page.get_by_role('spinbutton',name='Zoom lembar kerja (%)').press('Enter')
  select_address(page,'F3');page.locator('.workbook-cell[data-cell="F3"]').focus();page.keyboard.press('ArrowRight');selected_merge(page)
  expect(page.get_by_role('button',name='Gabungkan sel',exact=True)).to_have_attribute('aria-pressed','true')
  page.keyboard.press('ArrowRight');expect(page.locator('.workbook-cell[data-cell="AE3"]')).to_be_focused();page.keyboard.press('ArrowLeft');selected_merge(page)
  page.keyboard.press('ArrowDown');expect(page.locator('.workbook-cell[data-cell="C4"]')).to_be_focused()
  select_address(page,'P3');selected_merge(page,False);page.locator('.workbook-cell[data-cell="G3"]').focus()
  page.keyboard.press('Tab');expect(page.locator('.workbook-cell[data-cell="AE3"]')).to_be_focused();page.keyboard.press('Shift+Tab');selected_merge(page)
  page.locator('.workbook-cell[data-cell="G3"]').click();selected_merge(page)
  merge_button=page.get_by_role('button',name='Gabungkan sel',exact=True)
  expect(merge_button).to_have_attribute('aria-pressed','true');merge_button.click()
  expect(merge_button).to_have_attribute('aria-pressed','false');expect(page.locator('.workbook-cell[data-cell="H3"]')).to_be_visible();expect(page.locator('.workbook-cell[data-cell="G3"]')).to_have_value('Judul gabungan')
  page.keyboard.press('Control+z');selected_merge(page);expect(merge_button).to_have_attribute('aria-pressed','true')
  page.get_by_role('button',name='Lepas gabungan',exact=True).click();expect(page.locator('.workbook-cell[data-cell="H3"]')).to_be_visible();expect(merge_button).to_have_attribute('aria-pressed','false');page.keyboard.press('Control+z');selected_merge(page)
  select_address(page,'C7');page.locator('.workbook-cell[data-cell="C7"]').focus();page.keyboard.press('ArrowDown')
  assert page.evaluate("activeWorkbook.selected==='C8' && activeWorkbook.range==='C8:F10'")
  assert page.locator('.workbook-selection-outline').evaluate("el=>{const {y}=activeWorkbook.gridLayout;return Math.abs(parseFloat(el.style.height)-(y[10]-y[7]))<.1}")
  page.keyboard.press('ArrowDown');expect(page.locator('.workbook-cell[data-cell="C11"]')).to_be_focused();page.keyboard.press('ArrowUp');assert page.evaluate("activeWorkbook.range==='C8:F10'")
  select_address(page,'G3');merge_button.click();page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload()
  expect(page.locator('.workbook-cell[data-cell="H3"]')).to_be_visible();expect(page.locator('.workbook-cell[data-cell="G3"]')).to_have_value('Judul gabungan')
  assert not errors,errors;browser.close()
 print('PASS merged cell selection via arrows, Go To, Tab and mouse')
if __name__=='__main__':run()
