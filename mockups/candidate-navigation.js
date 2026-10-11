/* Связывает изолированную карточку с макетом, не меняя исходный снимок. */
window.CandidateNavigation = (() => {
  const mounted = new WeakMap();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stages = [['Все','25'],['Отклик','4'],['Новый Кандидат','0'],['Скоринг','0'],['Чат-бот','0'],['HR интервью','0'],['Техническое интервью','6'],['финальное интервью','2'],['Оффер','0'],['Выход','0/1'],['Отказ','13']];
  const navigation = {'Главная':'dashboard','Вакансии':'dashboard','Поиск':'search','Мои задачи':'tasks','Задачи и уведомления':'tasks','Уведомления':'tasks','Календарь':'calendar','Аналитика':'analytics','Заявки':'requisitions','Настройки':'settings','Архив':'portfolio'};
  const vacancyLinks = {'Senior Android-разработчик':'android','B2B Sales / Менеджер B2B продаж':'android','Senior Product Designer':'designer','Data Analyst':'analyst','Backend-разработчик Go':'backend','Senior iOS-разработчик':'ios'};
  const vacancyMenu = ['Senior Android-разработчик','Senior Product Designer','Data Analyst','Backend-разработчик Go','Senior iOS-разработчик'];
  const tabs = [['resume','Резюме'],['history','История и комментарии'],['ai','ИИ-инструменты'],['chat','Переписка']];
  const styles = `
    .cn-vacancy-header{justify-content:flex-start!important;gap:12px!important;padding:8px 14px!important}
    .cn-vacancy-title{display:inline-flex;align-items:center;flex:0 1 auto;max-width:100%;min-height:46px;margin:0!important;padding:9px 14px;border:1px solid #ded7f7;border-radius:14px;background:#fff;cursor:pointer;transition:background-color .16s,color .16s}
    .cn-vacancy-title:hover{background:#f7f5fd;border-color:#cfc5f2;color:#5137c6}
    .cn-vacancy-settings{display:inline-flex;align-items:center;justify-content:center;gap:8px;flex:none;min-height:42px;padding:10px 15px;border:1px solid #ded3ff;border-radius:13px;background:#f0eaff;color:#5137c6;font:700 14px/1.25 'Manrope',system-ui,sans-serif;white-space:nowrap;cursor:pointer;transition:background-color .16s,border-color .16s}
    .cn-vacancy-settings svg{width:18px;height:18px;flex:none}.cn-vacancy-settings:hover{background:#e7ddff;border-color:#b9a3f4}
    aside[aria-label="Основная навигация"] a[data-cn-route^="vacancy/"]{color:#d9d9de!important;background:transparent!important;font-weight:500!important}aside[aria-label="Основная навигация"] a.cn-nav-current{color:#fff!important;background:rgba(255,255,255,.11)!important;font-weight:700!important}
    .cn-vacancy-title:focus-visible,.cn-vacancy-settings:focus-visible,.cn-candidate-row:focus-visible,.cn-tab:focus-visible{outline:3px solid rgba(106,75,224,.3);outline-offset:3px}
    .cn-funnel{display:flex!important;align-items:center!important;gap:2px!important;max-width:100%!important;padding:8px 12px 10px!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:thin;scrollbar-color:#d8d2ea transparent}
    .cn-stage{display:inline-flex;flex:0 0 auto;align-items:center;gap:5px;min-height:34px;padding:0 7px;border:0;border-radius:10px;background:transparent;color:#1b1a20;font:700 11.5px/1.2 'Manrope',system-ui,sans-serif;white-space:nowrap;cursor:pointer}
    .cn-stage:hover{background:#f0edf8;color:#5137c6}.cn-stage.active{background:#6a4be0;color:#fff;box-shadow:0 4px 10px rgba(106,75,224,.2)}
    .cn-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#efedf4;color:#6e6b7a;font-size:10.5px;font-weight:800}.cn-stage.active .cn-count{background:rgba(255,255,255,.2);color:#fff}
    .cn-candidate-row{cursor:pointer;background:#fff!important;box-shadow:none!important}.cn-candidate-row:hover{background:#faf8ff!important}.cn-candidate-row[aria-pressed="true"]{background:#f6f4fc!important;box-shadow:inset 4px 0 0 #6a4be0!important}
    .cn-demo{flex:999 1 640px;min-width:0;display:flex;flex-direction:column;gap:16px}.cn-demo[hidden],.cn-original[hidden]{display:none!important}
    .cn-demo-tabs{display:flex;gap:4px;padding:6px;background:#fff;border-radius:16px;overflow-x:auto}.cn-tab{flex:none;padding:0 18px;height:44px;border:0;border-radius:999px;background:transparent;color:#3a3745;font:600 16px 'Manrope',system-ui,sans-serif;white-space:nowrap}.cn-tab[aria-selected="true"]{background:#1b1a20;color:#fff}
    .cn-profile,.cn-content{background:#fff;border-radius:26px;padding:22px}.cn-profile-top{display:flex;align-items:flex-start;gap:22px}.cn-profile img{width:136px;height:162px;flex:none;border-radius:20px;object-fit:cover;object-position:center top}.cn-profile-copy{flex:1;min-width:0}.cn-profile h2{margin:0;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-.02em}.cn-role{font-size:18px;margin:12px 0;color:#2c2a35}.cn-meta{color:#6e6b7a;font-size:14px;margin:0}.cn-demo-badge{display:inline-flex;margin:14px 0 0;padding:5px 10px;border-radius:999px;background:#f0eaff;color:#5137c6;font-size:12px;font-weight:700}.cn-profile dl{display:grid;grid-template-columns:130px 1fr;gap:12px;margin:22px 0 0}.cn-profile dt{color:#6e6b7a}.cn-profile dd{margin:0;color:#8a8796}.cn-content h3{font-size:22px;margin:0 0 12px}.cn-content p{color:#6e6b7a;margin:0 0 12px}.cn-note{background:#f7f5fc;padding:16px;border-radius:16px;border:1px solid #eceaf3}.cn-demo .cn-empty{padding:36px 20px;text-align:center;color:#8a8796}
    .cn-search-row{width:100%;border:0;text-align:left;padding:18px;display:flex;gap:12px;align-items:center;font:inherit;color:#25212d}.cn-search-row[hidden],.cn-candidate-row[hidden]{display:none!important}.cn-search-avatar{display:grid;place-items:center;width:44px;height:44px;flex:none;background:#eee7fc;border-radius:14px;color:#5137c6;font-weight:800}.cn-search-row small{display:block;margin-top:4px;color:#8a8796;font-size:12px}.cn-search-profile-avatar{display:grid;place-items:center;width:136px;height:162px;flex:none;border-radius:20px;background:#eee7fc;color:#5137c6;font-size:34px;font-weight:800}.cn-search-skills{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.cn-search-skills span{padding:5px 9px;background:#f0eaff;border-radius:8px;font-size:12px;color:#5137c6}.cn-search-job+.cn-search-job{margin-top:14px}.cn-search-job strong{display:block;margin-bottom:5px}.cn-search-consent{margin:14px 0 0;padding:12px;border:1px solid #e3d8fa;border-radius:12px;background:#f7f5fc;font-size:13px}
    @media(max-width:850px){.cn-profile-top{gap:16px}.cn-profile img{width:90px;height:110px}.cn-profile h2{font-size:24px}.cn-profile,.cn-content{padding:18px}.cn-tab{padding:0 12px;font-size:14px}}
  `;

  function links(state) {
    const {doc, context} = state;
    const title = doc.querySelector('h1');
    if (title) {
      if (title.textContent !== context.vacancyName) title.textContent = context.vacancyName;
      title.classList.add('cn-vacancy-title');
      title.setAttribute('role', 'button'); title.tabIndex = 0;
      title.setAttribute('title', 'Открыть сведения и настройки вакансии');
      title.setAttribute('aria-label', `Настройки вакансии ${context.vacancyName}`);
      title.parentElement.classList.add('cn-vacancy-header');
      let settings = doc.querySelector('.cn-vacancy-settings');
      if (!settings) {
        settings = doc.createElement('button');
        settings.type = 'button'; settings.className = 'cn-vacancy-settings';
        settings.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m10 2-.5 3-2 .9L4.8 4.8 2.8 8.2 5 10v4l-2.2 1.8 2 3.4L7.5 18l2 .9.5 3h4l.5-3 2-.9 2.7 1.2 2-3.4L19 14v-4l2.2-1.8-2-3.4-2.7 1.1-2-.9-.5-3z"/></svg><span>Настройки вакансии</span>';
        title.after(settings);
      }
      settings.dataset.cnRoute = `vacancy/${context.vacancyId}/edit`;
      settings.setAttribute('title', `Открыть настройки вакансии «${context.vacancyName}»`);
    }
    const vacancyAnchors = [...doc.querySelectorAll('section[aria-label="Мои вакансии"] > a')].filter(link => link.textContent.trim() !== 'Архив');
    vacancyAnchors.slice(0, vacancyMenu.length).forEach((link, index) => {
      if (link.textContent !== vacancyMenu[index]) link.textContent = vacancyMenu[index];
    });
    doc.querySelectorAll('aside[aria-label="Основная навигация"] a').forEach(link => {
      const label = (link.querySelector(':scope > span:not([role="img"])')?.textContent || link.textContent).trim().replace(/\s*\d+\+?$/, '').trim();
      const route = link.getAttribute('aria-label') === 'Собесо — главная' ? 'dashboard' : navigation[label] || (vacancyLinks[label] ? `vacancy/${vacancyLinks[label]}` : '');
      if (!route) return;
      link.dataset.cnRoute = route;
      link.classList.toggle('cn-nav-current', route === `vacancy/${context.vacancyId}`);
      link.href = new URL(route === 'dashboard' ? 'dashboard.html?public=509f70c12929' : `ats-product.html?public=b22ccdd19b77#${route}`, state.frame.ownerDocument.location.href).href;
      link.target = '_top';
    });
  }

  function profile(state) {
    if (state.context.searchCandidate) {searchProfile(state); return;}
    const person = state.people[state.selected];
    state.rows.forEach((row, index) => row.setAttribute('aria-pressed', String(index === state.selected)));
    state.original.hidden = state.selected !== 0;
    state.demo.hidden = state.selected === 0;
    if (!state.selected) return;
    const tab = state.tab || 'resume';
    let content;
    if (tab === 'history') content = `<h3>История и комментарии</h3><div class="cn-note"><b>Данные выбранной строки</b><p>${esc(person.company)} · ${esc(person.duration)}</p><p>История действий и комментарии этого кандидата в макет не перенесены.</p></div>`;
    else if (tab === 'ai') content = `<h3>ИИ-оценка</h3><div class="cn-note"><b>${esc(person.score || 'Оценки нет')}</b><p>Это демонстрационная оценка из списка кандидатов. Подробный отчёт и результаты ИИ по этому кандидату отсутствуют.</p></div>`;
    else if (tab === 'chat') content = '<h3>Переписка</h3><div class="cn-empty">Сообщений этого кандидата в макете нет.<br>Письма и приглашения не отправляются.</div>';
    else content = `<h3>Резюме</h3><div class="cn-note"><b>${esc(person.role)}</b><p>${esc(person.company)}</p><p>Полное резюме этого кандидата в демонстрационный макет не перенесено. Опыт, контакты и обратная связь другого человека здесь не используются.</p></div>`;
    state.demo.innerHTML = `<nav class="cn-demo-tabs" aria-label="Разделы кандидата" role="tablist">${tabs.map(([id,label])=>`<button type="button" class="cn-tab" role="tab" data-cn-tab="${id}" aria-selected="${id === tab}" aria-controls="cn-demo-content">${label}</button>`).join('')}</nav><section class="cn-profile" aria-label="Блок: шапка кандидата"><div class="cn-profile-top"><img src="${esc(person.photo)}" alt="Фото: ${esc(person.name)}"><div class="cn-profile-copy"><h2>${esc(person.name)}</h2><p class="cn-role">${esc(person.role)}</p><p class="cn-meta">${esc(person.company)} · ${esc(person.duration)}</p><span class="cn-demo-badge">Демонстрационный профиль</span><dl><dt>Телефон</dt><dd>Не указан</dd><dt>Эл. почта</dt><dd>Не указана</dd><dt>Зарплата</dt><dd>Не указана</dd><dt>Вакансия</dt><dd>${esc(state.context.vacancyName)}</dd></dl></div></div></section><section class="cn-content" id="cn-demo-content" role="tabpanel" tabindex="0">${content}</section>`;
  }

  function searchProfile(state) {
    const person = state.context.searchCandidate, tab = state.tab || 'resume';
    const consent = {given:'Получено',requested:'Запрошено',unknown:'Не дано'}[person.consent] || 'Не дано';
    const jobs = (person.experience || []).map(job => `<div class="cn-note cn-search-job"><strong>${esc(job.company)}</strong><p>${esc(job.role)}${Number.isFinite(job.years) ? ` · ${esc(job.years)} лет` : ''}</p><p>${esc(job.text)}</p></div>`).join('');
    let content;
    if (tab === 'history') content = '<h3>История и комментарии</h3><div class="cn-empty">История этого демопрофиля из поиска не переносилась.<br>Комментарии другого кандидата не показываются.</div>';
    else if (tab === 'ai') content = '<h3>ИИ-инструменты</h3><div class="cn-empty">Оценка конкретного процесса не запускалась.<br>Результаты другого кандидата не используются.</div>';
    else if (tab === 'chat') content = '<h3>Переписка</h3><div class="cn-empty">Сообщений этого кандидата в макете нет.<br>Письма и приглашения не отправляются.</div>';
    else content = `<h3>Резюме</h3><div class="cn-search-skills">${(person.skills || []).map(skill=>`<span>${esc(skill)}</span>`).join('')}</div>${jobs || '<div class="cn-empty">Опыт не указан</div>'}<h3 style="margin-top:22px">Образование</h3><p>${esc(person.education || 'Не указано')}</p><h3>Версии резюме</h3>${(person.resumes || []).map(resume=>`<p>${esc(resume.title)}</p>`).join('') || '<p>Резюме не указано</p>'}`;
    state.original.hidden = true; state.demo.hidden = false;
    state.demo.innerHTML = `<nav class="cn-demo-tabs" aria-label="Разделы кандидата" role="tablist">${tabs.map(([id,label])=>`<button type="button" class="cn-tab" role="tab" data-cn-tab="${id}" aria-selected="${id === tab}" aria-controls="cn-demo-content">${label}</button>`).join('')}</nav><section class="cn-profile" aria-label="Блок: шапка кандидата"><div class="cn-profile-top"><div class="cn-search-profile-avatar" aria-hidden="true">${esc(person.initials || person.name.split(' ').map(word=>word[0]).join(''))}</div><div class="cn-profile-copy"><h2>${esc(person.name)}</h2><p class="cn-role">${esc(person.position || person.role)}</p><p class="cn-meta">${esc(person.city)} · ${esc(state.context.stage)}</p><span class="cn-demo-badge">Вымышленный профиль из поиска</span><dl><dt>Телефон</dt><dd>Не указан</dd><dt>Эл. почта</dt><dd>${esc(person.contacts?.email || 'Не указана')}</dd><dt>Вакансия</dt><dd>${esc(state.context.vacancyName)}</dd></dl><p class="cn-search-consent">Согласие на обработку данных: ${esc(consent)}</p></div></div></section><section class="cn-content" id="cn-demo-content" role="tabpanel" tabindex="0">${content}</section>`;
  }

  function searchContext(state) {
    const candidate = state.context.searchCandidate;
    state.rows.forEach(row => {row.hidden = !!candidate;});
    if (candidate) {
      if (!state.searchRow) {
        state.searchRow = state.doc.createElement('button');
        state.searchRow.type = 'button'; state.searchRow.className = 'cn-candidate-row cn-search-row';
        state.searchRow.dataset.cnSearchCandidate = 'true'; state.searchRow.tabIndex = 0;
        state.list.append(state.searchRow);
      }
      state.searchRow.hidden = false;
      state.searchRow.setAttribute('aria-label', `Открыть кандидата ${candidate.name}`);
      state.searchRow.setAttribute('aria-pressed','true');
      state.searchRow.innerHTML = `<span class="cn-search-avatar" aria-hidden="true">${esc(candidate.initials)}</span><span><b>${esc(candidate.name)}</b><small>${esc(candidate.position || candidate.role)}</small><small>${esc(state.context.stage)}</small></span>`;
    } else if (state.searchRow) state.searchRow.hidden = true;
    if (candidate || state.searchCandidateActive) {
      const stageIndex = candidate ? stages.findIndex(([label])=>label.toLocaleLowerCase('ru') === String(state.context.stage).toLocaleLowerCase('ru')) : 0;
      state.doc.querySelectorAll('[data-cn-stage]').forEach(button => {
        const selected = Number(button.dataset.cnStage) === Math.max(0, stageIndex);
        button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected));
      });
    }
    state.searchCandidateActive = !!candidate;
    profile(state);
  }

  function select(state, index) {
    state.selected = index; state.tab = 'resume'; profile(state);
  }

  function install(state) {
    const {doc} = state;
    // Ждём живой рендер: x-dc содержит шаблон, который движок затем заменяет.
    if (!doc.getElementById('dc-root') || doc.querySelector('x-dc')) return false;
    const list = doc.querySelector('aside[aria-label="Блок: список кандидатов этапа"]');
    const heading = doc.querySelector('section[aria-label="Блок: шапка кандидата"]');
    const original = heading?.closest('main');
    if (!list || !original || !doc.querySelector('h1')) return false;
    const rows = [...list.children].filter(row => row.querySelector(':scope > img') && row.querySelector('span'));
    if (rows.length !== 17) return false;
    state.rows = rows; state.list = list; state.original = original; state.people = rows.map(row => {
      const copy = row.querySelector(':scope > div');
      const parts = [...copy.children];
      const name = parts[0]?.querySelector('span')?.textContent.trim() || '';
      const facts = (parts[2]?.textContent || '').trim().split(' · ');
      return {name, photo:row.querySelector('img').src, role:parts[1]?.textContent.trim() || 'Должность не указана', company:facts[0] || 'Компания не указана', duration:facts.slice(1).join(' · '), score:row.querySelector('[aria-label^="Оценка ИИ"]')?.getAttribute('aria-label') || ''};
    });
    rows.forEach((row, index) => {
      row.classList.add('cn-candidate-row'); row.dataset.cnCandidate = String(index);
      row.setAttribute('role', 'button'); row.tabIndex = 0;
      row.setAttribute('aria-label', `Открыть кандидата ${state.people[index].name}`);
    });
    const style = doc.createElement('style'); style.id = 'cn-navigation-style'; style.textContent = styles; doc.head.append(style);
    original.classList.add('cn-original');
    state.demo = doc.createElement('main'); state.demo.className = 'cn-demo'; state.demo.hidden = true;
    state.demo.setAttribute('aria-label', 'Карточка выбранного кандидата'); original.after(state.demo);
    const funnel = doc.querySelector('[aria-label="Этапы воронки"]');
    if (funnel) {
      funnel.classList.add('cn-funnel');
      funnel.innerHTML = stages.map(([label,count],index)=>`<button type="button" class="cn-stage ${index ? '' : 'active'}" data-cn-stage="${index}" aria-pressed="${!index}"><span>${label}</span><span class="cn-count">${count}</span></button>`).join('');
    }
    [...doc.querySelectorAll('button')].filter(button => button.textContent.includes('Настройки воронки')).forEach(button => button.remove());
    links(state); select(state, 0); searchContext(state);
    const go = node => {
      const route = node.dataset.cnRoute;
      if (route === 'dashboard') state.frame.ownerDocument.defaultView.location.href = node.href;
      else state.context.navigate(route);
    };
    doc.addEventListener('click', event => {
      const target = event.target.closest?.('[data-cn-candidate], [data-cn-search-candidate], [data-cn-tab], [data-cn-stage], [data-cn-route], .cn-vacancy-title');
      if (!target) return;
      if (target.dataset.cnRoute && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button)) return;
      event.preventDefault();
      if (target.classList.contains('cn-vacancy-title')) state.context.navigate(`vacancy/${state.context.vacancyId}/edit`);
      else if (target.dataset.cnRoute) go(target);
      else if (target.dataset.cnSearchCandidate) {state.tab = 'resume'; profile(state);}
      else if (target.dataset.cnCandidate !== undefined) select(state, Number(target.dataset.cnCandidate));
      else if (target.dataset.cnTab) {state.tab = target.dataset.cnTab; profile(state); state.demo.querySelector(`[data-cn-tab="${state.tab}"]`)?.focus();}
      else if (target.dataset.cnStage !== undefined) doc.querySelectorAll('[data-cn-stage]').forEach(button => {const active = button === target; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));});
    }, true);
    doc.addEventListener('keydown', event => {
      if (!['Enter',' '].includes(event.key)) return;
      const target = event.target.closest?.('.cn-candidate-row, .cn-vacancy-title');
      if (!target) return;
      event.preventDefault(); target.click();
    }, true);
    state.ready = true;
    return true;
  }

  function connect(record) {
    let doc;
    try {doc = record.frame.contentDocument;} catch (_) {return;}
    if (!doc || doc.location.href.startsWith('about:blank')) return;
    if (record.state?.doc === doc && record.state.ready) {record.state.context = record.context; links(record.state); searchContext(record.state); return;}
    record.observer?.disconnect();
    const state = record.state = {doc, frame:record.frame, context:record.context, selected:0, ready:false};
    if (install(state)) return;
    // Снимок распаковывается асинхронно; после появления всех строк наблюдение не нужно.
    record.observer = new doc.defaultView.MutationObserver(() => {if (install(state)) record.observer.disconnect();});
    record.observer.observe(doc, {childList:true, subtree:true});
  }

  function mount(frame, context) {
    if (!frame || typeof context?.navigate !== 'function') return;
    let record = mounted.get(frame);
    if (!record) {
      record = {frame, context}; mounted.set(frame, record);
      frame.addEventListener('load', () => connect(record));
    }
    record.context = context;
    connect(record);
  }
  return {mount};
})();
