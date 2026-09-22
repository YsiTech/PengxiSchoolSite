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
     1. Supabase 配置 —— 换成你自己的
     ============================================================ */
  var SUPABASE_URL      = 'https://xxxxxxxx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  /* ============================================================
     2. 依赖检查
     ============================================================ */
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[Auth] Supabase SDK 未加载');
    window.Auth = {
      isLoggedIn: function(){ return false; },
      getCurrentUser: function(){ return null; },
      ready: Promise.resolve(null),
      requireAuth: function(){ return Promise.resolve(true); },
      mountNavStatus: function(){}
    };
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ============================================================
     3. 配置
     ============================================================ */
  var PROTECTED = ['videohub.html', 'campusnet.html', 'xingtu.html'];

  /* ============================================================
     4. 会话状态
     ============================================================ */
  var currentUser = null;
  var readyPromise = null;

  function ensureReady() {
    if (readyPromise) return readyPromise;

    readyPromise = client.auth.getSession().then(function (res) {
      currentUser = (res && res.data && res.data.session && res.data.session.user) || null;
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
     5. 工具
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

  /* 从用户对象提取展示信息 */
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

  /* 重置密码页面地址 */
  function resetPasswordUrl() {
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');
    /* 如果当前在 ru/ 下，重置页在 ru/ 下；否则在根 */
    return base + 'reset-password.html';
  }

  /* ============================================================
     6. Auth 模块
     ============================================================ */
  var Auth = {

    client: client,
    ready: ensureReady,

    isLoggedIn: function () { return !!currentUser; },
    getCurrentUser: function () { return buildUser(currentUser); },

    /* ---------------- 登录 ---------------- */
    login: function (email, password) {
      email = normalizeEmail(email);
      if (!isValidEmail(email)) return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址' });
      if (!password)            return Promise.resolve({ ok: false, msg: '请输入密码' });

      return client.auth.signInWithPassword({
        email: email,
        password: password
      }).then(function (res) {
        if (res.error) {
          var e = String(res.error.message || '');
          var msg = '登录失败，请稍后重试';
          if (/invalid login credentials/i.test(e))     msg = '邮箱或密码错误';
          else if (/email not confirmed/i.test(e))      msg = '邮箱尚未验证，请联系管理员';
          else if (/rate limit/i.test(e))               msg = '请求过于频繁，请稍后再试';
          else if (/failed to fetch|network/i.test(e))  msg = '网络连接失败';
          else msg = e;
          return { ok: false, msg: msg };
        }
        currentUser = res.data.user;
        return { ok: true, user: buildUser(currentUser) };
      }).catch(function (err) {
        console.error('[Auth] login', err);
        return { ok: false, msg: '网络错误，请稍后重试' };
      });
    },

    /* ---------------- 注册 ---------------- */
    register: function (email, password, nickname) {
      email = normalizeEmail(email);
      if (!isValidEmail(email))               return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址' });
      if (!password || password.length < 6)   return Promise.resolve({ ok: false, msg: '密码至少 6 位' });

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
      }).then(function (res) {
        if (res.error) {
          var e = String(res.error.message || '注册失败');
          if (/already registered|user already/i.test(e)) e = '该邮箱已被注册';
          else if (/password/i.test(e) && /least/i.test(e)) e = '密码强度不足';
          else if (/invalid/i.test(e) && /email/i.test(e)) e = '邮箱格式无效';
          else if (/rate limit/i.test(e)) e = '请求过于频繁，请稍后再试';
          return { ok: false, msg: e };
        }
        if (!res.data.session) {
          return {
            ok: false,
            needConfirm: true,
            msg: '注册成功。若开启了邮箱验证，请到邮箱完成验证后登录'
          };
        }
        currentUser = res.data.user;
        return { ok: true, user: buildUser(currentUser) };
      }).catch(function (err) {
        console.error('[Auth] register', err);
        return { ok: false, msg: '网络错误，请稍后重试' };
      });
    },

    /* ---------------- 游客登录 ---------------- */
    loginAsGuest: function () {
      var rand = Math.floor(1000 + Math.random() * 9000);
      var nickname = '游客' + rand;

      return client.auth.signInAnonymously({
        options: {
          data: {
            nickname: nickname,
            is_guest: true
          }
        }
      }).then(function (res) {
        if (res.error) {
          var e = String(res.error.message || '');
          var msg = '游客登录失败';
          if (/anonymous.*disabled/i.test(e)) {
            msg = '游客登录未启用，请在 Supabase 后台开启 Anonymous Sign-Ins';
          } else if (/rate limit/i.test(e)) {
            msg = '请求过于频繁，请稍后再试';
          } else {
            msg = e;
          }
          return { ok: false, msg: msg };
        }
        currentUser = res.data.user;
        return { ok: true, user: buildUser(currentUser) };
      }).catch(function (err) {
        console.error('[Auth] guest', err);
        return { ok: false, msg: '网络错误，请稍后重试' };
      });
    },

    /* ============================================================
       找回密码：发送重置邮件
       ============================================================ */
    sendResetEmail: function (email) {
      email = normalizeEmail(email);
      if (!isValidEmail(email)) {
        return Promise.resolve({ ok: false, msg: '请输入正确的邮箱地址' });
      }

      return client.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordUrl()
      }).then(function (res) {
        if (res.error) {
          var e = String(res.error.message || '发送失败');
          if (/rate limit/i.test(e)) e = '请求过于频繁，请稍后再试';
          else if (/failed to fetch|network/i.test(e)) e = '网络连接失败';
          return { ok: false, msg: e };
        }
        /* 出于安全考虑，Supabase 不告诉邮箱是否存在，统一返回成功 */
        return { ok: true };
      }).catch(function (err) {
        console.error('[Auth] sendResetEmail', err);
        return { ok: false, msg: '网络错误，请稍后重试' };
      });
    },

    /* ============================================================
       更新密码：重置页使用
       ============================================================ */
    updatePassword: function (newPassword) {
      if (!newPassword || newPassword.length < 6) {
        return Promise.resolve({ ok: false, msg: '密码至少 6 位' });
      }

      return client.auth.updateUser({ password: newPassword })
        .then(function (res) {
          if (res.error) {
            var e = String(res.error.message || '更新失败');
            if (/rate limit/i.test(e)) e = '请求过于频繁，请稍后再试';
            return { ok: false, msg: e };
          }
          currentUser = res.data.user;
          return { ok: true };
        }).catch(function (err) {
          console.error('[Auth] updatePassword', err);
          return { ok: false, msg: '网络错误，请稍后重试' };
        });
    },

    /* ============================================================
       登出
       ============================================================ */
    logout: function () {
      return client.auth.signOut().then(function () {
        currentUser = null;
        location.href = (isRu() ? '../' : '') + 'index.html';
      }).catch(function () {
        currentUser = null;
        location.href = (isRu() ? '../' : '') + 'index.html';
      });
    },

    /* ============================================================
       页面保护
       ============================================================ */
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

    /* ============================================================
       页头状态
       ============================================================ */
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
     7. 立即执行页面保护
     ============================================================ */
  Auth.requireAuth();

  window.Auth = Auth;
})(window);