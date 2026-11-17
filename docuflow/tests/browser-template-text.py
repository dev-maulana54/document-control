"""Regressions for native DrawingML labels and vertically centered wrapped cells."""
import importlib.util
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
BASE='http://127.0.0.1:4173/'


def banner_fixture():
    ns=f.NS
    styles=f'''<styleSheet xmlns="{ns}"><fonts count="1"><font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Bookman Old Style"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF008000"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf fontId="0" fillId="2" borderId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>'''
    sheet=f'''<worksheet xmlns="{ns}"><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="6" width="10"/></cols><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>KAMI MEMPERHATIKAN  KESELAMATAN DAN KESEHATAN KERJA</t></is></c></row><row r="2"/><row r="3"/></sheetData><mergeCells count="1"><mergeCell ref="A1:F3"/></mergeCells></worksheet>'''
    return f.pack({'xl/styles.xml':styles,'xl/worksheets/sheet1.xml':sheet})


def drawing_metrics(page,scale=(1,1)):
    return page.evaluate('''async scale=>{
      const x='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',a='http://schemas.openxmlformats.org/drawingml/2006/main';
      const shape=WorkbookEngine.parseXml(`<xdr:grpSp xmlns:xdr="${x}" xmlns:a="${a}"><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="952500"/><a:chOff x="0" y="0"/><a:chExt cx="952500" cy="952500"/></a:xfrm></xdr:grpSpPr><xdr:sp><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="800000" cy="600000"/></a:xfrm><a:prstGeom prst="rect"/><a:noFill/><a:ln><a:noFill/></a:ln></xdr:spPr><xdr:txBody><a:bodyPr lIns="9144" tIns="18288" rIns="0" bIns="0"/><a:p><a:pPr><a:defRPr sz="1000"/></a:pPr><a:r><a:rPr sz="1000"><a:latin typeface="Century Gothic"/></a:rPr><a:t>HELMET</a:t></a:r></a:p><a:p><a:pPr><a:lnSpc><a:spcPts val="1100"/></a:lnSpc><a:defRPr sz="1000"/></a:pPr><a:r><a:rPr sz="1000"/><a:t>SAFETY SHOES</a:t></a:r></a:p></xdr:txBody></xdr:sp></xdr:grpSp>`).documentElement;
      const extent=WorkbookEngine.child(WorkbookEngine.child(WorkbookEngine.child(shape,'grpSpPr'),'xfrm'),'ext');extent.setAttribute('cx',952500*scale[0]);extent.setAttribute('cy',952500*scale[1]);
      const url=await workbookDrawingPreview({},shape,new Map()),xml=WorkbookEngine.parseXml(decodeURIComponent(url.split(',').slice(1).join(','))),svg=document.importNode(xml.documentElement,true);svg.style.position='fixed';svg.style.top='0';svg.style.left='0';document.body.appendChild(svg);
      try{return [...svg.querySelectorAll('text')].map(text=>({text:text.textContent,width:text.getBoundingClientRect().width,height:text.getBoundingClientRect().height,size:Number(text.getAttribute('font-size'))}));}finally{svg.remove();}
    }''',list(scale))


def banner_metrics(page,reference='A1'):
    return page.locator('.workbook-cell[data-cell="'+reference+'"]').evaluate('''input=>{
      const clone=input.cloneNode(true);clone.value=input.value;Object.assign(clone.style,{position:'absolute',height:'0px',width:getComputedStyle(input).width,paddingTop:'0px',paddingBottom:'0px',visibility:'hidden'});input.parentElement.appendChild(clone);const content=clone.scrollHeight;clone.remove();
      return {height:input.clientHeight,paddingTop:parseFloat(getComputedStyle(input).paddingTop),content,scrollHeight:input.scrollHeight,font:getComputedStyle(input).fontFamily};
    }''')


def run(workbook=None):
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1600,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE)
        labels=drawing_metrics(page)
        f.login(page,'admin');f.upload(page,banner_fixture());page.goto(BASE+'#create');page.locator('#doc-title').fill('Wrapped template text');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
        banner=banner_metrics(page);print('Drawing labels:',labels,'Banner:',banner,flush=True)
        failures=[]
        if not 10<=labels[0]['height']<=20 or labels[0]['width']<35:failures.append('DrawingML label was reduced by the SVG font-size clamp')
        if banner['content']+banner['paddingTop']>banner['height']+1:failures.append('Wrapped banner clips its second line')
        if abs(banner['paddingTop']-max(0,(banner['height']-banner['content'])/2))>1.1:failures.append('Wrapped banner is not vertically centered using its actual wrapped height')
        assert not failures,failures
        stretched=drawing_metrics(page,(2,.5))
        assert abs(stretched[0]['width']-labels[0]['width'])<1, 'Anisotropic group scale stretched the label letters'
        assert abs(stretched[0]['height']-labels[0]['height'])<1, 'Group coordinates changed the label font size'
        for zoom in [55,175]:
            page.evaluate('(zoom)=>setWorkbookZoom(zoom)',zoom)
            actual=banner_metrics(page)
            assert actual['content']+actual['paddingTop']<=actual['height']+1,(zoom,actual)
        if workbook:
            page.get_by_role('link',name='Ke Permintaan',exact=True).click()
            f.upload(page,Path(workbook).read_bytes())
            page.goto(BASE+'#create');page.locator('#doc-title').fill('Original template labels');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
            native=page.evaluate('''()=>{const image=activeWorkbook.book.sheets[0].images.find(n=>n.anchorIndex===7),xml=WorkbookEngine.parseXml(decodeURIComponent(image.source.split(',').slice(1).join(','))),svg=document.importNode(xml.documentElement,true);svg.style.position='fixed';svg.style.top='0';svg.style.left='0';document.body.appendChild(svg);try{const r=svg.getBoundingClientRect();return [...svg.querySelectorAll('text')].map(t=>{const b=t.getBoundingClientRect();return {text:t.textContent.trim(),width:b.width,height:b.height,inside:b.right<=r.right+1&&b.bottom<=r.bottom+1&&b.x>=r.x-1&&b.y>=r.y-1};});}finally{svg.remove();}}''')
            assert {n['text'] for n in native}=={'HELMET','SAFETY','SHOES','SARUNG','TANGAN','EAR PLUG','MASKER','APRON','KACAMATA'},native
            assert all(n['inside'] and n['height']>=10 and n['width']>=25 for n in native),native
            for zoom in [55,100,175]:
                page.evaluate('(zoom)=>{setWorkbookZoom(zoom);ensureWorkbookCellVisible("AL48");}',zoom)
                actual=banner_metrics(page,'AL48')
                assert actual['content']+actual['paddingTop']<=actual['height']+1,(zoom,actual)
            page.evaluate('()=>{setWorkbookZoom(100);const g=document.getElementById("workbook-grid");g.scrollTop=activeWorkbook.gridLayout.y[37];g.scrollLeft=activeWorkbook.gridLayout.x[20];}')
            page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            page.screenshot(path=str(f.ARTIFACTS/'native-template-readable-footer.png'))
            print('PASS all seven original safety labels/line breaks, banner at 55/100/175%, screenshot:',f.ARTIFACTS/'native-template-readable-footer.png',flush=True)
        assert not errors,errors
        browser.close();print('PASS readable native drawing labels and centered multi-line banner without clipping',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--workbook');run(parser.parse_args().workbook)
