"""PDF request publication and category-aware draft visibility."""
import importlib.util,io,zipfile,re,xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('approval',Path(__file__).with_name('browser-approval.py'));approval=importlib.util.module_from_spec(spec);spec.loader.exec_module(approval)
from playwright.sync_api import sync_playwright,expect
fixture=approval.fixture

def sign_and_approve(page, title, stale_signature=False):
    page.get_by_role('button',name=re.compile('Profil .* dan keluar')).click()
    page.get_by_role('button',name='Tanda Tangan Saya',exact=True).click()
    page.locator('#signature-file').set_input_files({'name':'signature.png','mimeType':'image/png','buffer':fixture.parts['xl/media/image1.png']})
    page.get_by_role('button',name='Simpan Tanda Tangan',exact=True).click()
    expect(page.locator('#signature-form')).to_have_count(0);expect(page.locator('#toast')).to_contain_text('Tanda tangan berhasil disimpan')
    page.goto(approval.BASE+'#approvals');row=page.get_by_role('row').filter(has_text=title)
    with page.expect_popup() as popup:row.get_by_role('button',name='Approval',exact=True).click()
    preview=popup.value;expect(preview.locator('.approval-page canvas').first).to_be_visible();expect(preview.locator('#approval-title')).to_have_text(title)
    preview.get_by_role('button',name='Tanda tangani',exact=False).click();preview.get_by_role('button',name='Gunakan tanda tangan',exact=True).click()
    preview.locator('.approval-page canvas').first.click(position={'x':100,'y':100})
    if stale_signature:
        page.get_by_role('button',name=re.compile('Profil .* dan keluar')).click();page.get_by_role('button',name='Tanda Tangan Saya',exact=True).click()
        page.locator('#signature-file').set_input_files({'name':'signature.png','mimeType':'image/png','buffer':fixture.parts['xl/media/image1.png']});page.get_by_role('button',name='Simpan Tanda Tangan',exact=True).click();expect(page.locator('#signature-form')).to_have_count(0)
        preview.get_by_role('button',name='Setujui dan simpan',exact=True).click();expect(preview.locator('#approval-hint')).to_contain_text('Tanda tangan berubah');preview.close()
        row=page.get_by_role('row').filter(has_text=title)
        with page.expect_popup() as popup:row.get_by_role('button',name='Approval',exact=True).click()
        preview=popup.value;expect(preview.locator('.approval-page canvas').first).to_be_visible();preview.get_by_role('button',name='Tanda tangani',exact=False).click();preview.get_by_role('button',name='Gunakan tanda tangan',exact=True).click();preview.locator('.approval-page canvas').first.click(position={'x':100,'y':100})
    preview.get_by_role('button',name='Setujui dan simpan',exact=True).click();expect(preview.locator('#approval-hint')).to_have_text('Persetujuan berhasil disimpan.');preview.close()

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda msg:errors.append(msg.text) if msg.type in ['warning','error'] else None)
        generator=context.new_page();generator.set_content('<h1>CBI approved PDF fixture</h1>');pdf=generator.pdf();generator.close()
        page.goto(approval.BASE);fixture.login(page,'user');page.evaluate('''()=>{const next=transaction();next.users.push({id:'u-reviewer2',name:'Sari Reviewer',email:'sari@example.test',password:'user123',role:'user',departmentId:'qa',sectionId:'qa-inspection'});if(!saveDatabase(next))throw Error('fixture');}''');page.goto(approval.BASE+'#create')
        page.locator('#doc-title').fill('Checksheet PDF Approval');fixture.choose(page,'Jenis dokumen','Checksheet');fixture.choose(page,'Kategori dokumen','LEGACY')
        page.get_by_label('Lampiran PDF',exact=True).set_input_files({'name':'checksheet.pdf','mimeType':'application/pdf','buffer':pdf})
        fixture.save_and_open(page);expect(page.get_by_role('heading',name='Checksheet PDF Approval',exact=True)).to_be_visible();request_id=page.url.split('#request-')[1]
        # Another same-category user has no access until assigned to this request.
        fixture.logout(page);approval.qa(page);page.goto(approval.BASE+'#request-'+request_id);expect(page.get_by_role('heading',name='Permintaan tidak tersedia',exact=True)).to_be_visible()
        fixture.logout(page);fixture.login(page,'admin');page.goto(approval.BASE+'#request-'+request_id);expect(page.get_by_role('button',name='Edit Informasi',exact=True)).to_have_count(0)
        fixture.logout(page);fixture.login(page,'user');page.goto(approval.BASE+'#request-'+request_id)
        # Admin review and both approvals precede publication, also for a PDF artifact.
        page.get_by_role('button',name='Submit ke Admin',exact=True).click();expect(page.locator('.request-summary .request-status')).to_have_text('Pemeriksaan admin')
        fixture.logout(page);fixture.login(page,'admin');page.goto(approval.BASE+'#request-'+request_id);page.locator('#approval-number').fill('CS/PRD/MANUAL-01');fixture.select_approver(page,'u-qa');fixture.select_approver(page,'u-reviewer2');page.get_by_role('button',name='Kirim untuk Persetujuan',exact=True).click();expect(page.locator('.request-summary .request-status')).to_have_text('Menunggu persetujuan')
        fixture.logout(page);approval.qa(page);page.goto(approval.BASE+'#approvals')
        row=page.get_by_role('row').filter(has_text='Checksheet PDF Approval')
        with page.expect_popup() as popup:row.get_by_role('button',name='Approval',exact=True).click()
        preview=popup.value;expect(preview.locator('.approval-page canvas').first).to_be_visible();preview.get_by_role('button',name='Tanda tangani',exact=False).click();expect(preview.locator('#approval-hint')).to_contain_text('Unggah tanda tangan');preview.close()
        assert page.evaluate('(id)=>db.documentRequests.find(r=>r.id===id).status',request_id)=='in_review'
        sign_and_approve(page,'Checksheet PDF Approval',stale_signature=True)
        fixture.logout(page);page.locator('#email').fill('sari@example.test');page.locator('#password').fill('user123');page.get_by_role('button',name='Masuk ke workspace').click();sign_and_approve(page,'Checksheet PDF Approval');page.goto(approval.BASE+'#request-'+request_id);expect(page.locator('.request-summary .request-status')).to_have_text('Siap diterbitkan')
        fixture.logout(page);fixture.login(page,'admin');page.goto(approval.BASE+'#request-'+request_id);page.get_by_role('button',name='Terbitkan Dokumen',exact=True).click();expect(page.locator('.request-summary .request-status')).to_have_text('Sudah diterbitkan');doc_id=page.evaluate('(id)=>db.documentRequests.find(r=>r.id===id).publishedDocumentId',request_id)
        page.get_by_role('button',name='Lihat Dokumen Resmi',exact=True).click()
        with page.expect_download() as download:page.get_by_role('button',name='Unduh',exact=True).click()
        signed_pdf=Path(download.value.path()).read_bytes();assert signed_pdf.startswith(b'%PDF-') and signed_pdf!=pdf
        assert page.evaluate('''async id=>{const d=db.documents.find(x=>x.id===id),bytes=await WorkbookStore.get(d.attachment.storageKey),pdf=await PDFLib.PDFDocument.load(bytes),resources=pdf.getPages()[0].node.Resources(),images=resources.lookup(PDFLib.PDFName.of('XObject'),PDFLib.PDFDict);return images.keys().length===2&&d.approvals.every(review=>review.signature?.page===1)}''',doc_id)
        with page.expect_popup() as popup:page.get_by_role('button',name='Preview PDF',exact=True).click()
        preview=popup.value;expect(preview.locator('#pdf-frame')).to_be_visible()
        expect(preview.locator('body')).to_contain_text('Checksheet PDF Approval')
        assert preview.get_by_role('button',name=re.compile('Unduh|Revisi')).count()==0
        preview.close();page.locator('[data-action="close-modal"]').first.click()
        # Style-free XLSX still supports toolbar persistence and undo.
        content=dict(fixture.parts);del content['xl/styles.xml']
        content['xl/workbook.xml']=content['xl/workbook.xml'].replace('<bookViews>', '<workbookPr date1904="1"/><bookViews>')
        content['xl/_rels/workbook.xml.rels']=content['xl/_rels/workbook.xml.rels'].replace(f'<Relationship Id="rId3" Type="{fixture.REL}/styles" Target="styles.xml"/>','')
        content['[Content_Types].xml']=content['[Content_Types].xml'].replace('<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>','')
        for part in ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']:content[part]=re.sub(r' s="\d+"','',content[part])
        output=io.BytesIO()
        with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
            for name,body in content.items():z.writestr(name,body)
        fixture.upload(page,output.getvalue(),'No styles.xlsx')
        page.goto(approval.BASE+'#create');page.locator('#doc-title').fill('IK no styles');fixture.choose(page,'Jenis dokumen','Instruksi Kerja');fixture.choose(page,'Kategori dokumen','LEGACY');fixture.save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_be_visible();page.locator('.workbook-cell[data-cell="C8"]').click();page.get_by_role('button',name='Tebal',exact=True).click();page.get_by_role('button',name='Undo',exact=True).click();page.get_by_role('button',name='Redo',exact=True).click()
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload()
        assert page.locator('.workbook-cell[data-cell="C8"]').evaluate('(el)=>getComputedStyle(el).fontWeight')=='700'
        page.locator('.workbook-cell[data-cell="J4"]').fill('0');page.get_by_label('Format angka',exact=True).select_option('14');page.get_by_role('textbox',name='Rentang sel',exact=True).focus();expect(page.locator('.workbook-cell[data-cell="J4"]')).to_have_value('1904-01-01')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        with page.expect_download() as download:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(download.value.path()) as z:
            assert 'xl/styles.xml' in z.namelist();rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'));assert any(node.attrib.get('Type','').endswith('/styles') for node in rels)
        assert not errors,errors;print('PASS PDF request visibility/approval/publish/exact artifact/preview and style-free XLSX formatting/undo/roundtrip',flush=True);browser.close()

if __name__=='__main__':run()
