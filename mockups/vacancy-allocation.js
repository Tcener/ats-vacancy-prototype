/* Распределение вакансии: только локальное назначение участников.
   Воронка, ИИ-настройки, заявка и её одобренные данные не переписываются. */
(function(host,factory){const api=factory(host);if(typeof module==='object'&&module.exports)module.exports=api;else host.VacancyAllocation=api;})(typeof window==='object'?window:globalThis,host=>{
  'use strict';
  const KEY='sobesso-vacancy-allocations-v1',clone=x=>JSON.parse(JSON.stringify(x));
  const USERS=Object.freeze([
    {id:'u1',name:'Ирина Николаева',role:'Администратор',recruiter:true},
    {id:'u2',name:'Антон Беляев',role:'Руководитель рекрутмента',recruiter:true},
    {id:'u3',name:'Елена Крылова',role:'Рекрутер',recruiter:true},
    {id:'u4',name:'Алексей Мельников',role:'Нанимающий менеджер',recruiter:false}
  ].map(Object.freeze));
  const FUNCTIONS=['Нанимающий менеджер','Интервьюер'];
  const safeId=id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
  const storage=()=>{try{return host.localStorage;}catch{return null;}};
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validate(vacancy,values){
    const errors=[];
    if(!safeId(vacancy?.id))return ['Вакансия не найдена.'];
    if(!USERS.some(u=>u.id===values?.recruiterId&&u.recruiter))errors.push('Выберите ответственного рекрутера.');
    if(typeof values?.department!=='string'||!values.department.trim()||values.department.trim().length>200)errors.push('Укажите подразделение-заказчик (до 200 символов).');
    if(typeof vacancy.department==='string'&&vacancy.department.trim()&&typeof values?.department==='string'&&values.department.trim()!==vacancy.department.trim())errors.push('Подразделение уже задано. Изменить его можно в настройках вакансии.');
    if(!Array.isArray(vacancy?.stages)||!vacancy.stages.length||vacancy.stages.some(s=>!safeId(s?.id)||typeof (s.label||s.name)!=='string'||!(s.label||s.name).trim())||new Set(vacancy.stages.map(s=>s.id)).size!==vacancy.stages.length)errors.push('У вакансии должна быть действующая воронка. Выберите её в настройках вакансии.');
    const team=values?.hiringTeam;
    if(!Array.isArray(team)||team.length>USERS.length||team.some(p=>!USERS.some(u=>u.id===p?.userId)||!FUNCTIONS.includes(p?.function))||new Set(team.map(p=>p?.userId)).size!==team.length)errors.push('Проверьте участников нанимающей команды.');
    return errors;
  }
  function read(store=storage()){
    try{
      const raw=JSON.parse(store?.getItem(KEY));if(!raw||Array.isArray(raw)||typeof raw!=='object')return {};
      return Object.fromEntries(Object.entries(raw).filter(([id,v])=>safeId(id)&&v?.id===id&&v.status==='в работе'&&typeof v.startedAt==='string'&&!Number.isNaN(Date.parse(v.startedAt))&&Array.isArray(v.participants)&&v.participants.every(p=>USERS.some(u=>u.id===p?.userId)&&Array.isArray(p.functions)&&p.functions.every(f=>['Рекрутер',...FUNCTIONS].includes(f?.function)))&&!validate({id,stages:[{id:'checked',label:'Проверено'}]},v).length).map(([id,v])=>{
        const recruiter=USERS.find(u=>u.id===v.recruiterId),team=clone(v.hiringTeam),by='u2';
        // Белый список: даже повреждённое локальное назначение не может
        // заменить воронку, исходную заявку или поля её одобренной версии.
        const participants=[...new Set([recruiter.id,...team.map(p=>p.userId)])].map(userId=>{
          const u=USERS.find(u=>u.id===userId),functions=[];
          if(userId===recruiter.id)functions.push({function:'Рекрутер',main:true,startedAt:v.startedAt,source:'Распределение вакансии',author:by});
          const member=team.find(p=>p.userId===userId);if(member)functions.push({function:member.function,main:false,startedAt:v.startedAt,source:'Распределение вакансии',author:by});
          return {userId,name:u.name,startedAt:v.startedAt,function:functions.map(f=>f.function).join(' · '),functions};
        });
        return [id,{id,status:'в работе',department:v.department.trim(),recruiterId:recruiter.id,recruiter:recruiter.name,hiringTeam:team,participants,startedAt:v.startedAt,allocationHistory:[{at:v.startedAt,by,action:'Вакансия распределена',recruiterId:recruiter.id,hiringTeam:team}]}];
      }));
    }catch{return {};}
  }
  function save(vacancy,values,options={}){
    const errors=validate(vacancy,values);if(errors.length)return {ok:false,errors};
    const store=options.storage??storage(),db=read(store);
    // Повтор того же завершённого распределения не создаёт новые события.
    if(Object.hasOwn(db,vacancy.id))return {ok:true,persisted:true,alreadyAssigned:true,record:clone(db[vacancy.id])};
    if(vacancy.status!=='на распределении')return {ok:false,errors:['Эта вакансия уже распределена. Обновите страницу.']};
    const at=options.now??new Date().toISOString();if(typeof at!=='string'||Number.isNaN(Date.parse(at)))return {ok:false,errors:['Не удалось определить время назначения.']};
    const recruiter=USERS.find(u=>u.id===values.recruiterId),team=clone(values.hiringTeam),by=options.author||'u2';
    const participants=[...new Set([recruiter.id,...team.map(p=>p.userId)])].map(userId=>{
      const u=USERS.find(u=>u.id===userId),functions=[];
      if(userId===recruiter.id)functions.push({function:'Рекрутер',main:true,startedAt:at,source:'Распределение вакансии',author:by});
      const member=team.find(p=>p.userId===userId);if(member)functions.push({function:member.function,main:false,startedAt:at,source:'Распределение вакансии',author:by});
      return {userId,name:u.name,startedAt:at,function:functions.map(f=>f.function).join(' · '),functions};
    });
    const department=typeof vacancy.department==='string'&&vacancy.department.trim()?vacancy.department.trim():values.department.trim();
    const record={id:vacancy.id,status:'в работе',department,recruiterId:recruiter.id,recruiter:recruiter.name,hiringTeam:team,participants,startedAt:at,allocationHistory:[{at,by,action:'Вакансия распределена',recruiterId:recruiter.id,hiringTeam:team}]};
    try{if(!store)throw Error('storage');store.setItem(KEY,JSON.stringify({...db,[vacancy.id]:record}));}catch{return {ok:false,errors:['Не удалось сохранить назначение в браузере. Поля оставлены — попробуйте ещё раз.']};}
    return {ok:true,persisted:true,record:clone(record)};
  }
  function hydrate(vacancies,store=storage()){
    for(const [id,record] of Object.entries(read(store)))if(Object.hasOwn(vacancies,id))Object.assign(vacancies[id],clone(record));
    return vacancies;
  }
  function render(vacancy){
    const selected=vacancy.proposedRecruiterId||vacancy.recruiterId||'';
    const hasDepartment=typeof vacancy.department==='string'&&!!vacancy.department.trim();
    return `<form class="va-form" novalidate><header class="va-head"><span class="va-icon" aria-hidden="true">↗</span><div><span class="va-eyebrow">На распределении</span><h2 id="va-title">Распределить вакансию</h2><p id="va-context">${esc(vacancy.title||vacancy.name)}${vacancy.sourceRequisition?' · '+esc(vacancy.sourceRequisition):''}</p></div><button type="button" class="va-dismiss" data-va-close aria-label="Закрыть распределение">×</button></header>
      <div class="va-body"><div class="va-grid"><label class="va-field"><span>Ответственный рекрутер <b>*</b></span><select name="recruiterId" required><option value="">Выберите рекрутера</option>${USERS.filter(u=>u.recruiter).map(u=>`<option value="${u.id}"${u.id===selected?' selected':''}>${esc(u.name)}</option>`).join('')}</select></label><label class="va-field"><span>Подразделение-заказчик <b>*</b></span><input name="department" required maxlength="200" value="${esc(vacancy.department)}" placeholder="Например, Mobile"${hasDepartment?' readonly aria-describedby="va-department-note"':''}>${hasDepartment?'<small id="va-department-note">Изменить можно в настройках вакансии.</small>':''}</label></div>
      <section class="va-team"><div class="va-section-head"><h3>Нанимающая команда</h3><span>Необязательно</span></div><p>Выберите участников и их функции. Назначение не меняет ролевые права.</p><div class="va-team-list">${USERS.map(u=>`<div class="va-team-row"><label><input type="checkbox" data-va-member="${u.id}"><span><strong>${esc(u.name)}</strong><small>${esc(u.role)}</small></span></label><select data-va-function="${u.id}" aria-label="Функция ${esc(u.name)}" disabled>${FUNCTIONS.map(f=>`<option>${f}</option>`).join('')}</select></div>`).join('')}</div></section>
      <section class="va-ai"><span class="va-ai-badge">ИИ</span><div><h3>Настроить воронку следующим шагом</h3><p>После назначения можно открыть ИИ-модули и автоматизации этой вакансии. Ничего не включится автоматически.</p><small>${esc(vacancy.funnelName||'Действующая воронка')} · ${vacancy.stages?.length||0} этапов</small></div></section><div class="va-errors" role="alert" hidden></div></div>
      <footer class="va-footer"><button type="button" class="va-button" data-va-close>Отмена</button><div><button type="submit" class="va-button" data-va-save="assign">Назначить</button><button type="submit" class="va-button va-primary" data-va-save="configure">Назначить и настроить ИИ</button></div></footer></form>`;
  }
  let current=null;
  function close(){current?.close?.();}
  function open(vacancy,options={}){
    if(!host.document?.createElement||!vacancy)return false;close();
    const doc=host.document,trigger=doc.activeElement,dialog=doc.createElement('dialog');dialog.id='vacancy-allocation-dialog';dialog.className='vacancy-allocation-dialog';dialog.setAttribute('aria-labelledby','va-title');dialog.setAttribute('aria-describedby','va-context');dialog.setAttribute('data-antd','none');dialog.innerHTML=render(vacancy);doc.body.append(dialog);
    const finish=()=>{dialog.remove();if(current===controller)current=null;if(trigger?.isConnected)trigger.focus?.();};
    const controller={close:()=>{if(dialog.open)dialog.close();else finish();},dialog};current=controller;
    dialog.addEventListener('close',finish,{once:true});dialog.addEventListener('click',e=>{if(e.target.closest('[data-va-close]')){e.preventDefault();controller.close();}if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)controller.close();}});
    dialog.addEventListener('change',e=>{if(e.target.dataset.vaMember)dialog.querySelector(`[data-va-function="${e.target.dataset.vaMember}"]`).disabled=!e.target.checked;});
    let busy=false;
    dialog.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;
      const values={recruiterId:dialog.querySelector('[name="recruiterId"]').value,department:dialog.querySelector('[name="department"]').value,hiringTeam:[...dialog.querySelectorAll('[data-va-member]:checked')].map(input=>({userId:input.dataset.vaMember,function:dialog.querySelector(`[data-va-function="${input.dataset.vaMember}"]`).value}))};
      const box=dialog.querySelector('.va-errors'),errors=validate(vacancy,values),configure=e.submitter?.dataset.vaSave==='configure';
      const show=messages=>{box.hidden=!messages.length;box.innerHTML=messages.map(x=>`<p>${esc(x)}</p>`).join('');if(messages.length)box.scrollIntoView({block:'nearest'});};
      if(errors.length){show(errors);return;}
      busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{const result=await options.onAssign?.(clone(values));if(!result?.ok){show(result?.errors||['Назначение сейчас недоступно. Попробуйте ещё раз.']);return;}controller.close();options.onAssigned?.(result,{configure});}catch{show(['Не удалось завершить назначение. Проверьте вакансию и повторите.']);}finally{busy=false;if(dialog.isConnected)dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
    });
    dialog.showModal();dialog.querySelector('[name="recruiterId"]').focus();return controller;
  }
  return {KEY,validate,read,save,hydrate,render,open,close,users:()=>clone(USERS),functions:()=>FUNCTIONS.slice()};
});
