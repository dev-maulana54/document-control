const { test } = require('node:test');
const assert = require('node:assert/strict');
const access = require('../dist/document-access.js');

const categories = [{ id: 'assembly', code: 'OM-PR2-ASY', name: 'Assembly' }, { id: 'casting', code: 'OM-PR1-CST', name: 'Casting' }];
const admin = { id: 'admin', role: 'admin', departmentId: 'eng' };
const user = { id: 'rina', role: 'user', departmentId: 'prod' };
function database() {
  return { departments: [{ id: 'prod' }, { id: 'qa' }, { id: 'eng' }], documents: [{ id: 'one', categoryId: 'assembly', ownerId: 'rina' }, { id: 'two', categoryId: 'casting' }], documentCategories: structuredClone(categories), departmentAuthorizations: { prod: ['assembly'], qa: [], eng: [] } };
}

test('kategori yang tidak diizinkan ditolak, termasuk dokumen milik pengguna sendiri', () => {
  const db = database();
  assert.equal(access.canRead(db, user, db.documents[0]), true);
  assert.equal(access.canRead(db, user, db.documents[1]), false);
  db.departmentAuthorizations.prod = [];
  assert.equal(access.canRead(db, user, db.documents[0]), false);
  assert.equal(access.canRead(db, admin, db.documents[0]), true);
});

test('akun/departemen/kategori/pengaturan yang tidak ada ditolak', () => {
  const db = database();
  assert.equal(access.canRead(db, null, db.documents[0]), false);
  assert.equal(access.canRead(db, { ...user, departmentId: 'unknown' }, db.documents[0]), false);
  assert.equal(access.canRead(db, user, { categoryId: 'unknown' }), false);
  delete db.departmentAuthorizations.prod;
  assert.equal(access.canRead(db, user, db.documents[0]), false);
  assert.equal(access.canRead(db, admin, null), false);
});

test('migrasi mempertahankan dokumen dan hanya memberi kategori lama pada departemen lama', () => {
  const db = { departments: [{ id: 'prod' }], documents: [{ id: 'existing', title: 'Lama' }] };
  access.migrate(db);
  assert.equal(db.documents[0].id, 'existing');
  assert.equal(db.documents[0].categoryId, 'legacy-uncategorized');
  assert.deepEqual(db.departmentAuthorizations.prod, ['legacy-uncategorized']);
  for (const code of ['OM-PR2-ASY', 'OM-PR2-CHG', 'OM-PR1-CST', 'OM-PR1-LPP', 'OM-PR1-FRM']) assert.ok(db.documentCategories.some(category => category.code === code));
  const migrated = structuredClone(db);
  access.migrate(db);
  assert.deepEqual(db, migrated);
  db.departments.push({ id: 'new' });
  access.migrate(db);
  assert.equal(access.canRead(db, { ...user, departmentId: 'new' }, db.documents[0]), false);
});

test('migrasi tidak menimpa otorisasi kosong atau mengizinkan kategori tidak dikenal', () => {
  const db = database();
  access.migrate(db);
  assert.deepEqual(db.departmentAuthorizations.qa, []);
  assert.equal(access.canAssign(db, user, 'casting'), false);
  assert.equal(access.canAssign(db, admin, 'missing'), false);
  assert.equal(access.canAssign(db, user, 'assembly'), true);
});

test('marker migrasi mencegah pemberian izin ulang bila pengaturan hilang', () => {
  const db = { departments: [{ id: 'prod' }], documents: [{ id: 'old' }] };
  access.migrate(db);
  delete db.departmentAuthorizations;
  access.migrate(db);
  assert.deepEqual(db.departmentAuthorizations.prod, []);
  assert.equal(access.canRead(db, user, db.documents[0]), false);
  delete db.documents[0].categoryId;
  access.migrate(db);
  assert.equal(db.documents[0].categoryId, undefined);
});

test('salin izin ke banyak departemen mengganti izin dan tidak berbagi array', () => {
  const db = database();
  access.copyAuthorizations(db, admin, 'prod', ['qa', 'eng']);
  assert.deepEqual(db.departmentAuthorizations.qa, ['assembly']);
  assert.deepEqual(db.departmentAuthorizations.eng, ['assembly']);
  db.departmentAuthorizations.prod.push('casting');
  assert.deepEqual(db.departmentAuthorizations.qa, ['assembly']);
  db.departmentAuthorizations.prod = [];
  access.copyAuthorizations(db, admin, 'prod', ['qa']);
  assert.deepEqual(db.departmentAuthorizations.qa, []);
});

test('salin tidak diizinkan untuk user, tujuan palsu, sumber sendiri, atau tanpa tujuan', () => {
  for (const [actor, source, targets] of [[user, 'prod', ['qa']], [admin, 'missing', ['qa']], [admin, 'prod', ['missing']], [admin, 'prod', ['prod']], [admin, 'prod', []]]) {
    const db = database();
    const original = structuredClone(db);
    assert.throws(() => access.copyAuthorizations(db, actor, source, targets));
    assert.deepEqual(db, original);
  }
});
