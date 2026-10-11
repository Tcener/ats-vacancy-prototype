/* Безопасная модель демонстрационного поиска: только вымышленные данные и локальные превью. */
window.SearchDevModel = (() => {
  'use strict';
  const now = '2026-10-11T12:00:00.000Z';
  const scopes = {all: 'Все доступные данные', resume: 'Резюме и навыки', experience: 'Опыт работы', education: 'Образование', feedback: 'Фидбек и комментарии', contacts: 'ФИО и контакты'};
  const conditions = {all: 'все слова', any: 'любое слово', phrase: 'точная фраза', not: 'не содержит'};
  const joins = {and: 'И', or: 'ИЛИ', not: 'НЕ'};
  const sources = {hh: 'hh.ru', website: 'Карьерный сайт', avito: 'Авито', linkedin: 'LinkedIn', habr: 'Хабр Карьера', other: 'Другой источник', none: 'Не указан'};
  // Площадка поиска не равна источнику появления кандидата во внутренней базе.
  const searchProviders = {ats: 'База ATS', hh: 'hh.ru'};
  const providerCatalog = Object.entries(searchProviders).map(([id, label]) => ({id, label}));
  const employment = {all: 'Все', inprocess: 'В процессах', free: 'Свободные'};
  const periods = {all: 'За всё время', month: 'За месяц', week: 'За неделю'};
  const sorts = {new: 'Сначала новые'};
  const tagLabels = ['Кадровый резерв', 'Рекомендация', 'На будущее', 'Повторный контакт', 'Легенда', 'Резерв', 'Для разработки', 'Собесо'];
  const tags = tagLabels.map(label => ({id: label, label}));
  const criterionKinds = {skills: 'Профессиональные навыки', experience: 'Профильный опыт', education: 'Обязательное образование', workMode: 'Место и формат работы', language: 'Рабочий язык', schedule: 'График работы', responsibilities: 'Профиль задач', employment: 'Участие в процессах подбора'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const fold = value => String(value ?? '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const has = (catalog, key) => Object.prototype.hasOwnProperty.call(catalog, key);
  const positiveInteger = value => String(value ?? '').trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  const defaultQuery = () => ({scope: 'all', condition: 'all', join: 'and', text: ''});
  const defaultState = () => ({queries: [defaultQuery()], employment: 'all', tags: [], excludeTags: false, source: 'all', searchProvider: 'ats', period: 'all', sort: 'new', page: 1, pageSize: 20});
  const criterion = (id, kind, text, terms, extra = {}) => ({id, kind, text, required: true, terms, ...extra});
  const stages = ['Отклик', 'Новый кандидат', 'Скоринг', 'Чат-бот', 'HR интервью', 'Техническое интервью', 'Финальное интервью', 'Оффер', 'Выход', 'Отказ'];
  const vacancies = [
    {id: 'android', title: 'Senior Android-разработчик', criteria: [criterion('android-skills', 'skills', 'Kotlin и Jetpack Compose', ['kotlin', 'jetpack compose']), criterion('android-experience', 'experience', 'Профильный опыт от 5 лет', [], {minYears: 5})]},
    {id: 'designer', title: 'Senior Product Designer', criteria: [criterion('designer-skills', 'skills', 'Figma и продуктовый дизайн', ['figma', 'продуктовый дизайн']), criterion('designer-experience', 'experience', 'Профильный опыт от 3 лет', [], {minYears: 3})]},
    {id: 'analyst', title: 'Data Analyst', criteria: [criterion('analyst-skills', 'skills', 'SQL и Python', ['sql', 'python']), criterion('analyst-experience', 'experience', 'Профильный опыт от 2 лет', [], {minYears: 2})]},
    {id: 'backend', title: 'Backend-разработчик GO', criteria: [criterion('backend-skills', 'skills', 'Go и PostgreSQL', ['go', 'postgresql']), criterion('backend-experience', 'experience', 'Профильный опыт от 3 лет', [], {minYears: 3})]},
    {id: 'ios', title: 'Senior iOS-разработчик', criteria: [criterion('ios-skills', 'skills', 'Swift и SwiftUI', ['swift', 'swiftui']), criterion('ios-experience', 'experience', 'Профильный опыт от 4 лет', [], {minYears: 4})]}
  ].map(vacancy => ({...vacancy, initialStage: 'Отклик', stages: [...stages]}));
  const profiles = [
    {position: 'Android-разработчик', skills: ['Kotlin', 'Android', 'Jetpack Compose', 'Coroutines', 'REST API'], text: 'Разработка Android-приложений на Kotlin, Jetpack Compose и Coroutines. Автоматические тесты и REST API.'},
    {position: 'Product Designer', skills: ['Figma', 'Продуктовый дизайн', 'UX', 'UI', 'Исследования'], text: 'Продуктовый дизайн, UX-исследования и прототипирование в Figma. Дизайн-системы и интерфейсы.'},
    {position: 'Data Analyst', skills: ['SQL', 'Python', 'Power BI', 'Статистика'], text: 'SQL, Python, отчётность и анализ данных. Дашборды Power BI и статистические исследования.'},
    {position: 'Go-разработчик', skills: ['Go', 'PostgreSQL', 'Docker', 'REST API'], text: 'Backend на Go, PostgreSQL и Docker. REST API и микросервисы.'},
    {position: 'iOS-разработчик', skills: ['Swift', 'SwiftUI', 'iOS', 'REST API'], text: 'Разработка iOS-приложений на Swift и SwiftUI. Работа с REST API и тестами.'},
    {position: 'Frontend-разработчик', skills: ['React', 'TypeScript', 'JavaScript', 'CSS'], text: 'Интерфейсы React и TypeScript. Компоненты, CSS и автоматическое тестирование.'}
  ];
  // Содержимое ниже — вымышленные разделы резюме для проверки читаемости, не результат парсинга.
  const careerDetails = [
    {industry: 'Мобильные приложения', faculty: 'Информационные технологии · программная инженерия', responsibilities: ['Разработка пользовательских сценариев Android-приложения на Kotlin и Jetpack Compose.', 'Работа с REST API и Coroutines, поддержка модульной архитектуры, ревью кода и автоматические тесты.'], achievements: ['Ускорение запуска приложения на 18% и снижение числа ошибок в ключевых сценариях.', 'Подготовка библиотеки повторно используемых компонентов и упрощение выпуска новых экранов.'], about: 'Разрабатываю мобильные продукты и уделяю внимание качеству пользовательских сценариев. Участвую в обсуждении архитектуры, поддерживаю понятный код и делюсь опытом с командой.'},
    {industry: 'Цифровые продукты', faculty: 'Информационные технологии · дизайн цифровых продуктов', responsibilities: ['Проведение UX-исследований, описание пользовательских сценариев и создание прототипов в Figma.', 'Развитие дизайн-системы, подготовка интерфейсов и передача макетов продуктовой команде.'], achievements: ['Сокращение числа шагов в ключевом сценарии продукта с 7 до 4.', 'Подготовка набора компонентов, который помог поддерживать единый интерфейс в новых разделах.'], about: 'Помогаю продуктовой команде находить понятные решения для сложных пользовательских задач. Соединяю исследования, прототипирование и визуальный дизайн; проверяю решения на обратной связи.'},
    {industry: 'Аналитика и данные', faculty: 'Прикладная математика и информатика', responsibilities: ['Подготовка выборок в SQL и Python, проверка качества данных и исследование продуктовых показателей.', 'Создание отчётности и дашбордов Power BI, обсуждение выводов с владельцами продукта.'], achievements: ['Сокращение времени подготовки еженедельного отчёта на 30%.', 'Внедрение проверок качества данных и единого описания показателей для продуктовой команды.'], about: 'Превращаю данные в понятные выводы для продуктовых решений. Люблю проверять гипотезы, объяснять ограничения анализа и делать отчётность удобной для ежедневной работы.'},
    {industry: 'Программные продукты', faculty: 'Информационные технологии · программная инженерия', responsibilities: ['Разработка сервисов на Go, проектирование REST API и работа с PostgreSQL.', 'Поддержка окружений Docker, разбор ошибок и повышение надёжности взаимодействия сервисов.'], achievements: ['Снижение времени ответа одного из сервисов на 22%.', 'Подготовка единых проверок и документации для безопасного выпуска новых версий.'], about: 'Разрабатываю надёжные сервисы и понятные интерфейсы взаимодействия между ними. Уделяю внимание качеству данных, наблюдаемости и поддержке решений после запуска.'},
    {industry: 'Мобильные приложения', faculty: 'Информационные технологии · программная инженерия', responsibilities: ['Разработка экранов iOS-приложения на Swift и SwiftUI, интеграция с REST API.', 'Поддержка архитектуры приложения, автоматических тестов и процесса выпуска новых версий.'], achievements: ['Снижение числа аварийных завершений в основных пользовательских сценариях.', 'Разработка повторно используемых компонентов, ускоривших подготовку новых экранов.'], about: 'Создаю мобильные интерфейсы с вниманием к деталям и стабильности приложения. Люблю работать рядом с дизайном и продуктом, проверять сценарии и улучшать качество релизов.'},
    {industry: 'Веб-приложения', faculty: 'Информационные технологии · программная инженерия', responsibilities: ['Разработка интерфейсов на React и TypeScript, поддержка компонентов и адаптивной вёрстки CSS.', 'Интеграция пользовательских сценариев, автоматическое тестирование и ревью кода.'], achievements: ['Сокращение времени загрузки ключевого экрана на 24%.', 'Подготовка общей библиотеки компонентов и устранение расхождений между разделами приложения.'], about: 'Делаю интерфейсы удобными, быстрыми и последовательными. Уделяю внимание структуре компонентов, доступности пользовательских сценариев и качеству командной работы.'}
  ];
  const monthCode = ordinal => `${Math.floor(ordinal / 12)}-${String(ordinal % 12 + 1).padStart(2, '0')}`;
  function demoExperience(profileIndex, company, totalYears, industry, external = false) {
    const profile = profiles[profileIndex], details = careerDetails[profileIndex];
    const count = totalYears >= 7 ? 4 : totalYears >= 3 ? 3 : 2;
    const halfYears = totalYears * 2, base = Math.floor(halfYears / count), remainder = halfYears % count;
    const previousCompanies = ['ДемоСтудия продукта', 'ДемоЦифровые сервисы', 'ДемоЛаборатория решений'];
    // Месяц окончания включён в период; для текущего места октябрь 2026 — месяц демоснимка.
    let nextMonth = 2026 * 12 + 10;
    return Array.from({length: count}, (_, index) => {
      const durationMonths = (base + (index < remainder ? 1 : 0)) * 6;
      const startMonth = nextMonth - durationMonths, current = index === 0;
      const job = {company: current ? company : previousCompanies[index - 1], role: profile.position,
        text: `${profile.text} ${external ? 'Вымышленное внешнее резюме.' : `Отрасль демокоманды: ${industry}.`}`,
        years: durationMonths / 12, durationMonths, startDate: monthCode(startMonth), endDate: current ? '' : monthCode(nextMonth - 1), current,
        industry: industry || details.industry,
        responsibilities: current ? [...details.responsibilities] : [details.responsibilities[index % details.responsibilities.length], 'Поддержка существующих сценариев, исправление ошибок и участие в планировании работы продуктовой команды.'],
        achievements: [details.achievements[index % details.achievements.length]]};
      nextMonth = startMonth;
      return job;
    });
  }
  function demoResumeDetails(profileIndex, totalYears, education, language, updatedAt) {
    return {
      educationDetails: /не указано/.test(education) ? [] : [{level: 'Высшее', institution: 'ДемоУниверситет цифровых технологий', faculty: careerDetails[profileIndex].faculty, qualification: 'Бакалавр', year: 2025 - Math.min(totalYears, 6)}],
      languages: [{name: 'Русский', level: 'Родной'}, {name: 'Английский', level: language.includes('B2') ? 'B2 · Выше среднего' : 'B1 · Средний'}],
      about: careerDetails[profileIndex].about, updatedAt
    };
  }
  const givenNames = ['Алексей', 'Мария', 'Дмитрий', 'Ольга', 'Павел', 'Елена', 'Никита', 'Дарья', 'Сергей', 'Анна', 'Артём', 'Вера'];
  const surnames = [['Соснов', 'Соснова'], ['Рябинин', 'Рябинина'], ['Луговой', 'Луговая'], ['Берёзов', 'Берёзова'], ['Ясный', 'Ясная'], ['Светлов', 'Светлова']];
  const cities = ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород'];
  const sourceIds = Object.keys(sources);
  const candidates = Array.from({length: 72}, (_, index) => {
    const profile = profiles[index % profiles.length], number = String(index + 1).padStart(2, '0');
    const name = `${givenNames[index % givenNames.length]} ${surnames[Math.floor(index / givenNames.length)][index % 2]}`;
    const id = `demo-search-${number}`, years = 1 + (index % 9), company = `ДемоКоманда ${1 + (index % 12)}`;
    const skills = index % 11 === 0 ? profile.skills.slice(0, 2) : [...profile.skills];
    const industry = Math.floor(index / profiles.length) % 3 === 0 ? 'Финтех' : 'Электронная коммерция';
    const experience = demoExperience(index % profiles.length, company, years, industry);
    const education = index % 8 === 0 ? 'Образование не указано в демопримере' : 'Высшее техническое образование · ДемоУниверситет';
    const source = sourceIds[index % sourceIds.length];
    const updatedAt = new Date(Date.parse(now) - index * 86400000).toISOString(), language = index % 4 === 0 ? 'Английский B2' : 'Английский B1';
    const processes = index % 3 === 0 ? [] : [{vacancyId: vacancies[index % vacancies.length].id, title: vacancies[index % vacancies.length].title, stage: stages[1 + (index % 7)]}];
    if (index === 17) processes.push({vacancyId: 'android', title: vacancies[0].title, stage: 'HR интервью'});
    const resumes = [{id: `${id}-resume-1`, title: `${profile.position} · основное резюме`, source, position: profile.position, skills: [...skills], experience: clone(experience), education, ...demoResumeDetails(index % profiles.length, years, education, language, updatedAt)}];
    if (index % 9 === 0) {
      const updatedEducation = 'Высшее техническое образование · ДемоУниверситет';
      const updatedExperience = clone(experience);
      updatedExperience[0].achievements.push(careerDetails[index % profiles.length].achievements[1]);
      resumes.push({id: `${id}-resume-2`, title: `${profile.position} · обновлённое резюме`, source: 'other', position: profile.position, skills: [...skills], experience: updatedExperience, education: updatedEducation, ...demoResumeDetails(index % profiles.length, years, updatedEducation, language, updatedAt)});
    }
    const photoIndex = Math.floor(index / 12) * 12 + Math.floor((index % 12) / 2) + (index % 2 ? 6 : 0);
    return {id, name, initials: name.split(' ').map(part => part[0]).join(''), photoIndex, searchProvider: 'ats', internalHistoryAvailable: true, position: profile.position, role: profile.position, age: 24 + (index % 18), city: cities[index % cities.length], source, updatedAt, company, experience, skills, education, feedback: index % 4 === 0 ? 'Вымышленный комментарий: открыто к предложениям, обсудить профессиональные задачи.' : 'Вымышленный комментарий: резюме проверено, уточнить опыт работы.', contacts: {email: `demo.candidate.${number}@example.com`, phone: ''}, tags: [...new Set([tagLabels[index % tagLabels.length], ...(index % 5 === 0 ? ['На будущее'] : [])])], processes, resumes, consent: index % 5 === 0 ? 'unknown' : index % 7 === 0 ? 'requested' : 'given', workMode: index % 3 === 0 ? 'Удалённая работа' : 'Гибрид', language, schedule: 'Полный день'};
  });
  const hhSurnames = [['Тихонов', 'Тихонова'], ['Северин', 'Северина'], ['Миронов', 'Миронова']];
  // Отдельная внешняя демовыдача: в ней нет контактов, заметок и истории процессов ATS.
  const hhCandidates = Array.from({length: 36}, (_, index) => {
    const profile = profiles[index % profiles.length], number = String(index + 1).padStart(2, '0');
    const id = `demo-hh-${number}`, name = `${givenNames[index % givenNames.length]} ${hhSurnames[Math.floor(index / 12)][index % 2]}`;
    const years = 2 + (index % 8), company = `ДемоHHКоманда ${index + 1}`;
    const skills = index % 10 === 0 ? profile.skills.slice(0, 2) : [...profile.skills];
    const experience = demoExperience(index % profiles.length, company, years, '', true);
    const education = index % 7 === 0 ? 'Образование не указано в демопримере' : 'Высшее техническое образование · ДемоУниверситет';
    const updatedAt = new Date(Date.parse(now) - index * 86400000).toISOString(), language = index % 4 === 0 ? 'Английский B2' : 'Английский B1';
    const photoIndex = Math.floor(index / 12) * 12 + Math.floor((index % 12) / 2) + (index % 2 ? 6 : 0);
    return {id, name, initials: name.split(' ').map(part => part[0]).join(''), photoIndex, searchProvider: 'hh', isExternal: true, importedToATS: false, internalHistoryAvailable: false, position: profile.position, role: profile.position, age: 26 + (index % 20), city: cities[(index + 2) % cities.length], source: 'hh', updatedAt, company, experience, skills, education, feedback: '', contacts: {email: '', phone: ''}, tags: [], processes: [], resumes: [{id: `${id}-resume-1`, title: `${profile.position} · деморезюме hh.ru`, source: 'hh', position: profile.position, skills: [...skills], experience: clone(experience), education, ...demoResumeDetails(index % profiles.length, years, education, language, updatedAt)}], consent: 'unknown', workMode: index % 3 === 0 ? 'Удалённая работа' : 'Гибрид', language, schedule: 'Полный день'};
  });

  function selectResultsDataset(provider, atsDataset = candidates, hhDataset = hhCandidates) {
    const internal = Array.isArray(atsDataset) ? atsDataset : candidates;
    const external = Array.isArray(hhDataset) ? hhDataset : hhCandidates;
    if (provider === 'hh') return external.filter(candidate => candidate.searchProvider === 'hh');
    return internal.filter(candidate => candidate.searchProvider !== 'hh' || candidate.importedToATS === true);
  }

  function normalizeState(input = {}) {
    const state = {...defaultState(), ...clone(input || {})};
    state.queries = Array.isArray(state.queries) && state.queries.length ? state.queries.map(query => ({scope: has(scopes, query?.scope) ? query.scope : 'all', condition: has(conditions, query?.condition) ? query.condition : 'all', join: has(joins, query?.join) ? query.join : 'and', text: String(query?.text ?? '')})) : [defaultQuery()];
    for (const [key, catalog] of [['employment', employment], ['period', periods], ['sort', sorts]]) if (!has(catalog, state[key])) state[key] = defaultState()[key];
    if (!has(searchProviders, state.searchProvider)) state.searchProvider = 'ats';
    if (state.source !== 'all' && !has(sources, state.source)) state.source = 'all';
    state.tags = Array.isArray(state.tags) ? [...new Set(state.tags.filter(tag => tagLabels.includes(tag)))] : [];
    state.excludeTags = state.excludeTags === true;
    state.page = positiveInteger(state.page) ? Number(state.page) : 1;
    state.pageSize = [20, 50].includes(Number(state.pageSize)) ? Number(state.pageSize) : 20;
    return state;
  }
  function scopeText(candidate, scope) {
    const resume = [candidate.position, ...(candidate.skills || []), ...(candidate.resumes || []).map(item => [item.title, item.position, ...(item.skills || []), item.education, ...(item.experience || []).map(job => `${job.company} ${job.role} ${job.text}`)].join(' '))].join(' ');
    const experience = (candidate.experience || []).map(item => `${item.company} ${item.role} ${item.text}`).join(' ');
    const contacts = [candidate.name, candidate.contacts?.email, candidate.contacts?.phone].filter(Boolean).join(' ');
    const fields = {resume, experience, education: candidate.education || '', feedback: candidate.feedback || '', contacts};
    // Возраст — только информационный реквизит карточки; он не попадает в поиск/оценку.
    return fold(scope === 'all' ? [candidate.name, candidate.position, candidate.city, candidate.company, ...Object.values(fields), ...(candidate.tags || [])].join(' ') : fields[scope] || '');
  }
  function matchQuery(candidate, query = defaultQuery()) {
    const text = fold(query.text), haystack = scopeText(candidate, query.scope || 'all');
    if (!text) return true;
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    const contains = token => haystack.includes(token);
    if (query.condition === 'phrase') return haystack.includes(text);
    if (query.condition === 'any') return tokens.some(contains);
    if (query.condition === 'not') return tokens.every(token => !contains(token));
    return tokens.every(contains);
  }
  function matchQueries(candidate, queryRows) {
    const rows = (Array.isArray(queryRows) ? queryRows : []).filter(row => fold(row?.text));
    if (!rows.length) return true;
    // Явный порядок слева направо: A И B ИЛИ C НЕ D = ((A && B) || C) && !D.
    return rows.slice(1).reduce((matched, row) => row.join === 'or' ? matched || matchQuery(candidate, row) : row.join === 'not' ? matched && !matchQuery(candidate, row) : matched && matchQuery(candidate, row), matchQuery(candidate, rows[0]));
  }
  function search(input = defaultState(), dataset) {
    const state = normalizeState(input), cutoff = state.period === 'month' ? Date.parse(now) - 30 * 86400000 : state.period === 'week' ? Date.parse(now) - 7 * 86400000 : null;
    const selected = Array.isArray(dataset) ? dataset : selectResultsDataset(state.searchProvider);
    const allItems = selected.filter(candidate => {
      if (candidate.searchProvider && candidate.searchProvider !== state.searchProvider && !(state.searchProvider === 'ats' && candidate.importedToATS === true)) return false;
      if (!matchQueries(candidate, state.queries)) return false;
      if (candidate.internalHistoryAvailable === false && (state.employment !== 'all' || state.tags.length || state.queries.some(query => fold(query.text) && query.scope === 'feedback'))) return false;
      const working = Boolean(candidate.processes?.length);
      if (state.employment === 'inprocess' && !working || state.employment === 'free' && working) return false;
      if (state.source !== 'all' && candidate.source !== state.source) return false;
      if (state.tags.length) {const found = state.tags.some(tag => candidate.tags?.includes(tag)); if (state.excludeTags ? found : !found) return false;}
      const updated = Date.parse(candidate.updatedAt);
      if (cutoff !== null && (!Number.isFinite(updated) || updated < cutoff || updated > Date.parse(now))) return false;
      return true;
    }).slice().sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) || String(a.id).localeCompare(String(b.id), 'ru'));
    const total = allItems.length, pages = Math.max(1, Math.ceil(total / state.pageSize)), page = Math.min(state.page, pages);
    return {items: allItems.slice((page - 1) * state.pageSize, page * state.pageSize), total, page, pageSize: state.pageSize, pages, allItems};
  }

  const skillTerms = ['jetpack compose', 'kotlin', 'android', 'coroutines', 'figma', 'продуктовый дизайн', 'ux', 'ui', 'sql', 'python', 'power bi', 'go', 'postgresql', 'docker', 'swiftui', 'swift', 'ios', 'react', 'typescript', 'javascript', 'rest api'];
  const experienceYearsPattern = /(?:опыт[а-я]*)[^.;\n\d]{0,120}?(?:от|не менее|минимум)?\s*(\d{1,2})\s*(?:лет|год[а-я]*)/;
  const reverseExperienceYearsPattern = /(\d{1,2})\s*(?:лет|год[а-я]*)\s*(?:опыт[а-я]*)/;
  const protectedPattern = /возраст|младше|старше|(?:до|от)\s+\d{2}\s*лет|\d{2}\s*[-–]\s*\d{2}\s*лет|молод[а-я]*|пенсион[а-я]*|женщин[а-я]*|мужчин[а-я]*|женск[а-я]*|мужск[а-я]*|(?:^|[^а-я])пол(?:[^а-я]|$)|женат[а-я]*|замуж[а-я]*|детей|семейн[а-я]*|беремен[а-я]*|националь[а-я]*|этнич[а-я]*|гражданств[а-я]*|религи[а-я]*|инвалид[а-я]*|здоровь[а-я]*|расов[а-я]*|\b(?:age|male|female|gender|race|religion|nationality|pregnant|disabled)\b/i;
  const protectedText = text => protectedPattern.test(fold(text).replace(experienceYearsPattern, '').replace(reverseExperienceYearsPattern, ''));
  const termPresent = (text, term) => {
    const normalized = fold(term), haystack = fold(text);
    if (['go', 'ui', 'ux', 'sql', 'ios'].includes(normalized)) return new RegExp(`(^|[^a-zа-я0-9])${normalized}([^a-zа-я0-9]|$)`, 'i').test(haystack);
    return haystack.includes(normalized);
  };
  function parseAiQuery(text) {
    const normalized = fold(text), criteria = [], warnings = [];
    if (!normalized) return {criteria, warnings: ['Опишите профессиональные требования.'], uncertain: true};
    if (protectedText(normalized)) warnings.push('Личные и защищённые характеристики не используются. Оставьте только требования, связанные с работой.');
    const add = (kind, label, terms, extra = {}) => criteria.push(criterion(`criterion-${criteria.length + 1}`, kind, label, terms, extra));
    const skills = skillTerms.filter(term => termPresent(normalized, term));
    if (/дизайнер[а-я]*/.test(normalized) && !skills.includes('продуктовый дизайн')) skills.push('продуктовый дизайн');
    if (skills.length) add('skills', `Навыки: ${skills.join(', ')}`, skills);
    const yearsMatch = normalized.match(experienceYearsPattern) || normalized.match(reverseExperienceYearsPattern);
    if (yearsMatch) add('experience', `Профильный опыт от ${Number(yearsMatch[1])} лет`, [], {minYears: Number(yearsMatch[1])});
    if (/высш[а-я]*\s+(?:техническ[а-я]*\s+)?образован[а-я]*/.test(normalized)) add('education', 'Высшее образование', ['высшее']);
    const city = cities.find(item => termPresent(normalized, item));
    const mode = /удален[а-я]*/.test(normalized) ? 'удален' : /гибрид[а-я]*/.test(normalized) ? 'гибрид' : /офис[а-я]*/.test(normalized) ? 'офис' : '';
    if (city || mode) add('workMode', [city, mode].filter(Boolean).join(' · '), [city, mode].filter(Boolean));
    if (/английск[а-я]*/.test(normalized)) add('language', 'Рабочий английский', ['английский', ...(/\bb2\b/.test(normalized) ? ['b2'] : [])]);
    if (/полный\s+день/.test(normalized)) add('schedule', 'Полный день', ['полный день']);
    if (/финтех[а-я]*/.test(normalized)) add('responsibilities', 'Опыт в финтехе', ['финтех']);
    if (/без\s+активн[а-я]*\s+процесс[а-я]*/.test(normalized) || /не\s+(?:участв[а-я]*|наход[а-я]*)\s+в\s+процесс[а-я]*/.test(normalized)) add('employment', 'Без активного процесса подбора', ['free']);
    const knownLatin = new Set([...skillTerms.flatMap(term => term.match(/[a-z][a-z0-9+#.-]*/g) || []), 'senior', 'middle', 'junior', 'backend', 'frontend', 'product', 'designer', 'data', 'analyst', 'b1', 'b2', 'c1', 'c2']);
    const unknownLatin = [...new Set((normalized.match(/[a-z][a-z0-9+#.-]*/g) || []).map(term => term.replace(/[.-]+$/, '')).filter(term => !knownLatin.has(term) && !protectedPattern.test(term)))];
    const unsupported = [];
    if (unknownLatin.length) unsupported.push(`Нераспознанное рабочее требование: ${unknownLatin.join(', ')}`);
    if (/опыт[а-я]*/.test(normalized) && !yearsMatch && !/финтех[а-я]*/.test(normalized)) unsupported.push('Уточните профиль или длительность опыта: это условие нельзя проверить по текущему демопримеру');
    if (/образован[а-я]*/.test(normalized) && !criteria.some(item => item.kind === 'education') && !/без\s+образования/.test(normalized)) unsupported.push('Уточните требование к образованию: оно требует ручной проверки');
    if (/(?:зарплат|оплат|доход|оклад)[а-я]*/.test(normalized)) unsupported.push('Уточните зарплатные условия: демопрофили не содержат зарплатных ожиданий');
    if (/(?:сертифик|допуск|лицензи|водитель)[а-я]*|права\s+категории/.test(normalized)) unsupported.push('Обязательный допуск или сертификат требует ручной проверки');
    if (/без\s+(?:опыта|образования)|кроме\s+|исключ[а-я]*\s+|не\s+(?:зна[а-я]*|уме[а-я]*|работа[а-я]*)/.test(normalized)) unsupported.push('Отрицательное профессиональное условие требует ручной проверки');
    unsupported.forEach(message => {warnings.push(`${message}. Условие не будет отброшено: нужна ручная проверка.`); add('unknown', message, []);});
    if (!criteria.length) warnings.push('В демопримере не распознаны рабочие критерии. Добавьте конкретный навык, опыт или формат работы.');
    return {criteria, warnings, uncertain: Boolean(warnings.length)};
  }
  function parseResumeQuery(text) {
    // TXT разбирается локально. Не возвращаем исходный текст, имя, контакты или возраст.
    const normalized = fold(String(text ?? '').slice(0, 200000)), warnings = [];
    if (!normalized) return {role: '', terms: [], criteria: [], warnings: ['В файле нет текста. Добавьте рабочие навыки или используйте деморезюме.'], uncertain: true};
    const terms = skillTerms.filter(term => termPresent(normalized, term));
    const roleRules = [
      ['Android-разработчик', /android|андроид/], ['Product Designer', /product\s+designer|продуктов[а-я]*\s+дизайн|дизайнер/],
      ['Data Analyst', /data\s+analyst|аналитик\s+данных/], ['Go-разработчик', /(?:^|[^a-z])go(?:[^a-z]|$)|golang/],
      ['iOS-разработчик', /(?:^|[^a-z])ios(?:[^a-z]|$)|swift/], ['Frontend-разработчик', /frontend|фронтенд/]
    ];
    const role = roleRules.find(([, pattern]) => pattern.test(normalized))?.[0] || '';
    const skillLines = String(text ?? '').slice(0, 200000).split(/\r?\n/).map(line => line.match(/(?:^|\s)(?:навыки|технологии|стек|skills|tech\s+stack)\s*[:—–-]\s*(.*)$/i)?.[1]).filter(Boolean);
    const knownWords = new Set(skillTerms.flatMap(term => term.match(/[a-z][a-z0-9+#.-]*/g) || []));
    const unknownSkill = skillLines.some(line => {
      const normalizedLine = fold(line);
      const chunks = normalizedLine.split(/[,;|]/).map(value => value.trim()).filter(Boolean);
      const unknownLatin = (normalizedLine.match(/[a-z][a-z0-9+#.-]*/g) || []).some(word => !knownWords.has(word.replace(/[.-]+$/, '')));
      return unknownLatin || chunks.some(chunk => !skillTerms.some(term => termPresent(chunk, term)) && !protectedText(chunk));
    });
    if (protectedText(normalized)) warnings.push('Личные и защищённые характеристики из резюме не участвуют в поиске похожих.');
    if (unknownSkill) warnings.push('В резюме есть навыки вне демословаря: проверьте их вручную, они не будут считаться подтверждёнными.');
    if (!terms.length) warnings.push('Не найдены знакомые рабочие навыки. Укажите их вручную или используйте деморезюме.');
    // Отдельные желательные навыки дают объяснимую долю сходства, а не жёсткий отсев.
    const criteria = terms.map((term, index) => criterion(`resume-skill-${index + 1}`, 'skills', term, [term], {required: false}));
    return {role, terms, criteria, warnings, uncertain: !terms.length || unknownSkill};
  }
  function normalizeCriterion(input, index = 0) {
    if (!input || typeof input !== 'object') return null;
    if (has(criterionKinds, input.kind) && (Array.isArray(input.terms) || input.kind === 'experience' && input.minYears !== undefined)) return {...clone(input), id: String(input.id || `criterion-${index + 1}`), text: String(input.text ?? ''), required: input.required !== false, terms: Array.isArray(input.terms) ? input.terms.map(String).filter(term => fold(term)) : [], ...(input.minYears === undefined ? {} : {minYears: Number(input.minYears)})};
    const parsed = parseAiQuery(input.text);
    if (parsed.uncertain || parsed.criteria.length !== 1) return null;
    return {...parsed.criteria[0], id: String(input.id || `criterion-${index + 1}`), text: String(input.text), required: input.required !== false};
  }
  function criterionErrors(input, index) {
    if (!input || protectedText(input.text) || (Array.isArray(input.terms) && input.terms.some(term => protectedText(term)))) return [`Критерий ${index + 1}: используйте только понятное профессиональное требование.`];
    const normalized = normalizeCriterion(input, index);
    if (!normalized) return [`Критерий ${index + 1}: выберите распознаваемое рабочее требование.`];
    if (normalized.kind === 'experience' && (!Number.isFinite(normalized.minYears) || normalized.minYears < 0 || normalized.minYears > 50)) return [`Критерий ${index + 1}: укажите профильный опыт от 0 до 50 лет.`];
    if (normalized.kind !== 'experience' && !normalized.terms.length) return [`Критерий ${index + 1}: укажите проверяемый навык или условие работы.`];
    return [];
  }
  function scoreCandidate(candidate, inputCriteria = []) {
    const errors = !Array.isArray(inputCriteria) || !inputCriteria.length ? ['Нет рабочих критериев для сравнения.'] : inputCriteria.flatMap(criterionErrors);
    if (errors.length) return {score: null, status: 'uncertain', explanations: errors.map(text => ({criterionId: '', text, status: 'unknown', required: true}))};
    const explanations = inputCriteria.map((item, index) => {
      const rule = normalizeCriterion(item, index);
      let available = true, matched = false, evidence = '';
      if (rule.kind === 'experience') {
        const jobs = Array.isArray(candidate.experience) ? candidate.experience : [];
        available = jobs.length > 0 && jobs.every(job => Number.isFinite(Number(job.years)));
        const years = jobs.reduce((sum, job) => sum + Number(job.years || 0), 0);
        matched = available && years >= rule.minYears; evidence = available ? `Вымышленный профиль: ${years} лет; нужно от ${rule.minYears}.` : 'Профильный опыт не указан.';
      } else if (rule.kind === 'employment') {
        available = Array.isArray(candidate.processes) && candidate.internalHistoryAvailable !== false;
        matched = available && rule.terms.every(term => term === 'free' ? candidate.processes.length === 0 : term === 'inprocess' ? candidate.processes.length > 0 : false);
        evidence = available ? candidate.processes.length ? 'В демопрофиле есть активный процесс подбора.' : 'В демопрофиле нет активного процесса подбора.' : 'Участие в процессах не указано.';
      } else {
        const fields = {skills: (candidate.skills || []).join(' '), education: candidate.education, workMode: [candidate.city, candidate.workMode].filter(Boolean).join(' '), language: candidate.language, schedule: candidate.schedule, responsibilities: (candidate.experience || []).map(job => `${job.text} ${job.industry || ''}`).join(' ')};
        const data = fields[rule.kind]; available = Boolean(fold(data)) && !(rule.kind === 'education' && /не указано/.test(fold(data)));
        matched = available && rule.terms.every(term => termPresent(data, term));
        evidence = available ? `Демоданные: ${data}.` : 'В демопрофиле недостаточно данных.';
      }
      return {criterionId: rule.id, kind: rule.kind, text: rule.text, required: rule.required, status: !available ? 'unknown' : matched ? 'met' : 'not_met', explanation: evidence};
    });
    if (explanations.some(item => item.status === 'unknown' && item.required)) return {score: null, status: 'uncertain', explanations};
    const known = explanations.filter(item => item.status !== 'unknown'), score = known.length ? Math.round(known.filter(item => item.status === 'met').length / known.length * 100) : null;
    return {score, status: score === null ? 'uncertain' : 'matched', explanations};
  }
  const defaultAutoPick = () => ({threshold: 75, target: 20, vacancyId: '', initialStage: '', criteria: []});
  function validateAutoPick(config = defaultAutoPick()) {
    const errors = [];
    if (String(config.threshold ?? '').trim() === '' || !Number.isFinite(Number(config.threshold)) || Number(config.threshold) < 0 || Number(config.threshold) > 100) errors.push('Порог соответствия должен быть от 0 до 100.');
    if (!positiveInteger(config.target) || Number(config.target) > 1000) errors.push('Количество кандидатов должно быть целым числом от 1 до 1000.');
    const vacancy = vacancies.find(item => item.id === config.vacancyId);
    if (!vacancy) errors.push('Выберите демовакансию.');
    if (!vacancy || !vacancy.stages.includes(config.initialStage) || ['Выход', 'Отказ'].includes(config.initialStage)) errors.push('Выберите начальный незавершающий этап вакансии.');
    if (!Array.isArray(config.criteria) || !config.criteria.length) errors.push('Добавьте хотя бы одно профессиональное требование.');
    else errors.push(...config.criteria.flatMap(criterionErrors));
    return errors;
  }
  function simulateAutoPick(config, options = {}) {
    const errors = validateAutoPick(config), dataset = Array.isArray(options.candidates) ? options.candidates : candidates;
    const usedToday = Number.isSafeInteger(Number(options.usedToday)) && Number(options.usedToday) >= 0 ? Math.min(1000, Number(options.usedToday)) : 0;
    const dailyRemaining = 1000 - usedToday;
    if (errors.length) return {results: [], errors, processed: 0, accepted: 0, uncertain: 0, skipped: 0, batches: 0, dailyRemaining, stopReason: 'invalid'};
    const batchLimit = positiveInteger(options.batches) ? Math.min(15, Number(options.batches)) : 15;
    const limit = Math.min(dataset.length, dailyRemaining, batchLimit * 20), results = [], rejected = [], uncertain = [];
    let processed = 0, skipped = 0, stopReason = '';
    for (const candidate of dataset.slice(0, limit)) {
      if (options.cancelAfter !== null && options.cancelAfter !== undefined && processed >= Math.max(0, Number(options.cancelAfter) || 0)) {stopReason = 'cancelled'; break;}
      processed++;
      if (candidate.processes?.some(process => process.vacancyId === config.vacancyId)) {skipped++; continue;}
      const scored = scoreCandidate(candidate, config.criteria);
      const result = {candidate: clone(candidate), ...scored};
      if (scored.status === 'uncertain') uncertain.push(result);
      // Порог автоподбора отдельно от обязательных требований свободного ИИ-поиска.
      else if (scored.score >= Number(config.threshold)) results.push(result);
      else rejected.push(result);
      if (results.length >= Number(config.target)) {stopReason = 'target'; break;}
    }
    if (!stopReason) stopReason = processed >= dailyRemaining && dailyRemaining < dataset.length ? 'dailyLimit' : processed >= batchLimit * 20 && batchLimit * 20 < dataset.length ? 'batchLimit' : 'datasetEnd';
    return {results, rejected, uncertainResults: uncertain, errors: [], processed, accepted: results.length, uncertain: uncertain.length, skipped, batches: Math.ceil(processed / 20), dailyRemaining: Math.max(0, dailyRemaining - processed), stopReason};
  }
  function validateSavedSearch(name) {return String(name ?? '').trim() ? String(name).trim().length > 100 ? ['Название поиска должно быть не длиннее 100 символов.'] : [] : ['Введите название поиска.'];}
  function savedQueryState(input = defaultState()) {
    const normalized = normalizeState(input), saved = {};
    // Сохранённый поиск — рецепт запроса, а не снимок сессии, лимита или подборок.
    Object.keys(defaultState()).forEach(key => {saved[key] = clone(normalized[key]);});
    saved.page = 1;
    saved.mode = input?.mode === 'ai' ? 'ai' : 'base';
    saved.aiPrompt = String(input?.aiPrompt ?? '');
    saved.aiCriteria = Array.isArray(input?.aiCriteria) ? input.aiCriteria.filter(item => item && typeof item === 'object').map(item => ({id: String(item.id ?? '').slice(0, 120), kind: String(item.kind ?? '').slice(0, 60), text: String(item.text ?? '').slice(0, 2400), required: item.required !== false, terms: Array.isArray(item.terms) ? item.terms.slice(0, 50).map(term => String(term).slice(0, 120)) : [], ...(Number.isFinite(Number(item.minYears)) && item.minYears !== null && item.minYears !== undefined ? {minYears: Number(item.minYears)} : {})})) : [];
    saved.aiOrigin = ['ai', 'resume', 'auto'].includes(input?.aiOrigin) ? input.aiOrigin : 'ai';
    const config = input?.aiSearchConfig || {}, threshold = Number(config.threshold), target = Number(config.target);
    saved.aiSearchConfig = {
      vacancyId: vacancies.some(item => item.id === config.vacancyId) ? config.vacancyId : '',
      threshold: config.threshold !== null && config.threshold !== undefined && String(config.threshold).trim() !== '' && Number.isFinite(threshold) && threshold >= 0 && threshold <= 100 ? threshold : saved.aiOrigin === 'auto' ? 75 : saved.aiOrigin === 'resume' ? 60 : 0,
      target: positiveInteger(target) && target <= 1000 ? target : 20
    };
    return saved;
  }
  let savedSequence = 0;
  function saveSnapshot(name, state, id = '') {
    const errors = validateSavedSearch(name);
    if (errors.length) return {errors};
    return {id: String(id || `saved-${Date.now().toString(36)}-${++savedSequence}`), name: String(name).trim(), state: savedQueryState(state), createdAt: now, version: 1};
  }
  function restoreSnapshot(snapshot) {return snapshot?.version === 1 && snapshot.state ? normalizeState(clone(snapshot.state)) : defaultState();}
  function previewAssignment(candidateIds, vacancyId, initialStage, resumeSelections = {}, dataset = candidates) {
    const errors = [], items = [], ids = Array.isArray(candidateIds) ? [...new Set(candidateIds)] : [];
    const vacancy = vacancies.find(item => item.id === vacancyId);
    const stage = initialStage || vacancy?.initialStage || '';
    if (!ids.length) errors.push('Выберите хотя бы одного кандидата.');
    if (!vacancy) errors.push('Выберите демовакансию.');
    if (!vacancy || !vacancy.stages.includes(stage) || ['Выход', 'Отказ'].includes(stage)) errors.push('Выберите начальный незавершающий этап вакансии.');
    ids.forEach(id => {
      const candidate = dataset.find(item => item.id === id);
      if (!candidate) {errors.push('Один из кандидатов не найден в демоданных.'); return;}
      const duplicate = Boolean(candidate.processes?.some(process => process.vacancyId === vacancyId));
      if (duplicate) errors.push(`${candidate.name}: уже есть в выбранной вакансии.`);
      const resume = candidate.resumes?.find(item => item.id === resumeSelections[id]);
      if (!resume) errors.push(`${candidate.name}: выберите резюме.`);
      items.push({candidateId: id, name: candidate.name, vacancyId, vacancyTitle: vacancy?.title || '', stage, resumeId: resume?.id || '', resumeTitle: resume?.title || '', duplicate});
    });
    return {items, errors};
  }
  const validateAssignment = (...args) => previewAssignment(...args).errors;
  const catalogs = Object.fromEntries(Object.entries({scopes, conditions, joins, sources, searchProviders, employment, periods, sorts}).map(([key, catalog]) => [key, Object.entries(catalog).map(([id, label]) => ({id, label}))]));
  return {now, scopes, conditions, joins, sources, searchProviders, providerCatalog, employment, periods, sorts, tags, criterionKinds, catalogs, candidates, hhCandidates, selectResultsDataset, vacancies, clone, fold, positiveInteger, defaultQuery, defaultState, normalizeState, scopeText, matchQuery, matchQueries, search, parseAiQuery, parseResumeQuery, scoreCandidate, defaultAutoPick, validateAutoPick, simulateAutoPick, validateSavedSearch, savedQueryState, saveSnapshot, restoreSnapshot, previewAssignment, validateAssignment};
})();
