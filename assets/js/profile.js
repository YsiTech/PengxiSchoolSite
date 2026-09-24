/* ===================================================================
   蓬溪格勒人民高等中学 · 个人中心逻辑
   =================================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    avatarDisplay:    $('avatarDisplay'),
    avatarInput:      $('avatarInput'),
    avatarPickBtn:    $('avatarPickBtn'),
    avatarRemoveBtn:  $('avatarRemoveBtn'),
    profileName:      $('profileName'),
    profileEmail:     $('profileEmail'),
    profileRole:      $('profileRole'),
    nicknameInput:    $('nicknameInput'),
    emailDisplay:     $('emailDisplay'),
    saveProfileBtn:   $('saveProfileBtn'),
    newPassword:      $('newPassword'),
    newPassword2:     $('newPassword2'),
    changePasswordBtn:$('changePasswordBtn'),
    logoutBtn:        $('logoutBtn'),
    guestBanner:      $('guestBanner'),
    upgradeBtn:       $('upgradeBtn'),
    walletCard:       $('walletCard'),
    walletBalance:    $('walletBalance'),
    walletStreak:     $('walletStreak'),
    checkinBtn:       $('checkinBtn'),
    walletHistory:    $('walletHistory'),
    balanceCard:      $('balanceCard'),
    bcHolder:         $('bcHolder'),
    ordersCard:       $('ordersCard'),
    ordersList:       $('ordersList'),
    ordersRefreshBtn: $('ordersRefreshBtn')
  };

  function toast(msg, duration) {
    if (window.siteToast) { window.siteToast(msg, duration); return; }
    console.log('[profile toast]', msg);
  }

  var pendingAvatar = null;
  var currentUserCache = null;

  /* ============================================================
     头像渲染
     ============================================================ */
  function renderAvatar(dataUrl, nickname) {
    if (!els.avatarDisplay) return;
    if (dataUrl) {
      els.avatarDisplay.innerHTML = '<img src="' + dataUrl + '" alt="">';
      els.avatarDisplay.classList.remove('fallback');
      els.avatarDisplay.style.background = '';
      return;
    }
    var fb = (window.Auth && Auth.avatarFallback)
      ? Auth.avatarFallback(nickname || '?')
      : { initial: String(nickname || '?').slice(0, 1).toUpperCase(), color: '#c8102e' };
    els.avatarDisplay.innerHTML = '<span>' + fb.initial + '</span>';
    els.avatarDisplay.classList.add('fallback');
    els.avatarDisplay.style.background = fb.color;
  }

  /* ============================================================
     图片压缩
     ============================================================ */
  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          var min = Math.min(w, h);
          var sx = (w - min) / 2, sy = (h - min) / 2;
          var canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);
          try { resolve(canvas.toDataURL('image/jpeg', quality)); }
          catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ============================================================
     头像事件
     ============================================================ */
  if (els.avatarPickBtn) {
    els.avatarPickBtn.addEventListener('click', function () {
      if (els.avatarInput) els.avatarInput.click();
    });
  }

  if (els.avatarInput) {
    els.avatarInput.addEventListener('change', function () {
      var file = els.avatarInput.files && els.avatarInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('请选择图片文件'); els.avatarInput.value = ''; return; }
      if (file.size > 5 * 1024 * 1024) { toast('原图请控制在 5MB 以内'); els.avatarInput.value = ''; return; }

      compressImage(file, 96, 0.7).then(function (dataUrl) {
        pendingAvatar = dataUrl;
        renderAvatar(dataUrl, currentUserCache && currentUserCache.nickname);
        toast('头像已就绪，点击「保存修改」生效');
      }).catch(function (err) {
        console.error('[profile] 图片处理失败:', err);
        toast('图片处理失败，请换一张试试');
      });

      els.avatarInput.value = '';
    });
  }

  if (els.avatarRemoveBtn) {
    els.avatarRemoveBtn.addEventListener('click', function () {
      pendingAvatar = '';
      renderAvatar('', currentUserCache && currentUserCache.nickname);
      toast('头像将移除，点击「保存修改」生效');
    });
  }

  /* ============================================================
     保存资料
     ============================================================ */
  if (els.saveProfileBtn) {
    els.saveProfileBtn.addEventListener('click', function () {
      if (!window.Auth) { toast('Auth 模块未加载'); return; }
      if (!Auth.isLoggedIn()) { toast('未登录'); return; }

      var nickname = (els.nicknameInput && els.nicknameInput.value || '').trim();
      if (!nickname) { toast('昵称不能为空'); return; }
      if (nickname.length > 16) { toast('昵称最多 16 个字'); return; }

      var patch = { nickname: nickname };
      if (pendingAvatar !== null) patch.avatar = pendingAvatar;

      els.saveProfileBtn.disabled = true;
      els.saveProfileBtn.textContent = '保存中…';

      Auth.updateProfile(patch).then(function (res) {
        els.saveProfileBtn.disabled = false;
        els.saveProfileBtn.textContent = '保存修改';

        if (!res.ok) { toast(res.msg || '保存失败'); return; }

        pendingAvatar = null;
        currentUserCache = res.user;

        if (els.profileName) els.profileName.textContent = res.user.nickname;
        if (els.bcHolder)   els.bcHolder.textContent = res.user.nickname;
        renderAvatar(res.user.avatar, res.user.nickname);

        if (window.Auth && Auth.mountNavStatus) Auth.mountNavStatus('zh');
        toast('资料已更新');
      }).catch(function (err) {
        console.error('[profile] 保存异常:', err);
        els.saveProfileBtn.disabled = false;
        els.saveProfileBtn.textContent = '保存修改';
        toast('保存出错，请稍后重试');
      });
    });
  }

  /* ============================================================
     修改密码
     ============================================================ */
  if (els.changePasswordBtn) {
    els.changePasswordBtn.addEventListener('click', function () {
      if (!window.Auth) { toast('Auth 模块未加载'); return; }
      if (!Auth.isLoggedIn()) { toast('未登录'); return; }

      var p1 = els.newPassword ? els.newPassword.value : '';
      var p2 = els.newPassword2 ? els.newPassword2.value : '';

      if (!p1) { toast('请输入新密码'); return; }
      if (p1.length < 6) { toast('新密码至少 6 位'); return; }
      if (p1 !== p2) { toast('两次输入的密码不一致'); return; }

      els.changePasswordBtn.disabled = true;
      els.changePasswordBtn.textContent = '提交中…';

      Auth.changePassword(p1, p2).then(function (res) {
        els.changePasswordBtn.disabled = false;
        els.changePasswordBtn.textContent = '修改密码';

        if (!res.ok) { toast(res.msg || '修改失败'); return; }
        if (els.newPassword)  els.newPassword.value = '';
        if (els.newPassword2) els.newPassword2.value = '';
        toast('密码修改成功');
      }).catch(function (err) {
        console.error('[profile] 修改密码异常:', err);
        els.changePasswordBtn.disabled = false;
        els.changePasswordBtn.textContent = '修改密码';
        toast('修改出错，请稍后重试');
      });
    });
  }

  /* ============================================================
     退出
     ============================================================ */
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', function () {
      if (!window.Auth) { location.href = 'index.html'; return; }
      if (window.confirm('确定要退出登录吗？')) Auth.logout();
    });
  }

  if (els.upgradeBtn) {
    els.upgradeBtn.addEventListener('click', function () {
      if (!window.Auth) { location.href = 'index.html'; return; }
      if (window.confirm('退出当前游客账号，并使用邮箱注册正式账号？')) Auth.logout();
    });
  }

  /* ============================================================
     签到
     ============================================================ */
  function formatDate(d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  function renderWeekCalendar(history) {
    if (!els.walletHistory) return;

    var map = {};
    (history || []).forEach(function (h) { map[h.checkin_date] = h; });

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var days = [];
    var weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var key = formatDate(d);
      var info = map[key];
      days.push({
        weekday: weekdayLabels[d.getDay()],
        dayNum: d.getDate(),
        checked: !!info,
        reward: info ? info.reward : 0,
        isToday: i === 0
      });
    }

    var html = '<div class="wallet-week-grid">';
    days.forEach(function (d) {
      var cls = 'wallet-day';
      if (d.checked) cls += ' checked';
      if (d.isToday) cls += ' today';
      var badge = d.checked ? ('+' + d.reward) : '';
      html += '<div class="' + cls + '">' +
                '<div class="wd-weekday">' + d.weekday + '</div>' +
                '<div class="wd-daynum">' + d.dayNum + '</div>' +
                '<div class="wd-badge">' + badge + '</div>' +
              '</div>';
    });
    html += '</div>';
    els.walletHistory.innerHTML = html;
  }

  function refreshWalletBalance() {
    if (!window.Wallet) return Promise.resolve();
    return Wallet.getBalance().then(function (b) {
      if (els.walletBalance) els.walletBalance.textContent = (b === null ? '—' : b);
      return b;
    });
  }

  function refreshWalletHistory() {
    if (!window.Wallet) return Promise.resolve();
    return Wallet.getCheckinHistory(7).then(function (list) {
      renderWeekCalendar(list);
      if (els.walletStreak && list && list.length) {
        var latest = list[0];
        var today = formatDate(new Date());
        if (latest.checkin_date === today) {
          els.walletStreak.textContent = '已连签 ' + (latest.streak || 1) + ' 天';
        } else {
          els.walletStreak.textContent = '上次连签 ' + (latest.streak || 1) + ' 天';
        }
      } else if (els.walletStreak) {
        els.walletStreak.textContent = '';
      }
    });
  }

  function checkTodayStatus() {
    if (!window.Wallet || !els.checkinBtn) return;
    Wallet.getCheckinHistory(1).then(function (list) {
      var today = formatDate(new Date());
      var latest = list && list[0];
      if (latest && latest.checkin_date === today) {
        els.checkinBtn.classList.add('on');
        els.checkinBtn.disabled = true;
        els.checkinBtn.textContent = '✓ 今日已签到';
      } else {
        els.checkinBtn.classList.remove('on');
        els.checkinBtn.disabled = false;
        els.checkinBtn.textContent = '今日签到';
      }
    });
  }

  if (els.checkinBtn) {
    els.checkinBtn.addEventListener('click', function () {
      if (!window.Wallet) { toast('钱包模块未加载'); return; }
      if (els.checkinBtn.disabled) return;

      els.checkinBtn.disabled = true;
      els.checkinBtn.textContent = '签到中…';

      Wallet.doCheckin().then(function (res) {
        if (!res.ok) {
          els.checkinBtn.disabled = false;
          els.checkinBtn.textContent = '今日签到';
          if (res.already) {
            els.checkinBtn.classList.add('on');
            els.checkinBtn.disabled = true;
            els.checkinBtn.textContent = '✓ 今日已签到';
          }
          toast(res.msg || '签到失败');
          return;
        }

        els.checkinBtn.classList.add('on');
        els.checkinBtn.disabled = true;
        els.checkinBtn.textContent = '✓ 今日已签到';

        var msg = '签到成功 · +' + res.reward + ' 亚斯卢布';
        if (res.streak > 1) msg += ' · 已连签 ' + res.streak + ' 天';
        if (res.reward >= 50) msg += ' · 已达每日上限';
        toast(msg, 3600);

        refreshWalletBalance();
        refreshWalletHistory();

        if (window.Wallet && Wallet.mountNavBalance) {
          setTimeout(Wallet.mountNavBalance, 100);
        }
      });
    });
  }

  /* ============================================================
     订单模块
     ============================================================ */
  var STATUS_MAP = {
    pending:    { label: '待处理', cls: 'pending',    icon: '⏳' },
    processing: { label: '处理中', cls: 'processing', icon: '📦' },
    shipped:    { label: '已发货', cls: 'shipped',    icon: '🚚' },
    delivered:  { label: '已签收', cls: 'delivered',  icon: '✓'  },
    cancelled:  { label: '已取消', cls: 'cancelled',  icon: '✕'  }
  };

  function fmtDateTime(s) {
    if (!s) return '';
    var d = new Date(s);
    function p(n) { return n < 10 ? '0' + n : n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function renderOrderCard(order) {
    var st = STATUS_MAP[order.status] || STATUS_MAP.pending;

    var timeline = [];
    timeline.push({
      label: '已提交',
      time: fmtDateTime(order.created_at),
      done: true
    });
    if (order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
      timeline.push({
        label: '处理中',
        time: fmtDateTime(order.status_updated_at || order.created_at),
        done: true
      });
    }
    if (order.status === 'shipped' || order.status === 'delivered') {
      timeline.push({
        label: '已发货',
        time: fmtDateTime(order.shipped_at),
        done: true
      });
    }
    if (order.status === 'delivered') {
      timeline.push({
        label: '已签收',
        time: fmtDateTime(order.delivered_at),
        done: true
      });
    } else if (order.status !== 'cancelled') {
      if (order.status === 'pending' || order.status === 'processing') {
        timeline.push({ label: '已发货', time: '等待中', done: false });
      }
      timeline.push({ label: '已签收', time: '等待中', done: false });
    }

    var timelineHtml = '';
    timeline.forEach(function (t, i) {
      var cls = 'ot-step' + (t.done ? ' done' : '');
      timelineHtml += '<div class="' + cls + '">' +
                        '<div class="ot-dot"></div>' +
                        (i < timeline.length - 1 ? '<div class="ot-line"></div>' : '') +
                        '<div class="ot-body">' +
                          '<div class="ot-label">' + escHtml(t.label) + '</div>' +
                          '<div class="ot-time">' + escHtml(t.time) + '</div>' +
                        '</div>' +
                      '</div>';
    });

    var logisticsHtml = '';
    if (order.status === 'shipped' || order.status === 'delivered') {
      if (order.tracking_company || order.tracking_number) {
        logisticsHtml =
          '<div class="order-logistics">' +
            '<div class="ol-row">' +
              '<span class="ol-label">快递公司</span>' +
              '<span class="ol-value">' + escHtml(order.tracking_company || '—') + '</span>' +
            '</div>' +
            '<div class="ol-row">' +
              '<span class="ol-label">快递单号</span>' +
              '<span class="ol-value ol-tracking">' +
                escHtml(order.tracking_number || '—') +
                (order.tracking_number
                  ? '<button class="ol-copy" type="button" data-copy="' + escHtml(order.tracking_number) + '" title="复制">复制</button>'
                  : '') +
              '</span>' +
            '</div>' +
          '</div>';
      }
    }

    var remarkHtml = '';
    if (order.admin_remark) {
      remarkHtml = '<div class="order-remark">' +
                     '<b>管理员备注：</b>' + escHtml(order.admin_remark) +
                   '</div>';
    }

    return '<div class="order-card">' +
             '<div class="order-head">' +
               '<div class="oh-left">' +
                 '<div class="oh-prize">' + escHtml(order.prize_name) + '</div>' +
                 '<div class="oh-meta">订单号 #' + order.id + ' · ' + fmtDateTime(order.created_at) + '</div>' +
               '</div>' +
               '<div class="oh-status oh-status-' + st.cls + '">' +
                 '<span class="ohs-icon">' + st.icon + '</span>' +
                 '<span class="ohs-text">' + st.label + '</span>' +
               '</div>' +
             '</div>' +
             '<div class="order-body">' +
               '<div class="order-timeline">' + timelineHtml + '</div>' +
               logisticsHtml +
               remarkHtml +
             '</div>' +
           '</div>';
  }

  function refreshOrders() {
    if (!window.Auth || !Auth.client) return Promise.resolve();
    var user = Auth.getCurrentUser();

    if (!user || user.isGuest) {
      if (els.ordersCard) els.ordersCard.classList.add('hide');
      return Promise.resolve();
    }

    if (els.ordersList) {
      els.ordersList.innerHTML = '<div class="orders-loading">加载中…</div>';
    }

    return Auth.client
      .from('gift_orders')
      .select('id, prize_name, receiver_name, receiver_phone, receiver_address, status, tracking_company, tracking_number, admin_remark, created_at, shipped_at, delivered_at, status_updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(function (res) {
        if (res.error) {
          console.error('[profile] 读取订单失败:', res.error);
          if (els.ordersList) {
            els.ordersList.innerHTML = '<div class="orders-empty">读取订单失败，请稍后重试</div>';
          }
          return;
        }

        var list = res.data || [];
        if (!list.length) {
          if (els.ordersList) {
            els.ordersList.innerHTML = '<div class="orders-empty">暂无订单 · 抽中实物奖品后可在此查看物流</div>';
          }
          return;
        }

        var html = '';
        list.forEach(function (order) { html += renderOrderCard(order); });
        if (els.ordersList) els.ordersList.innerHTML = html;

        els.ordersList.querySelectorAll('.ol-copy').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var txt = btn.getAttribute('data-copy') || '';
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(txt).then(function () {
                toast('快递单号已复制');
              }).catch(function () {
                toast('复制失败，请手动选择');
              });
            } else {
              toast('快递单号：' + txt);
            }
          });
        });
      });
  }

  if (els.ordersRefreshBtn) {
    els.ordersRefreshBtn.addEventListener('click', function () {
      var icon = els.ordersRefreshBtn.querySelector('.or-icon');
      if (icon) {
        icon.style.transition = 'transform .6s';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(function () { icon.style.transform = ''; }, 600);
      }
      refreshOrders().then(function () {
        toast('订单已刷新');
      });
    });
  }

  /* ============================================================
     加载用户数据
     ============================================================ */
  function loadUser() {
    if (!window.Auth) {
      console.error('[profile] Auth 模块未加载');
      return;
    }

    var user = Auth.getCurrentUser();
    if (!user) {
      console.warn('[profile] 未登录，等待 auth.js 跳转');
      return;
    }

    currentUserCache = user;

    if (els.profileName)  els.profileName.textContent = user.nickname || '—';
    if (els.profileEmail) els.profileEmail.textContent = user.email || '(游客账号)';
    if (els.profileRole)  els.profileRole.textContent = user.isGuest ? '游客' : '正式用户';
    if (els.bcHolder)     els.bcHolder.textContent = user.nickname || '—';

    if (els.nicknameInput) els.nicknameInput.value = user.nickname || '';
    if (els.emailDisplay)  els.emailDisplay.value  = user.email || '(游客账号)';

    renderAvatar(user.avatar, user.nickname);

    /* 游客：隐藏钱包、订单、余额卡片 */
    if (user.isGuest) {
      if (els.guestBanner) els.guestBanner.classList.remove('hide');
      if (els.walletCard)  els.walletCard.classList.add('hide');
      if (els.balanceCard) els.balanceCard.classList.add('hide');
      if (els.ordersCard)  els.ordersCard.classList.add('hide');
      return;
    }

    refreshWalletBalance();
    refreshWalletHistory();
    checkTodayStatus();
    refreshOrders();

    console.log('[profile] 用户数据已加载:', user.nickname);
  }

  if (window.Auth && Auth.ready && Auth.ready.then) {
    Auth.ready.then(function () {
      setTimeout(loadUser, 100);
    }).catch(function (err) {
      console.error('[profile] Auth.ready 出错:', err);
      setTimeout(loadUser, 300);
    });
  } else {
    setTimeout(loadUser, 400);
  }

  console.log('[profile] 个人中心已初始化');

})();