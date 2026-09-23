/* ===================================================================
   群聊
   · 列出我加入的群
   · 创建群 / 邀请好友
   · 群消息（文本 + 图片 + 撤回）
   =================================================================== */

(function () {
  'use strict';

  if (!window.Auth || !Auth.client) return;

  var client = Auth.client;
  var $ = function (id) { return document.getElementById(id); };
  var POLL_INTERVAL = 5000;
  var pollTimer = null;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    var now = new Date();
    var hm = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    return d.toDateString() === now.toDateString() ? hm : (d.getMonth()+1)+'月'+d.getDate()+'日 '+hm;
  }

  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error('fail')); }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadImage(file) {
    var u = Auth.getCurrentUser();
    return compressImage(file, 1280, 0.8).then(function (blob) {
      var path = u.id + '/room_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
      return client.storage.from('blog-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          return client.storage.from('blog-images').getPublicUrl(path).data.publicUrl;
        });
    });
  }

  var me = null;
  var myRooms = [];
  var currentRoom = null;
  var roomMessages = [];
  var lastMsgId = 0;
  var roomMembers = [];
  var allFriends = [];

  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=group-chat.html');
      return;
    }
    me = Auth.getCurrentUser();
    loadRooms();
    loadFriends();

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) {
        loadRooms();
        if (currentRoom) loadRoomMessages(false);
      }
    }, POLL_INTERVAL);
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  /* ============================================================
     加载我加入的群
     ============================================================ */
  function loadRooms() {
    client.from('room_members')
      .select('room_id')
      .eq('user_id', me.id)
      .then(function (res) {
        if (res.error) return;
        var ids = (res.data || []).map(function (r) { return r.room_id; });
        if (!ids.length) { myRooms = []; renderRooms(); return; }

        client.from('rooms').select('*').in('id', ids)
          .then(function (rres) {
            myRooms = rres.data || [];
            renderRooms();
          });
      });
  }

  function renderRooms() {
    var box = $('roomList');
    if (!box) return;

    if (!myRooms.length) {
      box.innerHTML = '<div class="gc-empty">还没有加入任何群</div>';
      return;
    }

    box.innerHTML = myRooms.map(function (r) {
      var active = currentRoom && currentRoom.id === r.id ? ' active' : '';
      return '<div class="gc-room' + active + '" data-room="' + r.id + '">' +
               '<span class="gc-room-icon">#</span>' +
               '<span class="gc-room-name">' + esc(r.name) + '</span>' +
             '</div>';
    }).join('');

    box.querySelectorAll('[data-room]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = parseInt(el.dataset.room, 10);
        var r = myRooms.find(function (x) { return x.id === id; });
        if (r) openRoom(r);
      });
    });
  }

  function openRoom(room) {
    currentRoom = room;
    roomMessages = [];
    lastMsgId = 0;
    renderRooms();
    $('gcHeader').textContent = room.name;
    loadRoomMembers();
    loadRoomMessages(true);
  }

  function loadRoomMembers() {
    if (!currentRoom) return;
    client.from('room_members').select('user_id').eq('room_id', currentRoom.id)
      .then(function (res) {
        var ids = (res.data || []).map(function (r) { return r.user_id; });
        if (!ids.length) { roomMembers = []; return; }
        client.from('profiles').select('*').in('id', ids)
          .then(function (pres) {
            roomMembers = pres.data || [];
            var cnt = $('gcMemberCount');
            if (cnt) cnt.textContent = roomMembers.length;
          });
      });
  }

  function loadRoomMessages(first) {
    if (!currentRoom) return;
    client.from('room_messages')
      .select('*')
      .eq('room_id', currentRoom.id)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(function (res) {
        if (res.error) return;
        roomMessages = res.data || [];
        renderMessages(first);
      });
  }

  function renderMessages(forceScroll) {
    var box = $('gcMessages');
    if (!box) return;

    if (!currentRoom) {
      box.innerHTML = '<div class="gc-empty">从左侧选择一个群</div>';
      return;
    }
    if (!roomMessages.length) {
      box.innerHTML = '<div class="gc-empty">还没有消息</div>';
      return;
    }

    var latest = roomMessages[roomMessages.length - 1].id;
    var isNew = latest !== lastMsgId;
    lastMsgId = latest;

    var memberMap = {};
    roomMembers.forEach(function (m) { memberMap[m.id] = m; });

    box.innerHTML = roomMessages.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? roomMessages[i-1] : null;
      var showTime = !prev || (new Date(m.created_at) - new Date(prev.created_at)) > 5*60*1000;
      var timeHtml = showTime ? '<div class="chat-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';
      var sender = memberMap[m.sender_id];
      var senderName = sender ? (sender.nickname || '匿名') : '未知';

      var inner;
      if (m.recalled) {
        inner = '<div class="chat-bubble chat-recalled">此消息已撤回</div>';
      } else if (m.type === 'image' && m.image_url) {
        inner = '<div class="chat-bubble chat-image-bubble"><img src="' + esc(m.image_url) + '" alt="图片" data-preview="' + esc(m.image_url) + '"></div>';
      } else {
        inner = '<div class="chat-bubble">' + esc(m.content || '').replace(/\n/g, '<br>') + '</div>';
      }

      var nameHtml = (!isSelf && memberMap[m.sender_id])
        ? '<div class="chat-sender">' + esc(senderName) + '</div>' : '';

      return timeHtml +
        '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
          '<div class="chat-msg-inner">' +
            nameHtml +
            inner +
            (isSelf && !m.recalled ?
              '<button class="chat-recall-btn" data-recall="' + m.id + '" type="button" title="撤回">↺</button>' :
              '') +
          '</div>' +
        '</div>';
    }).join('');

    box.querySelectorAll('[data-preview]').forEach(function (img) {
      img.addEventListener('click', function () {
        var overlay = document.createElement('div');
        overlay.className = 'chat-preview-overlay';
        overlay.innerHTML = '<img src="' + esc(img.getAttribute('data-preview')) + '">';
        overlay.addEventListener('click', function () { overlay.remove(); });
        document.body.appendChild(overlay);
      });
    });

    box.querySelectorAll('[data-recall]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.recall, 10);
        if (!confirm('撤回这条消息？')) return;
        client.from('room_messages').update({ recalled: true }).eq('id', id)
          .then(function () { loadRoomMessages(false); });
      });
    });

    if (forceScroll || isNew) {
      setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
    }
  }

  /* ============================================================
     加载好友（用于邀请）
     ============================================================ */
  function loadFriends() {
    client.from('friendships')
      .select('*')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .eq('status', 'accepted')
      .then(function (res) {
        var rows = res.data || [];
        var ids = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });
        if (!ids.length) { allFriends = []; return; }
        client.from('profiles').select('*').in('id', ids)
          .then(function (pres) { allFriends = pres.data || []; });
      });
  }

  /* ============================================================
     创建群
     ============================================================ */
  var createBtn = $('gcCreateBtn');
  var createModal = $('gcCreateModal');

  if (createBtn && createModal) {
    createBtn.addEventListener('click', function () {
      createModal.classList.remove('hide');
      renderFriendPicker();
    });
    var closeBtn = $('gcCreateClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { createModal.classList.add('hide'); });
    if (createModal) createModal.addEventListener('click', function (e) {
      if (e.target === createModal) createModal.classList.add('hide');
    });
  }

  function renderFriendPicker() {
    var box = $('gcFriendPicker');
    if (!box) return;
    if (!allFriends.length) {
      box.innerHTML = '<div class="gc-empty">你还没有好友</div>';
      return;
    }
    box.innerHTML = allFriends.map(function (f) {
      return '<label class="gc-pick">' +
               '<input type="checkbox" value="' + f.id + '">' +
               '<span>' + esc(f.nickname || '匿名') + '</span>' +
             '</label>';
    }).join('');
  }

  var createForm = $('gcCreateForm');
  if (createForm) {
    createForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('gcGroupName').value || '').trim();
      if (!name) { window.siteToast && window.siteToast('请输入群名称'); return; }

      var picked = [];
      createForm.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
        picked.push(c.value);
      });

      client.from('rooms').insert({ name: name, creator_id: me.id }).select().single()
        .then(function (res) {
          if (res.error) { window.siteToast && window.siteToast('创建失败'); return; }
          var roomId = res.data.id;

          /* 把自己和好友加入 */
          var members = [me.id].concat(picked);
          var inserts = members.map(function (uid) {
            return { room_id: roomId, user_id: uid };
          });

          return client.from('room_members').insert(inserts).then(function () {
            window.siteToast && window.siteToast('群创建成功');
            createModal.classList.add('hide');
            createForm.reset();
            loadRooms();
          });
        });
    });
  }

  /* ============================================================
     发消息
     ============================================================ */
  var form = $('gcForm');
  var input = $('gcInput');
  var sendBtn = $('gcSendBtn');
  var imgBtn = $('gcImageBtn');
  var imgInput = $('gcImageInput');

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentRoom) { window.siteToast && window.siteToast('请先选择群'); return; }
      var text = (input.value || '').trim();
      if (!text) return;

      sendBtn.disabled = true;
      client.from('room_messages').insert({
        room_id: currentRoom.id,
        sender_id: me.id,
        type: 'text',
        content: text
      }).then(function (res) {
        sendBtn.disabled = false;
        if (res.error) { window.siteToast && window.siteToast('发送失败'); return; }
        input.value = '';
        loadRoomMessages(false);
      });
    });
  }

  if (imgBtn && imgInput) {
    imgBtn.addEventListener('click', function () { imgInput.click(); });
    imgInput.addEventListener('change', function () {
      if (!currentRoom) { window.siteToast && window.siteToast('请先选择群'); return; }
      var f = imgInput.files && imgInput.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { window.siteToast && window.siteToast('图片太大'); return; }

      sendBtn.disabled = true;
      uploadImage(f).then(function (url) {
        return client.from('room_messages').insert({
          room_id: currentRoom.id,
          sender_id: me.id,
          type: 'image',
          image_url: url,
          content: '[图片]'
        });
      }).then(function () {
        sendBtn.disabled = false;
        imgInput.value = '';
        loadRoomMessages(false);
      }).catch(function (err) {
        console.error(err);
        sendBtn.disabled = false;
        window.siteToast && window.siteToast('上传失败');
      });
    });
  }

})();