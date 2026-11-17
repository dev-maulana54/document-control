'use strict';
(function(root){
  const marker='docuflow.clean-start.2026-11-16';
  function database(previous,fallback){
    const admin={...(previous?.users?.find(user=>user.role==='admin')||fallback.users.find(user=>user.role==='admin'))};
    const department={...(previous?.departments?.find(item=>item.id===admin.departmentId)||fallback.departments[0])};
    const section={...(previous?.sections?.find(item=>item.id===admin.sectionId&&item.departmentId===department.id)||fallback.sections.find(item=>item.departmentId===department.id)||{id:'admin-section',name:'Document Control',departmentId:department.id})};
    admin.departmentId=department.id;admin.sectionId=section.id;
    return {version:1,users:[admin],departments:[department],sections:[section],documents:[],documentTypes:[],documentCategories:[],documentTemplates:[],documentRequests:[],activities:[],notifications:[],departmentAuthorizations:{},documentAccessVersion:1,requestWorkflowVersion:1};
  }
  async function run(storage,files,seed){
    if(storage.getItem(marker)==='done')return false;
    let previous;try{previous=JSON.parse(storage.getItem('docuflow.database.v1'));}catch{previous=null;}
    const next=database(previous,seed());
    await files.clear();
    storage.setItem('docuflow.database.v1',JSON.stringify(next));
    storage.removeItem('docuflow.session.v1');
    storage.setItem(marker,'done');return true;
  }
  const api={database,run};if(typeof module==='object'&&module.exports)module.exports=api;else root.CleanStart=api;
})(globalThis);
