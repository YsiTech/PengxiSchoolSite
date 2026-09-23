/* ===================================================================
   星图 · 私聊 / 群聊（离线版 · 数据库驱动）
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) return;

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };
  var POLL = 5000;       // 5 秒轮询
  var SOUND_URL = 'photo/beep.mp3';   // 提示音（放 photo 或 assets 下都行）

  var me = null;
  var conversations = [];   // 最近会话
  var friendsList = [];
  var requestsList = [];
  var unreadConv = 0;
  var unreadReq = 0;
  var unreadRooms = 0;

  var currentPeer = null;   // 当前私聊对象
  var currentRoom = null;   // 当前群聊
  var soundEnabled = true;
  var prevUnreadCount = 0;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var hm = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    if (sameDay) return hm;
    return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
  }
  function avatar(profile) {
    if (profile && profile.avatar) {
      return '<img src="' + esc(profile.avatar) + '" alt="">';
    }
    var nick = (profile && profile.nickname) || '?';
    var c = '#' + ['c8102e','1a2b4c','1f8f55','8a6d12','7a3b8f','c85a17','2b6a8b','8b2b4a'][nick.charCodeAt(0) % 8];
    return '<span class="av-letter" style="background:' + c + '">' +
           esc(nick.slice(0,1).toUpperCase()) + '</span>';
  }
  function playBeep() {
    if (!soundEnabled) return;
    try {
      var a = new Audio(SOUND_URL);
      a.volume = 0.5;
      a.play().catch(function () {});
    } catch (e) {}
  }

  /* ============================================================
     启动
     ============================================================ */
  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=xingtu.html');
      return;
    }
    me = Auth.getCurrentUser();
    bindTabs();
    bindSide();
    bindChatForm();
    bindRoomForm();
    bindModals();

    loadAll();
    setInterval(function () {
      if (!document.hidden) loadAll();
    }, POLL);
  });

  function loadAll() {
    loadConversations();
    loadFriends();
    loadRequests();
    loadRooms();
  }

  /* ============================================================
     顶层 Tabs
     ============================================================ */
  function bindTabs() {
    document.querySelectorAll('#xtTabs .xt-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.dataset.tab;
        document.querySelectorAll('#xtTabs .xt-tab').forEach(function (t) {
          t.classList.toggle('on', t === tab);
        });
        document.querySelectorAll('.xt-panel').forEach(function (p) {
          p.classList.toggle('on', p.dataset.panel === name);
        });
      });
    });
  }

  /* ============================================================
     侧栏 Subtabs
     ============================================================ */
  function bindSide() {
    document.querySelectorAll('.ch-side-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.ch-side-tab').forEach(function (t) {
          t.classList.toggle('on', t === tab);
        });
        renderSideList(tab.dataset.subtab);
      });
    });
    $('chSearchBtn').addEventListener('click', doSearch);
    $('chSearch').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    });
    $('chBackBtn').addEventListener('click', function () {
      currentPeer = null;
      $('chConv').classList.add('hide');
      $('chEmpty').classList.remove('hide');
    });
    $('rmBackBtn').addEventListener('click', function () {
      currentRoom = null;
      $('rmConv').classList.add('hide');
      $('rmEmpty').classList.remove('hide');
    });
  }

  /* ============================================================
     加载：最近会话
     ============================================================ */
  function loadConversations() {
    client.from('messages')
      .select('*')
      .or('sender_id.eq.' + me.id + ',receiver_id.eq.' + me.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(function (res) {
        if (res.error) { console.error(res.error); return; }
        var map = {};
        (res.data || []).forEach(function (m) {
          var other = m.sender_id === me.id ? m.receiver_id : m.sender_id;
          if (!map[other]) {
            map[other] = { peerId: other, lastMsg: m, unread: 0 };
          }
          if (m.receiver_id === me.id && !m.is_read) {
            map[other].unread++;
          }
        });
        var list = Object.values(map);

        if (!list.length) {
          conversations = [];
          refreshBadges();
          var act = document.querySelector('.ch-side-tab.on');
          if (act) renderSideList(act.dataset.subtab);
          return;
        }

        var ids = list.map(function (c) { return c.peerId; });
        client.from('profiles').select('*').in('id', ids).then(function (pres) {
          var pmap = {};
          (pres.data || []).forEach(function (p) { pmap[p.id] = p; });
          list.forEach(function (c) { c.profile = pmap[c.peerId] || { id: c.peerId, nickname: '未知' }; });
          list.sort(function (a, b) {
            return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at);
          });
          conversations = list;

          var before = prevUnreadCount;
          unreadConv = conversations.reduce(function (s, c) { return s + c.unread; }, 0);
          refreshBadges();
          if (unreadConv > before && before > 0) playBeep();
          prevUnreadCount = unreadConv;

          var act = document.querySelector('.ch-side-tab.on');
          if (act) renderSideList(act.dataset.subtab);
        });
      });
  }

  /* ============================================================
     加载：好友
     ============================================================ */
  function loadFriends() {
    client.from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .then(function (res) {
        if (res.error) return;
        var rows = res.data || [];
        var ids = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });
        if (!ids.length) { friendsList = []; refreshBadges(); return; }
        client.from('profiles').select('*').in('id', ids).then(function (pres) {
          var pmap = {};
          (pres.data || []).forEach(function (p) { pmap[p.id] = p; });
          friendsList = rows.map(function (r) {
            var oid = r.requester_id === me.id ? r.addressee_id : r.requester_id;
            return { fs: r, profile: pmap[oid] || { id: oid, nickname: '未知' } };
          });
          refreshBadges();
        });
      });
  }

  /* ============================================================
     加载：请求
     ============================================================ */
  function loadRequests() {
    client.from('friendships')
      .select('*')
      .eq('status', 'pending')
      .eq('addressee_id', me.id)
      .then(function (res) {
        if (res.error) return;
        var rows = res.data || [];
        var ids = rows.map(function (r) { return r.requester_id; });
        if (!ids.length) { requestsList = []; unreadReq = 0; refreshBadges(); return; }
        client.from('profiles').select('*').in('id', ids).then(function (pres) {
          var pmap = {};
          (pres.data || []).forEach(function (p) { pmap[p.id] = p; });
          requestsList = rows.map(function (r) {
            return { fs: r, profile: pmap[r.requester_id] || { id: r.requester_id, nickname: '未知' } };
          });
          unreadReq = requestsList.length;
          refreshBadges();
        });
      });
  }

  /* ============================================================
     加载：群聊
     ============================================================ */
  var roomsList = [];
  function loadRooms() {
    client.from('room_members').select('room_id').eq('user_id', me.id).then(function (res) {
      if (res.error) return;
      var rids = (res.data || []).map(function (r) { return r.room_id; });
      if (!rids.length) { roomsList = []; refreshBadges(); renderRoomList(); return; }

      client.from('rooms').select('*').in('id', rids).then(function (rres) {
        var rooms = rres.data || [];
        Promise.all(rooms.map(function (r) {
          return client.from('room_messages')
            .select('*')
            .eq('room_id', r.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .then(function (mres) {
              r.lastMsg = (mres.data || [])[0] || null;
              return r;
            });
        })).then(function (list) {
          list.sort(function (a, b) {
            var ta = a.lastMsg ? new Date(a.lastMsg.created_at) : new Date(a.created_at);
            var tb = b.lastMsg ? new Date(b.lastMsg.created_at) : new Date(b.created_at);
            return tb - ta;
          });
          roomsList = list;
          renderRoomList();
        });
      });
    });
  }

  function renderRoomList() {
    var el = $('rmSideList');
    if (!el) return;
    if (!roomsList.length) {
      el.innerHTML = '<div class="ch-side-loading">还没有群聊</div>';
      return;
    }
    el.innerHTML = roomsList.map(function (r) {
      var preview = r.lastMsg
        ? (r.lastMsg.recalled ? '[已撤回]' : (r.lastMsg.type === 'image' ? '[图片]' : (r.lastMsg.content || '').slice(0, 24)))
        : '还没有消息';
      var active = (currentRoom && currentRoom.id === r.id) ? ' active' : '';
      return '<div class="ch-side-item' + active + '" data-room="' + r.id + '">' +
        '<div class="csi-avatar"><span class="av-letter" style="background:#1a2b4c">群</span></div>' +
        '<div class="csi-body">' +
          '<div class="csi-name">' + esc(r.name) + '</div>' +
          '<div class="csi-preview">' + esc(preview) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    el.querySelectorAll('[data-room]').forEach(function (item) {
      item.addEventListener('click', function () {
        openRoom(parseInt(item.dataset.room, 10));
      });
    });
  }

  /* ============================================================
     侧栏渲染
     ============================================================ */
  function renderSideList(subtab) {
    var el = $('chSideList');
    if (!el) return;

    if (subtab === 'conversations') {
      if (!conversations.length) {
        el.innerHTML = '<div class="ch-side-loading">还没有会话<br><span class="muted small">去「好友」里点聊天开始</span></div>';
        return;
      }
      el.innerHTML = conversations.map(function (c) {
        var p = c.profile;
        var preview = c.lastMsg.recalled ? '[已撤回]' : (c.lastMsg.type === 'image' ? '[图片]' : (c.lastMsg.content || '').slice(0, 24));
        var active = (currentPeer && currentPeer.id === p.id) ? ' active' : '';
        var badge = c.unread > 0 ? '<span class="csi-badge">' + c.unread + '</span>' : '';
        return '<div class="ch-side-item' + active + '" data-peer="' + esc(p.id) + '">' +
          '<div class="csi-avatar">' + avatar(p) + badge + '</div>' +
          '<div class="csi-body">' +
            '<div class="csi-name">' + esc(p.nickname || '匿名') + '</div>' +
            '<div class="csi-preview">' + esc(preview) + '</div>' +
          '</div>' +
          '<div class="csi-time">' + fmtTime(c.lastMsg.created_at) + '</div>' +
        '</div>';
      }).join('');
    } else if (subtab === 'friends') {
      if (!friendsList.length) {
        el.innerHTML = '<div class="ch-side-loading">还没有好友<br><span class="muted small">在上方搜索用户名添加</span></div>';
        return;
      }
      el.innerHTML = friendsList.map(function (f) {
        var p = f.profile;
        return '<div class="ch-side-item" data-peer="' + esc(p.id) + '">' +
          '<div class="csi-avatar">' + avatar(p) + '</div>' +
          '<div class="csi-body">' +
            '<div class="csi-name">' + esc(p.nickname || '匿名') + '</div>' +
            '<div class="csi-preview">' + (p.is_guest ? '游客' : '正式用户') + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    } else if (subtab === 'requests') {
      if (!requestsList.length) {
        el.innerHTML = '<div class="ch-side-loading">没有待处理的好友请求</div>';
        return;
      }
      el.innerHTML = requestsList.map(function (r) {
        var p = r.profile;
        return '<div class="ch-side-item" data-req="' + r.fs.id + '">' +
          '<div class="csi-avatar">' + avatar(p) + '</div>' +
          '<div class="csi-body">' +
            '<div class="csi-name">' + esc(p.nickname || '匿名') + '</div>' +
            '<div class="csi-preview">请求加你为好友</div>' +
            '<div class="csi-actions">' +
              '<button class="mini-btn primary" data-accept="' + r.fs.id + '">接受</button>' +
              '<button class="mini-btn" data-reject="' + r.fs.id + '">拒绝</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      el.querySelectorAll('[data-accept]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          acceptReq(parseInt(b.dataset.accept, 10));
        });
      });
      el.querySelectorAll('[data-reject]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          rejectReq(parseInt(b.dataset.reject, 10));
        });
      });
    }

    /* 会话/好友：点开聊天 */
    el.querySelectorAll('[data-peer]').forEach(function (item) {
      if (item.querySelector('[data-accept]')) return;
      item.addEventListener('click', function () {
        openChat(item.dataset.peer);
      });
    });
  }

  function refreshBadges() {
    setBadge('tabBadgeChat', unreadConv);
    setBadge('sbConvBadge', unreadConv);
    setBadge('tabBadgeRooms', unreadRooms);
    setBadge('sbReqBadge', unreadReq);
    setBadge('sbFriendBadge', friendsList.length);
  }
  function setBadge(id, n) {
    var el = document.getElementById(id);
    if (!el) return;
    if (n > 0) {
      el.textContent = n > 99 ? '99+' : n;
      el.classList.remove('hide');
    } else {
      el.classList.add('hide');
    }
  }

  /* ============================================================
     打开私聊
     ============================================================ */
  function openChat(peerId) {
    currentPeer = { id: peerId, profile: null };
    $('chEmpty').classList.add('hide');
    $('chConv').classList.remove('hide');

    client.from('profiles').select('*').eq('id', peerId).maybeSingle().then(function (res) {
      if (!res.data) return;
      currentPeer.profile = res.data;
      $('chPeerAvatar').innerHTML = avatar(res.data);
      $('chPeerName').textContent = res.data.nickname || '匿名';
      $('chPeerSub').textContent = res.data.is_guest ? '游客' : '正式用户';
    });

    loadMessages();
    var act = document.querySelector('.ch-side-tab.on');
    if (act) renderSideList(act.dataset.subtab);
  }

  function loadMessages() {
    if (!currentPeer) return;
    client.from('messages').select('*')
      .or(
        'and(sender_id.eq.' + me.id + ',receiver_id.eq.' + currentPeer.id + '),' +
        'and(sender_id.eq.' + currentPeer.id + ',receiver_id.eq.' + me.id + ')'
      )
      .order('created_at', { ascending: true })
      .limit(200)
      .then(function (res) {
        if (res.error) { console.error(res.error); return; }
        renderMessages(res.data || []);

        /* 标记已读 */
        client.from('messages').update({ is_read: true })
          .eq('receiver_id', me.id)
          .eq('sender_id', currentPeer.id)
          .eq('is_read', false)
          .then(function () {
            var c = conversations.find(function (x) { return x.peerId === currentPeer.id; });
            if (c) { c.unread = 0; }
            loadConversations();
          });
      });
  }

  function renderMessages(list) {
    var box = $('chMessages');
    if (!list.length) {
      box.innerHTML = '<div class="ch-empty-msg">还没有消息，打个招呼吧 👋</div>';
      return;
    }
    box.innerHTML = list.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? list[i - 1] : null;
      var showTime = !prev || (new Date(m.created_at) - new Date(prev.created_at)) > 300000;
      var timeHtml = showTime ? '<div class="ch-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';

      if (m.recalled) {
        return timeHtml + '<div class="ch-msg ' + (isSelf ? 'self' : 'other') + '">' +
          '<div class="ch-recalled">你撤回了一条消息</div></div>';
      }

      var contentHtml;
      if (m.type === 'image' && m.image_url) {
        contentHtml = '<div class="ch-img-bubble"><img src="' + esc(m.image_url) + '" alt="" onclick="window.open(this.src)"></div>';
      } else {
        contentHtml = '<div class="ch-bubble">' + esc(m.content || '').replace(/\n/g, '<br>') + '</div>';
      }

      var meta = '';
      if (isSelf) {
        if (m.is_read) meta = '<span class="ch-read">已读</span>';
        else meta = '<span class="ch-read">未读</span>';
        meta += '<button class="ch-recall-btn" data-recall="' + m.id + '" type="button">撤回</button>';
      }

      return timeHtml + '<div class="ch-msg ' + (isSelf ? 'self' : 'other') + '">' +
        contentHtml + '<div class="ch-meta">' + meta + '</div></div>';
    }).join('');

    box.querySelectorAll('[data-recall]').forEach(function (b) {
      b.addEventListener('click', function () { recallMsg(parseInt(b.dataset.recall, 10)); });
    });

    setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
  }

  function recallMsg(id) {
    if (!confirm('撤回这条消息？')) return;
    client.from('messages').update({ recalled: true }).eq('id', id).eq('sender_id', me.id).then(function () {
      loadMessages();
    });
  }

  /* ============================================================
     发送私聊
     ============================================================ */
  function bindChatForm() {
    var input = $('chInput');
    var form = $('chForm');
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentPeer) return;
      var text = (input.value || '').trim();
      if (!text) return;
      $('chSendBtn').disabled = true;
      client.from('messages').insert({
        sender_id: me.id,
        receiver_id: currentPeer.id,
        content: text,
        type: 'text'
      }).then(function () {
        $('chSendBtn').disabled = false;
        input.value = ''; input.style.height = 'auto'; input.focus();
        loadMessages();
      });
    });

    $('chImageInput').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f || !currentPeer) return;
      sendImage(f, function (url) {
        client.from('messages').insert({
          sender_id: me.id,
          receiver_id: currentPeer.id,
          content: '',
          type: 'image',
          image_url: url
        }).then(function () {
          $('chImageInput').value = '';
          loadMessages();
        });
      });
    });
  }

  /* ============================================================
     图片压缩上传
     ============================================================ */
  function sendImage(file, cb) {
    if (file.size > 8 * 1024 * 1024) { window.siteToast && window.siteToast('图片需小于 8MB'); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var maxW = 1280, maxH = 1280;
        var ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        var w = Math.round(img.width * ratio);
        var h = Math.round(img.height * ratio);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          var path = me.id + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,7) + '.jpg';
          client.storage.from('blog-images').upload(path, blob, { contentType: 'image/jpeg' }).then(function (res) {
            if (res.error) { window.siteToast && window.siteToast('上传失败'); return; }
            var url = client.storage.from('blog-images').getPublicUrl(path).data.publicUrl;
            cb(url);
          });
        }, 'image/jpeg', 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ============================================================
     群聊
     ============================================================ */
  function openRoom(roomId) {
    currentRoom = roomsList.find(function (r) { return r.id === roomId; });
    if (!currentRoom) return;
    $('rmEmpty').classList.add('hide');
    $('rmConv').classList.remove('hide');
    $('rmAvatar').innerHTML = '<span class="av-letter" style="background:#1a2b4c">群</span>';
    $('rmName').textContent = currentRoom.name;
    $('rmSub').textContent = '加载中…';

    client.from('room_members').select('user_id', { count: 'exact' }).eq('room_id', roomId).then(function (res) {
      $('rmSub').textContent = (res.count || 0) + ' 位成员';
    });

    loadRoomMessages(roomId);
    renderRoomList();
  }

  function loadRoomMessages(roomId) {
    client.from('room_messages').select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(function (res) {
        if (res.error) return;
        renderRoomMessages(res.data || []);
      });
  }

  function renderRoomMessages(list) {
    var box = $('rmMessages');
    if (!list.length) {
      box.innerHTML = '<div class="ch-empty-msg">还没有消息</div>';
      return;
    }

    /* 收集发送者 id */
    var ids = list.map(function (m) { return m.sender_id; });
    client.from('profiles').select('id, nickname, avatar').in('id', ids).then(function (pres) {
      var pmap = {};
      (pres.data || []).forEach(function (p) { pmap[p.id] = p; });

      box.innerHTML = list.map(function (m, i) {
        var isSelf = m.sender_id === me.id;
        var p = pmap[m.sender_id] || { nickname: '未知', avatar: '' };
        var prev = i > 0 ? list[i - 1] : null;
        var showTime = !prev || (new Date(m.created_at) - new Date(prev.created_at)) > 300000;
        var timeHtml = showTime ? '<div class="ch-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';

        if (m.recalled) {
          return timeHtml + '<div class="ch-msg ' + (isSelf ? 'self' : 'other') + '">' +
            '<div class="ch-recalled">' + esc(p.nickname) + ' 撤回了一条消息</div></div>';
        }

        var contentHtml;
        if (m.type === 'image' && m.image_url) {
          contentHtml = '<div class="ch-img-bubble"><img src="' + esc(m.image_url) + '" alt="" onclick="window.open(this.src)"></div>';
        } else {
          contentHtml = '<div class="ch-bubble">' + esc(m.content || '').replace(/\n/g, '<br>') + '</div>';
        }

        var meta = '';
        if (isSelf) {
          meta = '<button class="ch-recall-btn" data-room-recall="' + m.id + '" type="button">撤回</button>';
        }

        return timeHtml + '<div class="ch-msg ' + (isSelf ? 'self' : 'other') + '">' +
          (!isSelf ? '<div class="ch-name">' + esc(p.nickname) + '</div>' : '') +
          contentHtml +
          (meta ? '<div class="ch-meta">' + meta + '</div>' : '') +
        '</div>';
      }).join('');

      box.querySelectorAll('[data-room-recall]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('撤回这条消息？')) return;
          client.from('room_messages').update({ recalled: true }).eq('id', parseInt(b.dataset.roomRecall, 10)).then(function () {
            loadRoomMessages(currentRoom.id);
          });
        });
      });

      setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
    });
  }

  function bindRoomForm() {
    var input = $('rmInput');
    var form = $('rmForm');
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentRoom) return;
      var text = (input.value || '').trim();
      if (!text) return;
      $('rmSendBtn').disabled = true;
      client.from('room_messages').insert({
        room_id: currentRoom.id,
        sender_id: me.id,
        content: text,
        type: 'text'
      }).then(function () {
        $('rmSendBtn').disabled = false;
        input.value = ''; input.style.height = 'auto'; input.focus();
        loadRoomMessages(currentRoom.id);
      });
    });
    $('rmImageInput').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f || !currentRoom) return;
      sendImage(f, function (url) {
        client.from('room_messages').insert({
          room_id: currentRoom.id,
          sender_id: me.id,
          content: '',
          type: 'image',
          image_url: url
        }).then(function () {
          $('rmImageInput').value = '';
          loadRoomMessages(currentRoom.id);
        });
      });
    });
  }

  /* ============================================================
     搜索用户
     ============================================================ */
  function doSearch() {
    var kw = ($('chSearch').value || '').trim();
    if (kw.length < 2) { window.siteToast && window.siteToast('请输入至少 2 个字符'); return; }
    $('chSideList').innerHTML = '<div class="ch-side-loading">搜索中…</div>';

    var p = '%' + kw.replace(/[%_\\]/g, '\\$&') + '%';
    Promise.all([
      client.from('profiles').select('*').ilike('nickname', p).neq('id', me.id).limit(15),
      client.from('profiles').select('*').ilike('email', p).neq('id', me.id).limit(15)
    ]).then(function (arr) {
      var merged = new Map();
      (arr[0].data || []).forEach(function (u) { merged.set(u.id, u); });
      (arr[1].data || []).forEach(function (u) { merged.set(u.id, u); });
      renderSearchResults(Array.from(merged.values()));
    });
  }

  function renderSearchResults(list) {
    var el = $('chSideList');
    if (!list.length) {
      el.innerHTML = '<div class="ch-side-loading">没有找到用户</div>';
      return;
    }

    var relMap = {};
    friendsList.forEach(function (f) { relMap[f.profile.id] = 'friend'; });
    requestsList.forEach(function (r) { relMap[r.profile.id] = 'incoming'; });

    el.innerHTML = list.map(function (p) {
      var rel = relMap[p.id];
      var btn;
      if (rel === 'friend') {
        btn = '<button class="mini-btn primary" data-open="' + esc(p.id) + '">聊天</button>';
      } else if (rel === 'incoming') {
        btn = '<button class="mini-btn primary" data-find="' + esc(p.id) + '">接受</button>';
      } else {
        btn = '<button class="mini-btn primary" data-add="' + esc(p.id) + '">加好友</button>';
      }

      var emailShow = '';
      if (p.email) {
        var parts = p.email.split('@');
        var n = parts[0]; var d = parts[1] || '';
        var mn = n.length <= 2 ? n : n.slice(0, 2) + '***';
        emailShow = mn + '@' + d;
      }

      return '<div class="ch-side-item" data-peer="' + esc(p.id) + '">' +
        '<div class="csi-avatar">' + avatar(p) + '</div>' +
        '<div class="csi-body">' +
          '<div class="csi-name">' + esc(p.nickname || '匿名') + '</div>' +
          '<div class="csi-preview">' + esc(emailShow || (p.is_guest ? '游客' : '正式用户')) + '</div>' +
          '<div class="csi-actions">' + btn + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    el.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        client.from('friendships').insert({
          requester_id: me.id, addressee_id: b.dataset.add, status: 'pending'
        }).then(function (res) {
          if (res.error) {
            var m = res.error.message || '';
            if (/duplicate|unique/i.test(m)) { window.siteToast && window.siteToast('已发送过请求'); }
            else { window.siteToast && window.siteToast('发送失败'); }
            return;
          }
          window.siteToast && window.siteToast('请求已发送');
          loadAll();
        });
      });
    });
    el.querySelectorAll('[data-find]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var req = requestsList.find(function (r) { return r.profile.id === b.dataset.find; });
        if (req) acceptReq(req.fs.id);
      });
    });
    el.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        openChat(b.dataset.open);
      });
    });
    el.querySelectorAll('[data-peer]').forEach(function (item) {
      if (item.querySelector('[data-add],[data-find],[data-open]')) return;
      item.addEventListener('click', function () { openChat(item.dataset.peer); });
    });
  }

  /* ============================================================
     接受 / 拒绝请求
     ============================================================ */
  function acceptReq(id) {
    client.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id).then(function () {
        window.siteToast && window.siteToast('已接受');
        unreadReq = Math.max(0, unreadReq - 1);
        loadAll();
      });
  }
  function rejectReq(id) {
    if (!confirm('拒绝这个请求？')) return;
    client.from('friendships').delete().eq('id', id).then(function () {
      unreadReq = Math.max(0, unreadReq - 1);
      loadAll();
    });
  }

  /* ============================================================
     创建群聊弹窗
     ============================================================ */
  function bindModals() {
    $('rmNewBtn').addEventListener('click', openNewRoomModal);
    $('newRoomClose').addEventListener('click', function () { $('newRoomModal').classList.add('hide'); });
    $('newRoomCancel').addEventListener('click', function () { $('newRoomModal').classList.add('hide'); });
    $('newRoomOk').addEventListener('click', createRoom);

    $('rmInviteBtn').addEventListener('click', openInviteModal);
    $('inviteClose').addEventListener('click', function () { $('inviteModal').classList.add('hide'); });
    $('inviteCancel').addEventListener('click', function () { $('inviteModal').classList.add('hide'); });
    $('inviteOk').addEventListener('click', inviteToRoom);
  }

  function openNewRoomModal() {
    if (!friendsList.length) {
      window.siteToast && window.siteToast('先加好友才能建群');
      return;
    }
    $('newRoomName').value = '';
    $('newRoomFriends').innerHTML = friendsList.map(function (f) {
      return '<label class="modal-friend">' +
        '<input type="checkbox" value="' + esc(f.profile.id) + '">' +
        '<span class="mf-avatar">' + avatar(f.profile) + '</span>' +
        '<span>' + esc(f.profile.nickname) + '</span>' +
      '</label>';
    }).join('');
    $('newRoomHint').textContent = '';
    $('newRoomModal').classList.remove('hide');
  }

  function createRoom() {
    var name = ($('newRoomName').value || '').trim();
    if (!name) { $('newRoomHint').textContent = '请输入群聊名称'; return; }
    var checks = $('newRoomFriends').querySelectorAll('input:checked');
    var memberIds = Array.prototype.map.call(checks, function (c) { return c.value; });

    $('newRoomOk').disabled = true;

    client.from('rooms').insert({ name: name, owner_id: me.id }).select().single().then(function (res) {
      if (res.error || !res.data) {
        $('newRoomOk').disabled = false;
        $('newRoomHint').textContent = '创建失败';
        return;
      }
      var roomId = res.data.id;
      var rows = [{ room_id: roomId, user_id: me.id }];
      memberIds.forEach(function (id) { rows.push({ room_id: roomId, user_id: id }); });

      client.from('room_members').insert(rows).then(function () {
        $('newRoomOk').disabled = false;
        $('newRoomModal').classList.add('hide');
        window.siteToast && window.siteToast('群聊已创建');
        loadRooms();
      });
    });
  }

  function openInviteModal() {
    if (!currentRoom) return;
    /* 已有成员 */
    client.from('room_members').select('user_id').eq('room_id', currentRoom.id).then(function (res) {
      var inRoom = {};
      (res.data || []).forEach(function (m) { inRoom[m.user_id] = true; });

      var candidates = friendsList.filter(function (f) { return !inRoom[f.profile.id]; });
      if (!candidates.length) {
        window.siteToast && window.siteToast('所有好友都已在群里');
        return;
      }
      $('inviteFriends').innerHTML = candidates.map(function (f) {
        return '<label class="modal-friend">' +
          '<input type="checkbox" value="' + esc(f.profile.id) + '">' +
          '<span class="mf-avatar">' + avatar(f.profile) + '</span>' +
          '<span>' + esc(f.profile.nickname) + '</span>' +
        '</label>';
      }).join('');
      $('inviteHint').textContent = '';
      $('inviteModal').classList.remove('hide');
    });
  }

  function inviteToRoom() {
    if (!currentRoom) return;
    var checks = $('inviteFriends').querySelectorAll('input:checked');
    var ids = Array.prototype.map.call(checks, function (c) { return c.value; });
    if (!ids.length) { $('inviteHint').textContent = '请选择要邀请的好友'; return; }
    var rows = ids.map(function (id) { return { room_id: currentRoom.id, user_id: id }; });
    client.from('room_members').insert(rows).then(function () {
      $('inviteModal').classList.add('hide');
      window.siteToast && window.siteToast('已邀请');
      openRoom(currentRoom.id);
    });
  }

})();