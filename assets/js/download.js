/* ===================================================================
   应用下载页 · 交互
   · "敬请期待" 按钮弹 Toast
   · 分享按钮复制链接
   =================================================================== */

(function () {
  'use strict';

  /* ---------- 敬请期待按钮 ---------- */
  var comingBtns = document.querySelectorAll('.dl-dl-btn[data-coming]');
  comingBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var name = btn.getAttribute('data-coming') || '该平台';
      showToast(name + ' 版本敬请期待');
    });
  });

  /* ---------- 分享按钮 ---------- */
  var shareBtn = document.getElementById('dlShareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var url = location.href;
      var title = '蓬溪格勒人民高等中学 · 官方应用';
      var text = '推荐你下载蓬溪格勒人民高等中学官方应用：' + url;

      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          showToast('链接已复制到剪贴板');
        }).catch(function () {
          showToast('分享链接：' + url);
        });
        return;
      }
      showToast('分享链接：' + url);
    });
  }

  /* ---------- Toast 兜底 ---------- */
  function showToast(msg) {
    if (window.siteToast) { window.siteToast(msg, 2400); return; }
    console.log('[download]', msg);
  }

  console.log('[download] 应用下载页已就绪，' + comingBtns.length + ' 个"敬请期待"按钮');
})();