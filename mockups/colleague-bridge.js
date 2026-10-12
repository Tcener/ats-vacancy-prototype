/* Связь импортированных экранов с общей навигацией. Данные остаются в этом браузере. */
(function (host, factory) {
  const api = factory(host);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else host.ColleagueBridge = api;
})(typeof window !== 'undefined' ? window : globalThis, function (host) {
  'use strict';
  const KEY = 'sobesso-colleague-workspace-v1';
  const BAD = new Set(['__proto__', 'prototype', 'constructor']);
  const STATE_LIMIT = 1500000;
  let memory = {}, active = null, roster = [], routeSyncDepth = 0;
  const clone = x => JSON.parse(JSON.stringify(x));
  const text = x => String(x == null ? '' : x);
  function storage() { try { return host.localStorage; } catch (_) { return null; } }
  function plain(value, depth = 0) {
    if (depth > 18) return null;
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') return value.slice(0, 200000);
    if (Array.isArray(value)) return value.slice(0, 2000).map(x => plain(x, depth + 1));
    if (typeof value !== 'object') return null;
    const out = {};
    Object.keys(value).slice(0, 1000).forEach(k => { if (!BAD.has(k)) out[k] = plain(value[k], depth + 1); });
    return out;
  }
  function read() {
    try {
      const raw = storage()?.getItem(KEY);
      if (raw && raw.length <= STATE_LIMIT) { const parsed = JSON.parse(raw); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') memory = plain(parsed); }
    } catch (_) {}
    return clone(memory);
  }
  function persist(state) {
    memory = plain(state || {});
    try { const raw = JSON.stringify(memory); if (raw.length <= STATE_LIMIT) storage()?.setItem(KEY, raw); } catch (_) {}
    return clone(memory);
  }
  function parentAPI() { try { return host.parent?.ATSPrototype || host.ATSPrototype || null; } catch (_) { return null; } }
  function routeNow() { try { return text(host.parent?.location?.hash || host.location?.hash).replace(/^#/, '') || 'dashboard'; } catch (_) { return 'dashboard'; } }
  function catalog() { try { const v = parentAPI()?.catalog?.(); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
  function homeVacancies(original) {
    const vacancies=catalog(),rows=(original || []).map(row=>{const r=row.slice(),v=vacancies.find(v=>!v.createdLocally&&(v.title||v.name)===r[0]);if(v){r[13]=v.id;if(v.status){r[4]=v.status==='на распределении'?'assign':v.status==='на паузе'?'pause':'work';r[3]=v.recruiter||'—';r[1]=v.department||r[1];}}return r;}),known=new Set(rows.map(row=>row[13]).filter(Boolean)),titles=new Set(rows.map(row=>row[0]));
    vacancies.forEach(v=>{const title=v.title || v.name;if(!title || known.has(v.id)||(!v.createdLocally&&titles.has(title)))return;known.add(v.id);const date=new Date(v.createdAt || Date.now()),start=Number.isNaN(date.getTime())?'11.10':String(date.getDate()).padStart(2,'0')+'.'+String(date.getMonth()+1).padStart(2,'0');rows.push([title,v.department || 'Не указано',v.grade || 'Middle',v.recruiter || '—',v.status==='на распределении'?'assign':v.status==='на паузе'?'pause':v.recruiter && v.recruiter!=='Не назначен'?'work':'assign',Number(v.positions)||0,Number(v.hires)||0,0,Number(v.candidateCount)||0,Number(v.priority)||2,Number(v.progress)||0,Number(v.slaLeft)||0,start,v.id]);});
    return rows;
  }
  const DEFAULT_STAGES = ['Отклик','Новый кандидат','Скоринг','Чат-бот','HR интервью','Техническое интервью','Финальное интервью','Оффер','Выход','Отказ'];
  const STAGE_ALIASES = {'новые':'Новый кандидат','скрининг':'Скоринг','скоринг резюме':'Скоринг','техническое собеседование':'Техническое интервью','оценка заказчиком':'Финальное интервью','интервью с заказчиком':'Финальное интервью','выход на работу':'Выход','ожидание выхода':'Выход','hr-интервью':'HR интервью'};
  function candidateStages(self) {
    const ctx=self.__bridgeContext || context();
    const labels=ctx.pipeline?.length ? ctx.pipeline.filter(s=>s.enabled!==false && s.disabled!==true).map(s=>s.label || s.name).filter(Boolean) : DEFAULT_STAGES;
    const canonical=labels.map(label=>DEFAULT_STAGES.find(x=>x.toLocaleLowerCase('ru')===text(label).toLocaleLowerCase('ru')) || label);
    return canonical.filter((label,i)=>canonical.indexOf(label)===i);
  }
  // Старые события не переписываются: совместимое название меняется только при показе.
  function normalizeStage(label,self) {
    const value=text(label).trim(),labels=candidateStages(self);
    if(labels.includes(value))return value;
    const folded=value.toLocaleLowerCase('ru'),same=labels.find(x=>text(x).toLocaleLowerCase('ru')===folded);
    if(same)return same;
    const target=STAGE_ALIASES[folded];return target && labels.includes(target) ? target : value;
  }
  function funnelScope(self,ctx=self.__bridgeContext || context()) {
    const s=self.state || {},saved=s.bridgeFunnelScopes?.[ctx.vacancyId];
    if(saved)return saved;
    return {moved:!s.bridgeVacancyId || s.bridgeVacancyId===ctx.vacancyId ? s.cMoved || {} : {},previousMoved:s.cPrevMoved || null,msg:s.cMsg || '',selected:s.cSel || [],filter:''};
  }
  function saveFunnelScope(self,ctx,change,patch={}) {
    const s=self.state || {},value=Object.assign({},funnelScope(self,ctx),change);
    self.setState(Object.assign({},patch,{bridgeFunnelScopes:Object.assign({},s.bridgeFunnelScopes || {},{[ctx.vacancyId]:value})}));
  }
  function seedStage(self,index,ctx=self.__bridgeContext || context()) {
    const s=self.state || {},key=ctx.vacancyId+':seed-'+index,moved=funnelScope(self,ctx).moved || {};
    if(Object.prototype.hasOwnProperty.call(moved,index))return normalizeStage(moved[index],self);
    const events=s.bridgeCandidateKey===key ? s.extra : s.__candidateStates?.[key]?.extra;
    const latest=(events || []).filter(e=>e.k==='stage').slice(-1)[0]?.to;
    if(latest)return normalizeStage(latest,self);
    const initial=normalizeStage((!ctx.candidate && ctx.stage) || 'Техническое интервью',self),labels=candidateStages(self);
    if(labels.includes(initial))return initial;
    // Начальный этап синтетического демо должен существовать и в иной воронке.
    const first=(ctx.pipeline || []).find(stage=>stage.enabled!==false && stage.disabled!==true && !stage.terminal);
    return normalizeStage(first?.label || first?.name || labels[0] || initial,self);
  }
  function currentStage(self) {
    const ctx=self.__bridgeContext || context(),s=self.state || {};
    if(!ctx.candidate)return seedStage(self,s.bridgeCandidateIndex || 0,ctx);
    const process=(ctx.candidate.processes || []).find(x=>x.vacancyId===ctx.vacancyId);
    const latest=(s.extra || []).filter(e=>e.k==='stage').slice(-1)[0]?.to;
    return normalizeStage(latest || process?.stage || ctx.stage || 'Техническое интервью',self);
  }
  function context() {
    let ctx = null; try { ctx = parentAPI()?.candidateContext?.(); } catch (_) {}
    const m = /^vacancy\/([a-z0-9-]+)$/.exec(routeNow());
    const id = ctx?.vacancyId || m?.[1] || active?.state?.bridgeVacancyId || 'android';
    const v = catalog().find(v => v.id === id);
    return Object.assign({vacancyId:id, vacancyName:v?.title || v?.name || 'Senior Android-разработчик', pipeline:v?.stages || [], stage:'Техническое интервью', localCandidates:[]}, ctx || {});
  }
  const PAGE_ROUTES = {home:'dashboard', tasks:'tasks', req:'requisitions', analytics:'analytics'};
  function route(value, event) {
    event?.preventDefault?.();
    if (!/^(dashboard|home|tasks(?:\/legacy)?|requisitions(?:\/legacy)?|search|analytics|settings|calendar|messages|portfolio|create\/(candidate|vacancy|requisition|requisition-ai)|vacancy\/[a-z0-9-]+(?:\/edit)?)$/.test(text(value))) return false;
    if (value === 'home') value = 'dashboard';
    const api = parentAPI();
    if (api?.route) api.route(value);
    else { try { host.parent.location.hash = value; } catch (_) { host.location.hash = value; } }
    return true;
  }
  function pageForRoute(r) { if (r === 'dashboard' || r === 'home') return 'home'; if (r === 'tasks') return 'tasks'; if (/^(requisitions|create\/requisition)$/.test(r)) return 'req'; return 'cand'; }
  function initialState() {
    const s = read(), r = routeNow();
    s.page = pageForRoute(r);
    if (r === 'create/requisition') Object.assign(s, {rq_view:'tpl', rq_f:{}, rq_editId:null, rq_step:1, rq_files:[]});
    return s;
  }
  const SHARED_LIST_KEYS = new Set(['candQ','cSeen','cSel','cOnlyNew','cMoved','cPrevMoved','cMsg','cBulkDD','fltTags','fltSrc','fltAdd','fltOpen']);
  function candidateKeys(state) { return Object.keys(state).filter(k => !/^(__|h_|t_|rq_|bridge)/.test(k) && !['page','createOpen','menuOpen'].includes(k) && !SHARED_LIST_KEYS.has(k)); }
  function scopeKey(state, ctx = context()) { return ctx.vacancyId + ':' + (ctx.candidate?.id || ('seed-' + (state.bridgeCandidateIndex || 0))); }
  function switchScope(patch, state, key) {
    const bank = Object.assign({}, state.__candidateStates || {}), prev = state.bridgeCandidateKey;
    if (prev) { const saved = {}; candidateKeys(state).forEach(k => { saved[k] = state[k]; }); bank[prev] = saved; }
    const next = Object.assign({}, bank[key] || {});
    candidateKeys(state).forEach(k => { if (!(k in next)) next[k] = null; });
    if (!/:seed-0$/.test(key) && !bank[key]) Object.assign(next,{extra:[],tasks:[],dupLog:[],vacAdded:[],tagsOn:[],consOk:false,consSent:'',resV4:false});
    return Object.assign({}, next, patch, {bridgeCandidateKey:key,bridgeEditDraft:null,bridgeStageError:'',__candidateStates:bank});
  }
  function delayedState(self, patch, delay) {
    const key=self.state?.bridgeCandidateKey, timer=host.setTimeout || (typeof setTimeout==='function' ? setTimeout : null);
    if(!timer)return 0;
    return timer(()=>{const state=self.state || {},same=!key || state.bridgeCandidateKey===key,base=same?state:state.__candidateStates?.[key] || {},next=plain(patch);if(Array.isArray(next.extra)){const merged=(base.extra || []).slice(),known=new Set(merged.map(e=>JSON.stringify(e)));next.extra.forEach(e=>{const id=JSON.stringify(e);if(!known.has(id)){known.add(id);merged.push(e);}});next.extra=merged;}if(same)self.setState(next);else self.setState({__candidateStates:Object.assign({},state.__candidateStates || {},{[key]:Object.assign({},base,next)})});},delay);
  }
  function intercept(patch, state) {
    if (typeof patch === 'function') return s => intercept(patch(s), s);
    if (!patch || typeof patch !== 'object') return patch;
    patch = Object.assign({}, patch); state = state || {};
    if (!routeSyncDepth && patch.page && patch.page !== state.page) {
      const dest = patch.page === 'cand' ? 'vacancy/' + context().vacancyId : PAGE_ROUTES[patch.page];
      if (dest) { persist(Object.assign({}, state, patch)); route(dest); }
    }
    if ('bridgeCandidateIndex' in patch) {
      const i = Number(patch.bridgeCandidateIndex); patch.bridgeCandidateIndex = Number.isInteger(i) && i >= 0 && i < 17 ? i : 0;
      const ctx = Object.assign({}, context(), {candidate:null});
      const key = scopeKey(Object.assign({}, state, patch), ctx);
      if (key !== state.bridgeCandidateKey) patch = switchScope(patch, state, key);
    }
    // Изменённые значения берём из patch, не из ещё не обновлённого this.state:
    // React пакетирует массовый перевод и отмену, поэтому немедленное чтение устаревает.
    if (!('bridgeFunnelScopes' in patch) && ['cMoved','cPrevMoved','cMsg','cSel'].some(k=>k in patch)) {
      const ctx=context(),id=state.bridgeVacancyId || ctx.vacancyId,merged=Object.assign({},state,patch);
      const saved=state.bridgeFunnelScopes?.[id] || {};
      patch.bridgeFunnelScopes=Object.assign({},state.bridgeFunnelScopes || {},{[id]:Object.assign({},saved,{moved:merged.cMoved || {},previousMoved:merged.cPrevMoved || null,msg:merged.cMsg || '',selected:merged.cSel || []})});
    }
    return patch;
  }
  function connect(self) {
    active = self;
    const ctx = context(), r = routeNow(), key = scopeKey(self.state || {}, ctx);
    self.__bridgeContext = ctx;
    const patch = {};
    if (self.state?.page !== pageForRoute(r)) patch.page = pageForRoute(r);
    const previous=self.state?.bridgeVacancyId || ctx.vacancyId,scopes=Object.assign({},self.state?.bridgeFunnelScopes || {});
    scopes[previous]=Object.assign({},scopes[previous] || {},{moved:self.state?.cMoved || {},previousMoved:self.state?.cPrevMoved || null,msg:self.state?.cMsg || '',selected:self.state?.cSel || []});
    if (self.state?.bridgeVacancyId !== ctx.vacancyId) {
      const target=scopes[ctx.vacancyId] || {moved:{},previousMoved:null,msg:'',selected:[],filter:''};
      Object.assign(patch,{bridgeVacancyId:ctx.vacancyId,cMoved:target.moved || {},cPrevMoved:target.previousMoved || null,cMsg:target.msg || '',cSel:target.selected || [],cBulkDD:false});
      scopes[ctx.vacancyId]=target;
    }
    patch.bridgeFunnelScopes=scopes;
    if (/^vacancy\/[a-z0-9-]+$/.test(r) && self.state?.bridgeCandidateKey !== key) Object.assign(patch, switchScope({}, self.state || {}, key));
    if (r === 'create/requisition' && self.__bridgeRoute !== r) Object.assign(patch,{rq_view:'tpl',rq_f:{},rq_editId:null,rq_step:1,rq_files:[]});
    self.__bridgeRoute = r;
    if (Object.keys(patch).length) {
      // Родительский hash — источник маршрута. Его отражение в iframe не является
      // новым кликом пользователя и не должно перенаправлять родителя обратно.
      routeSyncDepth++;
      try { self.setState(patch); } finally { routeSyncDepth--; }
    }
    return ctx;
  }
  function captureRoster(doc) {
    const rows = Array.from(doc?.querySelectorAll?.('[data-colleague-candidate]') || []);
    if (!rows.length) return;
    roster = rows.slice(0, 17).map((row, index) => ({id:'colleague-' + index, name:row.querySelector('[data-colleague-name]')?.textContent?.trim() || '', position:row.querySelector('[data-colleague-position]')?.textContent?.trim() || '', company:row.querySelector('[data-colleague-company]')?.textContent?.trim() || '', photo:row.querySelector('img')?.getAttribute('src') || '', tags:[], source:'Демонстрационные данные'}));
  }
  function mount(self) {
    active = self; captureRoster(host.document); connect(self);
    const listener = () => connect(self);
    try { host.parent?.addEventListener?.('hashchange', listener); host.addEventListener?.('hashchange',listener); host.addEventListener?.('colleague-context-refresh',listener); } catch (_) {}
    self.__bridgeCleanup = () => { try { host.parent?.removeEventListener?.('hashchange',listener); host.removeEventListener?.('hashchange',listener); host.removeEventListener?.('colleague-context-refresh',listener); } catch (_) {} persist(self.state); };
    host.CreateMenu?.install?.(host.document,{navigate:route});
    return self.__bridgeCleanup;
  }
  function seeds() { try { const list = parentAPI()?.seedProfiles?.(); if (Array.isArray(list) && list.length) return list; } catch (_) {} return roster; }
  function profile(self) {
    const ctx = self.__bridgeContext || context(), s = self.state || {}, i = s.bridgeCandidateIndex || 0;
    const list = seeds(), base = ctx.candidate || list[i] || {id:'colleague-'+i,name:'Смирнов Алексей',position:'B2B Sales / Менеджер B2B продаж',company:'ДемоМобайл',tags:[],source:'Демонстрационные данные'};
    const bank = s.bridgeProfileEdits || {}, edit = bank[base.id] || {}, p = Object.assign({}, base, edit);
    p.name = edit.name || [edit.lastName || p.lastName, edit.firstName || p.firstName, edit.middleName || p.middleName].filter(Boolean).join(' ') || p.name;
    p.position = p.position || p.role || '';
    p.phone = p.contacts?.phone || p.phone || ''; p.email = p.contacts?.email || p.email || '';
    Object.keys(edit).forEach(k => {p[k] = edit[k];});
    const words = p.name.trim().split(/\s+/); p.lastName = edit.lastName ?? p.lastName ?? words[0] ?? ''; p.firstName = edit.firstName ?? p.firstName ?? words[1] ?? ''; p.middleName = edit.middleName ?? p.middleName ?? words.slice(2).join(' ');
    const process = (p.processes || []).find(x => x.vacancyId === ctx.vacancyId);
    const resume = (p.resumes || []).find(x => x.id === process?.resumeId) || p.resumes?.[0] || null;
    p.resume = resume; p.fullText = resume?.fullText || resume?.text || p.fullText || '';
    p.ageLabel = p.age ? text(p.age).replace(/\s*(года?|лет)$/, '') + ' лет' : 'Не указан';
    p.phoneLabel = p.phone || 'Не указан'; p.emailLabel = p.email || 'Не указана'; p.cityLabel = p.city || 'Не указан'; p.salaryLabel = p.salary || 'Не указана';
    p.workModeLabel = p.workMode || 'Не указан'; p.experienceLabel = p.experienceYears ? p.experienceYears + ' лет' : 'по резюме';
    p.stage = ctx.candidate ? normalizeStage(process?.stage || ctx.stage || 'Техническое интервью',self) : seedStage(self,i,ctx); p.vacancyName = ctx.vacancyName;
    p.primaryDemo = !ctx.candidate && i === 0;
    p.plain = !p.primaryDemo;
    p.tags = Array.isArray(p.tags) ? p.tags : [];
    ['lastName','firstName','middleName','position','company','phone','email','telegram','whatsapp','city','salary','workMode','relocation','age','language','referrer'].forEach(k => { p['on_' + k] = event => { const draft = Object.assign({}, self.state.bridgeEditDraft || edit, {[k]:text(event?.target?.value)}); if (/^(lastName|firstName|middleName)$/.test(k)) draft.name = [draft.lastName ?? p.lastName,draft.firstName ?? p.firstName,draft.middleName ?? p.middleName].filter(Boolean).join(' '); self.setState({bridgeEditDraft:draft}); }; p[k] = s.editing && s.bridgeEditDraft && k in s.bridgeEditDraft ? s.bridgeEditDraft[k] : p[k] || ''; });
    return p;
  }
  function rqSave(self, submit) {
    const s = self.state || {}, f = Object.assign({}, s.rq_f || {});
    const required = ['title','need','duties','reqs'];
    if (submit && required.some(k => !text(f[k]).trim())) return false;
    const added = (s.rq_added || []).slice(), over = Object.assign({}, s.rq_over || {});
    const id = s.rq_editId || 'REQ-' + (18 + added.length);
    const fields = {fields:f, title:text(f.title).trim() || 'Без названия', dept:f.dept || 'Не указано', grade:f.grade || 'Не указан', need:Math.max(1,Number(f.need) || 1), date:f.date || '—',pr:f.pr || 'Обычный', materials:clone(s.rq_files || []), pct:Math.round(Object.values(f).filter(v => text(v).trim()).length / 13 * 100)};
    const entry = Object.assign({id,who:'Анна Соколова',mine:true,created:'11.10.2026',ver:1,hist:1,late:'',step:-1,st:'draft'}, fields, submit ? {st:'appr',step:0} : {});
    if (s.rq_editId) over[id] = Object.assign({}, over[id] || {}, fields, submit ? {st:'appr',step:0,late:''} : {});
    else added.push(entry);
    self.setState({rq_added:added,rq_over:over,rq_view:'list',rq_step:1,rq_sel:id,rq_scope:submit?'mine':'drafts',rq_stF:'',rq_editId:null,rq_f:{},rq_toast:submit ? id + ' отправлена на согласование' : id + ' — черновик сохранён'});
    return true;
  }
  function decorate(values, self) {
    active = self; const s = self.state || {}, ctx = self.__bridgeContext || context(), p = profile(self);
    const out = Object.assign({}, values, {profile:p,vacancyName:ctx.vacancyName,primaryDemo:p.primaryDemo,isDemoRes:values.isRes && p.primaryDemo,isPlainRes:values.isRes && p.plain,isDemoAi:values.isAi && p.primaryDemo,isPlainAi:values.isAi && p.plain,safeDemoOpen:values.safeOpen && p.primaryDemo,safePlainOpen:values.safeOpen && p.plain});
    const nav = {goHome:'dashboard',goTasks:'tasks',goReq:'requisitions',goAnalytics:'analytics',goSearch:'search',goMessages:'messages',goCalendar:'calendar',goSettings:'settings',goArchive:'portfolio',goTasksLegacy:'tasks/legacy',goReqLegacy:'requisitions/legacy',createCandidate:'create/candidate',createVacancy:'create/vacancy',createReq:'create/requisition',createReqAI:'create/requisition-ai'};
    Object.keys(nav).forEach(k => {out[k] = e => {persist(s); route(nav[k], e);};});
    out.goCand = e => route('vacancy/' + ctx.vacancyId,e);
    out.goVacancySettings = e => {e?.stopPropagation?.();return route('vacancy/' + ctx.vacancyId + '/edit',e);};
    out.allocationPending=catalog().find(v=>v.id===ctx.vacancyId)?.status==='на распределении';
    out.allocateCurrent=e=>{e?.preventDefault?.();return parentAPI()?.openVacancyAllocation?.(ctx.vacancyId)||false;};
    out.vacancyNavigation = catalog().map(v => ({title:v.title || v.name, go:e => route('vacancy/' + v.id,e),style:'display:block;padding:7px 10px;border-radius:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;font-size:13px;color:#d9d9de;background:' + (ctx.vacancyId === v.id && s.page === 'cand' ? 'rgba(255,255,255,.11)' : 'transparent')}));
    out.cs = Object.assign({}, values.cs); out.cv = Object.assign({},values.cv);
    const list = seeds();
    list.slice(0,17).forEach((person,i) => {out.cs['name'+i]=person.name;out.cs['position'+i]=person.position || person.role;out.cs['meta'+i]=person.company || '';out.cs['photo'+i]=person.photo || '';out.cs['go'+i]=() => {ctx.leaveLocalCandidate?.(); const seen=(self.state.cSeen || [0,1,2,4,5,7,9,11,13,15]); self.__bridgeContext=Object.assign({},ctx,{candidate:null});self.setState({bridgeCandidateIndex:i, cSeen:seen.includes(i)?seen:seen.concat(i)});}; out.cs['row'+i]='cursor:pointer;display:flex;gap:12px;padding:14px 18px;border-top:1px solid #F0EEF5;background:' + (!ctx.candidate && i === (s.bridgeCandidateIndex || 0) ? '#F6F4FC;box-shadow:inset 4px 0 0 #6A4BE0' : '#FFFFFF');});
    const localRows=(ctx.localCandidates || []).slice();
    if(ctx.candidate && !localRows.some(r=>r.candidate?.id===ctx.candidate.id))localRows.push({candidate:ctx.candidate,stage:currentStage(self)});
    const labels=candidateStages(self),scope=funnelScope(self,ctx),stageFilter=labels.includes(normalizeStage(scope.filter,self)) ? normalizeStage(scope.filter,self) : '';
    out.localCandidates = localRows.map(r => ({id:r.candidate.id,name:r.candidate.name,position:r.candidate.position,stage:normalizeStage(r.candidate.id===ctx.candidate?.id ? currentStage(self) : r.stage,self),go:() => ctx.selectLocalCandidate?.(r.candidate.id)})).filter(r=>!stageFilter || r.stage===stageFilter);
    out.showSeedCandidates = !ctx.vacancyId?.startsWith('draft-') && (!ctx.candidate || ctx.candidate.createdLocally);
    const pool=[];
    list.slice(0,17).forEach((person,i)=>{
      const stage=seedStage(self,i,ctx);if(out.showSeedCandidates)pool.push({id:person.id,stage});
      out.cv['c'+i]=out.showSeedCandidates && out.cv['c'+i]!==false && (!stageFilter || stage===stageFilter);
      out.cs['mv'+i]=!!(scope.moved && Object.prototype.hasOwnProperty.call(scope.moved,i));out.cs['mvTo'+i]=stage;
    });
    localRows.forEach(r=>{if(!pool.some(x=>x.id===r.candidate.id))pool.push({id:r.candidate.id,stage:normalizeStage(r.candidate.id===ctx.candidate?.id ? currentStage(self) : r.stage,self)});});
    out.funnelTabs=['',...labels].map(label=>({label:label || 'Все',count:label ? pool.filter(r=>r.stage===label).length : pool.length,selected:label===stageFilter,
      style:label===stageFilter?'background:#6A4BE0;color:#FFFFFF;border-color:#6A4BE0':label==='Отказ'?'background:#FFFFFF;color:#A52760;border-color:#ECD5E0':label==='Выход'?'background:#FFFFFF;color:#1F7A4D;border-color:#DCEEE4':'background:#FFFFFF;color:#2C2A35;border-color:#E9E5F2',
      pick:event=>{event?.preventDefault?.();saveFunnelScope(self,ctx,{filter:label,selected:[]},{cSel:[],cBulkDD:false});}}));
    out.cVis=list.slice(0,17).map((_,i)=>i).filter(i=>out.cv['c'+i]);
    const selected=s.cSel || [],allSelected=out.cVis.length>0 && out.cVis.every(i=>selected.includes(i)),someSelected=!allSelected && selected.length>0;
    out.cAllOn=allSelected;out.cSomeOn=someSelected;out.cvEmpty=!out.cVis.length && !out.localCandidates.length;
    out.cSelAllSt='flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;box-sizing:border-box;border-radius:5px;cursor:pointer;'+(allSelected || someSelected?'background:#151716;border:1.5px solid #151716':'background:#FEFEFC;border:1.5px solid #CFCBDB');
    out.cSelAll=()=>{const next=allSelected?[]:out.cVis.slice();saveFunnelScope(self,ctx,{selected:next},{cSel:next,cBulkDD:false});};
    out.toggleEdit = () => self.setState({editing:true,bridgeEditDraft:{}});
    out.cancelEdit = () => self.setState({editing:false,bridgeEditDraft:null});
    out.saveEdit = () => {const edit=Object.assign({},s.bridgeEditDraft || {}), bank=Object.assign({},s.bridgeProfileEdits || {},{[p.id]:Object.assign({},s.bridgeProfileEdits?.[p.id] || {},edit)});self.setState({editing:false,bridgeEditDraft:null,bridgeProfileEdits:bank});};
    out.curStage = currentStage(self);
    out.stageError=s.bridgeStageError || '';
    const enabled=(ctx.pipeline || []).filter(stage=>stage.enabled!==false && stage.disabled!==true);
    const commitStage=(label,action)=>{
      const normalized=normalizeStage(label,self),stage=enabled.find(stage=>normalizeStage(stage.label || stage.name,self)===normalized);
      if(!labels.includes(normalized)){self.setState({bridgeStageError:'Выбранный этап недоступен в текущей воронке.'});return false;}
      if(p.createdLocally){const result=stage && parentAPI()?.updateCandidateStage?.(p.id,{vacancyId:ctx.vacancyId,stageId:stage.id});if(!result?.ok){self.setState({bridgeStageError:result?.error || 'Этап не сохранён. Попробуйте ещё раз.'});return false;}self.__bridgeContext=context();}
      action?.();
      if(!ctx.candidate){const moved=Object.assign({},funnelScope(self,ctx).moved || {},{[s.bridgeCandidateIndex || 0]:normalized});saveFunnelScope(self,ctx,{moved},{cMoved:moved,bridgeStageError:''});}
      else self.setState({bridgeStageError:''});
      return true;
    };
    out.confirmStage=()=>{const stage=values.stageList?.[Number(s.stSel)];if(!stage)return;commitStage(stage.label,values.confirmStage);};
    out.confirmRej=()=>{if(s.rejIdx==null || s.rejIdx<0){values.confirmRej?.();return;}const rejection=enabled.find(stage=>/отказ/i.test(stage.label || stage.name || '') || /reject|refus/i.test(stage.id));const label=rejection?.label || rejection?.name || (labels.includes('Отказ')?'Отказ':'');if(!label){self.setState({bridgeStageError:'В текущей воронке нет доступного этапа отказа.'});return;}if(commitStage(label,values.confirmRej))self.setState(state=>{const events=(state.extra || []).slice();if(events.at(-1)?.k==='stage')events[events.length-1]=Object.assign({},events.at(-1),{to:label});return {extra:events};});};
    if(values.cBulk){
      out.cBulk=Object.assign({},values.cBulk,{opts:(values.cBulk.opts || []).filter((option,i,array)=>labels.includes(option.label) && array.findIndex(x=>x.label===option.label)===i)});
    }
    const allTags=p.tags.concat(s.tagsOn || []).filter((x,i,a)=>a.indexOf(x)===i);
    function toggleTag(label) {const remove=allTags.includes(label); const base=p.tags.filter(x=>!remove || x!==label); const edits=Object.assign({},s.bridgeProfileEdits || {},{[p.id]:Object.assign({},s.bridgeProfileEdits?.[p.id] || {},{tags:base})});self.setState({tagsOn:remove?(s.tagsOn||[]).filter(x=>x!==label):(s.tagsOn||[]).concat(label),bridgeProfileEdits:edits});}
    out.tagsAdded = allTags.map(label=>({label,remove:()=>toggleTag(label)}));
    const resumes = p.resumes || (p.resume ? [p.resume] : p.primaryDemo ? [] : [{id:p.id+'-demo-resume',title:p.position,source:p.source,experience:p.experience || [],skills:p.skills || [],education:p.education || ''}]);
    out.profileResumes = resumes.map((r,i)=>({id:r.id,title:r.title || 'Резюме ' + (i+1),text:r.fullText || r.text || '',pick:()=>self.setState({bridgeResumeId:r.id})}));
    const chosen = resumes.find(r=>r.id === s.bridgeResumeId) || p.resume || resumes[0];
    out.profileResumeText = chosen?.fullText || chosen?.text || p.fullText;
    out.profileResumeTitle = chosen?.title || p.position || 'Резюме';
    out.profileResumeEmpty = !out.profileResumeText && !(chosen?.experience || p.experience || []).length;
    out.profilePhoto = p.photo || (Number.isInteger(p.photoIndex) ? list[p.photoIndex]?.photo : '') || 'assets/candidates/portrait-sergey.png?public=6e05742eaa85';
    out.profileJobs = (chosen?.experience || p.experience || []).map(j=>({company:j.company,role:j.role,text:j.text,period:j.period || '',dur:j.years ? j.years + ' лет' : ''}));
    out.profileSkills = chosen?.skills || p.skills || []; out.profileEducation = chosen?.education || p.education || 'Не указано';
    const selectedVacancy=catalog()[Number(s.vacPick)], selectedStages=(selectedVacancy?.stages || selectedVacancy?.pipeline || []).filter(st=>st.enabled!==false && st.disabled!==true && !st.terminal && !/выход|отказ/i.test(st.label || st.name || ''));
    out.vacStageOptions=selectedStages.length ? selectedStages.map(st=>({id:st.id,label:st.label || st.name})) : (values.stageList || []).map(st=>({id:st.label,label:st.label}));
    out.vacResumeOptions=p.primaryDemo ? (values.resList || []).map(r=>({id:r.meta,title:r.title+' · '+r.meta})) : out.profileResumes;
    out.vacError=s.bridgeVacError || '';
    if(p.createdLocally) {
      const taken=(p.processes || []).map(x=>x.vacancyId);
      out.vacFree=catalog().map((v,i)=>({title:v.title || v.name,meta:'Вакансия из общего макета',pick:()=>self.setState({vacPop:true,vacPick:i,bridgeVacError:''}),id:v.id})).filter(v=>!taken.includes(v.id));
      out.vacOn=(p.processes || []).map(x=>({title:x.vacancyName,meta:'Процесс выбранного кандидата',stage:x.stage}));
      out.confirmVac=()=>{if(!selectedVacancy)return;const stageValue=host.document?.getElementById?.('vac-stage')?.value || '',resumeValue=host.document?.getElementById?.('vac-res')?.value || '';const st=stageValue?selectedStages.find(st=>(st.label || st.name)===stageValue || st.id===stageValue):selectedStages[0];const resume=resumeValue?out.profileResumes.find(r=>r.id===resumeValue):p.resume;if(!st || !resume){self.setState({bridgeVacError:'Выберите доступный начальный этап и собственное резюме кандидата.'});return;}const result=parentAPI()?.assignCandidate?.(p.id,{vacancyId:selectedVacancy.id,stageId:st.id,resumeId:resume.id});if(!result?.ok){self.setState({bridgeVacError:result?.error || result?.message || 'Не удалось добавить кандидата. Изменения не выполнены.'});return;}self.__bridgeContext=context();self.setState({vacPop:false,vacPick:-1,bridgeVacError:'',extra:(s.extra || []).concat([{k:'res',title:'Добавлен на вакансию «'+(selectedVacancy.title || selectedVacancy.name)+'»',text:st.label || st.name,who:'Действие в макете',to:out.curStage}]),tab:'hist'});};
    } else if(!p.primaryDemo && ctx.candidate) out.confirmVac=()=>route('search');
    if (p.primaryDemo && (s.resSel || s.resV4)) {
      // Каждая старая синтетическая версия имеет свой набор мест работы и навыков.
      const index=Number(s.resSel || 0), original=(values.jobs || []).map(j=>Object.assign({},j));
      out.jobs=index ? original.slice(Math.min(index,Math.max(0,original.length-1))).map((j,n)=>Object.assign({},j,{text:j.text+'\n\nДемонстрационная архивная версия № '+(index+1)+'.',role:n?j.role:p.position})) : [{company:'ДемоКомпания новой версии',role:p.position,period:'сентябрь 2026 г. — настоящее время',dur:'1 месяц',text:'Новая вымышленная версия резюме: обновлены обязанности и ключевые навыки.'}].concat(original);
      out.about='Демонстрационная версия резюме № '+(index+1)+' · '+p.position;
      out.skills=(values.skills || []).slice(0,Math.max(2,(values.skills || []).length-index*2));
    }
    if (!p.primaryDemo) {
      out.tagOptions=['Волк','Отклик с hh','Легенда','Чёрный список','Сильный кандидат','Резерв','Рекомендация сотрудника','Нужен релокейт'].map(label=>({label,hint:'',cb:'flex:none;width:18px;height:18px;border-radius:5px;background:'+(allTags.includes(label)?'#5B3FD6;color:#FFFFFF':'#FFFFFF;color:transparent')+';border:1px solid #CFCBDB',toggle:()=>toggleTag(label)}));
      out.dupBanner = false; out.jobs = out.profileJobs;out.about=p.about || '';out.skills=p.skills || [];
      const resumeDot='flex:none;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#EFEBFD;color:#4A2BC2;font-size:9px;font-weight:800';
      out.resCount=resumes.length + ' резюме';
      out.resList=out.profileResumes.map((r,i)=>Object.assign({},r,{short:'CV',dot:resumeDot,meta:resumes[i].source || p.source || 'Загруженное резюме',on:r.id===chosen?.id,link:false,noLink:true,noLinkWhy:'Версия сохранена в макете',rowSt:'display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:8px 10px;border-radius:10px;background:'+(r.id===chosen?.id?'#F2FBCF':'transparent'),pick:()=>self.setState({bridgeResumeId:r.id,resMenu:false})}));
      out.resCur={short:'CV',dot:resumeDot,label:chosen?.title || p.position || 'Резюме'};
      out.resLatestMeta=chosen?.title || 'Версия выбранного кандидата';
      out.checkResUpd=()=>self.setState({resUpd:s.resUpd?'':'latest'});
      out.msgs=[];out.empty=true;out.chanName='каналах'; ['all','em','hh','av','wa','tg','max','vb'].forEach(k=>out['cnt_'+k]=0);
      // HG очищается до вычисления оригинальных функций: новые комментарии и задачи
      // сохраняют исходные контролы, но старые Sales-события сюда не попадают.
      if(!values.bridgeHistoryScoped) out.hGroups=[];
      out.consStatus=p.consent==='given'?'Статус: получено':p.consent==='requested'?'Статус: запрошено':'Статус: не указано';
      out.consSub_tg=p.telegram || 'Не указан';out.consSub_wa=p.whatsapp || p.phoneLabel;out.consSub_max=p.max || p.phoneLabel;out.consSub_vb=p.viber || p.phoneLabel;out.consSub_em=p.emailLabel;
    }
    if (out.home?.rows) out.home.rows.forEach(r=>{const v=catalog().find(v=>r.vacancyId?v.id===r.vacancyId:(v.title || v.name)===r.title);r.go=e=>{e?.preventDefault?.();if(!v)return false;if(v.status==='на распределении'||r.status==='На распределении')return parentAPI()?.openVacancyAllocation?.(v.id)||false;return route('vacancy/' + v.id,e);};if(v?.sourceRequisition)r.meta+=' · '+v.sourceRequisition;});
    if(out.tasks?.rows) out.tasks.rows.forEach(row=>{if(row.taskRecord)row.open=()=>self.setState({bridgeTaskDetails:plain({title:row.title,sub:row.sub,who:row.who,due:row.taskRecord.due || 'Без срока',description:row.taskRecord.desc || 'Описание не добавлено',vacancyTitle:row.taskVacancyTitle})});});
    const task=s.bridgeTaskDetails || {}, taskVacancy=catalog().find(v=>(v.title || v.name)===task.vacancyTitle);
    out.taskDetails=Object.assign({},task,{open:!!s.bridgeTaskDetails,hasVacancy:!!taskVacancy,close:()=>self.setState({bridgeTaskDetails:null}),openVacancy:e=>{if(taskVacancy){self.setState({bridgeTaskDetails:null});route('vacancy/'+taskVacancy.id,e);}}});
    if (out.rq) {
      out.rq=Object.assign({},out.rq,{saveDraft:()=>rqSave(self,false),submit:()=>rqSave(self,true),goAI:out.createReqAI});
      const cur=[...(s.rq_added || [])].find(r=>r.id===out.rq.d?.id), own=Object.assign({},cur || {},s.rq_over?.[out.rq.d?.id] || {});
      if(own.fields){const f=own.fields, row=(base,label,val)=>Object.assign({},base || {},{label,val:val || '—'}), reopen=()=>self.setState({rq_view:'form',rq_step:1,rq_editId:out.rq.d.id,rq_f:clone(f),rq_files:clone(own.materials || [])});out.rq.d=Object.assign({},out.rq.d,{edit:reopen,fix:reopen,cont:reopen,pc1:[['Должность',f.title],['Подразделение',f.dept],['Руководитель',f.mgr],['Грейд',f.grade],['Сколько человек',f.need],['Дата выхода',f.date],['Причина открытия',f.reason]].map(([label,val],i)=>row(out.rq.d.pc1?.[i],label,val)),pc2:[['Обязанности',f.duties],['Требования',f.reqs],['Условия',f.cond],['Вилка',[f.from,f.to].filter(Boolean).join(' — ')]].map(([label,val],i)=>row(out.rq.d.pc2?.[i],label,val)),matTxt:(own.materials || []).map(x=>x[0]).join(' · ') || 'Материалов нет'});}
      if(out.rq.d){const d=out.rq.d, ownRequest=!!cur || !!own.fields, vacancy=catalog().find(v=>v.sourceRequisition===d.id) || (!ownRequest ? catalog().find(v=>!v.sourceRequisition && (v.title || v.name)===d.title) : null);out.rq.d=Object.assign({},d,{vacancyCta:vacancy?'К вакансии':'Создать вакансию',openVacancy:e=>{e?.preventDefault?.();if(vacancy)return route('vacancy/'+vacancy.id);const f=own.fields || {title:d.title,need:Number.parseInt(d.need,10)||1,dept:d.meta?.split(' · ')[0] || '',grade:d.meta?.split(' · ')[1] || '',duties:d.pc2?.find(p=>p.label==='Обязанности')?.val || '',reqs:d.pc2?.find(p=>p.label==='Требования')?.val || '',cond:d.pc2?.find(p=>p.label==='Условия')?.val || ''};persist(self.state);return parentAPI()?.createVacancyFromRequest?.(clone(f),d.id);}});}
    }
    return out;
  }
  return {KEY,initialState,mount,connect,intercept,persist,decorate,profile,route,catalog,homeVacancies,candidateStages,currentStage,captureRoster,delayedState,rqSave};
});
