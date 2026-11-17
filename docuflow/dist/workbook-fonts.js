'use strict';

let workbookFontChoice = -1;
function closeWorkbookFonts() {
  document.getElementById('workbook-font-options')?.remove();
  document.getElementById('workbook-font-search')?.setAttribute('aria-expanded', 'false');
  document.getElementById('workbook-font-search')?.removeAttribute('aria-activedescendant');
}
function showWorkbookFonts(query = '') {
  if (!workbookDocument(true)) return;
  const input = document.getElementById('workbook-font-search');
  closeWorkbookFonts();
  const names = [...new Set([...WorkbookFormat.fonts, ...activeWorkbook.book.styles.map(style => style.fontName).filter(Boolean)])];
  const matches = names.filter(name => name.toLowerCase().includes(query.trim().toLowerCase()));
  const list = document.createElement('div'); list.id = 'workbook-font-options'; list.className = 'workbook-font-options'; list.setAttribute('role','listbox'); list.setAttribute('aria-label','Pilihan font');
  list.innerHTML = matches.map((name,index) => `<button type="button" role="option" aria-selected="false" id="font-option-${index}" data-font-option="${esc(name)}">${esc(name)}</button>`).join('') || '<p>Font tidak ditemukan.</p>';
  list.querySelectorAll('[data-font-option]').forEach(option => { option.style.fontFamily = option.dataset.fontOption; });
  const rect = input.getBoundingClientRect();
  Object.assign(list.style, { left: Math.max(4, Math.min(rect.left, innerWidth - 234)) + 'px', top: rect.bottom + 4 + 'px' });
  document.body.appendChild(list); input.setAttribute('aria-expanded', 'true'); workbookFontChoice = -1;
}
function applyWorkbookFont(name) {
  const input = document.getElementById('workbook-font-search'), target = activeWorkbook?.formatTarget;
  input.value = name; closeWorkbookFonts();
  applyWorkbookFormat('fontName', name, target?.control === input && target.sheetIndex === activeWorkbook.sheetIndex ? target.range : workbookRange());
}
document.addEventListener('focusin', event => {
  if (!event.target.matches('[data-format-property], #workbook-font-search') || !workbookDocument(true)) return;
  activeWorkbook.formatTarget = { control: event.target, range: workbookRange(), sheetIndex: activeWorkbook.sheetIndex };
  if (event.target.id === 'workbook-font-search') { event.target.select(); showWorkbookFonts(); }
});
document.addEventListener('input', event => { if (event.target.id === 'workbook-font-search') showWorkbookFonts(event.target.value); });
document.addEventListener('pointerdown', event => {
  if (event.target.closest('[data-font-option]')) event.preventDefault();
  else if (!event.target.closest('#workbook-font-search')) closeWorkbookFonts();
});
document.addEventListener('click', event => { const option = event.target.closest('[data-font-option]'); if (option && workbookDocument(true)) applyWorkbookFont(option.dataset.fontOption); });
document.addEventListener('keydown', event => {
  if (event.target.matches('[data-format-property="fontSize"]') && event.key === 'Enter') {
    event.preventDefault(); event.target.blur(); restoreWorkbookFocus(); return;
  }
  if (event.target.id !== 'workbook-font-search') return;
  const options = [...document.querySelectorAll('[data-font-option]')];
  if (event.key === 'Escape') { event.preventDefault(); closeWorkbookFonts(); restoreWorkbookFocus(); }
  else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    workbookFontChoice = Math.max(0, Math.min(options.length - 1, workbookFontChoice + (event.key === 'ArrowDown' ? 1 : -1)));
    options.forEach((option,index) => option.setAttribute('aria-selected', index === workbookFontChoice));
    if (options[workbookFontChoice]) { event.target.setAttribute('aria-activedescendant', options[workbookFontChoice].id); options[workbookFontChoice].scrollIntoView({ block:'nearest' }); }
  } else if (event.key === 'Enter' && workbookDocument(true)) {
    event.preventDefault();
    const name = options[workbookFontChoice]?.dataset.fontOption || options.find(option => option.dataset.fontOption.toLowerCase() === event.target.value.trim().toLowerCase())?.dataset.fontOption;
    if (name) applyWorkbookFont(name);
  } else if (event.key === 'Tab') closeWorkbookFonts();
});
window.addEventListener('hashchange', closeWorkbookFonts);
window.addEventListener('storage', closeWorkbookFonts);
