"""High-DPI PDF preview keeps vector detail and PDF-space signature coordinates."""
import hashlib,importlib.util,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

spec=importlib.util.spec_from_file_location('request_pdf',Path(__file__).with_name('browser-request-pdf.py'));fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
f=fixture.fixture;approval=fixture.approval;BASE=approval.BASE

def run(density):
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1600,'height':1000},device_scale_factor=density);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  generator=context.new_page();generator.set_content('<style>@page{size:A3 landscape;margin:12mm}section{break-after:page}p{font:7pt Arial}svg{width:900px;height:600px}</style>'+''.join('<section><h1>WORK INSTRUCTION '+str(i)+'</h1><p>Small vector text: Helmet, Safety Shoes, Sarung Tangan, Ear Plug</p><svg><path d="M1 1H899V599H1ZM1 25H899M160 1V599M320 1V599M480 1V599M640 1V599" fill="none" stroke="black" stroke-width=".5"/></svg></section>' for i in range(1,4)));pdf=generator.pdf(prefer_css_page_size=True,print_background=True);generator.close()
  page.goto(BASE);f.login(page,'user');page.goto(BASE+'#create');page.locator('#doc-title').fill('PDF Tajam');f.choose(page,'Jenis dokumen','Checksheet');f.choose(page,'Kategori dokumen','LEGACY');page.get_by_label('Lampiran PDF',exact=True).set_input_files({'name':'vector.pdf','mimeType':'application/pdf','buffer':pdf});f.save_and_open(page);request_id=page.url.split('#request-')[1]
  page.get_by_role('button',name='Submit ke Admin',exact=True).click();f.logout(page);f.login(page,'admin');page.goto(BASE+'#request-'+request_id);page.locator('#approval-number').fill('CS/HI-DPI/001');f.select_approver(page,'u-qa');page.get_by_role('button',name='Kirim untuk Persetujuan',exact=True).click();expect(page.locator('.request-summary .request-status')).to_have_text('Menunggu persetujuan')
  checksum=page.evaluate('''async id=>{const r=db.documentRequests.find(r=>r.id===id),bytes=r.attachment.storageKey?await WorkbookStore.get(r.attachment.storageKey):Uint8Array.from(atob(r.attachment.data.split(',')[1]),c=>c.charCodeAt(0)).buffer;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')}''',request_id);assert checksum==hashlib.sha256(pdf).hexdigest(),'Uploaded PDF must remain byte-identical'
  f.logout(page);approval.qa(page);page.get_by_role('button',name=re.compile('Profil .* dan keluar')).click();page.get_by_role('button',name='Tanda Tangan Saya',exact=True).click();page.locator('#signature-file').set_input_files({'name':'signature.png','mimeType':'image/png','buffer':f.parts['xl/media/image1.png']});page.get_by_role('button',name='Simpan Tanda Tangan',exact=True).click();expect(page.locator('#signature-form')).to_have_count(0);page.goto(BASE+'#approvals')
  with page.expect_popup() as popup:page.get_by_role('row').filter(has_text='PDF Tajam').get_by_role('button',name='Approval',exact=True).click()
  preview=popup.value;preview.on('pageerror',lambda e:errors.append(str(e)));expect(preview.get_by_role('button',name='Tanda tangani',exact=False)).to_be_visible();canvas=preview.locator('.approval-page canvas').first
  metrics=canvas.evaluate('(c)=>({bitmap:c.width,width:c.getBoundingClientRect().width,dpr:devicePixelRatio})');assert metrics['bitmap']/metrics['width']>=1.95,metrics
  expect(preview.locator('.approval-page').first).to_have_attribute('data-rendered','true');preview.screenshot(path=str(f.ARTIFACTS/'approval-pdf-hidpi.png'))
  # Scroll back to an evicted page and redraw at its new display size.
  preview.locator('.approval-page').last.scroll_into_view_if_needed();expect(preview.locator('.approval-page').last).to_have_attribute('data-rendered','true');preview.wait_for_function('document.querySelector(".approval-page canvas").width===0');preview.locator('.approval-page').first.scroll_into_view_if_needed();expect(preview.locator('.approval-page').first).to_have_attribute('data-rendered','true')
  preview.get_by_role('button',name='Tanda tangani',exact=False).click();preview.get_by_role('button',name='Gunakan tanda tangan',exact=True).click();box=canvas.bounding_box();canvas.click(position={'x':box['width']/2,'y':box['height']/2});expect(preview.locator('.signature-mark')).to_be_visible()
  old_width=box['width'];preview.set_viewport_size({'width':1000,'height':800});preview.wait_for_function('(old)=>Math.abs(document.querySelector(".approval-page canvas").getBoundingClientRect().width-old)>100',arg=old_width);expect(preview.locator('.approval-page').first).to_have_attribute('data-rendered','true')
  box=canvas.bounding_box();mark=preview.locator('.signature-mark').bounding_box();assert abs(mark['x']+mark['width']/2-(box['x']+box['width']/2))<2,(mark,box);assert abs(mark['y']+mark['height']/2-(box['y']+box['height']/2))<2,(mark,box)
  metrics=canvas.evaluate('(c)=>({bitmap:c.width,width:c.getBoundingClientRect().width})');assert metrics['bitmap']/metrics['width']>=1.95,metrics
  preview.get_by_role('button',name='Setujui dan simpan',exact=True).click();expect(preview.locator('#approval-hint')).to_have_text('Persetujuan berhasil disimpan.');signature=page.evaluate('(id)=>DocumentWorkflow.currentReviews(db.documentRequests.find(r=>r.id===id))[0].signature',request_id);assert signature['page']==1 and abs(signature['x']-595.28)<2 and abs(signature['y']-420.95)<2,signature
  assert not errors,errors;preview.close();browser.close();print('PASS high-DPI PDF clarity, byte-identical uploaded PDF, lazy multi-page redraw, resize and stable signature PDF coordinates; screenshot:',f.ARTIFACTS/'approval-pdf-hidpi.png',flush=True)

if __name__=='__main__':
 for density in [1,2]:run(density)
