/* ===================================================================
   星图抽奖 · 奖品配置
   （由管理后台导出 · 2026/9/24 03:51:05）
   =================================================================== */

window.LOTTERY_CONFIG = {

  cost: 50,

  prizes: [
    { id: 'p20', name: '20 亚斯卢布', type: 'money', reward: 20, weight: 25 },
    { id: 'none', name: '再接再厉', type: 'none', reward: 0, weight: 25 },
    { id: 'p50', name: '50 亚斯卢布', type: 'money', reward: 50, weight: 20 },
    { id: 'p100', name: '100 亚斯卢布', type: 'money', reward: 100, weight: 15 },
    { id: 'p200', name: '200 亚斯卢布', type: 'money', reward: 200, weight: 8 },
    { id: 'p500', name: '500 亚斯卢布', type: 'money', reward: 500, weight: 2 },
    { id: 'gift', name: '亚斯精美小礼品', type: 'gift', reward: 0, weight: 50000 }
  ]
};
