"""Clicks on text extending into empty cells keep editing its source cell."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright

spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
BASE='http://127.0.0.1:4173/'


def select(page,reference):
    page.locator('#workbook-range').fill(reference)
    page.get_by_role('button',name='Pilih rentang',exact=True).click()


def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        page=browser.new_page(viewport={'width':1440,'height':1000})
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK)
        page.goto(BASE+'#create');page.locator('#doc-title').fill('Extended editing hit targets')
        f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page)
        page.get_by_role('tab',name='Catatan',exact=True).click()
        for zoom in [100,25,55,200]:
            page.locator('#workbook-zoom-percent').fill(str(zoom));page.locator('#workbook-zoom-percent').press('Enter')
            select(page,'B3');cell=page.locator('.workbook-cell[data-cell="B3"]')
            cell.fill('Long editable overflow spanning several adjacent empty columns');page.keyboard.press('Enter')
            select(page,'B3');cell.dblclick();page.wait_for_timeout(100)
            neighbor=page.locator('.workbook-cell[data-cell="C3"]').bounding_box()
            x=neighbor['x']+neighbor['width']/4;y=neighbor['y']+neighbor['height']/2
            hit=page.evaluate('([x,y])=>document.elementFromPoint(x,y)?.dataset.cell',[x,y])
            assert hit=='B3',(zoom,hit)
            page.mouse.click(x,y)
            assert page.evaluate('activeWorkbook.selected==="B3"&&activeWorkbook.editingCell==="B3"'),zoom
            page.keyboard.press('Escape');page.wait_for_timeout(100);page.mouse.click(x,y)
            assert page.evaluate('activeWorkbook.selected==="C3"'),zoom
        assert not errors,errors
        browser.close();print('PASS extended text editing mouse targets and cleanup at25/55/100/200%',flush=True)


if __name__=='__main__':
    run()
