(function (w) {
  'use strict';
  if (!w.supabase || !w.supabase.createClient) return;

  var cfg = w.IECP_CONFIG || {};
  var client = w.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  w.IECP = w.IECP || {};
  w.IECP.client = client;

  w.IECP.$  = function (s, c) { return (c || document).querySelector(s); };
  w.IECP.$$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  w.IECP.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  };
  
  // 🚨 修正数字格式化：只有一万以上才用“万”，一亿以上才用“亿”，千以下原样显示
  w.IECP.fmtNumber = function (num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    var n = Number(num);
    var isNeg = n < 0;
    var absN = Math.abs(n);
    var res = '';

    if (absN >= 100000000) {
      res = (absN / 100000000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + '亿';
    } else if (absN >= 10000) {
      res = (absN / 10000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + '万';
    } else {
      // 一万以下，原样显示，保留最多两位小数，带千分位逗号
      res = Number(absN.toFixed(2)).toLocaleString('en-US');
    }

    return (isNeg ? '-' : '') + res;
  };

  w.IECP.fmtDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  
  w.IECP.relativeTime = function (iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
    return w.IECP.fmtDate(iso);
  };

  w.IECP.canViewBalance = function () { return false; };
  w.IECP.formatBalance = function (balance) {
    return '<span style="color:var(--muted); font-size:12px; border:1px solid var(--border); padding:2px 8px; border-radius:4px; background:var(--glass)"><i class="fa-solid fa-lock" style="font-size:10px; margin-right:4px;"></i>机密</span>';
  };

  w.IECP.toast = function (msg, type, duration) {
    var el = document.querySelector('.iecp-toast');
    if (!el) {
      el = document.createElement('div'); el.className = 'iecp-toast';
      el.innerHTML = '<i class="fa-solid fa-circle-info"></i><span></span>';
      document.body.appendChild(el);
    }
    var icon = el.querySelector('i'); var text = el.querySelector('span');
    el.className = 'iecp-toast show ' + (type || '');
    icon.className = 'fa-solid ' + (type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
    text.textContent = msg;
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(function () { el.classList.remove('show'); }, duration || 2600);
  };

  var profileCache = null;
  w.IECP.getProfile = function (force) {
    if (profileCache && !force) return Promise.resolve(profileCache);
    return client.auth.getUser().then(function (res) {
      if (!res.data || !res.data.user) throw new Error('未登录或登录已过期');
      return client.from('profiles').select('*').eq('id', res.data.user.id).maybeSingle().then(function (r) {
        if (r.error) throw new Error(r.error.message);
        profileCache = r.data; w.IECP._currentProfileCache = profileCache;
        return profileCache;
      });
    });
  };

  w.IECP.clearProfileCache = function () { profileCache = null; w.IECP._currentProfileCache = null; };
  w.IECP.requireAuth = function () {
    return client.auth.getSession().then(function (res) {
      if (!res.data.session) { location.replace('login.html'); return false; }
      return true;
    });
  };
  w.IECP.logout = function () { client.auth.signOut().then(function () { w.IECP.clearProfileCache(); location.href = 'login.html'; }); };
  w.IECP.avatarFallback = function (name) {
    var initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    var colors = ['#d4af37','#4fc3f7','#a78bfa','#f87171','#22c55e','#f59e0b','#ec4899'];
    var h = 0; for (var i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="' + colors[h % colors.length] + '"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-size="50" font-weight="700" fill="#0a0e1a" font-family="sans-serif">' + initial + '</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  w.IECP.renderNav = function (activeId) {
    var host = document.getElementById('iecp-nav'); if (!host) return;
    var items = [
      { id:'index', icon:'fa-globe', text:'首页', href:'index.html' },
      { id:'countries', icon:'fa-flag', text:'国家列表', href:'countries.html' },
      { id:'news', icon:'fa-newspaper', text:'新闻发布', href:'news.html' },
      { id:'diplomacy', icon:'fa-handshake', text:'交流中心', href:'diplomacy.html' },
      { id:'market', icon:'fa-store', text:'交易行', href:'market.html' },
      { id:'transfer', icon:'fa-money-bill-transfer', text:'跨国汇款', href:'transfer.html' },
      { id:'military', icon:'fa-industry', text:'军工厂', href:'military.html' },
      { id:'research', icon:'fa-flask', text:'研究所', href:'research.html' },
      { id:'forecast', icon:'fa-cloud-bolt', text:'灾害预报', href:'forecast.html' },
      { id:'wars', icon:'fa-shield-halved', text:'战争系统', href:'wars.html' }
    ];
    host.innerHTML = items.map(function (it) {
      return '<a' + (it.id === activeId ? ' class="active"' : '') + ' href="' + it.href + '"><i class="fa-solid ' + it.icon + '"></i>' + it.text + '</a>';
    }).join('');
  };

  w.IECP.renderUserBadge = function () {
    var host = document.getElementById('iecp-user'); if (!host) return;
    
    if (!document.getElementById('notifModalsContainer')) {
      var modalsHtml = `
        <div id="notifModalsContainer">
          <div class="iecp-modal" id="notifCenterModal" style="z-index:9999;">
            <div class="iecp-modal-box glass-2" style="max-width:600px; padding:0; overflow:hidden;">
              <div style="padding:20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2);">
                <h3 style="margin:0; font-size:18px; color:var(--gold);"><i class="fa-solid fa-bell"></i> 消息中心</h3>
                <div style="display:flex; gap:15px; align-items:center;">
                  <span style="font-size:12px; cursor:pointer; color:var(--cyan);" onclick="markAllRead(event)">全部标为已读</span>
                  <button class="btn btn-ghost btn-sm" onclick="closeNotifModal()" style="padding:4px 10px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
              </div>
              <div id="notifCenterList" style="padding:20px; max-height:65vh; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background:rgba(15,23,42,0.9);"></div>
            </div>
          </div>
          <div class="iecp-modal" id="notifDetailModal" style="z-index:10000;">
            <div class="iecp-modal-box glass-2" style="max-width:500px; padding:0; overflow:hidden;">
              <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3);">
                <h3 style="margin:0; font-size:16px; color:var(--gold);" id="ndTitle">通知详情</h3>
                <button class="btn btn-ghost btn-sm" onclick="closeNotifDetail()" style="padding:4px 10px;"><i class="fa-solid fa-xmark"></i></button>
              </div>
              <div style="padding:24px; background:rgba(15,23,42,0.95);" id="ndBody"></div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalsHtml);
    }

    w.IECP.getProfile().then(function (p) {
      var flag = p.flag_url || w.IECP.avatarFallback(p.username);
      
      var notifHtml = `
        <div class="notif-wrapper" id="notifWrapper" onclick="toggleNotif(event)">
          <i class="fa-solid fa-bell notif-icon"></i>
          <span class="notif-badge" id="notifBadge">0</span>
          <div class="notif-dropdown" id="notifDropdown">
            <div class="notif-header">
              <span>快捷预览</span>
              <span style="font-size:12px; cursor:pointer; color:var(--cyan); font-weight:normal;" onclick="markAllRead(event)">全部已读</span>
            </div>
            <div class="notif-list" id="notifList" style="max-height:280px; overflow-y:auto; padding:0;"></div>
            <div class="notif-footer" onclick="openNotifModal()">查看全部通知 <i class="fa-solid fa-arrow-right"></i></div>
          </div>
        </div>
      `;

      host.innerHTML = notifHtml +
        '<a href="profile.html" class="user-badge-link">' +
          '<img class="iecp-user-avatar" src="' + w.IECP.escapeHtml(flag) + '">' +
          '<span class="iecp-user-name">' + w.IECP.escapeHtml(p.username) + '</span>' +
          '<i class="fa-solid fa-wallet user-wallet-icon"></i>' +
        '</a>';

      w.IECP.loadNotifications(p.id);
    }).catch(function(){ host.innerHTML = '<a class="btn btn-ghost btn-sm" href="login.html">登录</a>'; });
  };

  w.IECP.loadNotifications = function(userId) {
    w.IECP.client.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50).then(function(res) {
      var list = res.data || [];
      w.IECP._notifList = list;
      var unreadCount = list.filter(n => !n.is_read).length;
      var badge = document.getElementById('notifBadge');
      if (badge) { badge.textContent = unreadCount > 99 ? '99+' : unreadCount; badge.style.display = unreadCount > 0 ? 'block' : 'none'; }
      renderNotifDropdown(list);
      renderNotifCenter(list);
    });
  };

  var typeMap = { 
    trade: { icon: 'fa-store', color: 'var(--cyan)', bg: 'rgba(79,195,247,0.1)' },
    war: { icon: 'fa-shield-halved', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)' },
    ally: { icon: 'fa-handshake', color: 'var(--gold)', bg: 'rgba(212,175,55,0.1)' },
    disaster: { icon: 'fa-house-crack', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)' },
    system: { icon: 'fa-bullhorn', color: 'var(--purple)', bg: 'rgba(167,139,250,0.1)' }
  };

  function renderNotifDropdown(list) {
    var listWrap = document.getElementById('notifList');
    if (!listWrap) return;
    var previewList = list.slice(0, 5);
    if (!previewList.length) {
      listWrap.innerHTML = '<div style="text-align:center; color:var(--muted); padding:30px 10px; font-size:13px;"><i class="fa-regular fa-bell-slash" style="font-size:24px; margin-bottom:10px; opacity:0.5;"></i><br>暂无消息</div>';
      return;
    }
    listWrap.innerHTML = previewList.map(n => {
      var m = typeMap[n.type] || typeMap.system;
      return `
        <div class="notif-item-compact ${n.is_read ? '' : 'unread'}" onclick="viewNotifDetail('${n.id}')">
          <div style="width:28px; height:28px; border-radius:50%; background:${m.bg}; color:${m.color}; display:grid; place-items:center; flex-shrink:0;"><i class="fa-solid ${m.icon}" style="font-size:12px;"></i></div>
          <div style="flex:1; min-width:0; margin-left:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-size:12.5px; font-weight:bold; color:#fff;">${w.IECP.escapeHtml(n.title)}</span>
              <span style="font-size:10px; color:var(--muted-2);">${w.IECP.relativeTime(n.created_at)}</span>
            </div>
            <div style="font-size:11.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${w.IECP.escapeHtml(n.content)}</div>
          </div>
          ${n.is_read ? '' : '<div style="width:6px; height:6px; background:var(--red); border-radius:50%; margin-left:6px;"></div>'}
        </div>
      `;
    }).join('');
  }

  function renderNotifCenter(list) {
    var centerWrap = document.getElementById('notifCenterList');
    if (!centerWrap) return;
    if (!list.length) {
      centerWrap.innerHTML = '<div style="text-align:center; color:var(--muted); padding:40px 10px;"><i class="fa-regular fa-bell-slash" style="font-size:36px; margin-bottom:12px; opacity:0.3;"></i><br>消息中心空空如也</div>';
      return;
    }
    centerWrap.innerHTML = list.map(n => {
      var m = typeMap[n.type] || typeMap.system;
      return `
        <div class="notif-card-center ${n.is_read ? 'read' : 'unread'}" onclick="viewNotifDetail('${n.id}')">
          <div class="notif-card-icon" style="background:${m.bg}; color:${m.color};"><i class="fa-solid ${m.icon}"></i></div>
          <div class="notif-card-body">
            <div class="notif-card-title">${w.IECP.escapeHtml(n.title)} ${n.is_read ? '' : '<span style="color:var(--red); font-size:10px; border:1px solid var(--red); padding:1px 4px; border-radius:4px; margin-left:8px;">未读</span>'}</div>
            <div class="notif-card-content">${w.IECP.escapeHtml(n.content)}</div>
            <div class="notif-card-time"><i class="fa-regular fa-clock"></i> ${w.IECP.fmtDate(n.created_at)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.viewNotifDetail = function(id) {
    var list = w.IECP._notifList || [];
    var n = list.find(x => x.id === id);
    if (!n) return;

    if (!n.is_read) {
      n.is_read = true;
      w.IECP.client.from('notifications').update({ is_read: true }).eq('id', id).then(function() {
        w.IECP.loadNotifications(w.IECP._currentProfileCache.id);
      });
    }

    var m = typeMap[n.type] || typeMap.system;
    var actionBtnHtml = '';
    if (n.type === 'trade') {
      actionBtnHtml = `<a href="market.html" class="btn btn-gold" style="width:100%; margin-top:20px;"><i class="fa-solid fa-store"></i> 前往交易行</a>`;
    } else if (n.type === 'war') {
      actionBtnHtml = `<a href="wars.html" class="btn btn-red" style="width:100%; margin-top:20px;"><i class="fa-solid fa-shield-halved"></i> 前往战争大厅</a>`;
    } else if (n.type === 'ally') {
      actionBtnHtml = `<a href="countries.html" class="btn btn-cyan" style="width:100%; margin-top:20px;"><i class="fa-solid fa-flag"></i> 查看国家列表</a>`;
    }

    document.getElementById('ndTitle').innerHTML = `<i class="fa-solid ${m.icon}" style="color:${m.color}; margin-right:8px;"></i>${w.IECP.escapeHtml(n.title)}`;
    document.getElementById('ndBody').innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--muted); margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
        <span><i class="fa-regular fa-clock"></i> ${w.IECP.fmtDate(n.created_at)}</span>
        <span style="background:${m.bg}; color:${m.color}; padding:2px 8px; border-radius:4px;">${n.type.toUpperCase()}</span>
      </div>
      <div style="font-size:15px; line-height:1.8; color:var(--ink-2); white-space:pre-wrap;">${w.IECP.escapeHtml(n.content)}</div>
      ${actionBtnHtml}
    `;
    document.getElementById('notifDetailModal').classList.add('open');
  };

  window.closeNotifDetail = function() { document.getElementById('notifDetailModal').classList.remove('open'); };
  window.toggleNotif = function(e) { e.stopPropagation(); var dd = document.getElementById('notifDropdown'); if (dd) dd.classList.toggle('show'); };
  window.openNotifModal = function() { document.getElementById('notifDropdown').classList.remove('show'); document.getElementById('notifCenterModal').classList.add('open'); };
  window.closeNotifModal = function() { document.getElementById('notifCenterModal').classList.remove('open'); };

  window.markAllRead = function(e) {
    if(e) e.stopPropagation();
    var p = w.IECP._currentProfileCache;
    if (!p) return;
    w.IECP.client.from('notifications').update({ is_read: true }).eq('user_id', p.id).eq('is_read', false).then(function(){ w.IECP.loadNotifications(p.id); });
  };

  document.addEventListener('click', function(e) {
    var dd = document.getElementById('notifDropdown');
    if (dd && dd.classList.contains('show') && !e.target.closest('.notif-wrapper')) dd.classList.remove('show');
  });

  setInterval(function() { if (w.IECP._currentProfileCache) w.IECP.loadNotifications(w.IECP._currentProfileCache.id); }, 60000);

  w.IECP.initTopbar = function (activeId) { w.IECP.renderNav(activeId); w.IECP.renderUserBadge(); };
})(window);