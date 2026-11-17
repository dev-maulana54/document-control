'use strict';

function recipientChips(ids) {
  return db.users.filter(user => ids.includes(user.id) && user.id !== currentUser.id).map(user => `<span class="recipient-chip"><input type="hidden" name="notifyUserIds" value="${esc(user.id)}"><span>${esc(user.name)}</span><button type="button" data-remove-recipient="${esc(user.id)}" aria-label="Hapus penerima ${esc(user.name)}">${icon('close')}</button></span>`).join('');
}

function notificationRecipientsField(selectedIds = []) {
  const resultsId = 'recipient-results-' + uid();
  const ids = db.users.filter(user => selectedIds.includes(user.id) && user.id !== currentUser.id).map(user => user.id);
  return `<fieldset class="notification-picker"><legend>Notifikasi Email <span class="muted small">(opsional)</span></legend><p>Cari dan pilih penerima email. Pengiriman email belum aktif karena layanan pengirim belum terhubung.</p><div class="recipient-search-wrap"><input type="search" class="recipient-search" aria-label="Cari penerima email" aria-controls="${resultsId}" aria-expanded="false" autocomplete="off" placeholder="Ketik nama atau email penerima..."><div id="${resultsId}" class="recipient-list" role="group" aria-label="Hasil pencarian penerima" hidden></div></div><div class="recipient-selected" aria-label="Penerima terpilih">${recipientChips(ids)}</div><div class="recipient-count" role="status">${ids.length} pengguna dipilih</div></fieldset>`;
}

function closeRecipientResults(picker) {
  picker.querySelector('.recipient-list').hidden = true;
  picker.querySelector('.recipient-search').setAttribute('aria-expanded', 'false');
}

function searchRecipients(picker) {
  const input = picker.querySelector('.recipient-search');
  const query = input.value.trim().toLowerCase();
  const results = picker.querySelector('.recipient-list');
  if (!query) { results.replaceChildren(); closeRecipientResults(picker); return; }
  const selected = new Set([...picker.querySelectorAll('input[name="notifyUserIds"]')].map(input => input.value));
  const matches = db.users.filter(user => user.id !== currentUser.id && `${user.name} ${user.email}`.toLowerCase().includes(query));
  results.innerHTML = matches.map(user => `<label class="recipient-choice"><input type="checkbox" data-recipient-id="${esc(user.id)}" ${selected.has(user.id) ? 'checked' : ''}><span><strong>${esc(user.name)}</strong><span>${esc(user.email)} · ${esc(departmentName(user.departmentId))}</span></span></label>`).join('') || '<p class="recipient-empty">Tidak ada pengguna yang sesuai.</p>';
  results.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  const rect = input.getBoundingClientRect();
  const bounds = modal.open && modal.contains(picker) ? modal.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  picker.querySelector('.recipient-search-wrap').classList.toggle('opens-up', bounds.bottom - rect.bottom < 220 && rect.top - bounds.top > bounds.bottom - rect.bottom);
}

function setRecipient(picker, id, checked) {
  const user = db.users.find(user => user.id === id && user.id !== currentUser.id);
  if (!user) return;
  const selected = new Set([...picker.querySelectorAll('input[name="notifyUserIds"]')].map(input => input.value));
  if (checked) selected.add(id); else selected.delete(id);
  picker.querySelector('.recipient-selected').innerHTML = recipientChips([...selected]);
  picker.querySelectorAll('[data-recipient-id]').forEach(input => { input.checked = selected.has(input.dataset.recipientId); });
  picker.querySelector('.recipient-count').textContent = selected.size + ' pengguna dipilih';
}

// Pertahankan fokus di dalam picker selama interaksi pada baris penerima.
document.addEventListener('pointerdown', event => {
  if (event.button === 0 && event.target.closest('.recipient-choice') && !event.target.matches('input')) event.preventDefault();
});

document.addEventListener('input', event => {
  if (event.target.matches('.recipient-search')) searchRecipients(event.target.closest('.notification-picker'));
});
document.addEventListener('change', event => {
  if (event.target.matches('[data-recipient-id]')) setRecipient(event.target.closest('.notification-picker'), event.target.dataset.recipientId, event.target.checked);
});
document.addEventListener('click', event => {
  const choice = event.target.closest('.recipient-choice');
  if (choice && !event.target.matches('[data-recipient-id]')) {
    event.preventDefault();
    const checkbox = choice.querySelector('[data-recipient-id]');
    setRecipient(choice.closest('.notification-picker'), checkbox.dataset.recipientId, !checkbox.checked);
    return;
  }
  const remove = event.target.closest('[data-remove-recipient]');
  if (remove) {
    const picker = remove.closest('.notification-picker');
    setRecipient(picker, remove.dataset.removeRecipient, false);
    picker.querySelector('.recipient-search').focus();
  }
  document.querySelectorAll('.notification-picker').forEach(picker => { if (!picker.contains(event.target)) closeRecipientResults(picker); });
});
document.addEventListener('focusin', event => {
  document.querySelectorAll('.notification-picker').forEach(picker => {
    if (!picker.contains(event.target)) closeRecipientResults(picker);
    else if (event.target.matches('.recipient-search')) searchRecipients(picker);
  });
});
document.addEventListener('keydown', event => {
  const picker = event.target.closest('.notification-picker');
  if (!picker) return;
  if (event.key === 'Escape' && !picker.querySelector('.recipient-list').hidden) {
    event.preventDefault(); event.stopPropagation();
    picker.querySelector('.recipient-search').focus();
    closeRecipientResults(picker);
  }
  if (event.key === 'ArrowDown' && event.target.matches('.recipient-search')) {
    searchRecipients(picker);
    const first = picker.querySelector('[data-recipient-id]');
    if (first) { event.preventDefault(); first.focus(); }
  }
});
