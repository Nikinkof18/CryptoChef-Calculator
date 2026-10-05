const $ = id => document.getElementById(id);
const fmt = (n,d=2) => Number(n).toLocaleString("en-US",{maximumFractionDigits:d});
const fmt0 = n => Number(n).toLocaleString("en-US",{maximumFractionDigits:0});
const state = { counts: {}, sc:23.24, azure:23.24, dishes:0, convert:true, goal:"growth" };

function save(){localStorage.setItem("chefcalc",JSON.stringify(state))}
function load(){
  try{Object.assign(state,JSON.parse(localStorage.getItem("chefcalc")||"{}"))}catch(e){}
  GAME.chefs.forEach(c=>state.counts[c.name]=Number(state.counts[c.name]||0));
  $("scInput").value=state.sc; $("azureInput").value=state.azure; $("dishesInput").value=state.dishes;
  $("convertToggle").checked=state.convert;
}

function production(){
  return GAME.chefs.reduce((sum,c)=>sum+c.production*(state.counts[c.name]||0),0);
}
function rewardsPerHour(){
  const p=production();
  return {sc:p/GAME.rewardDishes*GAME.serviceCoinsPerReward, azure:p/GAME.rewardDishes*GAME.azurePerReward};
}
function effectiveSC(){
  return state.sc+(state.convert?state.azure*(1+GAME.azureToScBonus):0);
}
function hoursFor(cost){
  const r=rewardsPerHour().sc;
  const available=effectiveSC();
  if(available>=cost)return 0;
  return (cost-available)/r;
}
function timeText(h){
  if(!isFinite(h)) return "—";
  if(h<=0)return "Ready now";
  const total=Math.ceil(h*60);
  const days=Math.floor(total/1440), hrs=Math.floor((total%1440)/60), mins=total%60;
  return `${days?days+"d ":""}${hrs?hrs+"h ":""}${mins}m`;
}
function payback(c){
  const gain=c.production;
  const scCost=c.cost;
  const scPerHourGain=gain/GAME.rewardDishes*GAME.serviceCoinsPerReward;
  return scPerHourGain>0?scCost/scPerHourGain:Infinity;
}

function renderChefs(){
  $("chefGrid").innerHTML=GAME.chefs.map((c,i)=>`
    <div class="chef-card">
      <div class="name">${c.emoji} ${c.name}</div>
      <small>${fmt(c.production,0)} dishes / hour • ${fmt0(c.cost)} SC</small>
      <input type="number" min="0" step="1" value="${state.counts[c.name]||0}" data-chef="${i}">
    </div>`).join("");
  document.querySelectorAll("[data-chef]").forEach(inp=>inp.addEventListener("input",e=>{
    const c=GAME.chefs[Number(e.target.dataset.chef)];
    state.counts[c.name]=Math.max(0,Math.floor(Number(e.target.value)||0)); update();
  }));
}

function updateStats(){
  const p=production(), r=rewardsPerHour();
  $("dishesHour").textContent=fmt0(p);
  $("scHour").textContent=fmt(r.sc);
  $("azureHour").textContent=fmt(r.azure);
  $("usdHour").textContent="$"+fmt(r.azure/GAME.azurePerDollar,5);
}
function renderTable(){
  const rows=GAME.chefs.map(c=>{
    const h=hoursFor(c.cost), pb=payback(c);
    return `<tr><td class="chef-name">${c.emoji} ${c.name}</td><td>${fmt0(c.cost)} SC</td><td class="good">+${fmt0(c.production)}/h</td><td>${timeText(h)}</td><td>${timeText(pb)}</td></tr>`;
  });
  $("nextChefBody").innerHTML=rows.join("");
}
function updateWithdrawal(){
  const dollars=Math.max(0,Number($("withdrawInput").value)||0);
  const required=dollars*GAME.azurePerDollar;
  const r=rewardsPerHour().azure;
  const hours=Math.max(0,(required-state.azure)/r);
  $("azureRequired").textContent=fmt0(required);
  $("withdrawTime").textContent=state.azure>=required?"Ready now":timeText(hours);
}

function update(){
  state.sc=Number($("scInput").value)||0;
  state.azure=Number($("azureInput").value)||0;
  state.dishes=Number($("dishesInput").value)||0;
  state.convert=$("convertToggle").checked;
  updateStats(); renderTable(); updateWithdrawal(); save();
}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); $("tab-"+b.dataset.tab).classList.add("active");
}));
["scInput","azureInput","dishesInput","convertToggle","withdrawInput"].forEach(id=>{
  $(id).addEventListener("input",update); $(id).addEventListener("change",update);
});
document.querySelectorAll(".quick button").forEach(b=>b.addEventListener("click",()=>{$("withdrawInput").value=b.dataset.amount;update()}));

load(); renderChefs(); update();
