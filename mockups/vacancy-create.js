/* Создание вакансии в основной области макета. Никаких запросов, внешних
   публикаций и копирования вакансии-образца. Запись выполняет только register. */
window.VacancyCreate = (() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const editor = () => window.VacancyEditorForm;
  // Активные уполномоченные пользователи общего демосправочника.
  const RECRUITERS = Object.freeze([
    Object.freeze({id:'u3',name:'Елена Крылова',role:'Рекрутер'}),
    Object.freeze({id:'u2',name:'Антон Беляев',role:'Руководитель рекрутмента'}),
    Object.freeze({id:'u1',name:'Ирина Николаева',role:'Администратор'})
  ]);
  // Названия и состав соответствуют опубликованным вариантам настроек вакансии.
  const FUNNELS = Object.freeze([
    {id:'it',name:'Стандартная воронка IT',stages:['Отклик','Новый Кандидат','Скоринг','Чат-бот','HR интервью','Техническое интервью','финальное интервью','Оффер','Выход','Отказ']},
    {id:'backoffice',name:'Стандартная воронка Бэкофис',stages:['Отклик','Новый кандидат','Скрининг','HR интервью','Интервью с руководителем','Проверка службы безопасности','Оффер','Выход','Отказ']},
    {id:'executive',name:'Стандартная воронка Executive Search',stages:['Отклик','Long list','Первичный контакт','Short list','Интервью с партнёром','Интервью с клиентом','Проверка рекомендаций','Оффер','Выход','Отказ']},
    {id:'mass',name:'Масс подбор',stages:['Отклик','Новый кандидат','Автоскрининг','Чат-бот','Групповое интервью','Проверка документов','Оффер','Выход','Отказ']}
  ].map(item => Object.freeze({...item,version:1,published:true,stages:Object.freeze(item.stages)})));
  const GRADES = ['Junior','Middle','Middle+','Senior','Lead'];
  const mounted = new WeakMap();
  let sequence = 0;
  const safeId = id => typeof id === 'string' && /^draft-[a-z0-9]+(?:-[a-z0-9]+)+$/.test(id);
  const freshId = () => `draft-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2,8) || 'new'}`;
  function defaults() {return {...editor().defaults({},'new-vacancy',{}),recruiterId:'',funnelId:''};}
  function validate(values = {}) {
    const errors = [];
    if (!values || typeof values !== 'object' || Array.isArray(values)) return ['Заполните сведения о новой вакансии.'];
    for (const [key,label] of [['name','название вакансии'],['department','подразделение'],['duties','обязанности'],['requirements','требования']]) if (!String(values[key] ?? '').trim()) errors.push(`Укажите ${label}.`);
    if (String(values.name ?? '').trim().length > 200) errors.push('Сократите название вакансии до 200 символов.');
    if (!GRADES.includes(values.grade)) errors.push('Выберите грейд из списка.');
    if (String(values.positions ?? '').trim() === '' || !Number.isSafeInteger(Number(values.positions)) || Number(values.positions) < 1) errors.push('План найма должен быть целым числом не меньше 1.');
    if (String(values.priority ?? '').trim() === '' || ![1,2,3].includes(Number(values.priority))) errors.push('Выберите приоритет от 1 до 3.');
    if (!RECRUITERS.some(item => item.id === values.recruiterId)) errors.push('Выберите уполномоченного рекрутера.');
    if (!FUNNELS.some(item => item.id === values.funnelId && item.published)) errors.push('Выберите опубликованную воронку.');
    return errors;
  }
  function stagesFor(funnel) {
    const manual = funnel.stages.filter(name => !['Отклик','Выход','Отказ'].includes(name));
    return [
      {id:'sys-response',kind:'system',purpose:'response',name:'Отклик',label:'Отклик',terminal:false,enabled:true,rules:{}},
      ...manual.map((name,index) => {
        const kind = ['Скоринг','Автоскрининг'].includes(name) ? 'scoring' : name === 'Чат-бот' ? 'chat-bot' : 'manual';
        return {id:`new-stage-${index + 1}`,kind,name,label:name,terminal:false,enabled:kind === 'manual',rules:{},...(kind !== 'manual' ? {score:7,published:null,questions:[],invite:{text:'',reminders:[]},pings:{on:false,items:[],reject:'не отклонять'},policy:{pass:'manual',fail:'manual',refused:false,silent:false,hours:48}} : {})};
      }),
      {id:'sys-awaiting',kind:'system',purpose:'awaiting',name:'Ожидание выхода',label:'Ожидание выхода',terminal:false,enabled:true,rules:{}},
      {id:'sys-rejection',kind:'system',purpose:'rejection',name:'Отказ',label:'Отказ',terminal:true,enabled:true,rules:{}}
    ];
  }
  function build(values, options = {}) {
    const errors = validate(values);
    if (errors.length) return {ok:false,errors};
    const clean = editor().sanitize(values,1), id = options.id ?? freshId();
    if (!clean || !safeId(id)) return {ok:false,errors:['Не удалось подготовить новую вакансию. Попробуйте ещё раз.']};
    const recruiter = RECRUITERS.find(item => item.id === values.recruiterId), funnel = FUNNELS.find(item => item.id === values.funnelId);
    const timestamp = options.createdAt ?? new Date().toISOString();
    const vacancy = {...clean,id,recruiterId:recruiter.id,recruiter:recruiter.name,funnelId:funnel.id,funnelName:funnel.name,
      pipeline:{templateId:funnel.id,name:funnel.name,version:funnel.version,published:true,stages:stagesFor(funnel)},
      status:'в работе',load:0,hires:0,waiting:0,progress:0,sla:'Не рассчитан',roles:[],
      createdAt:timestamp,startedAt:timestamp,sourceRequisition:null,approvedRequisitionVersion:null,
      participants:[{userId:recruiter.id,name:recruiter.name,function:'Рекрутер',main:true}],history:[],publications:[],aiConfigurations:[]};
    return {ok:true,vacancy};
  }
  // Для root-регистрации ДО первого VacancySetup.context(id). Сам context(newId)
  // небезопасен: без scoped state он создаёт чужой демонстрационный seed.
  function setupFor(vacancy) {
    if (!vacancy || !safeId(vacancy.id) || !FUNNELS.some(item => item.id === vacancy.funnelId) || !Array.isArray(vacancy.pipeline?.stages)) return null;
    return {title:String(vacancy.name),description:String(vacancy.description ?? ''),source:'',ats:'',autoProcessing:false,
      factors:[],faq:[],searches:[],found:[],stages:clone(vacancy.pipeline.stages),structureVersion:1,
      templateId:vacancy.funnelId,templateHistory:[],autoRejectAllowed:false};
  }
  function picker(key,label,items,current) {
    return `<label class="field"><span>${label}</span><select data-vacancy-create-field="${key}" required><option value="">Выберите из списка</option>${items.map(item => `<option value="${item.id}"${item.id === current ? ' selected' : ''}>${esc(item.name)}${item.role ? ` · ${esc(item.role)}` : ' · опубликована, v1'}</option>`).join('')}</select></label>`;
  }
  function render(draft = defaults()) {
    const fields = editor().render(draft,'new-vacancy',{creation:true});
    return `<section class="vacancy-create" aria-labelledby="vacancy-create-title">
      <header class="vacancy-create-head"><div><span class="ve68-kicker">Создание вакансии</span><h1 id="vacancy-create-title">Новая вакансия</h1><p>Заполните позицию и описание, назначьте рекрутера и выберите воронку.</p></div><button type="button" class="btn" data-vacancy-create-action="cancel">Отмена</button></header>
      <form class="vacancy-create-form" novalidate>${fields}
        <section class="ve68-edit-form vef-form vacancy-create-start"><section class="vef-section"><div class="vef-section-head"><span class="vef-step">03</span><div><h3>Начало работы</h3><p>Ответственный и опубликованная воронка нужны для начала подбора.</p></div><span class="vef-tag">Обязательные настройки</span></div><div class="form-grid">${picker('recruiterId','Основной рекрутер',RECRUITERS,draft.recruiterId)}${picker('funnelId','Воронка',FUNNELS,draft.funnelId)}</div><p class="vacancy-create-policy">ИИ-этапы остаются выключенными до настройки и отдельного подтверждения. Кандидатов, публикаций и пройденных этапов у новой вакансии пока нет.</p></section></section>
        <div class="vacancy-create-errors" data-vacancy-create-errors role="alert" hidden></div>
        <footer class="vacancy-create-footer"><p>Создание сохранит вакансию только в этом локальном макете. Объявления на площадки не отправляются.</p><div><button type="button" class="btn" data-vacancy-create-action="cancel">Отмена</button><button type="submit" class="btn primary" data-vacancy-create-action="submit">Создать вакансию</button></div></footer>
      </form></section>`;
  }
  function mount(container, options = {}) {
    if (!container?.querySelector || !container?.addEventListener) throw new TypeError('Нужна область экрана для создания вакансии.');
    mounted.get(container)?.destroy();
    const draft = defaults();
    if(options.initialValues&&typeof options.initialValues==='object')for(const key of [...editor().fields,'recruiterId','funnelId'])if(Object.hasOwn(options.initialValues,key))draft[key]=options.initialValues[key];
    container.innerHTML = render(draft);
    let busy = false, completed = false;
    const read = () => {
      const values = {};
      for (const key of editor().fields) {const input = container.querySelector(`[data-vacancy-field="${key}"]`);values[key] = key === 'confidential' ? !!input?.checked : input?.value ?? '';}
      for (const key of ['recruiterId','funnelId']) values[key] = container.querySelector(`[data-vacancy-create-field="${key}"]`)?.value ?? '';
      return values;
    };
    const showErrors = errors => {const box = container.querySelector('[data-vacancy-create-errors]');if (box) {box.hidden = !errors.length;box.innerHTML = errors.map(error => `<p>${esc(error)}</p>`).join('');}};
    const controls = () => [...container.querySelectorAll('[data-vacancy-create-action]')];
    async function submit(event) {
      event?.preventDefault();if (busy || completed) return;
      const values = read(), errors = validate(values);
      if (errors.length) {showErrors(errors);container.querySelector('[data-vacancy-create-errors]')?.scrollIntoView?.({block:'nearest'});return;}
      const form = container.querySelector('.vef-form'), collected = editor().collect(form);
      if (!collected) {showErrors(['Проверьте обязательные поля и параметры найма.']);return;}
      const result = build({...collected,recruiterId:values.recruiterId,funnelId:values.funnelId});
      if (!result.ok) {showErrors(result.errors);return;}
      if (typeof options.register !== 'function') {showErrors(['Создание сейчас недоступно. Заполненные поля сохранены на экране.']);return;}
      busy = true;controls().forEach(control => {control.disabled = true;});showErrors([]);
      try {
        const registered = await options.register(clone(result.vacancy));
        if (registered?.ok !== true) {showErrors([registered?.message || 'Не удалось создать вакансию. Проверьте данные и попробуйте ещё раз.']);return;}
        completed = true;
        const metadata = {persisted:registered.persisted === true,object:clone(result.vacancy),message:registered.persisted === true ? 'Вакансия создана и сохранена в локальном макете.' : 'Вакансия создана только для текущей страницы: локальное хранилище недоступно.'};
        if (!metadata.persisted) showErrors([metadata.message]);
        // Успешная регистрация уже завершена: ошибка маршрутизатора не должна
        // предлагать повторно создавать ту же сохранённую вакансию.
        try {options.onCreated?.(result.vacancy.id,metadata);}
        catch (_) {showErrors([`${metadata.message} Не удалось открыть её автоматически — откройте вакансию из списка.`]);}
      } catch (_) {showErrors(['Не удалось сохранить вакансию. Поля оставлены на экране — попробуйте ещё раз.']);}
      finally {busy = false;if (!completed) controls().forEach(control => {control.disabled = false;});}
    }
    function cancel() {if (!busy && !completed) options.onCancel?.();}
    function click(event) {const action = event.target.closest?.('[data-vacancy-create-action]')?.dataset.vacancyCreateAction;if (action === 'cancel') {event.preventDefault();cancel();}}
    container.addEventListener('submit',submit);container.addEventListener('click',click);
    const controller = {getDraft:() => clone(read()),submit,cancel,destroy:() => {container.removeEventListener('submit',submit);container.removeEventListener('click',click);mounted.delete(container);}};
    mounted.set(container,controller);container.querySelector('[data-vacancy-field="name"]')?.focus();return controller;
  }
  return {mount,render,defaults,validate,build,setupFor,safeId,getDraft:container => mounted.get(container)?.getDraft() ?? defaults(),
    recruiters:() => clone(RECRUITERS),funnels:() => clone(FUNNELS),setupKey:id => safeId(id) ? `sobesso-ai-vacancy-v6-${id}` : null};
})();
