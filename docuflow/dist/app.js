'use strict';

// Data tersimpan sebagai tabel berelasi; semua penulisan melalui saveDatabase().
const DB_KEY = 'docuflow.database.v1';
const SESSION_KEY = 'docuflow.session.v1';
const CBI_LOGO_URL = new URL('assets/cbi.png', document.currentScript.src).href;
const PDF_VIEWER_URL = new URL('pdf-viewer.html', document.currentScript.src).href;
const TYPES = ['Checksheet', 'Instruksi Kerja', 'Standard Engineering', 'Operation Manual', 'Inspection Manual'];
const PREFIXES = ['CS', 'IK', 'SE', 'OM', 'IM'];
const COLORS = ['', 'green', 'orange', 'purple', 'cyan'];
const paths = {
  document: '<path d="M14 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9Z"/><path d="M14 2v7h7M7 14h10M7 18h7"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Z"/><path d="m2 12 10 5 10-5M2 16l10 5 10-5"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m13 6 5 5M13 21h8"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h2M13 15h2"/>',
  building: '<path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-3h4v3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circlecheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  refresh: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/><circle cx="8" cy="7" r="1"/><circle cx="15" cy="12" r="1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 4 5"/>',
  logout: '<path d="M10 4H4v16h6M9 12h13m-5-5 5 5-5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V3h15l3 3v13a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.document}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dateLabel = (value, full = false) => new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: full ? 'long' : 'short', year: 'numeric' });
const today = () => new Date().toISOString();
const app = document.getElementById('app');
const modal = document.getElementById('modal');
const pdfSelections = new WeakMap();
const searchableSelects = new WeakMap();
const formatRevision = value => String(Math.max(0, Math.trunc(Number(value) || 0)));
let db, currentUser, page = 1, filter = { search: '', type: '', department: '', category: '' }, createMode = 'create', adminTab = 'users', toastTimer;

function seedDatabase() {
  const departments = [{ id: 'eng', name: 'Engineering', code: 'ENG' }, { id: 'prod', name: 'Production', code: 'PRD' }, { id: 'qa', name: 'Quality Assurance', code: 'QA' }, { id: 'maint', name: 'Maintenance', code: 'MTC' }];
  const sections = [{ id: 'eng-process', departmentId: 'eng', name: 'Process Engineering' }, { id: 'eng-design', departmentId: 'eng', name: 'Design Engineering' }, { id: 'prod-assembly', departmentId: 'prod', name: 'Assembly' }, { id: 'prod-machining', departmentId: 'prod', name: 'Machining' }, { id: 'qa-inspection', departmentId: 'qa', name: 'Quality Inspection' }, { id: 'maint-machine', departmentId: 'maint', name: 'Machine Maintenance' }];
  const users = [{ id: 'u-admin', name: 'Aditya Pratama', email: 'admin@docuflow.id', password: 'admin123', role: 'admin', departmentId: 'eng', sectionId: 'eng-process' }, { id: 'u-user', name: 'Rina Wulandari', email: 'user@docuflow.id', password: 'user123', role: 'user', departmentId: 'prod', sectionId: 'prod-assembly' }, { id: 'u-qa', name: 'Budi Santoso', email: 'budi@docuflow.id', password: 'user123', role: 'user', departmentId: 'qa', sectionId: 'qa-inspection' }];
  const records = [
    ['Checksheet Pemeriksaan Harian Mesin', 0, 'prod', 'prod-assembly', 'active', 'u-user', 2],
    ['Instruksi Kerja Proses Assembly', 1, 'prod', 'prod-assembly', 'active', 'u-user', 3],
    ['Standar Toleransi Dimensi Produk', 2, 'eng', 'eng-process', 'review', 'u-admin', 1],
    ['Manual Pengoperasian Mesin CNC', 3, 'prod', 'prod-machining', 'active', 'u-user', 2],
    ['Panduan Inspeksi Incoming Material', 4, 'qa', 'qa-inspection', 'draft', 'u-qa', 0],
    ['Checksheet Preventive Maintenance', 0, 'maint', 'maint-machine', 'active', 'u-admin', 1],
    ['Instruksi Kerja Pengelasan Komponen', 1, 'eng', 'eng-design', 'active', 'u-admin', 2],
    ['Standar Material Komponen Plastik', 2, 'eng', 'eng-design', 'active', 'u-admin', 0],
    ['Manual Pengoperasian Conveyor', 3, 'prod', 'prod-assembly', 'review', 'u-user', 1],
    ['Standar Inspeksi Produk Akhir', 4, 'qa', 'qa-inspection', 'active', 'u-qa', 2],
    ['Checksheet Kebersihan Area Produksi', 0, 'prod', 'prod-assembly', 'active', 'u-user', 0],
    ['Instruksi Penggantian Cutting Tool', 1, 'maint', 'maint-machine', 'draft', 'u-admin', 0],
    ['Standar Toleransi Dimensi Lama', 2, 'eng', 'eng-process', 'archive', 'u-admin', 0]
  ];
  const documents = records.map((r, i) => ({ id: `doc-${i + 1}`, title: r[0], type: TYPES[r[1]], departmentId: r[2], sectionId: r[3], status: r[4], ownerId: r[5], revision: r[6], code: `${PREFIXES[r[1]]}/${departments.find(d => d.id === r[2]).code}/${String(i + 1).padStart(3, '0')}`, description: `Dokumen ${r[0].toLowerCase()} sebagai acuan pelaksanaan pekerjaan untuk memastikan proses berjalan konsisten dan sesuai standar perusahaan.\n\nGunakan revisi terbaru yang telah disetujui. Hubungi penanggung jawab departemen untuk informasi lebih lanjut.`, changeNotes: 'Pembaruan standar dan penyesuaian prosedur kerja.', createdAt: new Date(Date.now() - (i + 3) * 86400000).toISOString(), updatedAt: new Date(Date.now() - i * 86400000).toISOString(), effectiveDate: new Date().toISOString().slice(0, 10), attachment: null, supersedesId: null, history: [{ revision: r[6], date: new Date(Date.now() - i * 86400000).toISOString(), userId: r[5], notes: 'Dokumen contoh untuk demonstrasi.' }] }));
  const activities = [{ id: uid(), userId: 'u-admin', action: 'memperbarui dokumen', documentId: 'doc-1', title: records[0][0], kind: 'edit', createdAt: new Date(Date.now() - 600000).toISOString() }, { id: uid(), userId: 'u-user', action: 'mengajukan review', documentId: 'doc-9', title: records[8][0], kind: 'clock', createdAt: new Date(Date.now() - 2100000).toISOString() }, { id: uid(), userId: 'u-admin', action: 'menyetujui dokumen', documentId: 'doc-2', title: records[1][0], kind: 'circlecheck', createdAt: new Date(Date.now() - 3600000).toISOString() }, { id: uid(), userId: 'u-qa', action: 'membuat draft baru', documentId: 'doc-5', title: records[4][0], kind: 'document', createdAt: new Date(Date.now() - 7200000).toISOString() }];
  return { version: 1, departments, sections, users, documents, activities, documentTypes: defaultDocumentTypes(), notifications: [] };
}

function defaultDocumentTypes() {
  return TYPES.map((name, i) => ({ id: 'builtin-' + PREFIXES[i].toLowerCase(), name, prefix: PREFIXES[i] }));
}

function routeDocumentType(route) {
  if (!route.startsWith('type-')) return null;
  const key = route.slice(5);
  const id = /^\d+$/.test(key) ? defaultDocumentTypes()[Number(key)]?.id : key;
  return db.documentTypes.find(type => type.id === id) || null;
}

function loadDatabase() {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed || parsed.version !== 1 || !['users', 'departments', 'sections', 'documents', 'activities'].every(k => Array.isArray(parsed[k]))) throw new Error('Format data tidak sesuai.');
    if (parsed.documentTypes === undefined) {
      parsed.documentTypes = defaultDocumentTypes();
      for (const doc of parsed.documents) {
        if (parsed.documentTypes.some(type => type.name === doc.type)) continue;
        let base = (doc.code?.split('/')[0] || 'DOC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'DOC';
        if (!/^[A-Z]/.test(base)) base = 'D' + base;
        let prefix = base, suffix = 2;
        while (parsed.documentTypes.some(type => type.prefix === prefix)) prefix = base.slice(0, 5) + suffix++;
        parsed.documentTypes.push({ id: uid(), name: doc.type, prefix });
      }
      localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    }
    if (!Array.isArray(parsed.documentTypes)) throw new Error('Format jenis dokumen tidak sesuai.');
    if (parsed.notifications === undefined) parsed.notifications = [];
    if (!Array.isArray(parsed.notifications)) throw new Error('Format notifikasi tidak sesuai.');
    if (DocumentAccess.migrate(parsed)) localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    if (parsed.documentTemplates === undefined) parsed.documentTemplates = [];
    if (!Array.isArray(parsed.documentTemplates)) throw new Error('Format template dokumen tidak sesuai.');
    if (DocumentWorkflow.migrate(parsed)) localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    if (DocumentCategories.migrate(parsed)) localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    return parsed;
  }
  const initial = CleanStart.database(null, seedDatabase());
  initial.documentTemplates = [];
  DocumentAccess.migrate(initial);
  DocumentWorkflow.migrate(initial);
  DocumentCategories.migrate(initial);
  localStorage.setItem(DB_KEY, JSON.stringify(initial));
  return initial;
}

function saveDatabase(next) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(next)); db = next; return true; }
  catch { toast('Penyimpanan gagal. Ruang browser mungkin penuh; kurangi ukuran lampiran.', true); return false; }
}
const transaction = () => JSON.parse(JSON.stringify(db));
function addActivity(next, action, doc, kind = 'document') {
  next.activities.unshift({ id: uid(), userId: currentUser.id, action, documentId: doc.id, documentCode: doc.code, title: doc.title, revision: doc.revision, updatedAt: doc.updatedAt, kind, createdAt: today() });
  next.activities = next.activities.slice(0, 150);
}
const departmentName = id => db.departments.find(d => d.id === id)?.name || '—';
const sectionName = id => db.sections.find(s => s.id === id)?.name || '—';
const userName = id => db.users.find(u => u.id === id)?.name || 'Pengguna';
const isAdmin = () => currentUser?.role === 'admin';
const documentRecord = id => db.documentRequests.find(doc => doc.id === id) || db.documents.find(doc => doc.id === id);
const canRead = doc => doc?.entityType === 'request' ? DocumentWorkflow.canRead(db, currentUser, doc) : DocumentAccess.canRead(db, currentUser, doc);
const canEdit = doc => isAdmin() || doc.ownerId === currentUser?.id || doc.departmentId === currentUser?.departmentId;
const visibleDocuments = () => db.documents.filter(canRead);
const options = (rows, selected = '', label = 'name') => rows.map(r => `<option value="${esc(r.id)}" ${r.id === selected ? 'selected' : ''}>${esc(r[label])}</option>`).join('');
const typeOptions = selected => db.documentTypes.map(t => `<option value="${esc(t.name)}" ${t.name === selected ? 'selected' : ''}>${esc(t.name)}</option>`).join('') || '<option value="">Belum ada jenis dokumen</option>';
function toast(message, error = false) { const el = document.getElementById('toast'); el.textContent = message; el.className = `toast show${error ? ' error' : ''}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4000); }
function relativeTime(value) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value)) / 60000)); return minutes < 1 ? 'Baru saja' : minutes < 60 ? `${minutes} menit yang lalu` : minutes < 1440 ? `${Math.floor(minutes / 60)} jam yang lalu` : dateLabel(value); }
function brand() {
  return `<div class="brand"><div class="brand-mark">${icon('document')}</div><div><div class="brand-name">PT Century Batteries Indonesia</div><div class="brand-caption">Document Control</div></div></div>`;
}

function illustration() {
  return `<svg viewBox="0 0 300 190" fill="none" aria-hidden="true"><ellipse cx="155" cy="179" rx="106" ry="9" fill="#d9e6fa" opacity=".5"/><circle cx="165" cy="99" r="77" fill="#e3edfd"/><circle cx="165" cy="99" r="60" stroke="#cdddf6" stroke-dasharray="3 5"/><path d="M50 76h33m152 40h30M62 114v35h28" stroke="#bdd2f1" stroke-width="1.3"/><rect x="106" y="31" width="107" height="132" rx="7" transform="rotate(9 106 31)" fill="#d0e0f8"/><rect x="91" y="28" width="107" height="137" rx="7" transform="rotate(-7 91 28)" fill="white" stroke="#c5d9f8"/><path d="m169 19 25 22-23 3Z" fill="#dce9fc"/><path d="m107 63 34-4m-32 14 59-7m-57 23 58-7m-55 17 42-5m-40 17 50-6m-49 17 32-4" stroke="#c4d6ee" stroke-width="5" stroke-linecap="round"/><rect x="177" y="111" width="57" height="45" rx="8" fill="#4d8df0"/><path d="m177 121 14-17h26l17 17" fill="#6ca3f3"/><path d="M194 131h23m-23 8h16" stroke="white" stroke-width="2.5" stroke-linecap="round"/><circle cx="80" cy="121" r="19" fill="white" stroke="#c7ddfb"/><path d="m73 121 5 5 9-10" stroke="#6c9fe8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="221" y="49" width="30" height="34" rx="6" fill="white" stroke="#d3e2f8"/><path d="M229 61h14m-14 6h10" stroke="#91b6eb" stroke-width="2" stroke-linecap="round"/><circle cx="63" cy="61" r="3" fill="#a9caf8"/><circle cx="247" cy="146" r="3" fill="#a9caf8"/><path d="M228 29v8m-4-4h8M58 151v8m-4-4h8" stroke="#a5c6f3" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function renderLogin() {
  app.innerHTML = `<div class="login-page">
    <aside class="login-visual" aria-label="Tentang PT Century Batteries Indonesia">
      ${brand()}
      <div class="login-intro">
        <div class="eyebrow">YOUR DOCUMENTS. IN CONTROL.</div>
        <p class="login-title">Satu tempat.<br>Semua dokumen.<br><span>Selalu terkendali.</span></p>
        <p>Dari dokumen pertama hingga revisi terbaru. Satukan dokumen dan standar kerja tim Anda dalam satu workspace.</p>
        <div class="document-preview" aria-label="Contoh dokumen perusahaan">
          <div class="preview-header"><div class="file-icon">${icon('document')}</div><div><strong>Instruksi Kerja Proses Assembly</strong><span>IK / PRD / 002 &nbsp;·&nbsp; Rev. 3</span></div></div>
          <div class="preview-lines" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="preview-bottom"><span>Production · Assembly</span><span class="badge">Dokumen terkendali</span></div>
        </div>
        <div class="flow-steps"><span>${icon('document')} Buat dokumen</span>${icon('arrow')}<span>${icon('upload')} Lampirkan PDF</span>${icon('arrow')}<span>${icon('save')} Simpan</span></div>
      </div>
      <div class="login-visual-footer">${icon('shield')} Dokumen teratur. Standar terjaga. Tim siap bekerja.</div>
    </aside>
    <main class="login-form-side" id="main-content" tabindex="-1">
      <div class="login-card">
        <div class="login-mobile-brand">${brand()}</div>
        <div class="eyebrow">DOCUMENT CONTROL WORKSPACE</div>
        <h1>Selamat datang kembali.</h1>
        <p>Masuk ke workspace untuk mengelola dokumen dan menjaga setiap perubahan tetap tercatat.</p>
        <form id="login-form">
          <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" placeholder="nama@perusahaan.com" autocomplete="username" required></div>
          <div class="field"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" placeholder="Masukkan password Anda" autocomplete="current-password" aria-describedby="login-error" required><button type="button" class="icon-btn" data-action="password" aria-label="Tampilkan password" aria-pressed="false">${icon('eye')}</button></div></div>
          <div id="login-error" class="form-error" role="alert"></div>
          <button class="btn btn-primary" type="submit"><span>Masuk ke workspace</span>${icon('arrow')}</button>
        </form>
        <div class="demo-box">
          <strong>${icon('info')} JELAJAHI WORKSPACE</strong>
          <p>Belum punya akun? Gunakan akun demo untuk mencoba fitur sesuai peran Anda.</p>
          <div class="demo-buttons"><button class="btn btn-secondary" data-action="demo" data-role="admin">${icon('shield')} Demo Admin</button>${db.users.some(user=>user.email==='user@docuflow.id') ? `<button class="btn btn-secondary" data-action="demo" data-role="user">${icon('users')} Demo User</button>` : ''}</div>
          <output id="demo-credentials" class="demo-credentials" aria-live="polite"></output>
        </div>
        <p class="login-note">Versi prototipe · Data tersimpan di browser Anda.<br>Gunakan akun demo untuk mengeksplorasi workspace.</p>
      </div>
    </main>
  </div>`;
  document.getElementById('login-form').addEventListener('submit', login);
}

function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const user = db.users.find(u => u.email.toLowerCase() === form.get('email').trim().toLowerCase() && u.password === form.get('password'));
  if (!user) { document.getElementById('login-error').textContent = 'Email atau password tidak sesuai. Silakan coba kembali.'; document.getElementById('password').setAttribute('aria-invalid', 'true'); document.getElementById('password').focus(); return; }
  try { localStorage.setItem(SESSION_KEY, user.id); } catch { toast('Browser tidak mengizinkan penyimpanan sesi.', true); return; }
  currentUser = user;
  location.hash = '#home';
  render();
}

function currentRoute() { return location.hash.slice(1) || 'home'; }
function navigate(route) { if (currentRoute() === route) render(); else location.hash = route; }
function render() {
  if (!currentUser) { renderLogin(); return; }
  const route = currentRoute();
  if (route.startsWith('workbook-')) {
    app.innerHTML = `<main class="workbook-workspace" id="main-content" tabindex="-1">${workbookEditorPage(route.slice(9))}</main>`;
    document.title = 'Excel - PT Century Batteries Indonesia';
    mountWorkbookEditor(route.slice(9));
    return;
  }
  const currentType = routeDocumentType(route);
  const isDocs = route === 'documents' || route.startsWith('type-');
  const title = route.startsWith('workbook-') ? 'Editor Dokumen' : route === 'templates' && isAdmin() ? 'Template Dokumen' : route === 'home' ? 'Home' : route === 'master' ? 'Master Dokumen' : isDocs ? (route.startsWith('type-') ? currentType?.name || 'Jenis Dokumen' : 'Dokumen') : ['requests', 'approvals', 'create'].includes(route) || route.startsWith('request-') ? 'Permintaan Dokumen' : route === 'categories' && isAdmin() ? 'Kategori Dokumen' : route === 'authorizations' && isAdmin() ? 'Otorisasi Dokumen' : route === 'document-types' && isAdmin() ? 'Jenis Dokumen' : route === 'users' && isAdmin() ? 'Kelola Pengguna' : route === 'activity' ? 'Aktivitas' : 'Home';
  const navLink = (key, label, glyph) => {
    const active = route === key || key === 'requests' && (route === 'create' || route.startsWith('request-'));
    return `<a class="nav-item ${active ? 'active' : ''}" href="#${key}" ${key === 'requests' ? 'data-action="open-request-list"' : ''} ${active ? 'aria-current="page"' : ''}>${icon(glyph)} ${label}</a>`;
  };
  app.innerHTML = `
    <div class="screen-overlay" data-action="close-sidebar" aria-hidden="true"></div>
    <aside class="sidebar" id="sidebar" aria-label="Sidebar workspace">
      <button class="icon-btn sidebar-close" data-action="close-sidebar" aria-label="Tutup navigasi">${icon('close')}</button>
      <a class="sidebar-brand" href="#home" aria-label="PT Century Batteries Indonesia — Document Control — Home"><img class="sidebar-logo" src="${esc(CBI_LOGO_URL)}" alt="CBI" width="56" height="56"><span class="sidebar-brand-copy"><strong class="sidebar-company">PT Century Batteries Indonesia</strong><span class="sidebar-product">Document Control</span></span></a>
      <div class="workspace"><div class="workspace-icon">${icon('building')}</div><div><strong>Company Workspace</strong><span>Document Management</span></div></div>
      <div class="nav-label">WORKSPACE</div>
      <nav aria-label="Navigasi utama">
        ${navLink('home', 'Home', 'home')}
        ${navLink('master', 'Master Dokumen', 'folder')}
        <button class="nav-item" id="document-toggle" data-action="toggle-documents" aria-expanded="true" aria-controls="document-submenu">${icon('layers')} Dokumen ${icon('chevron', 'chevron')}</button>
        <div class="submenu" id="document-submenu">${db.documentTypes.map(t => `<a class="${currentType?.id === t.id ? 'active' : ''}" href="#type-${esc(t.id)}" ${currentType?.id === t.id ? 'aria-current="page"' : ''}>${esc(t.name)}</a>`).join('') || '<span class="submenu-empty">Belum ada jenis dokumen</span>'}</div>
        ${navLink('requests', 'Create / Revise Dokumen', 'edit')}
        ${navLink('approvals', 'Persetujuan Dokumen', 'shield')}
        ${isAdmin() ? `<div class="nav-divider"></div><div class="nav-label">ADMINISTRASI</div>${navLink('users', 'Kelola Pengguna', 'users')}${navLink('document-types', 'Jenis Dokumen', 'layers')}${navLink('categories', 'Kategori Dokumen', 'folder')}${navLink('authorizations', 'Otorisasi Dokumen', 'shield')}${navLink('templates', 'Template Dokumen', 'document')}` : ''}
      </nav>
      <div class="sidebar-bottom"><div class="sidebar-version">PT Century Batteries Indonesia</div></div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <button class="icon-btn mobile-menu" data-action="sidebar" aria-label="Buka navigasi" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
        <div class="breadcrumb"><span>Workspace</span><span>/</span><strong>${esc(title)}</strong></div>
        <div class="topbar-right">

          <button class="profile" data-action="profile" aria-label="Profil ${esc(currentUser.name)} dan keluar" aria-expanded="false" aria-controls="profile-menu"><div class="avatar" aria-hidden="true">${esc(currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join(''))}</div><div><div class="profile-name">${esc(currentUser.name)}</div><div class="profile-role">${isAdmin() ? 'Administrator' : 'User'} · ${esc(departmentName(currentUser.departmentId))}</div></div>${icon('chevron')}</button>
        </div>
      </header>
      <main class="content ${route === 'master' || isDocs ? 'list-page' : ''}" id="main-content" tabindex="-1">
        ${route === 'requests' || route === 'approvals' ? documentRequestsPage(route === 'approvals') : route.startsWith('request-') ? documentRequestPage(route.slice(8)) : route.startsWith('workbook-') ? workbookEditorPage(route.slice(9)) : route === 'templates' && isAdmin() ? documentTemplatesPage() : route === 'home' ? homePage() : route === 'master' || isDocs ? documentsPage(route) : route === 'create' ? createPage() : route === 'categories' && isAdmin() ? documentCategoriesPage() : route === 'authorizations' && isAdmin() ? authorizationPage() : route === 'document-types' && isAdmin() ? documentTypesPage() : route === 'users' && isAdmin() ? usersPage() : route === 'activity' ? activityPage() : homePage()}
        <footer class="info-strip"><span>${icon('shield')} © ${new Date().getFullYear()} PT Century Batteries Indonesia</span><span class="storage-status">Penyimpanan lokal aktif</span></footer>
      </main>
    </div>`;
  document.getElementById('document-form')?.addEventListener('submit', saveDocument);
  document.getElementById('department')?.addEventListener('change', event => updateSections(event.target.value));
  document.getElementById('revise-source')?.addEventListener('change', event => renderRevisionFields(event.target.value));
  document.title = `${title} — PT Century Batteries Indonesia`;
  bindFilters();
  enhanceSelects(app);
  syncDocumentSource(document.getElementById('document-form'));
  if (route.startsWith('workbook-')) mountWorkbookEditor(route.slice(9));
}

function heading(title, subtitle = '', actions = '') { return `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`; }
function homePage() {
  const docs = visibleDocuments();
  const liveDocs = docs.filter(d => d.status !== 'archive');
  return `
    ${heading('Dashboard', 'Pantau dokumen, kelola revisi, dan jaga standar kerja tim Anda.', `<div class="date-pill">${icon('calendar')}${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>`)}
    <section aria-labelledby="category-heading">
      <div class="section-heading"><h2 id="category-heading">Jelajahi Jenis Dokumen</h2><a class="btn-link" href="#documents">Lihat semua dokumen ${icon('arrow')}</a></div>
      <div class="categories">${db.documentTypes.map((t, i) => `<a class="category ${COLORS[i % COLORS.length]}" href="#type-${esc(t.id)}"><div class="category-icon">${icon(['document', 'edit', 'layers', 'folder', 'shield'][i % 5])}</div><strong>${esc(t.name)}</strong><span>${liveDocs.filter(d => d.type === t.name).length} dokumen</span>${icon('right')}</a>`).join('') || '<p class="category-empty">Belum ada jenis dokumen. Hubungi admin untuk menambahkan jenis dokumen.</p>'}</div>
    </section>
    <div class="lower-grid">
      <section class="panel workflow-panel" aria-labelledby="workflow-heading">
        <div class="panel-heading"><div><h2 id="workflow-heading">Alur Pengendalian Dokumen</h2><p>Panduan singkat dari pembuatan hingga pembaruan dokumen.</p></div>${icon('layers')}</div>
        <ol class="document-workflow">
          <li><span class="workflow-number" aria-hidden="true">01</span><div><h3>Lengkapi identitas dokumen</h3><p>Isi nama, jenis dokumen, departemen, seksi, dan tanggal efektif.</p></div></li>
          <li><span class="workflow-number" aria-hidden="true">02</span><div><h3>Siapkan isi dokumen</h3><p>Edit salinan template Excel atau lengkapi lampiran PDF pada draft permintaan.</p></div></li>
          <li><span class="workflow-number" aria-hidden="true">03</span><div><h3>Ajukan persetujuan</h3><p>Pilih beberapa approver. Semua wajib menyetujui isi yang sama tanpa urutan.</p></div></li>
          <li><span class="workflow-number" aria-hidden="true">04</span><div><h3>Admin menerbitkan</h3><p>Setelah persetujuan lengkap, admin menerbitkan dokumen resmi. Revisi sebelumnya tetap tersimpan.</p></div></li>
        </ol>
        <div class="workflow-footer"><span>${icon('shield')} Selalu gunakan revisi dokumen terbaru.</span><a class="btn-link" href="#master">Buka Master Dokumen ${icon('arrow')}</a></div>
      </section>
      <aside class="panel activity-panel" aria-labelledby="activity-heading"><div class="panel-heading"><div><h2 id="activity-heading">Aktivitas Terbaru</h2><p>Detail dokumen dan pembaruan revisinya.</p></div><span class="muted">${icon('clock')}</span></div><div class="activity-list">${activitiesHtml(4)}</div><a href="#activity" class="panel-footer">Lihat semua aktivitas ${icon('arrow')}</a></aside>
    </div>`;
}

function filteredDocuments(route) {
  const currentType = routeDocumentType(route);
  if (route.startsWith('type-') && !currentType) return [];
  const type = currentType?.name || filter.type;
  return visibleDocuments().filter(d => (!type || d.type === type) && (!filter.department || d.departmentId === filter.department) && (!filter.category || d.categoryId === filter.category) && (!filter.search || `${d.title} ${d.code} ${categoryName(d.categoryId)} ${departmentName(d.departmentId)}`.toLowerCase().includes(filter.search.toLowerCase()))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function documentsPage(route) {
  const isType = route.startsWith('type-');
  const currentType = routeDocumentType(route);
  const title = route === 'master' ? 'Master Dokumen' : isType ? currentType?.name || 'Jenis Dokumen' : 'Semua Dokumen';
  const rows = filteredDocuments(route);
  return `${heading(esc(title), '', route === 'master' && isAdmin() ? `<button class="btn btn-primary" data-action="add-document">${icon('plus')} Tambah Dokumen</button>` : '')}
    <section class="panel table-full">
      <div class="panel-heading"><div><h2>Daftar Dokumen <span class="muted small" id="document-count">(${rows.length})</span></h2><p>Dokumen perusahaan yang dapat diakses oleh akun Anda.</p></div><button class="btn-link" data-action="reset-filters">${icon('refresh')} Reset filter</button></div>
      <div class="filter-bar">
        <input id="document-search" type="search" aria-label="Cari nama atau nomor dokumen" placeholder="Cari nama atau nomor dokumen..." value="${esc(filter.search)}">
        ${!isType ? filterCombobox('type', 'jenis dokumen', 'Semua jenis dokumen') : ''}
        ${filterCombobox('department', 'departemen', 'Semua departemen')}
        ${filterCombobox('category', 'kategori dokumen', 'Semua kategori')}
      </div>
      <div id="table-results">${documentTable(rows)}</div>
    </section>`;
}

const canRequestRevision = doc => doc && doc.entityType !== 'request' && canRead(doc) && doc.status === 'active' && canEdit(doc);
const canEditDocument = doc => DocumentWorkflow.canEdit(db, currentUser, doc);
const canDeleteDocument = doc => doc?.entityType !== 'request' && !doc.requestArchive && isAdmin() && canRead(doc) && !db.documentRequests.some(request => request.sourceId === doc.id || request.publishedDocumentId === doc.id) && !db.documents.some(d => d.supersedesId === doc.id);

function documentTable(rows) {
  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  page = Math.max(1, Math.min(page, totalPages));
  const start = (page - 1) * perPage;
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Tabel daftar dokumen; geser untuk melihat seluruh kolom"><table class="document-table" role="table">
    <caption class="visually-hidden">Daftar dokumen workspace</caption>
    <thead role="rowgroup"><tr role="row">${['No', 'Nama Dokumen', 'Nomor Dokumen', 'Jenis Dokumen', 'Departement', 'Revisi', 'Tanggal Efektif', 'Aksi'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
    <tbody role="rowgroup">${rows.slice(start, start + perPage).map((d, index) => `<tr role="row">
      <td class="index-cell" data-label="No" role="cell">${start + index + 1}</td>
      <td class="name-cell" role="cell"><div class="doc-cell"><span class="file-icon">${icon('document')}</span><button class="doc-title" data-action="detail" data-id="${esc(d.id)}">${esc(d.title)}</button><span class="document-category">${esc(categoryName(d.categoryId))}</span></div></td>
      <td class="number-cell" data-label="Nomor Dokumen" role="cell">${esc(d.code)}</td>
      <td class="type-cell" data-label="Jenis Dokumen" role="cell">${esc(d.type)}</td>
      <td class="department-cell" data-label="Departement" role="cell">${esc(departmentName(d.departmentId))}</td>
      <td class="revision-cell" data-label="Revisi" role="cell">Rev. ${formatRevision(d.revision)}</td>
      <td class="effective-cell" data-label="Tanggal Efektif" role="cell">${d.effectiveDate ? dateLabel(d.effectiveDate) : '—'}</td>
      <td class="actions-cell" data-label="Aksi" role="cell"><div class="row-actions">
        <button class="table-action" data-action="${isPdfAttachment(d.attachment) ? 'preview-pdf' : d.workbookKey ? 'open-workbook' : 'detail'}" data-id="${esc(d.id)}" aria-label="View ${esc(d.title)}" title="${isPdfAttachment(d.attachment) ? 'Buka PDF di tab baru' : 'Lihat detail dokumen'}">${icon('eye')} View</button>
        <button class="table-action edit" data-action="edit-document" data-id="${esc(d.id)}" aria-label="Edit ${esc(d.title)}" ${canRequestRevision(d) ? '' : 'disabled'} title="${canRequestRevision(d) ? 'Ajukan update dokumen' : 'Dokumen ini tidak dapat diedit oleh akun Anda'}">${icon('edit')} Ajukan Update</button>
        ${isAdmin() ? `<button class="table-action delete" data-action="delete-doc" data-id="${esc(d.id)}" aria-label="Delete ${esc(d.title)}" ${canDeleteDocument(d) ? '' : 'disabled'} title="${canDeleteDocument(d) ? 'Hapus dokumen' : 'Izin tidak tersedia atau dokumen masih dirujuk oleh revisi lain'}">${icon('trash')} Delete</button>` : ''}
      </div></td>
    </tr>`).join('') || `<tr><td class="empty-cell" colspan="8"><div class="empty" role="status">${icon('folder')}<h3>Belum ada dokumen</h3><p>Coba ubah filter pencarian atau buat dokumen pertama Anda.</p></div></td></tr>`}</tbody></table></div>
    <div class="table-footer"><span role="status">Menampilkan ${rows.length ? start + 1 : 0}–${Math.min(start + perPage, rows.length)} dari ${rows.length} dokumen</span><nav class="pages" aria-label="Halaman daftar dokumen"><button data-action="page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">${icon('left')}</button>${Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1).map(n => `<button class="${page === n ? 'active' : ''}" data-action="page" data-page="${n}" aria-label="Halaman ${n}" ${page === n ? 'aria-current="page"' : ''}>${n}</button>`).join('')}<button data-action="page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Halaman berikutnya">${icon('right')}</button></nav></div>`;
}

function filterChoices(key) {
  if (key === 'category') return db.documentCategories.filter(category => DocumentAccess.canAssign(db, currentUser, category.id)).map(category => ({ value: category.id, label: category.code }));
  if (key === 'type') return db.documentTypes.map(type => ({ value: type.name, label: type.name }));
  if (key === 'department') return db.departments.map(d => ({ value: d.id, label: d.name }));
  return [];
}

function filterCombobox(key, label, placeholder) {
  const selected = filterChoices(key).find(choice => choice.value === filter[key]);
  return `<div class="filter-combobox" data-filter-key="${key}" data-placeholder="${placeholder}">
    <input id="${key}-filter" role="combobox" aria-label="Filter ${label}" aria-autocomplete="list" aria-expanded="false" aria-controls="${key}-options" autocomplete="off" placeholder="${placeholder}" value="${esc(selected?.label || '')}">
    <button type="button" class="combo-toggle" data-action="toggle-filter" data-key="${key}" aria-label="Buka pilihan ${label}" tabindex="-1">${icon('chevron')}</button>
    <div class="combo-options" id="${key}-options" role="listbox" aria-label="Pilihan ${label}" hidden></div>
  </div>`;
}

function updateDocumentResults() {
  const rows = filteredDocuments(currentRoute());
  page = 1;
  document.getElementById('table-results').innerHTML = documentTable(rows);
  document.getElementById('document-count').textContent = `(${rows.length})`;
}

function closeFilterCombos(except = null) {
  document.querySelectorAll('.filter-combobox').forEach(combo => {
    if (combo === except) return;
    const input = combo.querySelector('input');
    combo.querySelector('.combo-options').hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    input.value = filterChoices(combo.dataset.filterKey).find(c => c.value === filter[combo.dataset.filterKey])?.label || '';
  });
}

function openFilterCombo(combo, query = '') {
  closeFilterCombos(combo);
  const key = combo.dataset.filterKey;
  const list = combo.querySelector('.combo-options');
  const choices = [{ value: '', label: combo.dataset.placeholder }, ...filterChoices(key)].filter(c => c.label.toLowerCase().includes(query.trim().toLowerCase()));
  list.innerHTML = choices.map((c, i) => `<button type="button" role="option" tabindex="-1" id="${key}-option-${i}" aria-selected="${filter[key] === c.value}" data-action="select-filter" data-key="${key}" data-value="${esc(c.value)}">${esc(c.label)}${filter[key] === c.value ? icon('check') : ''}</button>`).join('') || '<div class="combo-empty" role="option" aria-disabled="true">Pilihan tidak ditemukan.</div>';
  list.hidden = false;
  const input = combo.querySelector('input');
  input.setAttribute('aria-expanded', 'true');
  input.removeAttribute('aria-activedescendant');
}

function chooseFilter(key, value) {
  if (!['type', 'department', 'category'].includes(key) || (value && !filterChoices(key).some(c => c.value === value))) return;
  filter[key] = value;
  updateDocumentResults();
  document.getElementById(`${key}-filter`).focus({ preventScroll: true });
  closeFilterCombos();
}

function bindFilters() {
  const search = document.getElementById('document-search');
  if (!search) return;
  search.addEventListener('input', e => { filter.search = e.target.value; updateDocumentResults(); });
  document.querySelectorAll('.filter-combobox').forEach(combo => {
    const input = combo.querySelector('input');
    input.addEventListener('focus', () => { openFilterCombo(combo); input.select(); });
    input.addEventListener('input', () => { openFilterCombo(combo, input.value); });
    combo.addEventListener('focusout', e => { if (!combo.contains(e.relatedTarget)) closeFilterCombos(); });
    combo.querySelector('.combo-options').addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeFilterCombos(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
      const list = combo.querySelector('.combo-options');
      if (list.hidden) {
        if (e.key === 'Enter') return;
        openFilterCombo(combo);
      }
      const choices = [...list.querySelectorAll('button[role=option]')];
      if (!choices.length) return;
      e.preventDefault();
      if (e.key === 'Enter') {
        const active = list.querySelector('.keyboard-active') || choices[0];
        chooseFilter(combo.dataset.filterKey, active.dataset.value);
        return;
      }
      const current = choices.findIndex(option => option.id === input.getAttribute('aria-activedescendant'));
      const next = current < 0 ? e.key === 'ArrowDown' ? 0 : choices.length - 1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      choices.forEach((option, i) => option.classList.toggle('keyboard-active', i === next));
      input.setAttribute('aria-activedescendant', choices[next].id);
      choices[next].scrollIntoView({ block: 'nearest' });
    });
  });
}

// Mempertahankan nilai select asli untuk FormData, dengan pilihan yang bisa dicari.
function enhanceSelects(root) {
  root.querySelectorAll('select:not([data-native-select])').forEach(select => {
    if (searchableSelects.has(select)) { refreshSearchSelect(select); return; }
    if (!select.id) select.id = 'select-' + uid();
    const label = select.closest('.field')?.querySelector('label');
    const name = (label?.textContent || select.getAttribute('aria-label') || 'Pilihan').replace(/\*/g, '').trim();
    const combo = document.createElement('div');
    combo.className = 'form-combobox';
    select.before(combo);
    combo.appendChild(select);
    const input = document.createElement('input');
    input.id = select.id + '-search';
    input.type = 'text';
    input.autocomplete = 'off';
    input.required = select.required;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-label', name);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', select.id + '-choices');
    if (label) label.htmlFor = input.id;
    select.required = false;
    select.hidden = true;
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'combo-toggle'; toggle.tabIndex = -1;
    toggle.dataset.action = 'toggle-form-select';
    toggle.setAttribute('aria-label', 'Buka pilihan ' + name.toLowerCase());
    toggle.innerHTML = icon('chevron');
    const list = document.createElement('div');
    list.className = 'combo-options'; list.id = select.id + '-choices'; list.hidden = true;
    list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Pilihan ' + name.toLowerCase());
    combo.append(input, toggle, list);
    const record = { select, input, toggle, list, combo, name };
    searchableSelects.set(select, record);
    refreshSearchSelect(select);
    new MutationObserver(() => refreshSearchSelect(select)).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'value'] });
    input.addEventListener('focus', () => { openSearchSelect(record); input.select(); });
    input.addEventListener('click', () => { if (list.hidden) openSearchSelect(record); });
    input.addEventListener('input', () => { input.setCustomValidity('Pilih salah satu pilihan yang tersedia.'); openSearchSelect(record, input.value); });
    combo.addEventListener('focusout', event => { if (!combo.contains(event.relatedTarget)) closeSearchSelects(); });
    list.addEventListener('pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !list.hidden) { event.preventDefault(); closeSearchSelects(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
      if (list.hidden) { if (event.key === 'Enter') return; openSearchSelect(record); }
      const choices = [...list.querySelectorAll('button[role=option]')];
      if (!choices.length) return;
      event.preventDefault();
      if (event.key === 'Enter') {
        const choice = list.querySelector('.keyboard-active') || choices.find(button => button.dataset.value === select.value) || choices[0];
        chooseSearchSelect(record, choice.dataset.value);
        return;
      }
      const current = choices.findIndex(button => button.id === input.getAttribute('aria-activedescendant'));
      const next = current < 0 ? event.key === 'ArrowDown' ? 0 : choices.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      choices.forEach((button, i) => button.classList.toggle('keyboard-active', i === next));
      input.setAttribute('aria-activedescendant', choices[next].id);
      choices[next].scrollIntoView({ block: 'nearest' });
    });
  });
}

function refreshSearchSelect(select) {
  const record = select && searchableSelects.get(select);
  if (!record) return;
  const option = select.selectedOptions[0];
  record.input.value = option?.value ? option.textContent : '';
  record.input.placeholder = select.options[0]?.value === '' ? select.options[0].textContent : 'Pilih ' + record.name.toLowerCase();
  record.input.disabled = select.disabled;
  record.toggle.disabled = select.disabled;
  record.input.setCustomValidity('');
}

function closeSearchSelects(except = null) {
  document.querySelectorAll('.form-combobox select').forEach(select => {
    const record = searchableSelects.get(select);
    if (!record || record === except) return;
    record.list.hidden = true;
    record.input.setAttribute('aria-expanded', 'false');
    record.input.removeAttribute('aria-activedescendant');
    refreshSearchSelect(select);
  });
}

function openSearchSelect(record, query = '') {
  if (record.select.disabled) return;
  closeSearchSelects(record); closeFilterCombos();
  const choices = [...record.select.options].filter(option => !option.disabled && option.textContent.toLowerCase().includes(query.trim().toLowerCase()));
  record.list.innerHTML = choices.map((option, i) => `<button type="button" role="option" tabindex="-1" id="${esc(record.select.id)}-choice-${i}" aria-selected="${option.value === record.select.value}" data-action="select-form-option" data-value="${esc(option.value)}">${esc(option.textContent)}${option.value === record.select.value ? icon('check') : ''}</button>`).join('') || '<div class="combo-empty" role="option" aria-disabled="true">Pilihan tidak ditemukan.</div>';
  const rect = record.input.getBoundingClientRect();
  const bounds = modal.open && modal.contains(record.combo) ? modal.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  const below = bounds.bottom - rect.bottom, above = rect.top - bounds.top;
  const upwards = below < 180 && above > below;
  record.combo.classList.toggle('opens-up', upwards);
  record.list.style.maxHeight = Math.max(80, Math.min(240, (upwards ? above : below) - 16)) + 'px';
  record.list.hidden = false;
  record.input.setAttribute('aria-expanded', 'true');
  record.input.removeAttribute('aria-activedescendant');
}

function chooseSearchSelect(record, value) {
  if (record.select.disabled || ![...record.select.options].some(option => !option.disabled && option.value === value)) return;
  record.select.value = value;
  refreshSearchSelect(record.select);
  record.input.focus({ preventScroll: true });
  closeSearchSelects();
  record.select.dispatchEvent(new Event('change', { bubbles: true }));
}

function openDocumentEditor(id) {
  const doc = documentRecord(id);
  if (!doc) return;
  if (doc.entityType !== 'request') {
    if (!canRequestRevision(doc)) return;
    modal.close(); createMode = 'revise'; history.pushState(null, '', '#create'); render();
    const select = document.getElementById('revise-source');
    if (select) { select.value = id; renderRevisionFields(id); }
    return;
  }
  if (!canEditDocument(doc)) return;
  showModal(`${modalHeading('Edit Draft Permintaan')}<form id="document-form" data-origin="modal">${documentFields({ ...doc, _editId: doc.id }, true)}</form>`, 'document-create-modal');
  const form = modal.querySelector('#document-form'); form.addEventListener('submit', saveDocument); syncDocumentSource(form);
}

function activitiesHtml(limit = 100) {
  const entries = db.activities.filter(a => { const d = db.documents.find(d => d.id === a.documentId); return d && canRead(d); }).slice(0, limit);
  return entries.map(a => {
    const doc = db.documents.find(d => d.id === a.documentId);
    // Entri lama memakai metadata dokumen; aktivitas baru menyimpan metadata saat perubahan.
    const code = a.documentCode || doc.code;
    const revision = a.revision ?? doc.revision;
    const updatedAt = a.updatedAt || doc.updatedAt;
    return `<div class="activity"><span class="activity-icon ${a.kind === 'circlecheck' ? 'green' : a.kind === 'clock' ? 'orange' : ''}">${icon(a.kind)}</span><div class="activity-content"><div class="activity-code"><span class="visually-hidden">Nomor dokumen: </span>${esc(code)}</div><button class="activity-document" data-action="detail" data-id="${esc(a.documentId)}">${esc(a.title || doc.title)}</button><div class="activity-meta"><span class="activity-revision">Revisi ${formatRevision(revision)}</span><time datetime="${esc(updatedAt)}">Diperbarui ${dateLabel(updatedAt)}</time></div></div></div>`;
  }).join('') || '<div class="empty"><p>Belum ada aktivitas dokumen.</p></div>';
}
function activityPage() { return `${heading('Aktivitas Dokumen', 'Jejak perubahan dan aktivitas dokumen di workspace Anda.')}<section class="panel all-activity"><div class="activity-list">${activitiesHtml()}</div></section>`; }

function createPage() {
  return `${heading('Create / Revise Dokumen', 'Buat draft permintaan. Dokumen resmi baru berubah setelah semua approver setuju dan admin menerbitkan.')}<section class="panel form-panel"><div class="mode-switch"><button aria-pressed="${createMode === 'create'}" class="${createMode === 'create' ? 'active' : ''}" data-action="create-mode" data-mode="create">${icon('plus')} Buat Dokumen Baru</button><button aria-pressed="${createMode === 'revise'}" class="${createMode === 'revise' ? 'active' : ''}" data-action="create-mode" data-mode="revise">${icon('refresh')} Revisi Dokumen</button></div><form id="document-form">${createMode === 'revise' ? `<div class="field" style="margin-top:22px"><label for="revise-source">Pilih dokumen yang akan direvisi <span>*</span></label><select id="revise-source" name="sourceId" required><option value="">Pilih dokumen...</option>${db.documents.filter(d => canRequestRevision(d)).map(d => `<option value="${esc(d.id)}">${esc(d.code)} — ${esc(d.title)}</option>`).join('')}</select><small>Permintaan revisi diproses terpisah. Revisi resmi sebelumnya tetap aktif hingga admin menerbitkan penggantinya.</small></div>` : ''}<div id="document-fields">${createMode === 'create' ? documentFields() : '<div class="empty">' + icon('document') + '<p>Pilih dokumen untuk mulai membuat revisi.</p></div>'}</div></form></section>`;
}

function openCreateDocumentModal() {
  if (!isAdmin()) return;
  createMode = 'create';
  showModal(`${modalHeading('Tambah Dokumen')}<p class="document-modal-description">Buat draft permintaan. Lengkapi isi dan ajukan persetujuan sebelum diterbitkan.</p><form id="document-form" data-origin="modal">${documentFields(null, true)}</form>`, 'document-create-modal');
  const form = modal.querySelector('#document-form');
  form.addEventListener('submit', saveDocument);
  form.querySelector('#department').addEventListener('change', event => updateSections(event.target.value));
  syncDocumentSource(form);
  form.querySelector('#doc-title').focus();
}

function documentFields(source = null, inModal = false) {
  const departmentId = source?.departmentId || currentUser.departmentId;
  const sectionId = source?.sectionId || currentUser.sectionId;
  const departments = isAdmin() ? db.departments : db.departments.filter(d => d.id === currentUser.departmentId);
  const revision = source ? Number(source.revision || 0) + (source._editId ? 0 : 1) : 0;
  return `<input type="hidden" name="editId" value="${esc(source?._editId || '')}">
    <div class="form-section document-information"><h2>Informasi Dokumen</h2><p>Lengkapi identitas dan informasi dasar dokumen Anda.</p>
      <div class="form-grid">
        <div class="field full"><label for="doc-title">Judul Dokumen <span>*</span></label><input id="doc-title" name="title" placeholder="Contoh: Instruksi Kerja Proses Assembly" value="${esc(source?.title || '')}" maxlength="140" required></div>
        ${isAdmin() && source?._editId && source.adminReviewRequired && source.status==='admin_review' ? `<div class="field full"><label for="doc-number">Nomor Dokumen <span>*</span></label><input id="doc-number" name="documentNumber" maxlength="100" value="${esc(source.adminNumberSet || source.sourceId ? source.code : '')}" placeholder="Masukkan nomor dokumen" required></div>` : ''}
        <div class="field"><label for="doc-type">Jenis dokumen <span>*</span></label><select name="type" id="doc-type" required ${source && (!source._editId || source.entityType === 'request') ? 'disabled' : ''}>${typeOptions(source?.type)}</select>${source && (!source._editId || source.entityType === 'request') ? `<input name="type" type="hidden" value="${esc(source.type)}">` : ''}</div>
        <div class="field"><label for="doc-category">Kategori dokumen <span>*</span></label><select name="categoryId" id="doc-category" required ${source && (!source._editId || source.entityType === 'request') ? 'disabled' : ''}><option value="">Pilih kategori dokumen</option>${assignableCategories().map(category => `<option value="${esc(category.id)}" ${source?.categoryId === category.id ? 'selected' : ''}>${esc(category.name)}</option>`).join('')}</select>${source && (!source._editId || source.entityType === 'request') ? `<input type="hidden" name="categoryId" value="${esc(source.categoryId)}">` : ''}${assignableCategories().length ? '' : '<small>Belum ada kategori yang diizinkan. Hubungi admin untuk pengaturan otorisasi departemen.</small>'}</div>
        <div class="field"><label for="doc-revision">Nomor revisi</label><input id="doc-revision" type="number" min="0" readonly value="${revision}"></div>
        <div class="field"><label for="department">Departemen <span>*</span></label><select id="department" name="departmentId" required ${source && (!source._editId || source.entityType === 'request') ? 'disabled' : ''}>${options(departments, departmentId)}</select>${source && (!source._editId || source.entityType === 'request') ? `<input type="hidden" name="departmentId" value="${esc(departmentId)}">` : ''}</div>
        <div class="field"><label for="section">Seksi <span>*</span></label><select id="section" name="sectionId" required ${source && (!source._editId || source.entityType === 'request') ? 'disabled' : ''}>${options(db.sections.filter(s => s.departmentId === departmentId), sectionId)}</select>${source && (!source._editId || source.entityType === 'request') ? `<input type="hidden" name="sectionId" value="${esc(sectionId)}">` : ''}</div>
        <div class="field"><label for="effective-date">Tanggal Request <span>*</span></label><input type="date" name="effectiveDate" id="effective-date" value="${esc(source?.effectiveDate || new Date().toLocaleDateString('en-CA'))}" required></div>
        ${source && (!source._editId || source.entityType === 'request') ? `<div class="field full"><label for="change-notes">Catatan perubahan <span>*</span></label><textarea name="changeNotes" id="change-notes" placeholder="Jelaskan perubahan pada revisi ini..." maxlength="2000" required>${source._editId ? esc(source.changeNotes) : ''}</textarea></div>` : ''}
      </div>
    </div>
    <div class="document-attachment"><div class="form-divider"></div>
    <div class="form-section"><h2>Lampiran Dokumen</h2><p>Tambahkan file PDF jika diperlukan.</p><div class="upload-zone">${icon('upload')}<p>Pilih dokumen untuk dilampirkan</p><div class="small muted">Hanya PDF · maksimal 2 MB per file</div><input name="attachment" type="file" accept=".pdf,application/pdf" aria-label="Lampiran PDF"><p class="attachment-status" role="status"></p><button type="button" class="btn btn-secondary" data-action="preview-selected-pdf" hidden>${icon('eye')} Preview PDF di tab baru</button>${source?.attachment ? `<p class="small">Lampiran saat ini: ${esc(source.attachment.name)}. ${isPdfAttachment(source.attachment) ? 'Kosongkan untuk mempertahankan.' : 'Ganti lampiran lama dengan PDF untuk menyimpan perubahan.'}</p>` : ''}</div></div>
    </div><div class="document-email-recipients">${notificationRecipientsField(source?.emailRecipientIds || [])}</div>
    <div id="document-error" class="form-error" role="alert"></div>
    <div class="form-actions">${inModal ? '<button class="btn btn-secondary" type="button" data-action="close-modal">Batal</button>' : '<a class="btn btn-secondary" href="#requests">Batal</a>'}<button class="btn btn-primary" type="submit">${icon('save')} ${source?._editId ? 'Simpan Draft' : 'Simpan Dokumen'}</button></div>`;
}

function updateSections(departmentId) {
  const section = document.getElementById('section');
  if (section) section.innerHTML = options(db.sections.filter(s => s.departmentId === departmentId));
}

function renderRevisionFields(id) {
  const source = db.documents.find(d => d.id === id && canRequestRevision(d));
  refreshSearchSelect(document.getElementById('revise-source'));
  const fields = document.getElementById('document-fields');
  fields.innerHTML = source ? documentFields(source) : '<div class="empty"><p>Pilih dokumen untuk direvisi.</p></div>';
  enhanceSelects(fields);
  syncDocumentSource(document.getElementById('document-form'));
}

async function saveDocument(event) {
  event.preventDefault();
  const form = event.target;
  const actorId = currentUser?.id;
  const snapshot = db;
  if (!actorId) return;
  if (form.dataset.saving === 'true') return;
  const data = new FormData(form);
  const error = form.querySelector('#document-error');
  if (!error) return;
  const fail = message => { error.textContent = message; };
  const source = data.get('sourceId') ? db.documents.find(d => d.id === data.get('sourceId')) : null;
  const editing = data.get('editId') ? db.documentRequests.find(d => d.id === data.get('editId')) : null;
  if (data.get('editId') && !editing) return fail('Draft tidak tersedia.');
  if (editing && !canEditDocument(editing)) return fail('Dokumen ini tidak dapat diedit.');
  if (data.get('sourceId') && !editing && (!source || !canRequestRevision(source))) return fail('Pilih dokumen yang dapat Anda revisi.');
  const title = data.get('title')?.trim();
  const description = editing?.description || source?.description || '';
  if (!title) return fail('Judul Dokumen wajib diisi.');
  const departmentId = editing?.departmentId || source?.departmentId || data.get('departmentId');
  const sectionId = editing?.sectionId || source?.sectionId || data.get('sectionId');
  if (!isAdmin() && departmentId !== currentUser.departmentId) return fail('Pilih departemen Anda sendiri.');
  if (!db.sections.some(s => s.id === sectionId && s.departmentId === departmentId)) return fail('Seksi harus sesuai dengan departemen.');
  const categoryId = editing?.categoryId || source?.categoryId || data.get('categoryId');
  if (!DocumentAccess.canAssign(db, currentUser, categoryId)) return fail('Pilih kategori yang diizinkan untuk departemen Anda.');
  const type = editing?.type || source?.type || data.get('type');
  if (!db.documentTypes.some(t => t.name === type)) return fail('Jenis dokumen tidak valid.');
  if (!DocumentCategories.matches(db, db.documentCategories.find(category => category.id === categoryId), type)) return fail('Kategori tidak sesuai dengan jenis dokumen yang dipilih.');
  if (source && db.documents.some(d => d.supersedesId === source.id && d.id !== editing?.id)) return fail('Dokumen ini sudah memiliki revisi lain. Pilih revisi terbaru untuk melanjutkan.');
  const existing = editing || source;
  const spreadsheet = Boolean(existing?.workbookKey) || ((!existing || (!existing.attachment && instructionType(type))) && spreadsheetType(type));
  const template = templateForType(type);
  if (spreadsheet && !editing?.workbookKey && !source?.workbookKey && !template) return fail('Template Excel belum tersedia. Minta admin mengunggah format softcopy terlebih dahulu.');
  const recipients = spreadsheet || instructionType(type) ? [] : [...new Set(data.getAll('notifyUserIds'))];
  let workbookKey = editing?.workbookKey || null;
  let newWorkbookKey = null;
  if (recipients.some(id => id === currentUser.id || !db.users.some(user => user.id === id))) return fail('Periksa kembali pengguna penerima notifikasi.');
  let attachment = spreadsheet ? null : editing?.attachment || source?.attachment || null;
  const file = data.get('attachment');
  if (file?.name && !spreadsheet) {
    setDocumentBusy(form, true);
    try {
      const cached = pdfSelections.get(form.querySelector('input[name="attachment"]'));
      attachment = cached?.file === file ? cached.attachment : await readPdfFile(file);
    } catch (error) { return fail(error.message); }
    finally { setDocumentBusy(form, false); }
  }
  if (attachment && !isPdfAttachment(attachment)) return fail('Lampiran harus berupa PDF. Ganti lampiran lama dengan file PDF.');
  if (spreadsheet && !workbookKey) {
    setDocumentBusy(form, true);
    try {
      const bytes = await WorkbookStore.get(source?.workbookKey || template.workbookKey);
      await WorkbookEngine.open(bytes);
      if (!form.isConnected || currentUser?.id !== actorId || db !== snapshot) return;
      newWorkbookKey = 'document-' + uid();
      await WorkbookStore.put(newWorkbookKey, bytes);
      workbookKey = newWorkbookKey;
    } catch (failure) { if (newWorkbookKey) await WorkbookStore.remove(newWorkbookKey).catch(() => {}); return fail(failure.message); }
    finally { if (form.isConnected) setDocumentBusy(form, false); }
  }
  if (newWorkbookKey && (!form.isConnected || currentUser?.id !== actorId || db !== snapshot)) { await WorkbookStore.remove(newWorkbookKey).catch(() => {}); return; }

  if (!form.isConnected || currentUser?.id !== actorId) return;
  if (db !== snapshot) return fail('Data atau otorisasi telah berubah. Buka kembali formulir sebelum menyimpan.');
  if (form.dataset.origin === 'modal' && (!modal.open || !modal.contains(form))) return;
  const next = transaction();
  const dep = db.departments.find(d => d.id === departmentId);
  const prefix = db.documentTypes.find(t => t.name === type).prefix;
  const number = Math.max(0, ...[...db.documents, ...db.documentRequests].filter(d => d.code.startsWith(`${prefix}/${dep.code}/`)).map(d => Number(d.code.split('/').pop()) || 0)) + 1;
  const doc = { id: editing?.id || uid(), title, type, categoryId, departmentId, sectionId, code: editing?.code || source?.code || `${prefix}/${dep.code}/${String(number).padStart(3, '0')}`, revision: editing ? Number(editing.revision || 0) : source ? Number(source.revision || 0) + 1 : 0, status: editing?.status || 'draft', ownerId: editing?.ownerId || currentUser.id, description, changeNotes: data.get('changeNotes')?.trim() || editing?.changeNotes || 'Penerbitan dokumen baru.', effectiveDate: data.get('effectiveDate'), attachment, workbookKey, emailRecipientIds: recipients, emailStatus: recipients.length ? 'not_configured' : null, supersedesId: editing?.supersedesId || source?.id || null, createdAt: editing?.createdAt || today(), updatedAt: today(), history: editing?.history || (source ? [...source.history] : []) };
  if (recipients.some(id => !DocumentAccess.canRead(db, db.users.find(user => user.id === id), doc))) return fail('Penerima notifikasi belum memiliki akses kategori ini. Minta admin mengatur otorisasi departemennya atau hapus penerima tersebut.');
  Object.assign(doc, { entityType: 'request', adminReviewRequired: editing ? Boolean(editing.adminReviewRequired) : true, adminNumberSet:Boolean(editing?.adminNumberSet), requesterId: editing?.requesterId || actorId, sourceId: editing?.sourceId || source?.id || null, sourceUpdatedAt: editing?.sourceUpdatedAt || source?.updatedAt || null, contentVersion: (editing?.contentVersion || 0) + 1, events: (editing?.events || []).map(item=>({...item})), reviews: editing?.reviews || [], submissions: editing?.submissions || [], approverIds: editing?.approverIds || [], reviewRound: editing?.reviewRound || 0 });
  doc.events.push({ userId: actorId, action: editing ? 'Draft diperbarui' : 'Permintaan dibuat', at: today(), round: doc.reviewRound });
  if (editing) next.documentRequests[next.documentRequests.findIndex(d => d.id === doc.id)] = doc; else next.documentRequests.unshift(doc);
  if(editing && isAdmin() && editing.adminReviewRequired && editing.status==='admin_review')try{DocumentWorkflow.assignNumber(next,currentUser,doc,data.get('documentNumber'),today());}catch(failure){return fail(failure.message);}
  if (!saveDatabase(next)) { if (newWorkbookKey) await WorkbookStore.remove(newWorkbookKey).catch(() => {}); return; }
  if (form.dataset.origin === 'modal') modal.close();
  toast('Draft tersimpan. Lengkapi dokumen sebelum dikirim ke admin.');
  navigate(doc.workbookKey && !editing ? 'workbook-' + doc.id : 'requests');

}

function setDocumentBusy(form, saving) {
  form.dataset.saving = String(saving);
  form.setAttribute('aria-busy', String(saving));
  form.querySelectorAll('button[type="submit"]').forEach(button => {
    button.disabled = saving;
    if (saving) { button.dataset.originalLabel = button.innerHTML; button.textContent = 'Menyimpan…'; }
    else if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
  });
}

function showModal(html, className = '') {
  modal.className = className;
  modal.innerHTML = html;
  const heading = modal.querySelector('.modal-heading h2');
  if (heading) { heading.id = 'modal-title'; modal.setAttribute('aria-labelledby', 'modal-title'); }
  enhanceSelects(modal);
  if (!modal.open) modal.showModal();
  else modal.querySelector('button, input, select')?.focus();
}
const modalHeading = title => `<div class="modal-heading"><h2>${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="Tutup dialog">${icon('close')}</button></div>`;
function showDetail(id) {
  const doc = documentRecord(id);
  if (!doc || !canRead(doc)) return toast('Dokumen tidak tersedia untuk akun Anda.', true);
  showModal(`${modalHeading('Detail Dokumen')}
    <div class="detail-top"><div class="file-icon">${icon('document')}</div><div><h2>${esc(doc.title)}</h2><p>${esc(doc.code)} &nbsp;·&nbsp; Rev. ${formatRevision(doc.revision)}</p></div></div>
    <dl class="detail-grid"><div><dt>KATEGORI DOKUMEN</dt><dd>${esc(categoryName(doc.categoryId))}</dd></div><div><dt>JENIS DOKUMEN</dt><dd>${esc(doc.type)}</dd></div><div><dt>DEPARTEMEN</dt><dd>${esc(departmentName(doc.departmentId))}</dd></div><div><dt>SEKSI</dt><dd>${esc(sectionName(doc.sectionId))}</dd></div><div><dt>TANGGAL EFEKTIF</dt><dd>${dateLabel(doc.effectiveDate, true)}</dd></div></dl>
    ${doc.workbookKey ? `<div class="notice attachment-detail">${icon('document')}<span>Dokumen Excel</span><button class="btn btn-secondary" data-action="open-workbook" data-id="${esc(doc.id)}">${canEditDocument(doc) ? 'Buka Editor Excel' : 'Lihat Excel'}</button></div>` : ''}
    ${doc.attachment ? `<div class="notice attachment-detail">${icon('document')}<span>Lampiran: ${esc(doc.attachment.name)}</span>${isPdfAttachment(doc.attachment) ? `<button class="btn btn-secondary" data-action="preview-pdf" data-id="${esc(doc.id)}">${icon('eye')} Preview PDF ${icon('arrow')}</button>` : ''}</div>` : ''}
    <h3 class="detail-label">Riwayat Revisi</h3>${[...doc.history].reverse().map(h => `<div class="revision-entry"><strong>Rev. ${formatRevision(h.revision)}</strong><span>${esc(h.notes)}<br><span class="muted">${dateLabel(h.date)} · ${esc(userName(h.userId))}</span></span></div>`).join('')}
    <div class="form-actions">${canDeleteDocument(doc) ? `<button class="btn btn-danger" data-action="delete-doc" data-id="${esc(doc.id)}">${icon('trash')} Delete</button>` : ''}${canRequestRevision(doc) ? `<button class="btn btn-secondary" data-action="edit-document" data-id="${esc(doc.id)}">${icon('edit')} Ajukan Update</button>` : ''}<button class="btn btn-primary" data-action="download" data-id="${esc(doc.id)}">${icon('download')} Unduh</button></div>`);
}

function isPdfAttachment(attachment) {
  if (!attachment || !/\.pdf$/i.test(attachment.name)) return false;
  if (attachment.storageKey) return attachment.type==='application/pdf' && /^approval-pdf-[a-z0-9-]+$/i.test(attachment.storageKey) && attachment.size>0 && attachment.size<=5*1024*1024;
  if(typeof attachment.data !== 'string')return false;
  const match = attachment.data.match(/^data:[^,]{0,100};base64,/);
  if (!match) return false;
  try { return atob(attachment.data.slice(match[0].length, match[0].length + 12)).startsWith('%PDF-'); }
  catch { return false; }
}

async function readPdfFile(file) {
  if (!/\.pdf$/i.test(file.name)) throw new Error('Lampiran hanya boleh berupa file PDF.');
  if (!file.size) throw new Error('File PDF kosong. Pilih file PDF yang berisi dokumen.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 2 MB per file.');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('PDF tidak dapat dibaca. Pilih file kembali.'));
    reader.readAsDataURL(file);
  });
  const attachment = { name: file.name, type: 'application/pdf', size: file.size, data };
  if (!isPdfAttachment(attachment)) throw new Error('Isi file bukan PDF yang valid. Pilih file PDF asli.');
  return attachment;
}

async function selectPdfAttachment(input) {
  const file = input.files[0];
  const zone = input.closest('.upload-zone');
  const status = zone.querySelector('.attachment-status');
  const preview = zone.querySelector('[data-action="preview-selected-pdf"]');
  pdfSelections.delete(input);
  preview.hidden = true;
  status.classList.remove('file-error');
  status.textContent = file ? 'Memeriksa PDF…' : '';
  if (!file) return;
  try {
    const attachment = await readPdfFile(file);
    if (input.files[0] !== file) return;
    pdfSelections.set(input, { file, attachment });
    status.textContent = `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`;
    preview.hidden = false;
  } catch (error) {
    if (input.files[0] !== file) return;
    status.textContent = error.message;
    status.classList.add('file-error');
  }
}

function openPdfPreview(attachment, metadata = {}, documentId = '', categoryId = '') {
  const actorId = currentUser?.id;
  const snapshot = db;
  const permitted = () => Boolean(actorId && currentUser?.id === actorId && db === snapshot && (documentId ? (documentRecord(documentId) && canRead(documentRecord(documentId))) : DocumentAccess.canAssign(db, currentUser, categoryId)));
  if (!permitted()) return toast('Dokumen atau kategori tidak tersedia untuk akun Anda.', true);
  if (!isPdfAttachment(attachment)) return toast('Lampiran PDF tidak tersedia atau tidak valid.', true);
  const channel = uid();
  const url = new URL(PDF_VIEWER_URL);
  url.hash = new URLSearchParams({ channel }).toString();
  const tab = window.open(url.href, '_blank');
  if (!tab) return toast('Izinkan pop-up browser untuk membuka preview PDF di tab baru.', true);
  const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
  const onReady = async event => {
    if (event.source !== tab || event.data?.type !== 'docuflow:pdf-ready' || event.data.channel !== channel) return;
    if (location.protocol !== 'file:' && event.origin !== location.origin) return;
    if (!permitted()) { cleanup(); tab.close(); toast('Akses preview berubah. Buka kembali dokumen.', true); return; }
    cleanup();
    try {
      const content=attachment.storageKey?{...attachment,bytes:await WorkbookStore.get(attachment.storageKey)}:attachment;
      if(!permitted()){tab.close();toast('Akses preview berubah. Buka kembali dokumen.',true);return;}
      tab.postMessage({ type: 'docuflow:pdf-data', channel, attachment:content, metadata }, targetOrigin);
    } catch(error){tab.close();toast('PDF tidak tersedia di browser ini.',true);}
  };
  const cleanup = () => { window.removeEventListener('message', onReady); clearTimeout(timeout); };
  const timeout = setTimeout(cleanup, 30000);
  window.addEventListener('message', onReady);
}

document.addEventListener('change', event => {
  if (event.target.matches('input[name="attachment"]')) selectPdfAttachment(event.target);
});

function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function downloadDocument(id) {
  const d = documentRecord(id);
  if (!d || !canRead(d)) return;
  if (d.workbookKey && !isPdfAttachment(d.attachment)) return downloadWorkbook(id);
  if (d.attachment) {
    if(d.attachment.storageKey){
      const snapshot=db,actorId=currentUser.id;
      try{const bytes=await WorkbookStore.get(d.attachment.storageKey);if(db!==snapshot||currentUser?.id!==actorId||!canRead(d))return;downloadBlob(new Blob([bytes],{type:'application/pdf'}),d.attachment.name);toast('Dokumen berhasil diunduh.');}catch{toast('PDF tidak tersedia di browser ini.',true);}return;
    }
    if (!/^data:[^,]*;base64,[A-Za-z0-9+/=\r\n]+$/.test(d.attachment.data)) return toast('Lampiran tidak dapat dibaca.', true);
    const bytes = Uint8Array.from(atob(d.attachment.data.split(',')[1]), c => c.charCodeAt(0));
    downloadBlob(new Blob([bytes], { type: d.attachment.type || 'application/octet-stream' }), d.attachment.name);
  } else downloadBlob(new Blob([`${d.title}\n${d.code} | Rev. ${d.revision}\nDepartemen: ${departmentName(d.departmentId)}\nSeksi: ${sectionName(d.sectionId)}\nTanggal Efektif: ${dateLabel(d.effectiveDate)}\n\nCatatan perubahan: ${d.changeNotes}`], { type: 'text/plain;charset=utf-8' }), `${d.code.replaceAll('/', '-')}-rev${d.revision}.txt`);
  toast('Dokumen berhasil diunduh.');
}

function documentTypesPage() {
  const types = db.documentTypes;
  return `${heading('Jenis Dokumen', 'Kelola jenis dan kode awalan dokumen perusahaan.', `<button class="btn btn-primary" data-action="add-document-type">${icon('plus')} Tambah Jenis Dokumen</button>`)}
    <section class="panel"><div class="table-scroll"><table class="type-management-table"><caption class="visually-hidden">Pengaturan jenis dokumen</caption><thead><tr><th scope="col">JENIS DOKUMEN</th><th scope="col">KODE AWALAN</th><th scope="col">JUMLAH DOKUMEN</th><th scope="col">AKSI</th></tr></thead><tbody>
      ${types.map(t => `<tr><td><strong>${esc(t.name)}</strong></td><td><span class="type-label">${esc(t.prefix)}</span></td><td>${db.documents.filter(d => d.type === t.name).length} dokumen</td><td><div class="row-actions"><button class="table-action" data-action="edit-document-type" data-id="${esc(t.id)}" aria-label="Edit ${esc(t.name)}">${icon('edit')} Edit</button><button class="table-action delete" data-action="delete-document-type" data-id="${esc(t.id)}" aria-label="Delete ${esc(t.name)}">${icon('trash')} Delete</button></div></td></tr>`).join('') || '<tr><td colspan="4"><div class="empty"><h2>Belum ada jenis dokumen</h2><p>Tambahkan jenis dokumen untuk digunakan pada sidebar dan formulir.</p></div></td></tr>'}
    </tbody></table></div></section>`;
}

function showDocumentTypeForm(id = '') {
  if (!isAdmin()) return;
  const record = id ? db.documentTypes.find(t => t.id === id) : null;
  if (id && !record) return;
  showModal(`${modalHeading(record ? 'Edit Jenis Dokumen' : 'Tambah Jenis Dokumen')}<form id="document-type-form"><div class="form-grid"><div class="field full"><label for="type-name">Nama jenis dokumen <span>*</span></label><input id="type-name" name="name" value="${esc(record?.name || '')}" placeholder="Contoh: Prosedur Mutu" maxlength="80" required></div><div class="field full"><label for="type-prefix">Kode awalan <span>*</span></label><input id="type-prefix" name="prefix" value="${esc(record?.prefix || '')}" placeholder="Contoh: PM" maxlength="8" pattern="[A-Za-z][A-Za-z0-9]{0,7}" required><small>1–8 huruf atau angka, diawali huruf. Contoh nomor dokumen: PM/ENG/001. Nomor dokumen yang sudah ada tetap dipertahankan.</small></div></div><div id="type-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">${icon('save')} Simpan Jenis Dokumen</button></div></form>`);
  document.getElementById('document-type-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!isAdmin()) return;
    const data = new FormData(event.target);
    const name = data.get('name').trim().replace(/\s+/g, ' ');
    const prefix = data.get('prefix').trim().toUpperCase();
    const error = document.getElementById('type-error');
    if (!name || !/^[A-Z][A-Z0-9]{0,7}$/.test(prefix)) { error.textContent = 'Lengkapi nama dan kode awalan yang valid.'; return; }
    if (db.documentTypes.some(t => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) { error.textContent = 'Nama jenis dokumen sudah digunakan.'; return; }
    if (db.documentTypes.some(t => t.id !== id && t.prefix === prefix)) { error.textContent = 'Kode awalan sudah digunakan.'; return; }
    const next = transaction();
    if (record && name !== record.name && db.documentRequests.some(request => request.type === record.name)) { error.textContent = 'Nama jenis sedang digunakan permintaan dan riwayat persetujuan. Nama tidak dapat diubah.'; return; }
    const row = { id: record?.id || uid(), name, prefix };
    if (record) {
      next.documentTypes[next.documentTypes.findIndex(t => t.id === id)] = row;
      next.documents.forEach(doc => { if (doc.type === record.name) doc.type = name; });
    } else next.documentTypes.push(row);
    if (!saveDatabase(next)) return;
    if (record && filter.type === record.name) filter.type = name;
    modal.close(); render(); toast('Jenis dokumen berhasil disimpan.');
    document.querySelector('[data-action="add-document-type"]')?.focus();
  });
}

function confirmDeleteDocumentType(id) {
  if (!isAdmin()) return;
  const type = db.documentTypes.find(t => t.id === id);
  if (!type) return;
  const usage = [...db.documents, ...db.documentRequests].filter(d => d.type === type.name).length;
  if (db.documentCategories.some(category => category.documentTypeId === id)) { showModal(`${modalHeading('Jenis Dokumen Masih Digunakan')}<p class="detail-body">Jenis dokumen ini masih digunakan oleh kategori. Ubah jenis pada kategori terkait sebelum menghapusnya.</p><div class="form-actions"><button class="btn btn-secondary" data-action="close-modal">Mengerti</button></div>`); return; }
  if (usage) {
    showModal(`${modalHeading('Jenis Dokumen Masih Digunakan')}<p class="detail-body">Jenis “${esc(type.name)}” masih digunakan oleh ${usage} dokumen. Pindahkan jenis pada dokumen terkait sebelum menghapusnya agar data tetap terhubung.</p><div class="form-actions"><button class="btn btn-secondary" data-action="close-modal">Mengerti</button></div>`);
    return;
  }
  showModal(`${modalHeading('Hapus Jenis Dokumen?')}<p class="detail-body">Jenis “${esc(type.name)}” (${esc(type.prefix)}) akan dihapus dari sidebar, kategori, filter, dan formulir.</p><div class="form-actions"><button class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-danger" data-action="confirm-delete-type" data-id="${esc(type.id)}">${icon('trash')} Delete</button></div>`);
}


function showSignatureForm() {
  const actorId = currentUser?.id;
  if (!actorId) return;
  closeProfile();
  showModal(`${modalHeading('Tanda Tangan Saya')}<form id="signature-form"><p class="detail-body">Unggah gambar tanda tangan untuk digunakan saat menyetujui dokumen.</p><div class="field"><label for="signature-file">Gambar tanda tangan (PNG atau JPG, maksimal 2 MB)</label><input id="signature-file" type="file" accept="image/png,image/jpeg" required></div><p class="small muted">${currentUser.signatureKey ? 'Tanda tangan sebelumnya tersimpan. Unggah gambar baru untuk menggantinya.' : 'Belum ada tanda tangan tersimpan.'}</p><img id="signature-preview" alt="Pratinjau tanda tangan" hidden style="display:block;max-width:100%;max-height:160px;object-fit:contain"><p id="signature-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button type="submit" class="btn btn-primary">Simpan Tanda Tangan</button></div></form>`);
  const form = document.getElementById('signature-form'), input = form.querySelector('#signature-file'), preview = form.querySelector('#signature-preview');
  let previewUrl = '';
  modal.addEventListener('close', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, { once: true });
  input.addEventListener('change', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = input.files[0] ? URL.createObjectURL(input.files[0]) : ''; preview.hidden = !previewUrl; if (previewUrl) preview.src = previewUrl; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = input.files[0], error = form.querySelector('#signature-error'), snapshot = db;
    if (!file || !['image/png','image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024 || !file.size) { error.textContent = 'Pilih gambar PNG atau JPG dengan ukuran maksimal 2 MB.'; return; }
    let key;
    try {
      const bitmap = await createImageBitmap(file);
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 25000000) { bitmap.close(); throw new Error('Ukuran gambar terlalu besar.'); }
      const scale = Math.min(1, 1024 / bitmap.width, 512 / bitmap.height), canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Gambar tanda tangan tidak dapat dibaca.');
      if (db !== snapshot || currentUser?.id !== actorId || !form.isConnected) throw new Error('Sesi berubah. Buka kembali profil Anda.');
      key = 'signature-' + uid(); await WorkbookStore.put(key, await blob.arrayBuffer());
      if (db !== snapshot || currentUser?.id !== actorId || !form.isConnected) throw new Error('Sesi berubah. Buka kembali profil Anda.');
      const next = transaction(), user = next.users.find(item => item.id === actorId);
      if (!user) throw new Error('Pengguna tidak tersedia.');
      user.signatureKey = key;
      if (!saveDatabase(next)) throw new Error('Tanda tangan belum tersimpan.');
      key = null; currentUser = db.users.find(item => item.id === actorId); if (previewUrl) URL.revokeObjectURL(previewUrl); modal.close(); toast('Tanda tangan berhasil disimpan.');
    } catch (failure) { if (key) await WorkbookStore.remove(key).catch(() => {}); if (form.isConnected) error.textContent = failure.message || 'Gambar tanda tangan tidak dapat dibaca.'; }
  });
}

function usersPage() {
  const tabs = [['users', 'Pengguna'], ['departments', 'Departemen'], ['sections', 'Seksi']];
  const rows = db[adminTab];
  return `${heading('Administrasi Workspace', 'Kelola akun pengguna, departemen, dan seksi perusahaan.', `<button class="btn btn-primary" data-action="add-admin">${icon('plus')} Tambah ${adminTab === 'users' ? 'Pengguna' : adminTab === 'departments' ? 'Departemen' : 'Seksi'}</button>`)}<div class="admin-tabs">${tabs.map(([v, label]) => `<button class="btn ${adminTab === v ? 'active' : ''}" data-action="admin-tab" data-tab="${v}">${label} <span class="small">(${db[v].length})</span></button>`).join('')}</div><section class="panel"><div class="table-scroll"><table><thead><tr>${adminTab === 'users' ? '<th>NAMA PENGGUNA</th><th>EMAIL</th><th>ROLE</th><th>DEPARTEMEN</th><th>SEKSI</th>' : adminTab === 'departments' ? '<th>DEPARTEMEN</th><th>KODE</th><th>JUMLAH SEKSI</th>' : '<th>SEKSI</th><th>DEPARTEMEN</th>'}<th>AKSI</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong style="color:#5c6e87;font-weight:600">${esc(r.name)}</strong></td>${adminTab === 'users' ? `<td>${esc(r.email)}</td><td><span class="type-label">${r.role === 'admin' ? 'Administrator' : 'User'}</span></td><td>${esc(departmentName(r.departmentId))}</td><td>${esc(sectionName(r.sectionId))}</td>` : adminTab === 'departments' ? `<td>${esc(r.code)}</td><td>${db.sections.filter(s => s.departmentId === r.id).length} seksi</td>` : `<td>${esc(departmentName(r.departmentId))}</td>`}<td><button class="icon-btn" data-action="edit-admin" data-id="${esc(r.id)}" aria-label="Edit ${esc(r.name)}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function showAdminForm(id = '') {
  if (!isAdmin()) return;
  const record = db[adminTab].find(r => r.id === id);
  const label = adminTab === 'users' ? 'Pengguna' : adminTab === 'departments' ? 'Departemen' : 'Seksi';
  showModal(`${modalHeading(`${record ? 'Edit' : 'Tambah'} ${label}`)}<form id="admin-form"><div class="form-grid"><div class="field full"><label for="admin-name">Nama ${label.toLowerCase()} <span>*</span></label><input id="admin-name" name="name" required maxlength="80" value="${esc(record?.name || '')}"></div>${adminTab === 'users' ? `<div class="field full"><label for="admin-email">Email <span>*</span></label><input name="email" id="admin-email" type="email" required value="${esc(record?.email || '')}"></div><div class="field"><label for="admin-password">${record ? 'Password baru (opsional)' : 'Password'}</label><input id="admin-password" name="password" type="password" minlength="6" autocomplete="new-password" ${!record ? 'required' : ''} placeholder="Minimal 6 karakter"></div><div class="field"><label for="admin-role">Role</label><select id="admin-role" name="role"><option value="user">User</option><option value="admin" ${record?.role === 'admin' ? 'selected' : ''}>Administrator</option></select></div>` : ''}${adminTab !== 'departments' ? `<div class="field ${adminTab === 'sections' ? 'full' : ''}"><label for="admin-department">Departemen <span>*</span></label><select id="admin-department" name="departmentId" required>${options(db.departments, record?.departmentId || db.departments[0]?.id)}</select></div>` : `<div class="field full"><label for="admin-code">Kode departemen <span>*</span></label><input id="admin-code" name="code" required maxlength="8" pattern="[A-Za-z0-9]+" placeholder="Contoh: ENG" value="${esc(record?.code || '')}"></div>`}${adminTab === 'users' ? `<div class="field"><label for="admin-section">Seksi <span>*</span></label><select name="sectionId" id="admin-section" required>${options(db.sections.filter(s => s.departmentId === (record?.departmentId || db.departments[0]?.id)), record?.sectionId)}</select></div>` : ''}</div><div id="admin-error" class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">${icon('save')} Simpan ${label}</button></div></form>`);
  document.getElementById('admin-department')?.addEventListener('change', e => { const section = document.getElementById('admin-section'); if (section) section.innerHTML = options(db.sections.filter(s => s.departmentId === e.target.value)); });
  document.getElementById('admin-form').addEventListener('submit', e => {
    e.preventDefault(); if (!isAdmin()) return;
    const data = Object.fromEntries(new FormData(e.target)); const error = document.getElementById('admin-error');
    data.name = data.name.trim(); if (!data.name) { error.textContent = 'Nama wajib diisi.'; return; }
    if (adminTab === 'users') {
      data.email = data.email.trim().toLowerCase();
      if (db.users.some(u => u.email.toLowerCase() === data.email && u.id !== id)) { error.textContent = 'Email sudah terdaftar.'; return; }
      if (!db.sections.some(s => s.id === data.sectionId && s.departmentId === data.departmentId)) { error.textContent = 'Departemen harus memiliki seksi yang sesuai.'; return; }
      if (id === currentUser.id && data.role !== 'admin') { error.textContent = 'Role akun admin yang sedang digunakan tidak dapat diturunkan.'; return; }
      if (!data.password && record) data.password = record.password;
    } else if (adminTab === 'departments') { data.code = data.code.toUpperCase(); if (db.departments.some(d => d.id !== id && (d.code === data.code || d.name.toLowerCase() === data.name.toLowerCase()))) { error.textContent = 'Nama atau kode departemen sudah digunakan.'; return; } }
    else if (record && record.departmentId !== data.departmentId && (db.users.some(u => u.sectionId === id) || [...db.documents, ...db.documentRequests].some(d => d.sectionId === id))) { error.textContent = 'Seksi yang sedang dipakai tidak dapat dipindah ke departemen lain.'; return; }
    if (adminTab === 'sections' && db.sections.some(s => s.id !== id && s.departmentId === data.departmentId && s.name.toLowerCase() === data.name.toLowerCase())) { error.textContent = 'Seksi sudah tersedia di departemen ini.'; return; }
    const next = transaction(); const row = { ...record, ...data, id: id || uid() };
    if (record) next[adminTab][next[adminTab].findIndex(r => r.id === id)] = row; else next[adminTab].push(row);
    if (saveDatabase(next)) { currentUser = db.users.find(u => u.id === currentUser.id); modal.close(); render(); toast(`${label} berhasil disimpan.`); }
  });
}



document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) { if (!event.target.closest('.profile-menu')) closeProfile(); return; }
  const { action, id } = target.dataset;
  if (action === 'demo') { const admin = target.dataset.role === 'admin'; document.getElementById('email').value = admin ? 'admin@docuflow.id' : 'user@docuflow.id'; document.getElementById('password').value = admin ? 'admin123' : 'user123'; document.getElementById('demo-credentials').textContent = admin ? 'Admin: admin@docuflow.id · Password: admin123' : 'User: user@docuflow.id · Password: user123'; document.getElementById('login-error').textContent = ''; document.getElementById('password').removeAttribute('aria-invalid'); document.querySelector('#login-form button[type=submit]').focus(); return; }
  if (action === 'password') { const input = document.getElementById('password'); input.type = input.type === 'password' ? 'text' : 'password'; target.setAttribute('aria-label', input.type === 'password' ? 'Tampilkan password' : 'Sembunyikan password'); target.setAttribute('aria-pressed', String(input.type !== 'password')); return; }
  if (action === 'close-modal') { modal.close(); return; }
  if (!currentUser) return;
  switch (action) {
    case 'open-request-list': event.preventDefault(); navigate('requests'); break;
    case 'toggle-documents': { const menu = document.getElementById('document-submenu'); menu.hidden = !menu.hidden; target.setAttribute('aria-expanded', String(!menu.hidden)); break; }
    case 'sidebar': setSidebarOpen(true); break;
    case 'close-sidebar': setSidebarOpen(false); break;
    case 'add-document': openCreateDocumentModal(); break;
    case 'page': page = Number(target.dataset.page); render(); document.querySelector('.pages [aria-current="page"]')?.focus(); break;
    case 'detail': showDetail(id); break;
    case 'toggle-form-select': {
      const select = target.closest('.form-combobox')?.querySelector('select');
      const record = select && searchableSelects.get(select);
      if (!record || select.disabled) return;
      const wasOpen = !record.list.hidden;
      record.input.focus();
      if (wasOpen) closeSearchSelects(); else openSearchSelect(record);
      break;
    }
    case 'select-form-option': {
      const select = target.closest('.form-combobox')?.querySelector('select');
      const record = select && searchableSelects.get(select);
      if (record) chooseSearchSelect(record, target.dataset.value);
      break;
    }
    case 'download': downloadDocument(id); break;
    case 'preview-pdf': {
      const doc = documentRecord(id);
      if (doc && canRead(doc)) openPdfPreview(doc.signedAttachment || doc.attachment, { title: doc.title, code: doc.code }, doc.id);
      break;
    }
    case 'preview-selected-pdf': {
      const form = target.closest('form');
      const input = form?.querySelector('input[name="attachment"]');
      const selected = input && pdfSelections.get(input);
      const source = documentRecord(form?.elements.editId?.value || form?.elements.sourceId?.value);
      if (source && !canRead(source)) return toast('Dokumen tidak tersedia untuk akun Anda.', true);
      if (selected && selected.file === input.files[0]) openPdfPreview(selected.attachment, { title: form.querySelector('#doc-title')?.value, code: source?.code }, '', form.querySelector('#doc-category')?.value);
      else toast('Pilih file PDF yang valid terlebih dahulu.', true);
      break;
    }
    case 'reset-filters': filter = { search: '', type: '', department: '', category: '' }; page = 1; render(); document.querySelector('[data-action=reset-filters]')?.focus(); break;
    case 'create-mode': createMode = target.dataset.mode; render(); document.querySelector('.mode-switch [aria-pressed="true"]')?.focus(); break;
    case 'revise-doc': { modal.close(); createMode = 'revise'; history.replaceState(null, '', '#create'); render(); const select = document.getElementById('revise-source'); select.value = id; renderRevisionFields(id); break; }
    case 'edit-document':
    case 'edit-draft': openDocumentEditor(id); break;

    case 'delete-doc': {
      const doc = db.documents.find(d => d.id === id);
      if (!doc || !canDeleteDocument(doc)) return;
      showModal(`${modalHeading('Hapus Dokumen?')}<p class="detail-body">Dokumen “${esc(doc.title)}” (${esc(doc.code)}, Rev. ${formatRevision(doc.revision)}) akan dihapus dari penyimpanan lokal beserta aktivitasnya.</p><div class="form-actions"><button class="btn btn-secondary" data-action="close-modal">Batal</button><button class="btn btn-danger" data-action="confirm-delete" data-id="${esc(id)}">${icon('trash')} Delete</button></div>`);
      break;
    }
    case 'confirm-delete': {
      const doc = db.documents.find(d => d.id === id);
      if (!doc || !canDeleteDocument(doc)) return;
      const next = transaction();
      next.documents = next.documents.filter(d => d.id !== id);
      next.activities = next.activities.filter(a => a.documentId !== id);
      if (saveDatabase(next)) { releaseWorkbookFile(doc.workbookKey); modal.close(); render(); toast('Dokumen berhasil dihapus.'); }
      break;
    }
    case 'toggle-filter': {
      const combo = document.getElementById(`${target.dataset.key}-filter`)?.closest('.filter-combobox');
      if (!combo) return;
      const wasOpen = !combo.querySelector('.combo-options').hidden;
      combo.querySelector('input').focus();
      if (wasOpen) closeFilterCombos(); else openFilterCombo(combo);
      break;
    }
    case 'select-filter': chooseFilter(target.dataset.key, target.dataset.value); break;
    case 'add-template': showTemplateForm(id); break;
    case 'download-template': downloadTemplate(id); break;
    case 'open-workbook': { const doc = documentRecord(id); if (doc?.workbookKey && canRead(doc)) { modal.close(); navigate('workbook-' + id); } break; }
    case 'add-category': showCategoryForm(); break;
    case 'edit-category': showCategoryForm(id); break;
    case 'delete-category': deleteCategory(id); break;
    case 'confirm-delete-category': deleteCategory(id, true); break;
    case 'copy-authorization': showCopyAuthorization(); break;
    case 'add-document-type': showDocumentTypeForm(); break;
    case 'edit-document-type': showDocumentTypeForm(id); break;
    case 'delete-document-type': confirmDeleteDocumentType(id); break;
    case 'confirm-delete-type': {
      if (!isAdmin()) return;
      const type = db.documentTypes.find(t => t.id === id);
      if (!type) return;
      if ([...db.documents, ...db.documentRequests].some(d => d.type === type.name) || db.documentCategories.some(category => category.documentTypeId === id)) { confirmDeleteDocumentType(id); return; }
      const next = transaction();
      next.documentTypes = next.documentTypes.filter(t => t.id !== id);
      if (saveDatabase(next)) {
        if (filter.type === type.name) filter.type = '';
        modal.close(); render(); toast('Jenis dokumen berhasil dihapus.');
      }
      break;
    }
    case 'admin-tab': if (isAdmin() && ['users', 'departments', 'sections'].includes(target.dataset.tab)) { adminTab = target.dataset.tab; render(); } break;
    case 'add-admin': showAdminForm(); break;
    case 'edit-admin': showAdminForm(id); break;
    case 'profile': { const existing = document.querySelector('.profile-menu'); if (existing) { closeProfile(); break; } const el = document.createElement('div'); el.id = 'profile-menu'; el.className = 'profile-menu'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Profil pengguna'); el.innerHTML = `<strong>${esc(currentUser.name)}</strong><p>${esc(currentUser.email)}<br>${esc(departmentName(currentUser.departmentId))}<br>${esc(sectionName(currentUser.sectionId))}</p><button class="btn btn-secondary" data-action="signature-profile">Tanda Tangan Saya</button><button class="btn btn-secondary" data-action="logout">${icon('logout')} Keluar dari workspace</button>`; document.querySelector('.topbar').appendChild(el); target.setAttribute('aria-expanded', 'true'); el.querySelector('button').focus(); break; }
    case 'signature-profile': showSignatureForm(); break;
    case 'logout': try { localStorage.removeItem(SESSION_KEY); } catch {} currentUser = null; page = 1; createMode = 'create'; adminTab = 'users'; requestListTab = 'incoming'; filter = { search: '', type: '', department: '', category: '' }; modal.close(); renderLogin(); break;
  }
});


function closeProfile(returnFocus = false) {
  const trigger = document.querySelector('[data-action="profile"]');
  document.querySelector('.profile-menu')?.remove();
  trigger?.setAttribute('aria-expanded', 'false');
  if (returnFocus) trigger?.focus();
}

function setSidebarOpen(open) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('open', open);
  document.querySelector('.screen-overlay').classList.toggle('visible', open);
  document.querySelector('.main-shell').inert = open;
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', String(open));
  if (open) sidebar.querySelector('.sidebar-close').focus();
  else document.querySelector('.mobile-menu').focus();
}

document.addEventListener('keydown', event => {
  const sidebar = document.querySelector('.sidebar.open');
  if (event.key === 'Escape') {
    if (sidebar) setSidebarOpen(false);
    if (document.querySelector('.profile-menu')) closeProfile(true);
  }
  if (event.key !== 'Tab' || !sidebar || modal.open) return;
  const controls = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.matchMedia('(min-width: 801px)').addEventListener('change', event => {
  if (event.matches && document.querySelector('.sidebar.open')) setSidebarOpen(false);
});

document.querySelector('.skip-link')?.addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main-content')?.focus();
});
document.addEventListener('click', event => { if (!event.target.closest('.filter-combobox')) closeFilterCombos(); });
document.addEventListener('click', event => { if (!event.target.closest('.form-combobox')) closeSearchSelects(); });
modal.addEventListener('close', () => {
  if (!modal.open) { modal.replaceChildren(); modal.className = ''; }
});
modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } });
window.addEventListener('hashchange', () => { page = 1; render(); window.scrollTo(0, 0); document.getElementById('main-content')?.focus({ preventScroll: true }); });
window.addEventListener('storage', event => {
  if (![DB_KEY, SESSION_KEY].includes(event.key) || !event.key) return;
  try { db = loadDatabase(); currentUser = db.users.find(u => u.id === localStorage.getItem(SESSION_KEY)); modal.close(); render(); } catch { toast('Data browser berubah dan tidak dapat dibaca. Muat ulang halaman.', true); }
});

async function startWorkspace() {
try { await CleanStart.run(localStorage, WorkbookStore, seedDatabase); db = loadDatabase(); currentUser = db.users.find(u => u.id === localStorage.getItem(SESSION_KEY)); render(); }
catch { app.innerHTML = `<div class="login-form-side" style="min-height:100vh"><div class="login-card">${brand()}<h2 style="margin-top:30px">Penyimpanan tidak tersedia</h2><p>Aktifkan localStorage di browser untuk membuka workspace. Jika data pernah diubah secara manual, pulihkan salinan data yang valid sebelum memuat ulang.</p><button class="btn btn-primary" onclick="location.reload()">Coba lagi</button></div></div>`; }

}
startWorkspace();
