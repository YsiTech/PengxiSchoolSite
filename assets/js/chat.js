/* ===================================================================
   好友聊天 · 离线版（消息存数据库，上线即收）
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
    return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
  }

  var me = null;
  var peerId = null;
  var peerProfile = null;
  var lastRenderedId = 0;
  var allMessages = [];

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
    peerId = params.get('with');
    if (!peerId) {
      $('chatMessages').innerHTML = '<div class="chat-error">未指定聊天对象，<a href="friends.html">返回好友列表</a></div>';
      return;
    }

    loadPeer();
    loadMessages(true);

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) loadMessages(false);
    }, POLL_INTERVAL);
  });

  window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
  });

  /* ============================================================
     加载对方信息
     ============================================================ */
  function loadPeer() {
    client.from('profiles').select('*').eq('id', peerId).maybeSingle()
      .then(function (res) {
        if (!res.data) return;
        peerProfile = res.data;

        var name = peerProfile.nickname || '匿名';
        document.title = '与 ' + name + ' 聊天 · 蓬溪格勒人民高等中学';
        $('chatTitle').textContent = '与 ' + name + ' 聊天';

        var head = $('chatHead');
        var peer = $('chatPeer');
        var c = '#' + ['c8102e','1a2b4c','1f8f55','8a6d12','7a3b8f','c85a17','2b6a8b','8b2b4a'][name.charCodeAt(0) % 8];

        var ava = peerProfile.avatar
          ? '<img src="' + esc(peerProfile.avatar) + '" alt="">'
          : '<span style="background:' + c + '">' + esc(name.slice(0, 1).toUpperCase()) + '</span>';

        peer.querySelector('.chat-peer-avatar').innerHTML = ava;
        peer.querySelector('.chat-peer-info b').textContent = name;
        peer.querySelector('.chat-peer-info span').textContent =
          peerProfile.is_guest ? '游客' : '正式用户';
      });
  }

  /* ============================================================
     加载消息
     ============================================================ */
  function loadMessages(first) {
    /* 查询双方的所有消息（按时间升序） */
    client.from('messages')
      .select('*')
      .or(
        'and(sender_id.eq.' + me.id + ',receiver_id.eq.' + peerId + '),' +
        'and(sender_id.eq.' + peerId + ',receiver_id.eq.' + me.id + ')'
      )
      .order('created_at', { ascending: true })
      .limit(200)
      .then(function (res) {
        if (res.error) {
          console.error('[chat] 加载失败:', res.error);
          if (first) $('chatMessages').innerHTML = '<div class="chat-error">加载失败</div>';
          return;
        }
        allMessages = res.data || [];
        renderMessages(first);
        markAsRead();
      });
  }

  function renderMessages(forceScroll) {
    var box = $('chatMessages');
    if (!box) return;

    if (!allMessages.length) {
      box.innerHTML = '<div class="chat-empty">还没有消息。打个招呼吧 👋</div>';
      return;
    }

    /* 检查是否有新消息（用于自动滚动） */
    var latestId = allMessages[allMessages.length - 1].id;
    var isNew = latestId !== lastRenderedId;
    lastRenderedId = latestId;

    box.innerHTML = allMessages.map(function (m, i) {
      var isSelf = m.sender_id === me.id;
      var prev = i > 0 ? allMessages[i - 1] : null;
      var showTime = !prev ||
        (new Date(m.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;

      var timeHtml = showTime ? '<div class="chat-time">' + esc(fmtTime(m.created_at)) + '</div>' : '';

      return timeHtml +
        '<div class="chat-msg ' + (isSelf ? 'self' : 'other') + '">' +
          '<div class="chat-bubble">' + esc(m.content).replace(/\n/g, '<br>') + '</div>' +
        '</div>';
    }).join('');

    if (forceScroll || isNew) {
      setTimeout(function () {
        box.scrollTop = box.scrollHeight;
      }, 40);
    }
  }

  /* ============================================================
     标记已读
     ============================================================ */
  function markAsRead() {
    client.from('messages')
      .update({ is_read: true })
      .eq('receiver_id', me.id)
      .eq('sender_id', peerId)
      .eq('is_read', false)
      .then(function () { /* 静默 */ });
  }

  /* ============================================================
     发送
     ============================================================ */
  var form = $('chatForm');
  var input = $('chatInput');
  var sendBtn = $('chatSendBtn');

  if (input) {
    input.addEventListener('input', function () {
      /* 自适应高度 */
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

      client.from('messages').insert({
        sender_id: me.id,
        receiver_id: peerId,
        content: text
      }).then(function (res) {
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';

        if (res.error) {
          console.error('[chat] 发送失败:', res.error);
          window.siteToast && window.siteToast('发送失败：' + res.error.message);
          return;
        }

        input.value = '';
        input.style.height = 'auto';
        input.focus();
        /* 立即拉一次 */
        loadMessages(false);
      });
    });
  }

})();