import importlib.util,re,zipfile,xml.etree.ElementTree as ET,struct,zlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('approval',Path(__file__).with_name('browser-approval.py'));approval=importlib.util.module_from_spec(spec);spec.loader.exec_module(approval)
fixture=approval.fixture
from playwright.sync_api import sync_playwright,expect

def picture_fixture():
    def chunk(name,body):return struct.pack('>I',len(body))+name+body+struct.pack('>I',zlib.crc32(name+body)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\x00'+b'\xff\x44\x22'*2)*2))+chunk(b'IEND',b'')

SMALL_PNG=picture_fixture()

def go(page,address):
    page.get_by_role('textbox',name='Rentang sel',exact=True).fill(address);page.get_by_role('button',name='Pilih rentang',exact=True).click()

def drag(page,start,end):
    a=page.locator(f'.workbook-cell[data-cell="{start}"]').bounding_box();b=page.locator(f'.workbook-cell[data-cell="{end}"]').bounding_box()
    page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down();page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=10);page.mouse.up()

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1600,'height':1100},accept_downloads=True,reduced_motion='reduce');context.set_default_timeout(12000)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda msg:errors.append(msg.text) if msg.type in ['error','warning'] else None)
        page.goto(approval.BASE);fixture.login(page,'admin');fixture.upload(page,fixture.WORKBOOK);fixture.logout(page);fixture.login(page,'user')
        page.goto(approval.BASE+'#create');page.locator('#doc-title').fill('IK UX Baru');fixture.choose(page,'Jenis dokumen','Instruksi Kerja');fixture.choose(page,'Kategori dokumen','LEGACY');page.get_by_role('button',name='Simpan Dokumen',exact=True).click()
        expect(page).to_have_url(re.compile('#requests$'));row=page.get_by_role('row').filter(has_text='IK UX Baru');expect(row.get_by_role('button',name='Edit Excel',exact=True)).to_be_enabled();row.get_by_role('button',name='Edit Excel',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="J4"]')).to_be_visible();request_id=page.url.split('#workbook-')[1]
        expect(page.locator('.sidebar')).to_have_count(0);expect(page.locator('.topbar')).to_have_count(0)
        drag(page,'J4','L6');expect(page.get_by_role('textbox',name='Rentang sel',exact=True)).to_have_value('J4:L6')
        page.get_by_role('button',name='Tebal',exact=True).click();expect(page.locator('.workbook-cell[data-cell="J4"]')).to_be_focused();page.keyboard.type('Langsung mengetik');expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('Langsung mengetik')
        assert page.locator('.workbook-cell[data-cell="L6"]').evaluate('(el)=>getComputedStyle(el).fontWeight')=='700'
        # Selection anchor may leave the virtual DOM; typing falls back to its formula bar.
        go(page,'J4');box=page.locator('.workbook-cell[data-cell="J4"]').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.wheel(0,4500);page.wait_for_timeout(200);grid_box=page.locator('#workbook-grid').bounding_box();page.mouse.move(grid_box['x']+850,grid_box['y']+170);page.mouse.up()
        page.get_by_role('button',name='Tebal',exact=True).click();expect(page.locator('#workbook-cell-value')).to_be_focused();page.keyboard.type('Anchor after scroll');go(page,'J4');expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('Anchor after scroll')
        # Header selection scrolls only on its own axis.
        go(page,'J150');before=page.locator('#workbook-grid').evaluate('(el)=>el.scrollTop');header=page.locator('th[data-column="10"]').bounding_box();page.mouse.move(header['x']+header['width']/2,header['y']+header['height']/2);page.mouse.down();page.wait_for_timeout(200);page.mouse.up();assert abs(page.locator('#workbook-grid').evaluate('(el)=>el.scrollTop')-before)<2
        go(page,'AL150');before=page.locator('#workbook-grid').evaluate('(el)=>el.scrollLeft');header=page.locator('th[data-row="150"]').bounding_box();page.mouse.move(header['x']+header['width']/2,header['y']+header['height']/2);page.mouse.down();page.wait_for_timeout(200);page.mouse.up();assert abs(page.locator('#workbook-grid').evaluate('(el)=>el.scrollLeft')-before)<2
        go(page,'N4:P5');page.get_by_role('button',name='Gabungkan sel',exact=True).click();expect(page.locator('.workbook-cell[data-cell="N4"]')).to_be_focused();page.keyboard.type('Gabungan');expect(page.locator('.workbook-cell[data-cell="N4"]')).to_have_value('Gabungan')
        font=page.get_by_role('combobox',name='Font',exact=True);font.fill('times');expect(page.get_by_role('option',name='Times New Roman',exact=True)).to_be_visible();page.get_by_role('option',name='Times New Roman',exact=True).click()
        size=page.get_by_label('Ukuran',exact=True);size.fill('13.5');size.press('Enter');expect(page.locator('.workbook-cell[data-cell="N4"]')).to_be_focused()
        assert page.locator('.workbook-cell[data-cell="N4"]').evaluate('(el)=>getComputedStyle(el).fontSize')=='18px'
        go(page,'R4');page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan simbol',exact=True).click();page.get_by_role('button',name='Simbol ±',exact=True).click();expect(page.locator('.workbook-cell[data-cell="R4"]')).to_have_value('±')
        go(page,'T4');page.get_by_role('button',name='Sisipkan gambar',exact=True).click();page.get_by_label('File gambar',exact=True).set_input_files({'name':'cbi.png','mimeType':'image/png','buffer':SMALL_PNG});page.get_by_role('button',name='Masukkan Gambar',exact=True).click();page.wait_for_function("document.querySelectorAll('.workbook-image').length===2||Boolean(document.getElementById('insert-error')?.textContent)");assert page.locator('.workbook-image').count()==2,page.locator('#insert-error').text_content()
        page.get_by_role('button',name='Undo',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(1);page.get_by_role('button',name='Redo',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(2)
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();expect(page.locator('.workbook-image')).to_have_count(2)
        # A sheet without a drawing gets a valid image relationship at the final cell.
        page.get_by_role('tab',name='Catatan',exact=True).click();go(page,'ALL1000');page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan gambar',exact=True).click();page.get_by_label('File gambar',exact=True).set_input_files({'name':'edge.png','mimeType':'image/png','buffer':SMALL_PNG});page.get_by_role('button',name='Masukkan Gambar',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(1)
        # Serializing then undoing removes generated image bytes from the next export.
        try:
            with page.expect_download() as preview:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        except Exception:
            print('Edge download diagnostic:',page.locator('#toast').text_content(),errors,flush=True);raise
        page.get_by_role('button',name='Undo',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(0)
        with page.expect_download() as clean:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(clean.value.path()) as z:assert len([name for name in z.namelist() if re.match('xl/media/[^/]+\\.(png|jpeg)$',name)])==2
        page.get_by_role('button',name='Redo',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(1);page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();page.get_by_role('tab',name='Catatan',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(1);page.get_by_role('tab',name='Instruksi Kerja',exact=True).click()
        with page.expect_download() as dl:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(dl.value.path()) as z:
            ns=fixture.NS;sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));styles=ET.fromstring(z.read('xl/styles.xml'))
            assert ''.join(sheet.find(f'.//{{{ns}}}c[@r="R4"]').itertext())=='±';assert len([name for name in z.namelist() if re.match('xl/media/[^/]+\\.(png|jpeg)$',name)])==3
            cell=sheet.find(f'.//{{{ns}}}c[@r="N4"]');xf=styles.find(f'{{{ns}}}cellXfs')[int(cell.attrib['s'])];font_xml=styles.find(f'{{{ns}}}fonts')[int(xf.attrib['fontId'])];assert font_xml.find(f'{{{ns}}}sz').attrib['val']=='13.5'
        page.get_by_role('tab',name='Insert',exact=True).click()
        page.screenshot(path=str(fixture.ARTIFACTS/'editor-insert-fullscreen.png'),full_page=True)
        page.get_by_role('link',name='Ke Permintaan',exact=True).click();page.get_by_role('link',name='Kembali',exact=True).click();row=page.get_by_role('row').filter(has_text='IK UX Baru');expect(row.get_by_role('button',name='Edit Excel',exact=True)).to_be_enabled()
        row.get_by_role('button',name='Lihat Excel',exact=True).click();expect(page.locator('.excel-ribbon')).to_have_count(0);expect(page.get_by_role('button',name='Simpan Perubahan',exact=True)).to_have_count(0);expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_attribute('readonly','');page.get_by_role('link',name='Ke Permintaan',exact=True).click()
        approval.submit(page,request_id);page.goto(approval.BASE+'#requests');row=page.get_by_role('row').filter(has_text='IK UX Baru');expect(row.get_by_role('button',name='Edit Excel',exact=True)).to_be_disabled();row.get_by_role('button',name='Lihat Excel',exact=True).click();expect(page.locator('.sidebar,.topbar')).to_have_count(0);expect(page.locator('.excel-ribbon')).to_have_count(0);expect(page.locator('.workbook-image')).to_have_count(2)
        assert not errors,errors;print('PASS table redirect/actions/submit lock, full-screen editor, drag/multi-format/direct typing, font search/custom size, Insert image+symbol XLSX roundtrip; artifacts:',fixture.ARTIFACTS,flush=True);browser.close()

if __name__=='__main__':run()
