const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const project = path.resolve(__dirname, '..');
const entries = [path.join(project, 'index.html'), path.join(project, 'dist/index.html')];
// Halaman tambahan pada folder workspace tidak ikut arsip hosting.
const workspaceEntry = path.resolve(project, '../index.html');
if (fs.existsSync(path.resolve(project, '../docuflow'))) entries.push(workspaceEntry);

for (const entry of entries) {
  test(`${path.relative(project, entry)} tersedia dengan CSS dan JavaScript yang dapat dibuka`, () => {
    const html = fs.readFileSync(entry, 'utf8');
    assert.match(html, /<html lang="id">/);
    assert.match(html, /<script src="[^"]*app\.js" defer>/);
    assert.match(html, /<link rel="stylesheet" href="[^"]*styles\.css">/);
    for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (!/^(https?:|#)/.test(asset)) {
        assert.ok(fs.existsSync(path.resolve(path.dirname(entry), asset)), `Aset lokal tidak ditemukan: ${asset}`);
      }
    }
  });
}

test('font dan lisensi tersedia lokal untuk pembukaan tanpa internet', () => {
  const fonts = path.join(project, 'dist/assets/fonts');
  assert.ok(fs.statSync(path.join(fonts, 'plus-jakarta-sans.ttf')).size > 10000);
  assert.match(fs.readFileSync(path.join(fonts, 'OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE/);
});

test('halaman preview PDF dan seluruh asetnya tersedia lokal', () => {
  const viewer = path.join(project, 'dist/pdf-viewer.html');
  const html = fs.readFileSync(viewer, 'utf8');
  assert.match(html, /<iframe[^>]+title="Isi dokumen PDF"/);
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(fs.existsSync(path.resolve(path.dirname(viewer), asset)), `Aset preview tidak ditemukan: ${asset}`);
  }
});
