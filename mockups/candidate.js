/* Кандидат: данные и отрисовка. Общий модуль для экрана «Все кандидаты»
   и экрана вакансии — в Хантфлоу это один и тот же список и одна и та же
   панель, отличается только набор кандидатов.

   Данные вымышленные: структура повторена точно, содержимое своё. */

const esc = HF.esc;

const CANDIDATES = [
  {id:'c1', name:'Смирнова Анастасия', pos:'Product Manager · Аналитические продукты · B2B & E-Commerce',
   src:'Другой источник', stage:'Новые', vacancy:'БАЗА (База)', phone:'+7 926 000-00-01',
   email:'a.smirnova@example.com', tg:'a_smirnova', init:'СА'},
  {id:'c2', name:'Сухов Даниил', pos:'Product Manager / Product Owner', src:'Другой источник',
   stage:'Новые', vacancy:'БАЗА (База)', phone:'+7 926 000-00-02', email:'d.sukhov@example.com', tg:'d_sukhov', init:'СД'},
  {id:'c3', name:'Адамов Богдан', pos:'QA Engineer · May 2026 — Jul 2026', src:'Другой источник',
   stage:'Отправлено письмо', vacancy:'QA Automation', phone:'+7 926 000-00-03', email:'b.adamov@example.com', tg:'b_adamov', init:'АБ'},
  {id:'c4', name:'Аникеев Роман Витальевич', pos:'Backend-разработчик · Сбер', src:'Джун (отклики)',
   stage:'Новые', vacancy:'Backend-разработчик', phone:'+7 926 000-00-04', email:'r.anikeev@example.com', tg:'r_anikeev', init:'АР', age:'28 лет (9 июля 1998)'},
  {id:'c5', name:'Маргарян Лусине', pos:'Fullstack-разработчик · SoftConstruct', src:'Джун (отклики)',
   stage:'Интервью с HR', vacancy:'Fullstack-разработчик (Node)', phone:'+7 926 000-00-05', email:'l.margaryan@example.com', tg:'l_margaryan', init:'МЛ', age:'35 лет (5 марта 1991)'},
  {id:'c6', name:'Соколов Михаил', pos:'ИТ-консалтинг · Мобильные ТелеСистемы (МТС)', src:'Джун (отклики)',
   stage:'Оценка заказчиком', vacancy:'Data Analyst', phone:'+7 926 000-00-06', email:'m.sokolov@example.com', tg:'m_sokolov', init:'СМ', age:'25 лет (20 ноября 2000)'},
  {id:'c7', name:'Ковалёва Ирина', pos:'Data Scientist · ML в ритейле', src:'HeadHunter',
   stage:'Техническое собеседование', vacancy:'Data scientist', phone:'+7 926 000-00-07', email:'i.kovaleva@example.com', tg:'i_kovaleva', init:'КИ', age:'31 год (2 апреля 1995)'},
  {id:'c8', name:'Тимофеев Артём', pos:'DevOps-инженер · Kubernetes, Terraform', src:'Рекомендация',
   stage:'Выставлен оффер', vacancy:'DevOps-инженер', phone:'+7 926 000-00-08', email:'a.timofeev@example.com', tg:'a_timofeev', init:'ТА', age:'29 лет (14 января 1997)'},
];

const EVENTS = [
  ['Я','вчера, 17:23','Новые'],
  ['Я','вчера, 17:23','Взят в работу на вакансию'],
  ['Ольга Петрова','12 августа, 11:04','Отправлено письмо с приглашением на интервью'],
];

/* Список кандидатов */
function renderList(activeId, items = CANDIDATES) {
  document.getElementById('candidate-list').innerHTML = items.map(c => `
    <a class="ap-card${c.id === activeId ? ' is-active' : ''}" href="#${c.id}" data-id="${c.id}">
      <span class="ap-card-photo">${esc(c.init)}</span>
      <span class="ap-card-body">
        <span class="ap-card-name">${esc(c.name)}</span>
        ${c.age ? `<span class="ap-card-info">${esc(c.age)}</span>` : ''}
        <span class="ap-card-info">${esc(c.pos)}</span>
        <span class="ap-card-info">Источник: ${esc(c.src)}</span>
        <span class="ap-card-tag">На 1 вакансии</span>
      </span>
    </a>`).join('');
}

/* Карточка кандидата */
/* banner — плашка «похожий кандидат есть в базе». В списке всех кандидатов
   она есть, в выдаче поиска её нет: там весь экран и так про базу */
function renderDetail(c, { banner = true } = {}) {
  document.getElementById('candidate-detail').innerHTML = `
    ${banner ? `<div class="ap-banner" data-od-id="similar-banner">
      Похожий кандидат есть в базе
      <button class="ap-btn ap-btn--s" type="button">Проверить</button>
    </div>` : ''}

    <div class="ap-actions" data-od-id="candidate-actions">
      <button class="ap-btn" type="button"><svg><use href="#circle-plus"></use></svg>Взять на вакансию</button>
      <button class="ap-btn" type="button"><svg><use href="#more"></use></svg>Доп. информация</button>
      <button class="ap-btn" type="button"><svg><use href="#mail"></use></svg>Отправить</button>
      <button class="ap-btn" type="button"><svg><use href="#edit-2-20"></use></svg>Редактировать</button>
    </div>

    <div class="ap-head">
      <div class="ap-head-info">
        <div>
          <h1 class="ap-name">${esc(c.name)}</h1>
          <div class="ap-position">${esc(c.pos)}</div>
        </div>
        <dl class="ap-contacts">
          <dt><span>Телефон</span></dt>
          <dd>${esc(c.phone)}<span class="ap-messengers"><i style="background:#25D366"></i><i style="background:#29A9EB"></i><i style="background:#6A5AE0"></i></span></dd>
          <dt><span>Эл. почта</span></dt><dd>${esc(c.email)}</dd>
          <dt><span>Telegram</span></dt><dd>${esc(c.tg)}</dd>
          <dt><span>Метки</span></dt><dd><span class="ap-tag-add">Добавить</span></dd>
        </dl>
      </div>
      <div class="ap-photo"><span class="hf-avatar hf-avatar--xl" style="width:100%;height:100%;border-radius:0">${esc(c.init)}</span></div>
    </div>

    <div class="ap-stage" data-od-id="stage-card">
      <div class="ap-stage-head">
        <div>
          <h2 class="ap-stage-name">${esc(c.stage)}</h2>
          <div class="ap-stage-vacancy">${esc(c.vacancy)}</div>
        </div>
        <button class="hf-btn hf-btn--accent hf-btn--l" type="button">Сменить этап подбора</button>
      </div>
      <div class="ap-stage-body">
        <textarea class="ap-comment" placeholder="Написать комментарий"></textarea>
        <div class="ap-quick">
          ${['Письмо','Интервью','СМС','Обратная связь','Анкета','Оффер','Файл']
            .map(t => `<button class="ap-btn ap-btn--s" type="button">${t}</button>`).join('')}
        </div>
      </div>
      <div class="ap-log">
        <div class="ap-log-filter"><button class="ap-btn ap-btn--s" type="button">Действия: Все <svg><use href="#chevron-down-20"></use></svg></button></div>
        ${EVENTS.map(([author, date, text]) => `
          <div class="ap-event">
            <div class="ap-event-line"><span class="hf-avatar hf-avatar--m">${esc(author === 'Я' ? 'Я' : author.split(' ').map(w => w[0]).join(''))}</span></div>
            <div>
              <div class="ap-event-meta"><span class="ap-event-author">${esc(author)}</span><span class="ap-event-date">${esc(date)}</span></div>
              <div class="ap-event-text">${esc(text)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div class="ap-subtabs" data-od-id="candidate-subtabs">
      <button class="ap-subtab" type="button" data-subtab="notes">Личные заметки</button>
      <button class="ap-subtab is-active" type="button" data-subtab="resume">Резюме</button>
    </div>
    <div class="ap-panel">
      <div class="ap-panel-head">
        <span class="hf-muted" style="font-size:var(--hf-font-size-xxs)">Сохранено вчера в 17:23</span>
        <span style="display:flex;gap:var(--hf-spacing-s)">
          <button class="ap-btn ap-btn--s" type="button">Показать текст</button>
          <button class="ap-btn ap-btn--s" type="button">Распечатать</button>
          <button class="ap-btn ap-btn--s" type="button">Скачать</button>
        </span>
      </div>
      <div class="ap-panel-body ap-resume">
        <h4>О СЕБЕ</h4>
        <p>Более восьми лет в продуктовой аналитике и управлении продуктом. Запускала B2B-сервисы с нуля, отвечала за метрики и приоритизацию.</p>
        <h4>КЛЮЧЕВЫЕ НАВЫКИ</h4>
        <p>Продуктовая аналитика · SQL · A/B-тестирование · Управление командой · Customer Development</p>
        <h4>ЯЗЫКИ</h4>
        <p>Русский — родной. Английский — C1.</p>
        <h4>ОПЫТ РАБОТЫ</h4>
        <p>2022 — настоящее время, Product Manager, аналитические продукты B2B.<br>2018 — 2022, Аналитик, e-commerce.</p>
      </div>
    </div>`;
}
