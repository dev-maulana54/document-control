"""Imported DrawingML footer labels keep line breaks and fit their text boxes."""
from pathlib import Path
import importlib.util
from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('browser-workbook.py'))
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)


def render(page, zoom):
    return page.evaluate('''async zoom=>{
      const x='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',a='http://schemas.openxmlformats.org/drawingml/2006/main';
      const emu=n=>n*9525, shape=(offset,body)=>`<xdr:sp><xdr:spPr><a:xfrm><a:off x="${emu(offset)}" y="0"/><a:ext cx="${emu(130)}" cy="${emu(80)}"/></a:xfrm><a:prstGeom prst="rect"/><a:noFill/><a:ln><a:noFill/></a:ln></xdr:spPr><xdr:txBody>${body}</xdr:txBody></xdr:sp>`;
      const props='<a:bodyPr wrap="square" horzOverflow="clip" vertOverflow="clip" lIns="19050" rIns="19050" tIns="19050" bIns="19050" anchor="ctr"/>';
      const body=props+'<a:p><a:pPr algn="ctr"><a:defRPr sz="1200"><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:r><a:rPr b="1"/><a:t>SAFETY</a:t></a:r><a:br/><a:r><a:t>SHOES</a:t></a:r></a:p>';
      const wrapped=props+'<a:p><a:pPr algn="ctr"><a:defRPr sz="1200"><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:r><a:t>Aspek keselamatan dan kualitas kerja</a:t></a:r></a:p>';
      const xml=WorkbookEngine.parseXml(`<xdr:grpSp xmlns:xdr="${x}" xmlns:a="${a}"><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(280)}" cy="${emu(80)}"/><a:chOff x="0" y="0"/><a:chExt cx="${emu(280)}" cy="${emu(80)}"/></a:xfrm></xdr:grpSpPr>${shape(0,body)}${shape(140,wrapped)}</xdr:grpSp>`);
      const source=await workbookDrawingPreview({},xml.documentElement,new Map()),doc=WorkbookEngine.parseXml(decodeURIComponent(source.slice(source.indexOf(',')+1))),svg=document.importNode(doc.documentElement,true);
      document.getElementById('render-clarity')?.remove();const host=document.createElement('div');host.id='render-clarity';Object.assign(host.style,{position:'fixed',top:'80px',left:'40px',background:'white',padding:'10px',border:'1px solid #ccc'});host.appendChild(svg);document.body.appendChild(host);
      const text=[...svg.querySelectorAll('text')].map(node=>{const rect=node.getBoundingClientRect();return {text:node.textContent,x:rect.x,y:rect.y,width:rect.width,height:rect.height,size:Number(node.getAttribute('font-size')),weight:node.getAttribute('font-weight')};});
      const clips=[...svg.querySelectorAll('clipPath rect')].map(rect=>({width:Number(rect.getAttribute('width'))/9525,height:Number(rect.getAttribute('height'))/9525}));
      // The application displays an inert SVG image, whose text lays out at
      // native image size before the worksheet zooms the resulting image.
      svg.remove();const image=document.createElement('img');image.src=source;host.appendChild(image);await image.decode();host.style.zoom=zoom/100;
      return {text,source,clips,imageWidth:image.getBoundingClientRect().width/(zoom/100)};
    }''', zoom)


def edge_checks(page):
    return page.evaluate('''async()=>{
      const x='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',a='http://schemas.openxmlformats.org/drawingml/2006/main';
      async function inspect(flags,content,width=100){
        const xml=WorkbookEngine.parseXml(`<xdr:sp xmlns:xdr="${x}" xmlns:a="${a}"><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width*9525}" cy="952500"/></a:xfrm><a:prstGeom prst="rect"/></xdr:spPr><xdr:txBody><a:bodyPr ${flags}/><a:p><a:pPr><a:defRPr sz="1200"/></a:pPr>${content}</a:p></xdr:txBody></xdr:sp>`),before=new XMLSerializer().serializeToString(xml);
        let result;
        try{const source=await workbookDrawingPreview({},xml.documentElement,new Map()),doc=WorkbookEngine.parseXml(decodeURIComponent(source.slice(source.indexOf(',')+1)));result={lines:[...doc.querySelectorAll('text')].map(n=>n.textContent),clip:[...doc.querySelectorAll('clipPath rect')].map(n=>Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(n.getAttribute(key))/9525])))};}
        catch(error){result={error:error.message};}
        result.unchanged=new XMLSerializer().serializeToString(xml)===before;return result;
      }
      const run=text=>`<a:r><a:t>${text}</a:t></a:r>`,overflow=run('No wrap text '.repeat(5));
      return {none:await inspect('wrap="none"',overflow),vertical:await inspect('wrap="none" vertOverflow="clip"',overflow),horizontal:await inspect('wrap="none" horzOverflow="clip"',run('First')+'<a:br/><a:br/>'+run('Third')),long:await inspect('wrap="square"',run('X'.repeat(20000)),1)};
    }''')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium')
        page = browser.new_page(viewport={'width':700,'height':350})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:4173/')
        page.evaluate("document.body.replaceChildren();document.body.style.background='#eef2f6'")
        checks = edge_checks(page)
        assert len(checks['none']['lines']) == 1 and checks['none']['clip'] == [], checks
        assert checks['vertical']['clip'][0]['width'] > 100, checks['vertical']
        assert checks['vertical']['clip'][0]['height'] == 90.4, checks['vertical']
        assert checks['horizontal']['clip'][0]['width'] == 80.8, checks['horizontal']
        assert checks['horizontal']['clip'][0]['height'] > 100, checks['horizontal']
        assert checks['horizontal']['lines'] == ['First', '', 'Third'], checks['horizontal']
        assert checks['long'].get('error') == 'Drawing terlalu kompleks.', checks['long']
        assert all(check['unchanged'] for check in checks.values()), checks
        results = {}
        for zoom in [100, 55, 200]:
            results[zoom] = render(page, zoom)
            lines = results[zoom]['text']
            assert [line['text'] for line in lines[:2]] == ['SAFETY', 'SHOES'], lines
            assert [line['weight'] for line in lines[:2]] == ['bold', 'normal'], lines
            assert lines[1]['y'] > lines[0]['y'] + lines[0]['height'] * .7, lines
            wrapped = lines[2:]
            assert len(wrapped) >= 2, wrapped
            assert all(line['width'] <= 126.5 for line in wrapped), wrapped
            assert all(abs(line['size']-16) < .01 for line in lines), lines
            assert abs(results[zoom]['imageWidth']-280) < .1, results[zoom]
            assert results[zoom]['clips'] == [{'width':126,'height':76}]*2
            page.screenshot(path=str(f.ARTIFACTS / f'render-clarity-{zoom}.png'))
        for zoom in [55, 200]:
            assert [line['text'] for line in results[zoom]['text']] == [line['text'] for line in results[100]['text']]
            assert results[zoom]['source'] == results[100]['source']
            for actual, expected in zip(results[zoom]['text'], results[100]['text']):
                assert abs(actual['width']-expected['width']) < .3, (zoom,actual,expected)
        assert not errors, errors
        browser.close()
        print('PASS imported footer labels preserve explicit breaks, paragraph fonts and wrapping at55/100/200%; screenshots:', f.ARTIFACTS, flush=True)


if __name__ == '__main__':
    run()
