/* ===================================================================
   蓬溪格勒人民高等中学 · 登录认证模块
   基于 Supabase Auth
   · 邮箱注册 / 登录 / 找回密码
   · 游客匿名登录
   · 会话持久化，跨设备可用
   =================================================================== */

(function (window) {
  'use strict';

  /* ============================================================
     1. Supabase 配置 —— 已填好你的项目
     ============================================================ */
  var SUPABASE_URL      = 'https://abtmekwmphvmynsjfplc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidG1la3dtcGh2bXluc2pmcGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTM5NjMsImV4cCI6MjEwNTY2OTk2M30.Cq04l3c8hxsIheEf3e6bHKUhFhe-VybfaEbaXwlGQ3M';

  /* ============================================================
     2. 配置规范化
     ============================================================ */
  function normalizeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    u = u.replace(/\/+$/, '');
    return u;
  }
  function normalizeKey(k) {
    return String(k || '').trim().replace(/\s+/g, '');
  }

  var NORM_URL = normalizeUrl(SUPABASE_URL);
  var NORM_KEY = normalizeKey(SUPABASE_ANON_KEY);

  /* ============================================================
     3. 启动自检
     ============================================================ */
  (function selfCheck() {
    var styleTitle = 'background:#c8102e;color:#f0d98a;padding:3px 8px;border-radius:3px;font-weight:700';
    console.log('%c [Auth] 配置自检 ', styleTitle);
    console.log('[Auth] URL:', NORM_URL);
    console.log('[Auth] KEY:', NORM_KEY ? (NORM_KEY.slice(0, 30) + '...' + NORM_KEY.slice(-10)) : '(空)');
    console.log('[Auth] KEY 长度:', NORM_KEY.length);

    var problems = [];
    if (!NORM_URL) {
      problems.push('SUPABASE_URL 为空');
    } else if (NORM_URL.indexOf('xxxxxxxx') !== -1) {
      problems.push('SUPABASE_URL 还是模板占位符');
    }
    if (!NORM_KEY) {
      problems.push('SUPABASE_ANON_KEY 为空');
    } else if (NORM_KEY.indexOf('sb_publishable_') !== 0 && NORM_KEY.length < 100) {
      problems.push('SUPABASE_ANON_KEY 长度异常（' + NORM_KEY.length + '）');
    }

    if (problems.length) {
      console.error('[Auth] 配置有问题:');
      problems.forEach(function (p) { console.error('  · ' + p); });
    } else {
      console.log('%c [Auth] 配置看起来正常 ', 'color:#1f8f55;font-weight:700');
    }
  })();

  /* ============================================================
     4. 依赖检查
     ============================================================ */
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[Auth] Supabase SDK 未加载，请检查 <script> 引入顺序');
    window.Auth = {
      isLoggedIn: function(){ return false; },
      getCurrentUser: function(){ return null; },
      ready: Promise.resolve(null),
      requireAuth: function(){ return Promise.resolve(true); },
      mountNavStatus: function(){},
      login: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      register: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      loginAsGuest: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      logout: function(){ location.href = 'index.html'; },
      sendResetEmail: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      updatePassword: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); }
    };
    return;
  }

  var client = window.supabase.createClient(NORM_URL, NORM_KEY);

  /* ============================================================
     5. 常量
     ============================================================ */
  var PROTECTED = ['videohub.html', 'campusnet.html', 'xingtu.html'];

  /* ============================================================
     6. 会话状态
     ============================================================ */
  var currentUser = null;
  var readyPromise = null;

  function ensureReady() {
    if (readyPromise) return readyPromise;

    readyPromise = client.auth.getSession().then(function (res) {
      currentUser = (res && res.data && res.data.session && res.data.session.user) || null;
      console.log('[Auth] 会话就绪:', currentUser ? currentUser.id : '(未登录)');
      return currentUser;
    }).catch(function (err) {
      console.error('[Auth] getSession 失败:', err);
      currentUser = null;
      return null;
    });

    client.auth.onAuthStateChange(function (event, session) {
      currentUser = session ? session.user : null;
      console.log('[Auth] 会话变化:', event, currentUser ? currentUser.id : '(无)');
    });

    return readyPromise;
  }

  /* ============================================================
     7. 工具
     ============================================================ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function isRu() {
    return /\/ru\//.test(location.pathname || '');
  }
  function getProtectedFile() {
    var path = location.pathname || '';
    for (var i = 0; i < PROTECTED.length; i++) {
      var name = PROTECTED[i];
      if (path === '/' + name) return name;
      if (path.slice(-(name.length + 1)) === '/' + name) return name;
    }
    return null;
  }
  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
  }
  function normalizeEmail(s) {
    return String(s || '').trim().toLowerCase();
  }

  /* ============================================================
     8. 错误翻译
     ============================================================ */
  function translateError(err, context) {
    var msg  = String((err && (err.message || err.error_description || err.error)) || '').trim();
    var lower = msg.toLowerCase();

    if (/failed to fetch|networkerror|network error|load failed/i.test(lower)) {
      return { ok:false, msg:'无法连接到服务器，请检查网络', code:'NETWORK' };
    }
    if (/err_name_not_resolved|dns/i.test(lower)) {
      return { ok:false, msg:'无法解析服务器地址', code:'DNS' };
    }
    if (/cors/i.test(lower)) {
      return { ok:false, msg:'跨域请求被拒，URL 可能填错', code:'CORS' };
    }
    if (/timeout|timed out|etimedout/i.test(lower)) {
      return { ok:false, msg:'请求超时，请稍后再试', code:'TIMEOUT' };
    }

    if (/invalid login credentials/i.test(msg))     return { ok:false, msg:'邮箱或密码错误', code:'AUTH' };
    if (/email not confirmed/i.test(msg))           return { ok:false, msg:'邮箱尚未验证，请联系管理员', code:'EMAIL_CONFIRM' };
    if (/user already registered|already registered|user already exists/i.test(msg))
      return { ok:false, msg:'该邮箱已被注册', code:'EXISTS' };
    if (/signups not allowed|signup.*disabled/i.test(msg))
      return { ok:false, msg:'后台已关闭新用户注册，请联系管理员', code:'SIGNUP_DISABLED' };
    if (/anonymous.*disabled|anonymous.*not.*enabled/i.test(msg))
      return { ok:false, msg:'后台未开启游客登录，请联系管理员', code:'ANON_DISABLED' };
    if (/invalid api key|no api key/i.test(msg))
      return { ok:false, msg:'API 密钥错误', code:'API_KEY' };
    if (/jwt|token/i.test(msg) && /expired/i.test(msg))
      return { ok:false, msg:'登录已过期，请重新登录', code:'EXPIRED' };
    if (/password.*least|password.*short|weak password/i.test(msg))
      return { ok:false, msg:'密码强度不足，至少 6 位', code:'WEAK_PWD' };
    if (/invalid.*email|email.*invalid/i.test(msg))
      return { ok:false, msg:'邮箱格式无效', code:'EMAIL_FORMAT' };
    if (/rate limit|too many requests|too many/i.test(msg))
      return { ok:false, msg:'请求过于频繁，请稍后再试', code:'RATE_LIMIT' };

    return { ok:false, msg: msg || '操作失败，请稍后重试', code:'UNKNOWN' };
  }

  function handleResult(res, context) {
    if (res && res.error) {
      var t = translateError(res.error, context);
      console.warn('[Auth] ' + context + ' 失败:', t.code, '-', t.msg, '原始:', res.error.message);
      return t;
    }
    return { ok: true, data: res ? res.data : null };
  }
  function handleCatch(err, context) {
    var t = translateError(err, context);
    console.error('[Auth] ' + context + ' 异常:', t.code, '-', t.msg, err);
    return t;
  }

  /* ============================================================
     9. 构造展示用 user
     ============================================================ */
  function buildUser(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    var isGuest = user.is_anonymous === true || meta.is_guest === true;

    var nickname = (meta.nickname && String(meta.nickname).trim()) || '';
    if (!nickname) {
      if (isGuest) nickname = '游客' + String(user.id || '').slice(0, 4);
      else if (user.email) nickname = user.email.split('@')[0];
      else nickname = '用户';
    }

    return {
      id: user.id,
      email: user.email || '',
      nickname: nickname,
      isGuest: isGuest,
      createdAt: user.created_at,
      loginAt: user.last_sign_in_at
    };
  }

  function resetPasswordUrl() {
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + 'reset-password.html';
  }

  /* ============================================================
     10. Auth 模块
     ============================================================ */
  var Auth = {

    client: client,
    ready: ensureReady,

    isLoggedIn: function () { return !!currentUser; },
    getCurrentUser: function () { return buildUser(currentUser); },

    /* ---------------- 登录 ---------------- */
    login: function (email, password) {
      email = normalizeEmail(email);
      if (!isValidEmail(email)) return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址', code: 'INPUT' });
      if (!password)            return Promise.resolve({ ok: false, msg: '请输入密码', code: 'INPUT' });

      return client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          var r = handleResult(res, '登录');
          if (!r.ok) return r;
          currentUser = r.data.user;
          return { ok: true, user: buildUser(currentUser) };
        })
        .catch(function (err) { return handleCatch(err, '登录'); });
    },

    /* ---------------- 注册 ---------------- */
    register: function (email, password, nickname) {
      email = normalizeEmail(email);
      if (!isValidEmail(email))               return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址', code: 'INPUT' });
      if (!password || password.length < 6)   return Promise.resolve({ ok: false, msg: '密码至少 6 位', code: 'INPUT' });

      nickname = String(nickname || '').trim().slice(0, 16);

      return client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nickname: nickname || email.split('@')[0],
            is_guest: false
          }
        }
      })
        .then(function (res) {
          var r = handleResult(res, '注册');
          if (!r.ok) return r;

          if (!r.data.session) {
            return {
              ok: false,
              needConfirm: true,
              code: 'NEED_CONFIRM',
              msg: '注册成功，但需要在邮箱里点击验证链接后才能登录'
            };
          }
          currentUser = r.data.user;
          return { ok: true, user: buildUser(currentUser) };
        })
        .catch(function (err) { return handleCatch(err, '注册'); });
    },

    /* ---------------- 游客登录 ---------------- */
    loginAsGuest: function () {
      var rand = Math.floor(1000 + Math.random() * 9000);
      var nickname = '游客' + rand;

      return client.auth.signInAnonymously({
        options: {
          data: { nickname: nickname, is_guest: true }
        }
      })
        .then(function (res) {
          var r = handleResult(res, '游客登录');
          if (!r.ok) return r;
          currentUser = r.data.user;
          return { ok: true, user: buildUser(currentUser) };
        })
        .catch(function (err) { return handleCatch(err, '游客登录'); });
    },

    /* ---------------- 找回密码 ---------------- */
    sendResetEmail: function (email) {
      email = normalizeEmail(email);
      if (!isValidEmail(email)) {
        return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址', code: 'INPUT' });
      }

      return client.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordUrl()
      })
        .then(function (res) {
          var r = handleResult(res, '发送重置邮件');
          if (!r.ok) return r;
          return { ok: true };
        })
        .catch(function (err) { return handleCatch(err, '发送重置邮件'); });
    },

    /* ---------------- 更新密码 ---------------- */
    updatePassword: function (newPassword) {
      if (!newPassword || newPassword.length < 6) {
        return Promise.resolve({ ok: false, msg: '密码至少 6 位', code: 'INPUT' });
      }

      return client.auth.updateUser({ password: newPassword })
        .then(function (res) {
          var r = handleResult(res, '更新密码');
          if (!r.ok) return r;
          currentUser = r.data.user;
          return { ok: true };
        })
        .catch(function (err) { return handleCatch(err, '更新密码'); });
    },

    /* ---------------- 登出 ---------------- */
    logout: function () {
      return client.auth.signOut().then(function () {
        currentUser = null;
        location.href = (isRu() ? '../' : '') + 'index.html';
      }).catch(function () {
        currentUser = null;
        location.href = (isRu() ? '../' : '') + 'index.html';
      });
    },

    /* ---------------- 页面保护 ---------------- */
    requireAuth: function () {
      var file = getProtectedFile();
      if (!file) return Promise.resolve(true);

      return ensureReady().then(function (user) {
        if (user) return true;

        var redirect = isRu() ? ('ru/' + file) : file;
        var loginUrl = (isRu() ? '../' : '') +
                       'index.html?redirect=' + encodeURIComponent(redirect);
        console.warn('[Auth] 未登录，跳转:', loginUrl);
        location.replace(loginUrl);
        return false;
      });
    },

    /* ---------------- 页头状态 ---------------- */
    mountNavStatus: function (lang) {
      var el = document.querySelector('.auth-nav');
      if (!el) return;

      ensureReady().then(function () {
        if (!currentUser) {
          el.innerHTML =
            '<a href="' + (isRu() ? '../index.html' : 'index.html') + '" class="auth-login">' +
              (lang === 'ru' ? 'Войти' : '登录') +
            '</a>';
          return;
        }

        var u = buildUser(currentUser);
        var tag = u.isGuest ? '<span class="auth-tag">游客</span>' : '';

        el.innerHTML =
          '<span class="auth-user" title="' + escapeHtml(u.email || '') + '">' +
            '<span class="auth-dot"></span>' +
            escapeHtml(u.nickname) +
            tag +
          '</span>' +
          '<a href="#" class="auth-logout">' +
            (lang === 'ru' ? 'Выйти' : '登出') +
          '</a>';

        var lo = el.querySelector('.auth-logout');
        if (lo) {
          lo.addEventListener('click', function (e) {
            e.preventDefault();
            Auth.logout();
          });
        }
      });
    }
  };

  /* ============================================================
     11. 立即执行页面保护
     ============================================================ */
  Auth.requireAuth();

  window.Auth = Auth;
})(window);