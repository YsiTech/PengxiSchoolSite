/* ===================================================================
   蓬溪格勒人民高等中学 · 登录页逻辑
   =================================================================== */

(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!window.Auth) {
    console.error('[login] Auth 模块未加载');
    return;
  }

  /* ---------------- 已登录跳走 ---------------- */
  var redirect = '';
  try {
    redirect = new URLSearchParams(location.search).get('redirect') || '';
  } catch (e) {}

  Auth.ready.then(function () {
    if (Auth.isLoggedIn() && !redirect) {
      location.replace('mainsite.html');
    }
  });

  /* ---------------- Tab 切换 ---------------- */
  document.querySelectorAll('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.dataset.tab;

      document.querySelectorAll('.auth-tab').forEach(function (t) {
        t.classList.toggle('on', t === tab);
      });
      document.querySelectorAll('.auth-form').forEach(function (f) {
        f.classList.toggle('on', f.id === (name === 'login' ? 'loginForm' : 'registerForm'));
      });

      var hintId = name === 'login' ? 'loginHint' : 'registerHint';
      var h = document.getElementById(hintId);
      if (h) { h.textContent = ''; h.className = 'auth-hint'; }
    });
  });

  /* ---------------- 密码显隐 ---------------- */
  document.querySelectorAll('.auth-eye').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.for);
      if (!input) return;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '👁' : '🙈';
      btn.classList.toggle('on', !showing);
      input.focus();
    });
  });

  /* ---------------- 工具 ---------------- */
  function setHint(id, msg, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'auth-hint' + (type ? ' ' + type : '');
  }
  function setLoading(btn, on) {
    if (!btn) return;
    if (on) { btn.disabled = true; btn.classList.add('loading'); }
    else    { btn.disabled = false; btn.classList.remove('loading'); }
  }
  function go() {
    if (redirect) location.href = redirect;
    else location.href = 'mainsite.html';
  }

  /* ---------------- 记住我：恢复上次填写的邮箱 ---------------- */
  try {
    var savedEmail = localStorage.getItem('pxgl_last_email');
    var rememberEl = document.getElementById('rememberMe');
    if (savedEmail && rememberEl) {
      document.getElementById('loginEmail').value = savedEmail;
      rememberEl.checked = true;
    }
  } catch (e) {}

  /* ---------------- 登录 ---------------- */
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var email    = document.getElementById('loginEmail').value;
      var password = document.getElementById('loginPassword').value;
      var remember = document.getElementById('rememberMe') && document.getElementById('rememberMe').checked;
      var btn = loginForm.querySelector('.auth-submit');

      setHint('loginHint', '', '');
      setLoading(btn, true);

      Auth.login(email, password).then(function (res) {
        setLoading(btn, false);

        if (!res.ok) {
          setHint('loginHint', res.msg, 'warn');
          return;
        }

        try {
          if (remember) localStorage.setItem('pxgl_last_email', String(email).trim().toLowerCase());
          else          localStorage.removeItem('pxgl_last_email');
        } catch (e) {}

        setHint('loginHint', '登录成功，正在跳转…', 'ok');
        setTimeout(go, 400);
      });
    });
  }

  /* ---------------- 注册 ---------------- */
  var registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var email     = document.getElementById('regEmail').value;
      var nickname  = document.getElementById('regNickname').value;
      var password  = document.getElementById('regPassword').value;
      var password2 = document.getElementById('regPassword2').value;
      var btn = registerForm.querySelector('.auth-submit');

      setHint('registerHint', '', '');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) {
        setHint('registerHint', '请输入正确的邮箱地址', 'warn');
        return;
      }
      if (!password || password.length < 6) {
        setHint('registerHint', '密码至少 6 位', 'warn');
        return;
      }
      if (password !== password2) {
        setHint('registerHint', '两次输入的密码不一致', 'warn');
        return;
      }

      setLoading(btn, true);

      Auth.register(email, password, nickname).then(function (res) {
        setLoading(btn, false);

        if (!res.ok) {
          setHint('registerHint', res.msg, res.needConfirm ? 'ok' : 'warn');
          return;
        }
        setHint('registerHint', '注册成功，正在跳转…', 'ok');
        setTimeout(go, 600);
      });
    });
  }

  /* ---------------- 游客登录 ---------------- */
  var guestBtn = document.getElementById('guestBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', function () {
      setHint('loginHint', '', '');
      setLoading(guestBtn, true);

      Auth.loginAsGuest().then(function (res) {
        setLoading(guestBtn, false);

        if (!res.ok) {
          setHint('loginHint', res.msg, 'warn');
          return;
        }
        setHint('loginHint', '游客登录成功，正在跳转…', 'ok');
        setTimeout(go, 400);
      });
    });
  }

})();