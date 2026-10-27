const $ = id => document.getElementById(id);
const fmt = (n,d=2) => Number(n).toLocaleString("en-US",{maximumFractionDigits:d});
const fmt0 = n => Number(n).toLocaleString("en-US",{maximumFractionDigits:0});
const state = {counts:{},animalCounts:{},feedsPerDay:2,autoSell:true,sc:0,azure:0,convert:true,adsEnabled:false,adsPerDay:10,ovenTier:1,ovenFilled:0};

function save(){try{localStorage.setItem("chefcalc",JSON.stringify(state));}catch(e){}}
function load(){
  try{Object.assign(state,JSON.parse(localStorage.getItem("chefcalc")||"{}"));}catch(e){}
  GAME.chefs.forEach(c=>state.counts[c.name]=Math.max(0,Math.floor(Number(state.counts[c.name])||0)));
  GAME.animals.forEach(a=>state.animalCounts[a.name]=Math.max(0,Math.floor(Number(state.animalCounts[a.name])||0)));
  state.feedsPerDay=[1,1.5,2,2.5,3].includes(Number(state.feedsPerDay))?Number(state.feedsPerDay):2;
  state.adsPerDay=Math.max(0,Math.min(GAME.maxAdsPerDay||10,Math.floor(Number(state.adsPerDay??10)||0)));
  $("scInput").value=Number(state.sc||0);$("azureInput").value=Number(state.azure||0);
  $("convertToggle").checked=state.convert!==false;$("adsToggle").checked=state.adsEnabled===true;
  state.ovenTier=Number(state.ovenTier)===2?2:1;
  state.ovenFilled=Math.max(0,Number(state.ovenFilled)||0);
  $("ovenTier").value=String(state.ovenTier);$("ovenFilled").value=state.ovenFilled;
  $("adsPerDay").value=state.adsPerDay;$("adsPerDayValue").textContent=state.adsPerDay;$("adsPerDay").disabled=!state.adsEnabled;
  $("feedsPerDay").value=String(state.feedsPerDay);
  state.autoSell=state.autoSell!==false;
  $("autoSellToggle").checked=state.autoSell;
}
function production(){return GAME.chefs.reduce((s,c)=>s+c.production*(state.counts[c.name]||0),0);}
function netKitchenProduction(){return Math.max(0,production()-farmTotals().dishesPerDay/24);}
function rewardsPerHour(){const p=netKitchenProduction();return{sc:p/GAME.rewardDishes*GAME.serviceCoinsPerReward,azure:p/GAME.rewardDishes*GAME.azurePerReward};}
function currentSC(){return Math.max(0,state.sc)+(state.convert?Math.max(0,state.azure)*(1+GAME.azureToScBonus):0);}
function effectiveKitchenSCPerHour(){const r=rewardsPerHour();return r.sc+(state.convert?r.azure*(1+GAME.azureToScBonus):0);}
function farmTotals(){
  const feeds=Number(state.feedsPerDay)||0;
  let dishesPerDay=0,productsPerDay=0,potentialSalesPerDay=0;
  const rows=GAME.animals.map(a=>{
    const count=Number(state.animalCounts[a.name])||0;
    const feedsAnimal=count*feeds;
    const dishes=feedsAnimal*a.dishesPerFeed;
    const products=feedsAnimal;
    const potentialSales=products*a.sellPrice;
    dishesPerDay+=dishes;productsPerDay+=products;potentialSalesPerDay+=potentialSales;
    return {animal:a,count,feeds:feedsAnimal,dishes,products,sales:potentialSales};
  });
  const foregoneSC=dishesPerDay/GAME.rewardDishes*GAME.serviceCoinsPerReward;
  const foregoneAzure=dishesPerDay/GAME.rewardDishes*GAME.azurePerReward;
  const opportunityCost=foregoneSC+(state.convert?foregoneAzure*(1+GAME.azureToScBonus):0);
  const salesPerDay=state.autoSell?potentialSalesPerDay:0;
  return {rows,dishesPerDay,productsPerDay,salesPerDay,potentialSalesPerDay,foregoneSC,foregoneAzure,opportunityCost,netPerDay:salesPerDay-opportunityCost};
}
function effectiveSCPerHour(){return effectiveKitchenSCPerHour()+farmTotals().salesPerDay/24;}
function netAzurePerHour(){return rewardsPerHour().azure;}
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
function renderAnimals(){
  $("animalGrid").innerHTML=GAME.animals.map((a,i)=>`<div class="animal-card"><div class="animal-title">${a.emoji} ${a.name}</div><div class="animal-meta">${a.productEmoji} ${a.product} • ${fmt0(a.dishesPerFeed)} dishes/feed</div><label for="animal-${i}">ADULT ANIMALS</label><input id="animal-${i}" type="number" min="0" step="1" value="${state.animalCounts[a.name]||0}" data-animal="${i}" aria-label="Number of adult ${a.name}s"><div class="animal-sale">${fmt0(a.sellPrice)} SC per ${a.product.toLowerCase()}</div></div>`).join("");
  document.querySelectorAll("[data-animal]").forEach(inp=>inp.addEventListener("input",e=>{const a=GAME.animals[Number(e.target.dataset.animal)];state.animalCounts[a.name]=Math.max(0,Math.floor(Number(e.target.value)||0));update();}));
}
function updateFarm(){
  const f=farmTotals();
  $("farmDishesDay").textContent=fmt0(f.dishesPerDay);
  $("farmProductsDay").textContent=fmt(f.productsPerDay,1);
  $("farmSalesDay").textContent=fmt(f.salesPerDay)+" SC";
  $("farmSaleStatus").textContent=state.autoSell?"Auto-sell enabled":"Products kept in inventory";
  $("autoSellStatus").textContent=state.autoSell?"Enabled":"Disabled";
  $("farmNetDay").textContent=(f.netPerDay>=0?"+":"")+fmt(f.netPerDay)+" SC";
  $("farmTableBody").innerHTML=f.rows.map(r=>`<tr><td class="chef-name">${r.animal.emoji} ${r.animal.name}</td><td>${fmt0(r.count)}</td><td>${fmt0(r.animal.dishesPerFeed)}</td><td>${fmt(r.feeds,1)}</td><td>${fmt(r.products,1)} ${r.animal.productEmoji}</td><td class="good">${fmt(r.sales)} SC</td></tr>`).join("");
}
function updateStats(){
  const p=production(),r=rewardsPerHour();
  const netP=netKitchenProduction();
  const farmSC= farmTotals().salesPerDay/24;
  $("dishesHour").textContent=fmt0(netP);$("scHour").textContent=fmt(r.sc+farmSC);$("azureHour").textContent=fmt(r.azure);
  $("usdHour").textContent="$"+fmt(r.azure/GAME.azurePerDollar,5);$("adsBonusDay").textContent=fmt0(adBonus());
}
function renderTable(){
  const chefRows=GAME.chefs.map(c=>`<tr><td class="chef-name">${c.emoji} ${c.name}</td><td>${fmt0(c.cost)} SC</td><td class="good">+${fmt0(c.production)} dishes/h</td><td>${timeTextFromMinutes(minutesForChef(c.cost))}</td></tr>`).join("");
  const animalRows=GAME.animals.map(a=>`<tr><td class="chef-name">${a.emoji} ${a.name}</td><td>${fmt0(a.cost)} SC</td><td class="good">${fmt0(a.dishesPerFeed)} dishes/feed • ${fmt0(a.sellPrice)} SC/${a.product.toLowerCase()}</td><td>${timeTextFromMinutes(minutesForChef(a.cost))}</td></tr>`).join("");
  const oven=GAME.oven;
  const ovenRow=`<tr class="oven-upgrade-row"><td class="chef-name">♨️ Oven Tier 2</td><td>${fmt0(oven.upgradeCost)} SC</td><td class="good">4,000,000 dish storage</td><td>${timeTextFromMinutes(minutesForChef(oven.upgradeCost))}</td></tr>`;
  $("nextChefBody").innerHTML=chefRows+animalRows+ovenRow;
}
function updateWithdrawal(){
  const dollars=Math.max(0,Number($("withdrawInput").value)||0),required=dollars*GAME.azurePerDollar,r=netAzurePerHour();
  const hours=r>0?Math.max(0,(required-Math.max(0,state.azure))/r):Infinity;
  $("azureRequired").textContent=fmt0(required);$("withdrawTime").textContent=state.azure>=required?"Ready now":timeText(hours);
}
function updateOven(){
  const capacity=state.ovenTier===2?GAME.oven.tier2Capacity:GAME.oven.tier1Capacity;
  const remaining=Math.max(0,capacity-Math.min(capacity,state.ovenFilled));
  const p=netKitchenProduction();
  $("ovenRemaining").textContent=fmt0(remaining);
  $("ovenTime").textContent=remaining===0?"Full":p>0?timeText(remaining/p):"—";
  $("ovenUpgrade").disabled=state.ovenTier===2;
  $("ovenUpgrade").textContent=state.ovenTier===2?"Oven Tier 2 selected":"Upgrade to Tier 2 — "+fmt0(GAME.oven.upgradeCost)+" SC";
}
function update(){
  state.sc=Math.max(0,Number($("scInput").value)||0);state.azure=Math.max(0,Number($("azureInput").value)||0);
  state.convert=$("convertToggle").checked;state.adsEnabled=$("adsToggle").checked;
  state.feedsPerDay=Number($("feedsPerDay").value)||2;
  state.autoSell=$("autoSellToggle").checked;
  state.adsPerDay=Math.max(0,Math.min(GAME.maxAdsPerDay||10,Math.floor(Number($("adsPerDay").value)||0)));
  $("adsPerDayValue").textContent=state.adsPerDay;$("adsPerDay").disabled=!state.adsEnabled;
  state.ovenTier=Number($("ovenTier").value)===2?2:1;
  state.ovenFilled=Math.max(0,Number($("ovenFilled").value)||0);
  const maxCapacity=state.ovenTier===2?GAME.oven.tier2Capacity:GAME.oven.tier1Capacity;
  state.ovenFilled=Math.min(state.ovenFilled,maxCapacity);
  if(Number($("ovenFilled").value)!==state.ovenFilled)$("ovenFilled").value=state.ovenFilled;
  updateStats();updateFarm();renderTable();updateWithdrawal();updateOven();save();
}
["scInput","azureInput","convertToggle","withdrawInput","adsToggle","adsPerDay","ovenTier","ovenFilled","feedsPerDay","autoSellToggle"].forEach(id=>{ $(id).addEventListener("input",update);$(id).addEventListener("change",update);});
$("ovenUpgrade").addEventListener("click",()=>{if(state.ovenTier===1){$("ovenTier").value="2";update();}});
document.querySelectorAll(".quick button").forEach(b=>b.addEventListener("click",()=>{$("withdrawInput").value=b.dataset.amount;update();}));
document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{
  const tab=button.dataset.tab;
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===button));
  document.querySelectorAll(".kitchen-page").forEach(el=>el.hidden=tab!=="kitchenPage");
  $("farmPage").hidden=tab!=="farmPage";
  window.scrollTo({top:0,behavior:"smooth"});
}));
load();renderChefs();renderAnimals();update();