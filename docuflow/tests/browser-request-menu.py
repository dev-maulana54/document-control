import importlib.util,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'));f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
BASE='http://127.0.0.1:4173/'
def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chromium');page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);f.logout(page);f.login(page,'user')
  menu=page.get_by_role('link',name='Create / Revise Dokumen',exact=True);menu.click();expect(page).to_have_url(re.compile('#requests$'));expect(page.get_by_role('table',name='Daftar permintaan dokumen')).to_be_visible();expect(page.locator('#document-form')).to_have_count(0)
  page.get_by_role('link',name='Buat Permintaan',exact=True).click();expect(page.locator('#document-form')).to_be_visible();expect(menu).to_have_attribute('aria-current','page');page.locator('#doc-title').fill('Form Pengecekan Heat Sealing');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');page.get_by_role('button',name='Simpan Dokumen',exact=True).click();expect(page).to_have_url(re.compile('#requests$'))
  page.goto(BASE+'#home');menu.click();row=page.get_by_role('row').filter(has_text='Form Pengecekan Heat Sealing');expect(row).to_contain_text('Draft');expect(row.get_by_role('link',name='Buka Permintaan',exact=True)).to_be_visible();expect(row.get_by_role('button',name='Edit Excel',exact=True)).to_be_enabled();expect(row.get_by_role('button',name='Lihat Excel',exact=True)).to_be_visible()
  row.get_by_role('link',name='Buka Permintaan',exact=True).click();expect(menu).to_have_attribute('aria-current','page');menu.click();expect(page.get_by_role('table',name='Daftar permintaan dokumen')).to_be_visible();menu.click();expect(row).to_be_visible()
  page.get_by_role('link',name='Buat Permintaan',exact=True).click();menu.click();expect(page.locator('#document-form')).to_have_count(0);expect(row).to_be_visible();assert not errors,errors;print('PASS user menu opens request table from Home/form/detail, existing draft/actions visible, form only via Buat Permintaan, active menu and repeated clicks',flush=True);browser.close()
if __name__=='__main__':run()
