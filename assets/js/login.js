/* ===================================================================
   蓬溪格勒人民高等中学 · 登录页逻辑
   健壮版：Tab 与密码显隐最先绑定，不依赖 Auth 模块
   =================================================================== */

(function () {
  'use strict';

  /* ============================================================
     1. 年份（最无副作用，先跑）
     ============================================================ */
  try {
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  } catch (e) {}

  /* ============================================================
     2. Tab 切换 —— 最先绑定，与 Auth 无关
     ============================================================ */
  try {
    var tabs  = document.querySelectorAll('.auth-tab');
    var forms = document.querySelectorAll('.auth-form');

    console.log('[login] Tab 数量:', tabs.length, '/ 表单数量:', forms.length);

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.dataset.tab;
        console.log('[login] 切换 Tab:', name);

        tabs.forEach(function (t) {
          t.classList.toggle('on', t === tab);
        });

        forms.forEach(function (f) {
          var targetId = (name === 'login') ? 'loginForm' : 'registerForm';
          f.classList.toggle('on', f.id === targetId);
        });

        var hintId = (name === 'login') ? 'loginHint' : 'registerHint';
        var h = document.getElementById(hintId);
        if (h) { h.textContent = ''; h.className = 'auth-hint'; }
      });
    });
  } catch (err) {
    console.error('[login] Tab 绑定出错:', err);
  }

  /* ============================================================
     3. 密码显隐 —— 也放在前面
     ============================================================ */
  try {
    document.querySelectorAll('.auth-eye').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.for);
        if (!input) return;
        var showing = (input.type === 'text');
        input.type = showing ? 'password' : 'text';
        btn.textContent = showing ? '👁' : '🙈';
        btn.classList.toggle('on', !showing);
        input.focus();
      });
    });
  } catch (err) {
    console.error('[login] 密码显隐绑定出错:', err);
  }

  /* ============================================================
     4. 检查 Auth —— 缺失时只警告，不中断前面的 Tab
     ============================================================ */
  if (!window.Auth) {
    console.error('[login] Auth 模块未加载，登录/注册/游客功能不可用');
    return;
  }

  /* ============================================================
     5. 已登录跳走
     ============================================================ */
  var redirect = '';
  try {
    redirect = new URLSearchParams(location.search).get('redirect') || '';
  } catch (e) {}

  try {
    Auth.ready.then(function () {
      if (Auth.isLoggedIn() && !redirect) {
        location.replace('mainsite.html');
      }
    });
  } catch (e) {
    console.error('[login] Auth.ready 出错:', e);
  }

  /* ============================================================
     6. 工具
     ============================================================ */
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

  /* ============================================================
     7. 记住我：恢复上次邮箱
     ============================================================ */
  try {
    var savedEmail = localStorage.getItem('pxgl_last_email');
    var rememberEl = document.getElementById('rememberMe');
    if (savedEmail && rememberEl) {
      var emailInput = document.getElementById('loginEmail');
      if (emailInput) emailInput.value = savedEmail;
      rememberEl.checked = true;
    }
  } catch (e) {}

  /* ============================================================
     8. 登录
     ============================================================ */
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var email    = (document.getElementById('loginEmail') || {}).value || '';
      var password = (document.getElementById('loginPassword') || {}).value || '';
      var rememberEl2 = document.getElementById('rememberMe');
      var remember = rememberEl2 && rememberEl2.checked;
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
      }).catch(function (err) {
        console.error('[login] 登录异常:', err);
        setLoading(btn, false);
        setHint('loginHint', '发生错误，请稍后重试', 'warn');
      });
    });
  }

  /* ============================================================
     9. 注册
     ============================================================ */
  var registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var email     = (document.getElementById('regEmail')     || {}).value || '';
      var nickname  = (document.getElementById('regNickname')  || {}).value || '';
      var password  = (document.getElementById('regPassword')  || {}).value || '';
      var password2 = (document.getElementById('regPassword2') || {}).value || '';
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
          /* 需要邮箱确认：保存邮箱和密码，跳验证页 */
          if (res.needConfirm) {
            try {
              sessionStorage.setItem('pxgl_pending_email', String(email).trim().toLowerCase());
              sessionStorage.setItem('pxgl_pending_password', password);
            } catch (e) {}
            setHint('registerHint', '注册成功，正在跳转邮箱验证…', 'ok');
            setTimeout(function () {
              location.href = 'verify-email.html';
            }, 800);
            return;
          }
          setHint('registerHint', res.msg, 'warn');
          return;
        }
        setHint('registerHint', '注册成功，正在跳转…', 'ok');
        setTimeout(go, 600);
      }).catch(function (err) {
        console.error('[login] 注册异常:', err);
        setLoading(btn, false);
        setHint('registerHint', '发生错误，请稍后重试', 'warn');
      });
    });
  }

  /* ============================================================
     10. 游客登录
     ============================================================ */
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
      }).catch(function (err) {
        console.error('[login] 游客异常:', err);
        setLoading(guestBtn, false);
        setHint('loginHint', '发生错误，请稍后重试', 'warn');
      });
    });
  }

})();