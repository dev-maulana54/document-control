import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
spec=importlib.util.spec_from_file_location('ux',Path(__file__).with_name('browser-editor-ux.py'));ux=importlib.util.module_from_spec(spec);spec.loader.exec_module(ux)
f=ux.fixture;BASE='http://127.0.0.1:4173/'
def sample(page):
 return page.evaluate('''async()=>{await document.fonts.ready;for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);const samples=[],start={layout:window.layoutCalls||0,render:window.gridCalls||0};for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const grid=document.getElementById('workbook-grid'),workspace=document.getElementById('main-content'),cell=document.querySelector('.workbook-selection-outline'),r=grid.getBoundingClientRect();samples.push([r.x,r.y,r.width,r.height,workspace.getBoundingClientRect().width,cell.getBoundingClientRect().y,grid.scrollTop,grid.scrollLeft]);}return {spread:samples[0].map((_,i)=>Math.max(...samples.map(s=>s[i]))-Math.min(...samples.map(s=>s[i]))),layout:(window.layoutCalls||0)-start.layout,render:(window.gridCalls||0)-start.render,heights:[...new Set(samples.map(s=>s[3]))]};}''')
def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1918,'height':1010});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);page.goto(BASE+'#create');page.locator('#doc-title').fill('Form Pengecekan Heat Sealing');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for()
  page.evaluate('''()=>{window.layoutCalls=0;window.gridCalls=0;const layout=layoutWorkbookViewport,render=renderWorkbookGrid;layoutWorkbookViewport=(...args)=>{layoutCalls++;return layout(...args)};renderWorkbookGrid=(...args)=>{gridCalls++;return render(...args)};}''')
  for width,height,browser_zoom,sheet_zoom in [(1918,1010,1,100),(1365,767,1.1,100),(1365,767,1.25,100),(960,650,1.75,100),(1280,801,1.25,175)]:
   page.evaluate('(z)=>document.documentElement.style.zoom=z',browser_zoom);page.set_viewport_size({'width':width,'height':height});page.get_by_role('spinbutton',name='Zoom lembar kerja (%)',exact=True).fill(str(sheet_zoom));page.get_by_role('spinbutton',name='Zoom lembar kerja (%)',exact=True).press('Enter');page.locator('.workbook-cell').first.focus();result=sample(page);print('Stability',width,height,browser_zoom,sheet_zoom,result,flush=True);assert max(result['spread'])<.1 and result['render']==0 and result['layout']<3,result
  assert not errors,errors;browser.close();print('PASS idle editor geometry/render stability across fractional browser/sheet zoom',flush=True)
if __name__=='__main__':run()
