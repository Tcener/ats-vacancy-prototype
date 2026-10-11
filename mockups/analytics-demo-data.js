/*
 * Только вымышленные демонстрационные данные, не выгрузка из ATS.
 * Основной год: 01.10.2025–30.09.2026; предшествующий год нужен для сравнения.
 * Отчёт — когорта добавленных на вакансии в периоде, её известные исходы до cutoff.
 * TTF/TTO — медианы календарных дней. Время на этапе отбирает завершённые посещения
 * по дате выхода из этапа; причины отказа — события по дате перехода в «Отказ».
 * Текущая нагрузка и current считаются на cutoff, независимо от периода отчёта.
 * «Выход» и «Отказ» — взаимоисключающие терминальные этапы, не вечные очереди.
 * Локальные фильтры ПЕРЕСЕКАЮТСЯ с глобальными: они не расширяют доступ/выборку.
 * Источник закреплён за процессом; вклад = выходы / все выходы, эффективность =
 * выходы / взятые в работу. Нельзя подменять одну долю другой.
 */
(() => {
  'use strict';
  const cutoff = '2026-09-30';
  const day = 86400000;
  const iso = value => new Date(value).toISOString().slice(0, 10);
  const dateNumber = value => Date.parse(`${value}T12:00:00Z`);
  const addDays = (value, count) => iso(dateNumber(value) + count * day);
  const round = (value, places = 1) => value == null || !Number.isFinite(value) ? null : Number(value.toFixed(places));
  const sum = list => list.reduce((total, value) => total + value, 0);
  const average = list => list.length ? sum(list) / list.length : null;
  const percentile = (list, fraction) => {
    if (!list.length) return null;
    const sorted = [...list].sort((a, b) => a - b), position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position), upper = Math.ceil(position);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  };
  const departments = [{id:'engineering',name:'Разработка'}, {id:'product',name:'Продукт'}, {id:'commercial',name:'Коммерция'}, {id:'operations',name:'Операции'}];
  const managers = [{id:'roman',name:'Роман Егоров'}, {id:'anastasia',name:'Анастасия Миронова'}, {id:'viktor',name:'Виктор Ковалёв'}, {id:'daria',name:'Дарья Соколова'}];
  const pipelines = [{id:'standard',name:'Стандартный найм'}, {id:'technical',name:'Технический найм'}, {id:'executive',name:'Найм руководителей'}];
  const recruiters = [
    {id:'elena',name:'Елена Крылова',initials:'ЕК',department:'engineering',manager:'roman',load:8,target:53},
    {id:'anton',name:'Антон Беляев',initials:'АБ',department:'engineering',manager:'roman',load:9,target:49},
    {id:'maria',name:'Мария Фролова',initials:'МФ',department:'product',manager:'anastasia',load:7,target:45},
    {id:'dmitry',name:'Дмитрий Орлов',initials:'ДО',department:'commercial',manager:'viktor',load:10,target:43},
    {id:'alexey',name:'Алексей Смирнов',initials:'АС',department:'commercial',manager:'viktor',load:8,target:40},
    {id:'irina',name:'Ирина Волкова',initials:'ИВ',department:'operations',manager:'daria',load:9,target:37}
  ];
  // Шесть исходных корзин генератора сохраняют весь остальной демонстрационный
  // год неизменным. Последняя корзина затем распределяется по реальным источникам.
  const seedSources = [
    {id:'hh',name:'hh.ru',taken:1660,hires:106,interviews:297,rejectedOffers:18,pending:6},
    {id:'avito',name:'Avito',taken:840,hires:40,interviews:125,rejectedOffers:11,pending:4},
    {id:'database',name:'Из базы',taken:430,hires:53,interviews:130,rejectedOffers:10,pending:3},
    {id:'referral',name:'Рекомендации',taken:210,hires:35,interviews:84,rejectedOffers:10,pending:0},
    {id:'habr',name:'Хабр Карьера',taken:370,hires:22,interviews:100,rejectedOffers:5,pending:2},
    {id:'other',name:'Другие источники',taken:490,hires:11,interviews:100,rejectedOffers:3,pending:3}
  ];
  const smallSources = [
    {id:'linkedin',name:'LinkedIn',taken:80}, {id:'telegram',name:'Telegram',taken:60},
    {id:'career-site',name:'Сайт компании',taken:45}, {id:'superjob',name:'SuperJob',taken:35},
    {id:'rabota',name:'Работа.ру',taken:30}, {id:'zarplata',name:'Зарплата.ру',taken:25},
    {id:'github',name:'GitHub',taken:25}, {id:'communities',name:'Профсообщества',taken:22},
    {id:'events',name:'Карьерные мероприятия',taken:20}, {id:'universities',name:'Вузы',taken:18},
    {id:'tenchat',name:'TenChat',taken:18}, {id:'vc',name:'VC.ru',taken:16},
    {id:'joon',name:'Джун',taken:15}, {id:'agency-north',name:'Агентство «Север»',taken:14},
    {id:'agency-vector',name:'Агентство «Вектор»',taken:12}, {id:'meetups',name:'Митапы',taken:12},
    {id:'alumni',name:'Сообщество выпускников',taken:9}, {id:'job-fair',name:'Ярмарка вакансий',taken:8},
    {id:'career-day',name:'День карьеры',taken:8}, {id:'unknown',name:'Источник не указан',taken:18}
  ];
  const sources = [...seedSources.slice(0,5), ...smallSources];
  const stages = [
    {id:'new',name:'Новый кандидат',weight:.7}, {id:'response',name:'Отклик',weight:.8},
    {id:'review',name:'Ревью',weight:1.5}, {id:'ai',name:'ИИ Скрининг',weight:1.8},
    {id:'hr',name:'HR интервью',weight:3.1}, {id:'interview',name:'Интервью',weight:5.4},
    {id:'test',name:'Тестовое задание',weight:3.6}, {id:'final',name:'Финальное интервью',weight:2.8},
    {id:'profile',name:'Profile Check',weight:1.3}, {id:'approval',name:'Согласование',weight:1.9},
    {id:'references',name:'Снятие рекомендаций',weight:1.5}, {id:'offer',name:'Оффер',weight:4.2},
    {id:'hire',name:'Выход',terminal:true}, {id:'reject',name:'Отказ',terminal:true}
  ];
  const reasons = [
    {id:'skills',name:'Нет ключевых навыков',count:955,initiator:'company'},
    {id:'experience',name:'Недостаточно опыта',count:730,initiator:'company'},
    {id:'salary',name:'Ожидания по зарплате',count:460,initiator:'candidate'},
    {id:'another-offer',name:'Кандидат выбрал другой оффер',count:310,initiator:'candidate'},
    {id:'no-answer',name:'Нет ответа',count:270,initiator:'automatic'},
    {id:'conditions',name:'Не подошли условия',count:210,initiator:'candidate'},
    {id:'vacancy-closed',name:'Вакансия закрыта',count:95,initiator:'company'},
    {id:'interview-result',name:'Не прошёл интервью',count:156,initiator:'company'}
  ];
  const initiators = [{id:'company',name:'Компания'}, {id:'candidate',name:'Кандидат'}, {id:'automatic',name:'Автоматизация'}];
  const monthHires = [17,18,19,20,21,22,23,24,24,25,26,28];
  const monthTaken = [275,285,295,310,320,325,335,345,355,375,390,390];
  const monthTtf = [43,42,41,39,38,36,35,34,33,31,30,29];
  const monthTto = [29,28,27,26,25,24,22,21,20,19,18,17];
  const monthNames = ['окт','ноя','дек','янв','фев','мар','апр','май','июн','июл','авг','сен'];
  const lastNames = ['Алексеев','Борисов','Власов','Гаврилов','Денисов','Ермаков','Жуков','Зайцев','Ильин','Кузнецов','Лебедев','Мартынов','Никитин','Орлов','Павлов','Романов','Сафонов','Титов','Устинов','Фёдоров','Харитонов','Чернов','Шилов','Юдин','Яковлев'];
  const firstNames = ['Александр','Максим','Дмитрий','Илья','Михаил','Иван','Артём','Андрей','Сергей','Кирилл','Антон','Виктор','Роман','Павел','Егор','Денис','Олег','Алексей','Николай','Тимофей'];
  const positions = ['Backend-разработчик','Frontend-разработчик','Product Manager','Менеджер по продажам','Руководитель направления','Бизнес-аналитик','Data Analyst','Специалист поддержки','Инженер QA','Account Manager'];
  function distributed(totals, monthly) {
    const remaining = [...totals], result = [];
    monthly.forEach((count, index) => {
      const total = sum(remaining);
      if (index === monthly.length - 1) { result.push([...remaining]); return; }
      const exact = remaining.map(value => value * count / total), portion = exact.map(Math.floor);
      let spare = count - sum(portion);
      exact.map((value, i) => ({i,remainder:value-portion[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i).forEach(item=>{if(spare>0&&portion[item.i]<remaining[item.i]){portion[item.i]++;spare--;}});
      portion.forEach((value,i)=>{remaining[i]-=value;}); result.push(portion);
    });
    return result;
  }
  function quotaList(totals) {
    const assigned = totals.map(()=>0), total = sum(totals), result = [];
    for (let index=0; index<total; index++) {
      let choice = -1, deficit = -Infinity;
      totals.forEach((target,i)=>{const next=(index+1)*target/total-assigned[i];if(assigned[i]<target&&next>deficit){choice=i;deficit=next;}});
      assigned[choice]++; result.push(choice);
    }
    return result;
  }
  function shuffle(values, seed) {
    const result = [...values]; let state = seed >>> 0;
    for (let i=result.length-1;i>0;i--) { state=(Math.imul(state,1664525)+1013904223)>>>0; const j=state%(i+1); [result[i],result[j]]=[result[j],result[i]]; }
    return result;
  }
  const idName = (list,id) => list.find(item=>item.id===id)?.name || id;
  const stageById = id => stages.find(item=>item.id===id);
  const allRecords = [];
  function buildYear(current) {
    const sources = seedSources;
    const takenTotals = sources.map(source=>current?source.taken:Math.round(source.taken*.8));
    const takenMonths = current ? monthTaken : [220,228,236,248,256,260,268,276,284,300,312,312];
    const hireTotals = current ? sources.map(source=>source.hires) : [85,32,42,28,18,9];
    const hiresMonths = current ? monthHires : [14,14,15,16,17,18,18,19,20,20,21,22];
    const rejectedOfferTotals = current ? sources.map(source=>source.rejectedOffers) : [20,12,11,10,6,4];
    const rejectedOfferMonths = current ? [5,5,5,5,5,5,5,5,5,4,4,4] : [5,5,5,5,5,5,5,5,5,6,6,6];
    const interviewTotals = current ? sources.map(source=>source.interviews) : [238,100,104,67,80,80];
    const interviewsMonths = current ? [54,56,58,60,63,66,69,73,77,81,86,93] : [44,45,46,48,50,53,55,58,61,65,69,75];
    const takenMatrix = distributed(takenTotals,takenMonths), hiredMatrix = distributed(hireTotals,hiresMonths);
    const rejectedMatrix = distributed(rejectedOfferTotals,rejectedOfferMonths), interviewMatrix=distributed(interviewTotals,interviewsMonths);
    const hireRecruiters=quotaList(current?recruiters.map(item=>item.target):[42,39,36,33,32,32]);
    const activeRecruiters=quotaList([102,94,88,81,93,89]);
    const activeCursor=recruiters.map(()=>0), activeByMonth=current?[0,0,0,0,0,0,0,0,0,126,171,250]:Array(12).fill(0);
    const yearRecords=[], hiresByMonth=[], candidatesByMonth=[];
    let hireIndex=0,activeIndex=0,recordIndex=allRecords.length;
    for(let month=0;month<12;month++) {
      const at = new Date(Date.UTC(current?2025:2024,9+month,1)), start=iso(at), candidates=[], hired=[];
      let activeRemaining=activeByMonth[month]-(current&&month===11?18:0);
      const pendingCounts=sources.map(source=>current&&month===11?source.pending:0);
      const activeEligible=takenMatrix[month].map((count,s)=>count-hiredMatrix[month][s]-rejectedMatrix[month][s]-pendingCounts[s]);
      const activeParts=current&&activeRemaining ? distributed(activeEligible,[activeRemaining,sum(activeEligible)-activeRemaining])[0] : sources.map(()=>0);
      for(let sourceIndex=0;sourceIndex<sources.length;sourceIndex++) {
        const source=sources[sourceIndex], count=takenMatrix[month][sourceIndex], hireCount=hiredMatrix[month][sourceIndex];
        const rejectedOffers=rejectedMatrix[month][sourceIndex], pending=pendingCounts[sourceIndex];
        const interviewed=interviewMatrix[month][sourceIndex];
        for(let index=0;index<count;index++) {
          const isHire=index<hireCount, isDeclined=index>=hireCount&&index<hireCount+rejectedOffers;
          const isPending=index>=hireCount+rejectedOffers&&index<hireCount+rejectedOffers+pending;
          const isActive=isPending||(index>=hireCount+rejectedOffers+pending&&index<hireCount+rejectedOffers+pending+activeParts[sourceIndex]);
          const isInterview=index<interviewed, isOffer=isHire||isDeclined||isPending;
          const recruiterIndex=isHire?hireRecruiters[hireIndex++]:isActive?activeRecruiters[activeIndex++]:(recordIndex*5+month+sourceIndex)%recruiters.length;
          const recruiter=recruiters[recruiterIndex], slot=isActive?activeCursor[recruiterIndex]++%recruiter.load:(index+sourceIndex)%3;
          const pipeline=recruiter.department==='engineering'?'technical':(slot+(isActive?11:month)+recruiterIndex)%5===0?'executive':'standard';
          const date=addDays(start,isOffer?(index%3):index%27);
          const tto=(current?monthTto[month]:monthTto[month]+5)+((recordIndex%5)-2)+(pipeline==='executive'?2:0);
          const ttf=(current?monthTtf[month]:monthTtf[month]+8)+((recordIndex%7)-3)+(pipeline==='executive'?3:0);
          const record={id:`demo-candidate-${String(recordIndex+1).padStart(5,'0')}`,personId:`demo-person-${recordIndex+1}`,name:`${firstNames[recordIndex%firstNames.length]} ${lastNames[Math.floor(recordIndex/firstNames.length)%lastNames.length]}`,date,source:source.name,sourceId:source.id,recruiter:recruiter.name,recruiterId:recruiter.id,department:idName(departments,recruiter.department),departmentId:recruiter.department,manager:idName(managers,recruiter.manager),managerId:recruiter.manager,pipeline:idName(pipelines,pipeline),pipelineId:pipeline,vacancyId:isActive?`active-${recruiter.id}-${slot}`:`demo-vacancy-${current?'26':'25'}-${month}-${recruiter.id}-${slot}`,vacancy:`${positions[(slot+recruiterIndex*2)%positions.length]} · ${isActive?'Текущий набор':String(month+1).padStart(2,'0')}`,hires:isHire,offer:isOffer,offerAccepted:isHire,offerResolved:isHire||isDeclined,interview:isInterview,active:isActive,ttf:isHire?ttf:null,tto:isOffer?tto:null,aiScore:null,aiScores:{},rejectReason:null,rejectReasonId:null,rejectInitiator:null,rejectStage:null,pauses:recordIndex%7===0?[{from:addDays(date,3),to:addDays(date,5)}]:[],stageVisits:[],stages:[],events:{'Добавлен на вакансию':date}};
          const core=['new']; if(!['database','referral'].includes(source.id)) core.push('response');
          const progress=isOffer?6:isInterview?5:isActive?2+(recordIndex%4):1+(recordIndex%4);
          if(progress>=1) core.push('review'); if(progress>=2) core.push('ai'); if(progress>=3) core.push('hr'); if(progress>=4) core.push('interview');
          if(isInterview&&pipeline==='technical') core.push('test');
          if(isInterview&&pipeline==='executive') core.push('final','profile');
          if(isOffer) {if(pipeline==='executive')core.push('approval','references');core.push('offer');}
          const preOffer=core.filter(id=>id!=='offer'), weights=sum(preOffer.map(id=>stageById(id).weight));
          let elapsed=0;
          core.forEach((stageId,visitIndex)=>{
            const stage=stageById(stageId), last=visitIndex===core.length-1;
            let duration=isOffer&&stageId!=='offer'?round(tto*stage.weight/weights,2):stage.weight*(.8+(recordIndex%5)*.1);
            if(stageId==='offer') duration=isPending?dateNumber(cutoff)/day-dateNumber(addDays(date,tto))/day:4+(recordIndex%3);
            const entered=isOffer&&stageId==='offer'?addDays(date,tto):addDays(date,elapsed);
            const enteredSafe=entered>cutoff?cutoff:entered;
            const completed=!(isActive&&last);
            if(isActive&&last) duration=Math.min(10,2+(recordIndex%9));
            const actualEntered=isActive&&last?addDays(cutoff,-duration):enteredSafe;
            const left=completed?addDays(actualEntered,duration):null;
            const actualLeft=left>cutoff?cutoff:left;
            const actualDays=completed&&left>cutoff?Math.max(0,(dateNumber(cutoff)-dateNumber(actualEntered))/day):duration;
            record.stageVisits.push({id:stageId,name:stage.name,days:round(actualDays,2),enteredAt:actualEntered,leftAt:actualLeft,entryDate:actualEntered,exitDate:actualLeft,completed});
            record.stages.push(stageId);record.events[`Вошёл на этап…:${stage.name}`]=actualEntered;record.events[`Этап «${stage.name}»`]=actualEntered;elapsed+=duration;
          });
          if(record.stages.includes('ai')) { record.aiScore=round(5.8+(recordIndex%36)/10,1);record.aiScores['ИИ Скрининг']=record.aiScore;record.aiScores['Скрининг резюме']=record.aiScore;record.aiScores['Скоринг резюме']=record.aiScore; }
          if(isOffer) {const offered=addDays(date,tto);record.events['Оффер отправлен']=offered>cutoff?cutoff:offered;}
          if(isHire) {const accepted=addDays(record.events['Оффер отправлен'],4+(recordIndex%3));record.events['Оффер принят']=accepted>cutoff?cutoff:accepted;record.events['Вышел на работу']=addDays(record.events['Оффер принят'],2)>cutoff?cutoff:addDays(record.events['Оффер принят'],2);record.events['Заявка согласована']=addDays(record.events['Оффер принят'],-ttf);record.currentStage='Выход';record.currentStageId='hire';record.stages.push('hire');record.stageVisits.push({id:'hire',name:'Выход',days:null,enteredAt:record.events['Вышел на работу'],leftAt:null,entryDate:record.events['Вышел на работу'],exitDate:record.events['Вышел на работу'],completed:true});record.events['Вошёл на этап…:Выход']=record.events['Вышел на работу'];hired.push(record);}
          else if(isActive) {record.currentStageId=core.at(-1);record.currentStage=stageById(record.currentStageId).name;}
          else {record.currentStage='Отказ';record.currentStageId='reject';record.rejectStage=stageById(core.at(-1)).name;const rejectedAt=addDays(record.stageVisits.at(-1).enteredAt,record.stageVisits.at(-1).days||1);record.events['Отказ']=rejectedAt>cutoff?cutoff:rejectedAt;record.stages.push('reject');record.stageVisits.push({id:'reject',name:'Отказ',days:null,enteredAt:record.events['Отказ'],leftAt:null,entryDate:record.events['Отказ'],exitDate:record.events['Отказ'],completed:true});record.events['Вошёл на этап…:Отказ']=record.events['Отказ'];}
          record.events['Заявка согласована'] ||= addDays(date,-10);
          record.responseHours=round(3+(recordIndex%53)/5+(recruiterIndex===4?8:0),1);
          record.slaMet=recordIndex%100<[94,91,95,90,84,93][recruiterIndex];
          record.interview=record.stages.includes('interview');
          record.screened=record.stages.includes('review')&&recordIndex%100<[84,88,79,91,64,87][recruiterIndex];record.tasksClosed=recordIndex%3===0?1:0;
          // Демо события активности отделены от когорты добавленных на вакансию.
          // Повторное использование базы не является новым добавлением в неё.
          record.baseAddedAt=source.id==='database'?addDays(date,-120):date;
          record.interviewEvents=record.stageVisits.filter(visit=>visit.completed&&['hr','interview','final'].includes(visit.id)).map(visit=>({id:`${record.id}-interview-${visit.id}`,type:{hr:'hr',interview:'tech',final:'final'}[visit.id],completedAt:visit.exitDate,outcome:'completed'}));
          record.taskEvents=record.tasksClosed?[{id:`${record.id}-task`,completedAt:addDays(date,2)>cutoff?cutoff:addDays(date,2),outcome:'completed'}]:[];
          yearRecords.push(record);candidates.push(record);recordIndex++;
        }
      }
      candidatesByMonth.push(candidates);hiresByMonth.push(hired);
    }
    const declined=yearRecords.filter(record=>record.offerResolved&&!record.offerAccepted);
    declined.forEach((record,index)=>{const reason=reasons.find(item=>item.id===(index%2?'salary':'another-offer'));record.rejectReasonId=reason.id;record.rejectReason=reason.name;record.rejectInitiator=reason.initiator;});
    const otherRejected=yearRecords.filter(record=>record.currentStageId==='reject'&&!record.offerResolved);
    const reasonTotals=current?reasons.map(reason=>reason.count-declined.filter(record=>record.rejectReasonId===reason.id).length):reasons.map(reason=>Math.round(reason.count*.9));
    if(!current) {const difference=otherRejected.length-sum(reasonTotals);reasonTotals[0]+=difference;}
    const reasonList=quotaList(reasonTotals);
    otherRejected.forEach((record,index)=>{const reason=reasons[reasonList[index]];record.rejectReasonId=reason.id;record.rejectReason=reason.name;record.rejectInitiator=reason.initiator;});
    const npsCounts=current?[14,14,15,15,16,16,17,17,18,18,20,20]:[12,12,12,13,13,14,14,15,15,16,17,17];
    const promoters=current?[8,8,9,9,10,11,11,12,13,13,15,15]:[6,6,6,7,7,8,8,8,9,9,10,10];
    const detractors=current?[3,3,3,3,3,2,2,2,2,1,1,1]:[3,3,3,3,3,3,3,3,3,3,2,2];
    const csiCounts=current?[61,62,64,66,68,70,71,73,76,79,84,86]:[49,50,51,53,54,56,57,58,61,63,67,69];
    const csiDeficits=[37,36,35,33,31,29,27,25,24,24,22,21];
    const csiTwos=[2,2,2,2,2,2,1,1,1,1,1,1],csiThrees=[6,6,5,5,5,4,4,4,4,3,3,3];
    for(let month=0;month<12;month++) {
      const pool=[...Array(promoters[month]).fill(9),...Array(detractors[month]).fill(5),...Array(npsCounts[month]-promoters[month]-detractors[month]).fill(8)];
      shuffle(pool,month+17).forEach((score,index)=>{const record=hiresByMonth[month][Math.floor(index*hiresByMonth[month].length/pool.length)];if(record)record.npsScore=score;});
      const ones=current&&month<8?1:0,twos=current?csiTwos[month]:2,threes=current?csiThrees[month]:6;
      const fours=current?csiDeficits[month]-4*ones-3*twos-2*threes:Math.round(csiCounts[month]*.3);
      const csiPool=[...Array(ones).fill(1),...Array(twos).fill(2),...Array(threes).fill(3),...Array(fours).fill(4),...Array(csiCounts[month]-ones-twos-threes-fours).fill(5)];
      shuffle(csiPool,month+71).forEach((score,index)=>{const record=candidatesByMonth[month][Math.floor(index*candidatesByMonth[month].length/csiPool.length)];record.csiScore=score;});
    }
    allRecords.push(...yearRecords);
  }
  buildYear(false);buildYear(true);
  // «Другие» — только представление аналитики, никогда не источник процесса.
  // Перераспределяем исходную малую корзину после генерации, не меняя кандидатов,
  // даты, стадии, исходы, опросы, нагрузку и показатели команды.
  for (const current of [false,true]) {
    const records=allRecords.filter(record=>record.sourceId==='other'&&(record.date>='2025-10-01')===current);
    const remaining=distributed(smallSources.map(source=>source.taken),[records.length,490-records.length])[0];
    const groups=[records.filter(record=>record.hires),records.filter(record=>!record.hires&&record.offerResolved),records.filter(record=>record.offer&&!record.offerResolved),records.filter(record=>!record.offer)];
    for (const group of groups) {
      if(!group.length)continue;
      const portion=distributed(remaining,[group.length,sum(remaining)-group.length])[0];
      const assignments=quotaList(portion);
      group.forEach((record,index)=>{const source=smallSources[assignments[index]];record.sourceId=source.id;record.source=source.name;});
      portion.forEach((count,index)=>{remaining[index]-=count;});
    }
  }
  const vacancies=[...new Map(allRecords.map(record=>[record.vacancyId,{id:record.vacancyId,name:`${record.vacancy} · ${record.recruiter}`}])).values()];
  function parseDate(value) {
    if(!value)return null;
    const raw=String(value).trim(),match=raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    const result=match?`${match[3]}-${match[2]}-${match[1]}`:raw;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||!Number.isFinite(dateNumber(result))||iso(dateNumber(result))!==result)return null;
    return result;
  }
  function rangeFor(filters={}) {
    const period=filters.period||'Последний год';let from='2025-10-01',to=cutoff;
    if(period==='Последние полгода'||period==='Полгода')from='2026-04-01';
    else if(period==='Текущий квартал'||period==='Квартал')from='2026-07-01';
    else if(period==='Последние 30 дней'||period==='Месяц')from='2026-09-01';
    else if(/Свой|диапазон/i.test(period)){from=parseDate(filters.from);to=parseDate(filters.to);}
    if(filters.from&&filters.to&&(!filters.period||/Свой|диапазон/i.test(period))){from=parseDate(filters.from);to=parseDate(filters.to);}
    return {from,to,label:period,invalid:!from||!to||from>to||to>cutoff};
  }
  const dimensionLists={recruiter:recruiters,department:departments,manager:managers,pipeline:pipelines,source:sources,stage:stages,reason:reasons,rejectInitiator:initiators,vacancy:vacancies};
  function normalValue(key,value) {
    if(value==null||value===''||/^Все(?: |$)/i.test(String(value))||value==='Период экрана')return '';
    const list=dimensionLists[key]||[];
    if(key==='rejectInitiator') {const alias={'Работодатель':'company','Рекрутер':'company','Автоматически':'automatic','Автоматический':'automatic','ИИ':'automatic'};if(alias[value])return alias[value];}
    if(key==='stage') {const alias={'Скоринг резюме':'ai','Скрининг резюме':'ai','Новые':'new','Вышел на работу':'hire','rejected':'reject'};if(alias[value])return alias[value];}
    return list.find(item=>item.id===value||item.name===value)?.id||String(value);
  }
  const aliases={pipeline:['pipeline','template','funnel','funnelTemplate'],rejectInitiator:['rejectInitiator','initiator']};
  const valueFor=(filters,key)=>(aliases[key]||[key]).map(alias=>filters[alias]).find(value=>value!=null&&value!=='')||'';
  function scopes(global={},local={}) {
    const values={};let incompatible=false;
    Object.keys(dimensionLists).forEach(key=>{const a=normalValue(key,valueFor(global,key)),b=normalValue(key,valueFor(local,key));if(a&&b&&a!==b)incompatible=true;values[key]=a||b;});
    const a=rangeFor(global),b=local.period&&local.period!=='Период экрана'?rangeFor(local):a;
    const from=a.from&&b.from?(a.from>b.from?a.from:b.from):null,to=a.to&&b.to?(a.to<b.to?a.to:b.to):null;
    return {values,incompatible,range:{from,to,label:b.label,invalid:a.invalid||b.invalid||!from||!to||from>to}};
  }
  function matches(record,values) {
    return Object.entries(values).every(([key,value])=>!value||(key==='stage'?record.stages.includes(value):key==='reason'?record.rejectReasonId===value:key==='rejectInitiator'?record.rejectInitiator===value:record[`${key}Id`]===value));
  }
  function kpisFor(records) {
    const filled=records.filter(record=>record.ttf!=null),offered=records.filter(record=>record.tto!=null);
    const resolved=records.filter(record=>record.offerResolved),accepted=resolved.filter(record=>record.offerAccepted);
    const nps=records.filter(record=>record.npsScore!=null),csi=records.filter(record=>record.csiScore!=null);
    const promoters=nps.filter(record=>record.npsScore>=9).length,detractors=nps.filter(record=>record.npsScore<=6).length;
    return {ttf:round(percentile(filled.map(record=>record.ttf),.5)),tto:round(percentile(offered.map(record=>record.tto),.5)),acceptance:round(resolved.length?accepted.length/resolved.length*100:null),nps:round(nps.length?(promoters-detractors)/nps.length*100:null,0),csi:round(average(csi.map(record=>record.csiScore))),counts:{ttf:filled.length,tto:offered.length,offersResolved:resolved.length,offersAccepted:accepted.length,nps:nps.length,csi:csi.length,npsPromoters:promoters,npsDetractors:detractors,npsPassives:nps.length-promoters-detractors},deltas:{}};
  }
  function previousRange(range) {
    if(range.invalid)return {from:null,to:null};
    const first=new Date(`${range.from}T12:00:00Z`),last=new Date(`${range.to}T12:00:00Z`);
    if(first.getUTCDate()===1&&addDays(range.to,1).endsWith('-01')) {
      const months=(last.getUTCFullYear()-first.getUTCFullYear())*12+last.getUTCMonth()-first.getUTCMonth()+1;
      return {from:iso(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()-months,1))),to:addDays(range.from,-1)};
    }
    const length=(dateNumber(range.to)-dateNumber(range.from))/day+1;
    return {from:addDays(range.from,-length),to:addDays(range.from,-1)};
  }
  function query(global={},local={}) {
    const scope=scopes(global,local),range=scope.range;
    const scoped=scope.incompatible?[]:allRecords.filter(record=>matches(record,scope.values));
    const records=range.invalid?[]:scoped.filter(record=>record.date>=range.from&&record.date<=range.to);
    const currentRecords=scoped.filter(record=>record.active), previous=previousRange(range);
    const eventInRange=value=>!range.invalid&&value&&value>=range.from&&value<=range.to;
    const stageRecords=scoped.filter(record=>record.stageVisits.some(visit=>visit.completed&&eventInRange(visit.exitDate)));
    const rejectionRecords=scoped.filter(record=>eventInRange(record.events['Отказ']));
    const activityRecords=scoped.filter(record=>eventInRange(record.baseAddedAt)||eventInRange(record.events['Оффер отправлен'])||record.interviewEvents.some(event=>eventInRange(event.completedAt))||record.taskEvents.some(event=>eventInRange(event.completedAt)));
    const prior=previous.from?scoped.filter(record=>record.date>=previous.from&&record.date<=previous.to):[];
    const kpis=kpisFor(records),priorKpis=kpisFor(prior);
    ['ttf','tto','acceptance','nps','csi'].forEach(key=>{kpis.deltas[key]=kpis[key]!=null&&priorKpis[key]!=null?round(kpis[key]-priorKpis[key]):null;});
    const months=[];
    if(!range.invalid) {let cursor=new Date(`${range.from.slice(0,7)}-01T12:00:00Z`);while(iso(cursor)<=range.to){const key=iso(cursor).slice(0,7),subset=records.filter(record=>record.date.startsWith(key)),metrics=kpisFor(subset);months.push({id:key,label:`${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][cursor.getUTCMonth()]} ${String(cursor.getUTCFullYear()).slice(-2)}`,ttf:metrics.ttf,tto:metrics.tto,nps:metrics.nps,csi:metrics.csi,hires:subset.filter(record=>record.hires).length,counts:metrics.counts});cursor.setUTCMonth(cursor.getUTCMonth()+1);}}
    const sourceRows=sources.map(source=>{const subset=records.filter(record=>record.sourceId===source.id);return {id:source.id,name:source.name,taken:subset.length,candidatesTaken:subset.length,interviews:subset.filter(record=>record.interview).length,offers:subset.filter(record=>record.offer).length,hires:subset.filter(record=>record.hires).length};});
    const stageRows=stages.map(stage=>{const visits=stageRecords.flatMap(record=>record.stageVisits.filter(visit=>visit.id===stage.id&&visit.completed&&eventInRange(visit.exitDate))),completed=visits.filter(visit=>visit.days!=null);return {id:stage.id,name:stage.name,terminal:!!stage.terminal,days:stage.terminal?null:round(average(completed.map(visit=>visit.days))),visits:visits.length,completedVisits:completed.length,current:currentRecords.filter(record=>record.currentStageId===stage.id).length};});
    const reasonRows=reasons.map(reason=>({id:reason.id,name:reason.name,initiator:reason.initiator,initiatorName:idName(initiators,reason.initiator),count:rejectionRecords.filter(record=>record.rejectReasonId===reason.id).length}));
    const recruiterRows=recruiters.map(recruiter=>{
      const subset=records.filter(record=>record.recruiterId===recruiter.id),current=currentRecords.filter(record=>record.recruiterId===recruiter.id),past=prior.filter(record=>record.recruiterId===recruiter.id),metrics=kpisFor(subset);
      const activities=activityRecords.filter(record=>record.recruiterId===recruiter.id);
      const interviews=type=>new Set(activities.flatMap(record=>record.interviewEvents.filter(event=>event.type===type&&event.outcome==='completed'&&eventInRange(event.completedAt)).map(event=>event.id))).size;
      return {id:recruiter.id,name:recruiter.name,initials:recruiter.initials,department:idName(departments,recruiter.department),loadVacancies:new Set(current.map(record=>record.vacancyId)).size,loadCandidates:current.length,loadTasks:Math.round(current.length/8),hires:subset.filter(record=>record.hires).length,offers:subset.filter(record=>record.offer).length,added:subset.length,screened:subset.filter(record=>record.screened).length,interviews:subset.filter(record=>record.interview).length,tasksClosed:sum(subset.map(record=>record.tasksClosed)),ttf:metrics.ttf,tto:metrics.tto,responseHours:round(percentile(subset.map(record=>record.responseHours),.5)),slaPercent:round(subset.length?subset.filter(record=>record.slaMet).length/subset.length*100:null,0),previousHires:past.filter(record=>record.hires).length,
        addedBase:new Set(activities.filter(record=>eventInRange(record.baseAddedAt)).map(record=>record.personId)).size,hrInterviews:interviews('hr'),techInterviews:interviews('tech'),finalInterviews:interviews('final'),activityOffers:new Set(activities.filter(record=>eventInRange(record.events['Оффер отправлен'])).map(record=>record.id)).size};
    }).filter(row=>row.added||row.loadCandidates||row.previousHires||row.addedBase||row.hrInterviews||row.techInterviews||row.finalInterviews||row.activityOffers);
    const mainStages=['new','response','review','ai','hr','interview','offer','hire'];
    const funnel=mainStages.map((id,index)=>{const count=records.filter(record=>record.stages.includes(id)).length,nextId=mainStages[index+1],nextCount=nextId?records.filter(record=>record.stages.includes(id)&&record.stages.includes(nextId)).length:null;return {id,name:stageById(id).name,count,nextCount,conversion:nextId&&count?round(nextCount/count*100):null,terminal:id==='hire'};});
    const totals={hires:records.filter(record=>record.hires).length,candidates:records.length,vacancies:new Set(records.map(record=>record.vacancyId)).size,offers:records.filter(record=>record.offer).length,refusals:rejectionRecords.length,cohortRefusals:records.filter(record=>record.currentStageId==='reject').length,interviews:records.filter(record=>record.interview).length};
    const vacancyRows=[...new Set(records.map(record=>record.vacancyId))].map(id=>{const subset=records.filter(record=>record.vacancyId===id);return {id,name:subset[0].vacancy,hires:subset.filter(record=>record.hires).length,candidates:subset.length};});
    return {range:{from:range.from,to:range.to,label:range.label},empty:!records.length&&!stageRecords.length&&!rejectionRecords.length&&!activityRecords.length,cohortEmpty:!records.length,stagesEmpty:!stageRecords.length,reasonsEmpty:!rejectionRecords.length,invalidRange:range.invalid,incompatibleFilters:scope.incompatible,demo:true,cutoff,kpis,months,totals,sources:sourceRows,stages:stageRows,reasons:reasonRows,recruiters:recruiterRows,vacancies:vacancyRows,funnel,funnelRejected:{id:'reject',name:'Отказ',count:totals.cohortRefusals},records,currentRecords,stageRecords,rejectionRecords,activityRecords,observationRecords:scoped,previousRange:previous,previousTotals:{hires:prior.filter(record=>record.hires).length,candidates:prior.length},semantics:{cohort:'Добавлены на вакансии в периоде; исходы известны до 30.09.2026',duration:'Медиана календарных дней',stageTime:'Среднее завершённых посещений этапа по дате выхода из этапа',refusals:'Переходы на этап «Отказ» по дате события',activity:'Добавления в базу, завершённые интервью и отправки офферов по дате события; интервью по вакансиям рекрутера, не личная роль интервьюера',load:'Текущая нагрузка на 30.09.2026, не результат периода',comparison:'Предыдущий сопоставимый период'}};
  }
  function eventFor(record,key,detail) {
    if(!key)return null;
    if(record.events[key])return record.events[key];
    if(key==='Вошёл на этап…'||key==='Вошёл на этап')return record.events[`Вошёл на этап…:${detail}`]||null;
    if(key==='Вошёл на этап категории…') {const categoryStage={'Скрининг':'ИИ Скрининг','Интервью':'HR интервью','Оффер':'Оффер','Прочее':'Новый кандидат'};return record.events[`Вошёл на этап…:${categoryStage[detail]||detail}`]||null;}
    const quoted=String(key).match(/(?:Этап|этап)\s*[«“"](.+?)[»”"]/);if(quoted)return record.events[`Вошёл на этап…:${quoted[1]}`]||null;
    if(key==='Согласование заявки'||key==='Заявка согласована'||key==='Согласована заявка')return record.events['Заявка согласована'];
    if(key==='Выход')return record.events['Вышел на работу']||null;
    return null;
  }
  function calculate(fields={},filters={},local={},excludePauses=false) {
    if(typeof local==='boolean'){excludePauses=local;local={};}
    excludePauses ||= !!fields.pause||!!fields['Не учитывать паузы вакансии'];
    const data=query(filters,local);
    const extended=window.AnalyticsMetricBuilder?.calculate(fields,data,{eventFor,excludePauses});
    if(extended)return extended;
    const records=data.records,method=fields['Способ расчёта']||fields.method||'Количество';
    const detail=label=>fields[`${label}:detail`]||fields[`${label}:stage`]||fields['Этап']||'';
    const aggregate=(values,type)=>/90/.test(type)?percentile(values,.9):/75/.test(type)?percentile(values,.75):/Средн/i.test(type)?average(values):percentile(values,.5);
    let value=null,observations=0,unit='',numerator=null,denominator=null;
    if(/Длительность/.test(method)) {
      const fromLabel=fields['От события']?'От события':'Начало',toLabel=fields['До события']?'До события':'Конец';
      const from=fields['От события']||fields['Начало']||'Добавлен на вакансию',to=fields['До события']||fields['Конец']||'Оффер отправлен';
      const values=records.map(record=>{const a=eventFor(record,from,detail(fromLabel)),b=eventFor(record,to,detail(toLabel));if(!a||!b||b<a)return null;const duration=(dateNumber(b)-dateNumber(a))/day;const paused=excludePauses?sum(record.pauses.map(pause=>Math.max(0,(Math.min(dateNumber(b),dateNumber(pause.to))-Math.max(dateNumber(a),dateNumber(pause.from)))/day))):0;return Math.max(0,duration-paused);}).filter(value=>value!=null);
      value=round(aggregate(values,fields['Агрегирование']||'Медиана'));observations=values.length;unit='дн.';
    } else if(/Доля/.test(method)) {
      const from=fields['Из тех, у кого было']||'Добавлен на вакансию',to=fields['Сколько потом дошли до']||'Вышел на работу';
      const subset=records.filter(record=>eventFor(record,from,detail('Из тех, у кого было')));denominator=subset.length;
      numerator=subset.filter(record=>{const a=eventFor(record,from,detail('Из тех, у кого было')),b=eventFor(record,to,detail('Сколько потом дошли до'));return b&&b>=a;}).length;
      value=denominator?round(numerator/denominator*100):null;observations=denominator;unit='%';
    } else if(/оценка ИИ/i.test(method)) {
      const stage=fields['Оценка на этапе']||'Любой этап — последняя оценка',values=records.map(record=>/Любой этап/.test(stage)?record.aiScore:record.aiScores[stage]).filter(value=>value!=null);
      value=round(aggregate(values,fields['Агрегирование']||'Среднее'));observations=values.length;unit='/ 10';
    } else {
      const event=fields['Событие']||fields['Что произошло']||'Добавлен на вакансию',subset=records.filter(record=>eventFor(record,event,detail('Событие')));
      value=/^Ваканси/i.test(fields['Считать']||'')?new Set(subset.map(record=>record.vacancyId)).size:/Людей|Люди|Кандидат/i.test(fields['Считать']||'')?new Set(subset.map(record=>record.personId)).size:subset.length;observations=subset.length;unit='';
    }
    return {value,unit,observations,numerator,denominator,empty:value==null,display:value==null?'—':`${String(value).replace('.',',')}${unit==='%'?'%':unit?` ${unit}`:''}`};
  }
  window.AnalyticsDemo={cutoff,query,calculate,eventFor,options:{periods:['Последние 30 дней','Текущий квартал','Последние полгода','Последний год','Свой диапазон…'],recruiters:recruiters.map(({id,name,initials})=>({id,name,initials})),departments,managers,pipelines,vacancies,sources:sources.map(({id,name})=>({id,name})),stages:stages.map(({id,name,terminal})=>({id,name,terminal:!!terminal})),reasons:reasons.map(({id,name})=>({id,name})),rejectInitiators:initiators},format:{number:value=>value==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value),date:value=>value?value.split('-').reverse().join('.'):'—'}};
})();
