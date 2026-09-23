/* ===================================================================
   蓬溪格勒人民高等中学 · 登录认证模块
   基于 Supabase Auth（Cloudflare Worker 代理）
   =================================================================== */

(function (window) {
  'use strict';

  /* ============================================================
     1. Supabase 配置
     ============================================================ */
  var SUPABASE_URL      = 'https://api.ponxigrad.tech';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidG1la3dtcGh2bXluc2pmcGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTM5NjMsImV4cCI6MjEwNTY2OTk2M30.Cq04l3c8hxsIheEf3e6bHKUhFhe-VybfaEbaXwlGQ3M';

  /* ============================================================
     2. 配置规范化
     ============================================================ */
  function normalizeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u.replace(/\/+$/, '');
  }
  function normalizeKey(k) {
    return String(k || '').trim().replace(/\s+/g, '');
  }
  var NORM_URL = normalizeUrl(SUPABASE_URL);
  var NORM_KEY = normalizeKey(SUPABASE_ANON_KEY);

  /* ============================================================
     3. 工具
     ============================================================ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function isRu() { return /\/ru\//.test(location.pathname || ''); }
  function isValidEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }
  function normalizeEmail(s) { return String(s || '').trim().toLowerCase(); }
  function avatarFallback(nickname) {
    var c = String(nickname || '?').slice(0, 1).toUpperCase();
    var h = 0;
    for (var i = 0; i < (nickname || '').length; i++) h = (h * 31 + nickname.charCodeAt(i)) & 0xffff;
    var colors = ['#c8102e','#1a2b4c','#1f8f55','#8a6d12','#7a3b8f','#c85a17','#2b6a8b','#8b2b4a'];
    return { initial: c, color: colors[h % colors.length] };
  }

  /* ============================================================
     4. 页面权限
     ============================================================ */
  var LOGIN_REQUIRED = [
    'videohub.html', 'campusnet.html', 'xingtu.html', 'profile.html',
    'blog.html', 'blog-post.html', 'blog-post-2.html', 'blog-post-3.html'
  ];
  var GUEST_BLOCKED  = ['videohub.html', 'campusnet.html', 'xingtu.html'];

  function getCurrentFileName() {
    var path = location.pathname || '';
    return path.split('/').pop().split('?')[0] || '';
  }
  function isProtectedForLogin(f) { return LOGIN_REQUIRED.indexOf(f) !== -1; }
  function isBlockedForGuest(f)   { return GUEST_BLOCKED.indexOf(f) !== -1; }

  /* ============================================================
     5. 依赖检查
     ============================================================ */
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[Auth] Supabase SDK 未加载');
    window.Auth = {
      isLoggedIn: function(){ return false; },
      getCurrentUser: function(){ return null; },
      isGuest: function(){ return false; },
      ready: Promise.resolve(null),
      requireAuth: function(){ return Promise.resolve(true); },
      mountNavStatus: function(){},
      login: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      register: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      loginAsGuest: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      logout: function(){ location.href = 'index.html'; },
      sendResetEmail: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      updatePassword: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      updateProfile: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      changePassword: function(){ return Promise.resolve({ ok:false, msg:'SDK 未加载' }); },
      avatarFallback: avatarFallback
    };
    return;
  }

  var client = window.supabase.createClient(NORM_URL, NORM_KEY);

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
      console.log('[Auth] 会话变化:', event);
    });
    return readyPromise;
  }

  /* ============================================================
     7. 错误翻译
     ============================================================ */
  function translateError(err, context) {
    var msg  = String((err && (err.message || err.error_description || err.error)) || '').trim();
    var lower = msg.toLowerCase();

    if (/failed to fetch|networkerror|network error|load failed/i.test(lower))
      return { ok:false, msg:'无法连接到服务器，请检查网络', code:'NETWORK' };
    if (/err_name_not_resolved|dns/i.test(lower))
      return { ok:false, msg:'无法解析服务器地址', code:'DNS' };
    if (/cors/i.test(lower))
      return { ok:false, msg:'跨域请求被拒', code:'CORS' };
    if (/timeout|timed out|etimedout/i.test(lower))
      return { ok:false, msg:'请求超时，请稍后再试', code:'TIMEOUT' };

    if (/invalid login credentials/i.test(msg))     return { ok:false, msg:'邮箱或密码错误', code:'AUTH' };
    if (/email not confirmed/i.test(msg))           return { ok:false, msg:'邮箱尚未验证', code:'EMAIL_CONFIRM' };
    if (/user already registered|already registered|user already exists/i.test(msg))
      return { ok:false, msg:'该邮箱已被注册', code:'EXISTS' };
    if (/signups not allowed|signup.*disabled/i.test(msg))
      return { ok:false, msg:'后台已关闭新用户注册', code:'SIGNUP_DISABLED' };
    if (/anonymous.*disabled|anonymous.*not.*enabled/i.test(msg))
      return { ok:false, msg:'后台未开启游客登录', code:'ANON_DISABLED' };
    if (/invalid api key|no api key/i.test(msg))
      return { ok:false, msg:'API 密钥错误', code:'API_KEY' };
    if (/password.*least|password.*short|weak password/i.test(msg))
      return { ok:false, msg:'密码强度不足，至少 6 位', code:'WEAK_PWD' };
    if (/rate limit|too many requests|too many/i.test(msg))
      return { ok:false, msg:'请求过于频繁，请稍后再试', code:'RATE_LIMIT' };
    if (/same.*password|new password should be different/i.test(msg))
      return { ok:false, msg:'新密码不能与旧密码相同', code:'SAME_PWD' };

    return { ok:false, msg: msg || '操作失败，请稍后重试', code:'UNKNOWN' };
  }

  function handleResult(res, context) {
    if (res && res.error) {
      var t = translateError(res.error, context);
      console.warn('[Auth] ' + context + ' 失败:', t.code, '-', t.msg);
      return t;
    }
    return { ok: true, data: res ? res.data : null };
  }
  function handleCatch(err, context) {
    var t = translateError(err, context);
    console.error('[Auth] ' + context + ' 异常:', t.code, '-', t.msg);
    return t;
  }

  /* ============================================================
     8. 游客判断
     ============================================================ */
  function checkIsGuest(user) {
    if (!user) return false;
    var meta = user.user_metadata || {};
    return user.is_anonymous === true ||
           meta.is_guest === true ||
           meta.is_guest === 'true' ||
           meta.is_guest === 1;
  }

  /* ============================================================
     9. 构造展示用 user
     ============================================================ */
  function buildUser(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    var isGuest = checkIsGuest(user);

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
      avatar: (meta.avatar && String(meta.avatar)) || '',
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
    avatarFallback: avatarFallback,

    isLoggedIn: function () { return !!currentUser; },
    getCurrentUser: function () { return buildUser(currentUser); },
    isGuest: function () { return checkIsGuest(currentUser); },

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
            return { ok: false, needConfirm: true, code: 'NEED_CONFIRM',
                     msg: '注册成功，但需要在邮箱里点击验证链接后才能登录' };
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

      return client.auth.signInAnonymously()
        .then(function (res) {
          if (res.error) return handleResult(res, '游客登录');
          return client.auth.updateUser({
            data: { nickname: nickname, is_guest: true }
          }).then(function (upRes) {
            if (upRes.error) {
              currentUser = res.data.user;
              return { ok: true, user: buildUser(currentUser) };
            }
            currentUser = upRes.data.user;
            return { ok: true, user: buildUser(currentUser) };
          });
        })
        .catch(function (err) { return handleCatch(err, '游客登录'); });
    },

    /* ---------------- 找回密码 ---------------- */
    sendResetEmail: function (email) {
      email = normalizeEmail(email);
      if (!isValidEmail(email)) return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址', code: 'INPUT' });
      return client.auth.resetPasswordForEmail(email, { redirectTo: resetPasswordUrl() })
        .then(function (res) {
          var r = handleResult(res, '发送重置邮件');
          if (!r.ok) return r;
          return { ok: true };
        })
        .catch(function (err) { return handleCatch(err, '发送重置邮件'); });
    },

    /* ---------------- 更新密码（重置页用） ---------------- */
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

    /* ---------------- 更新个人资料 ---------------- */
    updateProfile: function (profile) {
      if (!currentUser) return Promise.resolve({ ok: false, msg: '未登录', code: 'NO_SESSION' });

      var meta = currentUser.user_metadata || {};
      var newMeta = {
        nickname: meta.nickname,
        is_guest: meta.is_guest || false,
        avatar: meta.avatar || ''
      };

      if (typeof profile.nickname === 'string') {
        var nn = profile.nickname.trim().slice(0, 16);
        if (!nn) return Promise.resolve({ ok: false, msg: '昵称不能为空', code: 'INPUT' });
        newMeta.nickname = nn;
      }
      if (typeof profile.avatar === 'string') {
        if (profile.avatar.length > 100 * 1024) {
          return Promise.resolve({ ok: false, msg: '头像文件过大（请换一张更小的图片）', code: 'AVATAR_TOO_BIG' });
        }
        newMeta.avatar = profile.avatar;
      }

      return client.auth.updateUser({ data: newMeta })
        .then(function (res) {
          var r = handleResult(res, '更新资料');
          if (!r.ok) return r;
          currentUser = r.data.user;
          return { ok: true, user: buildUser(currentUser) };
        })
        .catch(function (err) { return handleCatch(err, '更新资料'); });
    },

    /* ---------------- 修改密码 ---------------- */
    changePassword: function (newPassword, confirmPassword) {
      if (!currentUser) return Promise.resolve({ ok: false, msg: '未登录', code: 'NO_SESSION' });
      if (!newPassword || newPassword.length < 6) {
        return Promise.resolve({ ok: false, msg: '新密码至少 6 位', code: 'INPUT' });
      }
      if (newPassword !== confirmPassword) {
        return Promise.resolve({ ok: false, msg: '两次输入的密码不一致', code: 'INPUT' });
      }
      return client.auth.updateUser({ password: newPassword })
        .then(function (res) {
          var r = handleResult(res, '修改密码');
          if (!r.ok) return r;
          currentUser = r.data.user;
          return { ok: true };
        })
        .catch(function (err) { return handleCatch(err, '修改密码'); });
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
      var file = getCurrentFileName();
      if (!isProtectedForLogin(file)) return Promise.resolve(true);

      return ensureReady().then(function () {
        if (!currentUser) {
          var redirect = isRu() ? ('ru/' + file) : file;
          var loginUrl = (isRu() ? '../' : '') +
                         'index.html?redirect=' + encodeURIComponent(redirect);
          console.warn('[Auth] 未登录，跳转:', loginUrl);
          location.replace(loginUrl);
          return false;
        }

        if (checkIsGuest(currentUser) && isBlockedForGuest(file)) {
          console.warn('[Auth] 游客访问受限页面:', file);
          try { sessionStorage.setItem('pxgl_guest_blocked', file); } catch (e) {}
          var profileUrl = (isRu() ? '../' : '') + 'profile.html';
          location.replace(profileUrl);
          return false;
        }

        return true;
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

        var avatarHTML;
        if (u.avatar) {
          avatarHTML = '<img class="auth-avatar" src="' + escapeHtml(u.avatar) + '" alt="">';
        } else {
          var fb = avatarFallback(u.nickname);
          avatarHTML = '<span class="auth-avatar fallback" style="background:' + fb.color + '">' +
                       escapeHtml(fb.initial) + '</span>';
        }

        var profileHref = isRu() ? '../profile.html' : 'profile.html';

        el.innerHTML =
          '<a class="auth-user" href="' + profileHref + '" title="进入个人中心">' +
            avatarHTML +
            '<span class="auth-name">' + escapeHtml(u.nickname) + '</span>' +
            tag +
          '</a>' +
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

  Auth.ready = ensureReady();
  Auth.requireAuth();
  window.Auth = Auth;

  console.log('%c [Auth] 已接入 Cloudflare Worker 代理 ', 'background:#f38020;color:#fff;padding:2px 8px;border-radius:3px;font-weight:700');
})(window);