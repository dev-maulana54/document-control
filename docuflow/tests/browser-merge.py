"""Excel merge keeps the physical top-left cell; keyboard Undo restores discarded data."""
import importlib.util,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'));ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux)
fixture=ux.fixture
from playwright.sync_api import sync_playwright,expect

def exported(page):
    with page.expect_download() as dl:page.get_by_role('button',name='Unduh Excel',exact=True).click()
    with zipfile.ZipFile(dl.value.path()) as z:return {name:z.read(name) for name in z.namelist()}

def cell_xml(data,ref):
    return ET.fromstring(data['xl/worksheets/sheet1.xml']).find(f'.//{{{fixture.NS}}}c[@r="{ref}"]')

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1600,'height':1100},accept_downloads=True,reduced_motion='reduce');context.set_default_timeout(12000)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        changes={
            'xl/worksheets/sheet1.xml':fixture.parts['xl/worksheets/sheet1.xml'].replace('</sheetData>','<row r="20"><c r="N20" s="1" t="s"><v>0</v></c><c r="P20"><v>0</v></c><c r="R20" s="2" t="inlineStr"><is><r><rPr><b/></rPr><t xml:space="preserve">Catatan </t></r><r><t>penting</t></r></is></c></row></sheetData>'),
            'xl/_rels/workbook.xml.rels':fixture.parts['xl/_rels/workbook.xml.rels'].replace('</Relationships>',f'<Relationship Id="calc" Type="{fixture.REL}/calcChain" Target="calcChain.xml"/></Relationships>'),
            '[Content_Types].xml':fixture.parts['[Content_Types].xml'].replace('</Types>','<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>'),
            'xl/calcChain.xml':f'<calcChain xmlns="{fixture.NS}"><c r="A12" i="1"/></calcChain>',
            'xl/worksheets/sheet2.xml':fixture.parts['xl/worksheets/sheet2.xml'].replace('</sheetData>','<row r="3"><c r="M3"><f t="shared" ref="M3:M5" si="0">A8+1</f><v>2</v></c><c r="P3"><f t="array" ref="P3:P5">A8:A10+1</f><v>2</v></c></row><row r="4"><c r="M4"><f t="shared" si="0"/><v>3</v></c><c r="P4"><v>3</v></c></row><row r="5"><c r="M5"><f t="shared" si="0"/><v>1</v></c><c r="P5"><v>1</v></c></row></sheetData>')
        }
        page.goto(ux.approval.BASE);fixture.login(page,'admin');fixture.upload(page,fixture.pack(changes))
        page.goto(ux.approval.BASE+'#create');page.locator('#doc-title').fill('Merge Excel dan shortcut');fixture.choose(page,'Jenis dokumen','Instruksi Kerja');fixture.choose(page,'Kategori dokumen','LEGACY');fixture.save_and_open(page)
        route=page.url
        page.get_by_role('tab',name='Insert',exact=True).click();page.get_by_role('button',name='Sisipkan gambar',exact=True).click();page.get_by_label('File gambar',exact=True).set_input_files({'name':'cbi.png','mimeType':'image/png','buffer':ux.SMALL_PNG});page.get_by_role('button',name='Masukkan Gambar',exact=True).click();expect(page.locator('.workbook-image')).to_have_count(2);page.get_by_role('tab',name='Home',exact=True).click()
        ux.go(page,'A8:A12');page.get_by_role('button',name='Gabungkan sel',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_count(0)
        expect(page.locator('.workbook-cell[data-cell="A8"]')).to_have_value('1');expect(page.locator('.workbook-cell[data-cell="A8"]')).to_be_focused()
        merged=exported(page)
        for ref in ['A9','A12']:
            cell=cell_xml(merged,ref);assert cell is None or not list(cell),ET.tostring(cell)
        assert 'xl/calcChain.xml' not in merged
        assert b'/calcChain' not in merged['xl/_rels/workbook.xml.rels'] and b'/xl/calcChain.xml' not in merged['[Content_Types].xml']
        repeated=exported(page);assert b'/xl/calcChain.xml' not in repeated['[Content_Types].xml'],'Repeated image export restored a deleted calcChain override'
        page.locator('.workbook-cell[data-cell="A8"]').focus();page.keyboard.press('Control+z')
        expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_value('2');expect(page.locator('.workbook-cell[data-cell="A12"]')).to_have_attribute('readonly','')
        restored=exported(page);assert cell_xml(restored,'A12').find(f'{{{fixture.NS}}}f').text=='SUM(A8:A9)';assert cell_xml(restored,'A12').find(f'{{{fixture.NS}}}v').text=='3'
        page.locator('.workbook-cell[data-cell="A8"]').focus();page.keyboard.press('Control+y');expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_count(0)
        page.keyboard.press('Control+z');expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_value('2')
        page.keyboard.press('Control+Shift+z');expect(page.locator('.workbook-cell[data-cell="A9"]')).to_have_count(0);page.keyboard.press('Control+z')
        # A blank physical top-left stays blank, regardless of drag direction.
        ux.go(page,'K5');page.locator('.workbook-cell[data-cell="K5"]').fill('Tambah kan\napa ini');ux.drag(page,'K5','K3');page.get_by_role('button',name='Gabungkan sel',exact=True).click()
        expect(page.locator('.workbook-cell[data-cell="K3"]')).to_have_value('');page.keyboard.press('Control+z');expect(page.locator('.workbook-cell[data-cell="K5"]')).to_have_value('Tambah kan\napa ini')
        for address,master,value in [('N20:N22','N20','INSTRUKSI KERJA'),('P20:P22','P20','0'),('R20:R22','R20','Catatan penting')]:
            ux.go(page,address);page.get_by_role('button',name='Gabungkan sel',exact=True).click();expect(page.locator(f'.workbook-cell[data-cell="{master}"]')).to_have_value(value)
        typed=exported(page);shared=cell_xml(typed,'N20');assert shared.attrib['t']=='s' and shared.find(f'{{{fixture.NS}}}v').text=='0'
        assert cell_xml(typed,'P20').find(f'{{{fixture.NS}}}v').text=='0';rich=cell_xml(typed,'R20');assert len(rich.findall(f'.//{{{fixture.NS}}}r'))==2
        assert rich.find(f'.//{{{fixture.NS}}}rPr/{{{fixture.NS}}}b') is not None
        ux.go(page,'J4:K5');page.keyboard.press('Control+b');page.keyboard.press('Control+i');page.keyboard.press('Control+u')
        expect(page.locator('.workbook-cell[data-cell="J4"]')).to_be_focused()
        styles=page.locator('.workbook-cell[data-cell="J4"]').evaluate('(el)=>{const s=getComputedStyle(el);return [s.fontWeight,s.fontStyle,s.textDecorationLine]}');assert styles==['700','italic','underline'],styles
        font=page.get_by_role('combobox',name='Font',exact=True);font.focus();before=page.evaluate('activeWorkbook.undo.length');font.press('Control+z');assert page.evaluate('activeWorkbook.undo.length')==before
        page.keyboard.press('Escape');ux.go(page,'U4');page.locator('.workbook-cell[data-cell="U4"]').fill('Undo lintas sheet');expect(page.locator('.workbook-cell[data-cell="U4"]')).to_have_value('Undo lintas sheet');page.get_by_role('tab',name='Catatan',exact=True).click();page.keyboard.press('Control+z');expect(page.locator('.workbook-cell[data-cell="U4"]')).to_have_value('');page.keyboard.press('Control+y');expect(page.locator('.workbook-cell[data-cell="U4"]')).to_have_value('Undo lintas sheet');expect(page.locator('.workbook-cell[data-cell="U4"]')).to_be_focused()
        ux.go(page,'J4');page.keyboard.press('Control+s');expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload();ux.go(page,'N20');expect(page.locator('.workbook-cell[data-cell="N20"]')).to_have_value('INSTRUKSI KERJA')
        # Partial shared/array formulas must not leave definitions orphaned outside the merge.
        page.get_by_role('tab',name='Catatan',exact=True).click();ux.go(page,'L3:M3');page.get_by_role('button',name='Gabungkan sel',exact=True).click();expect(page.locator('#toast')).to_contain_text('rumus bersama');expect(page.locator('.workbook-cell[data-cell="M3"]')).to_have_value('2')
        ux.go(page,'L3:M5');page.get_by_role('button',name='Gabungkan sel',exact=True).click();expect(page.locator('.workbook-cell[data-cell="M3"]')).to_have_count(0);page.keyboard.press('Control+z');expect(page.locator('.workbook-cell[data-cell="M4"]')).to_have_value('3')
        ux.go(page,'O3:P3');page.get_by_role('button',name='Gabungkan sel',exact=True).click();expect(page.locator('#toast')).to_contain_text('rumus array');expect(page.locator('.workbook-cell[data-cell="P3"]')).to_have_value('2')
        ux.go(page,'O3:P5');page.get_by_role('button',name='Gabungkan sel',exact=True).click();expect(page.locator('.workbook-cell[data-cell="P3"]')).to_have_count(0);page.keyboard.press('Control+z');expect(page.locator('.workbook-cell[data-cell="P4"]')).to_have_value('3')
        restored=exported(page);sheet2=ET.fromstring(restored['xl/worksheets/sheet2.xml']);assert sheet2.find(f'.//{{{fixture.NS}}}c[@r="M3"]/{{{fixture.NS}}}f').text=='A8+1';assert sheet2.find(f'.//{{{fixture.NS}}}c[@r="P3"]/{{{fixture.NS}}}f').attrib['t']=='array'
        page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.goto(route+'?view');expect(page.locator('.excel-ribbon')).to_have_count(0);cell=page.locator('.workbook-cell[data-cell="A8"]');cell.focus();page.keyboard.press('Control+z');page.keyboard.press('Control+b');page.keyboard.press('Control+s');expect(cell).to_have_value('1');expect(cell).to_have_attribute('readonly','')
        assert not errors,errors;print('PASS Excel top-left/blank merge, formula deletion+calcChain export, full Undo/Redo, Ctrl+Z/Y/ShiftZ/S/B/I/U, native font input and read-only guard',flush=True)
        page.once('dialog',lambda dialog:dialog.accept());browser.close()

if __name__=='__main__':run()
