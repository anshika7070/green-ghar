const $ = (id) => document.getElementById(id);
const KEY = "greenghar_v2";
let impactChart = null;
let mobileNetModel = null;
let currentAuthMode = "login";

const defaultState = {
  currentUser: null,
  users: {},
  profiles: {},
  theme: "light",
  data: { energy: 0, water: 0, waste: 0, carbon: 0 },
  history: { energy: [0,0,0,0,0,0], water: [0,0,0,0,0,0], carbon: [0,0,0,0,0,0] },
  lastClassifier: null
};

let state = loadState();

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? deepMerge(defaultState, saved) : structuredClone(defaultState);
  }catch(e){ return structuredClone(defaultState); }
}
function deepMerge(base, saved){
  const out = structuredClone(base);
  for(const k in saved){
    if(saved[k] && typeof saved[k]==="object" && !Array.isArray(saved[k]) && out[k]) out[k] = deepMerge(out[k], saved[k]);
    else out[k] = saved[k];
  }
  return out;
}
function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function profileKey(){ return state.currentUser || "guest"; }
function getProfile(){
  if(!state.profiles[profileKey()]){
    state.profiles[profileKey()] = {data:{energy:0,water:0,waste:0,carbon:0},history:{energy:[0,0,0,0,0,0],water:[0,0,0,0,0,0],carbon:[0,0,0,0,0,0]}};
  }
  return state.profiles[profileKey()];
}
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2400);
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

/* AUTH */
document.querySelectorAll(".auth-tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    currentAuthMode=btn.dataset.auth;
    document.querySelectorAll(".auth-tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    $("nameGroup").classList.toggle("hidden", currentAuthMode!=="signup");
    $("authSubmit").textContent=currentAuthMode==="signup"?"Create account":"Login";
  });
});
$("authForm").addEventListener("submit",e=>{
  e.preventDefault();
  const email=$("authEmail").value.trim().toLowerCase();
  const password=$("authPassword").value;
  const name=$("authName").value.trim();

  if(currentAuthMode==="signup"){
    if(!name) return toast("Please enter your name.");
    if(state.users[email]) return toast("Account already exists. Login instead.");
    state.users[email]={password, name};
    state.currentUser=email;
    saveState();
    enterApp();
    toast("Account created locally 🎉");
  }else{
    const user=state.users[email];
    if(!user || user.password!==password) return toast("Invalid demo login details.");
    state.currentUser=email; saveState(); enterApp(); toast("Welcome back 🌱");
  }
});
$("logoutBtn").addEventListener("click",()=>{
  state.currentUser=null; saveState(); $("app").classList.add("hidden"); $("authScreen").classList.remove("hidden");
  $("authForm").reset();
});
function enterApp(){
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  const user=state.users[state.currentUser] || {name:"Green Hero"};
  $("welcomeName").textContent=user.name.split(" ")[0];
  $("sideName").textContent=user.name;
  $("sideEmail").textContent=state.currentUser;
  $("sideAvatar").textContent=(user.name[0]||"G").toUpperCase();
  applyTheme();
  refresh();
}
if(state.currentUser && state.users[state.currentUser]) enterApp();

/* THEME */
function applyTheme(){
  document.documentElement.dataset.theme=state.theme==="dark"?"dark":"light";
  $("themeBtn").textContent=state.theme==="dark"?"☀️ Light mode":"🌙 Dark mode";
  $("topThemeBtn").textContent=state.theme==="dark"?"☀️":"🌙";
  if(impactChart) impactChart.destroy();
  drawChart();
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();}
$("themeBtn").addEventListener("click",toggleTheme);
$("topThemeBtn").addEventListener("click",toggleTheme);

/* MOBILE NAV */
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>$("sidebar").classList.remove("open")));

/* DATA */
function refresh(){
  const p=getProfile();
  state.data=p.data;
  state.history=p.history;
  updateDashboard();
  drawChart();
  renderLeaderboard();
}
function setData(){
  const p=getProfile(); p.data=state.data; p.history=state.history; saveState();
}
function pushHistory(arr,val){
  arr.push(Number(val)||0); if(arr.length>6) arr.shift();
}
function calculateScore(){
  const d=state.data;
  const energyScore=d.energy<=0?75:Math.max(20,Math.min(100,100-(d.energy/8)));
  const waterScore=d.water<=0?75:Math.max(20,Math.min(100,110-(d.water/2)));
  const wasteScore=Math.max(0,Math.min(100,d.waste));
  const carbonScore=d.carbon<=0?75:Math.max(20,Math.min(100,105-(d.carbon/10)));
  return {energy:Math.round(energyScore),water:Math.round(waterScore),waste:Math.round(wasteScore),carbon:Math.round(carbonScore),total:Math.round((energyScore+waterScore+wasteScore+carbonScore)/4)};
}
function updateDashboard(){
  const d=state.data, s=calculateScore();
  $("energyStat").textContent=d.energy.toFixed(1);
  $("waterStat").textContent=d.water.toFixed(1);
  $("wasteStat").textContent=Math.round(d.waste)+"%";
  $("carbonStat").textContent=d.carbon.toFixed(1);
  $("score").textContent=s.total;
  [["energyScore","energyBar",s.energy],["waterScore","waterBar",s.water],["wasteScore","wasteBar",s.waste],["carbonScore","carbonBar",s.carbon]].forEach(([t,b,v])=>{$(t).textContent=v+"%";$(b).style.width=v+"%";});
  let tip="Great start! Keep tracking your habits.";
  if(s.waste<50) tip="Start with waste segregation: separate wet, dry and e-waste every day.";
  else if(s.energy<60) tip="Try reducing high-power appliance usage and switch to efficient appliances.";
  else if(s.water<60) tip="Shorter showers and fixing leaks can make a large difference.";
  else if(s.carbon<60) tip="Walk, cycle or use public transport for short trips when practical.";
  $("smartTip").textContent=tip;
}
function drawChart(){
  const canvas=$("impactChart"); if(!canvas) return;
  const p=getProfile();
  const labels=["Jan","Feb","Mar","Apr","May","Jun"];
  const isDark=state.theme==="dark";
  impactChart=new Chart(canvas,{
    type:"line",
    data:{labels,datasets:[
      {label:"Energy (kWh)",data:p.history.energy,borderWidth:3,tension:.35},
      {label:"Water (L)",data:p.history.water,borderWidth:3,tension:.35},
      {label:"Carbon (kg CO₂e)",data:p.history.carbon,borderWidth:3,tension:.35}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
      scales:{x:{ticks:{color:isDark?"#9caf9f":"#66756d"},grid:{display:false}},y:{ticks:{color:isDark?"#9caf9f":"#66756d"},grid:{color:isDark?"#203b2a":"#e4ece7"}}},
      plugins:{legend:{labels:{color:isDark?"#e8f5ec":"#13231a",font:{size:10}}}}
    }
  });
}

/* ENERGY */
$("energyForm").addEventListener("submit",e=>{
  e.preventDefault();
  const kw=+$("appliance").value, hours=+$("hours").value, qty=+$("quantity").value;
  if(hours<0 || qty<1 || Number.isNaN(hours)) return toast("Enter valid energy values.");
  const result=kw*hours*30*qty;
  state.data.energy=result; pushHistory(state.history.energy,result);
  $("energyResult").textContent=result.toFixed(1)+" kWh";
  $("energyAdvice").textContent=result>300?"High use: reduce AC/large-appliance runtime where practical.":"Good start: use efficient appliances and avoid standby power.";
  setData(); updateDashboard(); drawChart(); toast("Energy data saved ⚡");
});

/* WATER */
$("waterForm").addEventListener("submit",e=>{
  e.preventDefault();
  const vals=["drinking","bathing","kitchen","otherWater"].map(id=>Math.max(0,+$(id).value||0));
  const total=vals.reduce((a,b)=>a+b,0);
  state.data.water=total; pushHistory(state.history.water,total);
  $("waterResult").textContent=total.toFixed(1)+" L";
  $("waterAdvice").textContent=total<=100?"Excellent: your entered usage is relatively low.":total<=200?"Moderate use: look for leaks and reduce unnecessary running water.":"High use: prioritize shorter showers, leak repairs and water reuse.";
  setData(); updateDashboard(); drawChart(); toast("Water data saved 💧");
});

/* WASTE + MOBILENET */
const wasteMap={
  "banana":"Wet Waste","apple":"Wet Waste","orange":"Wet Waste","lemon":"Wet Waste","broccoli":"Wet Waste","cauliflower":"Wet Waste","pizza":"Wet Waste","hot dog":"Wet Waste",
  "bottle":"Plastic","water bottle":"Plastic","plastic bag":"Plastic","bucket":"Plastic","container":"Plastic",
  "can":"Dry Waste","carton":"Dry Waste","envelope":"Dry Waste","paper towel":"Dry Waste","newspaper":"Dry Waste","book":"Dry Waste","cardboard":"Dry Waste",
  "cell phone":"E-Waste","mobile phone":"E-Waste","laptop":"E-Waste","computer":"E-Waste","mouse":"E-Waste","keyboard":"E-Waste","remote control":"E-Waste","television":"E-Waste"
};
function categoryFor(label){
  const l=label.toLowerCase();
  for(const k in wasteMap) if(l.includes(k)) return wasteMap[k];
  if(/fruit|vegetable|food|bread|sandwich|meat/.test(l)) return "Wet Waste";
  if(/plastic|bottle|bag|cup|wrapper/.test(l)) return "Plastic";
  if(/paper|book|carton|box|cardboard/.test(l)) return "Dry Waste";
  if(/phone|computer|laptop|keyboard|mouse|screen|electronic/.test(l)) return "E-Waste";
  return "Needs manual check";
}
async function loadMobileNet(){
  try{
    $("modelStatus").textContent="Loading AI model…";
    mobileNetModel=await mobilenet.load({version:2,alpha:1.0});
    $("modelStatus").textContent="AI ready ✓";
  }catch(e){
    $("modelStatus").textContent="AI unavailable";
    console.error(e);
  }
}
loadMobileNet();

$("chooseImage").addEventListener("click",()=>$("wasteFile").click());
$("wasteFile").addEventListener("change",e=>handleImage(e.target.files[0]));
["dragenter","dragover"].forEach(ev=>$("dropZone").addEventListener(ev,e=>{e.preventDefault();$("preview").classList.add("drag");}));
["dragleave","drop"].forEach(ev=>$("dropZone").addEventListener(ev,e=>{e.preventDefault();$("preview").classList.remove("drag");}));
$("dropZone").addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f)handleImage(f);});
async function handleImage(file){
  if(!file || !file.type.startsWith("image/")) return toast("Please choose an image.");
  const url=URL.createObjectURL(file);
  $("preview").innerHTML=`<img id="wasteImg" src="${url}" alt="Uploaded waste">`;
  $("aiProgress").style.width="25%";
  $("classifierTitle").textContent="Analyzing image…";
  $("classifierText").textContent="MobileNet is identifying the most likely visible object.";
  $("predictions").innerHTML="";
  $("wasteCategory").textContent="Category: analyzing…";
  try{
    if(!mobileNetModel) await loadMobileNet();
    $("aiProgress").style.width="55%";
    const img=$("wasteImg");
    const predictions=await mobileNetModel.classify(img,5);
    $("aiProgress").style.width="85%";
    const best=predictions[0];
    const category=categoryFor(best.className);
    $("classifierTitle").textContent=best.className;
    $("classifierText").textContent="Top MobileNet predictions:";
    $("predictions").innerHTML=predictions.map(p=>`<div class="prediction"><span>${escapeHtml(p.className)}</span><b>${(p.probability*100).toFixed(1)}%</b></div>`).join("");
    $("wasteCategory").textContent="Category: "+category;
    state.lastClassifier={label:best.className,category,confidence:best.probability};
    $("aiProgress").style.width="100%";
    saveState();
  }catch(err){
    console.error(err);
    $("classifierTitle").textContent="Could not classify";
    $("classifierText").textContent="The model could not process this image. Try a clear photo.";
    $("wasteCategory").textContent="Category: —";
    $("aiProgress").style.width="0";
  }
}
$("markWaste").addEventListener("click",()=>{
  if(!state.lastClassifier) return toast("Classify an image first.");
  state.data.waste=Math.min(100,state.data.waste+10);
  setData(); updateDashboard(); toast("Waste segregation recorded ♻️");
});

/* CARBON */
$("carbonForm").addEventListener("submit",e=>{
  e.preventDefault();
  const electricity=Math.max(0,+$("carbonElectricity").value||0);
  const car=Math.max(0,+$("carKm").value||0);
  const pub=Math.max(0,+$("publicKm").value||0);
  const lpg=Math.max(0,+$("lpgKg").value||0);
  // Illustrative demo factors; replace with verified India/region-specific factors.
  const parts={electricity:electricity*.70,car:car*.18,public:pub*.05,lpg:lpg*3.00};
  const total=Object.values(parts).reduce((a,b)=>a+b,0);
  state.data.carbon=total; pushHistory(state.history.carbon,total);
  $("carbonResult").textContent=total.toFixed(1);
  $("cfElectricity").textContent=parts.electricity.toFixed(1);
  $("cfCar").textContent=parts.car.toFixed(1);
  $("cfPublic").textContent=parts.public.toFixed(1);
  $("cfLpg").textContent=parts.lpg.toFixed(1);
  setData(); updateDashboard(); drawChart(); toast("Carbon footprint saved 🌍");
});

/* LEADERBOARD */
const demoLeaders=[
  {name:"Aarav",score:94,badge:"Eco Champion"},
  {name:"Meera",score:91,badge:"Green Star"},
  {name:"Riya",score:88,badge:"Eco Champion"},
  {name:"Kabir",score:84,badge:"Green Star"},
  {name:"Anshika",score:0,badge:"Your rank"}
];
function renderLeaderboard(){
  const user=state.users[state.currentUser]||{name:"You"};
  const score=calculateScore().total;
  let rows=demoLeaders.filter(x=>x.name.toLowerCase()!==user.name.toLowerCase()).concat([{name:user.name,score,badge:"Your rank",you:true}]);
  rows.sort((a,b)=>b.score-a.score);
  $("leaderRows").innerHTML=rows.map((r,i)=>`<div class="leader-row ${r.you?"you":""}"><span class="rank">#${i+1}</span><strong>${escapeHtml(r.name)}${r.you?" (You)":""}</strong><b>${r.score}</b><span class="badge">${r.badge}</span></div>`).join("");
}

/* ASSISTANT */
function assistantAnswer(q){
  const x=q.toLowerCase();
  if(x.includes("electric")||x.includes("energy")||x.includes("bill")) return "⚡ Reduce AC runtime where practical, use LED lighting, switch off unused devices and avoid standby power. Track your monthly kWh in the Energy section.";
  if(x.includes("water")) return "💧 Fix leaks, use shorter showers, turn off taps while brushing, run washing machines with full loads and reuse suitable greywater for plants/cleaning.";
  if(x.includes("waste")||x.includes("recycl")) return "♻️ Keep wet/organic waste separate from clean dry recyclables. Keep e-waste separate and send electronics to an authorized collection/recycling channel.";
  if(x.includes("carbon")||x.includes("co2")||x.includes("footprint")) return "🌍 The biggest household levers are electricity, private vehicle travel and cooking fuel. Try public transport, walking/cycling for short trips and efficient appliances when practical.";
  if(x.includes("plastic")) return "🧴 Prefer reusable bottles and bags, avoid unnecessary single-use packaging and keep recyclable plastic clean and dry before segregation.";
  return "🌱 Start with three habits: save electricity, reduce water waste and segregate waste correctly. You can use the calculators on this dashboard to measure progress.";
}
function sendQuestion(text){
  text=text.trim(); if(!text)return;
  const box=$("chatBox");
  box.innerHTML+=`<div class="user-message">${escapeHtml(text)}</div>`;
  setTimeout(()=>{box.innerHTML+=`<div class="bot-message">${assistantAnswer(text)}</div>`;box.scrollTop=box.scrollHeight;},250);
  $("userQuestion").value="";
}
$("sendQuestion").addEventListener("click",()=>sendQuestion($("userQuestion").value));
$("userQuestion").addEventListener("keydown",e=>{if(e.key==="Enter")sendQuestion(e.target.value)});
document.querySelectorAll(".quick-prompts button").forEach(b=>b.addEventListener("click",()=>sendQuestion(b.dataset.q)));

/* INITIAL */
if(!state.currentUser) $("app").classList.add("hidden");
