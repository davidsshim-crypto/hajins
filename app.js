/* =========================================================
   180일 전인적 성장 프로젝트 - app.js
   ========================================================= */

/* ---------- 요일별 테마 (7색) ---------- */
const WEEKDAY_THEMES = {
  0: { name:"일요일", bg:"#1a1230", surface:"#241a42", s2:"#2f2255", ink:"#f0eaff", inkSoft:"#c3b6e6", accent:"#9b6dff", accent2:"#ffcb47" }, // 보라 - 안식/예배
  1: { name:"월요일", bg:"#0f1b2d", surface:"#16273f", s2:"#1e3350", ink:"#eaf1fb", inkSoft:"#a9bdd8", accent:"#4a90d9", accent2:"#f0b429" }, // 네이비 - 시작
  2: { name:"화요일", bg:"#2a1414", surface:"#3a1d1d", s2:"#4a2626", ink:"#ffece8", inkSoft:"#e0b3aa", accent:"#e5573f", accent2:"#ffb03a" }, // 붉은흙 - 열정
  3: { name:"수요일", bg:"#0d201c", surface:"#13302a", s2:"#1a3f37", ink:"#e6f7f1", inkSoft:"#9fd0c2", accent:"#2fb389", accent2:"#f2c94c" }, // 초록 - 성장
  4: { name:"목요일", bg:"#221a2e", surface:"#2e2440", s2:"#3b2f52", ink:"#f3ecff", inkSoft:"#c8b8e0", accent:"#a06bd4", accent2:"#f7b955" }, // 자수정 - 사명
  5: { name:"금요일", bg:"#2b1d0a", surface:"#3b2a12", s2:"#4d3818", ink:"#fff3e0", inkSoft:"#e0c69a", accent:"#e59a2f", accent2:"#5db0ff" }, // 황금 - 결실
  6: { name:"토요일", bg:"#0a1e2b", surface:"#12303f", s2:"#193f52", ink:"#e6f4fb", inkSoft:"#9ac6da", accent:"#2f9fd4", accent2:"#ffd24a" }, // 하늘 - 자유
};

/* ---------- 상태 ---------- */
const KEY = "growth180_v2";
let S = loadState();
let DATA = { english:[], hanja:[], trivia:[], messages:[], solarTerms:[] };
let charts = {};
let currentEvent = "pushups";

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(KEY)) || defaultState();
    // 하위 호환: 이전 버전 데이터에 books가 없으면 추가
    if(!s.books) s.books = [];
    if(s.currentBookId === undefined) s.currentBookId = null;
    return s;
  }
  catch(e){ return defaultState(); }
}
function defaultState(){
  return {
    startDate: todayStr(),
    ddayDate: addDays(todayStr(), 180),
    daily: {},          // { 'YYYY-MM-DD': {fitness:{}, english:{learned:0}, trivia:{att,cor}, hanja:{learned:0}, goals:{}} }
    engIdx: 0, triIdx: 0, hanIdx: 0,
    engLearned: {},     // { wordId: reviewCount }
    hanLearned: {},     // { hanjaId: true }
    books: [],          // [{id,title,author,pages,genre,why,startDate,endDate,currentPage,finished,notes:[{date,page,text}]}]
    currentBookId: null,
  };
}
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }

/* ---------- 날짜 유틸 (서울 KST 기준) ---------- */
// 사용자 기기가 어느 시간대에 있든 항상 서울 기준으로 날짜를 계산한다.
function seoulNow(){
  // en-CA 로케일은 YYYY-MM-DD 형식을 보장
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}
function todayStr(){
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"
  }).format(new Date());
  return p; // "2026-08-17"
}
function addDays(dstr, n){
  const d=new Date(dstr+"T00:00:00"); d.setDate(d.getDate()+n);
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function diffDays(a, b){
  return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/(1000*60*60*24));
}
function ensureDay(dstr){
  if(!S.daily[dstr]) S.daily[dstr] = { fitness:{}, english:{learned:0}, trivia:{att:0,cor:0}, hanja:{learned:0}, goals:{} };
  return S.daily[dstr];
}

/* ---------- 프로젝트 경과일 (1~180) ---------- */
function projectDay(){
  const elapsed = diffDays(S.startDate, todayStr()) + 1;
  return Math.min(180, Math.max(1, elapsed));
}

/* =========================================================
   초기화
   ========================================================= */
async function init(){
  await loadData();
  applyWeekdayTheme();
  bindNav();
  bindFitness();
  bindEnglish();
  bindTrivia();
  bindHanja();
  bindReading();
  bindCoaching();
  bindSettings();
  renderAll();
  startClock();
}

async function loadData(){
  const files = [
    ["data_vocabulary.json","english","english"],
    ["data_hanja.json","hanja","hanja"],
    ["data_trivia.json","trivia","trivia"],
    ["data_messages.json","messages","dailyMessages"],
    ["data_solarterms.json","solarTerms","solarTerms"],
  ];
  for(const [file,key,prop] of files){
    try{
      const r = await fetch(file);
      if(r.ok){ const j = await r.json(); DATA[key] = j[prop] || []; }
    }catch(e){ console.warn("load fail", file, e); }
  }
  // 폴백 최소 데이터
  if(!DATA.english.length) DATA.english=[{id:1,word:"start",pron:"/stɑːrt/",pos:"동사",meaning:"시작하다",example:"Start now.",exMeaning:"지금 시작해라.",grammar:"명령문."}];
  if(!DATA.hanja.length) DATA.hanja=[{id:1,char:"始",reading:"시",meaning:"비로소 시",koreanWord:"시작(始作)",wordMeaning:"처음 함",sentence:"시작이 반이다.",relatedWords:"개시"}];
  if(!DATA.trivia.length) DATA.trivia=[{id:1,category:"상식",question:"샘플 문제?",options:["A","B","C","D"],correctAnswer:0,explanation:"샘플 해설"}];
}

/* =========================================================
   요일별 테마 적용
   ========================================================= */
function seoulDow(){
  // 서울 기준 요일 (0=일 ~ 6=토)
  const wd = new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",weekday:"short"}).format(new Date());
  return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[wd];
}
function applyWeekdayTheme(){
  const dow = seoulDow();
  const t = WEEKDAY_THEMES[dow];
  const r = document.documentElement.style;
  r.setProperty("--bg", t.bg);
  r.setProperty("--surface", t.surface);
  r.setProperty("--surface-2", t.s2);
  r.setProperty("--ink", t.ink);
  r.setProperty("--ink-soft", t.inkSoft);
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-2", t.accent2);
  document.getElementById("weekdayLabel").textContent = t.name;

  // 요일 스트립
  const strip = document.getElementById("weekdayStrip");
  const labels = ["일","월","화","수","목","금","토"];
  strip.innerHTML = "";
  for(let i=0;i<7;i++){
    const el = document.createElement("div");
    el.className = "wd" + (i===dow ? " today" : "");
    el.textContent = labels[i];
    strip.appendChild(el);
  }
}

/* =========================================================
   서울 날짜 배너 + 실시간 시계
   ========================================================= */
let clockTimer = null;
let lastRenderedDate = null;

// 현재 날짜에 해당하는 절기 정보 반환 (현재 절기 + 다음 절기까지 D-day)
function getSolarTerm(y, m, d){
  if(!DATA.solarTerms || !DATA.solarTerms.length) return null;
  // 올해 기준으로 모든 절기를 날짜값(월*100+일)으로 정렬
  const cur = m*100 + d;
  // 절기를 연중 순서대로 정렬 (소한1/6 ~ 대한1/20 이 연초, 동지12/22가 연말)
  const sorted = DATA.solarTerms
    .map(t=>({...t, val:t.month*100+t.day}))
    .sort((a,b)=>a.val-b.val);
  // 현재 날짜 이하의 가장 최근 절기 찾기
  let current = sorted[sorted.length-1]; // 기본값: 작년 마지막 절기(동지)
  for(const t of sorted){
    if(t.val <= cur) current = t;
    else break;
  }
  // 다음 절기 찾기
  let next = sorted.find(t=>t.val > cur) || sorted[0];
  // 다음 절기까지 남은 일수 계산
  let nextDate = new Date(`${y}-${String(next.month).padStart(2,"0")}-${String(next.day).padStart(2,"0")}T00:00:00`);
  const today = new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00`);
  if(nextDate < today) nextDate.setFullYear(y+1); // 연말→연초 넘어감
  const daysToNext = Math.round((nextDate - today)/(1000*60*60*24));
  return { current, next, daysToNext };
}

function renderDateBanner(){
  const now = new Date();
  const dowNames = ["일요일","월요일","화요일","수요일","목요일","금요일","토요일"];

  // 서울 기준 연·월·일
  const parts = new Intl.DateTimeFormat("en-CA",{
    timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(now).reduce((o,p)=>(o[p.type]=p.value,o),{});
  const y=+parts.year, m=+parts.month, d=+parts.day;

  // 서울 기준 시:분
  const hm = new Intl.DateTimeFormat("en-GB",{
    timeZone:"Asia/Seoul", hour:"2-digit", minute:"2-digit", hour12:false
  }).format(now);

  const dow = seoulDow();

  const mainEl = document.getElementById("dateMain");
  const subEl = document.getElementById("dateSub");
  const clockEl = document.getElementById("dateClock");
  const dcountEl = document.getElementById("dateDcount");
  if(!mainEl) return;

  mainEl.textContent = `${y}년 ${m}월 ${d}일`;

  // 절기 정보
  const st = getSolarTerm(y, m, d);
  let stText = "";
  if(st){
    if(st.daysToNext === 0){
      stText = ` · 오늘은 ${st.next.name}(${st.next.hanja})`;
    } else {
      stText = ` · ${st.current.name}(${st.current.hanja}) · ${st.next.name}까지 D-${st.daysToNext}`;
    }
  }
  subEl.textContent = `${dowNames[dow]} · 서울(KST)${stText}`;
  clockEl.textContent = hm;

  const pd = projectDay();
  const dleft = Math.max(0, diffDays(todayStr(), S.ddayDate));
  dcountEl.textContent = `프로젝트 DAY ${pd} · D-${dleft}`;

  // 절기 상세 카드 갱신
  renderSolarTermCard(st);

  // 날짜가 바뀌면(자정 넘김) 앱 전체를 하루치 갱신
  const curDate = todayStr();
  if(lastRenderedDate && lastRenderedDate !== curDate){
    applyWeekdayTheme();  // 요일 테마도 새로 적용
    renderAll();          // 메시지·목표·그래프 새 날짜 반영
  }
  lastRenderedDate = curDate;
}

function renderSolarTermCard(st){
  const el = document.getElementById("solarTermInfo");
  if(!el || !st) return;
  const c = st.current;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="font-size:2rem;font-family:'Gowun Batang',serif;font-weight:700;color:var(--accent-2)">${c.hanja}</div>
      <div style="flex:1;min-width:180px">
        <div style="font-weight:700;font-size:1.05rem">${c.name} <span class="muted" style="font-weight:400">· ${c.meaning}</span></div>
        <div class="muted" style="font-size:.88rem;margin-top:2px">${c.desc}</div>
        <div class="muted" style="font-size:.82rem;margin-top:6px">다음 절기 <b style="color:var(--accent)">${st.next.name}</b>까지 D-${st.daysToNext}</div>
      </div>
    </div>`;
}

function startClock(){
  renderDateBanner();
  if(clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(renderDateBanner, 1000 * 30); // 30초마다 갱신
}

/* =========================================================
   네비게이션
   ========================================================= */
function bindNav(){
  document.querySelectorAll(".tab, .mobile-nav button").forEach(btn=>{
    btn.addEventListener("click", ()=> switchView(btn.dataset.view));
  });
}
function switchView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(name).classList.add("active");
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===name));
  document.querySelectorAll(".mobile-nav button").forEach(b=>b.classList.toggle("active", b.dataset.view===name));
  // 뷰별 갱신
  if(name==="dashboard") renderDashboard();
  if(name==="fitness") renderFitness();
  if(name==="english") renderEnglish();
  if(name==="trivia") renderTrivia();
  if(name==="hanja") renderHanja();
  if(name==="reading") renderReading();
  window.scrollTo({top:0,behavior:"smooth"});
}

/* =========================================================
   전체 렌더
   ========================================================= */
function renderAll(){
  renderHeader();
  renderDashboard();
  loadFitnessInputs();
}

function renderHeader(){
  const pd = projectDay();
  const dleft = Math.max(0, diffDays(todayStr(), S.ddayDate));
  document.getElementById("cDday").textContent = "D-" + dleft;
  // 누적 계산
  let fit=0, words=Object.keys(S.engLearned).length, hanja=Object.keys(S.hanLearned).length;
  const td = S.daily[todayStr()];
  if(td && td.fitness) fit = fitnessScore(td.fitness);
  document.getElementById("cFitness").textContent = Math.round(fit);
  document.getElementById("cWords").textContent = words;
  document.getElementById("cHanja").textContent = hanja;
}

function fitnessScore(f){
  if(!f) return 0;
  return (f.pushups||0)*0.5 + (f.pullups||0)*3 + (f.squats||0)*0.4 + (f.plank||0)*0.15 + (f.running||0)*8;
}

/* =========================================================
   대시보드
   ========================================================= */
function renderDashboard(){
  renderHeader();
  renderDailyMessage();
  renderDashReading();
  renderGoals();
  renderGrowthChart();
  renderDashStats();
}

function renderDashReading(){
  const el = document.getElementById("dashReading");
  if(!el) return;
  const book = currentBook();
  const finishedCount = S.books.filter(b=>b.finished).length;
  if(!book){
    el.innerHTML = `<p class="muted">지금 읽는 책이 없습니다. <b>독서 탭</b>에서 새 책을 등록해보세요.</p>
      <div style="margin-top:8px" class="muted">지금까지 완독: <b style="color:var(--accent-2)">${finishedCount}권</b></div>`;
    return;
  }
  const pct = Math.min(100, Math.round((book.currentPage/book.pages)*100));
  el.innerHTML = `
    <div style="font-weight:700;font-size:1.05rem">${book.title}</div>
    <div class="muted" style="font-size:.85rem">${book.author||""}</div>
    <div class="muted" style="display:flex;justify-content:space-between;margin-top:10px">
      <span>${book.currentPage} / ${book.pages}쪽</span><b>${pct}%</b></div>
    <div class="bar"><span style="width:${pct}%"></span></div>
    <div class="muted" style="font-size:.82rem;margin-top:8px">지금까지 완독 <b style="color:var(--accent-2)">${finishedCount}권</b></div>`;
}

function renderDailyMessage(){
  const pd = projectDay();
  const m = DATA.messages.find(x=>x.day===pd) || DATA.messages[0];
  if(!m) return;
  document.getElementById("phaseTag").textContent = m.phase + " · DAY " + pd;
  document.getElementById("dailyMsg").textContent = m.message;
  document.getElementById("dailyVerse").innerHTML =
    `"${m.bibleVerse}" &nbsp;<b>— ${m.bibleRef}</b>`;
}

const GOALS = [
  {id:"fitness", t:"운동", d:"팔굽혀펴기·턱걸이·스쿼트·플랭크·달리기"},
  {id:"english", t:"영어", d:"오늘의 단어 학습 + 복습"},
  {id:"trivia",  t:"상식", d:"오늘의 상식 도전"},
  {id:"hanja",   t:"한자", d:"오늘의 한자 학습"},
  {id:"reading", t:"독서", d:"오늘의 독서 진도 + 노트"},
  {id:"life",    t:"생활습관", d:"정시 기상·7~8시간 수면·정시 취침"},
];
function renderGoals(){
  const d = ensureDay(todayStr());
  const box = document.getElementById("goalList");
  box.innerHTML = "";
  GOALS.forEach(g=>{
    const done = !!d.goals[g.id];
    const row = document.createElement("div");
    row.className = "goal" + (done?" done":"");
    row.innerHTML = `<input type="checkbox" ${done?"checked":""}>
      <div class="g-txt"><b>${g.t}</b><span>${g.d}</span></div>`;
    row.querySelector("input").addEventListener("change", e=>{
      d.goals[g.id] = e.target.checked; save();
      row.classList.toggle("done", e.target.checked);
      updateGoalBar();
    });
    box.appendChild(row);
  });
  updateGoalBar();
}
function updateGoalBar(){
  const d = ensureDay(todayStr());
  const done = GOALS.filter(g=>d.goals[g.id]).length;
  const rate = Math.round(done/GOALS.length*100);
  document.getElementById("todayRate").textContent = rate+"%";
  document.getElementById("todayBar").style.width = rate+"%";
}

/* ---- 종합 성장 그래프 (모든 활동 함께) ---- */
function renderGrowthChart(){
  const ctx = document.getElementById("growthChart");
  if(charts.growth) charts.growth.destroy();

  const days = 14;
  const labels=[], fitArr=[], engArr=[], triArr=[], hanArr=[], lifeArr=[];
  // 누적 진행을 보여주기 위해 각 영역의 "그 날까지 누적"을 계산
  let engCum=0, hanCum=0, triCum=0;
  // 시작~오늘까지 순회하며 누적 후, 최근 14일만 표시
  const start = S.startDate;
  const total = diffDays(start, todayStr());
  const seriesFit=[], seriesEng=[], seriesTri=[], seriesHan=[], seriesLife=[], allLabels=[];
  for(let i=0;i<=total;i++){
    const ds = addDays(start, i);
    const rec = S.daily[ds];
    if(rec){
      engCum += (rec.english?.learned||0);
      hanCum += (rec.hanja?.learned||0);
      triCum += (rec.trivia?.cor||0);
    }
    const fit = rec ? fitnessScore(rec.fitness) : 0;
    const life = rec ? (Object.values(rec.goals||{}).filter(Boolean).length/GOALS.length*100) : 0;
    allLabels.push(ds.slice(5));
    seriesFit.push(Math.round(fit));
    seriesEng.push(engCum);
    seriesTri.push(triCum);
    seriesHan.push(hanCum);
    seriesLife.push(Math.round(life));
  }
  // 최근 14일 슬라이스
  const sl = Math.max(0, allLabels.length - days);
  const L = allLabels.slice(sl), F=seriesFit.slice(sl), E=seriesEng.slice(sl),
        T=seriesTri.slice(sl), H=seriesHan.slice(sl), Li=seriesLife.slice(sl);

  const cs = getComputedStyle(document.documentElement);
  const acc = cs.getPropertyValue("--accent").trim();
  const acc2 = cs.getPropertyValue("--accent-2").trim();
  const good = cs.getPropertyValue("--good").trim();
  const ink = cs.getPropertyValue("--ink-soft").trim();

  charts.growth = new Chart(ctx, {
    type:"line",
    data:{ labels:L, datasets:[
      {label:"체력점수", data:F, borderColor:acc, backgroundColor:acc+"22", tension:.4, fill:true, pointRadius:2},
      {label:"영어(누적)", data:E, borderColor:acc2, tension:.4, pointRadius:2},
      {label:"한자(누적)", data:H, borderColor:good, tension:.4, pointRadius:2},
      {label:"상식(누적)", data:T, borderColor:"#e59acb", tension:.4, pointRadius:2},
      {label:"생활습관%", data:Li, borderColor:"#7fb2ff", borderDash:[5,4], tension:.4, pointRadius:2},
    ]},
    options:{ responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{ labels:{ color:ink, boxWidth:12, font:{size:11} } } },
      scales:{ x:{ ticks:{color:ink,font:{size:10}}, grid:{color:"rgba(255,255,255,.05)"} },
               y:{ beginAtZero:true, ticks:{color:ink}, grid:{color:"rgba(255,255,255,.05)"} } }
    }
  });
}

function renderDashStats(){
  const words = Object.keys(S.engLearned).length;
  const hanja = Object.keys(S.hanLearned).length;
  let triCor=0, triAtt=0, fitDays=0;
  Object.values(S.daily).forEach(d=>{
    triCor += d.trivia?.cor||0; triAtt += d.trivia?.att||0;
    if(d.fitness && Object.keys(d.fitness).length) fitDays++;
  });
  const acc = triAtt? Math.round(triCor/triAtt*100):0;
  const stats = [
    ["운동 기록일", fitDays+"일"],
    ["영어 누적", words+"개"],
    ["한자 누적", hanja+"개"],
    ["상식 정답", triCor+"개"],
    ["상식 정답률", acc+"%"],
    ["프로젝트", "DAY "+projectDay()],
  ];
  const box = document.getElementById("dashStats");
  box.innerHTML = stats.map(([l,v])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
}

/* =========================================================
   체력
   ========================================================= */
function bindFitness(){
  document.getElementById("saveFitness").addEventListener("click", saveFitness);
}
function loadFitnessInputs(){
  const d = S.daily[todayStr()];
  if(!d || !d.fitness) return;
  const f = d.fitness;
  const map = {f_pushups:"pushups",f_pullups:"pullups",f_squats:"squats",f_plank:"plank",f_running:"running",f_weight:"weight",f_wake:"wake",f_sleep:"sleep",f_condition:"condition",f_memo:"memo"};
  for(const [el,k] of Object.entries(map)){
    if(f[k]!=null && document.getElementById(el)) document.getElementById(el).value = f[k];
  }
}
function saveFitness(){
  const d = ensureDay(todayStr());
  d.fitness = {
    pushups:+val("f_pushups"), pullups:+val("f_pullups"), squats:+val("f_squats"),
    plank:+val("f_plank"), running:+parseFloat(val("f_running")||0), weight:+parseFloat(val("f_weight")||0),
    wake:val("f_wake"), sleep:val("f_sleep"), condition:val("f_condition"), memo:val("f_memo")
  };
  d.goals.fitness = true;
  save();
  toast("운동 기록 저장 완료!");
  renderFitness(); renderHeader();
}
function val(id){ return document.getElementById(id).value; }

function renderFitness(){
  renderFitnessChart();
  renderEventPicker();
  renderEventChart();
}

const EVENTS = [
  {k:"pushups", n:"팔굽혀펴기", u:"회"},
  {k:"pullups", n:"턱걸이", u:"회"},
  {k:"squats", n:"스쿼트", u:"회"},
  {k:"plank", n:"플랭크", u:"초"},
  {k:"running", n:"달리기", u:"km"},
];

function seriesFor(key, days){
  const labels=[], data=[];
  for(let i=days-1;i>=0;i--){
    const ds = addDays(todayStr(), -i);
    labels.push(ds.slice(5));
    data.push(S.daily[ds]?.fitness?.[key] || 0);
  }
  return {labels, data};
}

function renderFitnessChart(){
  const ctx = document.getElementById("fitnessChart");
  if(charts.fit) charts.fit.destroy();
  const cs = getComputedStyle(document.documentElement);
  const ink = cs.getPropertyValue("--ink-soft").trim();
  const palette = ["#4a90d9","#f0b429","#3fb27f","#e59acb","#7fb2ff"];
  const {labels} = seriesFor("pushups",14);
  const datasets = EVENTS.map((e,i)=>({
    label:e.n, data:seriesFor(e.k,14).data,
    borderColor:palette[i], backgroundColor:palette[i]+"20", tension:.4, pointRadius:2, fill:false
  }));
  charts.fit = new Chart(ctx,{
    type:"line", data:{labels, datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{labels:{color:ink,boxWidth:12,font:{size:11}}}},
      scales:{x:{ticks:{color:ink,font:{size:10}},grid:{color:"rgba(255,255,255,.05)"}},
              y:{beginAtZero:true,ticks:{color:ink},grid:{color:"rgba(255,255,255,.05)"}}}}
  });
}

function renderEventPicker(){
  const box = document.getElementById("eventPicker");
  box.innerHTML = "";
  EVENTS.forEach(e=>{
    const b = document.createElement("button");
    b.className = "btn " + (e.k===currentEvent?"btn-primary":"btn-ghost");
    b.textContent = e.n;
    b.addEventListener("click", ()=>{ currentEvent=e.k; renderEventPicker(); renderEventChart(); });
    box.appendChild(b);
  });
}

function renderEventChart(){
  const ctx = document.getElementById("eventChart");
  if(charts.event) charts.event.destroy();
  const ev = EVENTS.find(e=>e.k===currentEvent);
  const {labels, data} = seriesFor(currentEvent, 21);
  const cs = getComputedStyle(document.documentElement);
  const acc = cs.getPropertyValue("--accent").trim();
  const acc2 = cs.getPropertyValue("--accent-2").trim();
  const ink = cs.getPropertyValue("--ink-soft").trim();
  charts.event = new Chart(ctx,{
    type:"bar",
    data:{labels, datasets:[{
      label:`${ev.n} (${ev.u})`, data,
      backgroundColor:data.map((_,i)=> i===data.length-1? acc2 : acc),
      borderRadius:6
    }]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{labels:{color:ink}}},
      scales:{x:{ticks:{color:ink,font:{size:9}},grid:{display:false}},
              y:{beginAtZero:true,ticks:{color:ink},grid:{color:"rgba(255,255,255,.05)"}}}}
  });
}

/* =========================================================
   영어
   ========================================================= */
function bindEnglish(){
  document.getElementById("wordFlash").addEventListener("click", toggleWord);
  document.getElementById("w_memorize").addEventListener("click", memorizeWord);
  document.getElementById("w_next").addEventListener("click", nextWord);
  document.getElementById("w_review").addEventListener("click", toggleWordReview);
}
function curWord(){ return DATA.english[S.engIdx % DATA.english.length]; }
function renderEnglish(){
  const w = curWord();
  document.getElementById("w_word").textContent = w.word;
  document.getElementById("w_pron").textContent = w.pron||"";
  document.getElementById("w_pos").textContent = w.pos||"";
  const mean = document.getElementById("w_mean");
  mean.textContent = w.meaning;
  mean.style.visibility = "hidden";
  document.getElementById("w_hint").textContent = "카드를 눌러 뜻을 확인하세요";
  document.getElementById("w_ex").textContent = w.example||"";
  document.getElementById("w_exko").textContent = w.exMeaning||"";
  document.getElementById("w_grammar").textContent = w.grammar||"";
  renderEngStats();
}
function toggleWord(){
  const mean = document.getElementById("w_mean");
  const show = mean.style.visibility==="hidden";
  mean.style.visibility = show?"visible":"hidden";
  document.getElementById("w_hint").textContent = show? "뜻이 보입니다 · 다시 누르면 숨김" : "카드를 눌러 뜻을 확인하세요";
}
function memorizeWord(){
  const w = curWord();
  S.engLearned[w.id] = (S.engLearned[w.id]||0); // 등록
  const d = ensureDay(todayStr());
  d.english.learned = (d.english.learned||0)+1;
  d.goals.english = true;
  save(); toast("암기 완료! 잘하고 있어요"); nextWord(); renderHeader();
}
function nextWord(){ S.engIdx++; save(); renderEnglish(); }
function renderEngStats(){
  const learned = Object.keys(S.engLearned).length;
  const today = S.daily[todayStr()]?.english?.learned || 0;
  const total = DATA.english.length;
  const rate = Math.round(learned/total*100);
  document.getElementById("engStats").innerHTML = [
    ["오늘 학습", today+"개"],["누적 학습", learned+"개"],
    ["전체 단어", total+"개"],["진도율", rate+"%"]
  ].map(([l,v])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
}
function toggleWordReview(){
  const card = document.getElementById("reviewCard");
  const show = card.style.display==="none";
  card.style.display = show?"block":"none";
  if(show){
    const box = document.getElementById("wordReview");
    const ids = Object.keys(S.engLearned);
    if(!ids.length){ box.innerHTML = `<p class="muted">아직 암기한 단어가 없습니다. 단어를 암기하면 여기에 모입니다.</p>`; return; }
    box.innerHTML = ids.map(id=>{
      const w = DATA.english.find(x=>x.id==id); if(!w) return "";
      return `<div class="review-item"><div class="w">${w.word}</div><div class="m">${w.pron||""}</div><div class="m">${w.meaning}</div></div>`;
    }).join("");
    card.scrollIntoView({behavior:"smooth"});
  }
}

/* =========================================================
   상식
   ========================================================= */
let triviaAnswered = false;
function bindTrivia(){
  document.getElementById("t_submit").addEventListener("click", submitTrivia);
  document.getElementById("t_skip").addEventListener("click", nextTrivia);
}
function curTrivia(){ return DATA.trivia[S.triIdx % DATA.trivia.length]; }
function renderTrivia(){
  triviaAnswered = false;
  const q = curTrivia();
  document.getElementById("triviaCat").textContent = "분야 · " + (q.category||"상식");
  document.getElementById("triviaQ").textContent = q.question;
  const box = document.getElementById("triviaOpts");
  box.innerHTML = "";
  q.options.forEach((opt,i)=>{
    const el = document.createElement("div");
    el.className = "opt";
    el.textContent = String.fromCharCode(65+i) + ". " + opt;
    el.addEventListener("click", ()=>{
      if(triviaAnswered) return;
      box.querySelectorAll(".opt").forEach(o=>o.classList.remove("sel"));
      el.classList.add("sel"); el.dataset.i = i; box.dataset.sel = i;
    });
    box.appendChild(el);
  });
  document.getElementById("triviaResult").innerHTML = "";
  renderTriviaStats();
}
function submitTrivia(){
  if(triviaAnswered) return;
  const box = document.getElementById("triviaOpts");
  const sel = box.dataset.sel;
  if(sel==null || sel===""){ toast("답을 선택하세요"); return; }
  const q = curTrivia();
  const correct = +sel === q.correctAnswer;
  triviaAnswered = true;
  const opts = box.querySelectorAll(".opt");
  opts[q.correctAnswer].classList.add("correct");
  if(!correct) opts[+sel].classList.add("wrong");

  const d = ensureDay(todayStr());
  d.trivia.att = (d.trivia.att||0)+1;
  if(correct) d.trivia.cor = (d.trivia.cor||0)+1;
  d.goals.trivia = true;
  save(); renderHeader();

  document.getElementById("triviaResult").innerHTML =
    `<div class="result ${correct?"ok":"no"}">
      <div class="verdict">${correct?"✅ 정답입니다!":"❌ 아쉬워요"} 정답: ${q.options[q.correctAnswer]}</div>
      <div class="exp">📖 ${q.explanation}</div>
    </div>
    <button class="btn btn-primary" style="margin-top:12px" onclick="nextTrivia()">⏭️ 다음 문제</button>`;
  renderTriviaStats();
}
function nextTrivia(){ S.triIdx++; save(); renderTrivia(); }
function renderTriviaStats(){
  let cor=0,att=0;
  Object.values(S.daily).forEach(d=>{cor+=d.trivia?.cor||0;att+=d.trivia?.att||0;});
  const today = S.daily[todayStr()]?.trivia || {att:0,cor:0};
  const acc = att?Math.round(cor/att*100):0;
  document.getElementById("triviaStats").innerHTML = [
    ["오늘 정답", (today.cor||0)+"개"],["누적 정답", cor+"개"],
    ["총 도전", att+"개"],["정답률", acc+"%"]
  ].map(([l,v])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
}

/* =========================================================
   한자
   ========================================================= */
function bindHanja(){
  document.getElementById("hanjaFlash").addEventListener("click", toggleHanja);
  document.getElementById("h_learn").addEventListener("click", learnHanja);
  document.getElementById("h_next").addEventListener("click", nextHanja);
  document.getElementById("h_review").addEventListener("click", toggleHanjaReview);
}
function curHanja(){ return DATA.hanja[S.hanIdx % DATA.hanja.length]; }
function renderHanja(){
  const h = curHanja();
  document.getElementById("h_char").textContent = h.char;
  document.getElementById("h_reading").textContent = h.reading? `[${h.reading}]` : "";
  const mean = document.getElementById("h_mean");
  mean.textContent = h.meaning; mean.style.visibility="hidden";
  document.getElementById("h_hint").textContent = "카드를 눌러 뜻을 확인하세요";
  document.getElementById("h_word").textContent = h.koreanWord||"";
  document.getElementById("h_wordmean").textContent = h.wordMeaning||"";
  document.getElementById("h_sentence").textContent = h.sentence||"";
  document.getElementById("h_related").textContent = h.relatedWords||"";
  renderHanjaStats();
}
function toggleHanja(){
  const mean = document.getElementById("h_mean");
  const show = mean.style.visibility==="hidden";
  mean.style.visibility = show?"visible":"hidden";
  document.getElementById("h_hint").textContent = show?"뜻이 보입니다 · 다시 누르면 숨김":"카드를 눌러 뜻을 확인하세요";
}
function learnHanja(){
  const h = curHanja();
  S.hanLearned[h.id] = true;
  const d = ensureDay(todayStr());
  d.hanja.learned = (d.hanja.learned||0)+1;
  d.goals.hanja = true;
  save(); toast("한자 학습 완료!"); nextHanja(); renderHeader();
}
function nextHanja(){ S.hanIdx++; save(); renderHanja(); }
function renderHanjaStats(){
  const learned = Object.keys(S.hanLearned).length;
  const today = S.daily[todayStr()]?.hanja?.learned || 0;
  const total = DATA.hanja.length;
  document.getElementById("hanjaStats").innerHTML = [
    ["오늘 학습", today+"개"],["누적 학습", learned+"개"],
    ["전체 한자", total+"개"],["진도율", Math.round(learned/total*100)+"%"]
  ].map(([l,v])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
}
function toggleHanjaReview(){
  const card = document.getElementById("hanjaReviewCard");
  const show = card.style.display==="none";
  card.style.display = show?"block":"none";
  if(show){
    const box = document.getElementById("hanjaReview");
    const ids = Object.keys(S.hanLearned);
    if(!ids.length){ box.innerHTML=`<p class="muted">아직 학습한 한자가 없습니다.</p>`; return; }
    box.innerHTML = ids.map(id=>{
      const h = DATA.hanja.find(x=>x.id==id); if(!h) return "";
      return `<div class="review-item hanja-r"><div class="c">${h.char}</div><div class="m">${h.meaning}</div><div class="w">${h.koreanWord}</div></div>`;
    }).join("");
    card.scrollIntoView({behavior:"smooth"});
  }
}

/* =========================================================
   AI 코칭 (기록 기반 인터랙티브 진단)
   ========================================================= */
let coachTopic = null;
function bindCoaching(){
  document.getElementById("c_diagnose").addEventListener("click", diagnose);
  document.getElementById("c_ask").addEventListener("click", askCoach);
  document.querySelectorAll(".coach-tag").forEach(tag=>{
    tag.addEventListener("click", ()=>{
      document.querySelectorAll(".coach-tag").forEach(t=>t.classList.remove("on"));
      tag.classList.add("on"); coachTopic = tag.dataset.topic;
    });
  });
}

function analyzeRecords(){
  const days = Object.keys(S.daily).sort();
  const recDays = days.filter(d=>S.daily[d].fitness && Object.keys(S.daily[d].fitness).length);
  const words = Object.keys(S.engLearned).length;
  const hanja = Object.keys(S.hanLearned).length;
  let triCor=0,triAtt=0;
  Object.values(S.daily).forEach(d=>{triCor+=d.trivia?.cor||0;triAtt+=d.trivia?.att||0;});

  // 운동 성장(첫 기록 대비 최근)
  function growth(key){
    const vals = recDays.map(d=>S.daily[d].fitness[key]||0).filter(v=>v>0);
    if(vals.length<2) return null;
    return {first:vals[0], last:vals[vals.length-1], diff:vals[vals.length-1]-vals[0]};
  }
  // 최근 7일 운동 실천율
  let recentActive=0;
  for(let i=0;i<7;i++){
    const ds=addDays(todayStr(),-i);
    if(S.daily[ds]?.fitness && Object.keys(S.daily[ds].fitness).length) recentActive++;
  }
  // 목표 달성 평균
  let goalSum=0,goalDays=0;
  Object.values(S.daily).forEach(d=>{
    if(d.goals){ goalSum += Object.values(d.goals).filter(Boolean).length; goalDays++; }
  });
  // 독서 통계
  const booksFinished = S.books.filter(b=>b.finished).length;
  const cur = currentBook();
  const monthsElapsed = Math.max(1, Math.ceil((diffDays(S.startDate, todayStr())+1)/30));
  return {
    projectDay:projectDay(), recordDays:recDays.length, recentActive,
    words, hanja, triCor, triAtt, triAcc: triAtt?Math.round(triCor/triAtt*100):0,
    pushG:growth("pushups"), pullG:growth("pullups"), squatG:growth("squats"),
    runG:growth("running"), plankG:growth("plank"),
    goalAvg: goalDays?(goalSum/goalDays).toFixed(1):0,
    booksFinished, monthsElapsed,
    curBook: cur ? {title:cur.title, pct:Math.round(cur.currentPage/cur.pages*100)} : null
  };
}

function diagnose(){
  const box = document.getElementById("diagnoseResult");
  box.innerHTML = `<div class="spinner"></div>`;
  setTimeout(()=>{
    const a = analyzeRecords();
    let level, color;
    const score = a.recentActive*10 + Math.min(a.words,30) + Math.min(a.hanja,20) + a.triAcc*0.3;
    if(score>=80){ level="매우 우수 🏆"; }
    else if(score>=55){ level="좋음 👍"; }
    else if(score>=30){ level="성장 중 🌱"; }
    else { level="워밍업 단계 🔥"; }

    let growthLines = "";
    const gmap = [["팔굽혀펴기",a.pushG,"회"],["턱걸이",a.pullG,"회"],["스쿼트",a.squatG,"회"],["플랭크",a.plankG,"초"],["달리기",a.runG,"km"]];
    gmap.forEach(([n,g,u])=>{
      if(g){
        const arrow = g.diff>0?`▲ +${g.diff}${u} 성장`: g.diff<0?`▼ ${g.diff}${u}`:"→ 유지";
        growthLines += `<div class="metric"><span>${n}</span><b>${g.first}→${g.last}${u} ${arrow}</b></div>`;
      }
    });
    if(!growthLines) growthLines = `<p class="muted">운동 기록이 2회 이상 쌓이면 종목별 성장 분석이 표시됩니다.</p>`;

    let advice = [];
    if(a.recentActive<4) advice.push("최근 7일 중 운동일이 적습니다. <b>매일 조금이라도</b> 몸을 움직이는 습관부터 회복해봅시다.");
    else advice.push(`최근 7일 중 <b>${a.recentActive}일</b> 운동했습니다. 훌륭한 꾸준함입니다!`);
    if(a.words<10) advice.push("영어 단어를 <b>하루 3개</b>씩만 꾸준히 외워도 한 달이면 90개입니다.");
    if(a.triAtt>0 && a.triAcc<60) advice.push("상식 정답률을 높이려면 <b>해설을 소리 내어</b> 읽어보세요.");
    if(a.booksFinished < a.monthsElapsed) advice.push("독서가 목표(월 1권)보다 조금 뒤처져 있습니다. <b>하루 10쪽</b>이면 한 달에 한 권은 충분합니다.");
    else if(a.booksFinished>0) advice.push(`벌써 <b>${a.booksFinished}권</b>을 완독했습니다. 훌륭한 독서 습관입니다!`);
    if(+a.goalAvg < 3) advice.push("하루 6개 목표 중 평균 " + a.goalAvg + "개를 달성 중입니다. <b>2~3개</b>부터 시작해도 충분합니다.");
    advice.push("작은 일에 충실한 사람이 큰 것도 맡습니다. <b>오늘 하루</b>에 집중하세요. (눅 16:10)");

    box.innerHTML = `
      <div class="coach-response">
        <h4>📋 프로젝트 수행 진단 · DAY ${a.projectDay}</h4>
        <div class="metric"><span>종합 평가</span><b>${level}</b></div>
        <div class="metric"><span>운동 기록일</span><b>${a.recordDays}일</b></div>
        <div class="metric"><span>최근 7일 운동</span><b>${a.recentActive}일</b></div>
        <div class="metric"><span>영어 누적</span><b>${a.words}개</b></div>
        <div class="metric"><span>한자 누적</span><b>${a.hanja}개</b></div>
        <div class="metric"><span>상식 정답률</span><b>${a.triAcc}% (${a.triCor}/${a.triAtt})</b></div>
        <div class="metric"><span>완독</span><b>${a.booksFinished}권 (목표 ${a.monthsElapsed}권)</b></div>
        <div class="metric"><span>일일 목표 평균</span><b>${a.goalAvg}/6</b></div>
        <h4 style="margin-top:16px">💡 종목별 성장</h4>
        ${growthLines}
        <h4 style="margin-top:16px">🎯 맞춤 조언</h4>
        <ul style="margin:0;padding-left:18px;line-height:1.9">
          ${advice.map(x=>`<li>${x}</li>`).join("")}
        </ul>
      </div>`;
  }, 500);
}

function askCoach(){
  const box = document.getElementById("coachResult");
  if(!coachTopic){ toast("주제를 먼저 선택하세요"); return; }
  box.innerHTML = `<div class="spinner"></div>`;
  const q = document.getElementById("c_question").value.trim();
  setTimeout(()=>{
    const a = analyzeRecords();
    box.innerHTML = `<div class="coach-response">${coachAdvice(coachTopic, q, a)}</div>`;
  }, 500);
}

function coachAdvice(topic, q, a){
  const qLine = q? `<p class="muted" style="margin-bottom:12px">질문: "${q}"</p>` : "";
  const R = {
    fitness: `<h4>💪 체력 성장 코칭</h4>${qLine}
      <p>현재 최근 7일 중 ${a.recentActive}일 운동 중입니다.</p>
      <ul style="padding-left:18px;line-height:1.9">
        <li><b>점진적 과부하:</b> 정체기에는 매주 딱 1~2회(초)만 더 늘려보세요. 몸이 놀라지 않게.</li>
        <li><b>세트 분할:</b> 40개가 어렵다면 15+15+10처럼 나눠서 총량을 채우세요.</li>
        <li><b>회복:</b> 같은 부위는 하루 쉬어야 더 강해집니다. 수면이 근성장의 핵심입니다.</li>
        <li><b>기록:</b> 종목 탭 그래프로 우상향을 눈으로 확인하면 동기가 유지됩니다.</li>
      </ul>
      <p style="margin-top:10px">"강한 사람은 힘들지 않은 사람이 아니라, 힘들어도 계속하는 사람입니다."</p>`,
    english: `<h4>🌍 영어 공부 코칭</h4>${qLine}
      <p>누적 ${a.words}개 단어를 암기했습니다.</p>
      <ul style="padding-left:18px;line-height:1.9">
        <li><b>예문 통암기:</b> 단어만 외우지 말고 예문째 소리 내어 3번 읽으세요.</li>
        <li><b>복습 주기:</b> 오늘·3일 후·7일 후 복습이 장기기억을 만듭니다. 복습 보기 버튼 활용!</li>
        <li><b>문장 구성 해설</b>을 꼭 읽으면 문법 감각이 함께 자랍니다.</li>
      </ul>
      <p style="margin-top:10px">하루 3개면 6개월에 500개 이상입니다. 꾸준함이 답입니다.</p>`,
    reading: `<h4>📖 독서 코칭</h4>${qLine}
      <p>${a.curBook ? `지금 '<b>${a.curBook.title}</b>'을(를) ${a.curBook.pct}%까지 읽고 있습니다.` : "현재 읽고 있는 책이 없습니다. 오늘 한 권을 시작해보세요."} 지금까지 <b>${a.booksFinished}권</b> 완독했습니다.</p>
      <ul style="padding-left:18px;line-height:1.9">
        <li><b>하루 10~15쪽:</b> 부담 없는 분량이 완독의 비결입니다. 300쪽 책도 한 달이면 충분합니다.</li>
        <li><b>독서 노트:</b> 한 챕터마다 한 문장이라도 느낀 점을 남기면 기억에 훨씬 오래 남습니다.</li>
        <li><b>고정 시간:</b> 취침 전 15분처럼 정해진 시간에 읽으면 습관이 됩니다.</li>
        <li><b>책 고르기:</b> 신앙·자기계발·역사·전기를 번갈아 읽으면 균형 잡힌 사고가 자랍니다.</li>
      </ul>
      <p style="margin-top:10px">"독서는 마음의 양식입니다." 몸을 훈련하듯 생각도 매일 훈련해봅시다.</p>`,
    motivation: `<h4>🔥 동기부여</h4>${qLine}
      <p>DAY ${a.projectDay}까지 온 것 자체가 증거입니다. 시작한 사람이 앞으로 갑니다.</p>
      <p style="margin-top:10px">"네가 무엇을 하든지 마음을 다하여 주께 하듯 하고 사람에게 하듯 하지 말라." (골 3:23)</p>
      <p style="margin-top:8px">오늘의 작은 훈련이 내일의 강한 나를 만듭니다. 결과보다 <b>오늘의 출석</b>에 집중하세요.</p>`,
    discipline: `<h4>⚡ 자기관리 코칭</h4>${qLine}
      <p>일일 목표 평균 ${a.goalAvg}/6를 달성 중입니다.</p>
      <ul style="padding-left:18px;line-height:1.9">
        <li><b>계획→기록→검토→조정</b>의 사이클을 매주 돌리세요.</li>
        <li>완벽한 하루보다 <b>다시 시작한 하루</b>가 더 귀합니다.</li>
        <li>이 앱을 매일 여는 것 자체가 이미 최고의 자기관리입니다.</li>
      </ul>`,
    sleep: `<h4>😴 수면·생활 코칭</h4>${qLine}
      <ul style="padding-left:18px;line-height:1.9">
        <li><b>일정한 기상</b>이 취침보다 중요합니다. 주말도 같은 시간에 일어나세요.</li>
        <li>취침 1시간 전 화면을 줄이면 잠의 질이 올라갑니다.</li>
        <li>7~8시간 수면은 근성장·집중력·면역의 기초입니다.</li>
      </ul>
      <p style="margin-top:10px">"오늘의 가장 중요한 운동은 어쩌면 제시간에 잠드는 것"일 수 있습니다.</p>`,
    special: `<h4>🎯 특별 조언 · 현재 상황 종합</h4>${qLine}
      <p>DAY ${a.projectDay} 시점, 운동 ${a.recordDays}일 · 영어 ${a.words}개 · 한자 ${a.hanja}개 · 상식 정답률 ${a.triAcc}% · 완독 ${a.booksFinished}권.</p>
      <p style="margin-top:10px">${
        a.projectDay<30? "지금은 <b>습관의 뿌리</b>를 내리는 시기입니다. 양보다 매일 하는 것에 집중하세요." :
        a.projectDay<90? "이제 <b>꾸준함이 무기</b>가 되는 구간입니다. 어제의 나를 이기면 충분합니다." :
        a.projectDay<150? "<b>목적을 기억할</b> 때입니다. 왜 강해지려 하는지 떠올리면 훈련이 견딜 만해집니다." :
        "<b>완주와 새 출발</b>의 구간입니다. 무리하지 말고 건강하게 마무리하세요."
      }</p>
      <p style="margin-top:10px">"내가 여기 있나이다. 나를 보내소서." (사 6:8)</p>`
  };
  return R[topic] || R.motivation;
}

/* =========================================================
   독서
   ========================================================= */
function currentBook(){
  if(!S.currentBookId) return null;
  return S.books.find(b=>b.id===S.currentBookId && !b.finished) || null;
}

function bindReading(){
  document.getElementById("bk_add").addEventListener("click", addBook);
}

function renderReading(){
  const book = currentBook();
  const curCard = document.getElementById("currentBookCard");
  const newCard = document.getElementById("newBookCard");
  const box = document.getElementById("currentBook");

  if(book){
    // 읽는 중인 책 표시
    curCard.style.display = "block";
    newCard.style.display = "none";
    const pct = Math.min(100, Math.round((book.currentPage/book.pages)*100));
    const notesHtml = (book.notes||[]).slice().reverse().map(n=>`
      <div class="note-entry">
        <div class="note-date">${n.date} · ${n.page}쪽까지</div>
        <div>${n.text ? n.text : '<span class="muted">기록 없음</span>'}</div>
      </div>`).join("");
    box.innerHTML = `
      <div class="book-current">
        <div class="book-title">${book.title}</div>
        <div class="book-author">${book.author||"저자 미상"}</div>
        <div class="book-meta">
          ${book.genre?`<span>📚 ${book.genre}</span>`:""}
          <span>📅 시작 <b>${book.startDate}</b></span>
          <span>📄 총 <b>${book.pages}쪽</b></span>
        </div>
        ${book.why?`<div class="muted" style="margin-top:10px;font-size:.85rem">💭 ${book.why}</div>`:""}
        <div class="book-progress-num">
          <div><span class="big">${book.currentPage}</span> <span class="muted">/ ${book.pages}쪽</span></div>
          <div class="big" style="color:var(--accent-2)">${pct}%</div>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>

        <div class="page-input-row">
          <input type="number" id="rd_page" min="0" max="${book.pages}" placeholder="지금 몇 쪽까지 읽었나요?" value="${book.currentPage||""}">
          <button class="btn btn-primary" onclick="updatePage()">📖 진도 저장</button>
        </div>

        <div class="book-note-area">
          <div class="field" style="margin-bottom:8px"><label>📝 오늘의 독서 노트 (느낀 점)</label>
            <textarea id="rd_note" placeholder="이 부분에서 무엇을 느꼈나요? 기억하고 싶은 문장이 있나요?"></textarea></div>
          <button class="btn btn-accent" onclick="saveReadingNote()">💾 노트 저장</button>
          <button class="btn btn-good" onclick="finishBook()" style="margin-left:6px">✅ 완독 처리</button>
        </div>

        ${notesHtml ? `<div style="margin-top:16px"><h3>🗒️ 독서 노트 기록</h3>${notesHtml}</div>` : ""}
      </div>`;
  } else {
    // 읽는 책 없음 → 새 책 등록 화면
    curCard.style.display = "block";
    box.innerHTML = `<p class="muted">현재 읽고 있는 책이 없습니다. 아래에서 새 책을 등록해 시작해보세요.</p>`;
    newCard.style.display = "block";
    if(!document.getElementById("bk_start").value){
      document.getElementById("bk_start").value = todayStr();
    }
  }
  renderReadingStats();
  renderFinishedBooks();
}

function addBook(){
  const title = document.getElementById("bk_title").value.trim();
  const pages = +document.getElementById("bk_pages").value;
  if(!title){ toast("책 제목을 입력하세요"); return; }
  if(!pages || pages<1){ toast("총 페이지를 입력하세요"); return; }
  const book = {
    id: "bk_" + Date.now(),
    title,
    author: document.getElementById("bk_author").value.trim(),
    pages,
    genre: document.getElementById("bk_genre").value.trim(),
    why: document.getElementById("bk_why").value.trim(),
    startDate: document.getElementById("bk_start").value || todayStr(),
    endDate: null,
    currentPage: 0,
    finished: false,
    notes: []
  };
  S.books.push(book);
  S.currentBookId = book.id;
  save();
  // 입력 초기화
  ["bk_title","bk_author","bk_pages","bk_genre","bk_why"].forEach(id=>document.getElementById(id).value="");
  toast("새 책을 시작합니다!");
  renderReading();
}

function updatePage(){
  const book = currentBook();
  if(!book) return;
  const p = +document.getElementById("rd_page").value;
  if(p<0 || p>book.pages){ toast(`0~${book.pages} 사이로 입력하세요`); return; }
  book.currentPage = p;
  // 독서를 오늘 목표에 반영
  const d = ensureDay(todayStr());
  d.goals.reading = true;
  save();
  toast(`${p}쪽까지 저장!`);
  if(p >= book.pages){
    if(confirm("마지막 페이지까지 읽으셨네요! 완독으로 처리할까요?")){ finishBook(); return; }
  }
  renderReading();
  renderDashReading();
}

function saveReadingNote(){
  const book = currentBook();
  if(!book) return;
  const text = document.getElementById("rd_note").value.trim();
  const page = +document.getElementById("rd_page").value || book.currentPage;
  if(!text){ toast("느낀 점을 입력하세요"); return; }
  book.notes.push({ date: todayStr(), page, text });
  const d = ensureDay(todayStr());
  d.goals.reading = true;
  save();
  document.getElementById("rd_note").value = "";
  toast("독서 노트 저장 완료!");
  renderReading();
}

function finishBook(){
  const book = currentBook();
  if(!book) return;
  book.finished = true;
  book.endDate = todayStr();
  book.currentPage = book.pages;
  S.currentBookId = null;
  save();
  toast("완독을 축하합니다! 🎉");
  renderReading();
  renderDashReading();
  renderHeader();
}

function renderReadingStats(){
  const finished = S.books.filter(b=>b.finished);
  const totalPages = finished.reduce((s,b)=>s+b.pages,0)
    + S.books.filter(b=>!b.finished).reduce((s,b)=>s+(b.currentPage||0),0);
  const totalNotes = S.books.reduce((s,b)=>s+(b.notes?b.notes.length:0),0);
  // 프로젝트 시작 후 경과 개월 대비 목표(월1권)
  const monthsElapsed = Math.max(1, Math.ceil((diffDays(S.startDate, todayStr())+1)/30));
  const stats = [
    ["완독", finished.length+"권"],
    ["읽은 페이지", totalPages.toLocaleString()+"쪽"],
    ["독서 노트", totalNotes+"개"],
    ["목표 대비", finished.length+"/"+monthsElapsed+"권"],
  ];
  document.getElementById("readingStats").innerHTML =
    stats.map(([l,v])=>`<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
}

function renderFinishedBooks(){
  const finished = S.books.filter(b=>b.finished).slice().reverse();
  const el = document.getElementById("finishedBooks");
  if(!finished.length){ el.innerHTML = `<p class="muted">아직 완독한 책이 없습니다. 첫 책을 완독해보세요!</p>`; return; }
  el.innerHTML = finished.map((b,i)=>{
    const num = finished.length - i;
    const notesHtml = (b.notes||[]).map(n=>`<div style="margin-top:6px">· <b>${n.page}쪽</b> (${n.date}): ${n.text}</div>`).join("");
    const days = b.endDate && b.startDate ? diffDays(b.startDate,b.endDate)+1 : null;
    return `
      <div class="finished-book">
        <div class="fb-head">
          <div>
            <div class="fb-title">${num}. ${b.title}</div>
            <div class="muted" style="font-size:.85rem">${b.author||"저자 미상"}${b.genre?" · "+b.genre:""}</div>
            <div class="fb-period">📅 ${b.startDate} ~ ${b.endDate}${days?` (${days}일간)`:""} · ${b.pages}쪽</div>
          </div>
          <div class="fb-badge">완독 ✓</div>
        </div>
        ${b.why?`<div class="muted" style="font-size:.83rem;margin-top:8px">💭 ${b.why}</div>`:""}
        ${notesHtml?`<div class="fb-notes"><b>📝 독서 노트</b>${notesHtml}</div>`:""}
      </div>`;
  }).join("");
}

/* =========================================================
   설정 / 백업
   ========================================================= */
function bindSettings(){
  document.getElementById("s_dday").value = S.ddayDate;
  document.getElementById("s_save").addEventListener("click", ()=>{
    const v = document.getElementById("s_dday").value;
    if(v){ S.ddayDate=v; save(); toast("입대일 저장 완료"); renderHeader(); renderDailyMessage(); }
  });
  document.getElementById("s_export").addEventListener("click", exportData);
  document.getElementById("s_import").addEventListener("click", ()=>document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", importData);
  document.getElementById("s_reset").addEventListener("click", ()=>{
    if(confirm("모든 기록을 삭제하고 처음부터 시작할까요? 되돌릴 수 없습니다.")){
      localStorage.removeItem(KEY); S = defaultState(); save(); location.reload();
    }
  });
}
function exportData(){
  const blob = new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=`growth180_backup_${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url); toast("백업 파일을 내보냈습니다");
}
function importData(e){
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    try{ S = JSON.parse(ev.target.result); save(); toast("복원 완료!"); location.reload(); }
    catch(err){ alert("올바른 백업 파일이 아닙니다."); }
  };
  reader.readAsText(file);
}

/* ---------- 토스트 ---------- */
let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2000);
}

/* ---------- 전역 노출 (인라인 onclick 대응) ---------- */
window.nextTrivia = nextTrivia;
window.updatePage = updatePage;
window.saveReadingNote = saveReadingNote;
window.finishBook = finishBook;

/* ---------- 시작 ---------- */
init();
