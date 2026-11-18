"""Shape text keeps its alignment while editing, wrapping and zooming."""
import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('shapes', Path(__file__).with_name('browser-shapes.py'))
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)
f = s.f
native_spec = importlib.util.spec_from_file_location('native', Path(__file__).with_name('browser-shapes-preservation.py'))
native = importlib.util.module_from_spec(native_spec)
native_spec.loader.exec_module(native)


def text_position(page):
    return page.locator('.workbook-shape-label').evaluate('''label => {
      const range = document.createRange(); range.selectNodeContents(label);
      const text = range.getBoundingClientRect(), box = label.getBoundingClientRect();
      return {top: text.top, bottom: text.bottom, height: text.height, boxTop: box.top, boxHeight: box.height};
    }''')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium')
        page = browser.new_page(viewport={'width': 1500, 'height': 1050})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(s.BASE)
        f.login(page, 'admin')
        f.upload(page, f.WORKBOOK)
        page.goto(s.BASE + '#create')
        page.locator('#doc-title').fill('Shape alignment regression')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja')
        f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()
        s.ux.go(page, 'J4')
        s.insert(page, 'Rectangle')
        # This width is close to a wrap boundary: rounded CSS zoom metrics used
        # to fit the sentence in two lines at 55%, but three lines at 100%.
        page.evaluate("updateWorkbookShape({width:229.6875,height:180,fontName:'Arial',fontSize:16,text:'Alignment centered wrapped text'})")
        wrapping = {}
        for zoom in [100,25,55,75,150,200]:
            page.evaluate('(zoom)=>setWorkbookZoom(zoom)', zoom)
            shape = page.locator('.workbook-shape')
            wrapping[zoom] = shape.locator('.workbook-shape-text').evaluate('''text=>{
              const zoom=activeWorkbook.view.zoom/100,r=text.getBoundingClientRect();
              return {height:r.height/zoom,width:r.width/zoom};
            }''')
            display = text_position(page)
            shape.dblclick()
            editor = page.get_by_role('textbox', name='Teks bentuk', exact=True)
            expect(editor).to_be_focused()
            editing = editor.evaluate('''node=>{
              const zoom=activeWorkbook.view.zoom/100,r=node.getBoundingClientRect();
              return {top:r.top,height:r.height/zoom,content:node.scrollHeight};
            }''')
            assert abs(editing['height']-wrapping[zoom]['height']) <= 1.2, (zoom,wrapping[zoom],editing)
            assert abs(editing['top']-display['top']) < 4*zoom/100, (zoom,display,editing)
            page.keyboard.press('Escape')
        for zoom, actual in wrapping.items():
            assert abs(actual['height']-wrapping[100]['height']) <= .2, (zoom,actual,wrapping)
            assert abs(actual['width']-wrapping[100]['width']) <= .2, (zoom,actual,wrapping)
        # The native text layer follows the shape during the live resize.
        page.evaluate('setWorkbookZoom(100)')
        shape.click()
        handle = page.locator('[data-picture-resize="se"]').bounding_box()
        page.mouse.move(handle['x']+handle['width']/2, handle['y']+handle['height']/2)
        page.mouse.down()
        page.keyboard.down('Shift')
        page.mouse.move(handle['x']+handle['width']/2+60, handle['y']+handle['height']/2+30, steps=6)
        assert abs(shape.locator('.workbook-shape-text').bounding_box()['width']-.8*shape.bounding_box()['width']) <= .2
        page.mouse.up()
        page.keyboard.up('Shift')
        # Isolated fixture: generous text area exposes top/center/bottom drift.
        page.evaluate("updateWorkbookShape({width:260,height:180,text:'Baris pertama\\nBaris kedua'})")
        for zoom in [55, 100, 150]:
            page.evaluate('(zoom)=>setWorkbookZoom(zoom)', zoom)
            for vertical in ['top', 'center', 'bottom']:
                for horizontal in ['left', 'center', 'right']:
                    page.evaluate('([vertical,horizontal])=>updateWorkbookShape({vertical,horizontal})', [vertical, horizontal])
                    shape = page.locator('.workbook-shape')
                    display = text_position(page)
                    shape.dblclick()
                    editor = page.get_by_role('textbox', name='Teks bentuk', exact=True)
                    expect(editor).to_be_focused()
                    editing = editor.evaluate('''node=>{
                      const r=node.getBoundingClientRect(),s=getComputedStyle(node),z=r.width/node.offsetWidth;
                      return {top:r.top+parseFloat(s.paddingTop)*z,height:r.height-(parseFloat(s.paddingTop)+parseFloat(s.paddingBottom))*z,align:s.textAlign};
                    }''')
                    assert editing['align'] == horizontal
                    assert abs(editing['top'] - display['top']) < 4 * zoom / 100, (zoom, vertical, horizontal, display, editing)
                    editor.fill('Baris pertama\nBaris kedua\nBaris ketiga')
                    page.keyboard.press('Control+Enter')
                    expect(shape).to_contain_text('Baris ketiga')
                    page.evaluate("updateWorkbookShape({text:'Baris pertama\\nBaris kedua'})")
        # Long lines wrap at the same width in both display and edit mode.
        page.evaluate("updateWorkbookShape({vertical:'center',horizontal:'right',text:'Teks panjang untuk menguji pembungkusan baris otomatis dalam bentuk.'})")
        display = text_position(page)
        page.locator('.workbook-shape').dblclick()
        editor = page.get_by_role('textbox', name='Teks bentuk', exact=True)
        assert abs(editor.bounding_box()['y'] - display['top']) < 6
        editor.fill('Batal')
        page.keyboard.press('Escape')
        expect(page.locator('.workbook-shape')).to_contain_text('Teks panjang')
        # Overflow remains editable and scrollable inside the text area.
        overflow = '\n'.join('Baris panjang ' + str(index) for index in range(40))
        page.evaluate('(text)=>updateWorkbookShape({height:70,text})', overflow)
        page.locator('.workbook-shape').dblclick()
        editor = page.get_by_role('textbox', name='Teks bentuk', exact=True)
        expect(editor).to_be_visible()
        assert editor.evaluate('(n)=>n.scrollHeight>n.clientHeight')
        assert editor.bounding_box()['height'] <= page.locator('.workbook-shape-editing-area').bounding_box()['height'] + 1
        page.keyboard.press('Control+Enter')
        expect(page.locator('.workbook-shape-text')).to_have_text(overflow)

        # Reopen an actual imported Excel shape with a native drawing preview.
        # Its hidden fallback label must not hide the editor, and Escape or an
        # unchanged edit must leave only the original preview visible.
        page.get_by_role('button', name='Simpan Perubahan', exact=True).click()
        expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan')
        page.close()
        page = browser.new_page(viewport={'width':1500,'height':1050})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(s.BASE)
        f.login(page, 'admin')
        drawing = f.parts['xl/drawings/drawing1.xml'].replace('</xdr:wsDr>', native.NATIVE + '</xdr:wsDr>')
        f.upload(page, f.pack({'xl/drawings/drawing1.xml':drawing}))
        page.goto(s.BASE + '#create')
        page.locator('#doc-title').fill('Native shape inline edit')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja')
        f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page)
        page.reload()
        shape = page.locator('.workbook-shape')
        preview = shape.locator('.workbook-shape-native-preview')
        label = shape.locator('.workbook-shape-label')
        expect(preview).to_be_visible()
        expect(label).not_to_be_visible()
        original = shape.locator('.workbook-shape-text').text_content()
        for cancel in [True, False]:
            shape.dblclick()
            editor = page.get_by_role('textbox', name='Teks bentuk', exact=True)
            expect(editor).to_be_visible()
            expect(editor).to_be_focused()
            if cancel:
                editor.fill('Perubahan dibatalkan')
            page.keyboard.press('Escape' if cancel else 'Control+Enter')
            expect(preview).to_be_visible()
            expect(label).not_to_be_visible()
            expect(shape.locator('.workbook-shape-text')).to_have_text(original)
        shape.dblclick()
        editor = page.get_by_role('textbox', name='Teks bentuk', exact=True)
        editor.fill('')
        page.keyboard.press('Control+Enter')
        expect(preview).to_have_count(0)
        expect(label).to_be_visible()
        expect(shape.locator('.workbook-shape-text')).to_have_text('')
        shape.dblclick()
        editor.fill('Teks diperbarui\nSetelah membuka Excel')
        page.keyboard.press('Control+Enter')
        expect(shape).to_contain_text('Teks diperbarui')
        page.screenshot(path=str(f.ARTIFACTS / 'shape-alignment.png'))
        assert not errors, errors
        print('PASS shape wrapping/edit metrics at 25–200%, edit/display alignment in 9 positions at 55/100/150%, multiline, overflow, native preview Escape/no-change/commit, empty text;', f.ARTIFACTS / 'shape-alignment.png')
        browser.close()


if __name__ == '__main__':
    run()
