/* ===================================================================
   好友系统 · 完整版
   · 昵称 + 邮箱搜索
   · 轮询刷新（15s）
   · 未读消息红点
   · 声音提示
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) {
    console.error('[friends] Auth 未就绪');
    return;
  }

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };
  var POLL_INTERVAL = 15000;
  var pollTimer = null;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function avatarHTML(profile) {
    if (profile && profile.avatar) {
      return '<img src="' + esc(profile.avatar) + '" alt="">';
    }
    var nick = (profile && profile.nickname) || '?';
    var c = '#' + ['c8102e','1a2b4c','1f8f55','8a6d12','7a3b8f','c85a17','2b6a8b','8b2b4a'][nick.charCodeAt(0) % 8];
    return '<span class="f-avatar-letter" style="background:' + c + '">' +
           esc(nick.slice(0, 1).toUpperCase()) + '</span>';
  }

  var me = null;
  var friends = [];
  var incoming = [];
  var outgoing = [];
  var unreadMap = {};
  var lastTotalUnread = 0;
  var audioReady = false;
  var beepAudio = null;

  /* 初始化提示音 */
  function initAudio() {
    try {
      beepAudio = new Audio('beep.mp3');
      beepAudio.volume = 0.6;
      audioReady = true;
    } catch (e) {
      console.warn('[friends] 无法初始化提示音');
    }
  }
  initAudio();

  /* ============================================================
     启动
     ============================================================ */
  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=friends.html');
      return;
    }
    me = Auth.getCurrentUser();
    loadAll();

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) loadFriendships();
    }, POLL_INTERVAL);
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  function loadAll() { loadFriendships(); }

  function loadFriendships() {
    if (!me) return;
    var loadingEl = $('friendsLoading');
    var loadingReqEl = $('requestsLoading');
    if (loadingEl) loadingEl.style.display = '';
    if (loadingReqEl) loadingReqEl.style.display = '';

    client.from('friendships')
      .select('*')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .order('updated_at', { ascending: false })
      .then(function (res) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (loadingReqEl) loadingReqEl.style.display = 'none';

        if (res.error) {
          console.error('[friends] 加载失败:', res.error);
          return;
        }

        var rows = res.data || [];
        var otherIds = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });

        if (!otherIds.length) {
          classify([], rows);
          return;
        }

        client.from('profiles').select('*').in('id', otherIds)
          .then(function (pres) {
            var map = {};
            (pres.data || []).forEach(function (p) { map[p.id] = p; });
            classify(map, rows);
          });
      });
  }

  function classify(profileMap, rows) {
    friends = [];
    incoming = [];
    outgoing = [];

    rows.forEach(function (r) {
      var otherId = r.requester_id === me.id ? r.addressee_id : r.requester_id;
      var p = profileMap[otherId] || { id: otherId, nickname: '未知用户', avatar: '' };
      var item = { profile: p, fs: r };

      if (r.status === 'accepted') friends.push(item);
      else if (r.status === 'pending') {
        if (r.addressee_id === me.id) incoming.push(item);
        else outgoing.push(item);
      }
    });

    loadUnreadCounts(function () {
      renderFriends();
      renderIncoming();
      renderOutgoing();
      updateBadges();
    });
  }

  function loadUnreadCounts(cb) {
    if (!friends.length) {
      unreadMap = {};
      cb && cb();
      return;
    }
    var ids = friends.map(function (it) { return it.profile.id; });

    client.from('messages')
      .select('sender_id')
      .eq('receiver_id', me.id)
      .eq('is_read', false)
      .in('sender_id', ids)
      .then(function (res) {
        var newMap = {};
        (res.data || []).forEach(function (m) {
          newMap[m.sender_id] = (newMap[m.sender_id] || 0) + 1;
        });
        unreadMap = newMap;

        /* 声音提示：总未读数增加时响一次 */
        var total = 0;
        Object.keys(unreadMap).forEach(function (k) { total += unreadMap[k]; });
        if (total > lastTotalUnread && lastTotalUnread >= 0 && audioReady) {
          try {
            beepAudio.currentTime = 0;
            beepAudio.play().catch(function () { /* 用户未交互，忽略 */ });
          } catch (e) {}
        }
        lastTotalUnread = total;

        cb && cb();
      })
      .catch(function () { cb && cb(); });
  }

  function updateBadges() {
    var bf = $('badgeFriends');
    var br = $('badgeRequests');
    if (bf) {
      bf.textContent = friends.length;
      bf.classList.toggle('hide', friends.length === 0);
    }
    if (br) {
      br.textContent = incoming.length;
      br.classList.toggle('hide', incoming.length === 0);
    }
  }

  document.querySelectorAll('.friends-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.dataset.tab;
      document.querySelectorAll('.friends-tab').forEach(function (t) {
        t.classList.toggle('on', t === tab);
      });
      document.querySelectorAll('.friends-panel').forEach(function (p) {
        p.classList.toggle('on', p.dataset.panel === name);
      });
    });
  });

  /* ============================================================
     渲染：好友列表
     ============================================================ */
  function renderFriends() {
    var grid = $('friendsGrid');
    var empty = $('friendsEmpty');
    if (!grid) return;

    if (!friends.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');

    grid.innerHTML = friends.map(function (it) {
      var unread = unreadMap[it.profile.id] || 0;
      var badge = unread > 0 ? '<span class="f-unread">' + unread + '</span>' : '';
      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(it.profile) + badge + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(it.profile.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">' + (it.profile.is_guest ? '游客' : '正式用户') + '</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="f-btn f-btn-primary" data-chat="' + esc(it.profile.id) + '" type="button">聊天</button>' +
            '<button class="f-btn f-btn-danger" data-remove="' + it.fs.id + '" type="button">删除</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('[data-chat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        location.href = 'chat.html?with=' + btn.dataset.chat;
      });
    });
    grid.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('确定删除这位好友吗？')) removeFriendship(parseInt(btn.dataset.remove, 10));
      });
    });
  }

  function renderIncoming() {
    var grid = $('incomingGrid');
    var empty = $('incomingEmpty');
    if (!grid) return;

    if (!incoming.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');

    grid.innerHTML = incoming.map(function (it) {
      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(it.profile) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(it.profile.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">请求加你为好友</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="f-btn f-btn-primary" data-accept="' + it.fs.id + '" type="button">接受</button>' +
            '<button class="f-btn" data-reject="' + it.fs.id + '" type="button">拒绝</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('[data-accept]').forEach(function (btn) {
      btn.addEventListener('click', function () { acceptRequest(parseInt(btn.dataset.accept, 10)); });
    });
    grid.querySelectorAll('[data-reject]').forEach(function (btn) {
      btn.addEventListener('click', function () { rejectRequest(parseInt(btn.dataset.reject, 10)); });
    });
  }

  function renderOutgoing() {
    var grid = $('outgoingGrid');
    var empty = $('outgoingEmpty');
    if (!grid) return;

    if (!outgoing.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');

    grid.innerHTML = outgoing.map(function (it) {
      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(it.profile) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(it.profile.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">等待对方接受</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="f-btn" data-cancel="' + it.fs.id + '" type="button">撤销</button>' +
          '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('[data-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () { removeFriendship(parseInt(btn.dataset.cancel, 10)); });
    });
  }

  function acceptRequest(id) {
    client.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id).then(function () {
        window.siteToast && window.siteToast('已接受');
        loadFriendships();
      });
  }
  function rejectRequest(id) {
    if (!confirm('拒绝这个请求？')) return;
    client.from('friendships').delete().eq('id', id).then(function () {
      window.siteToast && window.siteToast('已拒绝');
      loadFriendships();
    });
  }
  function removeFriendship(id) {
    client.from('friendships').delete().eq('id', id).then(function () {
      window.siteToast && window.siteToast('已删除');
      loadFriendships();
    });
  }

  /* ============================================================
     搜索（昵称 + 邮箱）
     ============================================================ */
  var searchForm = $('searchForm');
  var searchInput = $('searchInput');
  var searchGrid = $('searchGrid');
  var searchHint = $('searchHint');

  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = (searchInput.value || '').trim();
      if (kw.length < 2) {
        searchHint.textContent = '请输入至少 2 个字符';
        searchGrid.innerHTML = '';
        return;
      }
      searchHint.textContent = '正在搜索…';
      searchGrid.innerHTML = '';
      doSearch(kw);
    });
  }

  function doSearch(kw) {
    var pattern = '%' + kw + '%';
    client.from('profiles')
      .select('id, nickname, avatar, is_guest, email')
      .or('nickname.ilike.' + pattern + ',email.ilike.' + pattern)
      .neq('id', me.id)
      .limit(20)
      .then(function (res) {
        if (res.error) {
          searchHint.textContent = '搜索失败：' + res.error.message;
          return;
        }
        var list = res.data || [];
        searchHint.textContent = list.length ? ('找到 ' + list.length + ' 位用户') : '没有找到匹配的用户';
        renderSearchResults(list);
      });
  }

  function renderSearchResults(list) {
    if (!searchGrid) return;

    var relationMap = {};
    friends.forEach(function (it) { relationMap[it.profile.id] = 'friend'; });
    incoming.forEach(function (it) { relationMap[it.profile.id] = 'incoming'; });
    outgoing.forEach(function (it) { relationMap[it.profile.id] = 'outgoing'; });

    searchGrid.innerHTML = list.map(function (p) {
      var rel = relationMap[p.id];
      var actionHTML = '';

      if (rel === 'friend') {
        actionHTML = '<button class="f-btn f-btn-primary" data-chat="' + p.id + '" type="button">聊天</button>';
      } else if (rel === 'incoming') {
        actionHTML = '<button class="f-btn f-btn-primary" data-send="' + p.id + '" type="button">接受请求</button>';
      } else if (rel === 'outgoing') {
        actionHTML = '<span class="f-badge">请求已发送</span>';
      } else {
        actionHTML = '<button class="f-btn f-btn-primary" data-send="' + p.id + '" type="button">加好友</button>';
      }

      var emailDisplay = '';
      if (p.email) {
        var parts = p.email.split('@');
        var name = parts[0];
        var domain = parts[1] || '';
        var masked = name.length <= 2 ? name : (name.slice(0, 2) + '***');
        emailDisplay = masked + '@' + domain;
      }

      return '' +
        '<div class="friend-card">' +
          '<div class="friend-avatar">' + avatarHTML(p) + '</div>' +
          '<div class="friend-info">' +
            '<div class="friend-name">' + esc(p.nickname || '匿名') + '</div>' +
            '<div class="friend-meta">' +
              (emailDisplay ? esc(emailDisplay) + ' · ' : '') +
              (p.is_guest ? '游客' : '正式用户') +
            '</div>' +
          '</div>' +
          '<div class="friend-actions">' + actionHTML + '</div>' +
        '</div>';
    }).join('');

    searchGrid.querySelectorAll('[data-send]').forEach(function (btn) {
      btn.addEventListener('click', function () { sendRequest(btn.dataset.send); });
    });
    searchGrid.querySelectorAll('[data-chat]').forEach(function (btn) {
      btn.addEventListener('click', function () { location.href = 'chat.html?with=' + btn.dataset.chat; });
    });
  }

  function sendRequest(targetId) {
    if (targetId === me.id) { window.siteToast && window.siteToast('不能加自己'); return; }

    var reverse = incoming.find(function (it) { return it.profile.id === targetId; });
    if (reverse) { acceptRequest(reverse.fs.id); return; }

    client.from('friendships').insert({
      requester_id: me.id,
      addressee_id: targetId,
      status: 'pending'
    }).then(function (res) {
      if (res.error) {
        var msg = res.error.message || '发送失败';
        if (/duplicate|unique/i.test(msg)) msg = '已经发送过请求了';
        window.siteToast && window.siteToast(msg);
        return;
      }
      window.siteToast && window.siteToast('请求已发送');
      loadFriendships();
      if (searchInput && searchInput.value.trim().length >= 2) {
        setTimeout(function () { doSearch(searchInput.value.trim()); }, 300);
      }
    });
  }

})();