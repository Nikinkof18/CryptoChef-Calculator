const $ = id => document.getElementById(id);
const fmt = (n,d=2) => Number(n).toLocaleString("en-US",{maximumFractionDigits:d});
const fmt0 = n => Number(n).toLocaleString("en-US",{maximumFractionDigits:0});
const state = {counts:{},sc:0,azure:0,convert:true,adsEnabled:false,adsPerDay:10};

function save(){try{localStorage.setItem("chefcalc",JSON.stringify(state));}catch(e){}}
function load(){
  try{Object.assign(state,JSON.parse(localStorage.getItem("chefcalc")||"{}"));}catch(e){}
  GAME.chefs.forEach(c=>state.counts[c.name]=Math.max(0,Math.floor(Number(state.counts[c.name])||0)));
  state.adsPerDay=Math.max(0,Math.min(GAME.maxAdsPerDay||10,Math.floor(Number(state.adsPerDay??10)||0)));
  $("scInput").value=Number(state.sc||0);$("azureInput").value=Number(state.azure||0);
  $("convertToggle").checked=state.convert!==false;$("adsToggle").checked=state.adsEnabled===true;
  $("adsPerDay").value=state.adsPerDay;$("adsPerDayValue").textContent=state.adsPerDay;$("adsPerDay").disabled=!state.adsEnabled;
}
function production(){return GAME.chefs.reduce((s,c)=>s+c.production*(state.counts[c.name]||0),0);}
function rewardsPerHour(){const p=production();return{sc:p/GAME.rewardDishes*GAME.serviceCoinsPerReward,azure:p/GAME.rewardDishes*GAME.azurePerReward};}
function currentSC(){return Math.max(0,state.sc)+(state.convert?Math.max(0,state.azure)*(1+GAME.azureToScBonus):0);}
function effectiveSCPerHour(){const r=rewardsPerHour();return r.sc+(state.convert?r.azure*(1+GAME.azureToScBonus):0);}
function adBonus(){return state.adsEnabled?state.adsPerDay*(GAME.serviceCoinsPerAd||25):0;}

/* Ads are credited instantly: assume today's selected ads are watched at t=0.
   For longer waits, the same ad bonus is credited at each 24-hour reset. */
function minutesForChef(cost){
  let balance=currentSC()+adBonus();
  const target=Number(cost)||0;
  if(balance>=target)return 0;
  const ratePerMinute=effectiveSCPerHour()/60;
  if(ratePerMinute<=0)return Infinity;
  let minutes=0;
  const dailyAds=adBonus();
  while(balance<target && minutes<60*24*365*20){
    const untilReset=1440-(minutes%1440);
    const neededMinutes=Math.ceil((target-balance)/ratePerMinute);
    if(neededMinutes<=untilReset){minutes+=neededMinutes;balance+=neededMinutes*ratePerMinute;break;}
    balance+=untilReset*ratePerMinute;minutes+=untilReset;
    if(balance<target)balance+=dailyAds;
  }
  return balance>=target?minutes:Infinity;
}
function timeTextFromMinutes(total){
  if(!isFinite(total))return "—";
  if(total<=0)return "Ready now";
  total=Math.ceil(total);
  const days=Math.floor(total/1440),hrs=Math.floor((total%1440)/60),mins=total%60;
  const parts=[];if(days)parts.push(days+"d");if(hrs)parts.push(hrs+"h");if(mins||parts.length===0)parts.push(mins+"m");return parts.join(" ");
}
function timeText(hours){return timeTextFromMinutes(hours*60);}
function renderChefs(){
  $("chefGrid").innerHTML=GAME.chefs.map((c,i)=>`<div class="chef-card"><div class="name">${c.emoji} ${c.name}</div><small>${fmt(c.production,0)} dishes / hour • ${fmt0(c.cost)} SC</small><input type="number" min="0" step="1" value="${state.counts[c.name]||0}" data-chef="${i}" aria-label="${c.name} quantity"></div>`).join("");
  document.querySelectorAll("[data-chef]").forEach(inp=>inp.addEventListener("input",e=>{const c=GAME.chefs[Number(e.target.dataset.chef)];state.counts[c.name]=Math.max(0,Math.floor(Number(e.target.value)||0));update();}));
}
function updateStats(){
  const p=production(),r=rewardsPerHour();
  $("dishesHour").textContent=fmt0(p);$("scHour").textContent=fmt(r.sc);$("azureHour").textContent=fmt(r.azure);
  $("usdHour").textContent="$"+fmt(r.azure/GAME.azurePerDollar,5);$("adsBonusDay").textContent=fmt0(adBonus());
}
function renderTable(){
  $("nextChefBody").innerHTML=GAME.chefs.map(c=>`<tr><td class="chef-name">${c.emoji} ${c.name}</td><td>${fmt0(c.cost)} SC</td><td class="good">+${fmt0(c.production)}/h</td><td>${timeTextFromMinutes(minutesForChef(c.cost))}</td></tr>`).join("");
}
function updateWithdrawal(){
  const dollars=Math.max(0,Number($("withdrawInput").value)||0),required=dollars*GAME.azurePerDollar,r=rewardsPerHour().azure;
  const hours=r>0?Math.max(0,(required-Math.max(0,state.azure))/r):Infinity;
  $("azureRequired").textContent=fmt0(required);$("withdrawTime").textContent=state.azure>=required?"Ready now":timeText(hours);
}
function update(){
  state.sc=Math.max(0,Number($("scInput").value)||0);state.azure=Math.max(0,Number($("azureInput").value)||0);
  state.convert=$("convertToggle").checked;state.adsEnabled=$("adsToggle").checked;
  state.adsPerDay=Math.max(0,Math.min(GAME.maxAdsPerDay||10,Math.floor(Number($("adsPerDay").value)||0)));
  $("adsPerDayValue").textContent=state.adsPerDay;$("adsPerDay").disabled=!state.adsEnabled;
  updateStats();renderTable();updateWithdrawal();save();
}
["scInput","azureInput","convertToggle","withdrawInput","adsToggle","adsPerDay"].forEach(id=>{ $(id).addEventListener("input",update);$(id).addEventListener("change",update);});
document.querySelectorAll(".quick button").forEach(b=>b.addEventListener("click",()=>{$("withdrawInput").value=b.dataset.amount;update();}));
load();renderChefs();update();