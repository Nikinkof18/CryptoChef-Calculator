const $ = id => document.getElementById(id);
const fmt = (n,d=2) => Number(n).toLocaleString("en-US",{maximumFractionDigits:d});
const fmt0 = n => Number(n).toLocaleString("en-US",{maximumFractionDigits:0});

const state = { counts:{}, sc:0, azure:0, convert:true, adsEnabled:false, adsPerDay:10 };

function save(){ localStorage.setItem("chefcalc", JSON.stringify(state)); }
function load(){
  try { Object.assign(state, JSON.parse(localStorage.getItem("chefcalc") || "{}")); } catch(e) {}
  GAME.chefs.forEach(c => state.counts[c.name] = Math.max(0, Math.floor(Number(state.counts[c.name]) || 0)));
  state.adsPerDay = Math.max(0, Math.min(10, Math.floor(Number(state.adsPerDay) || 0)));
  $("scInput").value = Number(state.sc || 0);
  $("azureInput").value = Number(state.azure || 0);
  $("convertToggle").checked = state.convert !== false;
  $("adsToggle").checked = state.adsEnabled === true;
  $("adsPerDay").value = state.adsPerDay;
  $("adsPerDayValue").textContent = state.adsPerDay;
  $("adsPerDay").disabled = !state.adsEnabled;
}

function production(){
  return GAME.chefs.reduce((sum,c)=>sum+c.production*(state.counts[c.name]||0),0);
}
function rewardsPerHour(){
  const p = production();
  return {
    sc: p / GAME.rewardDishes * GAME.serviceCoinsPerReward,
    azure: p / GAME.rewardDishes * GAME.azurePerReward
  };
}
function currentSC(){
  return state.sc + (state.convert ? state.azure * (1 + GAME.azureToScBonus) : 0);
}
function effectiveSCPerHour(){
  const r = rewardsPerHour();
  return r.sc + (state.convert ? r.azure * (1 + GAME.azureToScBonus) : 0);
}
function adsPerDaySC(){
  return state.adsEnabled ? state.adsPerDay * GAME.serviceCoinsPerAd : 0;
}

/*
  The ads are credited instantly when watched. For a future-time estimate, we
  convert the daily allowance into an average hourly rate (daily SC / 24).
  This is an estimate; the exact time also depends on when the user watches
  today's remaining ads and when the daily limit resets.
*/
function effectiveSCPerHourWithAds(){
  return effectiveSCPerHour() + adsPerDaySC()/24;
}
function hoursForChef(cost){
  const available = currentSC();
  if(available >= cost) return 0;
  const rate = effectiveSCPerHourWithAds();
  if(rate <= 0) return Infinity;
  return (cost - available) / rate;
}
function timeText(h){
  if(!isFinite(h)) return "—";
  if(h <= 0) return "Ready now";
  const total = Math.ceil(h * 60);
  const days = Math.floor(total / 1440);
  const hrs = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const parts = [];
  if(days) parts.push(days+"d");
  if(hrs) parts.push(hrs+"h");
  if(mins || parts.length===0) parts.push(mins+"m");
  return parts.join(" ");
}
function renderChefs(){
  $("chefGrid").innerHTML = GAME.chefs.map((c,i)=>`
    <div class="chef-card">
      <div class="name">${c.emoji} ${c.name}</div>
      <small>${fmt(c.production,0)} dishes / hour • ${fmt0(c.cost)} SC</small>
      <input type="number" min="0" step="1" value="${state.counts[c.name]||0}" data-chef="${i}" aria-label="${c.name} quantity">
    </div>`).join("");
  document.querySelectorAll("[data-chef]").forEach(inp=>{
    inp.addEventListener("input",e=>{
      const c = GAME.chefs[Number(e.target.dataset.chef)];
      state.counts[c.name] = Math.max(0, Math.floor(Number(e.target.value)||0));
      update();
    });
  });
}
function updateStats(){
  const p = production(), r = rewardsPerHour();
  $("dishesHour").textContent = fmt0(p);
  $("scHour").textContent = fmt(r.sc);
  $("azureHour").textContent = fmt(r.azure);
  $("usdHour").textContent = "$" + fmt(r.azure / GAME.azurePerDollar,5);
  $("adsBonusHour").textContent = fmt(adsPerDaySC()/24);
  $("adsBonusDay").textContent = fmt0(adsPerDaySC());
  $("scEffectiveHour").textContent = fmt(effectiveSCPerHourWithAds());
}
function renderTable(){
  $("nextChefBody").innerHTML = GAME.chefs.map(c=>`
    <tr>
      <td class="chef-name">${c.emoji} ${c.name}</td>
      <td>${fmt0(c.cost)} SC</td>
      <td class="good">+${fmt0(c.production)}/h</td>
      <td>${timeText(hoursForChef(c.cost))}</td>
    </tr>`).join("");
}
function updatePlanner(){
  const target = $("targetChef").value;
  const chef = GAME.chefs.find(c=>c.name===target);
  const balance = currentSC();
  const missing = Math.max(0, chef.cost - balance);
  const rate = effectiveSCPerHourWithAds();
  $("plannerCost").textContent = fmt0(chef.cost) + " SC";
  $("plannerMissing").textContent = fmt0(missing) + " SC";
  $("plannerTime").textContent = missing === 0 ? "Ready now" : timeText(rate > 0 ? missing/rate : Infinity);
  $("plannerAds").textContent = state.adsEnabled ? `${state.adsPerDay} ads/day (${fmt0(adsPerDaySC())} SC/day)` : "Ads disabled";
  $("plannerDays").textContent = state.adsEnabled && state.adsPerDay > 0
    ? `${Math.ceil(missing / Math.max(1, rate*24))} day(s) estimated at current rates`
    : "—";
}
function updateWithdrawal(){
  const dollars = Math.max(0,Number($("withdrawInput").value)||0);
  const required = dollars * GAME.azurePerDollar;
  const r = rewardsPerHour().azure;
  const hours = r > 0 ? Math.max(0,(required-state.azure)/r) : Infinity;
  $("azureRequired").textContent = fmt0(required);
  $("withdrawTime").textContent = state.azure >= required ? "Ready now" : timeText(hours);
}
function update(){
  state.sc = Math.max(0,Number($("scInput").value)||0);
  state.azure = Math.max(0,Number($("azureInput").value)||0);
  state.convert = $("convertToggle").checked;
  state.adsEnabled = $("adsToggle").checked;
  state.adsPerDay = Math.max(0,Math.min(10,Math.floor(Number($("adsPerDay").value)||0)));
  $("adsPerDayValue").textContent = state.adsPerDay;
  $("adsPerDay").disabled = !state.adsEnabled;
  updateStats();
  renderTable();
  updatePlanner();
  updateWithdrawal();
  save();
}

["scInput","azureInput","convertToggle","withdrawInput","adsToggle","adsPerDay","targetChef"].forEach(id=>{
  $(id).addEventListener("input",update);
  $(id).addEventListener("change",update);
});
document.querySelectorAll(".quick button").forEach(b=>{
  b.addEventListener("click",()=>{
    $("withdrawInput").value=b.dataset.amount;
    update();
  });
});

load();
$("targetChef").innerHTML = GAME.chefs.map(c=>`<option value="${c.name}">${c.name} — ${fmt0(c.cost)} SC</option>`).join("");
renderChefs();
update();
