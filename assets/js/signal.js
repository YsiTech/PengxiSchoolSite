/* ===================================================================
   星图 · 在线发现（数据库轮询版）
   走 HTTP + Supabase 表，不依赖 WebSocket
   =================================================================== */

(function (window) {
  'use strict';

  var SUPABASE_URL      = 'https://api.ponxigrad.tech';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidG1la3dtcGh2bXluc2pmcGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTM5NjMsImV4cCI6MjEwNTY2OTk2M30.Cq04l3c8hxsIheEf3e6bHKUhFhe-VybfaEbaXwlGQ3M';

  var POLL_INTERVAL = 12000;   // 每 12 秒轮询一次
  var ALIVE_WINDOW  = 40000;   // 40 秒内算在线

  var Signal = {
    enabled: false,
    me: null,
    onMembersChange: null,
    onCall: null,
    _timer: null,
    _client: null,

    init: function (peer, me) {
      if (this.enabled) return;
      this.me = me;

      if (!window.supabase || !window.supabase.createClient) {
        console.warn('[Signal] Supabase SDK 未加载');
        return;
      }

      var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this._client = client;

      var self = this;
      this._tick();
      this._timer = setInterval(function () { self._tick(); }, POLL_INTERVAL);

      window.addEventListener('beforeunload', function () {
        self._cleanup();
      });

      this.enabled = true;
      console.log('[Signal] 在线发现已启动（polling 模式）');
    },

    _tick: function () {
      var self = this;
      var client = this._client;

      // 1. 更新自己的 last_seen
      var upsertPromise = client
        .from('online_users')
        .upsert({
          peer_id:   self.me.peerId,
          nickname:  self.me.nickname,
          last_seen: new Date().toISOString()
        }, { onConflict: 'peer_id' });

      // 2. 查询其他在线用户
      var cutoff = new Date(Date.now() - ALIVE_WINDOW).toISOString();
      var queryPromise = client
        .from('online_users')
        .select('peer_id, nickname, last_seen')
        .gt('last_seen', cutoff)
        .neq('peer_id', self.me.peerId);

      Promise.all([upsertPromise, queryPromise]).then(function (results) {
        var res = results[1];
        if (res.error) {
          console.error('[Signal] 查询失败:', res.error);
          return;
        }
        var members = (res.data || []).map(function (m) {
          return {
            peerId:   m.peer_id,
            nickname: m.nickname,
            joinedAt: new Date(m.last_seen).getTime()
          };
        });
        members.sort(function (a, b) { return a.joinedAt - b.joinedAt; });

        console.log('[Signal] 在线成员数:', members.length);
        if (typeof self.onMembersChange === 'function') {
          self.onMembersChange(members);
        }
      }).catch(function (err) {
        console.error('[Signal] 轮询异常:', err);
      });
    },

    _cleanup: function () {
      if (!this._client || !this.me) return;
      try {
        // 用 sendBeacon 更可靠，但简单起见用普通请求
        var url = SUPABASE_URL + '/rest/v1/online_users?peer_id=eq.' +
                  encodeURIComponent(this.me.peerId);
        if (navigator.sendBeacon) {
          // sendBeacon 不支持自定义头，只能放弃清理，靠超时自动下线
        }
        this._client.from('online_users').delete().eq('peer_id', this.me.peerId);
      } catch (e) {}
    },

    call: function (peerId) {
      if (typeof this.onCall === 'function') this.onCall(peerId);
    },

    destroy: function () {
      if (this._timer) clearInterval(this._timer);
      this._cleanup();
      this.enabled = false;
    }
  };

  window.Signal = Signal;
})(window);