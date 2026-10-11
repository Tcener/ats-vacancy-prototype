/* Новые кандидаты и их процессы хранятся только в браузере пользователя. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.CreationStore=model;})(typeof window==='object'?window:globalThis,()=>{
  const KEY='sobesso-created-candidates-v1', clone=value=>JSON.parse(JSON.stringify(value));
  let memory=null;
  const fold=value=>String(value||'').trim().toLocaleLowerCase('ru');
  const allowed=s=>s&&typeof s.id==='string'&&!!s.id.trim()&&typeof s.label==='string'&&!!s.label.trim()&&!s.terminal&&s.enabled!==false&&s.disabled!==true&&!['выход','отказ'].includes(fold(s.label))&&!['rejected','refused','exit','hired','outcome'].includes(fold(s.id));
  const defaultStorage=()=>typeof localStorage==='object'?localStorage:null;
  function commit(db,storage){let persisted=false;try{storage?.setItem(KEY,JSON.stringify(db));persisted=!!storage;}catch{}memory=db;return persisted;}
  function valid(record){return record && /^local-candidate-[a-z0-9-]+$/i.test(record.candidate?.id||'') && typeof record.candidate.name==='string' && /^[a-z0-9-]+$/i.test(record.vacancyId||'') && typeof record.stageId==='string' && typeof record.stage==='string';}
  function read(storage=typeof localStorage==='object'?localStorage:null){
    if(memory)return clone(memory);
    try {const parsed=JSON.parse(storage?.getItem(KEY)); return parsed&&Array.isArray(parsed.records)?{records:parsed.records.filter(valid),activeId:parsed.activeId||''}:{records:[],activeId:''};}catch{return {records:[],activeId:''};}
  }
  function add(candidate,assignment,catalog,storage=typeof localStorage==='object'?localStorage:null){
    const vacancy=Array.isArray(catalog)&&catalog.find(v=>v?.id===assignment?.vacancyId),stage=Array.isArray(vacancy?.stages)&&vacancy.stages.find(s=>s?.id===assignment?.stageId&&allowed(s));
    if(!stage||typeof vacancy?.id!=='string'||!/^[a-z0-9-]+$/i.test(vacancy.id)||!/^local-candidate-[a-z0-9-]+$/i.test(candidate?.id||'')||typeof candidate?.name!=='string'||!candidate.name.trim())return {ok:false,error:'Проверьте кандидата, вакансию и этап.'};
    const db=read(storage); if(db.records.some(r=>r.candidate.id===candidate.id))return {ok:false,error:'Этот кандидат уже добавлен.'};
    const profile=clone(candidate); profile.createdLocally=true;
    profile.processes=[{id:`${profile.id}-${vacancy.id}`,vacancyId:vacancy.id,vacancyName:vacancy.title,stageId:stage.id,stage:stage.label,status:'active',resumeId:profile.resumes?.[0]?.id||null,createdAt:new Date().toISOString()}];
    const record={candidate:profile,vacancyId:vacancy.id,vacancyName:vacancy.title,stageId:stage.id,stage:stage.label};
    db.records.push(record);db.activeId=profile.id;
    return {ok:true,persisted:commit(db,storage),record:clone(record)};
  }
  function assign(candidateId,process,catalog=typeof ATSPrototype==='object'?ATSPrototype.catalog?.():[],storage=defaultStorage()){
    const db=read(storage),existing=db.records.find(r=>r.candidate.id===candidateId);
    const vacancy=Array.isArray(catalog)&&catalog.find(v=>v?.id===process?.vacancyId);
    const stage=Array.isArray(vacancy?.stages)&&vacancy.stages.find(s=>allowed(s)&&(process?.stageId?s.id===process.stageId:s.label===process?.stage));
    const resume=Array.isArray(existing?.candidate.resumes)&&existing.candidate.resumes.find(r=>r?.id===process?.resumeId&&r.candidateId===candidateId);
    if(!existing||!stage||!resume||!Array.isArray(existing.candidate.processes)||existing.candidate.processes.some(p=>!p||typeof p!=='object')||!/^[a-z0-9-]+$/i.test(vacancy?.id||'')||(process.stage&&process.stage!==stage.label))return {ok:false,error:'Проверьте кандидата, собственное резюме и этап вакансии.'};
    if(db.records.some(r=>r.candidate.id===candidateId&&r.vacancyId===vacancy.id))return {ok:false,error:'Кандидат уже добавлен на эту вакансию.'};
    const profile=clone(existing.candidate),link={id:`${candidateId}-${vacancy.id}`,vacancyId:vacancy.id,vacancyName:vacancy.title,stageId:stage.id,stage:stage.label,status:'active',resumeId:resume.id,createdAt:new Date().toISOString()};
    profile.processes=[...(profile.processes||[]),link];
    db.records.filter(r=>r.candidate.id===candidateId).forEach(r=>{r.candidate=clone(profile);});
    const record={candidate:profile,vacancyId:vacancy.id,vacancyName:vacancy.title,stageId:stage.id,stage:stage.label};
    db.records.push(record);db.activeId=candidateId;
    return {ok:true,persisted:commit(db,storage),record:clone(record)};
  }
  function updateStage(candidateId,assignment,catalog=typeof ATSPrototype==='object'?ATSPrototype.catalog?.():[],storage=defaultStorage()){
    const error=()=>({ok:false,error:'Проверьте собственный процесс кандидата и доступный этап вакансии.'});
    const vacancy=Array.isArray(catalog)&&catalog.find(v=>v?.id===assignment?.vacancyId);
    const stage=Array.isArray(vacancy?.stages)&&vacancy.stages.find(s=>s?.id===assignment?.stageId&&typeof s.id==='string'&&!!s.id.trim()&&typeof s.label==='string'&&!!s.label.trim()&&s.enabled!==false&&s.disabled!==true);
    if(!/^local-candidate-[a-z0-9-]+$/i.test(candidateId||'')||!/^[a-z0-9-]+$/i.test(vacancy?.id||'')||!stage)return error();
    const db=read(storage),rows=db.records.filter(r=>r.candidate.id===candidateId),target=rows.find(r=>r.vacancyId===vacancy.id);
    if(!target||rows.filter(r=>r.vacancyId===vacancy.id).length!==1)return error();
    const profile=target.candidate;
    function ownProfile(person){
      if(person?.id!==candidateId||person.createdLocally!==true||typeof person.name!=='string'||!person.name.trim()||!Array.isArray(person.resumes)||!Array.isArray(person.processes))return false;
      if(person.resumes.some(r=>!r||typeof r!=='object'||Array.isArray(r)||typeof r.id!=='string'||!r.id.trim()||r.candidateId!==candidateId))return false;
      const resumeIds=new Set(person.resumes.map(r=>r.id));
      if(resumeIds.size!==person.resumes.length||person.processes.some(p=>!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string'||!p.id.trim()||!/^[a-z0-9-]+$/i.test(p.vacancyId||'')||typeof p.stageId!=='string'||!p.stageId.trim()||typeof p.stage!=='string'||!p.stage.trim()||typeof p.status!=='string'||!p.status.trim()||!resumeIds.has(p.resumeId)))return false;
      return new Set(person.processes.map(p=>p.vacancyId)).size===person.processes.length;
    }
    if(!ownProfile(profile)||rows.length!==profile.processes.length||new Set(rows.map(r=>r.vacancyId)).size!==rows.length)return error();
    const links=JSON.stringify(profile.processes);
    if(rows.some(r=>!ownProfile(r.candidate)||JSON.stringify(r.candidate.processes)!==links||!profile.processes.some(p=>p.vacancyId===r.vacancyId&&p.stageId===r.stageId&&p.stage===r.stage)))return error();
    const updated=clone(profile),link=updated.processes.find(p=>p.vacancyId===vacancy.id);
    if(!link)return error();
    link.stageId=stage.id;link.stage=stage.label;
    link.status=stage.terminal||['выход','отказ'].includes(fold(stage.label))||['rejected','refused','exit','hired','outcome'].includes(fold(stage.id))?'closed':'active';
    for(const row of rows){row.candidate=clone(updated);if(row.vacancyId===vacancy.id){row.stageId=stage.id;row.stage=stage.label;}}
    return {ok:true,persisted:commit(db,storage),record:clone(target)};
  }
  function forRoute(route){const db=read(),vacancyId=/^vacancy\/([^/]+)$/.exec(route)?.[1];if(!vacancyId)return null;return db.records.find(r=>r.vacancyId===vacancyId&&r.candidate.id===db.activeId)||db.records.find(r=>r.vacancyId===vacancyId)||null;}
  function select(id,vacancyOrStorage,storage=defaultStorage()){const vacancyId=typeof vacancyOrStorage==='string'?vacancyOrStorage:null;if(vacancyOrStorage&&typeof vacancyOrStorage==='object')storage=vacancyOrStorage;const db=read(storage);if(!db.records.some(r=>r.candidate.id===id&&(!vacancyId||r.vacancyId===vacancyId)))return false;db.activeId=id;commit(db,storage);return true;}
  function records(vacancyId){return read().records.filter(r=>r.vacancyId===vacancyId);}
  function clearSelection(storage=typeof localStorage==='object'?localStorage:null){const db=read(storage);db.activeId='';memory=db;try{storage?.setItem(KEY,JSON.stringify(db));}catch{}}
  return {KEY,read,add,assign,updateStage,forRoute,select,clearSelection,records};
});
