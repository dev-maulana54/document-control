"""Category document type persists, filters assignment and protects referenced type records."""
import importlib.util,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'));fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
from playwright.sync_api import sync_playwright,expect
BASE='http://127.0.0.1:4173/'

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE);fixture.login(page,'admin');page.goto(BASE+'#categories')
        expect(page.get_by_role('columnheader',name='JENIS DOKUMEN',exact=True)).to_be_visible()
        row=page.get_by_role('row').filter(has_text='OM-PR2-ASY');expect(row).to_contain_text('Operation Manual')
        original=page.evaluate('JSON.stringify(db.departmentAuthorizations)')
        page.get_by_role('button',name='Tambah Kategori',exact=True).click();expect(page.locator('#category-code')).to_have_count(0);page.locator('#category-name').fill('Instruksi Uji')
        page.get_by_role('button',name='Simpan Kategori',exact=True).click();expect(page.locator('#modal')).to_be_visible();assert page.get_by_role('combobox',name='Jenis dokumen',exact=True).evaluate('(el)=>!el.validity.valid');assert not page.evaluate("db.documentCategories.some(c=>c.code==='IK-001')")
        fixture.choose(page,'Jenis dokumen','Instruksi Kerja');page.get_by_role('button',name='Simpan Kategori',exact=True).click();expect(page.locator('#modal')).not_to_be_visible()
        row=page.get_by_role('row').filter(has=page.get_by_role('cell',name='Instruksi Uji',exact=True));expect(row).to_contain_text('Instruksi Kerja')
        assert page.evaluate('JSON.stringify(db.departmentAuthorizations)')==original
        page.get_by_role('button',name='Tambah Kategori',exact=True).click();expect(page.locator('#category-code')).to_have_count(0);page.locator('#category-name').fill('Instruksi Uji Kedua');fixture.choose(page,'Jenis dokumen','Instruksi Kerja');page.get_by_role('button',name='Simpan Kategori',exact=True).click();expect(page.locator('#modal')).not_to_be_visible()
        assert page.evaluate("db.documentCategories.find(c=>c.name==='Instruksi Uji Kedua').code")=='IK-002'
        page.reload();expect(page.get_by_role('row').filter(has=page.get_by_role('cell',name='Instruksi Uji',exact=True))).to_contain_text('Instruksi Kerja')
        page.goto(BASE+'#create');fixture.choose(page,'Jenis dokumen','Instruksi Kerja');combo=page.get_by_role('combobox',name='Kategori dokumen',exact=True);combo.click();expect(page.get_by_role('option').filter(has_text='IK-001')).to_have_count(1);expect(page.get_by_role('option').filter(has_text='OM-PR2-ASY')).to_have_count(0)
        page.keyboard.press('Escape');fixture.choose(page,'Jenis dokumen','Operation Manual');combo.click();expect(page.get_by_role('option').filter(has_text='IK-001')).to_have_count(0);expect(page.get_by_role('option').filter(has_text='OM-PR2-ASY')).to_have_count(1);page.keyboard.press('Escape')
        # Bound empty categories can be reassigned, but referenced type cannot be deleted.
        page.goto(BASE+'#categories');page.get_by_role('button',name='Edit kategori Instruksi Uji',exact=True).click();fixture.choose(page,'Jenis dokumen','Inspection Manual');page.get_by_role('button',name='Simpan Kategori',exact=True).click();expect(page.get_by_role('row').filter(has=page.get_by_role('cell',name='Instruksi Uji',exact=True))).to_contain_text('Inspection Manual')
        page.goto(BASE+'#document-types');page.get_by_role('button',name='Delete Inspection Manual',exact=True).click();expect(page.locator('#modal')).to_contain_text('masih digunakan oleh kategori');expect(page.locator('[data-action="confirm-delete-type"]')).to_have_count(0);page.get_by_role('button',name='Mengerti',exact=True).click()
        page.get_by_role('button',name='Edit Inspection Manual',exact=True).click();page.locator('#type-name').fill('Inspection Manual Baru');page.get_by_role('button',name='Simpan Jenis Dokumen',exact=True).click();page.goto(BASE+'#categories');expect(page.get_by_role('row').filter(has=page.get_by_role('cell',name='Instruksi Uji',exact=True))).to_contain_text('Inspection Manual Baru')
        # Used default categories retain actual historic type; incompatible reassignment fails.
        page.evaluate("""()=>{const d=JSON.parse(localStorage.getItem('docuflow.database.v1'));const c=d.documentCategories.find(c=>c.code==='IK-001');d.documents.push({...d.documents[0],id:'type-check',categoryId:c.id,type:'Inspection Manual Baru'});localStorage.setItem('docuflow.database.v1',JSON.stringify(d));}""")
        page.reload();page.get_by_role('button',name='Edit kategori Instruksi Uji',exact=True).click();fixture.choose(page,'Jenis dokumen','Instruksi Kerja');page.get_by_role('button',name='Simpan Kategori',exact=True).click();expect(page.locator('#category-error')).to_contain_text('masih digunakan oleh jenis dokumen lain');page.get_by_role('button',name='Batal',exact=True).click()
        for width in [320,768,1440]:
            page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        assert not errors,errors;page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(fixture.ARTIFACTS/'category-types.png'),full_page=True)
        print('PASS category type required/CRUD/reload/filter, grants unchanged, rename stable, used category mismatch/type deletion blocked, responsive; screenshot:',fixture.ARTIFACTS/'category-types.png',flush=True);browser.close()

if __name__=='__main__':run()
