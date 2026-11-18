"""Compact workbook chrome leaves the worksheet room without hiding commands."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
BASE='http://127.0.0.1:4173/'


def metrics(page):
    return page.evaluate('''()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
      return {grid:rect('#workbook-grid'),ribbon:rect('.excel-ribbon'),formula:rect('.workbook-formula-bar'),
        width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth};
    }''')


def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        page=browser.new_page(viewport={'width':1365,'height':613})
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK)
        page.goto(BASE+'#create');page.locator('#doc-title').fill('Compact workbook')
        f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()
        results=[]
        for width,height in [(1365,613),(1440,900),(768,900),(320,700)]:
            page.set_viewport_size({'width':width,'height':height})
            page.get_by_role('tab',name='Home',exact=True).click()
            page.wait_for_timeout(150)
            m=metrics(page);results.append(m)
            assert m['scrollWidth']<=width,(width,m)
            assert m['grid']['width']>=width-24,(width,m)
            if width>=1000:
                assert m['ribbon']['height']<=145,m
                assert m['grid']['y']<=230,m
                assert m['grid']['height']>=height-270,m
            else:
                assert m['grid']['height']>=260,m
            # Last group stays reachable by scrolling the ribbon alone.
            find=page.get_by_role('button',name='Cari isi sel',exact=True)
            find.scroll_into_view_if_needed();expect(find).to_be_visible()
            find.click();expect(page.locator('#modal')).to_be_visible()
            page.keyboard.press('Escape')
            page.locator('#ribbon-home').evaluate('node=>node.scrollLeft=0')
            bold=page.get_by_role('button',name='Tebal',exact=True)
            bold.scroll_into_view_if_needed();expect(bold).to_be_visible()
            r=bold.bounding_box();assert r['width']>=24 and r['height']>=24,r
            bold.focus();expect(bold).to_be_focused()
            page.get_by_role('tab',name='Insert',exact=True).click()
            expect(page.get_by_role('button',name='Sisipkan bentuk',exact=True)).to_be_visible()
            page.get_by_role('tab',name='Home',exact=True).click()
            page.screenshot(path=str(f.ARTIFACTS/f'compact-ribbon-{width}.png'))
        assert not errors,errors
        print('PASS compact chrome, worksheet area, reachable tools and keyboard focus at320/768/1365/1440:',results,flush=True)
        print('Screenshots:',f.ARTIFACTS,flush=True)
        browser.close()


if __name__=='__main__':run()
