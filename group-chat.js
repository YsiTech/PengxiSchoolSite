/* ===================================================================
   群聊聊天页
   · 群消息：文本 / 图片 / 撤回
   · 实时刷新（5s 轮询）
   · 群成员列表、邀请好友、退群、解散
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
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var hm = ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    if (sameDay) return hm;
    var y = d.getFullYear();
    var nowY = now.getFullYear();
    if (y === nowY) return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
    return y + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' ' + hm;
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

  function compressImage(file, maxW, maxH, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          var nw = Math.round(img.width * ratio);
          var nh = Math.round(img.height * ratio);
          var canvas = document.createElement('canvas');
          canvas.width = nw; canvas.height = nh;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, nw, nh);
          canvas.toBlob(function (b) {
            if (!b) reject(new Error('压缩失败'));
            else resolve(b);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadChatImage(file) {
    var u = Auth.getCurrentUser();
    if (!u) return Promise.reject(new Error('未登录'));
    return compressImage(file, 1600, 1200, 0.82).then(function (blob) {
      var path = 'group/' + u.id + '/' + Date.now() + '_' +
                 Math.random().toString(36).slice(2,8) + '.jpg';
      return client.storage.from('chat-images')
        .upload(path, blob, { contentType: 'image/jpeg' })
        .then(function (res) {
          if (res.error) throw res.error;
          return client.storage.from('chat-images').getPublicUrl(path).data.publicUrl;
        });
    });
  }

  /* ============================================================
     状态
     ============================================================ */
  var me = null;
  var roomId = null;
  var room = null;
  var members = [];         // [{ id, nickname, avatar, is_guest }]
  var memberMap = {};       // id -> profile
  var allMessages = [];
  var lastRenderedId = 0;

  /* ============================================================
     启动
     ============================================================ */
  Auth.ready.then(function () {
    if (!Auth.isLoggedIn()) {
      location.replace('index.html?redirect=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    me = Auth.getCurrentUser();

    var params = new URLSearchParams(location.search);
    roomId = parseInt(params.get('id'), 10);
    if (!roomId) {
      $('chatMessages').innerHTML =
        '<div class="chat-error">未指定群，<a href="group.html">返回群列表</a></div>';
      return;
    }

    checkMembership();
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  /* ============================================================
     校验成员身份
     ============================================================ */
  function checkMembership() {
    client.from('room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', me.id)
      .maybeSingle()
      .then(function (res) {
        if (!res.data) {
          if (confirm('你还不是这个群的成员，是否加入？')) {
            client.from('room_members').insert({ room_id: roomId, user_id: me.id })
              .then(function () { initChat(); });
          } else {
            location.href = 'group.html';
          }
          return;
        }
        initChat();
      });
  }

  function initChat() {
    loadRoom();
    loadMembers();
    loadMessages(true);

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) {
        loadMessages(false);
        loadMembers();   // 顺便刷新成员
      }
    }, POLL_INTERVAL);
  }

  /* ============================================================
     加载群信息
     ============================================================ */
  function loadRoom() {
    client.from('rooms').select('*').eq('id', roomId).maybeSingle()
      .then(function (res) {
        if (!res.data) {
          $('chatMessages').innerHTML =
            '<div class="chat-error">群不存在，<a href="group.html">返回列表</a></div>';
          return;
        }
        room = res.data;
        var name = room.name || '群聊';
        document.title = name + ' · 群聊 · 蓬溪格勒人民高等中学';
        $('chatTitle').textContent = name;
        $('chatCrumb').textContent = name;
        $('groupNameDisplay').textContent = name;

        // 群主控制解散按钮
        if (room.owner_id === me.id) {
          $('deleteBtn').classList.remove('hide');
        } else {
          $('deleteBtn').classList.add('hide');
        }
      });
  }

  /* ============================================================
     加载成员
     ============================================================ */
  function loadMembers() {
    client.from('room_members').select('user_id').eq('room_id', roomId)
      .then(function (res) {
        var ids = (res.data || []).map(function (m) { return m.user_id; });
        if (!ids.length) {
          members = [];
          memberMap = {};
          updateMembersUI();
          return;
        }
        client.from('profiles').select('*').in('id', ids)
          .then(function (pres) {
            members = pres.data || [];
            memberMap = {};
            members.forEach(function (m) { memberMap[m.id] = m; });
            updateMembersUI();
          });
      });
  }

  function updateMembersUI() {
    var count = members.length;
    $('membersCount').textContent = count;
    $('groupMembersDisplay').textContent = count + ' 位成员';
  }

  /* ============================================================
     加载消息
     ============================================================ */
  function loadMessages(first) {
    client.from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(function (res) {
        if (res.error) {
          console.error('[group-chat] 加载失败:', res.error);
          if (first) {
            $('chatMessages').innerHTML = '<div class="chat-error">加载失败</div>';
          }
          return;
        }
        allMessages = res.data || [];
        renderMessages(first);
      });
  }

  /* ============================================================
     渲染消息
     ============================================================ */
  function renderMessages(forceScroll) {
    var box = $('chatMessages');
    if (!box) return;

    if (!allMessages.length) {
      box.innerHTML = '<div class="chat-empty">还没有消息。发第一条吧 👋</div>';
      return;
    }

    var latestId = allMessages[allMessages.length - 1].id;
    var isNew = latestId !== lastRenderedId;
    lastRenderedId = latestId;

    box.innerHTML = allMessages.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? allMessages[i - 1] : null;
      var showTime = !prev ||
        (new Date(m.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;
      var timeHtml = showTime
        ? '<div class="chat-time">' + esc(fmtTime(m.created_at)) + '</div>'
        : '';

      /* 撤回状态 */
      if (m.deleted) {
        return timeHtml +
          '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
            '<div class="chat-bubble chat-recalled">' +
              (isSelf ? '你撤回了一条消息' : '对方撤回了一条消息') +
            '</div>' +
          '</div>';
      }

      /* 撤回按钮 */
      var recallBtn = isSelf
        ? '<button class="chat-recall" data-recall="' + m.id + '" type="button" title="撤回">↺</button>'
        : '';

      /* 群聊显示发送者 */
      var senderNameHtml = '';
      var senderAvatarHtml = '';
      if (!isSelf) {
        var sp = memberMap[m.sender_id] || { nickname: '匿名', avatar: '' };
        senderNameHtml = '<div class="chat-sender-name">' + esc(sp.nickname || '匿名') + '</div>';
        senderAvatarHtml = '<div class="chat-sender-avatar">' + avatarHTML(sp) + '</div>';
      }

      /* 内容 */
      var body;
      if (m.type === 'image' && m.image_url) {
        body = '<img class="chat-img" src="' + esc(m.image_url) + '" alt="图片" loading="lazy">';
      } else {
        body = esc(m.content || '').replace(/\n/g, '<br>');
      }

      if (isSelf) {
        return timeHtml +
          '<div class="chat-msg self">' +
            recallBtn +
            '<div class="chat-bubble">' + body + '</div>' +
          '</div>';
      } else {
        return timeHtml +
          '<div class="chat-msg other group-with-sender">' +
            senderAvatarHtml +
            '<div class="chat-bubble-wrap">' +
              senderNameHtml +
              '<div class="chat-bubble">' + body + '</div>' +
            '</div>' +
          '</div>';
      }
    }).join('');

    /* 撤回事件 */
    box.querySelectorAll('[data-recall]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('撤回这条消息？')) recallMessage(parseInt(btn.dataset.recall, 10));
      });
    });

    if (forceScroll || isNew) {
      setTimeout(function () { box.scrollTop = box.scrollHeight; }, 40);
    }
  }

  function recallMessage(id) {
    client.from('room_messages').update({ deleted: true }).eq('id', id)
      .then(function (res) {
        if (res.error) {
          window.siteToast && window.siteToast('撤回失败');
          return;
        }
        loadMessages(false);
      });
  }

  /* ============================================================
     发送消息
     ============================================================ */
  var form = $('chatForm');
  var input = $('chatInput');
  var sendBtn = $('chatSendBtn');

  if (input) {
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
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (input.value || '').trim();
      if (!text) return;

      sendBtn.disabled = true;
      sendBtn.textContent = '发送中…';

      client.from('room_messages').insert({
        room_id: roomId,
        sender_id: me.id,
        content: text,
        type: 'text'
      }).then(function (res) {
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';
        if (res.error) {
          window.siteToast && window.siteToast('发送失败');
          return;
        }
        input.value = '';
        input.style.height = 'auto';
        input.focus();
        loadMessages(false);
      });
    });
  }

  /* 图片 */
  var imgBtn = $('chatImgBtn');
  var imgInput = $('chatImgInput');

  if (imgBtn && imgInput) {
    imgBtn.addEventListener('click', function () { imgInput.click(); });
    imgInput.addEventListener('change', function () {
      var file = imgInput.files && imgInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        window.siteToast && window.siteToast('请选择图片');
        imgInput.value = '';
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        window.siteToast && window.siteToast('图片请控制在 8MB 以内');
        imgInput.value = '';
        return;
      }
      sendImage(file);
      imgInput.value = '';
    });
  }

  function sendImage(file) {
    sendBtn.disabled = true;
    sendBtn.textContent = '上传中…';

    uploadChatImage(file).then(function (url) {
      return client.from('room_messages').insert({
        room_id: roomId,
        sender_id: me.id,
        content: '[图片]',
        type: 'image',
        image_url: url
      });
    }).then(function (res) {
      sendBtn.disabled = false;
      sendBtn.textContent = '发送';
      if (res.error) {
        window.siteToast && window.siteToast('发送失败');
        return;
      }
      loadMessages(false);
    }).catch(function (err) {
      console.error('[group-chat] 图片失败:', err);
      sendBtn.disabled = false;
      sendBtn.textContent = '发送';
      window.siteToast && window.siteToast('上传失败：' + (err.message || ''));
    });
  }

  /* ============================================================
     菜单
     ============================================================ */
  var menuModal = $('menuModal');
  var membersModal = $('membersModal');
  var inviteModal = $('inviteModal');

  function openModal(m) {
    m.classList.remove('hide');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(m) {
    m.classList.add('hide');
    document.body.style.overflow = '';
  }

  if ($('menuBtn')) {
    $('menuBtn').addEventListener('click', function () { openModal(menuModal); });
  }
  if ($('menuClose')) {
    $('menuClose').addEventListener('click', function () { closeModal(menuModal); });
  }
  if (menuModal) {
    menuModal.addEventListener('click', function (e) {
      if (e.target === menuModal) closeModal(menuModal);
    });
  }

  /* 成员列表 */
  if ($('membersBtn')) {
    $('membersBtn').addEventListener('click', function () {
      openModal(membersModal);
      renderMembersList();
    });
  }
  if ($('membersClose')) {
    $('membersClose').addEventListener('click', function () { closeModal(membersModal); });
  }
  if (membersModal) {
    membersModal.addEventListener('click', function (e) {
      if (e.target === membersModal) closeModal(membersModal);
    });
  }

  function renderMembersList() {
    var list = $('membersList');
    if (!list) return;
    if (!members.length) {
      list.innerHTML = '<div class="friends-empty" style="padding:20px">暂无成员</div>';
      return;
    }
    list.innerHTML = members.map(function (p) {
      var isOwner = room && p.id === room.owner_id;
      var isMe = p.id === me.id;
      var tag = isOwner ? '<span class="member-tag owner">群主</span>' : '';
      var meTag = isMe ? '<span class="member-tag me">我</span>' : '';
      return '' +
        '<div class="member-item">' +
          '<div class="member-avatar">' + avatarHTML(p) + '</div>' +
          '<div class="member-info">' +
            '<div class="member-name">' + esc(p.nickname || '匿名') +
              meTag + tag +
            '</div>' +
            '<div class="member-meta">' + (p.is_guest ? '游客' : '正式用户') + '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  /* 邀请好友 */
  if ($('inviteBtn')) {
    $('inviteBtn').addEventListener('click', function () {
      closeModal(menuModal);
      openModal(inviteModal);
      renderInviteList();
    });
  }
  if ($('inviteClose')) {
    $('inviteClose').addEventListener('click', function () { closeModal(inviteModal); });
  }
  if (inviteModal) {
    inviteModal.addEventListener('click', function (e) {
      if (e.target === inviteModal) closeModal(inviteModal);
    });
  }

  function renderInviteList() {
    var list = $('inviteList');
    if (!list) return;
    list.innerHTML = '<div class="friends-loading">正在加载…</div>';

    /* 1. 拉我的好友 */
    client.from('friendships')
      .select('*')
      .or('requester_id.eq.' + me.id + ',addressee_id.eq.' + me.id)
      .eq('status', 'accepted')
      .then(function (res) {
        var rows = res.data || [];
        var friendIds = rows.map(function (r) {
          return r.requester_id === me.id ? r.addressee_id : r.requester_id;
        });
        if (!friendIds.length) {
          list.innerHTML = '<div class="friends-empty" style="padding:20px">你还没有好友</div>';
          return;
        }

        /* 2. 排除已在群里的 */
        var existing = members.map(function (m) { return m.id; });
        var candidates = friendIds.filter(function (id) {
          return existing.indexOf(id) === -1;
        });
        if (!candidates.length) {
          list.innerHTML = '<div class="friends-empty" style="padding:20px">你的好友都已在群里了</div>';
          return;
        }

        /* 3. 拉好友 profile */
        client.from('profiles').select('*').in('id', candidates)
          .then(function (pres) {
            var list2 = pres.data || [];
            if (!list2.length) {
              list.innerHTML = '<div class="friends-empty" style="padding:20px">没有可邀请的好友</div>';
              return;
            }
            list.innerHTML = list2.map(function (p) {
              return '' +
                '<div class="member-item">' +
                  '<div class="member-avatar">' + avatarHTML(p) + '</div>' +
                  '<div class="member-info">' +
                    '<div class="member-name">' + esc(p.nickname || '匿名') + '</div>' +
                    '<div class="member-meta">' + (p.is_guest ? '游客' : '正式用户') + '</div>' +
                  '</div>' +
                  '<div class="member-actions">' +
                    '<button class="f-btn f-btn-primary" data-invite="' + p.id + '" type="button">邀请</button>' +
                  '</div>' +
                '</div>';
            }).join('');

            list.querySelectorAll('[data-invite]').forEach(function (btn) {
              btn.addEventListener('click', function () { inviteFriend(btn.dataset.invite, btn); });
            });
          });
      });
  }

  function inviteFriend(userId, btn) {
    btn.disabled = true;
    btn.textContent = '邀请中…';
    client.from('room_members').insert({
      room_id: roomId,
      user_id: userId
    }).then(function (res) {
      if (res.error) {
        if (/duplicate|unique/i.test(res.error.message)) {
          window.siteToast && window.siteToast('对方已在群里');
        } else {
          window.siteToast && window.siteToast('邀请失败');
        }
        btn.disabled = false;
        btn.textContent = '邀请';
        return;
      }
      window.siteToast && window.siteToast('已邀请');
      btn.textContent = '已加入';
      btn.disabled = true;
      loadMembers();
    });
  }

  /* 退群 */
  if ($('leaveBtn')) {
    $('leaveBtn').addEventListener('click', function () {
      closeModal(menuModal);
      if (room && room.owner_id === me.id) {
        window.siteToast && window.siteToast('你是群主，请使用"解散群聊"', 3600);
        return;
      }
      if (!confirm('确定退出这个群吗？')) return;
      client.from('room_members').delete()
        .eq('room_id', roomId).eq('user_id', me.id)
        .then(function () {
          window.siteToast && window.siteToast('已退出');
          setTimeout(function () { location.href = 'group.html'; }, 600);
        });
    });
  }

  /* 解散群 */
  if ($('deleteBtn')) {
    $('deleteBtn').addEventListener('click', function () {
      closeModal(menuModal);
      if (!room || room.owner_id !== me.id) return;
      if (!confirm('确定解散这个群？所有消息将被删除，不可恢复。')) return;
      client.from('rooms').delete().eq('id', roomId)
        .then(function (res) {
          if (res.error) {
            window.siteToast && window.siteToast('解散失败');
            return;
          }
          window.siteToast && window.siteToast('已解散');
          setTimeout(function () { location.href = 'group.html'; }, 600);
        });
    });
  }

})();