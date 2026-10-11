/* ── Три режима работы одного продукта ───────────────────────────
   Режим — не настройка и не отдельная сборка. Он целиком выражается
   тем, подключён ли у вакансии внешний приёмник результата: пустой
   слот — своя ATS, заполненный — прослойка. Клиент без своей ATS —
   тот же пустой слот, просто подбор дальше идёт руками.
   Переключатель ниже существует только ради прототипа: иначе три
   режима в одном макете не показать. */
window.ProductMode = (() => {
  const KEY = 'sobesso-product-mode';

  const MODES = {
    ats: {
      name: 'Своя ATS',
      short: 'Своя ATS',
      slot: 'Результат остаётся здесь',
      hint: 'Весь подбор идёт здесь: от отклика до выхода на работу.'
    },
    layer: {
      name: 'Прослойка к чужой ATS',
      short: 'Прослойка',
      slot: 'Результат уходит в Хантфлоу',
      hint: 'Отбираем кандидатов и отдаём их в Хантфлоу. Что дальше — уже не у нас.'
    },
    board: {
      name: 'Без своей ATS',
      short: 'Без своей',
      slot: 'Дальше рекрутёр сам',
      hint: 'Отклики и отбор здесь, дальше рекрутёр связывается сам. Так продукт работает сегодня.'
    }
  };

  /* Что прячется всюду, кроме режима «Своя ATS»: не коммерческое ограничение,
     а отсутствие данных — считать по половине пути нельзя. */
  const HIDDEN_METRICS = ['ttf', 'tto', 'offer', 'nps'];
  const HIDDEN_SETTINGS = {
    offers: 'Офферы',
    approvals: 'Согласование заявок',
    delegation: 'Замещение согласующих',
    sla: 'SLA вакансий',
    'request-forms': 'Формы заявок'
  };

  let mode = localStorage.getItem(KEY) || 'ats';
  let open = false;
  let diffOpen = false;

  const lcFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = () => mode;
  const info = () => MODES[mode];
  const thin = () => mode !== 'ats';          // прослойка и «без ATS» ведут себя одинаково
  const sink = () => mode === 'layer' ? 'Хантфлоу' : null;
  const toast = text => window.dispatchEvent(new CustomEvent('cr-toast', { detail: text }));

  /* Куда уходит кандидат, когда наш кусок пути кончился. */
  const handoff = () => mode === 'layer' ? 'Передан в Хантфлоу'
    : mode === 'board' ? 'Передан рекрутёру' : null;

  /* Режим не подменяет воронку, а дописывает к ней хвост. Своя ATS ведёт
     кандидата до выхода на работу, поэтому после наших этапов появляется
     офферная часть. В остальных режимах путь кончается передачей наружу, и
     показывать после неё нечего: данных оттуда не приходит. */
  const HIRING_TAIL = [['approval', 'Согласование оффера', 0], ['offer', 'Оффер отправлен', 3]];

  const tail = () => thin()
    ? { stages: [], counts: { handed: 9 } }
    : {
      stages: HIRING_TAIL.map(([key, label]) => [key, label]),
      counts: Object.fromEntries(HIRING_TAIL.map(([key, , count]) => [key, count]))
    };

  /* Зеркало: что видно на той стороне. Приходит к нам фактом смены
     статуса и ни на что не влияет — соответствия с нашими этапами нет. */
  const MIRROR = ['Новый', 'В работе у рекрутера', 'Назначено интервью', 'Резерв'];
  const mirror = seed => {
    if (mode !== 'layer') return null;
    let h = 0; for (const ch of String(seed) + 'mirror') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return MIRROR[h % MIRROR.length];
  };

  function set(next) {
    if (!MODES[next] || next === mode) return mode;
    mode = next; localStorage.setItem(KEY, mode); open = false; diffOpen = false;
    mount(); window.dispatchEvent(new Event('cr-repaint'));
    decorate(location.hash.slice(1) || '');
    return mode;
  }

  /* ── Сравнение режимов: главное доказательство, что продукт один ── */
  const MATRIX = [
    ['Отклики с job-сайтов и приём резюме', 'yes', 'yes', 'yes'],
    ['ИИ-оценка резюме, чат-бот, голосовое интервью', 'yes', 'yes', 'yes'],
    ['Своя воронка, карточка кандидата, история', 'yes', 'yes', 'yes'],
    ['Поиск по своей базе и холодный поиск', 'yes', 'yes', 'yes'],
    ['Аналитика по откликам', 'yes', 'yes', 'yes'],
    ['Отдаём результат в чужую ATS', 'no', 'yes', 'no'],
    ['Заявки и согласование вакансии', 'yes', 'no', 'no'],
    ['Офферы и выход на работу', 'yes', 'no', 'no'],
    ['Сроки найма и конверсия полной воронки', 'yes', 'no', 'no']
  ];

  const cell = v => v === 'yes' ? '<span class="pm-yes">есть</span>'
    : v === 'no' ? '<span class="pm-no">нет</span>'
      : `<span class="pm-part">${esc(v)}</span>`;

  const diffTable = () => `<div class="pm-diff" ${diffOpen ? '' : 'hidden'}>
    <table class="pm-matrix"><thead><tr><th>Что умеет продукт</th>
      <th class="${mode === 'ats' ? 'is-now' : ''}">${esc(MODES.ats.name)}</th>
      <th class="${mode === 'layer' ? 'is-now' : ''}">${esc(MODES.layer.name)}</th>
      <th class="${mode === 'board' ? 'is-now' : ''}">${esc(MODES.board.name)}</th></tr></thead>
    <tbody>${MATRIX.map(([label, a, b, c]) => `<tr><td>${esc(label)}</td>
      <td class="${mode === 'ats' ? 'is-now' : ''}">${cell(a)}</td>
      <td class="${mode === 'layer' ? 'is-now' : ''}">${cell(b)}</td>
      <td class="${mode === 'board' ? 'is-now' : ''}">${cell(c)}</td></tr>`).join('')}</tbody></table>
    <p class="pm-matrix-note">Верх таблицы одинаков во всех трёх колонках: отбор не меняется. Расходятся только концы пути — доводим ли мы найм до выхода на работу и уходит ли результат наружу. Решает это слот приёмника у вакансии, а не отдельная сборка продукта.</p>
  </div>`;

  /* ── Заглушка: ждёт, пока на неё зайдут ───────────────────────── */
  const stub = ({ title, lead, items, note }) => `<div class="pm-stub">
    <span class="pm-stub-badge">${esc(info().name)}</span>
    <h2>${esc(title)}</h2>
    <p class="pm-stub-lead">${esc(lead)}</p>
    <ul class="pm-stub-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    ${note ? `<p class="pm-stub-note">${esc(note)}</p>` : ''}
    <div class="pm-stub-foot">
      <button class="pm-btn primary" data-pm="ask">Узнать про «Свою ATS»</button>
      <button class="pm-btn" data-pm="diff">${diffOpen ? 'Свернуть сравнение' : 'Чем отличаются режимы'}</button>
    </div>
    ${diffTable()}
  </div>`;

  const miniStub = (title, text) => `<div class="pm-stub mini"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;

  const head = (title, sub) => `<header class="pm-head"><h1>${esc(title)}</h1><p>${esc(sub)}</p></header>`;

  /* ── Экраны, которых в этих режимах нет целиком ────────────────── */
  function render(route) {
    if (!thin()) return false;
    const screen = document.getElementById('screen');
    if (!screen) return false;
    if (/^requisitions(?:\/|$)/.test(route)) {
      screen.innerHTML = head('Заявки на подбор', 'Раздел остаётся на месте — в этом режиме ему нечего показывать.')
        + stub({
          title: 'Заявок и согласований здесь нет',
          lead: mode === 'layer'
            ? 'Вакансия приходит готовой из Хантфлоу — согласовывать её в Собесо нечего.'
            : 'Вакансия создаётся сразу на job-сайте — согласовывать её в Собесо нечего.',
          items: [
            'Своя форма заявки для каждого отдела',
            'Согласование по цепочке — со сроками и напоминаниями',
            'Версии заявки и история правок',
            'Согласованная заявка становится вакансией одним нажатием'
          ],
          note: 'Появится в режиме «Своя ATS».'
        });
      return true;
    }
    return false;
  }

  /* ── Правки на чужих экранах: гасим то, для чего нет данных ────── */
  function decorate(route) {
    markNav();
    if (!thin()) { restoreHome(); return; }
    if (route === 'analytics') decorateAnalytics();
    if (route.startsWith('settings')) { decorateSettingsNav(); if (route.includes('/')) decorateSettings(route.split('/')[1]); }
    decorateHome();   // Главная живёт отдельной страницей, но показывает те же метрики
  }

  const HIDDEN_ON_HOME = ['Time to Fill', 'Time to Offer', 'Offer acceptance rate', 'NPS нанимающего'];

  function decorateHome() {
    document.querySelectorAll('.vp-analytics-card').forEach(card => {
      const name = card.querySelector('span')?.textContent || '';
      if (!HIDDEN_ON_HOME.includes(name) || card.classList.contains('pm-blank')) return;
      card.dataset.pmOrig = card.innerHTML;   // Главная не перерисовывается целиком — вернём как было
      card.classList.add('pm-blank');
      card.innerHTML = `<span>${esc(name)}</span><small>Нет данных: путь после передачи кандидата не виден</small>`;
    });
  }

  function restoreHome() {
    document.querySelectorAll('.vp-analytics-card.pm-blank').forEach(card => {
      if (card.dataset.pmOrig) { card.innerHTML = card.dataset.pmOrig; delete card.dataset.pmOrig; }
      card.classList.remove('pm-blank');
    });
  }

  function markNav() {
    document.querySelectorAll('.nav-item[data-route="requisitions"]').forEach(n => {
      n.classList.toggle('pm-dim', thin());
      const count = n.querySelector('.nav-count');
      if (count) count.hidden = thin();   // счётчиков у пустого раздела быть не должно
    });
  }

  /* Раздел, которого в режиме нет, притушен и в меню — иначе заглушка внутри
     становится неожиданностью после клика. */
  function decorateSettingsNav() {
    /* Пункты меню после прохода под Ant Design — li, а не button; плитки каталога ведут туда же. */
    document.querySelectorAll('.ws-menu [data-id], .ws-tile[data-id]').forEach(b => {
      const id = (b.dataset.id || '').split('/')[1];   // в меню лежит маршрут, а не голый раздел
      b.classList.toggle('pm-dim', thin() && !!HIDDEN_SETTINGS[id]);
    });
  }

  const HIDDEN_METRIC_NAMES = ['Time to Fill', 'Time to Offer', 'Offer acceptance rate', 'NPS нанимающего менеджера'];

  function decorateAnalytics() {
    /* Методику погашенной метрики через продукт не открыть, но переключателем
       прототипа — легко: слева «не видим», справа живое число. */
    const detail = document.querySelector('.an-detail-panel');
    if (detail && HIDDEN_METRIC_NAMES.includes(detail.querySelector('h2')?.textContent)) detail.remove();
    document.querySelectorAll('.an-kpi-card').forEach(card => {
      const id = card.querySelector('[data-an-detail]')?.dataset.anDetail;
      if (!HIDDEN_METRICS.includes(id)) return;
      const name = card.querySelector('header span')?.textContent || 'Метрика';
      card.classList.add('pm-blank');
      card.innerHTML = `<header><span>${esc(name)}</span></header>
        <div class="pm-blank-body"><b>—</b><p>Считается по тому, что происходит после передачи кандидата. Этого мы не видим.</p></div>`;
    });
    const speed = document.querySelector('.an-widget.wide');
    if (speed) replaceBody(speed, 'Скорость найма не считается',
      'Считается от заявки до выхода на работу — ни того, ни другого отсюда не видно.');
  }

  function replaceBody(widget, title, text) {
    [...widget.children].forEach(el => { if (el.tagName !== 'HEADER') el.remove(); });
    widget.querySelector('header .an-view-toggle')?.remove();
    widget.querySelector('header .an-widget-menu')?.remove();
    widget.insertAdjacentHTML('beforeend', miniStub(title, text));
  }

  function decorateSettings(section) {
    const name = HIDDEN_SETTINGS[section];
    if (!name) return;
    const content = document.getElementById('ws-content');
    if (!content) return;
    content.innerHTML = head(name, 'Раздел на месте, но настраивать в этом режиме нечего.')
      + stub({
        title: `«${name}» работает в режиме «Своя ATS»`,
        lead: section === 'sla'
          ? 'Срок закрытия считается до выхода на работу, а этой части пути мы не видим.'
          : sink() ? `Это происходит уже в ${sink()} — после того, как мы передали кандидата.`
            : 'Этот кусок процесса клиент ведёт вне системы.',
        items: [
          'Появится в режиме «Своя ATS»',
          'Ничего переносить и перенастраивать не придётся',
          'Всё, что уже накоплено, останется на месте'
        ]
      });
  }

  /* ── Переключатель прототипа ───────────────────────────────────── */
  function mount() {
    const slot = document.getElementById('pm-slot');
    if (!slot) return;
    document.querySelectorAll('body > .pm-menu').forEach(x => x.remove());
    const m = info();
    slot.innerHTML = `<button class="pm-switch ${open ? 'is-open' : ''}" data-pm="toggle" aria-expanded="${open}" title="Режим работы: ${esc(m.name)} — ${esc(lcFirst(m.slot))}">
        <span class="pm-switch-top">Режим работы</span>
        <span class="pm-switch-name">${esc(m.name)}</span>
        <span class="pm-switch-slot">${esc(m.slot)}</span>
        <span class="pm-switch-short">${esc(m.short)}</span></button>
      ${open ? `<div class="pm-menu">${Object.entries(MODES).map(([id, x]) => `
        <button class="pm-option ${id === mode ? 'is-on' : ''}" data-pm="set" data-mode="${id}">
          <b>${esc(x.name)}</b><small>${esc(x.slot)}</small><span>${esc(x.hint)}</span></button>`).join('')}
        <p class="pm-menu-note">В продукте этого переключателя нет: режим — не настройка, а заполненный или пустой слот внешнего приёмника у вакансии.</p></div>` : ''}`;
    placeMenu(slot);
  }

  /* В свёрнутой панели колонка узкая, а сама панель режет всё лишнее по краю.
     Меню туда не влезает, поэтому на узком экране кладём его поверх страницы
     рядом с кнопкой. Именно переносим в body, а не просто ставим fixed: у панели
     стеклянный backdrop-filter, и fixed внутри неё отсчитывается от панели
     и обрезается ею же. Кнопка стоит у нижнего края, поэтому меню растёт вверх. */
  function placeMenu(slot) {
    const menu = slot.querySelector('.pm-menu');
    if (!menu || !matchMedia('(max-width:1180px)').matches) return;
    const box = slot.getBoundingClientRect();
    document.body.appendChild(menu);
    Object.assign(menu.style, {
      position: 'fixed', zIndex: '1000', top: 'auto',
      left: `${Math.round(box.right + 8)}px`,
      bottom: `${Math.round(innerHeight - box.bottom)}px`
    });
  }

  document.addEventListener('click', e => {
    const hit = e.target.closest('[data-pm]');
    if (!hit) {
      if (open && !e.target.closest('#pm-slot, .pm-menu')) { open = false; mount(); }
      return;
    }
    const act = hit.dataset.pm;
    if (act === 'toggle') { open = !open; mount(); }
    else if (act === 'set') {
      set(hit.dataset.mode);
      toast(`Режим: ${info().name}`);
    } else if (act === 'diff') {
      diffOpen = !diffOpen;
      const box = document.querySelector('.pm-diff');
      if (box) { box.hidden = !diffOpen; hit.textContent = diffOpen ? 'Свернуть сравнение' : 'Чем отличаются режимы'; }
    } else if (act === 'ask') toast('Заявка отправлена: менеджер расскажет, как перейти на «Свою ATS»');
  });

  document.addEventListener('DOMContentLoaded', mount);
  if (document.readyState !== 'loading') mount();

  return { get, set, info, thin, sink, handoff, tail, mirror, render, decorate, stub, miniStub, mount, MODES };
})();
