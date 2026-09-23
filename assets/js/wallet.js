/* ===================================================================
   蓬溪格勒人民高等中学 · 亚斯卢布钱包模块
   余额查询 / 每日签到 / 签到历史 / 顶部徽章
   =================================================================== */

(function (window) {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.warn('[wallet] Auth 未就绪');
    window.Wallet = {
      getBalance: function () { return Promise.resolve(null); },
      doCheckin: function () { return Promise.resolve({ ok: false, msg: 'Auth 未就绪' }); },
      getCheckinHistory: function () { return Promise.resolve([]); },
      mountNavBalance: function () {}
    };
    return;
  }

  var client = Auth.client;

  function currentUser() {
    return (window.Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
  }

  /* ---------------- 余额 ---------------- */
  function getBalance() {
    var user = currentUser();
    if (!user || user.isGuest) return Promise.resolve(null);

    return client
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(function (res) {
        if (res.error) {
          console.warn('[wallet] 获取余额失败:', res.error);
          return 0;
        }
        return res.data ? (res.data.balance || 0) : 0;
      });
  }

  /* ---------------- 签到 ---------------- */
  function doCheckin() {
    var user = currentUser();
    if (!user) return Promise.resolve({ ok: false, msg: '未登录' });
    if (user.isGuest) return Promise.resolve({ ok: false, msg: '游客账号无法签到' });

    return client.rpc('do_checkin').then(function (res) {
      if (res.error) {
        console.error('[wallet] 签到 RPC 失败:', res.error);
        return { ok: false, msg: res.error.message || '签到失败' };
      }
      return res.data || { ok: false, msg: '签到失败' };
    });
  }

  /* ---------------- 签到历史 ---------------- */
  function getCheckinHistory(limit) {
    var user = currentUser();
    if (!user || user.isGuest) return Promise.resolve([]);

    return client
      .from('checkins')
      .select('checkin_date, reward, streak')
      .eq('user_id', user.id)
      .order('checkin_date', { ascending: false })
      .limit(limit || 7)
      .then(function (res) {
        if (res.error) {
          console.warn('[wallet] 获取签到历史失败:', res.error);
          return [];
        }
        return res.data || [];
      });
  }

  /* ---------------- 顶部栏余额徽章 ---------------- */
  function mountNavBalance() {
    var el = document.querySelector('.auth-nav');
    if (!el) return;

    var user = currentUser();
    var old = el.querySelector('.wallet-badge');

    if (!user || user.isGuest) {
      if (old) old.remove();
      return;
    }

    getBalance().then(function (balance) {
      if (balance === null) return;
      var badge = el.querySelector('.wallet-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'wallet-badge';
        badge.title = '我的亚斯卢布';
        el.insertBefore(badge, el.firstChild);
      }
      badge.textContent = '₽ ' + balance;
    });
  }

  window.Wallet = {
    getBalance: getBalance,
    doCheckin: doCheckin,
    getCheckinHistory: getCheckinHistory,
    mountNavBalance: mountNavBalance
  };

  if (Auth.ready && Auth.ready.then) {
    Auth.ready.then(function () {
      setTimeout(mountNavBalance, 400);
    });
  }

  console.log('%c [Wallet] 亚斯卢布钱包模块已加载 ', 'background:#d4af37;color:#241b08;padding:2px 8px;border-radius:3px;font-weight:700');
})(window);