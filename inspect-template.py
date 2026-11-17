import importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright
s=importlib.util.spec_from_file_location('f',Path('tests/browser-workbook.py'));f=importlib.util.module_from_spec(s);s.loader.exec_module(f)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chromium');page=b.new_page(viewport={'width':1920,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4173/');f.login(page,'admin');f.upload(page,Path(r'C:/Users/Maulana Saepul Akbar/Downloads/Form-ISD-ISD-007 (Work Instruction).xlsx').read_bytes());page.goto('http://127.0.0.1:4173/#create');page.locator('#doc-title').fill('Template comparison');f.choose(page,'Jenis dokumen','Instruksi Kerja');f.choose(page,'Kategori dokumen','LEGACY');f.save_and_open(page);page.locator('.workbook-cell').first.wait_for();page.wait_for_timeout(600)
 print(page.locator('.workbook-image').evaluate_all('(nodes)=>nodes.map(n=>({key:n.dataset.insertedImage,rect:n.getBoundingClientRect().toJSON(),complete:n.complete,natural:n.naturalWidth,visibility:getComputedStyle(n).visibility,z:getComputedStyle(n).zIndex,src:n.src?.slice(0,60)}))'))
 print(page.evaluate('({warnings:activeWorkbook.book.sheets[0].previewWarnings,zoom:activeWorkbook.view.zoom})'));print(errors)
 page.screenshot(path='D:/project/document-control/template-after-import.png')
 print(page.evaluate('()=>{const n=document.querySelector(".workbook-image[data-inserted-image=original-9]"),r=n.getBoundingClientRect();return document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).map(e=>({tag:e.tagName,cls:e.getAttribute("class"),background:getComputedStyle(e).backgroundColor,z:getComputedStyle(e).zIndex}));}'))
 print(page.locator('.workbook-native-borders').evaluate('(el)=>({background:getComputedStyle(el).backgroundColor,visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,z:getComputedStyle(el).zIndex})'))
 page.locator('.workbook-native-borders').evaluate('(el)=>el.style.display="none"');page.screenshot(path='D:/project/document-control/template-no-border-layer.png')
 page.locator('#workbook-grid').evaluate('(g)=>g.scrollTop=1100');page.wait_for_timeout(150);page.screenshot(path='D:/project/document-control/template-lower.png')
 b.close()
