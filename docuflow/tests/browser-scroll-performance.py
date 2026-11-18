"""Bound viewport rebuilds during scrolling through a narrow-column worksheet.

Wall-clock timings are reported for profiling; retained DOM identity is the
deterministic regression guard. Use --measure-only to capture a baseline.
"""
import argparse
import importlib.util
import json
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('browser-workbook.py'))
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)
BASE = 'http://127.0.0.1:4173/'


def column(number):
    result = ''
    while number:
        number, digit = divmod(number - 1, 26)
        result = chr(65 + digit) + result
    return result


def dense_fixture():
    rows = []
    merges = []
    for row in range(1, 1501):
        cells = []
        for col in range(1, 101, 5):
            value = f'{row}-{col}'
            cells.append(f'<c r="{column(col)}{row}" s="2" t="inlineStr"><is><t>{value}</t></is></c>')
        if row % 50 == 1:
            merges.append(f'<mergeCell ref="A{row}:J{row}"/>')
        rows.append(f'<row r="{row}" ht="12" customHeight="1">{"".join(cells)}</row>')
    sheet = f'''<worksheet xmlns="{f.NS}"><dimension ref="A1:CV1500"/>
      <sheetViews><sheetView workbookViewId="0" zoomScale="55"/></sheetViews>
      <sheetFormatPr defaultRowHeight="12"/><cols><col min="1" max="100" width="2.85" customWidth="1"/></cols>
      <sheetData>{''.join(rows)}</sheetData><mergeCells count="{len(merges)}">{''.join(merges)}</mergeCells></worksheet>'''
    return f.pack({'xl/worksheets/sheet1.xml': sheet})


def scroll_metrics(page, axis='vertical'):
    return page.evaluate('''axis=>{
      const state=activeWorkbook,grid=document.getElementById('workbook-grid');
      grid.scrollTop=1600;grid.scrollLeft=0;state.renderViewport();
      const property=axis==='horizontal'?'scrollLeft':'scrollTop',base=grid[property],step=16,times=[];let replacements=0;
      for(let index=1;index<=24;index++){
        const anchor=grid.querySelector('tbody tr:not(.workbook-spacer)'),start=performance.now();
        grid[property]=base+index*step;state.renderViewport();
        // Force the same layout read for baseline and optimized versions.
        grid.querySelector('tbody').getBoundingClientRect();
        times.push(performance.now()-start);if(!anchor.isConnected)replacements++;
      }
      const sorted=[...times].sort((a,b)=>a-b);
      return {axis,zoom:state.view.zoom,cells:grid.querySelectorAll('.workbook-cell').length,
        borderPrimitives:grid.querySelectorAll('.workbook-native-borders :is(path,line,rect,polyline,polygon,.workbook-native-border-line)').length,
        replacements,steps:times.length,totalMs:times.reduce((a,b)=>a+b,0),
        medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.floor(sorted.length*.95)],
        minMs:sorted[0],maxMs:sorted.at(-1),gridHeight:grid.getBoundingClientRect().height};
    }''', axis)


def scroll_frame_metrics(page):
    # Exercise the actual scroll listener and its overlay paints as well as the
    # synchronous viewport function measured above.
    return page.evaluate('''async()=>{
      const state=activeWorkbook,grid=state.gridLayout.grid;
      const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      grid.scrollTop=1600;grid.scrollLeft=0;state.renderViewport();await frame();
      const times=[];let borderReplacements=0;
      for(let index=0;index<24;index++){
        const border=grid.querySelector('.workbook-native-borders'),start=performance.now();
        grid.scrollTop+=8;await frame();times.push(performance.now()-start);
        if(border&&!border.isConnected)borderReplacements++;
      }
      const sorted=[...times].sort((a,b)=>a-b);
      return {zoom:state.view.zoom,borderReplacements,steps:times.length,
        medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.floor(sorted.length*.95)],
        maxMs:sorted.at(-1),longFrames:times.filter(time=>time>50).length};
    }''')


def check_hit(page):
    target = page.evaluate('''()=>{
      const grid=document.getElementById('workbook-grid'),rect=grid.getBoundingClientRect(),x=rect.left+150,y=rect.top+110;
      const input=document.elementFromPoint(x,y)?.closest('.workbook-cell');
      return {x,y,reference:input?.dataset.cell};
    }''')
    assert target['reference'], target
    page.mouse.click(target['x'], target['y'])
    assert page.evaluate('activeWorkbook.selected') == target['reference'], target


def check_buffer_boundaries(page):
    # A merge whose anchor lies above the materialized window must keep its
    # original identity and hit area while both buffer edges cross the merge.
    page.evaluate('''()=>{
      setWorkbookZoom(100);const state=activeWorkbook;
      WorkbookFormat.merge(state.book,0,'V200:AE260');
      WorkbookEngine.setCell(state.book,0,'V200','Long merged region');
      workbookChanged();
    }''')
    for row in [210, 218, 229, 240, 249]:
        page.evaluate('''row=>{
          const state=activeWorkbook,grid=state.gridLayout.grid;
          grid.scrollTop=state.gridLayout.y[row-1];state.renderViewport();
        }''', row)
        merged = page.locator('.workbook-cell[data-cell="V200"]')
        expect(merged).to_have_count(1)
        target = merged.evaluate('''input=>{
          const cell=input.closest('td').getBoundingClientRect(),grid=document.getElementById('workbook-grid').getBoundingClientRect();
          const x=cell.left+10,y=Math.max(cell.top,grid.top+30)+15;
          return {x,y,hit:document.elementFromPoint(x,y)?.closest('.workbook-cell')?.dataset.cell};
        }''')
        assert target['hit'] == 'V200', (row, target)
        page.mouse.click(target['x'], target['y'])
        assert page.evaluate('activeWorkbook.selected') == 'V200'
    # Editing remains attached to the same cell as a new row window is drawn.
    page.evaluate('''()=>{
      const state=activeWorkbook,grid=state.gridLayout.grid;
      state.selected=state.range='AK300';grid.scrollTop=state.gridLayout.y[285];
      state.renderViewport();restoreWorkbookFocus();
    }''')
    editor = page.locator('.workbook-cell[data-cell="AK300"]')
    editor.dblclick()
    editor.fill('Caret retained across the buffer')
    editor.press('Home')
    editor.press('ArrowRight')
    caret = editor.evaluate('(node)=>[node.selectionStart,node.selectionEnd]')
    page.evaluate('''()=>{
      const state=activeWorkbook,grid=state.gridLayout.grid;
      grid.scrollTop+=16*12;state.renderViewport();
    }''')
    expect(editor).to_be_focused()
    assert editor.evaluate('(node)=>[node.selectionStart,node.selectionEnd]') == caret
    assert page.evaluate('activeWorkbook.editingCell') == 'AK300'
    page.keyboard.press('Control+Enter')
    # Offscreen selections must never silently select a recycled nearby cell.
    page.evaluate('''()=>{
      const state=activeWorkbook,grid=state.gridLayout.grid;
      grid.scrollTop=state.gridLayout.y[800];state.renderViewport();
    }''')
    assert page.evaluate('activeWorkbook.selected') == 'AK300'
    assert page.evaluate('WorkbookEngine.value(activeWorkbook.book,activeWorkbook.book.sheets[0].cells.get("AK300"))') == 'Caret retained across the buffer'
    # Frozen editable cells remain pinned and focused through both-axis windows.
    page.evaluate('''()=>{
      const state=activeWorkbook;state.selected=state.range='C3';setWorkbookFreeze('panes');
      state.selected=state.range='B2';restoreWorkbookFocus();
    }''')
    frozen = page.locator('.workbook-cell[data-cell="B2"]')
    frozen.dblclick()
    frozen.fill('Frozen caret')
    before = frozen.bounding_box()
    page.evaluate('''()=>{
      const state=activeWorkbook,grid=state.gridLayout.grid;
      grid.scrollTop=state.gridLayout.y[900];grid.scrollLeft=400;
      state.renderViewport();paintWorkbookFrozenLayers();
    }''')
    after = frozen.bounding_box()
    assert abs(after['x']-before['x']) < 1 and abs(after['y']-before['y']) < 1, (before, after)
    expect(frozen).to_be_focused()
    assert page.evaluate('activeWorkbook.selected==="B2"&&activeWorkbook.editingCell==="B2"')
    page.keyboard.press('Escape')


def check_frozen_resize(page):
    # Expanding the viewport can reveal more frozen cells without crossing the
    # scrolling window's boundary. They must still be materialized.
    page.set_viewport_size({'width':1365, 'height':600})
    page.wait_for_timeout(80)
    page.evaluate("setWorkbookZoom(100);activeWorkbook.gridLayout.grid.scrollLeft=activeWorkbook.gridLayout.grid.scrollTop=0;activeWorkbook.selected=activeWorkbook.range='A51';setWorkbookFreeze('panes')")
    page.set_viewport_size({'width':1365, 'height':1200})
    revealed = page.locator('.workbook-cell[data-cell="A45"]')
    expect(revealed).to_be_visible()
    revealed.click()
    assert page.evaluate('activeWorkbook.selected') == 'A45'
    page.set_viewport_size({'width':500, 'height':900})
    page.wait_for_timeout(80)
    page.evaluate("activeWorkbook.gridLayout.grid.scrollLeft=activeWorkbook.gridLayout.grid.scrollTop=0;activeWorkbook.selected=activeWorkbook.range='AY1';setWorkbookFreeze('panes')")
    page.set_viewport_size({'width':1365, 'height':900})
    revealed = page.locator('.workbook-cell[data-cell="AS1"]')
    expect(revealed).to_be_visible()
    revealed.click()
    assert page.evaluate('activeWorkbook.selected') == 'AS1'


def run(measure_only=False):
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chromium')
        page = browser.new_page(viewport={'width':1365,'height':767})
        page.set_default_timeout(15000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE)
        f.login(page, 'admin')
        f.upload(page, dense_fixture())
        page.goto(BASE + '#create')
        page.locator('#doc-title').fill('Narrow columns scroll benchmark')
        f.choose(page, 'Jenis dokumen', 'Instruksi Kerja')
        f.choose(page, 'Kategori dokumen', 'LEGACY')
        f.save_and_open(page)
        page.locator('.workbook-cell').first.wait_for()
        page.wait_for_timeout(100)
        results = []
        for zoom in [55,100]:
            page.evaluate('(zoom)=>setWorkbookZoom(zoom)', zoom)
            page.wait_for_timeout(60)
            # Keep the workload comparable while the application chrome is
            # being compacted independently of this scroll optimization.
            page.evaluate('''()=>{
              const grid=document.getElementById('workbook-grid'),zoom=activeWorkbook.view.zoom/100;
              grid.style.height=398/zoom+'px';
            }''')
            result = scroll_metrics(page)
            results.append(result)
            print('SCROLL METRICS', json.dumps(result), flush=True)
            if not measure_only:
                assert result['replacements'] <= 8, result
                assert result['borderPrimitives'] <= 100, result
            page.wait_for_timeout(60)
            check_hit(page)
            if not measure_only:
                frames = scroll_frame_metrics(page)
                print('SCROLL FRAME METRICS', json.dumps(frames), flush=True)
                assert frames['borderReplacements'] <= 8, frames
            if zoom == 100:
                horizontal = scroll_metrics(page, 'horizontal')
                results.append(horizontal)
                print('SCROLL METRICS', json.dumps(horizontal), flush=True)
                if not measure_only:
                    assert horizontal['replacements'] <= 8, horizontal
                    assert horizontal['borderPrimitives'] <= 100, horizontal
                page.wait_for_timeout(60)
                check_hit(page)
        if not measure_only:
            check_buffer_boundaries(page)
            check_frozen_resize(page)
        report = f.ARTIFACTS / 'scroll-performance.json'
        report.write_text(json.dumps(results, indent=2), encoding='utf-8')
        page.screenshot(path=str(f.ARTIFACTS / 'scroll-performance.png'))
        assert not errors, errors
        print(('BASELINE' if measure_only else 'PASS') + ' viewport window reuse, scroll measurements, selection/hit testing; report:', report, flush=True)
        browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--measure-only', action='store_true')
    run(parser.parse_args().measure_only)
