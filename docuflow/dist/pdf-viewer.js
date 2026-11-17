'use strict';

const channel = new URLSearchParams(location.hash.slice(1)).get('channel');
const appWindow = window.opener;
const frame = document.getElementById('pdf-frame');
const controls = document.getElementById('viewer-controls');
const message = document.getElementById('viewer-message');
const status = document.getElementById('control-status');
const zoomLevel = document.getElementById('zoom-level');
let pdfUrl = '';
let pdfBlob;
let zoom = 100;
let fitMode = false;
let statusTimeout;

function showError(text) {
  message.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'Preview belum tersedia';
  const description = document.createElement('p');
  description.textContent = text;
  const link = document.createElement('a');
  link.href = 'index.html#master';
  link.textContent = 'Kembali ke Master Dokumen';
  message.append(heading, description, link);
  message.hidden = false;
}

function showStatus(text) {
  clearTimeout(statusTimeout);
  status.textContent = text;
  statusTimeout = setTimeout(() => { status.textContent = ''; }, 4500);
}

function updateView() {
  // PDF browsers read zoom on navigation; a fresh URL also works after repeated clicks.
  const previousUrl = pdfUrl;
  pdfUrl = URL.createObjectURL(pdfBlob);
  frame.src = pdfUrl + (fitMode ? '#toolbar=0&navpanes=0&view=Fit' : '#toolbar=0&navpanes=0&zoom=' + zoom);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  zoomLevel.textContent = fitMode ? 'Fit' : zoom + '%';
  document.getElementById('zoom-out').disabled = !fitMode && zoom <= 25;
  document.getElementById('zoom-in').disabled = !fitMode && zoom >= 300;
}

function receivePdf(event) {
  if (event.source !== appWindow || event.data?.type !== 'docuflow:pdf-data' || event.data.channel !== channel) return;
  if (location.protocol !== 'file:' && event.origin !== location.origin) return;
  clearTimeout(loadTimeout);
  window.removeEventListener('message', receivePdf);
  window.opener = null;
  try {
    const attachment = event.data.attachment;
    if (!attachment || !/\.pdf$/i.test(attachment.name) || typeof attachment.data !== 'string' || attachment.data.length > 2.8 * 1024 * 1024 || !/^data:[^,]{0,100};base64,/.test(attachment.data)) throw new Error('File PDF tidak valid. Buka kembali melalui tombol View di aplikasi.');
    const bytes = Uint8Array.from(atob(attachment.data.split(',')[1]), character => character.charCodeAt(0));
    if (bytes.length > 2 * 1024 * 1024 || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('File PDF tidak valid atau melebihi 2 MB.');
    pdfBlob = new Blob([bytes], { type: 'application/pdf' });
    const metadata = event.data.metadata || {};
    const title = document.getElementById('document-title');
    title.textContent = metadata.title || 'Preview Dokumen';
    title.title = title.textContent;
    document.title = (metadata.title || attachment.name) + ' · Preview PDF';
    const code = document.getElementById('document-code');
    code.textContent = metadata.code || '';
    code.hidden = !metadata.code;
    message.hidden = true;
    frame.hidden = false;
    controls.hidden = false;
    updateView();
  } catch (error) { showError(error.message); }
}

const loadTimeout = setTimeout(() => {
  window.removeEventListener('message', receivePdf);
  window.opener = null;
  showError('Buka kembali preview melalui tombol View pada dokumen di aplikasi.');
}, 30000);

if (appWindow && channel) {
  window.addEventListener('message', receivePdf);
  appWindow.postMessage({ type: 'docuflow:pdf-ready', channel }, location.protocol === 'file:' ? '*' : location.origin);
} else {
  clearTimeout(loadTimeout);
  showError('Pilih dokumen PDF, lalu klik View atau Preview PDF di aplikasi.');
}

document.getElementById('zoom-in').addEventListener('click', () => {
  zoom = Math.min(300, (fitMode ? 100 : zoom) + 25); fitMode = false; updateView();
});
document.getElementById('zoom-out').addEventListener('click', () => {
  zoom = Math.max(25, (fitMode ? 100 : zoom) - 25); fitMode = false; updateView();
});
document.getElementById('fit-page').addEventListener('click', () => { fitMode = true; updateView(); });
document.getElementById('full-view').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else showStatus('Mode layar penuh tidak tersedia. Gunakan menu layar penuh browser.');
  } catch { showStatus('Mode layar penuh tidak diizinkan browser. Gunakan menu layar penuh browser.'); }
});
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  const button = document.getElementById('full-view');
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? 'Keluar full view' : 'Full view');
  button.title = active ? 'Keluar full view' : 'Full view';
});
window.addEventListener('pagehide', () => {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
});
