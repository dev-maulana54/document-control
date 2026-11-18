"""Worksheet row and border geometry stays aligned at fractional zoom."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'))
ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux);f=ux.fixture
BASE='http://127.0.0.1:4173/'


def fixture():
 merges='<mergeCell ref="E50:Q52"/>'+''.join(f'<mergeCell ref="R{row}:T{row}"/>' for row in range(14,65))
 sheet=f'''<worksheet xmlns="{f.NS}"><dimension ref="A1:CV120"/><sheetFormatPr defaultRowHeight="23.25"/><cols><col min="1" max="100" width="3"/></cols><sheetData><row r="50"><c r="E50" s="2" t="inlineStr"><is><t>Footer text on two lines</t></is></c></row></sheetData><mergeCells count="52">{merges}</mergeCells></worksheet>'''
 return f.pack({'xl/worksheets/sheet1.xml':sheet})


def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1365,'height':768});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);f.login(page,'admin');f.upload(page,fixture());page.goto(BASE+'#create');page.locator('#doc-title').fill('Fractional zoom geometry');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
  for zoom in [25,55,75,100,125,175,200]:
   page.evaluate('''z=>{setWorkbookZoom(z);const state=activeWorkbook,g=state.gridLayout.grid;g.scrollTop=state.gridLayout.y[20];g.scrollLeft=0;state.renderViewport();}''',zoom)
   page.wait_for_timeout(100)
   metrics=page.evaluate('''()=>{const s=activeWorkbook,l=s.gridLayout,z=s.view.zoom/100,rows=[...document.querySelectorAll('.workbook-sheet tbody tr[aria-rowindex]')];return rows.slice(0,35).map(row=>{const n=Number(row.getAttribute('aria-rowindex'))-1;return {row:n,actual:row.getBoundingClientRect().height,expected:(l.y[n]-l.y[n-1])*z};});}''')
   assert all(abs(r['actual']-r['expected'])<.35 for r in metrics),(zoom,metrics[:5])
   ux.go(page,'E50:Q52');cell=page.locator('.workbook-cell[data-cell="E50"]');expect(cell).to_be_visible()
   alignment=page.evaluate('''()=>{const a=document.querySelector('.workbook-cell[data-cell="E50"]').closest('td').getBoundingClientRect(),b=document.querySelector('.workbook-selection-outline').getBoundingClientRect();return {top:Math.abs(a.top-b.top),bottom:Math.abs(a.bottom-b.bottom),left:Math.abs(a.left-b.left),right:Math.abs(a.right-b.right)};}''')
   assert max(alignment.values())<1.5,(zoom,alignment)
  assert not errors,errors;browser.close();print('PASS fractional zoom row geometry and merged selection at25/55/75/100/125/175/200%')


if __name__=='__main__':run()
