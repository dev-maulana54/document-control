"""Worksheet text, including wrapped merged banners, retains layout across zoom."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location('text_fixture', Path(__file__).with_name('browser-template-text.py'))
text_fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(text_fixture)
f = text_fixture.f
BASE = 'http://127.0.0.1:4173/'


def metrics(page):
    return page.locator('.workbook-cell[data-cell="A1"]').evaluate('''input=>{
      const style=getComputedStyle(input),rect=input.getBoundingClientRect(),grid=document.getElementById('workbook-grid'),zoom=activeWorkbook.view.zoom/100;
      const clone=input.cloneNode(true);clone.value=input.value;Object.assign(clone.style,{position:'absolute',height:'0px',width:style.width,paddingTop:'0px',paddingBottom:'0px',visibility:'hidden'});input.parentElement.appendChild(clone);const content=clone.scrollHeight;clone.remove();
      return {width:rect.width/zoom,height:rect.height/zoom,content,padding:parseFloat(style.paddingTop),fontSize:parseFloat(style.fontSize),lineHeight:parseFloat(style.lineHeight),scrollTop:input.scrollTop};
    }''')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium')
        page = browser.new_page(viewport={'width':1440,'height':1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE)
        f.login(page, 'admin')
        f.upload(page, text_fixture.banner_fixture())
        page.goto(BASE+'#create')
        page.locator('#doc-title').fill('Zoom fidelity regression')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja')
        f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()
        all_metrics = {}
        for zoom in [100,25,55,75,125,150,200]:
            page.locator('#workbook-zoom-percent').fill(str(zoom))
            page.locator('#workbook-zoom-percent').press('Enter')
            page.wait_for_timeout(100)
            all_metrics[zoom] = metrics(page)
            if zoom in [55,100,200]:
                page.screenshot(path=str(f.ARTIFACTS/f'zoom-fidelity-{zoom}.png'))
        reference = all_metrics[100]
        for zoom, actual in all_metrics.items():
            assert abs(actual['width']-reference['width']) < .6, (zoom,actual,reference)
            assert abs(actual['content']-reference['content']) <= 1, (zoom,actual,reference)
            assert abs(actual['padding']-reference['padding']) <= .6, (zoom,actual,reference)
            assert actual['scrollTop'] == 0, (zoom,actual)
        for zoom in [25,55,100,200]:
            page.locator('#workbook-zoom-percent').fill(str(zoom))
            page.locator('#workbook-zoom-percent').press('Enter')
            cell=page.locator('.workbook-cell[data-cell="A1"]')
            cell.dblclick()
            cell.fill('First line\nSecond line')
            page.wait_for_timeout(100)
            actual=metrics(page)
            assert abs(actual['padding']-max(0,(actual['height']-actual['content'])/2)) <= .6, (zoom,actual)
            assert actual['scrollTop'] == 0, (zoom,actual)
            page.keyboard.press('Escape')
        # Near a wrap boundary CSS zoom must not change the number of lines.
        wrapping = page.evaluate('''()=>{
          const result={};for(const zoom of [100,25,55,75,150,200]){
            setWorkbookZoom(zoom);const input=document.querySelector('.workbook-cell[data-cell="A1"]');
            input.value='Alignment centered wrapped text';input.style.fontFamily='Arial';input.style.fontSize='16pt';input.style.fontWeight='400';
            input.style.width='191.75px';input.style.height='0px';input.style.paddingTop=input.style.paddingBottom='0px';
            result[zoom]=input.scrollHeight;
          }return result;
        }''')
        assert len(set(wrapping.values())) == 1, wrapping
        assert not errors, errors
        browser.close()
        print('PASS worksheet dimensions, wrapped text and edit alignment at 25–200%; screenshots:',f.ARTIFACTS,flush=True)


if __name__ == '__main__':
    run()
