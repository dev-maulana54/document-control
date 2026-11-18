"""One million logical cells, two-axis scrolling, and functional spreadsheet ribbon."""
import importlib.util,zipfile,xml.etree.ElementTree as ET,time,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('approval',Path(__file__).with_name('browser-approval.py'));approval=importlib.util.module_from_spec(spec);spec.loader.exec_module(approval)
fixture=approval.fixture
from playwright.sync_api import sync_playwright,expect

def go(page,address):
    page.get_by_role('textbox',name='Rentang sel',exact=True).fill(address);page.get_by_role('button',name='Pilih rentang',exact=True).click()

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1918,'height':1100},accept_downloads=True,reduced_motion='reduce');context.set_default_timeout(12000)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda msg:errors.append(msg.text) if msg.type in ['warning','error'] else None)
        page.goto(approval.BASE);fixture.login(page,'admin');fixture.upload(page,fixture.WORKBOOK);fixture.logout(page);fixture.login(page,'user')
        page.goto(approval.BASE+'#create');page.locator('#doc-title').fill('IK Ribbon 1000');fixture.choose(page,'Jenis dokumen','Instruksi Kerja');fixture.choose(page,'Kategori dokumen','LEGACY')
        started=time.perf_counter();fixture.save_and_open(page);expect(page.locator('.workbook-sheet')).to_have_attribute('aria-rowcount','1001');expect(page.locator('.workbook-sheet')).to_have_attribute('aria-colcount','1001');expect(page.locator('.workbook-cell[data-cell="C8"]')).to_be_visible();mount_ms=round((time.perf_counter()-started)*1000)
        count=page.locator('.workbook-cell').count();assert count<3500,count
        request_id=page.url.split('#workbook-')[1];go(page,'ALL1000');expect(page.locator('.workbook-cell[data-cell="ALL1000"]')).to_be_visible();page.locator('.workbook-cell[data-cell="ALL1000"]').fill('Sel terakhir 1000 × 1000')
        page.get_by_role('button',name='Tebal',exact=True).click();assert page.locator('.workbook-cell[data-cell="ALL1000"]').evaluate('(el)=>getComputedStyle(el).fontWeight')=='700'
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();go(page,'ALL1000');expect(page.locator('.workbook-cell[data-cell="ALL1000"]')).to_have_value('Sel terakhir 1000 × 1000')
        # Clipped merge across both virtual axes remains attached to its original master.
        page.get_by_role('tab',name='Catatan',exact=True).click();go(page,'C1:AB150');page.get_by_role('button',name='Gabungkan sel',exact=True).click()
        go(page,'X120');expect(page.get_by_role('textbox',name='Rentang sel',exact=True)).to_have_value('C1');assert page.locator('.workbook-cell[data-cell="C1"]').count()==1
        page.locator('.workbook-cell[data-cell="C1"]').fill('Merged across two axes')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.get_by_role('tab',name='Instruksi Kerja',exact=True).click();go(page,'J4');page.locator('.workbook-cell[data-cell="J4"]').fill('Nilai Copy')
        page.get_by_role('button',name='Copy',exact=True).click();go(page,'K4');page.get_by_role('button',name='Paste',exact=True).click();expect(page.locator('.workbook-cell[data-cell="K4"]')).to_have_value('Nilai Copy')
        page.get_by_role('button',name='Cut',exact=True).click();expect(page.locator('.workbook-cell[data-cell="K4"]')).to_have_value('');go(page,'L4');page.get_by_role('button',name='Paste',exact=True).click();expect(page.locator('.workbook-cell[data-cell="L4"]')).to_have_value('Nilai Copy')
        # Explicit external paste remains available even after an internal Copy/Cut.
        go(page,'M4');page.get_by_role('button',name='Paste dari Excel',exact=True).click();page.get_by_label('Tempel dari Excel dengan Ctrl+V',exact=True).fill('Dari Excel\t0012');page.get_by_role('button',name='Tempel Data',exact=True).click();expect(page.locator('.workbook-cell[data-cell="M4"]')).to_have_value('Dari Excel');expect(page.locator('.workbook-cell[data-cell="N4"]')).to_have_value('0012');go(page,'L4')
        page.get_by_role('button',name='Hapus isi sel',exact=True).click();expect(page.locator('.workbook-cell[data-cell="L4"]')).to_have_value('');page.get_by_role('button',name='Undo',exact=True).click();expect(page.locator('.workbook-cell[data-cell="L4"]')).to_have_value('Nilai Copy')
        go(page,'J4:K5');page.get_by_role('button',name='Tinggi baris',exact=True).click();page.get_by_label('Tinggi baris (pt)',exact=True).fill('36');page.get_by_role('button',name='Terapkan Ukuran',exact=True).click()
        page.get_by_role('button',name='Lebar kolom',exact=True).click();page.get_by_label('Lebar kolom (karakter)',exact=True).fill('20');page.get_by_role('button',name='Terapkan Ukuran',exact=True).click()
        page.get_by_role('button',name='Cari isi sel',exact=True).click();page.get_by_label('Cari isi pada sheet ini',exact=True).fill('Sel terakhir');page.get_by_role('button',name='Temukan',exact=True).click();expect(page.get_by_role('textbox',name='Rentang sel',exact=True)).to_have_value('ALL1000')
        page.get_by_role('tab',name='View',exact=True).click();page.get_by_label('Gridlines',exact=True).uncheck();expect(page.locator('#workbook-grid')).to_have_class('workbook-grid hide-gridlines');page.get_by_label('Formula Bar',exact=True).uncheck();expect(page.locator('.workbook-formula-bar')).to_be_hidden();page.get_by_label('Formula Bar',exact=True).check();page.get_by_label('Gridlines',exact=True).check();page.get_by_role('tab',name='Home',exact=True).click()
        go(page,'A1');page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        with page.expect_download() as download:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(download.value.path()) as z:
            ns=fixture.NS;first=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));second=ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
            assert first.find(f'{{{ns}}}dimension').attrib['ref']=='A1:ALL1000';assert ''.join(first.find(f'.//{{{ns}}}c[@r="ALL1000"]').itertext())=='Sel terakhir 1000 × 1000'
            assert first.find(f'.//{{{ns}}}row[@r="4"]').attrib['ht']=='36';assert any(col.attrib['min']=='10' and abs(float(col.attrib['width'])-20.7109375)<0.000001 for col in first.findall(f'.//{{{ns}}}col'))
            assert ''.join(second.find(f'.//{{{ns}}}c[@r="C1"]').itertext())=='Merged across two axes';assert second.find(f'.//{{{ns}}}mergeCell').attrib['ref']=='C1:AB150'
            assert first.find(f'.//{{{ns}}}c[@r="A12"]/{{{ns}}}f').text=='SUM(A8:A9)';assert z.read('xl/media/image1.png')==fixture.parts['xl/media/image1.png']
        # Tab traverses logical columns past the mounted window, and wraps at 1000.
        go(page,'Z20');page.locator('.workbook-cell[data-cell="Z20"]').focus();page.keyboard.press('Tab');expect(page.locator('.workbook-cell[data-cell="AA20"]')).to_be_focused()
        go(page,'ALL20');page.locator('.workbook-cell[data-cell="ALL20"]').focus();page.keyboard.press('Tab');expect(page.locator('.workbook-cell[data-cell="A21"]')).to_be_focused()
        page.keyboard.press('Shift+Tab');expect(page.locator('.workbook-cell[data-cell="ALL20"]')).to_be_focused();go(page,'A1')
        page.screenshot(path=str(fixture.ARTIFACTS/'ribbon-desktop.png'),full_page=True)
        for width in [320,768,1440,1918]:
            page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(150);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            if width==320:page.screenshot(path=str(fixture.ARTIFACTS/'ribbon-mobile.png'),full_page=True)
        assert not errors,errors
        print(json.dumps({'result':'PASS 1000x1000 last cell/reload/export, two-axis merge, clipboard/cut/clear/undo, dimensions/find/view, original formula and image, four widths','mount_ms':mount_ms,'mounted_cells':count,'logical_cells':1000000,'artifacts':str(fixture.ARTIFACTS)}),flush=True);browser.close()

if __name__=='__main__':run()
