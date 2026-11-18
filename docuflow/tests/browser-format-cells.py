"""Format Cells is a draft dialog with atomic native Excel formatting."""
import importlib.util, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('cells',Path(__file__).with_name('browser-cell-panes.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
f=c.f


def open_format(page, ref):
    c.menu(page,ref);c.choose_action(page,'Format Cells')
    expect(page.locator('#context-cell-format')).to_be_visible()


def tab(page, name):
    page.get_by_role('tab',name=name,exact=True).click()


def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1365,'height':800},accept_downloads=True);page.set_default_timeout(5000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4173/');f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto('http://127.0.0.1:4173/#create');page.locator('#doc-title').fill('Format Cells');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
  page.get_by_role('tab',name='Catatan',exact=True).click();c.ux.go(page,'B3:C4')
  before=page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml)')
  open_format(page,'B3')
  for name in ['Number','Alignment','Font','Border','Fill','Protection']:expect(page.get_by_role('tab',name=name,exact=True)).to_be_visible()
  page.get_by_role('tab',name='Number',exact=True).focus();page.keyboard.press('ArrowRight');expect(page.get_by_role('tab',name='Alignment',exact=True)).to_have_attribute('aria-selected','true');tab(page,'Number')
  page.locator('#context-numFmt').select_option('10');expect(page.locator('#format-number-sample')).not_to_be_empty()
  tab(page,'Alignment');page.locator('#context-horizontal').select_option('right');page.locator('#context-vertical').select_option('center');page.locator('#context-wrap').check()
  tab(page,'Font');page.locator('#context-fontName').select_option('Arial');page.locator('#context-font-size').fill('16');page.locator('#context-bold').check();page.locator('#context-strike').check();page.locator('#context-color').fill('#aa0000')
  tab(page,'Border');assert page.locator('#format-panel-border select').count()==0;page.get_by_role('button',name='Line style Thick',exact=True).click();page.locator('#format-border-color').fill('#0000aa');page.get_by_role('button',name='Preset Outline',exact=True).click();expect(page.get_by_role('button',name='Preset Outline',exact=True)).to_have_attribute('aria-pressed','true');expect(page.get_by_role('button',name='Preset None',exact=True)).to_have_attribute('aria-pressed','false');page.screenshot(path=str(f.ARTIFACTS/'format-cells-border.png'))
  tab(page,'Fill');page.locator('#context-background').fill('#ffcc00');page.locator('#format-fill-mode').select_option('solid')
  assert page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml)')==before
  page.get_by_role('button',name='Terapkan Format',exact=True).click();expect(page.locator('#modal')).not_to_be_visible()
  cell=page.locator('.workbook-cell[data-cell="B3"]');assert cell.evaluate('(n)=>getComputedStyle(n).textAlign')=='right';assert cell.evaluate('(n)=>getComputedStyle(n).fontWeight')=='700';assert 'line-through' in cell.evaluate('(n)=>getComputedStyle(n).textDecorationLine')
  style=page.evaluate('''()=>{const b=activeWorkbook.book,s=b.sheets[1];return b.styles[Number(s.cells.get('B3').getAttribute('s'))]}''');assert style['numFmt']==10 and style['wrap'] and style['fontSize']==16 and style['background'].lower()=='#ffcc00'
  page.keyboard.press('Control+z');assert page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml)')==before
  page.keyboard.press('Control+y');assert page.evaluate('activeWorkbook.book.styles[Number(activeWorkbook.book.sheets[1].cells.get("B3").getAttribute("s"))].numFmt')==10
  before_noop=page.evaluate('''()=>({sheet:new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml),styles:new XMLSerializer().serializeToString(activeWorkbook.book.stylesXml),edits:activeWorkbook.edits,undo:activeWorkbook.undo.length})''')
  open_format(page,'B3');page.get_by_role('button',name='Terapkan Format',exact=True).click();assert page.evaluate('''()=>({sheet:new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml),styles:new XMLSerializer().serializeToString(activeWorkbook.book.stylesXml),edits:activeWorkbook.edits,undo:activeWorkbook.undo.length})''')==before_noop
  page.get_by_role('button',name='Simpan Perubahan',exact=True).click();expect(page.locator('#workbook-save-status')).to_have_text('Semua perubahan tersimpan');page.reload();page.get_by_role('tab',name='Catatan',exact=True).click();assert page.evaluate('activeWorkbook.book.styles[Number(activeWorkbook.book.sheets[1].cells.get("B3").getAttribute("s"))].numFmt')==10
  with page.expect_download() as download:page.get_by_role('button',name='Unduh Excel',exact=True).click()
  with zipfile.ZipFile(download.value.path()) as z:
   ns='{'+f.NS+'}';sheet=ET.fromstring(z.read('xl/worksheets/sheet2.xml'));styles=ET.fromstring(z.read('xl/styles.xml'));cell=sheet.find('.//'+ns+'c[@r="B3"]');xf=styles.find(ns+'cellXfs')[int(cell.attrib['s'])]
   assert xf.attrib['numFmtId']=='10';assert xf.find(ns+'alignment').attrib['horizontal']=='right';assert styles.find(ns+'fills')[int(xf.attrib['fillId'])].find('.//'+ns+'fgColor').attrib['rgb']=='FFFFCC00';assert styles.find(ns+'fonts')[int(xf.attrib['fontId'])].find(ns+'b') is not None;assert styles.find(ns+'fonts')[int(xf.attrib['fontId'])].find(ns+'strike') is not None;assert styles.find(ns+'borders')[int(xf.attrib['borderId'])].find(ns+'top').attrib['style']=='thick'
  # Toggling one border leaves the other edges intact and remains one undo step.
  c.ux.go(page,'B3:C4');before_edges=page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml)');open_format(page,'B3');tab(page,'Border');expect(page.get_by_role('button',name='Top border',exact=True)).to_have_attribute('aria-pressed','true');page.get_by_role('button',name='Top border',exact=True).click();assert page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml)')==before_edges;page.get_by_role('button',name='Terapkan Format',exact=True).click()
  assert page.evaluate('''()=>{const b=activeWorkbook.book,s=b.sheets[1],style=ref=>b.styles[Number(s.cells.get(ref).getAttribute('s'))];return !style('B3').borders.top&&!!style('B3').borders.left&&!!style('C4').borders.bottom;}''');page.keyboard.press('Control+z');assert page.evaluate('new XMLSerializer().serializeToString(activeWorkbook.book.sheets[1].xml)')==before_edges
  c.ux.go(page,'B3');open_format(page,'B3');tab(page,'Fill');page.locator('#format-fill-mode').select_option('none');page.get_by_role('button',name='Batal',exact=True).click();assert page.evaluate('activeWorkbook.book.styles[Number(activeWorkbook.book.sheets[1].cells.get("B3").getAttribute("s"))].background').lower()=='#ffcc00'
  # Built-in number formats are previewed using exactly the worksheet formatter.
  actual=page.evaluate('''()=>{const b=activeWorkbook.book,s=b.sheets[1],cell=s.xml.createElementNS(s.xml.documentElement.namespaceURI,'c'),value=s.xml.createElementNS(s.xml.documentElement.namespaceURI,'v');value.textContent='1234.56';cell.appendChild(value);cell.setAttribute('s','0');return [3,4,5,7,11,18].map(numFmt=>WorkbookFormat.display({...b,styles:[{numFmt}]},cell));}''')
  assert actual==['1,235','1,234.56','$1,235','$1,234.56','1.23E+03','1:26 PM'],actual
  assert page.evaluate('''()=>{const b=activeWorkbook.book,s=b.sheets[1],cell=s.xml.createElementNS(s.xml.documentElement.namespaceURI,'c'),v=s.xml.createElementNS(s.xml.documentElement.namespaceURI,'v');v.textContent='1.25';cell.appendChild(v);cell.setAttribute('s','0');return WorkbookFormat.display({...b,styles:[{numFmt:12}]},cell);}''')=='1 1/4'
  c.ux.go(page,'F4');open_format(page,'F4');page.locator('#context-numFmt').select_option('49');page.get_by_role('button',name='Terapkan Format',exact=True).click();page.locator('.workbook-cell[data-cell="F4"]').fill('123');assert page.evaluate('activeWorkbook.book.sheets[1].cells.get("F4").getAttribute("t")')=='inlineStr'
  assert page.evaluate('''()=>{const b=activeWorkbook.book;WorkbookStructure.formatAxis(b,1,'column',20,20,{numFmt:49});WorkbookEngine.setCell(b,1,'T15','456');return b.sheets[1].cells.get('T15').getAttribute('t')==='inlineStr';}''')
  c.ux.go(page,'D10:E10');open_format(page,'D10');tab(page,'Alignment');page.locator('#format-merge').check();page.get_by_role('button',name='Terapkan Format',exact=True).click();assert page.evaluate('activeWorkbook.book.sheets[1].merges.some(m=>m.start==="D10")')
  c.ux.go(page,'D10');open_format(page,'D10');tab(page,'Alignment');expect(page.locator('#format-merge')).to_be_checked();page.locator('#format-merge').uncheck();page.get_by_role('button',name='Terapkan Format',exact=True).click();assert not page.evaluate('activeWorkbook.book.sheets[1].merges.some(m=>m.start==="D10")');page.keyboard.press('Control+z');assert page.evaluate('activeWorkbook.book.sheets[1].merges.some(m=>m.start==="D10")')
  # A stored custom number format and uncommon alignment survive unrelated edits.
  page.evaluate('''()=>{const b=activeWorkbook.book;WorkbookFormat.format(b,1,'G12','numFmt',2);const s=b.sheets[1],xf=WorkbookEngine.child(b.stylesXml.documentElement,'cellXfs').children[Number(s.cells.get('G12').getAttribute('s'))];xf.setAttribute('numFmtId','164');let a=WorkbookEngine.child(xf,'alignment');if(!a){a=b.stylesXml.createElementNS(b.stylesXml.documentElement.namespaceURI,'alignment');xf.appendChild(a);}a.setAttribute('horizontal','distributed');b.styles=WorkbookEngine.stylesFrom(b.stylesXml,b);workbookChanged();}''')
  c.ux.go(page,'G12');open_format(page,'G12');tab(page,'Font');page.locator('#context-bold').check();page.get_by_role('button',name='Terapkan Format',exact=True).click();assert page.evaluate('''()=>{const b=activeWorkbook.book,cell=b.sheets[1].cells.get('G12'),xf=WorkbookEngine.child(b.stylesXml.documentElement,'cellXfs').children[Number(cell.getAttribute('s'))];return xf.getAttribute('numFmtId')==='164'&&WorkbookEngine.child(xf,'alignment').getAttribute('horizontal')==='distributed';}''')
  page.locator('th[data-column="12"]').click(button='right');c.choose_action(page,'Format Cells');tab(page,'Border');page.get_by_role('button',name='Line style Thick',exact=True).click();page.locator('#format-border-color').fill('#aa0000');page.get_by_role('button',name='Preset All',exact=True).click();page.get_by_role('button',name='Terapkan Format',exact=True).click();assert page.evaluate('''()=>{const b=activeWorkbook.book,s=b.sheets[1],style=b.styles[WorkbookStructure.defaultStyle(s,16,12)];return /3px solid #aa0000/i.test(style.borders.top); }''')
  page.set_viewport_size({'width':320,'height':700});open_format(page,'B3');assert page.locator('#modal').bounding_box()['width']<=320;tab(page,'Border');page.get_by_role('button',name='Line style Thick',exact=True).click();page.get_by_role('button',name='Preset Outline',exact=True).click();page.keyboard.press('Escape')
  assert not errors,errors;browser.close();print('PASS Format Cells tabs, draft, border/fill, atomic undo, reload and small viewport')


if __name__=='__main__':run()
