"""Template uploads accept 5 MiB and reject larger files without replacing the template."""
import importlib.util, io, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('browser-workbook.py'))
f = importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
LIMIT = 5 * 1024 * 1024

def workbook_with_padding(size):
    stream = io.BytesIO(f.WORKBOOK)
    with zipfile.ZipFile(stream, 'a') as archive:
        archive.writestr('customXml/padding.bin', bytes(size), compress_type=zipfile.ZIP_STORED)
    return stream.getvalue()

def run():
    overhead = len(workbook_with_padding(0))
    workbook = workbook_with_padding(LIMIT - overhead)
    assert len(workbook) == LIMIT
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium')
        page = browser.new_page(viewport={'width': 1365, 'height': 800})
        page.set_default_timeout(15000)
        page.goto('http://127.0.0.1:4173/'); f.login(page, 'admin')
        f.upload(page, workbook, name='template-5mb.xlsx')
        expect(page.get_by_text('template-5mb.xlsx', exact=True)).to_be_visible()
        expect(page.get_by_text('maksimal 5 MB.', exact=False)).to_be_visible()
        f.upload(page, workbook + b'\x00', name='terlalu-besar.xlsx', valid=False)
        expect(page.locator('#template-error')).to_have_text('Ukuran template maksimal 5 MB.')
        page.get_by_role('button', name='Batal', exact=True).click()
        expect(page.get_by_text('template-5mb.xlsx', exact=True)).to_be_visible()
        page.goto('http://127.0.0.1:4173/#create'); page.locator('#doc-title').fill('Template 5 MB')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja'); f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page); expect(page.locator('.workbook-cell').first).to_be_visible()
        browser.close()
    print('PASS 5 MiB template upload, oversize rejection, preserved template and workbook opening')

if __name__ == '__main__': run()
