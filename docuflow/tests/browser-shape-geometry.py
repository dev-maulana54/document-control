"""Vector shape bounds and corner geometry during resize and worksheet zoom."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('shapes', Path(__file__).with_name('browser-shapes.py'))
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)
f = s.f


def geometry(shape, oval):
    result = shape.evaluate('''(node,oval)=>{
      const svg=node.querySelector('svg'),part=svg.querySelector(oval?'ellipse':'rect');
      const box=node.getBoundingClientRect(),bounds=part.getBoundingClientRect(),matrix=part.getScreenCTM();
      return {box:{x:box.x,y:box.y,width:box.width,height:box.height},
        bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},
        rx:part.rx.baseVal.value*Math.hypot(matrix.a,matrix.b),
        ry:part.ry.baseVal.value*Math.hypot(matrix.c,matrix.d)};
    }''', oval)
    box, bounds = result['box'], result['bounds']
    assert abs(bounds['x'] + bounds['width']/2 - box['x'] - box['width']/2) < .2, result
    assert abs(bounds['y'] + bounds['height']/2 - box['y'] - box['height']/2) < .2, result
    assert 0 <= bounds['x'] - box['x'] < 5, result
    assert 0 <= bounds['y'] - box['y'] < 5, result
    assert bounds['x'] + bounds['width'] <= box['x'] + box['width'] + .2, result
    assert bounds['y'] + bounds['height'] <= box['y'] + box['height'] + .2, result
    if not oval:
        assert abs(result['rx'] - result['ry']) < .2, result
    return result


def resize(page, shape, dx, dy, oval):
    shape.click(position={'x':15, 'y':15})
    before = shape.bounding_box()
    edge = page.locator('[data-picture-resize="se"]').bounding_box()
    page.mouse.move(edge['x'] + edge['width']/2, edge['y'] + edge['height']/2)
    page.mouse.down()
    page.keyboard.down('Shift')
    page.mouse.move(edge['x'] + edge['width']/2 + dx, edge['y'] + edge['height']/2 + dy, steps=8)
    geometry(shape, oval)  # Verify the live preview before the pointer is released.
    page.mouse.up()
    page.keyboard.up('Shift')
    after = shape.bounding_box()
    assert abs(after['width'] - before['width'] - dx) < 1, (before, after)
    assert abs(after['height'] - before['height'] - dy) < 1, (before, after)
    geometry(shape, oval)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium')
        page = browser.new_page(viewport={'width':1600,'height':1100})
        page.set_default_timeout(12000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(s.BASE)
        f.login(page, 'admin')
        f.upload(page, f.WORKBOOK)
        page.goto(s.BASE + '#create')
        page.locator('#doc-title').fill('Shape geometry')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja')
        f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()
        for label, oval, anchor in [('Oval',True,'J4'), ('Rounded Rectangle',False,'L4'), ('Terminator',False,'N4')]:
            s.ux.go(page, anchor)
            s.insert(page, label)
            shape = page.locator('.workbook-shape').last
            geometry(shape, oval)
            resize(page, shape, 110, -20, oval)
            resize(page, shape, -170, 130, oval)
            for zoom in [55,100,200]:
                page.get_by_role('spinbutton', name='Zoom lembar kerja (%)', exact=True).fill(str(zoom))
                page.keyboard.press('Enter')
                geometry(shape, oval)
            page.get_by_role('button', name='Reset zoom 100 persen', exact=True).click()
        page.get_by_role('button', name='Simpan Perubahan', exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.reload()
        expect(page.locator('.workbook-shape')).to_have_count(3)
        for index, oval in enumerate([True,False,False]):
            geometry(page.locator('.workbook-shape').nth(index), oval)
        page.screenshot(path=str(f.ARTIFACTS/'shape-geometry.png'))
        assert not errors, errors
        print('PASS oval bounds, circular rounded corners, live resize, zoom55/100/200, save/reload; screenshot:', f.ARTIFACTS/'shape-geometry.png', flush=True)
        browser.close()


if __name__ == '__main__':
    run()
