/* ИИ-модуль — строка воронки. Демо хранит кандидатов, версии прогонов и переходы.
   Информационные признаки прогона не являются отдельными состояниями кандидата. */
window.CandidacyRuns = (() => {
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const hash = s => [...String(s)].reduce((a,c) => (a*31+c.charCodeAt(0))>>>0,7);
  const pick = (s,n) => hash(s)%n;
  const KEY = 'sobesso-ai-candidates-v1';
  let db; try { db = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { db = {}; }
  const ui = { picked:{}, open:{}, state:'', dialog:null };
  let pendingEntry = null;
  const save = () => { try { localStorage.setItem(KEY,JSON.stringify(db)); } catch {} };
  const setup = () => window.VacancySetup;
  const vacancy = () => setup().vacancy();
  const pool = () => db[vacancy()]?.people || [];
  const isPaused = () => !!db[vacancy()]?.paused;
  function setPaused(value){db[vacancy()].paused=value;save();repaint();}
  const funnel = () => setup().funnel().filter(s => s.enabled);
  const modules = () => funnel().filter(s => !s.system && s.kind !== 'manual');
  const current = () => window.ATSPrototype?.current();
  const toast = t => window.dispatchEvent(new CustomEvent('cr-toast',{detail:t}));
  function repaint() { window.dispatchEvent(new CustomEvent('cr-repaint')); paintDialog(); }
  function focus(c) {
    ui.state=''; ui.picked={}; save();
    window.dispatchEvent(new CustomEvent('cr-focus',{detail:{stage:c.stage,id:c.id}}));
    paintDialog();
  }
  const LABEL = { passed:'Прошёл', failed:'Не прошёл', running:'Выполняется', answer:'Ждём ответа',
    refused:'Отказался от общения', silent:'Не отвечает', error:'Ошибка обработки', stopped:'Остановлен', notReached:'Не запускался', manual:'Ручной этап' };
  const CLASS = {passed:'good',failed:'danger',running:'purple',answer:'warn',refused:'warn',silent:'warn',error:'danger',stopped:''};
  const title = { scoring:'ИИ-ревью резюме', 'chat-bot':'ИИ-чат', voice:'ИИ-интервью' };
  const active = c => [...(c.runs||[])].reverse().find(r => r.stageId===c.stage) || null;
  const runsFor = (c,id) => (c.runs||[]).filter(r => r.stageId===id);
  function makeRun(c,st,status='running') {
    const snap = setup().snapshot(st.id);
    if(!snap) return null;
    const run={id:crypto.randomUUID(),stageId:st.id,stage:clone(st),kind:st.kind,version:snap.version,
      structureVersion:setup().structureVersion(),revision:c.revision,config:clone(snap.config),
      threshold:snap.config.score,status,score:null,createdAt:Date.now(),messages:[],applied:false};
    c.runs.push(run); return run;
  }
  function materialize(id,order,counts,seed) {
    let entry=db[id];
    if(!entry) {
      entry=db[id]={people:[],known:[],baseCounts:{...counts}};
    }
    order.forEach(([key])=>{
      if(entry.known.includes(key))return;
      // Добавленная после первой загрузки строка начинает с пустого списка.
      if(!entry.initialized) {
        for(let i=0;i<(counts[key]||0);i++){
          const c=seed(id,key,i); c.vacancy=id;c.revision=1;c.runs=[];c.history=[];
          const pos=order.findIndex(([k])=>k===key);
          modules().forEach(st=>{
            const at=order.findIndex(([k])=>k===st.id);
            if(at<0 || at>pos || key==='response')return;
            const r=makeRun(c,st,at===pos?(i===0?'running':st.kind!=='scoring'&&i===3?'answer':i===8?'error':i%3===2?'failed':'passed'):'passed');
            if(!r)return;
            if(r.status==='passed')r.score=Math.max(r.threshold,8);
            if(r.status==='failed')r.score=Math.max(1,r.threshold-2);
            if(r.status==='answer') {r.waitingSince=Date.now();r.delivered=true;r.messages=[{who:'Бот',text:r.config.invite.text}];}
            if(at<pos){r.applied=true;r.action='Продвинут по предыдущему решению';}
          });
          entry.people.push(c);
        }
      }
      entry.known.push(key);
    });
    entry.initialized=true; save();
    return Object.fromEntries(order.map(([key])=>[key,entry.people.filter(c=>c.stage===key).length]));
  }
  const candidates = (id,stage) => (db[id]?.people||[]).filter(c=>c.stage===stage);
  const occupied = id => pool().some(c=>c.stage===id);
  function next(c) {
    const order=window.ATSPrototype?.stages()||[];
    const at=order.findIndex(([id])=>id===c.stage);
    const candidate=order.slice(at+1).find(([id])=>id!=='rejected' && !funnel().find(s=>s.id===id)?.inherited);
    return candidate||null;
  }
  function stage(id){return funnel().find(s=>s.id===id);}
  function allowed(c,r){
    const snap=setup().snapshot(r.stageId);
    return !isPaused() && c.stage===r.stageId && c.revision===r.revision && snap?.version===r.version && setup().structureVersion()===r.structureVersion;
  }
  function addHistory(c,text,reason='') {c.history.unshift({at:Date.now(),text,reason});}
  function move(c,target,reason='',automatic=false){
    if(!c||!target||c.stage===target)return false;
    const st=stage(target);
    if(st&&!st.system&&st.kind!=='manual'&&isPaused()){toast('Вакансия на паузе. Новый запуск ИИ недоступен');return false;}
    if(st?.inherited){toast('На наследуемый этап вход закрыт');return false;}
    if(st && st.kind!=='manual' && !st.system && !setup().snapshot(target)){
      if(automatic){ addHistory(c,'Автопереход не выполнен','Следующий ИИ-этап требует настройки');save();toast('Следующий ИИ-этап требует настройки');return false; }
      if(!setup().canConfigure()){ui.dialog={title:'ИИ-этап требует настройки',info:true,ok:'Понятно',note:'Нет права настройки. Подготовить этап может Елена Крылова, руководитель рекрутмента. Кандидат остаётся на прежнем этапе.'};paintDialog();return false;}
      if(!pendingEntry || pendingEntry.target!==target || pendingEntry.vacancyId!==vacancy())pendingEntry={vacancyId:vacancy(),candidateIds:[],target};
      if(!pendingEntry.candidateIds.includes(c.id))pendingEntry.candidateIds.push(c.id);
      ui.dialog=null;paintDialog();setup().openStage(target);toast('Сначала подтвердите логику ИИ-этапа. Кандидат остаётся на прежнем этапе');return false;
    }
    const previous=c.stage;
    (c.runs||[]).forEach(r=>{
      if(r.stageId===previous && ['running','answer'].includes(r.status)) {
        r.status='stopped';r.stoppedAt=Date.now();r.action='Ручной уход остановил модуль и напоминания';
      }
    });
    c.stage=target;c.revision++;c.reason=target==='rejected'?reason:'';
    addHistory(c,(automatic?'Автоматически':'Вручную')+' → '+(window.ATSPrototype?.stages().find(([k])=>k===target)?.[1]||target),reason);
    if(st && st.kind!=='manual' && !st.system && !runsFor(c,target).length)makeRun(c,st);
    save();return true;
  }
  function complete(c,r,score=8){
    if(['passed','failed','refused','silent'].includes(r.status)){toast('Прогон завершён; для новой оценки запустите новый прогон');return false;}
    r.score=score;r.status=score>=r.threshold?'passed':'failed';r.finishedAt=Date.now();
    if(!allowed(c,r)){r.action='Отчёт сохранён. Контекст или логика изменились — автоматический переход отменён';save();return false;}
    const outcome=r.status==='passed'?'pass':'fail';
    if(r.config.policy[outcome]!=='auto'){r.action='Ждёт ручного решения';save();return false;}
    if(outcome==='fail'&&!setup().policyAllowed()){r.action='Автоотказ запрещён политикой компании';save();return false;}
    const target=outcome==='fail'?'rejected':next(c)?.[0];
    const moved=move(c,target,outcome==='fail'?'Не прошёл оценку ИИ':'',true);
    r.applied=moved;r.action=moved?'Правило исхода применено':'Переход не выполнен: требуется настройка цели или ручное решение';save();return moved;
  }
  function communication(c,r,event){
    if(['passed','failed','stopped','refused'].includes(r.status)){toast('Прогон завершён или остановлен; нужен явный перезапуск');return false;}
    if(!allowed(c,r)){r.action='Событие сохранено без действий: контекст изменился';save();return false;}
    if(event==='delivery-error'){r.delivered=false;r.waitingSince=null;r.status='error';r.action='Ошибка доставки. Молчание не отсчитывается';save();return false;}
    if(event==='delivered'){r.delivered=true;r.waitingSince=Date.now();r.status='answer';r.messages.push({who:'Бот',text:r.config.invite.text||r.config.questions[0]?.text});save();return false;}
    if(event==='reply'){r.waitingSince=null;r.status='running';r.messages.push({who:'Кандидат',text:'Готов продолжить. Расскажу о своём опыте.'});r.action='Ответ получен, отсчёт отменён';save();return false;}
    if(event==='question'){r.delivered=true;r.waitingSince=Date.now();r.status='answer';r.messages.push({who:'Бот',text:r.config.questions[0]?.text||'Расскажите о своём опыте.'});save();return false;}
    if(event==='uncertain'){r.action='Отказ распознан неуверенно — требуется решение рекрутера';save();return false;}
    if(event==='silent' && (!r.delivered || !r.waitingSince || Date.now()-r.waitingSince<r.config.policy.hours*3600000)){r.action='Срок не истёк или нет доставленного вопроса. Отказ не выполняется';save();return false;}
    if(event==='refused'||event==='silent'){
      r.status=event;r.score=null;r.action=event==='refused'?'Явный отказ от общения. Бот и напоминания остановлены':'Срок ответа истёк';
      if(r.config.policy[event]&&setup().policyAllowed()){
        const reason=event==='refused'?'Отказался от общения с ИИ':'Не отвечает';
        const moved=move(c,'rejected',reason,true);r.action=moved?'Автоотказ: '+reason:r.action;save();return moved;
      }
      save();return false;
    }
    return false;
  }
  function restart(c){
    if(isPaused()){toast('Возобновите вакансию для нового запуска ИИ');return false;}
    const st=stage(c.stage);
    if(!st || st.system || st.kind==='manual'){toast('Повторный запуск доступен на соответствующем ИИ-этапе');return false;}
    if(!setup().snapshot(st.id)){setup().openStage(st.id);return false;}
    const prior=active(c); if(prior&&['running','answer'].includes(prior.status))prior.status='stopped';
    makeRun(c,st);addHistory(c,'Новый прогон: '+st.name,'Явная команда пользователя');save();return true;
  }
  function workState(c){const r=active(c),st=stage(c.stage);return r?.status||(st&&!st.system&&st.kind!=='manual'?'notReached':'manual');}
  const tagsOf = c => c.reason?[{id:'reason',text:c.reason,cls:'warn'}]:[];
  function axis(list){
    const counts={};list.forEach(c=>counts[workState(c)]=(counts[workState(c)]||0)+1);
    const labels=Object.keys(counts);if(labels.length<2)return '';
    /* Чипы фильтра по состоянию прогона — семья .chip, слой делает из них Tag.CheckableTag (49.3). */
    return `<div class="cr-axis" aria-label="Сведения о прогоне"><button class="chip ${!ui.state?'active':''}" data-cr="state" data-id="" aria-pressed="${!ui.state}">Все<span>${list.length}</span></button>${labels.map(k=>`<button class="chip ${ui.state===k?'active':''}" data-cr="state" data-id="${k}" aria-pressed="${ui.state===k}">${LABEL[k]}<span>${counts[k]}</span></button>`).join('')}</div>`;
  }
  const filter = list => ui.state?list.filter(c=>workState(c)===ui.state):list;
  const avatar=(c,html)=>`<span class="cr-avatar ${ui.picked[c.id]?'is-picked':''}" data-cr="pick" data-id="${c.id}" role="checkbox" aria-checked="${!!ui.picked[c.id]}" aria-label="Отметить кандидата ${esc(c.name)}">${html}<span class="cr-avatar-mark">✓</span></span>`;
  const rowMeta=c=>`<span class="cr-row-meta"><span class="pill ${CLASS[workState(c)]||''}">${LABEL[workState(c)]}</span>${c.reason?`<span class="pill warn">${esc(c.reason)}</span>`:''}</span>`;
  function bulkBar(){const n=Object.values(ui.picked).filter(Boolean).length;return n?`<div class="cr-bulk"><b>Выбрано ${n}</b><button class="cr-mini" data-cr="bulk-move">Дальше</button><button class="cr-mini" data-cr="bulk-reject">Отказать</button><button class="cr-mini" data-cr="bulk-restart">Запустить заново</button><button class="cr-mini" data-cr="select-off">Снять</button></div>`:'';}
  /* Предупреждающая плашка — Alert type=warning без значка (49.3, разметка из antd/sample.html). */
  const plate=text=>`<div class="ant-alert ant-alert-warning ant-alert-no-icon" data-show="true" role="alert" data-antd="Alert" data-antd-props="type=warning"><div class="ant-alert-section"><div class="ant-alert-title">${text}</div></div></div>`;
  const fold=(key,head,extra,body)=>`<section class="cr-fold ${ui.open[key]?'is-open':''}"><header data-cr="fold" data-id="${key}"><span class="cr-chevron">›</span><b>${head}</b><span class="cr-fold-extra">${extra}</span></header>${ui.open[key]?`<div class="cr-fold-body">${body}</div>`:''}</section>`;
  function verdictRows(c, run) {
    const all = run.config.factors || [];
    const req = all.filter(r => run.stage.kind === 'scoring' ? r.zone !== 'interview' : r.zone !== 'resume');
    if (!req.length) return `<p class="cr-note">${all.length ? 'В зонах этого модуля требований нет — проверять было нечего.' : 'Требований к кандидату пока нет — оценивать нечего.'}</p>`;
    /* Вердикты согласованы с баллом прогона: балл 8 — примерно восемь требований из десяти выполнены. */
    const rows = req.map((r, i) => {
      const v = pick(c.id + run.stage.id + i, 10);
      const unknown = pick(c.id + 'unk' + i, 18) === 0;
      return { ...r, ok: run.status==='passed' && r.critical || !unknown && v < run.score, unknown:unknown && !(run.status==='passed' && r.critical), i };
    }).sort((a, b) => (a.ok ? 1 : 0) - (b.ok ? 1 : 0));
    const done = rows.filter(r => r.ok).length;
    return `<p class="cr-note">Выполнено ${done} из ${rows.length}</p>
      <div class="cr-verdicts">${rows.map(r => `
        <div class="cr-verdict ${r.unknown ? 'is-unknown' : r.ok ? 'is-ok' : 'is-bad'}">
          <span class="cr-verdict-mark">${r.unknown ? '?' : r.ok ? '✓' : '✕'}</span>
          <span>${esc(r.text)}${r.critical ? '<i title="Критичное требование"> 📌</i>' : ''}
            ${r.unknown ? '<small>Не удалось оценить: в резюме нет данных</small>'
              : r.ok ? '' : '<small>В резюме этого не нашлось</small>'}</span>
        </div>`).join('')}</div>`;
  }

  function chatBody(c, run) {
    const qs = run.config.questions || [];
    const asked = 2 + pick(c.id + 'ask', 3);
    return `${verdictRows(c, run)}
      ${qs.length ? `<h4 class="cr-h4">Фиксированные вопросы</h4>
        <div class="cr-verdicts">${qs.map((q, i) => {
          const ok = pick(c.id + 'fq' + i, 4) > 0;
          return `<div class="cr-verdict ${ok ? 'is-ok' : 'is-bad'}"><span class="cr-verdict-mark">${ok ? '✓' : '✕'}</span>
            <span>${esc(q.text || 'Вопрос без текста')}<small>Ответ кандидата: ${ok ? 'по существу, расхождений нет' : 'ответил уклончиво'}</small></span></div>`;
        }).join('')}</div>` : ''}
      <h4 class="cr-h4">Чеклист-план разговора</h4>
      <div class="cr-checklist">${['Поздороваться и представиться', 'Проверить требования по вакансии', 'Задать фиксированные вопросы', 'Рассказать про следующий шаг']
        .map((t, i) => `<span class="${i < 3 ? 'is-done' : ''}"><span class="cr-tick">${i < 3 ? '✓' : ''}</span>${t}</span>`).join('')}</div>
      <h4 class="cr-h4">Вопросы кандидата: без ответа ${asked > 2 ? 1 : 0}, всего ${asked}</h4>
      <div class="cr-qa">
        <div><b>Есть ли удалённый формат?</b><small><span class="cr-qa-mark is-ok">✓</span> Ответ бота: гибрид, два дня в офисе на Павелецкой.</small></div>
        <div><b>Когда будет ответ по интервью?</b><small><span class="cr-qa-mark is-ok">✓</span> Ответ бота: в тот же день.</small></div>
        ${asked > 2 ? '<div><b>Какая система премий?</b><small><span class="cr-qa-mark is-bad">✕</span> Ответа в базе знаний не нашлось — вопрос ушёл рекрутеру.</small></div>' : ''}
      </div>`;
  }

  function voiceBody(c, run) {
    const qs = run.config.questions || [];
    if (!qs.length) return '<p class="cr-note">Вопросов у модуля не было — интервью прошло вхолостую.</p>';
    const right = qs.filter((q, i) => pick(c.id + 'vq' + i, 3) > 0).length;
    return `<p class="cr-note">Правильных ответов ${right} из ${qs.length}</p>
      ${pick(c.id + 'cheat', 5) === 0 ? plate('🥸 Возможные попытки списать (1): долгая пауза перед ответом, 47 секунд') : ''}
      <div class="cr-runs">${qs.map((q, i) => {
        const ok = pick(c.id + 'vq' + i, 3) > 0;
        return `<div class="cr-answer">
          <div class="cr-answer-head"><b>Вопрос ${i + 1} из ${qs.length}${q.english ? ' 🇬🇧' : ''}</b>
            <span class="cr-score ${ok ? 'is-ok' : 'is-bad'}">${ok ? 8 + pick(c.id + i, 3) : 3 + pick(c.id + i, 3)}</span></div>
          <p>${esc(q.text || 'Вопрос без текста')}</p>
          <div class="cr-media">▶ Видео-ответ · 1:${20 + pick(c.id + i, 39)}</div>
          <small><b>ИИ-комментарий.</b> ${ok ? 'Ответ по существу, приведён пример из своего проекта.' : 'Ответ общий, конкретики и примеров нет.'}</small>
          <small><b>Расшифровка.</b> ${ok ? 'Кандидат разбирает архитектуру по слоям и объясняет выбор.' : 'Кандидат отвечает общими словами, уточняющий вопрос не помог.'}</small>
        </div>`;
      }).join('')}</div>`;
  }


  function runHTML(c,r){
    const key=c.id+':'+r.id;
    const finished=['passed','failed'].includes(r.status);
    const body=`<p class="cr-note">Проходной балл — ${r.threshold}/10</p>
      <p>${esc(r.action||(finished?'Сохранённый отчёт. Ручное решение доступно.':'Прогон выполняется на этом этапе'))}</p>
      ${finished?(r.kind==='scoring'?verdictRows(c,r):r.kind==='chat-bot'?chatBody(c,r):voiceBody(c,r)):''}
      ${r.messages.length?`<div class="cr-feed">${r.messages.map(m=>`<div class="cr-msg"><span class="pill">${esc(m.who)}</span><p>${esc(m.text)}</p></div>`).join('')}</div>`:''}`;
    return fold(key,esc(r.stage.name)+` <small>Прогон ${runsFor(c,r.stageId).indexOf(r)+1}${finished?' · '+r.score+'/10':''}</small>`,
      `<span class="pill ${CLASS[r.status]||''}">${LABEL[r.status]}</span>`,body);
  }
  function historyHTML(c){
    const reports=(c.runs||[]).filter(r=>['passed','failed'].includes(r.status)).map(r=>({at:r.finishedAt||r.createdAt,text:r.stage.name+' · '+LABEL[r.status]+' · '+r.score+'/10',reason:r.action||'Сохранённый отчёт'}));
    return [...(c.history||[]),...reports].sort((a,b)=>b.at-a.at).map(h=>`<article class="activity-item"><span class="activity-mark">→</span><div><header><b>${esc(h.text)}</b><time>${new Date(h.at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time></header>${h.reason?`<p>${esc(h.reason)}</p>`:''}</div></article>`).join('');
  }
  function openReport(c){
    const r=[...(c?.runs||[])].reverse().find(x=>['passed','failed'].includes(x.status));
    if(!r)return;
    ui.open[c.id+':'+r.id]=true;repaint();
    document.querySelector(`[data-cr="fold"][data-id="${c.id}:${r.id}"]`)?.scrollIntoView({block:'center'});
  }
  function card(c){
    const st=stage(c.stage),r=active(c),canRun=st&&!st.system&&st.kind!=='manual',ongoing=r&&['running','answer'].includes(r.status);
    const prev=window.ATSPrototype?.stages().slice(0,window.ATSPrototype.stages().findIndex(([id])=>id===c.stage)).filter(([id])=>id!=='rejected'&&!stage(id)?.inherited)||[];
    return `<section class="cr-card" data-cr-card>
      <header class="cr-card-head"><div><span class="eyebrow">ИИ-этапы и история прогонов</span><p>${r?`Сейчас: ${LABEL[r.status].toLowerCase()}`:canRun?'Прогонов на этом этапе нет':'Работа на текущем этапе выполняется вручную'}</p></div></header>
      ${canRun&&!st.ready?plate('Логика этапа не подтверждена. Сначала задайте критерии или вопросы.'):''}
      ${r&&!allowed(c,r)?plate('Контекст или логика изменились. Старый отчёт сохраняется; решение принимается вручную либо запускается новый прогон.'):''}
      <div class="cr-actions"><button class="cr-mini" data-antd-props="color=default variant=filled" data-cr="move" ${next(c)?'':'disabled'}>Дальше${next(c)?' → '+esc(next(c)[1]):''}</button><button class="cr-mini" data-cr="reject">Отказать</button>
      ${canRun?`<button class="cr-mini" data-cr="restart">Запустить заново</button><button class="cr-mini" data-cr="configure" data-id="${st.id}">Настройки этапа</button>`:''}
      ${prev.length?`<button class="cr-mini" data-cr="return">Вернуть на предыдущий этап</button>`:''}</div>
      ${canRun?`<p class="cr-note">${st.ready?'Первый вход запускает модуль. Повторный вход не создаёт прогон автоматически.':'Настройте логику до запуска.'} ${ongoing?'Ручной уход остановит работу и напоминания.':''}</p>`:''}
      ${(c.runs||[]).length?`<div class="cr-runs">${[...c.runs].reverse().map(x=>runHTML(c,x)).join('')}</div>`:'<p class="cr-note">История прогонов пока пуста.</p>'}
      <details class="cr-demo"><summary>Проверить сценарий в демо</summary><p class="cr-note">События ниже имитируют работу модуля; сообщения реальным кандидатам не отправляются.</p>
      <div class="cr-actions"><span class="cr-note">Права в демо:</span><button class="cr-mini" data-cr="role" data-id="lead">Руководитель</button><button class="cr-mini" data-cr="role" data-id="config">Настройка без автоотказа</button><button class="cr-mini" data-cr="role" data-id="reader">Без права настройки</button></div><p class="cr-note">${setup().demoRole()==='lead'?'Руководитель: доступны настройка и включение автоотказа':setup().demoRole()==='config'?'Можно настраивать логику; включение автоотказа недоступно':'Настройка недоступна; действия с кандидатом разрешены'}</p>
      ${r?`<div class="cr-actions"><button class="cr-mini" data-cr="event" data-event="pass">Результат: прошёл</button><button class="cr-mini" data-cr="event" data-event="fail" ${r.threshold>1?'':'disabled title="При пороге 1 отрицательный результат по баллу невозможен"'}>Результат: не прошёл</button><button class="cr-mini" data-cr="event" data-event="error">Ошибка обработки</button></div>
      ${r.kind!=='scoring'?`<div class="cr-actions"><button class="cr-mini" data-cr="event" data-event="delivered">Приглашение доставлено</button><button class="cr-mini" data-cr="event" data-event="reply">Ответ кандидата</button><button class="cr-mini" data-cr="event" data-event="question">Новый вопрос доставлен</button><button class="cr-mini" data-cr="event" data-event="timeout">Истёк срок ответа</button><button class="cr-mini" data-cr="event" data-event="refused">Явный отказ от общения</button><button class="cr-mini" data-cr="event" data-event="uncertain">Неуверенный отказ</button><button class="cr-mini" data-cr="event" data-event="delivery-error">Ошибка доставки</button></div>`:''}`:'<p class="cr-note">Сначала войдите на подготовленный ИИ-этап.</p>'}
      ${c.runs.some(x=>x.status==='stopped')?'<button class="cr-mini" data-cr="late">Пришёл результат остановленного прогона</button>':''}
      <button class="cr-mini" data-cr="template-preview">Предпросмотр обновления шаблона</button></details>

    </section>`;
  }
  function paintDialog(){
    let host=document.querySelector('#cr-dialogs');if(!host){host=document.createElement('div');host.id='cr-dialogs';document.body.appendChild(host);}
    const d=ui.dialog;
    host.innerHTML=d?`<div class="vs-overlay" data-cr-overlay><div class="vs-dialog" role="dialog" aria-label="${esc(d.title)}"><div class="vs-dialog-head"><h2>${esc(d.title)}</h2></div><div class="vs-dialog-body"><p>${esc(d.note)}</p>
      ${d.targets?`<label class="vs-field"><span>Возврат на этап</span><select data-cr-target>${d.targets.map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('')}</select></label>`:''}
      ${d.reason?'<label class="vs-field"><span>Причина решения</span><input data-cr-reason placeholder="Короткая причина" required></label>':''}
      ${d.preview?d.preview.map(x=>`<p><b>${esc(x.name)}</b> — ${x.preserved?'логика сохраняется':'требует настройки'}</p>`).join(''):''}
      <p class="cr-note" data-cr-validation></p></div><div class="vs-dialog-foot"><button class="btn" data-cr="close">Отмена</button><button class="btn primary" data-cr="confirm">${esc(d.ok||'Подтвердить')}</button></div></div></div>`:'';
  }
  function askMove(list,target=null,returning=false){
    const r=list.map(active).find(x=>x&&['running','answer'].includes(x.status));
    ui.dialog={title:returning?'Ручной возврат':'Продвинуть кандидата',ok:'Переместить',list,target,returning,
      targets:returning?window.ATSPrototype.stages().slice(0,window.ATSPrototype.stages().findIndex(([id])=>id===list[0].stage)).filter(([id])=>id!=='rejected'&&!stage(id)?.inherited):null,
      reason:returning||list.some(c=>active(c)?.status==='failed'),
      note:(r?'Незавершённая работа будет остановлена. Бот и напоминания больше не продолжатся. ':'')+'Оценки сохраняются. Первый вход на следующий подготовленный ИИ-этап запустит модуль; повторный вход покажет прежний прогон.'};paintDialog();
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-cr]');if(!el)return;
    e.preventDefault();e.stopPropagation();
    const a=el.dataset.cr,id=el.dataset.id,c=current();
    const list=a.startsWith('bulk-')?pool().filter(p=>ui.picked[p.id]):c?[c]:[];
    if(a==='fold'){ui.open[id]=!ui.open[id];repaint();}
    else if(a==='state'){ui.state=id;repaint();}
    else if(a==='pick'){ui.picked[id]=!ui.picked[id];const av=el;av.classList.toggle('is-picked',!!ui.picked[id]);av.setAttribute('aria-checked',String(!!ui.picked[id]));document.querySelector('[data-cr-bulk-slot]').innerHTML=bulkBar();}
    else if(a==='select-off'){ui.picked={};repaint();}
    else if(a==='configure')setup().openStage(id);
    else if(a==='role'){localStorage.setItem('sobesso-ai-demo-role',id);repaint();}
    else if(a==='move'||a==='bulk-move')askMove(list);
    else if(a==='return')askMove(list,null,true);
    else if(a==='reject'||a==='bulk-reject'){ui.dialog={title:'Отказать кандидату',ok:'Отказать',list,reject:true,reason:true,note:'Работа ИИ и неотправленные напоминания остановятся. Оценка сохранится, ручное решение попадёт в историю.'};paintDialog();}
    else if(a==='restart'||a==='bulk-restart'){ui.dialog={title:'Запустить заново',ok:'Запустить',list,restart:true,note:'Это явный новый прогон по действующей логике. Незавершённый прежний прогон остановится; его история сохранится.'};paintDialog();}
    else if(a==='close'){ui.dialog=null;paintDialog();}
    else if(a==='confirm'){
      const d=ui.dialog,reason=document.querySelector('[data-cr-reason]')?.value.trim();
      if(d.info){ui.dialog=null;paintDialog();return;}
      if(d.reason&&!reason){document.querySelector('[data-cr-validation]').textContent='Укажите причину решения';return;}
      if(d.preview){if(!setup().applyTemplate(d.template))return;ui.dialog=null;focus(c);return;}
      const target=document.querySelector('[data-cr-target]')?.value;
      ui.dialog=null;paintDialog();let changed=[];
      for(const p of d.list){const ok=d.restart?restart(p):move(p,d.reject?'rejected':target||d.target||next(p)?.[0],reason||'');if(ok)changed.push(p);}
      if(changed.length){focus(changed[0]);toast(d.restart?'Создан новый прогон':'Процесс кандидата обновлён');}
    }
    else if(a==='event'&&c){
      const r=active(c);if(!r)return;
      const ev=el.dataset.event;
      if(['passed','failed','refused'].includes(r.status)){toast('Прогон завершён; для нового результата запустите заново');return;}
      let moved=false;
      if(ev==='pass'||ev==='fail')moved=complete(c,r,ev==='pass'?Math.max(8,r.threshold):Math.max(1,r.threshold-2));
      else if(ev==='error'){r.status='error';r.score=null;r.action='Ошибка обработки: кандидат остаётся на этапе';save();}
      else if(ev==='timeout'){
        if(r.waitingSince&&r.delivered)r.waitingSince=Date.now()-r.config.policy.hours*3600000-1;
        moved=communication(c,r,'silent');
      }else moved=communication(c,r,ev);
      if(moved)focus(c);else repaint();
    }
    else if(a==='late'&&c){const r=[...c.runs].reverse().find(x=>x.status==='stopped');if(r){complete(c,r,8);focus(c);toast('Поздний отчёт сохранён без перехода');}}
    else if(a==='template-preview'&&c){
      if(setup().funnel().some(s=>s.id==='demo-voice-new')){toast('Новый модуль уже добавлен. Другие изменения доступны в настройках шаблона');return;}
      const template=clone(setup().funnel());
      template.splice(template.findIndex(s=>s.purpose==='awaiting'),0,{id:'demo-voice-new',kind:'voice',name:'Новое ИИ-интервью',enabled:true,score:7,policy:{pass:'manual',fail:'manual',refused:false,silent:false,hours:48},questions:[],invite:{text:'',reminders:[]},pings:{},bot:{},voice:{},brand:{},link:{},rules:{},published:null});
      ui.dialog={title:'Предпросмотр новой версии шаблона',ok:'Применить',template,preview:setup().previewTemplate(template),note:'Настройки совпадающих этапов сохранятся. Новый ИИ-модуль потребует настройки. Прогоны не перезапускаются.'};paintDialog();
    }
  },true);
  window.addEventListener('ai-stage-configured',e=>{
    if(!pendingEntry||e.detail.vacancyId!==pendingEntry.vacancyId||e.detail.stageId!==pendingEntry.target)return;
    const list=pool().filter(c=>pendingEntry.candidateIds.includes(c.id)),target=pendingEntry.target;pendingEntry=null;
    const moved=list.filter(c=>move(c,target));
    if(moved.length){location.hash='vacancy/'+vacancy();setTimeout(()=>focus(moved[0]),0);toast('Настройка подтверждена. Вход на этап запустил новый прогон');}

  });
  window.addEventListener('hashchange',()=>{
    if(pendingEntry&&location.hash!=='#vacancy/'+pendingEntry.vacancyId+'/setup')pendingEntry=null;
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){ui.dialog=null;paintDialog();}});
  return {materialize,candidates,occupied,card,axis,rowMeta,bulkBar,avatar,filter,workState,tagsOf,move,
    askMove,historyHTML,openReport,resetFilter:()=>{ui.state='';},next,
    isPaused,setPaused,demo:{complete,communication,restart,active,pool}};
})();
