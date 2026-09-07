/* Экран вакансии. Две раскладки, как в боевом Хантфлоу:
   «В работе» — список во всю ширину, конкретный этап — список + карточка. */

/* Этапы воронки — общие с экраном сведений о вакансии, лежат в shell.js */
const FUNNEL = HF.FUNNEL;

/* Лог последнего действия по кандидату — правая половина широкой строки */
const WIDE = [
  { init: 'НЕ', name: 'Никитина Елизавета', src: 'Другой источник', tag: 'Джун AI', unread: true,
    stage: 'Отправлено письмо', link: 'Ссылка на кандидата в Avito',
    note: 'ОЦЕНКА: 9.5 / 10 · Обязательные требования 🟢 перерыв в работе ⏳ не более 1 года',
    author: 'API: джун локалка', date: '30 июля 2026, 13:49' },
  { init: '—', name: 'Аноним', salary: '55 000', pos: 'Специалист по работе с качеством', org: 'Авито',
    src: 'Другой источник', tag: 'Джун AI', unread: true,
    stage: 'Отправлено письмо', link: 'Ссылка на кандидата в Avito',
    note: 'ОЦЕНКА: 10 / 10 · Обязательные требования 🟢 Грамотная письменная речь на русском',
    author: 'API: test1', date: '30 июня 2026, 20:56' },
  { init: '—', name: 'Аноним', pos: 'Контент-менеджер', org: 'Inkwood Studio',
    src: 'Другой источник', tag: 'Джун AI', unread: true,
    stage: 'Отправлено письмо', link: 'Ссылка на кандидата в Avito',
    note: 'ОЦЕНКА: 10 / 10 · Обязательные требования 🟢 Грамотная письменная речь на русском',
    author: 'API: test1', date: '30 июня 2026, 20:56' },
  { init: '—', name: 'Аноним', salary: '55 000', pos: 'Контент-менеджер', org: 'Legalbet',
    src: 'Другой источник', tag: 'Джун AI', unread: true,
    stage: 'Отправлено письмо', link: 'Ссылка на кандидата в Avito',
    note: 'ОЦЕНКА: 10 / 10 · Обязательные требования 🟢 Грамотная письменная речь на русском',
    author: 'API: test1', date: '30 июня 2026, 20:56' },
  { init: '—', name: 'Аноним', pos: 'Юрисконсульт I категории отдела правового обеспечения',
    org: 'ФГБОУ ВО «Тувинский государственный университет»',
    src: 'Другой источник', tag: 'Джун AI', unread: true,
    stage: 'Отправлено письмо', link: 'Ссылка на кандидата в Avito',
    note: 'ОЦЕНКА: 10 / 10 · Обязательные требования 🟢 Грамотная письменная речь на русском',
    author: 'API: test1', date: '30 июня 2026, 20:56' },
  { init: '—', name: 'Аноним', salary: '40 000', pos: 'Оператор call-центра', org: 'Ростелеком',
    src: 'Другой источник', tag: 'Джун AI',
    stage: 'Отправлено письмо', link: 'Ссылка на кандидата в Avito',
    note: 'ОЦЕНКА: 10 / 10 · Обязательные требования 🟢 Грамотная письменная речь на русском',
    author: 'API: test1', date: '29 июня 2026, 18:12' },
];

const vacancyId = () => (location.hash.match(/v=([\w-]+)/) || [])[1] || 'fullstack-node';
const vacancy = () => HF.VACANCIES.find((v) => v.id === vacancyId()) || HF.VACANCIES[0];

function renderFunnel(activeName) {
  document.getElementById('funnel-tabs-row').innerHTML = FUNNEL.map(([name, count, def]) => {
    const active = activeName ? name === activeName : def;
    return `<a class="ap-tab${active ? ' is-active' : ''}" href="#v=${vacancyId()}&stage=${encodeURIComponent(name)}" data-stage="${HF.esc(name)}">
      <span class="ap-tab-in">${HF.esc(name)}<span class="ap-tab-count">${count}</span></span></a>`;
  }).join('');
}

function renderWide() {
  document.getElementById('vacancy-wide').innerHTML = WIDE.map((r, i) => `
    <div class="vc-row${r.unread ? ' is-unread' : ''}" data-href="#v=${vacancyId()}&stage=${encodeURIComponent(r.stage)}">
      <span class="vc-row-card">
        <span class="vc-row-photo">${HF.esc(r.init)}</span>
        <span class="vc-row-body">
          <span class="vc-row-name">${HF.esc(r.name)}</span>
          ${r.salary ? `<span class="vc-row-info">${HF.esc(r.salary)}</span>` : ''}
          ${r.pos ? `<span class="vc-row-info">${HF.esc(r.pos)}</span>` : ''}
          ${r.org ? `<span class="vc-row-info">${HF.esc(r.org)}</span>` : ''}
          <span class="vc-row-info">Источник: ${HF.esc(r.src)}</span>
          <span class="vc-tags"><span class="vc-tag">${HF.esc(r.tag)}</span></span>
        </span>
      </span>
      <span class="vc-row-log">
        <span class="vc-log-title">${HF.esc(r.stage)}</span>
        <span class="vc-log-text"><a href="#">${HF.esc(r.link)}</a> ${HF.esc(r.note)}</span>
        <span class="vc-log-meta"><span>${HF.esc(r.author)}</span><span>${HF.esc(r.date)}</span></span>
      </span>
    </div>`).join('');
}

function apply() {
  const stage = decodeURIComponent((location.hash.match(/stage=([^&]+)/) || [])[1] || '');
  const wide = !stage || stage === 'В работе';
  renderFunnel(stage || null);
  document.getElementById('vacancy-wide').hidden = !wide;
  document.getElementById('vacancy-split').hidden = wide;
  if (wide) {
    renderWide();
  } else {
    const list = CANDIDATES.filter((c) => c.stage === stage);
    const items = list.length ? list : CANDIDATES.slice(0, 4);
    renderList(items[0].id, items);
    renderDetail(items[0]);
  }
}

/* Строка не может быть <a>: внутри неё своя ссылка на источник,
   а вложенные ссылки браузер разрывает при разборе разметки */
document.addEventListener('click', (e) => {
  if (e.target.closest('.vc-row a')) return;
  const row = e.target.closest('.vc-row[data-href]');
  if (row) location.hash = row.dataset.href;
});

addEventListener('hashchange', apply);
HF.mount({
  active: vacancyId(),
  title: `<a href="vacancy-info.html#v=${vacancyId()}">${HF.esc(vacancy().name)}</a><span class="sep">·</span><a href="#">Рефни</a>`,
});
apply();
