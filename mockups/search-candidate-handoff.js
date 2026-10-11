/* Передаёт вымышленный профиль из поиска в общий экран вакансии. Только память вкладки. */
window.SearchCandidateHandoff = (() => {
  'use strict';
  const titles = {android:'Senior Android-разработчик',designer:'Senior Product Designer',analyst:'Data Analyst',backend:'Backend-разработчик GO',ios:'Senior iOS-разработчик'};
  const stages = ['Отклик','Новый кандидат','Скоринг','Чат-бот','HR интервью','Техническое интервью','Финальное интервью','Оффер','Выход','Отказ'];
  const ownVacancy = id => Object.prototype.hasOwnProperty.call(titles,id);
  const demoId = value => /^(?:demo-search-(?:0[1-9]|[1-6]\d|7[0-2])|demo-hh-(?:0[1-9]|[12]\d|3[0-6]))$/.test(String(value || ''));
  const text = (value, max = 240) => String(value ?? '').slice(0, max);
  const clone = value => JSON.parse(JSON.stringify(value));
  let active = null;
  function safeCandidate(input) {
    const jobs = source => (Array.isArray(source) ? source : []).filter(job => job && typeof job === 'object').slice(0, 20).map(job => ({company:text(job.company),role:text(job.role),text:text(job.text,3200),years:job.years !== null && job.years !== undefined && Number.isFinite(Number(job.years)) ? Number(job.years) : null}));
    const skills = source => (Array.isArray(source) ? source : []).slice(0, 30).map(value => text(value));
    const email = text(input.contacts?.email);
    const photoIndex = Number.isInteger(input.photoIndex) && input.photoIndex >= 0 && input.photoIndex < 72 ? input.photoIndex : null;
    return {id:input.id,name:text(input.name),initials:text(input.initials,8),photoIndex,position:text(input.position || input.role),role:text(input.position || input.role),city:text(input.city),source:text(input.source),updatedAt:text(input.updatedAt),company:text(input.company),experience:jobs(input.experience),skills:skills(input.skills),education:text(input.education,1000),contacts:{email:/^[a-z0-9._+-]+@example\.(?:com|org|net)$/i.test(email) ? email : '',phone:''},consent:['given','requested','unknown'].includes(input.consent) ? input.consent : 'unknown',processes:(Array.isArray(input.processes) ? input.processes : []).filter(item => item && ownVacancy(item.vacancyId) && stages.includes(item.stage)).map(item => ({vacancyId:item.vacancyId,title:titles[item.vacancyId],stage:item.stage})),resumes:(Array.isArray(input.resumes) ? input.resumes : []).filter(resume => resume && String(resume.id).startsWith(`${input.id}-resume-`)).slice(0, 10).map(resume => ({id:text(resume.id),title:text(resume.title),position:text(resume.position),source:text(resume.source),skills:skills(resume.skills),experience:jobs(resume.experience),education:text(resume.education,1000)}))};
  }
  function open(candidate, process) {
    if (!demoId(candidate?.id) || !ownVacancy(process?.vacancyId) || !stages.includes(process?.stage)) return false;
    if (candidate.id.startsWith('demo-hh-') && (candidate.importedToATS !== true || candidate.internalHistoryAvailable !== true)) return false;
    if (!Array.isArray(candidate.processes) || !candidate.processes.some(item => item && item.vacancyId === process.vacancyId && item.stage === process.stage)) return false;
    active = {candidate:safeCandidate(candidate),vacancyId:process.vacancyId,vacancyName:titles[process.vacancyId],stage:process.stage};
    window.location.hash = `vacancy/${process.vacancyId}`;
    return true;
  }
  function forRoute(route) {
    return active && route === `vacancy/${active.vacancyId}` ? clone(active) : null;
  }
  function clear() {active = null;}
  return {open,forRoute,clear};
})();
