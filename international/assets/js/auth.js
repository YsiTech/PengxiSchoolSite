/* ===================================================================
   IECP · 登录 / 注册逻辑
   =================================================================== */

(function (w) {
  'use strict';
  var I = w.IECP;
  if (!I) return;

  /* ============================================================
     登录页
     ============================================================ */
  w.IECP.initLogin = function () {
    var form = I.$('#loginForm');
    if (!form) return;

    /* 已登录直接跳 */
    I.client.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        var redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
        location.replace(redirect);
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = I.$('#loginEmail').value.trim();
      var pass  = I.$('#loginPassword').value;
      var btn   = form.querySelector('.btn-submit');
      var hint  = I.$('#loginHint');

      if (!email || !pass) { hint.className='auth-hint warn'; hint.textContent='请填写邮箱和密码'; return; }

      btn.disabled = true;
      hint.className = 'auth-hint';
      hint.textContent = '登录中…';

      I.client.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
        btn.disabled = false;
        if (res.error) {
          var msg = res.error.message || '登录失败';
          if (/invalid/i.test(msg)) msg = '邮箱或密码错误';
          hint.className = 'auth-hint warn';
          hint.textContent = msg;
          return;
        }
        var redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
        location.replace(redirect);
      }).catch(function (err) {
        btn.disabled = false;
        hint.className = 'auth-hint warn';
        hint.textContent = '网络错误：' + err.message;
      });
    });
  };

  /* ============================================================
     注册页
     ============================================================ */
  w.IECP.initRegister = function () {
    var form = I.$('#registerForm');
    if (!form) return;

    /* 文件预览 */
    var flagFile = null, emblemFile = null;

    I.$$('.upload-box').forEach(function (box) {
      var input = box.querySelector('input[type=file]');
      if (!input) return;
      box.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) return;
        if (!/^image\//.test(f.type)) { I.toast('请选择图片文件', 'error'); return; }
        if (f.size > 2 * 1024 * 1024) { I.toast('图片请控制在 2MB 以内', 'error'); return; }

        var reader = new FileReader();
        reader.onload = function (e) {
          box.innerHTML = '';
          var img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'preview';
          box.appendChild(img);
          /* 重新挂 input */
          box.appendChild(input);
          if (input.id === 'flagFile') flagFile = f;
          if (input.id === 'emblemFile') emblemFile = f;
        };
        reader.readAsDataURL(f);
      });
    });

    /* 找回 */
    I.$('#goLogin') && I.$('#goLogin').addEventListener('click', function () {
      location.href = 'login.html';
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hint = I.$('#registerHint');
      var btn  = form.querySelector('.btn-submit');

      var username = I.$('#regUsername').value.trim();
      var email    = I.$('#regEmail').value.trim();
      var pass     = I.$('#regPassword').value;
      var pass2    = I.$('#regPassword2').value;
      var social   = I.$('#regSocial').value.trim();
      var capital  = I.$('#regCapital').value.trim();
      var lang     = I.$('#regLanguage').value.trim();

      function fail(msg) { hint.className = 'auth-hint warn'; hint.textContent = msg; btn.disabled = false; }

      if (!username || username.length < 2) return fail('国家名至少 2 个字');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('请输入正确的邮箱');
      if (!pass || pass.length < 6) return fail('密码至少 6 位');
      if (pass !== pass2) return fail('两次输入的密码不一致');
      if (!social) return fail('请填写社会性质');
      if (!capital) return fail('请填写首都');
      if (!lang) return fail('请填写官方语言');
      if (!flagFile) return fail('请上传国旗');
      if (!emblemFile) return fail('请上传国徽');

      btn.disabled = true;
      hint.className = 'auth-hint';
      hint.textContent = '正在创建账号…';

      /* 1. 注册账号 */
      I.client.auth.signUp({ email: email, password: pass }).then(function (res) {
        if (res.error) {
          var msg = res.error.message || '注册失败';
          if (/already/i.test(msg)) msg = '该邮箱已被注册';
          return fail(msg);
        }
        if (!res.data.user) return fail('注册未成功，请稍后重试');

        var userId = res.data.user.id;
        hint.textContent = '正在上传国旗与国徽…';

        /* 2. 上传国旗 */
        return uploadFile('flags', userId, flagFile).then(function (flagUrl) {
          hint.textContent = '正在上传国徽…';
          return uploadFile('emblems', userId, emblemFile).then(function (emblemUrl) {
            hint.textContent = '正在创建国家档案…';
            return I.client.from('profiles').insert({
              id: userId,
              username: username,
              social_system: social,
              capital: capital,
              official_language: lang,
              flag_url: flagUrl,
              emblem_url: emblemUrl
            });
          });
        }).then(function (r) {
          if (r && r.error) {
            console.error(r.error);
            return fail('创建国家档案失败：' + r.error.message);
          }
          hint.className = 'auth-hint ok';
          hint.textContent = '注册成功！正在跳转…';
          I.toast('欢迎加入 IECP', 'success');
          setTimeout(function () { location.href = 'index.html'; }, 900);
        });
      }).catch(function (err) {
        console.error(err);
        fail('网络错误：' + (err.message || err));
      });
    });

    function uploadFile(bucket, userId, file) {
      var ext = (file.name.split('.').pop() || 'png').toLowerCase();
      var path = userId + '/' + Date.now() + '.' + ext;
      return I.client.storage.from(bucket).upload(path, file, { upsert: true })
        .then(function (r) {
          if (r.error) throw r.error;
          var pub = I.client.storage.from(bucket).getPublicUrl(path);
          return pub.data.publicUrl;
        });
    }
  };

})(window);