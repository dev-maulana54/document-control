"""Admin request deletion, confirmation/guards and reference-aware file cleanup."""
import importlib.util,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
BASE='http://127.0.0.1:4173/'


def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium');page=browser.new_page(viewport={'width':1600,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE);f.login(page,'admin');f.upload(page,f.WORKBOOK);f.logout(page);f.login(page,'user')
        page.goto(BASE+'#create');page.locator('#doc-title').fill('Permintaan Hapus Uji');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for();page.get_by_role('button',name='Submit ke Admin',exact=True).click();expect(page).to_have_url(re.compile('#requests$'))
        record=page.evaluate("db.documentRequests.find(r=>r.title==='Permintaan Hapus Uji')")
        expect(page.locator('[data-request-action="delete"]')).to_have_count(0)
        page.evaluate('(id)=>showDeleteDocumentRequest(id)',record['id']);expect(page.locator('#request-delete-form')).to_have_count(0)
        f.logout(page);f.login(page,'admin');page.goto(BASE+'#requests')
        row=page.get_by_role('row').filter(has_text='Permintaan Hapus Uji');button=row.get_by_role('button',name='Hapus permintaan Permintaan Hapus Uji',exact=True);expect(button).to_be_enabled()
        button.click();expect(page.get_by_role('heading',name='Hapus Permintaan?',exact=True)).to_be_visible();page.get_by_role('button',name='Batal',exact=True).click();expect(row).to_be_visible()
        assert page.evaluate('async key=>(await WorkbookStore.get(key)).byteLength>0',record['workbookKey'])

        # A stale confirmation must not delete a changed database record.
        button.click();page.evaluate("()=>{const next=transaction();next.documentRequests[0].description='Changed while confirmation is open';saveDatabase(next);}")
        page.get_by_role('button',name='Hapus Permintaan',exact=True).click();expect(page.locator('#request-delete-error')).to_contain_text('Data permintaan berubah');page.get_by_role('button',name='Batal',exact=True).click()
        button.click()
        page.evaluate("()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===DB_KEY)throw new DOMException('full','QuotaExceededError');return window.originalStorageSet.call(this,key,value);};}")
        try:
            page.get_by_role('button',name='Hapus Permintaan',exact=True).click();expect(page.locator('#request-delete-error')).to_contain_text('penyimpanan gagal')
            assert page.evaluate('(id)=>db.documentRequests.some(r=>r.id===id)',record['id'])
            assert page.evaluate('async key=>(await WorkbookStore.get(key)).byteLength>0',record['workbookKey'])
        finally:
            page.evaluate('Storage.prototype.setItem=window.originalStorageSet;delete window.originalStorageSet;')
        page.get_by_role('button',name='Batal',exact=True).click()

        # Active requests may own old review files; shared official/template files survive.
        setup=page.evaluate('''async id=>{
          const bytes=await WorkbookStore.get(db.documentRequests.find(r=>r.id===id).workbookKey);
          await WorkbookStore.put('delete-test-orphan',bytes);await WorkbookStore.put('delete-test-shared',bytes);
          const next=transaction(),r=next.documentRequests.find(r=>r.id===id);r.status='in_review';r.submittedWorkbookKey='delete-test-orphan';r.submissions=[{round:1,workbookKey:'delete-test-orphan'},{round:2,workbookKey:'delete-test-shared'}];r.sourceId=next.documents[0].id;next.documents[0].workbookKey='delete-test-shared';saveDatabase(next);render();
          return {documents:JSON.stringify(db.documents),templateKey:db.documentTemplates[0].workbookKey};
        }''',record['id'])
        expect(row).to_contain_text('Menunggu persetujuan');button.click();expect(page.locator('#request-delete-form')).to_contain_text('akan dihentikan');page.get_by_role('button',name='Hapus Permintaan',exact=True).click();expect(row).to_have_count(0)
        page.wait_for_function('''async key=>{for(const candidate of [key,'delete-test-orphan']){try{await WorkbookStore.get(candidate);return false;}catch{}}return true;}''',arg=record['workbookKey'])
        assert page.evaluate('JSON.stringify(db.documents)')==setup['documents']
        for key in ['delete-test-shared',setup['templateKey']]:assert page.evaluate('async key=>(await WorkbookStore.get(key)).byteLength>0',key)
        assert page.evaluate('(id)=>db.activities.some(a=>a.kind==="request"&&a.documentId===id&&a.action==="menghapus permintaan dokumen")',record['id'])

        page.evaluate('''async record=>{const bytes=await WorkbookStore.get('delete-test-shared');await WorkbookStore.put('published-history-file',bytes);const next=transaction();for(const status of ['in_review','approved','published'])next.documentRequests.push({...record,id:'locked-'+status,title:'Locked '+status,status,workbookKey:'delete-test-shared',submissions:status==='published'?[{round:1,workbookKey:'published-history-file'}]:[],publishedDocumentId:status==='published'?next.documents[0].id:null});saveDatabase(next);render();}''',record)
        for status in ['in_review','approved','published']:
            locked=page.get_by_role('row').filter(has_text='Locked '+status)
            locked.get_by_role('button',name='Hapus permintaan Locked '+status,exact=True).click();page.get_by_role('button',name='Hapus Permintaan',exact=True).click();expect(locked).to_have_count(0)
        assert page.evaluate('''()=>{const d=db.documents[0];return d.status==='active'&&d.workbookKey==='delete-test-shared'&&d.requestArchive.id==='locked-published'&&!canDeleteDocument(d)}''')
        assert page.evaluate("async ()=>(await WorkbookStore.get('delete-test-shared')).byteLength>0")
        assert page.evaluate("async ()=>(await WorkbookStore.get('published-history-file')).byteLength>0")
        page.reload();expect(page.get_by_role('row').filter(has_text='Permintaan Hapus Uji')).to_have_count(0)
        for width in [320,768,1600]:
            page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(f.ARTIFACTS/'request-delete-actions.png'),full_page=True)
        page.goto(BASE+'#workbook-'+record['id']);expect(page.get_by_role('heading',name='Dokumen tidak tersedia',exact=True)).to_be_visible()
        assert not errors,errors;browser.close();print('PASS admin request deletion across statuses, cancel/stale/quota checks, shared files and publication archive, reload and responsive layout',flush=True)


if __name__=='__main__':run()
