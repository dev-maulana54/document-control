import io,zipfile,base64,xml.etree.ElementTree as ET
from pathlib import Path
import tempfile
ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=Path(tempfile.mkdtemp(prefix='cbi-workbook-tests-'))
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
parts={
'[Content_Types].xml':'''<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>''',
'_rels/.rels':f'''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>''',
'xl/workbook.xml':f'''<workbook xmlns="{NS}" xmlns:r="{REL}"><bookViews><workbookView/></bookViews><sheets><sheet name="Instruksi Kerja" sheetId="1" r:id="rId1"/><sheet name="Catatan" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="1"/></workbook>''',
'xl/_rels/workbook.xml.rels':f'''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="{REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="{REL}/styles" Target="styles.xml"/><Relationship Id="rId4" Type="{REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>''',
'xl/styles.xml':f'''<styleSheet xmlns="{NS}"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF173250"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF1FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF64748B"/></left><right style="thin"><color rgb="FF64748B"/></right><top style="thin"><color rgb="FF64748B"/></top><bottom style="thin"><color rgb="FF64748B"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>''',
'xl/sharedStrings.xml':f'''<sst xmlns="{NS}" count="1" uniqueCount="1"><si><t>INSTRUKSI KERJA</t></si></sst>''',
'xl/worksheets/sheet1.xml':f'''<worksheet xmlns="{NS}" xmlns:r="{REL}"><dimension ref="A1:H15"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols><col min="1" max="8" width="14" customWidth="1"/></cols><sheetData><row r="1" ht="25" customHeight="1"><c r="C1" s="1" t="s"><v>0</v></c></row><row r="2" ht="24" customHeight="1"/><row r="3" ht="22" customHeight="1"/><row r="4"><c r="A4" t="inlineStr"><is><t>Nomor Dokumen</t></is></c><c r="C4" s="2" t="inlineStr"><is><t>IK-PR2-ASY</t></is></c></row><row r="5"><c r="A5" t="inlineStr"><is><t>Nama Dokumen</t></is></c><c r="C5" s="2" t="inlineStr"><is><t>Template IK Baterai</t></is></c></row><row r="7"><c r="A7" s="1" t="inlineStr"><is><t>No</t></is></c><c r="C7" s="1" t="inlineStr"><is><t>Langkah Kerja</t></is></c><c r="G7" s="1" t="inlineStr"><is><t>Standar</t></is></c></row><row r="8" ht="32" customHeight="1"><c r="A8" s="2"><v>1</v></c><c r="C8" s="2" t="inlineStr"><is><t>Isi langkah kerja di sini</t></is></c><c r="G8" s="2" t="inlineStr"><is><t>Sesuai standar</t></is></c></row><row r="9"><c r="A9" s="2"><v>2</v></c></row><row r="12"><c r="A12"><f>SUM(A8:A9)</f><v>3</v></c></row><row r="15"><c r="H15" t="inlineStr"><is><t>Rev. 0</t></is></c></row></sheetData><mergeCells count="9"><mergeCell ref="C1:H2"/><mergeCell ref="A4:B4"/><mergeCell ref="C4:H4"/><mergeCell ref="A5:B5"/><mergeCell ref="C5:H5"/><mergeCell ref="C7:F7"/><mergeCell ref="G7:H7"/><mergeCell ref="C8:F10"/><mergeCell ref="G8:H10"/></mergeCells><pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1"/><drawing r:id="rId1"/></worksheet>''',
'xl/worksheets/sheet2.xml':f'''<worksheet xmlns="{NS}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Catatan</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Bagian ini tidak berubah</t></is></c></row></sheetData></worksheet>''',
'xl/worksheets/_rels/sheet1.xml.rels':f'''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{REL}/drawing" Target="../drawings/drawing1.xml"/><Relationship Id="external" Type="{REL}/hyperlink" Target="https://example.com/must-not-load" TargetMode="External"/></Relationships>''',
'xl/drawings/drawing1.xml':f'''<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="{REL}"><xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>95250</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>95250</xdr:rowOff></xdr:from><xdr:to><xdr:col>1</xdr:col><xdr:colOff>571500</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>95250</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="CBI"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"/></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>''',
'xl/drawings/_rels/drawing1.xml.rels':f'''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{REL}/image" Target="../media/image1.png"/></Relationships>''',
'customXml/item1.xml':'<private-template-data preserve="yes">Tetap dipertahankan</private-template-data>'
}
parts['xl/media/image1.png']=(ROOT/'dist/assets/cbi.png').read_bytes()
original=io.BytesIO()
with zipfile.ZipFile(original,'w',zipfile.ZIP_DEFLATED) as z:
    for path,content in parts.items():z.writestr(path,content)
WORKBOOK=original.getvalue()
from playwright.sync_api import sync_playwright,expect
import re,json
def choose(page,label,option):
    if label=='Kategori dokumen':option=page.evaluate('(value)=>db.documentCategories.find(category=>category.code===value)?.name||value',option)
    page.get_by_role('combobox',name=label,exact=True).click()
    page.get_by_role('option').filter(has_text=option).first.click()
def select_approver(page,user_id):
    if not page.locator('#selected-approvers input[name="approverIds"]').evaluate_all('(inputs,id)=>inputs.some(input=>input.value===id)',user_id):
        page.locator('#approver-select').select_option(value=user_id)
def login(page,role):
    page.locator("#login-form").wait_for()
    # Demo data belongs to isolated browser tests; production starts empty.
    page.evaluate("""()=>{if(db.users.some(user=>user.id==='u-user'))return;const demo=seedDatabase();DocumentAccess.migrate(demo);DocumentWorkflow.migrate(demo);DocumentCategories.migrate(demo);demo.documentTemplates=[];localStorage.setItem(DB_KEY,JSON.stringify(demo));db=loadDatabase();render();}""")
    page.get_by_role('button',name='Demo Admin' if role=='admin' else 'Demo User',exact=True).click()
    page.get_by_role('button',name='Masuk ke workspace').click()

def save_and_open(page,label='Simpan Dokumen'):
    title=page.locator('#doc-title').input_value()
    page.get_by_role('button',name=label,exact=True).click()
    page.wait_for_function("location.hash==='#requests'||location.hash.startsWith('#workbook-')||Boolean(document.getElementById('document-error')?.textContent)")
    if page.url.split('#')[-1].startswith('workbook-'):return
    if page.url.split('#')[-1]!='requests':return
    row=page.get_by_role('row').filter(has_text=title).first
    edit=row.get_by_role('button',name='Edit Excel',exact=True)
    if edit.count() and edit.is_enabled():edit.click()
    else:row.get_by_role('link',name=title,exact=True).click()

def logout(page):
    if not page.locator('[data-action="profile"]').count():page.locator('.workbook-heading a, a[href="#master"]').first.click()
    page.locator('[data-action="profile"]').click()
    page.get_by_role('button',name='Keluar dari workspace').click()

def pack(changes):
    contents=dict(parts);contents.update(changes)
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for path,content in contents.items():z.writestr(path,content)
    return output.getvalue()
def upload(page,buffer,name='IK.xlsx',valid=True):
    page.goto(page.url.split('#')[0]+'#templates')
    page.get_by_role('button',name=re.compile('Unggah Template|Ganti Template')).first.click()
    choose(page,'Jenis dokumen','Instruksi Kerja')
    page.get_by_label('Format softcopy Excel').set_input_files({'name':name,'mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':buffer})
    page.get_by_role('button',name='Simpan Template',exact=True).click()
    if valid:expect(page.locator('#modal')).not_to_be_visible()
    else:expect(page.locator('#template-error')).not_to_have_text('')
def keys(page):
    return page.evaluate("""async()=>{const request=indexedDB.open('cbi.workbooks.v1',1);const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});const list=await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly');const r=tx.objectStore('files').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return list}""")


def approve_and_publish(page,request_id):
    page.goto('http://127.0.0.1:4173/#request-'+request_id)
    select_approver(page,'u-admin')
    select_approver(page,'u-qa')
    page.get_by_role('button',name='Ajukan Persetujuan',exact=True).click()
    expect(page.locator('.request-summary .request-status')).to_have_text('Menunggu persetujuan')
    logout(page)
    page.locator('#email').fill('budi@docuflow.id');page.locator('#password').fill('user123');page.get_by_role('button',name='Masuk ke workspace').click()
    page.goto('http://127.0.0.1:4173/#request-'+request_id);page.get_by_role('button',name='Setujui Dokumen',exact=True).click()
    logout(page);login(page,'admin');page.goto('http://127.0.0.1:4173/#request-'+request_id)
    page.get_by_role('button',name='Setujui Dokumen',exact=True).click();page.get_by_role('button',name='Terbitkan Dokumen',exact=True).click()
    expect(page.locator('.request-summary .request-status')).to_have_text('Sudah diterbitkan')
    doc_id=page.evaluate('(id)=>db.documentRequests.find(r=>r.id===id).publishedDocumentId',request_id)
    logout(page);login(page,'user');return doc_id

def test_primary_flow():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce')
        context.set_default_timeout(12000)
        errors=[];external=[]
        context.on('page',lambda pg:pg.on('pageerror',lambda error:errors.append(str(error))))
        context.on('console',lambda msg:errors.append(msg.type+': '+msg.text) if msg.type in ['warning','error'] else None)
        context.on('request',lambda req:external.append(req.url) if req.url.startswith('http') and not req.url.startswith('http://127.0.0.1:4173/') else None)
        page=context.new_page();page.goto('http://127.0.0.1:4173/')
        login(page,'admin')
        expect(page.locator('[data-action="notifications"]')).to_have_count(0)
        page.goto('http://127.0.0.1:4173/#create')
        page.locator('#doc-title').fill('IK belum ada template')
        choose(page,'Jenis dokumen','Instruksi Kerja')
        choose(page,'Kategori dokumen','LEGACY')
        expect(page.locator('.document-attachment')).to_be_hidden()
        expect(page.locator('.document-email-recipients')).to_be_hidden()
        save_and_open(page)
        expect(page.locator('#document-error')).to_contain_text('Template Excel belum tersedia')
        page.goto('http://127.0.0.1:4173/#templates')
        page.get_by_role('button',name='Unggah Template',exact=True).first.click()
        choose(page,'Jenis dokumen','Instruksi Kerja')
        page.get_by_label('Format softcopy Excel').set_input_files({'name':'Format IK.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':WORKBOOK})
        page.get_by_role('button',name='Simpan Template',exact=True).click()
        expect(page.get_by_role('cell',name='Format IK.xlsx',exact=True)).to_be_visible()
        page.screenshot(path=str(ARTIFACTS/'excel-template-admin.png'),full_page=True)
        logout(page);login(page,'user')
        page.goto('http://127.0.0.1:4173/#master')
        expect(page.locator('[data-action="delete-doc"]')).to_have_count(0)
        expect(page.locator('[data-action="add-document"]')).to_have_count(0)
        expect(page.locator('[data-action="notifications"]')).to_have_count(0)
        page.goto('http://127.0.0.1:4173/#type-builtin-se')
        primary=page.locator('.submenu a.active').evaluate('(el)=>getComputedStyle(el).backgroundColor')
        assert primary!='rgba(255, 255, 255, 0.027)',primary
        page.goto('http://127.0.0.1:4173/#create')
        page.locator('#doc-title').fill('IK Pemeriksaan Baterai')
        choose(page,'Jenis dokumen','Instruksi Kerja')
        choose(page,'Kategori dokumen','LEGACY')
        expect(page.locator('.document-attachment')).to_be_hidden()
        expect(page.locator('.document-email-recipients')).to_be_hidden()
        page.screenshot(path=str(ARTIFACTS/'ik-metadata-form.png'),full_page=True)
        save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Isi langkah kerja di sini')
        expect(page.locator('.workbook-image')).to_have_count(1)
        expect(page.locator('.workbook-sheet td[colspan="6"][rowspan="2"]')).to_have_count(1)
        expect(page.locator('.workbook-cell[data-cell="A12"]')).to_have_attribute('readonly','')
        doc_id=page.url.split('#workbook-')[1]
        page.locator('.workbook-cell[data-cell="C8"]').fill('Periksa terminal baterai sebelum assembly.')
        page.locator('.workbook-cell[data-cell="A8"]').fill('5')
        expect(page.locator('#workbook-save-status')).to_have_text('Perubahan belum disimpan')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload()
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Periksa terminal baterai sebelum assembly.')
        page.get_by_role('tab',name='Catatan',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="A2"]')).to_have_value('Bagian ini tidak berubah')
        page.get_by_role('tab',name='Instruksi Kerja',exact=True).click()
        for width in [320,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(200)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('overflow',width)
            if width in [320,1440]:page.screenshot(path=str(ARTIFACTS/('excel-editor-mobile.png' if width==320 else 'excel-editor-preview.png')),full_page=True,animations='disabled')
        with page.expect_download() as result:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        exported=Path(result.value.path()).read_bytes()
        with zipfile.ZipFile(io.BytesIO(exported)) as z:
            for name in parts:
                if name not in ['xl/worksheets/sheet1.xml','xl/workbook.xml']:
                    expected=parts[name].encode() if isinstance(parts[name],str) else parts[name]
                    assert z.read(name)==expected,('changed untouched part',name)
            sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            cell=sheet.find(f'.//{{{NS}}}c[@r="C8"]')
            assert ''.join(cell.itertext())=='Periksa terminal baterai sebelum assembly.'
            assert cell.attrib['s']=='2'
            assert sheet.find(f'.//{{{NS}}}c[@r="A8"]/{{{NS}}}v').text=='5'
            assert sheet.find(f'.//{{{NS}}}c[@r="A12"]/{{{NS}}}f').text=='SUM(A8:A9)'
            assert sheet.find(f'.//{{{NS}}}pageSetup').attrib['orientation']=='landscape'
            assert len(sheet.findall(f'.//{{{NS}}}mergeCell'))==9
        assert page.evaluate('db.notifications.length')==0
        logout(page);login(page,'admin')
        page.goto('http://127.0.0.1:4173/#templates')
        with page.expect_download() as result:page.locator('[data-action="download-template"][data-id="builtin-ik"]').click()
        assert Path(result.value.path()).read_bytes()==WORKBOOK,'Admin template changed'
        page.goto('http://127.0.0.1:4173/#authorizations')
        expect(page.get_by_role('table',name=re.compile('Otorisasi kategori'))).to_be_visible()
        page.get_by_role('searchbox',name='Cari kategori otorisasi').fill('OM-PR2')
        expect(page.locator('[data-category-search]:visible')).to_have_count(2)
        page.get_by_role('searchbox',name='Cari kategori otorisasi').fill('')
        for width in [320,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(100)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('authorization overflow',width)
        page.screenshot(path=str(ARTIFACTS/'authorization-table-preview.png'),full_page=True,animations='disabled')
        assert not external,external
        assert not errors,errors
        print(json.dumps({'checks':'admin template upload, user role restrictions, no bell, IK metadata-only form, copy+direct editor, merged cells/image/formula, edit/save/reload/multi-sheet/download roundtrip, original template unchanged, untouched ZIP entries byte-identical, table authorization, 4 viewport sizes','errors':errors,'external_requests':external,'document_id':doc_id}),flush=True)
        browser.close()
    

def test_extended_flow():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce')
        context.set_default_timeout(12000)
        errors=[]
        context.on('page',lambda pg:pg.on('pageerror',lambda error:errors.append(str(error))))
        context.on('console',lambda msg:errors.append(msg.type+': '+msg.text) if msg.type in ['warning','error'] else None)
        page=context.new_page();page.goto('http://127.0.0.1:4173/');login(page,'admin')
        upload(page,b'not-a-zip',valid=False)
        page.get_by_role('button',name='Batal',exact=True).click()
        macro=pack({'[Content_Types].xml':parts['[Content_Types].xml'].replace('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml','application/vnd.ms-excel.sheet.macroEnabled.main+xml')})
        upload(page,macro,valid=False)
        expect(page.locator('#template-error')).to_contain_text('macro')
        page.get_by_role('button',name='Batal',exact=True).click()
        upload(page,WORKBOOK)
        assert len(keys(page))==1
        expanded=pack({'xl/worksheets/sheet2.xml':parts['xl/worksheets/sheet2.xml'].replace('<sheetData>','<dimension ref="A1:T50"/><cols><col min="1" max="20" width="12"/></cols><sheetData>')})
        upload(page,expanded,'IK-layout.xlsx')
        page.wait_for_timeout(150)
        assert len(keys(page))==1,'Replaced template file leaked'
        invalid=pack({'xl/worksheets/sheet2.xml':parts['xl/worksheets/sheet2.xml'].replace('<sheetData>','<dimension ref="A1:T1048577"/><sheetData>')})
        upload(page,invalid,valid=False)
        expect(page.locator('#template-error')).to_contain_text('batas Excel')
        page.get_by_role('button',name='Batal',exact=True).click()
        # Legacy IK also has no upload/email controls, and keeps its existing file semantics.
        page.goto('http://127.0.0.1:4173/#master')
        page.locator('[data-action="edit-document"][data-id="doc-2"]').click()
        expect(page.locator('.document-attachment')).to_be_hidden()
        expect(page.locator('.document-email-recipients')).to_be_hidden()
        page.goto('http://127.0.0.1:4173/#home')
        logout(page);login(page,'user')
        page.goto('http://127.0.0.1:4173/#create')
        page.locator('#doc-title').fill('IK Roundtrip')
        choose(page,'Jenis dokumen','Instruksi Kerja');choose(page,'Kategori dokumen','LEGACY')
        save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_be_visible()
        original_id=page.url.split('#workbook-')[1]
        page.get_by_role('tab',name='Catatan',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="T50"]')).to_have_count(1)
        page.get_by_role('tab',name='Instruksi Kerja',exact=True).click()
        cell=page.locator('.workbook-cell[data-cell="C8"]')
        cell.fill('Teks\x0bterlarang')
        expect(cell).to_have_value('Isi langkah kerja di sini')
        for value in ['Versi 0','Versi 0 tersimpan','Draf perubahan']:
            cell.fill(value)
            page.get_by_role('button',name='Simpan Perubahan',exact=True).click()
            expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
            page.wait_for_timeout(100)
            assert len(keys(page))==2,'Previous document save leaked'
        cell.fill('Belum disimpan - jangan hilang')
        page.once('dialog',lambda dialog:dialog.dismiss())
        page.go_back()
        expect(page).to_have_url(re.compile('#workbook-'+original_id+'$'))
        expect(cell).to_have_value('Belum disimpan - jangan hilang')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        original_id=approve_and_publish(page,original_id)
        page.goto('http://127.0.0.1:4173/#create')
        page.get_by_role('button',name='Revisi Dokumen',exact=True).click()
        choose(page,'Pilih dokumen yang akan direvisi','IK Roundtrip')
        page.locator('#doc-title').fill('IK Roundtrip Revisi 1')
        page.locator('#change-notes').fill('Pembaruan langkah kerja')
        expect(page.locator('.document-attachment')).to_be_hidden()
        expect(page.locator('.document-email-recipients')).to_be_hidden()
        save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Belum disimpan - jangan hilang')
        revised_id=page.url.split('#workbook-')[1]
        assert original_id!=revised_id
        page.locator('.workbook-cell[data-cell="C8"]').fill('Isi revisi 1')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        revised_id=approve_and_publish(page,revised_id)
        page.goto('http://127.0.0.1:4173/#workbook-'+original_id)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Belum disimpan - jangan hilang')
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_attribute('readonly','')
        expect(page.get_by_role('button',name='Simpan Perubahan',exact=True)).to_have_count(0)
        assert len(keys(page))==3
        logout(page);login(page,'admin')
        page.goto('http://127.0.0.1:4173/#authorizations')
        choose(page,'Departemen','Production')
        page.get_by_role('checkbox',name='Izinkan LEGACY',exact=True).uncheck()
        page.get_by_role('button',name='Simpan Otorisasi',exact=True).click()
        logout(page);login(page,'user')
        page.goto('http://127.0.0.1:4173/#workbook-'+revised_id)
        expect(page.get_by_role('heading',name='Dokumen tidak tersedia',exact=True)).to_be_visible()
        expect(page.locator('.workbook-cell')).to_have_count(0)
        logout(page);login(page,'admin')
        page.goto('http://127.0.0.1:4173/#authorizations')
        choose(page,'Departemen','Production')
        page.get_by_role('checkbox',name='Izinkan LEGACY',exact=True).check()
        page.get_by_role('button',name='Simpan Otorisasi',exact=True).click()
        # Non-IK selections are email metadata only; they do not create in-app notices.
        page.goto('http://127.0.0.1:4173/#create')
        page.get_by_role('button',name='Buat Dokumen Baru',exact=True).click()
        page.locator('#doc-title').fill('Checksheet Email')
        choose(page,'Jenis dokumen','Checksheet');choose(page,'Kategori dokumen','LEGACY')
        expect(page.locator('.document-email-recipients')).to_be_visible()
        page.get_by_role('searchbox',name='Cari penerima email',exact=True).fill('budi')
        page.locator('.recipient-choice strong').click()
        save_and_open(page)
        expect(page.get_by_role('heading',name='Checksheet Email',exact=True)).to_be_visible()
        assert page.evaluate('db.notifications.length')==0
        assert page.evaluate('db.documentRequests.find(doc=>doc.title==="Checksheet Email").emailStatus')=='not_configured'
        assert page.evaluate('db.documentRequests.find(doc=>doc.title==="Checksheet Email").emailRecipientIds')==['u-qa']
        # Published request audit retains its file and official version cannot be deleted.
        page.goto('http://127.0.0.1:4173/#master')
        expect(page.locator('[data-action="delete-doc"][data-id="'+revised_id+'"]')).to_be_disabled()
        assert len(keys(page))==3,'Approved artifacts must remain available for the audit'
        assert not errors,errors
        print(json.dumps({'checks':'invalid upload, template replacement cleanup, blank template dimensions and limits, legacy IK controls, invalid XML text rejected, old save files cleaned, browser Back cancel retains draft, source revision copied independently, archived readonly, permission revoke blocks editor, email metadata not sent, approved files retained for audit','errors':errors}),flush=True)
        context.close()
        # Validate the file:// entrypoint and IndexedDB path without the server.
        context=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
        page=context.new_page();page.goto((ROOT/'index.html').as_uri());login(page,'admin')
        upload(page,WORKBOOK,'IK-local.xlsx')
        page.goto(page.url.split('#')[0]+'#create')
        page.locator('#doc-title').fill('IK Lokal')
        choose(page,'Jenis dokumen','Instruksi Kerja');choose(page,'Kategori dokumen','LEGACY')
        save_and_open(page)
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Isi langkah kerja di sini')
        page.locator('.workbook-cell[data-cell="C8"]').fill('Tersimpan dari file lokal')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload()
        expect(page.locator('.workbook-cell[data-cell="C8"]')).to_have_value('Tersimpan dari file lokal')
        print('File-local template upload/edit/save/refresh passed.',flush=True)
        browser.close()
    

def test_expansion_flow():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce')
        context.set_default_timeout(15000);errors=[]
        context.on('page',lambda pg:pg.on('pageerror',lambda error:errors.append(str(error))))
        context.on('console',lambda msg:errors.append(msg.type+': '+msg.text) if msg.type in ['warning','error'] else None)
        page=context.new_page();page.goto('http://127.0.0.1:4173/');login(page,'admin')
        large_sheet=parts['xl/worksheets/sheet2.xml'].replace('<sheetData>','<dimension ref="A1:CR950"/><sheetData>').replace('<row r="1">','<row r="1"><c r="C1" t="inlineStr"><is><t>Merged area</t></is></c>').replace('</worksheet>','<mergeCells count="1"><mergeCell ref="C1:C200"/></mergeCells></worksheet>')
        upload(page,pack({'xl/worksheets/sheet2.xml':large_sheet}),'Area besar.xlsx')
        logout(page);login(page,'user');page.goto('http://127.0.0.1:4173/#create')
        page.locator('#doc-title').fill('IK Area Diperluas');choose(page,'Jenis dokumen','Instruksi Kerja');choose(page,'Kategori dokumen','LEGACY')
        save_and_open(page);expect(page.locator('.workbook-sheet')).to_have_attribute('aria-rowcount','1001');expect(page.locator('.workbook-sheet')).to_have_attribute('aria-colcount','1001');document_url=page.url
        grid=page.locator('#workbook-grid');grid.hover();page.mouse.wheel(200000,50000);page.wait_for_timeout(350)
        assert page.locator('.workbook-cell[data-cell="ALL1000"]').count()==1,page.evaluate('({top:document.getElementById("workbook-grid").scrollTop,left:document.getElementById("workbook-grid").scrollLeft})')
        page.locator('.workbook-cell[data-cell="ALL1000"]').fill('Isi di luar area template awal')
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.get_by_role('tab',name='Catatan',exact=True).click();expect(page.locator('.workbook-sheet')).to_have_attribute('aria-rowcount','1001');expect(page.locator('.workbook-sheet')).to_have_attribute('aria-colcount','1001')
        rendered=page.locator('.workbook-cell').count();assert rendered<3500,('Too many mounted cells',rendered)
        grid.hover();page.mouse.wheel(200000,50000);page.wait_for_timeout(350)
        assert page.locator('.workbook-cell[data-cell="ALL1000"]').count()==1
        page.locator('.workbook-cell[data-cell="ALL1000"]').fill('Sel terakhir tersimpan');page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload();expect(page.locator('.workbook-sheet')).to_have_attribute('aria-rowcount','1001');expect(page.locator('.workbook-sheet')).to_have_attribute('aria-colcount','1001');page.get_by_role('tab',name='Catatan',exact=True).click()
        grid.hover();page.mouse.wheel(200000,50000);page.wait_for_timeout(350);assert page.locator('.workbook-cell[data-cell="ALL1000"]').count()==1
        expect(page.locator('.workbook-cell[data-cell="ALL1000"]')).to_have_value('Sel terakhir tersimpan')
        grid.hover();page.mouse.wheel(-200000,-23000);page.wait_for_timeout(350)
        assert page.locator('.workbook-cell[data-cell="C1"]').count()==1
        expect(page.locator('.workbook-cell[data-cell="C1"]')).to_have_value('Merged area')
        with page.expect_download() as download:page.get_by_role('button',name='Unduh Excel',exact=True).click()
        with zipfile.ZipFile(download.value.path()) as z:
            first=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));second=ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
            assert first.find(f'{{{NS}}}dimension').attrib['ref']=='A1:ALL1000';assert second.find(f'{{{NS}}}dimension').attrib['ref']=='A1:ALL1000'
            assert ''.join(first.find(f'.//{{{NS}}}c[@r="ALL1000"]').itertext())=='Isi di luar area template awal'
            assert ''.join(second.find(f'.//{{{NS}}}c[@r="ALL1000"]').itertext())=='Sel terakhir tersimpan'
            assert second.find(f'.//{{{NS}}}mergeCell').attrib['ref']=='C1:C200';assert first.find(f'.//{{{NS}}}c[@r="A12"]/{{{NS}}}f').text=='SUM(A8:A9)'
            assert z.read('xl/styles.xml')==parts['xl/styles.xml'].encode();assert z.read('xl/media/image1.png')==parts['xl/media/image1.png']
        for width in [320,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(100);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.screenshot(path=str(ARTIFACTS/'excel-expanded-preview.png'),full_page=True,animations='disabled')
        request_id=document_url.split('#workbook-')[1];page.goto('http://127.0.0.1:4173/#request-'+request_id)
        select_approver(page,'u-admin');select_approver(page,'u-qa');page.get_by_role('button',name='Ajukan Persetujuan',exact=True).click();expect(page.locator('.request-summary .request-status')).to_have_text('Menunggu persetujuan')
        logout(page);page.locator('#email').fill('budi@docuflow.id');page.locator('#password').fill('user123');page.get_by_role('button',name='Masuk ke workspace').click();page.goto(document_url)
        expect(page.locator('.workbook-sheet')).to_have_attribute('aria-rowcount','1001');expect(page.locator('.workbook-sheet')).to_have_attribute('aria-colcount','1001');expect(page.locator('.excel-ribbon')).to_have_count(0)
        assert not errors,errors
        print(json.dumps({'checks':'default 1000x1000, two-axis wheel to last cell, save/reload/export, virtual merge, formulas/styles/images preserved, readonly ribbon denied, four viewport sizes','max_mounted_cells':rendered,'logical_cells':1000000,'errors':errors}),flush=True);browser.close()


if __name__ == '__main__':
    test_primary_flow()
    test_extended_flow()
    test_expansion_flow()
    print('Browser artifacts:', ARTIFACTS)

