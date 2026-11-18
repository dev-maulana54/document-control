"""Cell context actions and native frozen panes, through the real draft editor."""
import argparse
import importlib.util
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'))
ux=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ux)
f=ux.fixture
N='{'+f.NS+'}'


def menu(page,reference):
    page.locator('.workbook-cell[data-cell="'+reference+'"]').click(button='right')
    expect(page.locator('#workbook-context-menu')).to_be_visible()
    return page.locator('#workbook-context-menu')


def choose_action(page,name):
    page.locator('#workbook-context-menu').get_by_role('menuitem',name=re.compile('^'+re.escape(name)+r'(?:\.{3})?$')).click()


def freeze(page,mode):
    page.get_by_role('tab',name='View',exact=True).click()
    page.get_by_role('button',name='Freeze Panes',exact=True).click()
    page.locator('#workbook-freeze-menu [data-freeze="'+mode+'"]').click()


def assert_frozen(page,rows,columns):
    assert page.evaluate('activeWorkbook.view.freeze')=={'rows':rows,'columns':columns}


def settle(page):
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')


def pane_xml(page,index=0):
    with page.expect_download() as download:
        page.get_by_role('button',name='Unduh Excel',exact=True).click()
    with zipfile.ZipFile(download.value.path()) as z:
        sheet=ET.fromstring(z.read('xl/worksheets/sheet'+str(index+1)+'.xml'))
        pane=sheet.find(N+'sheetViews/'+N+'sheetView/'+N+'pane')
        return pane.attrib if pane is not None else None


def run(base):
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        page=browser.new_page(viewport={'width':1600,'height':1100},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(base)
        f.login(page,'admin')
        f.upload(page,f.WORKBOOK)
        page.goto(base+'#create')
        page.locator('#doc-title').fill('Cell context and frozen panes')
        f.choose(page,'Jenis dokumen','Instruksi Kerja')
        f.choose(page,'Kategori dokumen','LEGACY')
        f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()

        # Right click inside a selected block must preserve that block for all commands.
        ux.go(page,'J4:L6')
        context=menu(page,'K5')
        for action in ['Copy','Clear Contents','Format Cells','Insert','Delete']:
            expect(context.get_by_role('menuitem',name=re.compile('^'+re.escape(action)+r'(?:\.{3})?$'))).to_be_enabled()
        expect(page.get_by_role('textbox',name='Rentang sel',exact=True)).to_have_value('J4:L6')
        choose_action(page,'Copy')
        expect(page.locator('.workbook-copy-outline')).to_have_count(1)
        page.keyboard.press('Escape')
        ux.go(page,'J4')
        page.locator('.workbook-cell[data-cell="J4"]').fill('Context clear value')
        menu(page,'J4')
        choose_action(page,'Clear Contents')
        expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('')
        page.keyboard.press('Control+z')
        expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('Context clear value')
        menu(page,'J4')
        choose_action(page,'Format Cells')
        page.get_by_role('tab',name='Font',exact=True).click()
        page.locator('#context-font-size').fill('18')
        page.get_by_role('button',name='Terapkan Format',exact=True).click()
        assert page.locator('.workbook-cell[data-cell="J4"]').evaluate('(cell)=>getComputedStyle(cell).fontSize')=='24px'
        for action in ['Insert','Delete']:
            menu(page,'J4')
            choose_action(page,action)
            expect(page.locator('#modal')).to_be_visible()
            expect(page.locator('#modal')).to_contain_text(re.compile('baris|row',re.I))
            expect(page.locator('#modal')).to_contain_text(re.compile('kolom|column',re.I))
            page.get_by_role('button',name='Batal',exact=True).click()

        menu(page,'J4')
        choose_action(page,'Hyperlink')
        page.locator('#context-link-url').fill('javascript:alert(1)')
        page.get_by_role('button',name='Simpan Tautan',exact=True).click()
        expect(page.locator('#context-link-error')).not_to_have_text('')
        page.locator('#context-link-url').fill('https://example.com/document')
        page.get_by_role('button',name='Simpan Tautan',exact=True).click()
        with page.expect_download() as link_download:
            page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(link_download.value.path()) as z:
            sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            link=sheet.find('.//'+N+'hyperlink[@ref="J4"]')
            rel_id=link.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            rels=ET.fromstring(z.read('xl/worksheets/_rels/sheet1.xml.rels'))
            assert any(r.attrib.get('Id')==rel_id and r.attrib.get('Target')=='https://example.com/document' for r in rels)
        page.keyboard.press('Control+z')
        assert not page.evaluate('WorkbookEngine.elements(activeWorkbook.book.sheets[0].xml,"hyperlink").some(n=>n.getAttribute("ref")==="J4")')
        with page.expect_download() as cleared_link:
            page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(cleared_link.value.path()) as z:
            assert b'https://example.com/document' not in z.read('xl/worksheets/_rels/sheet1.xml.rels')

        # Freeze at C4: the three rows above and two columns on the left stay visible.
        ux.go(page,'C4')
        freeze(page,'panes')
        assert_frozen(page,3,2)
        page.keyboard.press('Control+z')
        assert_frozen(page,0,0)
        page.keyboard.press('Control+y')
        assert_frozen(page,3,2)
        native=pane_xml(page)
        assert native['state']=='frozen' and native['xSplit']=='2' and native['ySplit']=='3'
        assert native['topLeftCell']=='C4'

        for zoom in [55,175]:
            page.locator('#workbook-zoom-percent').fill(str(zoom))
            page.locator('#workbook-zoom-percent').press('Enter')
            page.locator('#workbook-grid').evaluate('(grid)=>{grid.scrollTop=0;grid.scrollLeft=0;}')
            settle(page)
            before=page.locator('.workbook-cell[data-cell="A1"]').bounding_box()
            page.locator('#workbook-grid').evaluate('(grid)=>{grid.scrollTop=4200;grid.scrollLeft=2100;}')
            settle(page)
            frozen=page.locator('.workbook-cell[data-cell="A1"]')
            expect(frozen).to_have_count(1)
            after=frozen.bounding_box()
            assert after and abs(before['x']-after['x'])<1.5 and abs(before['y']-after['y'])<1.5,(zoom,before,after)
            frozen.click()
            assert page.evaluate('activeWorkbook.selected')=='A1','Frozen cell hit testing selected a flowing cell'
            # Click a visible flowing cell to verify scrolling does not shift pointer coordinates.
            target=page.evaluate('''()=>{const grid=document.getElementById('workbook-grid').getBoundingClientRect(),cells=[...document.querySelectorAll('#workbook-grid .workbook-cell')];for(const cell of cells){const r=cell.getBoundingClientRect(),p=XlsxPackage.position(cell.dataset.cell);if(p.row>3&&p.column>2&&r.x>grid.x+350&&r.y>grid.y+180&&r.right<grid.right-20&&r.bottom<grid.bottom-20)return {ref:cell.dataset.cell,x:r.x+r.width/2,y:r.y+r.height/2};}return null;}''')
            assert target,'No scrollable cell was rendered beside frozen panes'
            page.mouse.click(target['x'],target['y'])
            assert page.evaluate('activeWorkbook.selected')==target['ref'],(zoom,target,page.evaluate('activeWorkbook.selected'))

        # Pane configurations are independent between worksheets and persist in native XLSX.
        page.get_by_role('tab',name='Catatan',exact=True).click()
        assert_frozen(page,0,0)
        freeze(page,'column')
        assert_frozen(page,0,1)
        page.get_by_role('tab',name='Instruksi Kerja',exact=True).click()
        assert_frozen(page,3,2)
        page.keyboard.press('Control+s')
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload()
        page.locator('.workbook-cell').first.wait_for()
        assert_frozen(page,3,2)
        page.get_by_role('tab',name='Catatan',exact=True).click()
        assert_frozen(page,0,1)
        native=pane_xml(page,index=1)
        assert native['state']=='frozen' and native['xSplit']=='1' and 'ySplit' not in native
        freeze(page,'row')
        assert_frozen(page,1,0)
        freeze(page,'none')
        assert_frozen(page,0,0)
        assert pane_xml(page,index=1) is None
        page.keyboard.press('Control+s')
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')

        # Read mode may copy, but context commands cannot mutate the original workbook.
        page.goto(page.url+'?view')
        page.locator('.workbook-cell').first.wait_for()
        context=menu(page,'A1')
        expect(context.get_by_role('menuitem',name='Copy',exact=True)).to_be_enabled()
        for action in ['Cut','Clear Contents','Format Cells','Insert','Delete']:
            expect(context.get_by_role('menuitem',name=re.compile('^'+re.escape(action)+r'(?:\.{3})?$'))).to_be_disabled()
        page.keyboard.press('Escape')
        page.get_by_role('button',name='Freeze Panes',exact=True).click()
        page.locator('#workbook-freeze-menu [data-freeze="row"]').click()
        assert_frozen(page,1,0)
        assert page.evaluate('activeWorkbook.dirty') is False
        assert pane_xml(page,index=0) is not None
        assert not errors,errors
        browser.close()
        print('PASS cell context range/actions/readonly, frozen panes two-axis scrolling/hit tests at 55% and 175%, Undo/Redo, per-sheet save/reload/native export')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:4173/')
    run(parser.parse_args().base)
