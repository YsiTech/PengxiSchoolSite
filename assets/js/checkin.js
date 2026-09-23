/* ===================================================================
   每日签到 · 余额显示
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.error('[checkin] Auth 未就绪');
    return;
  }

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };

  var btnEl     = $('checkinBtn');
  var streakEl  = $('streakNum');
  var rewardEl  = $('rewardNum');
  var balanceEl = $('balanceAmount');

  if (!btnEl) return;

  var myId = null;
  var isGuest = false;

  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function setBalance(n) {
    if (balanceEl) balanceEl.textContent = fmt(n);
  }
  function setStreak(n) {
    if (streakEl) streakEl.textContent = n;
  }
  function setReward(n) {
    if (rewardEl) rewardEl.textContent = n;
  }

  /* 计算今日可得奖励：昨天连签 + 1，封顶 50 */
  function calcReward(yesterdayStreak) {
    var s = (yesterdayStreak || 0) + 1;
    return Math.min(s * 10, 50);
  }

  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) return;
    var u = Auth.getCurrentUser();
    if (!u) return;
    myId = u.id;
    isGuest = !!(u && u.isGuest);

    if (isGuest) {
      btnEl.disabled = true;
      btnEl.textContent = '游客无法签到';
      return;
    }

    loadAll();
  });

  function loadAll() {
    loadBalance();
    loadCheckinState();
  }

  /* 余额 */
  function loadBalance() {
    client.from('user_wallets').select('balance').eq('user_id', myId).maybeSingle()
      .then(function (res) {
        if (res.error) { console.error('[checkin] 余额加载失败', res.error); return; }
        setBalance(res.data ? res.data.balance : 0);
      });
  }

  /* 签到状态 */
  function loadCheckinState() {
    var today = getTodayStr();
    var yesterday = getYesterdayStr();

    /* 今天已签到？ */
    client.from('checkins').select('reward, streak').eq('user_id', myId).eq('checkin_date', today).maybeSingle()
      .then(function (res) {
        var todayRow = res.data;

        /* 昨天连签数 */
        client.from('checkins').select('streak').eq('user_id', myId).eq('checkin_date', yesterday).maybeSingle()
          .then(function (res2) {
            var yStreak = res2.data ? res2.data.streak : 0;

            if (todayRow) {
              /* 已签到 */
              setStreak(todayRow.streak);
              setReward(todayRow.reward);
              btnEl.disabled = true;
              btnEl.textContent = '今日已签到';
            } else {
              /* 未签到 */
              setStreak(yStreak);
              setReward(calcReward(yStreak));
              btnEl.disabled = false;
              btnEl.textContent = '立即签到';
            }
          });
      });
  }

  /* 点击签到 */
  btnEl.addEventListener('click', function () {
    if (!myId) return;
    if (isGuest) { window.siteToast && window.siteToast('游客无法签到'); return; }

    btnEl.disabled = true;
    btnEl.textContent = '签到中…';

    client.rpc('do_checkin').then(function (res) {
      if (res.error) {
        console.error('[checkin] 签到失败', res.error);
        window.siteToast && window.siteToast('签到失败：' + res.error.message);
        btnEl.disabled = false;
        btnEl.textContent = '立即签到';
        return;
      }
      var data = res.data || {};
      if (!data.ok) {
        window.siteToast && window.siteToast(data.msg || '签到失败');
        if (data.already) {
          btnEl.disabled = true;
          btnEl.textContent = '今日已签到';
        } else {
          btnEl.disabled = false;
          btnEl.textContent = '立即签到';
        }
        return;
      }

      /* 成功 */
      window.siteToast && window.siteToast(
        '签到成功！+' + data.reward + ' ₽ · 连签 ' + data.streak + ' 天',
        3200
      );

      setStreak(data.streak);
      setReward(data.reward);
      setBalance(data.balance);

      btnEl.disabled = true;
      btnEl.textContent = '今日已签到';

      /* 让"今日可得"显示为今天实际得到的 */
      setTimeout(function () {
        if (rewardEl) rewardEl.textContent = data.reward;
      }, 400);
    });
  });

  /* ---------------- 工具 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* 与 SQL 保持一致：用北京时间计算"今天" */
  function getTodayStr() {
    var now = new Date();
    var cn = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + 8 * 3600 * 1000);
    return cn.getFullYear() + '-' + pad(cn.getMonth() + 1) + '-' + pad(cn.getDate());
  }
  function getYesterdayStr() {
    var now = new Date();
    var cn = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + 8 * 3600 * 1000);
    cn.setDate(cn.getDate() - 1);
    return cn.getFullYear() + '-' + pad(cn.getMonth() + 1) + '-' + pad(cn.getDate());
  }

})();