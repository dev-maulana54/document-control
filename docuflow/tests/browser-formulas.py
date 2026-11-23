"""Formula entry, live dependencies, undo, save/reload and native XLSX formulas."""
import importlib.util, zipfile, xml.etree.ElementTree as ET, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        context=browser.new_context(viewport={'width':1365,'height':768},accept_downloads=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://127.0.0.1:4173/')
        fixture.login(page,'admin');fixture.upload(page,fixture.WORKBOOK);fixture.logout(page);fixture.login(page,'user')
        page.goto('http://127.0.0.1:4173/#create');page.locator('#doc-title').fill('Rumus dasar')
        fixture.choose(page,'Jenis dokumen','Instruksi Kerja');fixture.choose(page,'Kategori dokumen','LEGACY');fixture.save_and_open(page)
        page.get_by_role('tab',name='Catatan',exact=True).click()
        def go(ref):
            page.get_by_role('textbox',name='Rentang sel',exact=True).fill(ref)
            page.get_by_role('button',name='Pilih rentang',exact=True).click()
        def enter(ref,value):
            go(ref);page.locator('#workbook-cell-value').fill(value);page.locator('#workbook-cell-value').press('Enter')
        def cell(ref):return page.locator(f'.workbook-cell[data-cell="{ref}"]')
        enter('B1','10');enter('B2','20');go('B3');page.get_by_role('button',name='Jumlah otomatis',exact=True).click()
        expect(cell('B3')).to_have_value('30');expect(page.locator('#workbook-cell-value')).to_have_value('=SUM(B1:B2)')
        enter('C1','=AVERAGE(B1:B2)');expect(cell('C1')).to_have_value('15')
        enter('B1','40');expect(cell('B3')).to_have_value('60');expect(cell('C1')).to_have_value('30')
        page.get_by_role('button',name='Undo',exact=True).click();expect(cell('B3')).to_have_value('30')
        page.get_by_role('button',name='Redo',exact=True).click();expect(cell('B3')).to_have_value('60')
        enter('C2','=ROUND(C1/7;2)');expect(cell('C2')).to_have_value('4.29')
        enter('C3','=IF(B3>50,"Ya","Tidak")');expect(cell('C3')).to_have_value('Ya')
        enter('D1','=D2+1');enter('D2','=D1+1');expect(cell('D1')).to_have_value('#REF!')
        enter('E1','=1/0');expect(cell('E1')).to_have_value('#DIV/0!')
        enter('E2','=IFERROR(E1,0)');expect(cell('E2')).to_have_value('0')
        enter('E3',"='Instruksi Kerja'!A8+1");expect(cell('E3')).to_have_value('2')
        go('F1');page.get_by_label('Sisipkan rumus',exact=True).select_option('SUM')
        expect(page.locator('#workbook-cell-value')).to_have_value('=SUM()')
        page.locator('#workbook-cell-value').fill('=SUM(B1:B2)');cell('B2').click()
        expect(cell('F1')).to_have_value('60')
        enter('F2','=A100');enter('F3','=COUNT(F2)');expect(cell('F3')).to_have_value('1')
        go('B3');cell('B3').press('F2');expect(cell('B3')).to_have_value('=SUM(B1:B2)')
        cell('B3').fill('=MAX(B1:B2)');cell('B3').press('Enter');expect(cell('B3')).to_have_value('40')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload();page.get_by_role('tab',name='Catatan',exact=True).click();go('B3')
        expect(cell('B3')).to_have_value('40');expect(page.locator('#workbook-cell-value')).to_have_value('=MAX(B1:B2)')
        with page.expect_download() as download:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        path=fixture.ARTIFACTS/'formulas.xlsx';download.value.save_as(path)
        with zipfile.ZipFile(path) as archive:
            xml=ET.fromstring(archive.read('xl/worksheets/sheet2.xml'))
            ns={'s':fixture.NS};c=xml.find('.//s:c[@r="B3"]',ns)
            assert c.find('s:f',ns).text=='MAX(B1:B2)'
            assert c.find('s:v',ns).text=='40'
            assert xml.find('.//s:c[@r="C2"]/s:f',ns).text=='ROUND(C1/7,2)'
        page.screenshot(path=str(fixture.ARTIFACTS/'formulas.png'))
        assert not errors,errors
        print(json.dumps({'result':'PASS formulas, dependencies, AutoSum, editing, undo/redo, cycles, cross-sheet, save/reload, XLSX export','artifacts':str(fixture.ARTIFACTS)}),flush=True)
        browser.close()

if __name__=='__main__':run()
