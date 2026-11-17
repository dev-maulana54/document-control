"""Import fidelity regression; uses synthetic XML, never stores a user's workbook.

Optional local-only check: python tests/browser-template-fidelity.py --workbook PATH
Run against an existing isolated preview with --base http://127.0.0.1:4173/.
"""
import argparse
import base64
import importlib.util
import io
import zipfile
import struct
from pathlib import Path

from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('browser-workbook.py'))
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
NS = fixture.NS


def synthetic():
    styles = f'''<styleSheet xmlns="{NS}"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><sz val="24"/><name val="Arial"/><color indexed="9"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor indexed="10"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color indexed="64"/></left><right style="thin"><color auto="1"/></right></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs></styleSheet>'''
    sheet = f'''<worksheet xmlns="{NS}"><sheetViews><sheetView workbookViewId="0" zoomScale="55" showGridLines="0"><pane state="frozen" xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight"/><selection pane="bottomRight" activeCell="C4" sqref="C4"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="12.75" defaultColWidth="9.140625"/><cols><col min="1" max="3" width="5.5703125" customWidth="1"/><col min="4" max="4" width="3.42578125" hidden="1" customWidth="1"/></cols><sheetData><row r="1" ht="17.25" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>MODEL</t></is></c></row><row r="2" ht="17.25" customHeight="1"/></sheetData><mergeCells count="1"><mergeCell ref="A1:C2"/></mergeCells></worksheet>'''
    return fixture.pack({'xl/styles.xml': styles, 'xl/worksheets/sheet1.xml': sheet})


def inspect(page, raw):
    return page.evaluate('''async encoded=>{
      const book=await WorkbookEngine.open(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer);
      const sheet=book.sheets[0],cell=sheet.cells.get('A1'),style=book.styles[Number(cell.getAttribute('s'))];
      const result={style,view:sheet.initialView,defaultHeight:WorkbookEngine.axisDefault(sheet,'row'),firstColumnWidth:WorkbookEngine.axisOffset(sheet,'column',1),merges:sheet.merges.length};
      const bytes=await WorkbookEngine.serialize(book);let binary='';for(const n of new Uint8Array(bytes))binary+=String.fromCharCode(n);result.serialized=btoa(binary);return result;
    }''', base64.b64encode(raw).decode())


def assert_preserved(raw, encoded):
    with zipfile.ZipFile(io.BytesIO(raw)) as before, zipfile.ZipFile(io.BytesIO(base64.b64decode(encoded))) as after:
        assert set(before.namelist()) == set(after.namelist()), 'No-op template export changed package parts'
        for part in before.namelist():
            assert before.read(part) == after.read(part), 'No-op template export changed ' + part


def emf_bitmap():
    header=bytearray(88)
    struct.pack_into('<IIiiii',header,0,1,88,0,0,2,1)
    struct.pack_into('<I',header,40,0x464d4520)
    record=bytearray(156)
    struct.pack_into('<II',record,0,77,156)
    struct.pack_into('<I',record,40,0x00cc0020)
    struct.pack_into('<IIIIii',record,84,108,40,148,8,2,1)
    struct.pack_into('<IiiHHII',record,108,40,2,1,1,24,0,8)
    record[148:]=bytes([0,0,255,0,255,0,0,0])
    return bytes(header+record+struct.pack('<IIIII',14,20,0,0,20))


def group_fixture():
    a='http://schemas.openxmlformats.org/drawingml/2006/main'
    x='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
    r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    drawing=f'''<xdr:wsDr xmlns:xdr="{x}" xmlns:a="{a}" xmlns:r="{r}"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="1" name="Native group"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="952500"/><a:chOff x="0" y="0"/><a:chExt cx="100" cy="100"/></a:xfrm></xdr:grpSpPr><xdr:sp><xdr:nvSpPr><xdr:cNvPr id="2" name="Native rectangle"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="40" cy="40"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="12700"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:ln></xdr:spPr></xdr:sp><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="3" name="Nested bitmap"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="45" y="0"/><a:ext cx="50" cy="50"/></a:xfrm></xdr:spPr></xdr:pic></xdr:grpSp><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>'''
    rels=f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{r}/image" Target="../media/nested.emf"/></Relationships>'
    return fixture.pack({'xl/drawings/drawing1.xml':drawing,'xl/drawings/_rels/drawing1.xml.rels':rels,'xl/media/nested.emf':emf_bitmap()})


def run(base, workbook=None):
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        page=browser.new_page(viewport={'width':1600,'height':1000})
        page.goto(base)
        raw=synthetic()
        data=inspect(page,raw)
        assert data['style']['color'].lower() == '#ffffff', 'Indexed 9 font must be white'
        assert data['style']['background'].lower() == '#ff0000', 'Indexed 10 fill must be red'
        assert data['style']['borders']['left'].lower().endswith('#000000'), 'Indexed 64 automatic border must be black'
        assert data['style']['borders']['right'].lower().endswith('#000000'), 'Auto border must be black'
        assert data['view']['zoom'] == 55, 'Saved native zoom was ignored'
        assert data['view']['gridlines'] is False, 'Saved native gridline visibility was ignored'
        assert data['view']['freeze'] == {'rows':3,'columns':2}, 'Native frozen pane counts were ignored'
        assert data['defaultHeight'] == 17, 'Default row height changed'
        assert abs(data['firstColumnWidth']-39) <= 1, 'Stored OOXML width already includes Excel padding; it must not receive another 5 pixels'
        assert data['merges'] == 1
        assert_preserved(raw,data['serialized'])
        resized=page.evaluate('''async encoded=>{
          const book=await WorkbookEngine.open(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer);
          WorkbookFormat.resize(book,0,'B4','column',5);
          const bytes=await WorkbookEngine.serialize(book),again=await WorkbookEngine.open(bytes),sheet=again.sheets[0];
          const column=WorkbookEngine.elements(sheet.xml,'col').findLast(col=>Number(col.getAttribute('min'))<=2&&Number(col.getAttribute('max'))>=2);
          return {pixels:WorkbookEngine.axisOffset(sheet,'column',2)-WorkbookEngine.axisOffset(sheet,'column',1),storedWidth:Number(column.getAttribute('width'))};
        }''',base64.b64encode(raw).decode())
        assert abs(resized['pixels']-40)<=1, 'UI Column Width 5 must remain about 40 pixels after save/reopen'
        assert 5<resized['storedWidth']<6, 'UI character width must be encoded with Excel padding before writing OOXML'
        group=page.evaluate('''async encoded=>{
          const raw=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),book=await WorkbookEngine.open(raw.buffer),sheet=book.sheets[0],image=sheet.images[0];
          const svg=WorkbookEngine.parseXml(decodeURIComponent(image.source.split(',').slice(1).join(','))),previewStroke=svg.querySelector('rect').getAttribute('stroke-width'),nested=svg.querySelector('image').getAttribute('href');
          sheet.imageMoves={[image.anchorIndex]:{...image,width:200,height:150}};book.modified.add(0);
          const bytes=await WorkbookEngine.serialize(book),zip=await JSZip.loadAsync(bytes),drawing=WorkbookEngine.parseXml(await zip.file('xl/drawings/drawing1.xml').async('string')),group=WorkbookEngine.elements(drawing,'grpSp')[0],root=WorkbookEngine.child(WorkbookEngine.child(group,'grpSpPr'),'xfrm'),child=WorkbookEngine.elements(WorkbookEngine.child(group,'sp'),'xfrm')[0];
          return {previewStroke:Number(previewStroke),nested,rootWidth:Number(WorkbookEngine.child(root,'ext').getAttribute('cx')),childWidth:Number(WorkbookEngine.child(child,'ext').getAttribute('cx')),embedded:[...await zip.file('xl/media/nested.emf').async('uint8array')]};
        }''',base64.b64encode(group_fixture()).decode())
        assert group['previewStroke']<2, 'Nested-group line width must respect its coordinate scale'
        assert group['nested'].startswith('data:image/bmp;base64,'), 'StretchBlt pixels vanished from the browser preview'
        assert group['rootWidth']==200*9525 and group['childWidth']==40, 'Group resize overwrote child drawing geometry'
        assert bytes(group['embedded'])==emf_bitmap(), 'Preview/resize changed original metafile bytes'
        if workbook:
            original=Path(workbook).read_bytes()
            data=inspect(page,original)
            assert_preserved(original,data['serialized'])
            assert data['view']['zoom'] == 55
            print('PASS original workbook import/no-op export preserves every XML and media part')
        browser.close()
        print('PASS indexed/automatic colors, native view/zoom/freeze, dimensions/merges, group preview/resize/EMF bitmap and package integrity')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:4173/')
    parser.add_argument('--workbook')
    args=parser.parse_args()
    run(args.base,args.workbook)
