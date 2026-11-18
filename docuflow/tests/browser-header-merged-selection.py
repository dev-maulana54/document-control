"""Header selection stays on its own axis when the worksheet has merged cells."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'))
ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux)
f=ux.fixture

def selection(page):
    return page.evaluate('''()=>{const a=workbookSelectionArea();return [a.first.column,a.last.column,a.first.row,a.last.row]}''')

def header_drag(page,axis,start,end):
    a=page.locator(f'th[data-{axis}="{start}"]').bounding_box();b=page.locator(f'th[data-{axis}="{end}"]').bounding_box()
    page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down();page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=8);page.mouse.up()

def run():
    sheet=f.parts['xl/worksheets/sheet2.xml'].replace('</sheetData>','</sheetData><mergeCells count="2"><mergeCell ref="A1:AW1"/><mergeCell ref="A3:A10"/></mergeCells>')
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(12000)
        page.goto('http://127.0.0.1:4173/');f.login(page,'admin');f.upload(page,f.pack({'xl/worksheets/sheet2.xml':sheet}));page.goto('http://127.0.0.1:4173/#create');page.locator('#doc-title').fill('Header selection');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.get_by_role('tab',name='Catatan',exact=True).click()
        page.get_by_role('spinbutton',name='Zoom lembar kerja (%)',exact=True).fill('55');page.get_by_role('spinbutton',name='Zoom lembar kerja (%)',exact=True).press('Enter')
        for n in [1,16,49]:
            ux.go(page,('A' if n==1 else 'P' if n==16 else 'AW')+'20');page.locator(f'th[data-column="{n}"]').click();assert selection(page)==[n,n,1,1000],selection(page)
            assert page.locator('th[data-column].is-range-header').count()==1
        ux.go(page,'C20');header_drag(page,'column',3,6);assert selection(page)==[3,6,1,1000],selection(page)
        page.locator('th[data-column="5"]').click(button='right');assert page.evaluate('[workbookHeaderContext.start,workbookHeaderContext.end]')==[3,6];page.keyboard.press('Escape')
        page.locator('th[data-column="16"]').click();page.locator('th[data-column="20"]').click(modifiers=['Shift']);assert selection(page)==[16,20,1,1000],selection(page)
        page.locator('th[data-column="16"]').click();page.locator('th[data-column="16"]').click(button='right');assert page.evaluate('[workbookHeaderContext.start,workbookHeaderContext.end]')==[16,16]
        before=page.evaluate('''()=>[15,17].map(n=>activeWorkbook.gridLayout.x[n]-activeWorkbook.gridLayout.x[n-1])''');page.get_by_role('menuitem',name='Column Width...',exact=True).click();page.locator('#workbook-dimension').fill('25');page.get_by_role('button',name='Terapkan Ukuran',exact=True).click();assert page.evaluate('''()=>[15,17].map(n=>activeWorkbook.gridLayout.x[n]-activeWorkbook.gridLayout.x[n-1])''')==before;assert page.evaluate('activeWorkbook.gridLayout.x[16]-activeWorkbook.gridLayout.x[15]')==180
        page.locator('th[data-row="5"]').click();assert selection(page)==[1,1000,5,5],selection(page)
        header_drag(page,'row',5,7);assert selection(page)==[1,1000,5,7],selection(page)
        ux.go(page,'A1');page.locator('.workbook-cell[data-cell="A1"]').click(position={'x':100,'y':8});assert selection(page)==[1,49,1,1],selection(page)
        browser.close()
    print('PASS merged-cell column/row headers, drag, context menu and cell selection')

if __name__=='__main__':run()
