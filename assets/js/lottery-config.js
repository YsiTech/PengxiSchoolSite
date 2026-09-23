/* ===================================================================
   蓬溪格勒人民高等中学 · 抽奖奖品配置
   ★★★ 想改奖品，只改这个文件 ★★★
   =================================================================== */

window.LOTTERY_CONFIG = {

  /* 每次抽奖消耗多少星币 */
  cost: 50,

  /* 奖品列表
     weight 是权重，不是百分比。所有 weight 加起来的和作为分母。
     例如全部权重加起来 100，其中 weight=40 的就是 40% 概率。
     type 说明：
       - 'cash'    ：星币奖励，reward 是加多少星币
       - 'nothing' ：再接再厉，reward 填 0
       - 'gift'    ：实物小礼品，需要用户填地址
  */
  prizes: [

    {
      id: 'p_nothing',
      name: '再接再厉',
      type: 'nothing',
      reward: 0,
      weight: 20,
      emoji: '🍀'
    },

    {
      id: 'p_20',
      name: '20 亚斯卢布',
      type: 'cash',
      reward: 20,
      weight: 25,
      emoji: '💰'
    },

    {
      id: 'p_50',
      name: '50 亚斯卢布',
      type: 'cash',
      reward: 50,
      weight: 35,
      emoji: '💰'
    },

    {
      id: 'p_100',
      name: '100 亚斯卢布',
      type: 'cash',
      reward: 100,
      weight: 10,
      emoji: '💎'
    },

    {
      id: 'p_200',
      name: '200 亚斯卢布',
      type: 'cash',
      reward: 200,
      weight: 5,
      emoji: '💎'
    },

    {
      id: 'p_500',
      name: '500 亚斯卢布',
      type: 'cash',
      reward: 500,
      weight: 3,
      emoji: '👑'
    },

    {
      id: 'p_gift',
      name: '亚斯精美小礼品',
      type: 'gift',
      reward: 0,
      weight: 2,
      emoji: '🎁'
    }

  ]

};

/* 按权重随机抽一个奖品 */
window.LOTTERY_DRAW = function () {
  var cfg = window.LOTTERY_CONFIG;
  var total = 0;
  cfg.prizes.forEach(function (p) { total += p.weight; });

  var r = Math.random() * total;
  var acc = 0;
  for (var i = 0; i < cfg.prizes.length; i++) {
    acc += cfg.prizes[i].weight;
    if (r < acc) return cfg.prizes[i];
  }
  return cfg.prizes[cfg.prizes.length - 1];
};