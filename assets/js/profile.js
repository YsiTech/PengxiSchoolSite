/* ===================================================================
   蓬溪格勒人民高等中学 · 个人中心逻辑 (经验递增+角色专属UI版)
   =================================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    avatarDisplay: $('avatarDisplay'), avatarInput: $('avatarInput'), avatarPickBtn: $('avatarPickBtn'),
    avatarRemoveBtn: $('avatarRemoveBtn'), profileName: $('profileName'), profileEmail: $('profileEmail'),
    profileRole: $('profileRole'), nicknameInput: $('nicknameInput'), emailDisplay: $('emailDisplay'),
    saveProfileBtn: $('saveProfileBtn'), newPassword: $('newPassword'), newPassword2: $('newPassword2'),
    changePasswordBtn: $('changePasswordBtn'), logoutBtn: $('logoutBtn'), guestBanner: $('guestBanner'),
    upgradeBtn: $('upgradeBtn'), walletCard: $('walletCard'), walletBalance: $('walletBalance'),
    walletStreak: $('walletStreak'), checkinBtn: $('checkinBtn'), walletHistory: $('walletHistory'),
    balanceCard: $('balanceCard'), bcHolder: $('bcHolder'), ordersCard: $('ordersCard'),
    ordersList: $('ordersList'), ordersRefreshBtn: $('ordersRefreshBtn'), lotteryEntryDesc: $('lotteryEntryDesc'),
    // 经验条元素
    userLevel: $('userLevel'), userExp: $('userExp'), userExpNext: $('userExpNext'),
    expProgress: $('expProgress'), profileExpire: $('profileExpire')
  };

  var currentUserRole = 'user';

  function toast(msg, duration) {
    if (window.siteToast) { window.siteToast(msg, duration); return; }
    console.log('[profile toast]', msg);
  }

  var pendingAvatar = null, currentUserCache = null;

  function renderAvatar(dataUrl, nickname) {
    if (!els.avatarDisplay) return;
    if (dataUrl) { els.avatarDisplay.innerHTML = '<img src="' + dataUrl + '" alt="">'; els.avatarDisplay.classList.remove('fallback'); els.avatarDisplay.style.background = ''; return; }
    var fb = (window.Auth && Auth.avatarFallback) ? Auth.avatarFallback(nickname || '?') : { initial: String(nickname || '?').slice(0, 1).toUpperCase(), color: '#c8102e' };
    els.avatarDisplay.innerHTML = '<span>' + fb.initial + '</span>'; els.avatarDisplay.classList.add('fallback'); els.avatarDisplay.style.background = fb.color;
  }

  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height; var min = Math.min(w, h); var sx = (w - min) / 2, sy = (h - min) / 2;
          var canvas = document.createElement('canvas'); canvas.width = maxSize; canvas.height = maxSize;
          var ctx = canvas.getContext('2d'); ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);
          try { resolve(canvas.toDataURL('image/jpeg', quality)); } catch (err) { reject(err); }
        }; img.onerror = reject; img.src = e.target.result;
      }; reader.onerror = reject; reader.readAsDataURL(file);
    });
  }

  if (els.avatarPickBtn) els.avatarPickBtn.addEventListener('click', function () { if (els.avatarInput) els.avatarInput.click(); });
  if (els.avatarInput) els.avatarInput.addEventListener('change', function () {
      var file = els.avatarInput.files && els.avatarInput.files[0]; if (!file) return;
      if (!/^image\//.test(file.type)) { toast('请选择图片文件'); els.avatarInput.value = ''; return; }
      if (file.size > 5 * 1024 * 1024) { toast('原图请控制在 5MB 以内'); els.avatarInput.value = ''; return; }
      compressImage(file, 96, 0.7).then(function (dataUrl) { pendingAvatar = dataUrl; renderAvatar(dataUrl, currentUserCache && currentUserCache.nickname); toast('头像已就绪，点击「保存修改」生效'); }).catch(function () { toast('图片处理失败'); });
      els.avatarInput.value = '';
  });
  if (els.avatarRemoveBtn) els.avatarRemoveBtn.addEventListener('click', function () { pendingAvatar = ''; renderAvatar('', currentUserCache && currentUserCache.nickname); toast('头像将移除，点击「保存修改」生效'); });

  if (els.saveProfileBtn) els.saveProfileBtn.addEventListener('click', function () {
      if (!window.Auth || !Auth.isLoggedIn()) { toast('未登录'); return; }
      var nickname = (els.nicknameInput && els.nicknameInput.value || '').trim();
      if (!nickname) { toast('昵称不能为空'); return; } if (nickname.length > 16) { toast('昵称最多 16 个字'); return; }
      var patch = { nickname: nickname }; if (pendingAvatar !== null) patch.avatar = pendingAvatar;
      els.saveProfileBtn.disabled = true; els.saveProfileBtn.textContent = '保存中…';
      Auth.updateProfile(patch).then(function (res) {
        els.saveProfileBtn.disabled = false; els.saveProfileBtn.textContent = '保存修改';
        if (!res.ok) { toast(res.msg || '保存失败'); return; }
        pendingAvatar = null; currentUserCache = res.user;
        if (els.profileName) els.profileName.textContent = res.user.nickname;
        if (els.bcHolder) els.bcHolder.textContent = res.user.nickname;
        renderAvatar(res.user.avatar, res.user.nickname);
        if (window.Auth && Auth.mountNavStatus) Auth.mountNavStatus('zh'); toast('资料已更新');
      }).catch(function () { els.saveProfileBtn.disabled = false; els.saveProfileBtn.textContent = '保存修改'; toast('保存出错'); });
  });

  if (els.changePasswordBtn) els.changePasswordBtn.addEventListener('click', function () {
      if (!window.Auth || !Auth.isLoggedIn()) { toast('未登录'); return; }
      var p1 = els.newPassword ? els.newPassword.value : ''; var p2 = els.newPassword2 ? els.newPassword2.value : '';
      if (!p1) { toast('请输入新密码'); return; } if (p1.length < 6) { toast('新密码至少 6 位'); return; } if (p1 !== p2) { toast('两次输入的密码不一致'); return; }
      els.changePasswordBtn.disabled = true; els.changePasswordBtn.textContent = '提交中…';
      Auth.changePassword(p1, p2).then(function (res) {
        els.changePasswordBtn.disabled = false; els.changePasswordBtn.textContent = '修改密码';
        if (!res.ok) { toast(res.msg || '修改失败'); return; }
        if (els.newPassword) els.newPassword.value = ''; if (els.newPassword2) els.newPassword2.value = '';
        toast('密码修改成功');
      }).catch(function () { els.changePasswordBtn.disabled = false; els.changePasswordBtn.textContent = '修改密码'; toast('修改出错'); });
  });

  if (els.logoutBtn) els.logoutBtn.addEventListener('click', function () { if (!window.Auth) { location.href = 'index.html'; return; } if (window.confirm('确定要退出登录吗？')) Auth.logout(); });
  if (els.upgradeBtn) els.upgradeBtn.addEventListener('click', function () { if (!window.Auth) { location.href = 'index.html'; return; } if (window.confirm('退出当前游客账号，并使用邮箱注册正式账号？')) Auth.logout(); });

  /* ⭐ 核心：升级所需经验递增算法 */
  function calculateLevel(totalExp) {
    let level = 1;
    let expForNext = level * 100; // Lv.1升Lv.2需要100，Lv.2升Lv.3需要200，以此类推
    let currentExp = totalExp;
    
    // 循环扣除升级所需经验，计算最终等级和当前等级剩余经验
    while (currentExp >= expForNext) {
      currentExp -= expForNext;
      level++;
      expForNext = level * 100;
    }
    
    return { level: level, currentExp: currentExp, expForNext: expForNext };
  }

  /* 角色UI更新 */
  function updateRoleUI() {
    if (!els.walletCard) return;
    var cardTitle = els.walletCard.querySelector('h3'); var hintEl = els.walletCard.querySelector('.wallet-hint');
    els.walletCard.classList.remove('vip-checkin', 'subscriber-checkin', 'admin-checkin');
    if (currentUserRole === 'vip') { els.walletCard.classList.add('vip-checkin'); if (cardTitle) cardTitle.innerHTML = '👑 VIP 专属签到'; if (hintEl) hintEl.innerHTML = 'VIP 用户每日签到获得 <b>20 亚斯卢布</b>，连签天数越多奖励越高！'; }
    else if (currentUserRole === 'subscriber') { els.walletCard.classList.add('subscriber-checkin'); if (cardTitle) cardTitle.innerHTML = '💎 订阅专属签到'; if (hintEl) hintEl.innerHTML = '订阅用户每日签到获得 <b>30 亚斯卢布</b>，连签天数越多奖励越高！'; }
    else if (currentUserRole === 'admin') { els.walletCard.classList.add('admin-checkin'); if (cardTitle) cardTitle.innerHTML = '🛡️ 管理员签到'; if (hintEl) hintEl.innerHTML = '管理员每日签到获得 <b>50 亚斯卢布</b>，专属通道奖励！'; }
    else { if (cardTitle) cardTitle.innerHTML = '每日签到'; if (hintEl) hintEl.innerHTML = '每日签到获得 <b>10 亚斯卢布</b>，连签天数越多奖励越高，最高 <b>50/天</b>'; }
    if (els.lotteryEntryDesc) {
      if (currentUserRole === 'vip') els.lotteryEntryDesc.textContent = '30 亚斯卢布一次 (VIP 专属折扣) · 最高 500 亚斯卢布 · 亚斯精美小礼品';
      else if (currentUserRole === 'subscriber') els.lotteryEntryDesc.textContent = '20 亚斯卢布一次 (订阅专属折扣) · 最高 500 亚斯卢布 · 亚斯精美小礼品';
      else if (currentUserRole === 'admin') els.lotteryEntryDesc.textContent = '管理员免费测试 · 最高 500 亚斯卢布 · 亚斯精美小礼品';
      else els.lotteryEntryDesc.textContent = '50 亚斯卢布一次 · 最高 500 亚斯卢布 · 亚斯精美小礼品';
    }
    checkTodayStatus();
  }

  function formatDate(d) { var y = d.getFullYear(); var m = ('0' + (d.getMonth() + 1)).slice(-2); var day = ('0' + d.getDate()).slice(-2); return y + '-' + m + '-' + day; }
  function renderWeekCalendar(history) {
    if (!els.walletHistory) return;
    var baseReward = 10; if (currentUserRole === 'vip') baseReward = 20; else if (currentUserRole === 'subscriber') baseReward = 30; else if (currentUserRole === 'admin') baseReward = 50;
    var map = {}; (history || []).forEach(function (h) { map[h.checkin_date] = h; });
    var today = new Date(); today.setHours(0, 0, 0, 0); var days = []; var weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today); d.setDate(today.getDate() - i); var key = formatDate(d); var info = map[key];
      var displayReward = info ? info.reward : (i === 0 ? baseReward : 0);
      days.push({ weekday: weekdayLabels[d.getDay()], dayNum: d.getDate(), checked: !!info, reward: displayReward, isToday: i === 0 });
    }
    var html = '<div class="wallet-week-grid">';
    days.forEach(function (d) {
      var cls = 'wallet-day'; if (d.checked) cls += ' checked'; if (d.isToday) cls += ' today';
      var badge = (d.checked || d.isToday) ? '+' + d.reward : '';
      html += '<div class="' + cls + '"><div class="wd-weekday">' + d.weekday + '</div><div class="wd-daynum">' + d.dayNum + '</div><div class="wd-badge">' + badge + '</div></div>';
    }); html += '</div>'; els.walletHistory.innerHTML = html;
  }

  function refreshWalletBalance() { if (!window.Wallet) return Promise.resolve(); return Wallet.getBalance().then(function (b) { if (els.walletBalance) els.walletBalance.textContent = (b === null ? '—' : b); return b; }); }
  function refreshWalletHistory() { if (!window.Wallet) return Promise.resolve(); return Wallet.getCheckinHistory(7).then(function (list) { renderWeekCalendar(list); if (els.walletStreak && list && list.length) { var latest = list[0]; var today = formatDate(new Date()); if (latest.checkin_date === today) els.walletStreak.textContent = '已连签 ' + (latest.streak || 1) + ' 天'; else els.walletStreak.textContent = '上次连签 ' + (latest.streak || 1) + ' 天'; } else if (els.walletStreak) els.walletStreak.textContent = ''; }); }
  function checkTodayStatus() {
    if (!window.Wallet || !els.checkinBtn) return;
    Wallet.getCheckinHistory(1).then(function (list) {
      var today = formatDate(new Date()); var latest = list && list[0];
      var defaultBtnText = '今日签到'; if (currentUserRole === 'vip') defaultBtnText = 'VIP 签到 (+20)'; else if (currentUserRole === 'subscriber') defaultBtnText = '订阅签到 (+30)'; else if (currentUserRole === 'admin') defaultBtnText = '管理员签到 (最高奖励)';
      if (latest && latest.checkin_date === today) { els.checkinBtn.classList.add('on'); els.checkinBtn.disabled = true; els.checkinBtn.textContent = '✓ 今日已签到'; }
      else { els.checkinBtn.classList.remove('on'); els.checkinBtn.disabled = false; els.checkinBtn.textContent = defaultBtnText; }
    });
  }

  if (els.checkinBtn) els.checkinBtn.addEventListener('click', function () {
      if (!window.Wallet) { toast('钱包模块未加载'); return; } if (els.checkinBtn.disabled) return;
      var originalText = els.checkinBtn.textContent; els.checkinBtn.disabled = true; els.checkinBtn.textContent = '签到中…';
      Wallet.doCheckin().then(function (res) {
        if (!res.ok) { els.checkinBtn.disabled = false; els.checkinBtn.textContent = originalText; if (res.already) { els.checkinBtn.classList.add('on'); els.checkinBtn.disabled = true; els.checkinBtn.textContent = '✓ 今日已签到'; } toast(res.msg || '签到失败'); return; }
        els.checkinBtn.classList.add('on'); els.checkinBtn.disabled = true; els.checkinBtn.textContent = '✓ 今日已签到';
        
        // ⭐ 签到成功后，更新经验条
        var expData = calculateLevel(res.exp || 0);
        if (els.userLevel) els.userLevel.textContent = expData.level;
        if (els.userExp) els.userExp.textContent = expData.currentExp;
        if (els.userExpNext) els.userExpNext.textContent = expData.expForNext;
        if (els.expProgress) els.expProgress.style.width = (expData.currentExp / expData.expForNext * 100) + '%';
        
        var prefix = ''; if (currentUserRole === 'vip') prefix = 'VIP 专属'; else if (currentUserRole === 'subscriber') prefix = '订阅专属'; else if (currentUserRole === 'admin') prefix = '管理员';
        var msg = prefix + '签到成功 · +' + res.reward + ' 亚斯卢布'; if (res.streak > 1) msg += ' · 已连签 ' + res.streak + ' 天'; if (res.reward >= 50) msg += ' · 已达每日上限'; toast(msg, 3600);
        
        refreshWalletBalance(); refreshWalletHistory(); if (window.Wallet && Wallet.mountNavBalance) setTimeout(Wallet.mountNavBalance, 100);
      });
  });

  /* 订单逻辑（此处为兼容保留，可以按需填入你之前的订单代码） */
  function refreshOrders() { /* 保留你原有的订单加载逻辑 */ }
  if (els.ordersRefreshBtn) els.ordersRefreshBtn.addEventListener('click', function () { /* 保留你原有的刷新逻辑 */ });

  /* ============================================================
     加载用户数据（⭐ 核心：计算等级和进度）
     ============================================================ */
  function loadUser() {
    if (!window.Auth) return;
    var user = Auth.getCurrentUser(); if (!user) return;
    currentUserCache = user;

    if (els.profileName) els.profileName.textContent = user.nickname || '—';
    if (els.profileEmail) els.profileEmail.textContent = user.email || '(游客账号)';

    if (els.profileRole) {
      if (user.isGuest) {
        els.profileRole.textContent = '游客'; els.profileRole.className = 'profile-role';
        if (els.profileExpire) els.profileExpire.classList.add('hide');
      } else {
        Auth.client.from('user_wallets')
          .select('role, exp, role_expire_at')
          .eq('user_id', user.id)
          .single()
          .then(function (res) {
            var data = res.data || {};
            var role = data.role || 'user';
            var exp = data.exp || 0;
            var expireAt = data.role_expire_at ? new Date(data.role_expire_at) : null;
            var now = new Date();

            // 自动过期降级
            if ((role === 'vip' || role === 'subscriber') && expireAt && expireAt < now) {
              role = 'user'; expireAt = null;
              Auth.client.from('user_wallets').update({ role: 'user', role_expire_at: null }).eq('user_id', user.id).then();
            }

            currentUserRole = role;
            var roleNames = { 'user': '普通用户', 'vip': 'VIP 用户', 'subscriber': '订阅用户', 'admin': '管理员' };
            els.profileRole.textContent = roleNames[role] || '普通用户';
            els.profileRole.className = 'profile-role role-' + role;

            // ⭐ 根据递增公式，计算等级和进度条
            var expData = calculateLevel(exp);
            if (els.userLevel) els.userLevel.textContent = expData.level;
            if (els.userExp) els.userExp.textContent = expData.currentExp;
            if (els.userExpNext) els.userExpNext.textContent = expData.expForNext;
            if (els.expProgress) els.expProgress.style.width = (expData.currentExp / expData.expForNext * 100) + '%';

            // 显示到期时间
            if (els.profileExpire) {
              if ((role === 'vip' || role === 'subscriber') && expireAt) {
                els.profileExpire.textContent = (role === 'vip' ? 'VIP ' : '订阅 ') + '到期时间：' + expireAt.toLocaleDateString('zh-CN');
                els.profileExpire.classList.remove('hide');
              } else {
                els.profileExpire.classList.add('hide');
              }
            }

            updateRoleUI(); refreshWalletHistory();
          })
          .catch(function (err) {
            console.error('[profile] 读取角色失败:', err);
            els.profileRole.textContent = '普通用户'; els.profileRole.className = 'profile-role role-user';
            if (els.profileExpire) els.profileExpire.classList.add('hide');
            updateRoleUI(); refreshWalletHistory();
          });
      }
    }
    if (els.bcHolder) els.bcHolder.textContent = user.nickname || '—';
    if (els.nicknameInput) els.nicknameInput.value = user.nickname || '';
    if (els.emailDisplay) els.emailDisplay.value = user.email || '(游客账号)';
    renderAvatar(user.avatar, user.nickname);

    if (user.isGuest) {
      if (els.guestBanner) els.guestBanner.classList.remove('hide');
      if (els.walletCard) els.walletCard.classList.add('hide');
      if (els.balanceCard) els.balanceCard.classList.add('hide');
      if (els.ordersCard) els.ordersCard.classList.add('hide');
      return;
    }
    refreshWalletBalance(); refreshWalletHistory(); checkTodayStatus(); refreshOrders();
  }

  if (window.Auth && Auth.ready && Auth.ready.then) {
    Auth.ready.then(function () { setTimeout(loadUser, 100); }).catch(function () { setTimeout(loadUser, 300); });
  } else { setTimeout(loadUser, 400); }

  console.log('[profile] 个人中心已初始化');
})();