"""End-to-end approval and Excel toolbar contract; isolated browser with seeded UI accounts."""
import importlib.util, re, io, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('workbook_fixture',Path(__file__).with_name('browser-workbook.py'))
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
from playwright.sync_api import sync_playwright,expect
choose,login,logout,upload=fixture.choose,fixture.login,fixture.logout,fixture.upload
BASE='http://127.0.0.1:4173/'

def set_color(page,label,value):
    page.get_by_role('button',name=label,exact=True).click()
    page.locator('#workbook-color-menu').get_by_role('button',name='More Colors...',exact=True).click()
    page.get_by_label('Kode warna HEX',exact=True).fill(value)
    page.get_by_role('button',name='Terapkan Warna',exact=True).click()


def qa(page):
    page.locator('#email').fill('budi@docuflow.id');page.locator('#password').fill('user123');page.get_by_role('button',name='Masuk ke workspace').click()

def submit(page,request_id):
    page.goto(BASE+'#request-'+request_id)
    page.locator('[name="approverIds"][value="u-admin"]').check()
    page.locator('[name="approverIds"][value="u-qa"]').check()
    page.get_by_role('button',name='Ajukan Persetujuan',exact=True).click()
    expect(page.locator('.request-summary .request-status')).to_have_text('Menunggu persetujuan')

def publish(page,request_id):
    submit(page,request_id)
    logout(page);qa(page);page.goto(BASE+'#request-'+request_id)
    page.get_by_role('button',name='Setujui Dokumen',exact=True).click()
    expect(page.locator('.request-summary .request-status')).to_have_text('Menunggu persetujuan')
    logout(page);login(page,'admin');page.goto(BASE+'#request-'+request_id)
    page.get_by_role('button',name='Setujui Dokumen',exact=True).click()
    expect(page.locator('.request-summary .request-status')).to_have_text('Siap diterbitkan')
    page.get_by_role('button',name='Terbitkan Dokumen',exact=True).click()
    expect(page.locator('.request-summary .request-status')).to_have_text('Sudah diterbitkan')
    doc_id=page.evaluate('(id)=>db.documentRequests.find(r=>r.id===id).publishedDocumentId',request_id)
    return doc_id

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        context=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,reduced_motion='reduce')
        context.set_default_timeout(12000);errors=[]
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda msg:errors.append(msg.text) if msg.type in ['warning','error'] else None)
        page.goto(BASE);login(page,'admin');upload(page,fixture.WORKBOOK);logout(page);login(page,'user')
        page.get_by_role('link',name='Create / Revise Dokumen',exact=True).click()
        expect(page.get_by_role('heading',name='Create / Revise Dokumen',exact=True)).to_be_visible()
        page.get_by_role('link',name='Buat Permintaan',exact=True).click()
        page.locator('#doc-title').fill('IK Approval Toolbar');choose(page,'Jenis dokumen','Instruksi Kerja');choose(page,'Kategori dokumen','LEGACY')
        fixture.save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_be_visible();request_id=page.url.split('#workbook-')[1]
        assert page.evaluate('(id)=>!db.documents.some(d=>d.id===id)',request_id)
        # Toolbar applies to a range and survives export, save and reload.
        page.get_by_role('textbox',name='Rentang sel',exact=True).fill('J4:K5');page.get_by_role('button',name='Pilih rentang',exact=True).click()
        expect(page.locator('.workbook-cell.is-range')).to_have_count(4)
        page.get_by_role('button',name='Tebal',exact=True).click()
        page.get_by_role('combobox',name='Font',exact=True).fill('Calibri');page.get_by_role('combobox',name='Font',exact=True).press('Enter');page.get_by_label('Ukuran',exact=True).fill('16');page.get_by_label('Ukuran',exact=True).press('Enter')
        page.get_by_role('button',name='Rata tengah',exact=True).click();page.get_by_role('button',name='Pilihan Borders',exact=True).click();page.get_by_role('menuitem',name='All Borders',exact=True).click()
        set_color(page,'Warna sel','#ffeeaa')
        set_color(page,'Warna teks','#990000')
        page.get_by_role('button',name='Garis bawah',exact=True).click();page.get_by_role('button',name='Bungkus teks',exact=True).click()
        assert page.locator('.workbook-cell[data-cell="J4"]').evaluate('(el)=>getComputedStyle(el).fontWeight')=='700'
        page.get_by_role('button',name='Gabungkan sel',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="K5"]')).to_have_count(0)
        page.get_by_role('button',name='Undo',exact=True).click();expect(page.locator('.workbook-cell[data-cell="K5"]')).to_have_count(1)
        page.get_by_role('button',name='Redo',exact=True).click();expect(page.locator('.workbook-cell[data-cell="K5"]')).to_have_count(0)
        page.get_by_role('textbox',name='Rentang sel',exact=True).fill('J4:K5');page.get_by_role('button',name='Pilih rentang',exact=True).click()
        page.get_by_role('button',name='Lepas gabungan',exact=True).click();expect(page.locator('.workbook-cell[data-cell="K5"]')).to_have_count(1)
        page.locator('.workbook-cell[data-cell="J4"]').fill('0.125')
        page.get_by_label('Format angka',exact=True).select_option('10')
        page.get_by_role('textbox',name='Rentang sel',exact=True).focus()
        expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('12.50%')
        # Keyboard selection must move the toolbar range too.
        page.locator('.workbook-cell[data-cell="J5"]').focus();page.keyboard.press('Tab')
        expect(page.locator('.workbook-cell[data-cell="K5"]')).to_be_focused()
        expect(page.get_by_role('textbox',name='Rentang sel',exact=True)).to_have_value('K5')
        # Shift+click keeps the first cell as the selection anchor.
        page.locator('.workbook-cell[data-cell="J6"]').click();page.locator('.workbook-cell[data-cell="K7"]').click(modifiers=['Shift'])
        expect(page.locator('.workbook-cell.is-range')).to_have_count(4)
        # Excel merge keeps the top-left; Undo restores every discarded value.
        page.get_by_role('textbox',name='Rentang sel',exact=True).fill('A8:A9');page.get_by_role('button',name='Pilih rentang',exact=True).click();page.get_by_role('button',name='Gabungkan sel',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="A8"]')).to_have_value('1');expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_count(0)
        page.get_by_role('button',name='Undo',exact=True).click();expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_value('2')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload();expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('12.50%')
        assert page.locator('.workbook-cell[data-cell="J4"]').evaluate('(el)=>getComputedStyle(el).fontFamily')=='Calibri'
        with page.expect_download() as dl:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(dl.value.path()) as z:
            ns=fixture.NS;s=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));styles=ET.fromstring(z.read('xl/styles.xml'))
            c=s.find(f'.//{{{ns}}}c[@r="J4"]');xf=styles.find(f'{{{ns}}}cellXfs')[int(c.attrib['s'])];font=styles.find(f'{{{ns}}}fonts')[int(xf.attrib['fontId'])]
            assert xf.attrib['numFmtId']=='10';assert xf.find(f'{{{ns}}}alignment').attrib['horizontal']=='center';assert font.find(f'{{{ns}}}b') is not None
            assert font.find(f'{{{ns}}}name').attrib['val']=='Calibri';assert c.find(f'{{{ns}}}v').text=='0.125'
            assert s.find(f'.//{{{ns}}}c[@r="A12"]/{{{ns}}}f').text=='SUM(A8:A9)'
            assert z.read('xl/media/image1.png')==fixture.parts['xl/media/image1.png']
        for width in [320,768,1440]:
            page.set_viewport_size({'width':width,'height':1100});page.wait_for_timeout(100);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,right:[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>innerWidth+1&&el.getBoundingClientRect().width<innerWidth).slice(0,20).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right})),wide:[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().width>innerWidth&&getComputedStyle(el).position!=="fixed").slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width}))})')
        page.set_viewport_size({'width':1440,'height':1100});page.screenshot(path=str(fixture.ARTIFACTS/'toolbar.png'),full_page=True)
        # Submitted files become read-only. One approver can return; draft is editable again.
        # A different tab submits the saved version while this tab has unsaved edits.
        page.locator('.workbook-cell[data-cell="C8"]').fill('Unsaved content must not become review artifact')
        other=context.new_page();other.goto(BASE);submit(other,request_id)
        expect(page.locator('#workbook-save-status')).to_have_text('Mode baca')
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Isi langkah kerja di sini')
        with page.expect_download() as frozen:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(frozen.value.path()) as z:
            sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));cell=sheet.find(f'.//{{{fixture.NS}}}c[@r="C8"]');assert ''.join(cell.itertext())=='Isi langkah kerja di sini'
        other.close();page.goto(BASE+'#request-'+request_id)
        assert page.evaluate('(id)=>!db.documents.some(d=>d.requestId===id)',request_id)
        page.get_by_role('link',name='Lihat Excel',exact=True).click();expect(page.get_by_role('button',name='Simpan Perubahan',exact=True)).to_have_count(0)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_attribute('readonly','')
        logout(page);qa(page);page.goto(BASE+'#request-'+request_id);page.get_by_role('button',name='Kembalikan untuk Perbaikan',exact=True).click();expect(page.locator('#toast')).to_contain_text('catatan')
        page.locator('#review-note').fill('Perbaiki langkah assembly');page.get_by_role('button',name='Kembalikan untuk Perbaikan',exact=True).click();expect(page.locator('.request-summary .request-status')).to_have_text('Perlu perbaikan')
        logout(page);login(page,'user');page.goto(BASE+'#request-'+request_id)
        page.get_by_role('button',name='Edit Informasi',exact=True).click();page.locator('#doc-title').fill('IK Approval Final');fixture.save_and_open(page,'Simpan Draft')
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_be_visible();page.locator('.workbook-cell[data-cell="C8"]').fill('Langkah final');page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        doc_id=publish(page,request_id)
        with page.expect_download() as historical:page.get_by_role('button',name='Unduh Excel - Putaran 1',exact=True).click()
        with zipfile.ZipFile(historical.value.path()) as z:
            sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));cell=sheet.find(f'.//{{{fixture.NS}}}c[@r="C8"]')
            assert ''.join(cell.itertext())=='Isi langkah kerja di sini','Original reviewed artifact was replaced or deleted'

        page.goto(BASE+'#master');expect(page.get_by_role('button',name='IK Approval Final',exact=True)).to_be_visible()
        page.goto(BASE+'#workbook-'+doc_id);expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Langkah final');expect(page.get_by_role('button',name='Simpan Perubahan',exact=True)).to_have_count(0)
        # A revision remains independent; prior official document stays active until admin publishes.
        logout(page);login(page,'user');page.goto(BASE+'#master');page.locator('[data-action="edit-document"][data-id="'+doc_id+'"]').click()
        page.locator('#doc-title').fill('IK Revisi Final');page.locator('#change-notes').fill('Revisi langkah kerja');fixture.save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Langkah final');revision_id=page.url.split('#workbook-')[1]
        page.locator('.workbook-cell[data-cell="C8"]').fill('Revisi baru');page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        assert page.evaluate('(id)=>db.documents.find(d=>d.id===id).status',doc_id)=='active'
        revised_doc=publish(page,revision_id);assert page.evaluate('(id)=>db.documents.find(d=>d.id===id).status',doc_id)=='archive'
        assert page.evaluate('(id)=>db.documents.find(d=>d.id===id).status',revised_doc)=='active'
        page.goto(BASE+'#workbook-'+doc_id);expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Langkah final')
        page.goto(BASE+'#request-'+revision_id);page.screenshot(path=str(fixture.ARTIFACTS/'approved-request.png'),full_page=True)
        assert not errors,errors
        print('PASS toolbar/roundtrip/range/undo/merge, return/edit/resubmit, all approvals/manual publish, source revision isolation, responsive; artifacts:',fixture.ARTIFACTS,flush=True)
        browser.close()

if __name__=='__main__':run()
