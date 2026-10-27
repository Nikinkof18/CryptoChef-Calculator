// Game configuration
const GAME = {
  rewardDishes: 1000,
  serviceCoinsPerReward: 5,
  azurePerReward: 5,
  azureToScBonus: 0.10,
  azurePerDollar: 10000,
  serviceCoinsPerAd: 10,
  maxAdsPerDay: 10,
  oven: { tier1Capacity: 2000000, tier2Capacity: 4000000, upgradeCost: 200000 },
  animals: [
    { name: "Chicken", baby: "Chick", dishesPerFeed: 1000, product: "Egg", productEmoji: "🥚", sellPrice: 12, cost: 1000, emoji: "🐔" },
    { name: "Pig", baby: "Piglet", dishesPerFeed: 5000, product: "Truffle", productEmoji: "🍄", sellPrice: 62, cost: 5000, emoji: "🐷" },
    { name: "Sheep", baby: "Lamb", dishesPerFeed: 25000, product: "Wool", productEmoji: "🧶", sellPrice: 310, cost: 25000, emoji: "🐑" },
    { name: "Cow", baby: "Calf", dishesPerFeed: 125000, product: "Milk", productEmoji: "🥛", sellPrice: 1550, cost: 125000, emoji: "🐮" }
  ],
  chefs: [
    { name: "Kitchen Porter", production: 42, cost: 1000, emoji: "🍽️" },
    { name: "Junior Chef", production: 221, cost: 5000, emoji: "🔪" },
    { name: "Sous Chef", production: 1160, cost: 25000, emoji: "👨‍🍳" },
    { name: "Head Chef", production: 6091, cost: 125000, emoji: "🧑‍🍳" },
    { name: "Executive Chef", production: 31979, cost: 625000, emoji: "🎩" }
  ]
};
