'use strict';

(function (root) {
  const legacyId = 'legacy-uncategorized';
  function defaultCategories() {
    return [{ id: legacyId, code: 'LEGACY', name: 'Belum Dikategorikan' }, ...['OM-PR2-ASY', 'OM-PR2-CHG', 'OM-PR1-CST', 'OM-PR1-LPP', 'OM-PR1-FRM'].map(code => ({ id: code.toLowerCase(), code, name: code }))];
  }

  function migrate(db) {
    let changed = false;
    const legacyUpgrade = db.documentAccessVersion === undefined && db.documentCategories === undefined;
    if (db.documentCategories === undefined) { db.documentCategories = defaultCategories(); changed = true; }
    if (!Array.isArray(db.documentCategories)) throw new Error('Format kategori dokumen tidak sesuai.');
    if (db.departmentAuthorizations === undefined) {
      db.departmentAuthorizations = Object.fromEntries(db.departments.map(department => [department.id, legacyUpgrade ? [legacyId] : []]));
      changed = true;
    }
    if (!db.departmentAuthorizations || Array.isArray(db.departmentAuthorizations) || typeof db.departmentAuthorizations !== 'object') throw new Error('Format otorisasi departemen tidak sesuai.');
    if (legacyUpgrade) db.documents.forEach(doc => { if (!doc.categoryId) { doc.categoryId = legacyId; changed = true; } });
    if (db.documentAccessVersion === undefined) { db.documentAccessVersion = 1; changed = true; }
    return changed;
  }

  function allowedCategoryIds(db, user) {
    if (!user || !db.departments.some(department => department.id === user.departmentId)) return [];
    const categories = db.documentCategories || [];
    if (user.role === 'admin') return categories.map(category => category.id);
    if (user.role !== 'user') return [];
    const grants = Object.hasOwn(db.departmentAuthorizations || {}, user.departmentId) ? db.departmentAuthorizations[user.departmentId] : [];
    return Array.isArray(grants) ? categories.filter(category => grants.includes(category.id)).map(category => category.id) : [];
  }

  function canAssign(db, user, categoryId) {
    return allowedCategoryIds(db, user).includes(categoryId);
  }

  function canRead(db, user, doc) {
    return Boolean(user && doc && (user.role === 'admin' || canAssign(db, user, doc.categoryId)));
  }

  function copyAuthorizations(db, actor, sourceId, targetIds) {
    if (actor?.role !== 'admin') throw new Error('Hanya admin yang dapat menyalin otorisasi.');
    const ids = db.departments.map(department => department.id);
    if (!ids.includes(sourceId) || !Array.isArray(targetIds) || !targetIds.length || targetIds.some(id => !ids.includes(id) || id === sourceId)) throw new Error('Pilih departemen sumber dan tujuan yang berbeda.');
    const grants = allowedCategoryIds(db, { role: 'user', departmentId: sourceId });
    for (const id of new Set(targetIds)) db.departmentAuthorizations[id] = [...grants];
  }

  const api = { defaultCategories, migrate, allowedCategoryIds, canAssign, canRead, copyAuthorizations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DocumentAccess = api;
})(globalThis);
