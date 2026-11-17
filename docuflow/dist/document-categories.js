'use strict';
(function(root) {
  const usedTypeNames = (db,id) => [...new Set([...(db.documents || []), ...(db.documentRequests || [])].filter(doc => doc.categoryId === id).map(doc => doc.type).filter(Boolean))];
  function migrate(db) {
    let changed=false;
    for (const category of db.documentCategories || []) {
      if (category.documentTypeId !== undefined) continue;
      const names=usedTypeNames(db,category.id), types=db.documentTypes || [];
      const type=names.length===1 ? types.find(type => type.name===names[0]) : names.length===0 ? types.find(type => type.prefix===category.code?.split('-')[0]) : null;
      category.documentTypeId=type?.id || null;changed=true;
    }
    return changed;
  }
  function matches(db,category,typeName) {
    return Boolean(category && (!category.documentTypeId || db.documentTypes.some(type => type.id===category.documentTypeId && type.name===typeName)));
  }
  function validateType(db,id,typeId) {
    if (!typeId) {
      const category=db.documentCategories.find(category => category.id===id);
      if (!category || category.documentTypeId) throw new Error('Pilih jenis dokumen untuk kategori ini.');
      return;
    }
    const type=db.documentTypes.find(type => type.id===typeId);
    if (!type) throw new Error('Jenis dokumen tidak valid.');
    if (usedTypeNames(db,id).some(name => name!==type.name)) throw new Error('Kategori masih digunakan oleh jenis dokumen lain. Pilih jenis yang sesuai dengan dokumen dan permintaannya.');
  }
  const api={migrate,matches,validateType,usedTypeNames};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DocumentCategories=api;
})(globalThis);
