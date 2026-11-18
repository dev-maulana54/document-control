import importlib.util
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('shapes', Path(__file__).with_name('browser-shapes.py'))
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)
f = s.f


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('PLAYWRIGHT_CHANNEL', 'chromium'))
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        page.set_default_timeout(8000)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(s.BASE)
        f.login(page, 'admin')
        # Native two-cell pictures must keep valid end markers after numeric resizing.
        drawing = f.parts['xl/drawings/drawing1.xml'].replace(' editAs="oneCell"', '')
        f.upload(page, f.pack({'xl/drawings/drawing1.xml': drawing}))
        page.goto(s.BASE + '#create')
        page.locator('#doc-title').fill('Object context menu')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja')
        f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()
        s.ux.go(page, 'J4')
        s.insert(page, 'Rectangle')
        shape = page.locator('.workbook-shape')
        expect(page.locator('.shape-object-actions')).to_have_count(0)
        before = page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[0].xml)')
        shape.click(button='right')
        menu = page.get_by_role('dialog', name='Menu bentuk', exact=True)
        expect(menu).to_be_visible()
        expect(menu.get_by_role('menuitem', name='Edit Text', exact=True)).to_be_focused()
        menu.get_by_role('menuitem', name='Edit Text', exact=True).click()
        page.get_by_role('textbox', name='Teks bentuk', exact=True).fill('Right-click text')
        page.keyboard.press('Control+Enter')
        expect(shape).to_contain_text('Right-click text')
        shape.click(button='right')
        menu.get_by_role('button', name='Bold', exact=True).click()
        expect(menu.get_by_role('button', name='Bold', exact=True)).to_have_attribute('aria-pressed', 'true')
        menu.get_by_role('button', name='Align Right', exact=True).click()
        assert shape.locator('.workbook-shape-label').evaluate('(n)=>getComputedStyle(n).textAlign') == 'right'
        page.keyboard.press('Escape')
        expect(menu).to_have_count(0)
        expect(shape).to_be_focused()
        page.keyboard.press('Shift+F10')
        expect(menu).to_be_visible()
        # Keyboard users can move from menu actions into quick formatting.
        page.keyboard.press('Shift+Tab')
        expect(menu.get_by_role('button', name='Align Right', exact=True)).to_be_focused()
        for _ in range(3):
            page.keyboard.press('Shift+Tab')
        color = menu.get_by_label('Warna isi bentuk', exact=True)
        expect(color).to_be_focused()
        for key in ['ArrowDown', 'ArrowUp', 'Home', 'End']:
            assert not color.evaluate('''(node,key)=>{
                const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});
                node.dispatchEvent(event);return event.defaultPrevented;
            }''', key)
            expect(color).to_be_focused()
        for _ in range(4):
            page.keyboard.press('Shift+Tab')
        bold = menu.get_by_role('button', name='Bold', exact=True)
        expect(bold).to_be_focused()
        page.keyboard.press('Space')
        expect(bold).to_have_attribute('aria-pressed', 'false')
        page.keyboard.press('Tab')
        expect(menu.get_by_role('button', name='Italic', exact=True)).to_be_focused()
        # Leaving the popup dismisses it without moving focus back to the shape.
        menu.get_by_role('menuitem', name='Edit Text', exact=True).focus()
        page.keyboard.press('End')
        expect(menu.get_by_role('menuitem', name='Delete', exact=True)).to_be_focused()
        page.keyboard.press('Tab')
        expect(menu).to_have_count(0)
        expect(shape).not_to_be_focused()
        shape.focus()
        page.keyboard.press('Shift+F10')
        menu.get_by_role('menuitem', name='Format Shape...', exact=True).click()
        page.locator('#shape-text').fill('Formatted from context')
        page.get_by_role('button', name='Terapkan Bentuk', exact=True).click()
        expect(shape).to_contain_text('Formatted from context')
        shape.click(button='right')
        menu.get_by_role('menuitem', name='Size and Properties...', exact=True).click()
        page.get_by_label('Lebar objek (px)', exact=True).fill('220')
        page.get_by_label('Tinggi objek (px)', exact=True).fill('70')
        page.get_by_role('button', name='Terapkan Ukuran', exact=True).click()
        assert abs(shape.bounding_box()['width'] - 220) < 1
        assert abs(shape.bounding_box()['height'] - 70) < 1
        shape.click(button='right')
        menu.get_by_role('menuitem', name='Delete', exact=True).click()
        expect(shape).to_have_count(0)
        page.keyboard.press('Control+z')
        expect(shape).to_have_count(1)
        assert page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[0].xml)') == before
        # Right-click targets the object under the pointer, even if another shape is selected.
        image = page.locator('img.workbook-image.is-movable').first
        image.click(button='right')
        menu = page.get_by_role('dialog', name='Menu gambar', exact=True)
        expect(menu.get_by_role('menuitem', name='Edit Text', exact=True)).to_have_count(0)
        menu.get_by_role('menuitem', name='Size and Properties...', exact=True).click()
        width = float(page.get_by_label('Lebar objek (px)', exact=True).input_value())
        height = float(page.get_by_label('Tinggi objek (px)', exact=True).input_value())
        page.get_by_label('Lebar objek (px)', exact=True).fill(str(width + 30))
        page.get_by_role('button', name='Terapkan Ukuran', exact=True).click()
        image.click(button='right')
        menu.get_by_role('menuitem', name='Delete', exact=True).click()
        expect(image).to_have_count(0)
        page.keyboard.press('Control+z')
        expect(image).to_have_count(1)
        anchor = ET.fromstring(s.exported(page)['xl/drawings/drawing1.xml']).find(s.XDR + 'twoCellAnchor')
        assert anchor is not None
        assert anchor.find(s.XDR + 'to/' + s.XDR + 'col').text is not None
        assert anchor.find(s.XDR + 'to/' + s.XDR + 'row').text is not None
        # Menu stays inside the viewport and remains at UI scale at small sheet zoom.
        page.locator('#workbook-zoom-percent').fill('55')
        page.locator('#workbook-zoom-percent').press('Enter')
        shape.click(button='right')
        menu = page.get_by_role('dialog', name='Menu bentuk', exact=True)
        r = menu.bounding_box()
        assert r['x'] >= 0 and r['y'] >= 0 and r['x'] + r['width'] <= 1440 and r['y'] + r['height'] <= 1000
        assert r['width'] >= 250
        page.screenshot(path=str(f.ARTIFACTS / 'object-context-menu.png'))
        page.keyboard.press('Escape')
        shape.click(button='right')
        page.locator('#workbook-range').click()
        expect(menu).to_have_count(0)
        page.set_viewport_size({'width': 320, 'height': 800})
        s.ux.go(page, 'J4')
        shape.click(button='right')
        r = menu.bounding_box()
        assert r['x'] >= 0 and r['y'] >= 0 and r['x'] + r['width'] <= 320 and r['y'] + r['height'] <= 800
        page.keyboard.press('Escape')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.get_by_role('button', name='Simpan Perubahan', exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.goto(page.url + '?view')
        expect(page.locator('.workbook-image.is-movable')).to_have_count(0)
        image = page.locator('img.workbook-image').first
        expect(image).to_be_visible()
        assert abs(image.bounding_box()['width'] - (width + 30)) < 1
        assert abs(image.bounding_box()['height'] - height) < 1
        r = page.locator('.workbook-shape').bounding_box()
        page.mouse.click(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2, button='right')
        expect(page.get_by_role('dialog', name='Menu bentuk', exact=True)).to_have_count(0)
        assert not errors, errors
        print('PASS object context menu, inline text, formatting, size, delete/undo, target isolation, keyboard focus, zoom, readonly; screenshot:', f.ARTIFACTS / 'object-context-menu.png', flush=True)
        browser.close()


if __name__ == '__main__':
    run()
