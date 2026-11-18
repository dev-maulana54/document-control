"""Drawing coordinates inside worksheet extensions are not worksheet rows or columns."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('browser-workbook.py'))
f = importlib.util.module_from_spec(spec); spec.loader.exec_module(f)

def run():
    sheet = f.parts['xl/worksheets/sheet1.xml'].replace('</worksheet>', '''<extLst><ext uri="coordinate-test"><anchor xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"><from><xdr:col>2</xdr:col><xdr:row>62</xdr:row></from><to><xdr:col>3</xdr:col><xdr:row>64</xdr:row></to></anchor></ext></extLst></worksheet>''')
    workbook = f.pack({'xl/worksheets/sheet1.xml': sheet})
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium'); page = browser.new_page(viewport={'width':1365,'height':800})
        page.goto('http://127.0.0.1:4173/'); f.login(page,'admin'); f.upload(page,workbook)
        page.goto('http://127.0.0.1:4173/#create'); page.locator('#doc-title').fill('Koordinat objek')
        f.choose(page,'Jenis dokumen','Instruksi Kerja'); f.choose(page,'Kategori dokumen','LEGACY'); f.save_and_open(page)
        expect(page.locator('.workbook-cell').first).to_be_visible()
        assert page.evaluate('''()=>{const s=activeWorkbook.book.sheets[0],E=WorkbookEngine;return E.elements(s.xml,'row').every(n=>n.namespaceURI===s.xml.documentElement.namespaceURI)&&E.elements(s.xml,'col').every(n=>n.namespaceURI===s.xml.documentElement.namespaceURI)&&s.xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing','row').length===2;}''')
        browser.close()
    print('PASS worksheet row and column validation ignores embedded drawing coordinates')

if __name__ == '__main__': run()
