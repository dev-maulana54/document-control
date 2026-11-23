"""Searchable approvals and current-round decisions in an isolated browser."""
import importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec=importlib.util.spec_from_file_location('fixture',Path(__file__).with_name('browser-workbook.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chromium')
        page=browser.new_page(viewport={'width':1440,'height':1000})
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://127.0.0.1:4173/');f.login(page,'admin')
        page.evaluate('''()=>{
          const next=transaction();
          next.users.push({id:'reviewer-2',name:'Sari Reviewer',email:'sari@test.local',role:'user',departmentId:'qa'});
          const base={entityType:'request',requesterId:'u-user',revision:0,departmentId:'production',categoryId:'legacy-uncategorized',type:'ik',reviews:[],reviewRound:2,events:[],submissions:[]};
          next.documentRequests=[
            {...base,id:'approval-1',title:'Instruksi Baterai',code:'IK-009',status:'in_review',approverIds:['u-admin','u-qa','reviewer-2'],reviews:[{round:1,userId:'u-qa',status:'approved'},{round:2,userId:'u-admin',status:'approved'},{round:2,userId:'u-qa',status:'pending'},{round:2,userId:'reviewer-2',status:'approved'}]},
            {...base,id:'approval-2',title:'Prosedur Gudang',code:'SOP-002',status:'in_review',approverIds:['u-admin'],reviews:[{round:2,userId:'u-admin',status:'pending'}]},
            {...base,id:'approval-3',title:'Checksheet Final',code:'CS-003',status:'approved',approverIds:['u-admin'],reviews:[{round:2,userId:'u-admin',status:'approved'}]},
            {...base,id:'approval-4',title:'Instruksi Perbaikan',code:'IK-004',status:'returned',approverIds:['u-admin','u-qa'],reviews:[{round:2,userId:'u-admin',status:'pending'},{round:2,userId:'u-qa',status:'returned'}]},
            {...base,id:'approval-hidden',title:'Rahasia tidak ditugaskan',code:'HIDDEN-001',status:'in_review',approverIds:['u-qa']}
          ];if(!saveDatabase(next))throw Error('fixture');
        }''')
        page.goto('http://127.0.0.1:4173/#approvals')
        rows=page.locator('#approval-table-body tr[data-approval-request]:visible')
        expect(rows).to_have_count(4)
        first=page.locator('[data-approval-request="approval-1"]')
        expect(first).to_contain_text('2 dari 3 setuju')
        expect(first.locator('.approval-list li').first).to_contain_text('Belum menyetujui')
        expect(first.locator('.approval-person-approved')).to_have_count(2)
        expect(first.locator('.approval-person-pending')).to_have_count(1)
        expect(page.get_by_text('Rahasia tidak ditugaskan',exact=True)).to_have_count(0)
        search=page.get_by_role('searchbox',name='Cari persetujuan',exact=True)
        search.press_sequentially('baterai');expect(rows).to_have_count(1);expect(search).to_be_focused()
        expect(page.locator('#approval-result-count')).to_have_text('Menampilkan 1-1 dari 1 dokumen (4 total)')
        for query in ['  ik-009  ','Sari Reviewer']:
            search.fill(query);expect(rows).to_have_count(1);expect(first).to_be_visible()
        author=page.evaluate("userName('u-user')")
        search.fill(author);expect(rows).to_have_count(4)
        search.fill('tidak ditemukan');expect(rows).to_have_count(0)
        expect(page.get_by_role('heading',name='Tidak ada hasil yang cocok')).to_be_visible()
        page.get_by_role('button',name='Reset pencarian',exact=True).click();expect(rows).to_have_count(4);expect(search).to_be_focused()
        status=page.get_by_role('combobox',name='Status dokumen',exact=True)
        status.fill('diterbitkan');page.get_by_role('option',name='Siap diterbitkan',exact=True).click();expect(rows).to_have_count(1);expect(rows).to_contain_text('Checksheet Final')
        search.fill('gudang');expect(rows).to_have_count(0)
        page.get_by_role('button',name='Reset pencarian',exact=True).click();expect(status).to_have_value('')
        status.fill('perbaikan');page.get_by_role('option',name='Perlu perbaikan',exact=True).click();expect(rows).to_have_count(1)
        expect(rows).to_contain_text('Dikembalikan');expect(rows).to_contain_text('Putaran ini dikembalikan')
        page.get_by_role('button',name='Reset pencarian',exact=True).click()
        first.get_by_role('link',name='Lihat detail',exact=True).click();expect(page.locator('h1')).to_have_text('Instruksi Baterai')
        page.goto('http://127.0.0.1:4173/#approvals')
        for width in [1440,1024,768,320]:
            page.set_viewport_size({'width':width,'height':1000})
            page.evaluate('''async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})));}''')
            expect(search).to_be_visible();expect(status).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
            page.screenshot(path=str(f.ARTIFACTS/f'approval-list-{width}.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1000})
        # Search options by keyboard, then paginate a dataset larger than one page.
        status.fill('tidak tersedia');expect(page.get_by_text('Pilihan tidak ditemukan.',exact=True)).to_be_visible()
        status.press('Escape');expect(status).to_have_value('')
        status.fill('menunggu');status.press('ArrowDown');status.press('Enter')
        expect(rows).to_have_count(2);expect(status).to_have_value('Menunggu persetujuan')
        page.get_by_role('button',name='Reset pencarian',exact=True).click();expect(status).to_have_value('')
        page.evaluate("""()=>{const next=transaction(),base=next.documentRequests[0];
          for(let n=5;n<=27;n++)next.documentRequests.push({...base,id:'approval-'+n,title:'Dokumen Pagination '+n,code:'PAGE-'+n,status:n%2?'in_review':'approved'});
          saveDatabase(next);render();}""")
        expect(rows).to_have_count(10)
        expect(page.locator('#approval-result-count')).to_have_text('Menampilkan 1-10 dari 27 dokumen')
        previous=page.get_by_role('button',name='Halaman sebelumnya',exact=True)
        next_page=page.get_by_role('button',name='Halaman berikutnya',exact=True)
        expect(previous).to_be_disabled();next_page.click();expect(rows).to_have_count(10)
        expect(page.locator('#approval-result-count')).to_have_text('Menampilkan 11-20 dari 27 dokumen')
        page.get_by_role('button',name='Halaman 3',exact=True).click();expect(rows).to_have_count(7);expect(next_page).to_be_disabled()
        expect(page.locator('#approval-result-count')).to_have_text('Menampilkan 21-27 dari 27 dokumen')
        search.fill('baterai');expect(rows).to_have_count(1)
        expect(page.get_by_role('button',name='Halaman 1',exact=True)).to_have_attribute('aria-current','page')
        page.get_by_role('button',name='Reset pencarian',exact=True).click()
        size=page.get_by_role('combobox',name='Dokumen per halaman',exact=True)
        size.fill('25');size.press('ArrowDown');size.press('Enter');expect(rows).to_have_count(25)
        next_page.click();expect(rows).to_have_count(2)
        status.fill('diterbitkan');page.get_by_role('option',name='Siap diterbitkan',exact=True).click()
        expect(rows).to_have_count(12);expect(previous).to_be_disabled()
        page.get_by_role('button',name='Reset pencarian',exact=True).click();expect(rows).to_have_count(25)
        size.fill('50');size.press('ArrowDown');size.press('Enter');expect(rows).to_have_count(27);expect(next_page).to_be_disabled()
        size.fill('10');size.press('ArrowDown');size.press('Enter');expect(rows).to_have_count(10)
        page.screenshot(path=str(f.ARTIFACTS/'approval-pagination.png'),full_page=True)
        page.set_viewport_size({'width':320,'height':1000})
        size.fill('25');page.get_by_role('option',name='25',exact=True).click();expect(rows).to_have_count(25)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        size.fill('10');size.press('ArrowDown');size.press('Enter');expect(rows).to_have_count(10)
        page.set_viewport_size({'width':1440,'height':1000})
        # Filters survive rerenders, and remain usable on an empty list.
        search.fill('baterai');page.goto('http://127.0.0.1:4173/#home');page.goto('http://127.0.0.1:4173/#approvals')
        expect(search).to_have_value('baterai');expect(rows).to_have_count(1)
        page.evaluate('''()=>{const next=transaction();next.documentRequests=[];saveDatabase(next);render();}''')
        expect(page.get_by_role('heading',name='Belum ada permintaan',exact=True)).to_be_visible()
        expect(page.locator('#approval-result-count')).to_have_text('Menampilkan 0 dari 0 dokumen')
        assert not errors,errors
        print(json.dumps({'result':'PASS searchable selects, keyboard, pagination, sizes, combined filters, current round, named approvers, empty states, detail action, authorization and 4 viewport widths','artifacts':str(f.ARTIFACTS)}),flush=True)
        browser.close()

if __name__=='__main__':run()
