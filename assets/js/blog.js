/* ===================================================================
   校园随笔 · 博客逻辑
   · 列表 / 详情从 Supabase 加载
   · 图片上传到 Supabase Storage
   · 登录用户可发布，作者本人可编辑/删除
   · 游客只能浏览
   =================================================================== */

(function () {
  'use strict';

  var CATEGORY_LABELS = {
    essay: '随笔', study: '研学', people: '人物', tech: '科技', exchange: '交流'
  };
  var CATEGORY_STYLE = {
    essay:    { c1: '#8a0c22', c2: '#1a2b4c', icon: '✎' },
    study:    { c1: '#c85a17', c2: '#1a2b4c', icon: '✈' },
    people:   { c1: '#c8102e', c2: '#8a6d12', icon: '☰' },
    tech:     { c1: '#1a2b4c', c2: '#243b63', icon: '◈' },
    exchange: { c1: '#1f8f55', c2: '#1a2b4c', icon: '◇' }
  };
  var THEMES = {
    red:    { c1: '#c8102e', c2: '#1a2b4c' },
    navy:   { c1: '#1a2b4c', c2: '#243b63' },
    gold:   { c1: '#8a6d12', c2: '#c8102e' },
    green:  { c1: '#1f8f55', c2: '#1a2b4c' },
    purple: { c1: '#7a3b8f', c2: '#1a2b4c' },
    orange: { c1: '#c85a17', c2: '#1a2b4c' }
  };

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
  }
  function fmtDateCN(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + ' 年 ' + (d.getMonth()+1) + ' 月 ' + d.getDate() + ' 日';
  }
  function isMine(p) {
    if (!p || !window.Auth || !Auth.isLoggedIn()) return false;
    var u = Auth.getCurrentUser();
    return u && p.author_id && String(p.author_id) === String(u.id);
  }

  /* ============================================================
     图片压缩 + 上传
     ============================================================ */
  function compressImage(file, maxW, maxH, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          /* 按最大边等比缩放 */
          var ratio = Math.min(maxW / w, maxH / h, 1);
          var nw = Math.round(w * ratio);
          var nh = Math.round(h * ratio);

          var canvas = document.createElement('canvas');
          canvas.width = nw;
          canvas.height = nh;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, nw, nh);

          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('图片处理失败'));
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadImage(file) {
    if (!window.Auth || !Auth.client) return Promise.reject(new Error('未登录'));
    var u = Auth.getCurrentUser();
    if (!u) return Promise.reject(new Error('未登录'));

    /* 最大 1600x1200，JPEG 0.82 */
    return compressImage(file, 1600, 1200, 0.82).then(function (blob) {
      var path = u.id + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
      return Auth.client.storage
        .from('blog-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          var pub = Auth.client.storage.from('blog-images').getPublicUrl(path);
          return pub.data.publicUrl;
        });
    });
  }

  /* ============================================================
     路由
     ============================================================ */
  if ($('blogGrid')) initList();
  if ($('postArticle')) initPost();

  /* ============================================================
     列表页
     ============================================================ */
  function initList() {
    var gridEl = $('blogGrid');
    var featuredEl = $('blogFeatured');
    var emptyEl = $('blogEmpty');
    var filterEl = $('blogFilter');
    var publishBtn = $('publishBtn');
    var modal = $('publishModal');

    var allPosts = [];
    var currentCat = 'all';
    var editingId = null;
    var pendingImage = null;
    var existingCoverUrl = '';

    /* --------- 加载 --------- */
    function loadPosts() {
      if (!window.Auth || !Auth.client) {
        gridEl.innerHTML = '<div class="blog-loading">系统未就绪</div>';
        return;
      }
      Auth.client.from('blog_posts')
        .select('id, title, category, excerpt, cover_url, cover_c1, cover_c2, author_id, author_nick, created_at')
        .order('created_at', { ascending: false })
        .then(function (res) {
          if (res.error) {
            console.error('[blog] 加载失败:', res.error);
            gridEl.innerHTML = '<div class="blog-loading">加载失败，请刷新重试</div>';
            return;
          }
          allPosts = res.data || [];
          render();
        })
        .catch(function (err) {
          console.error('[blog] 异常:', err);
          gridEl.innerHTML = '<div class="blog-loading">加载失败</div>';
        });
    }

    /* --------- 渲染 --------- */
    function render() {
      var pool = currentCat === 'all'
        ? allPosts
        : allPosts.filter(function (p) { return p.category === currentCat; });

      /* -------- 精选（pool 第一篇） -------- */
      if (featuredEl) {
        if (pool.length === 0) {
          featuredEl.innerHTML = '';
        } else {
          featuredEl.innerHTML = renderFeatured(pool[0]);
        }
      }

      /* -------- 网格（pool 剩余） -------- */
      var gridList = pool.slice(1);
      if (!gridList.length) {
        gridEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.add('hide');
        return;
      }
      if (emptyEl) emptyEl.classList.add('hide');

      gridEl.innerHTML = gridList.map(renderCard).join('');

      /* 编辑/删除按钮 */
      gridEl.querySelectorAll('[data-edit]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openEdit(parseInt(btn.dataset.edit, 10));
        });
      });
      gridEl.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          doDelete(parseInt(btn.dataset.del, 10));
        });
      });
    }

    /* -------- 精选模板 -------- */
    function renderFeatured(p) {
      var style = CATEGORY_STYLE[p.category] || CATEGORY_STYLE.essay;
      var c1 = p.cover_c1 || style.c1;
      var c2 = p.cover_c2 || style.c2;
      var label = CATEGORY_LABELS[p.category] || '文章';
      var hasImg = !!p.cover_url;

      var artStyle = '--c1:' + esc(c1) + ';--c2:' + esc(c2) + ';';
      if (hasImg) {
        artStyle += 'background-image:url(' + esc(p.cover_url) + ');';
      } else {
        artStyle += 'background:linear-gradient(145deg,' + esc(c1) + ',' + esc(c2) + ');';
      }

      return '' +
        '<a class="blog-featured" href="blog-post.html?id=' + p.id + '">' +
          '<div class="blog-featured-art' + (hasImg ? ' has-image' : '') + '" style="' + artStyle + '">' +
            '<span class="blog-featured-badge">精选</span>' +
            '<span class="blog-featured-cat">' + esc(label) + '</span>' +
            (hasImg ? '' : '<span class="blog-featured-icon">' + style.icon + '</span>') +
          '</div>' +
          '<div class="blog-featured-body">' +
            '<div class="blog-featured-date">' +
              esc(fmtDateCN(p.created_at)) + ' · ' + esc(p.author_nick || '匿名') +
            '</div>' +
            '<h2>' + esc(p.title) + '</h2>' +
            '<p>' + esc(p.excerpt || '') + '</p>' +
            '<span class="blog-featured-more">阅读全文 →</span>' +
          '</div>' +
        '</a>';
    }

    /* -------- 卡片模板 -------- */
    function renderCard(p) {
      var style = CATEGORY_STYLE[p.category] || CATEGORY_STYLE.essay;
      var c1 = p.cover_c1 || style.c1;
      var c2 = p.cover_c2 || style.c2;
      var label = CATEGORY_LABELS[p.category] || '文章';
      var hasImg = !!p.cover_url;

      var coverStyle = '--c1:' + esc(c1) + ';--c2:' + esc(c2) + ';';
      if (hasImg) {
        coverStyle += 'background-image:url(' + esc(p.cover_url) + ');';
      } else {
        coverStyle += 'background:linear-gradient(140deg,' + esc(c1) + ',' + esc(c2) + ');';
      }

      var actions = isMine(p)
        ? '<div class="blog-card-actions">' +
            '<button class="blog-card-action" data-edit="' + p.id + '" title="编辑" type="button">✎</button>' +
            '<button class="blog-card-action del" data-del="' + p.id + '" title="删除" type="button">🗑</button>' +
          '</div>'
        : '';

      return '' +
        '<div class="blog-card" data-cat="' + esc(p.category) + '">' +
          actions +
          '<a class="blog-card-link" href="blog-post.html?id=' + p.id + '">' +
            '<div class="blog-card-cover' + (hasImg ? ' has-image' : '') + '" style="' + coverStyle + '">' +
              '<span class="blog-cat">' + esc(label) + '</span>' +
              (hasImg ? '' : '<span class="blog-icon">' + style.icon + '</span>') +
            '</div>' +
            '<div class="blog-card-body">' +
              '<h3 class="blog-title">' + esc(p.title) + '</h3>' +
              '<p class="blog-excerpt">' + esc(p.excerpt || '') + '</p>' +
              '<div class="blog-meta">' +
                '<span class="blog-author">' + esc(p.author_nick || '匿名') + '</span>' +
                '<span class="blog-date">' + esc(fmtDate(p.created_at)) + '</span>' +
              '</div>' +
            '</div>' +
          '</a>' +
        '</div>';
    }

    /* --------- 分类筛选 --------- */
    if (filterEl) {
      filterEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.blog-filter-btn');
        if (!btn) return;
        currentCat = btn.dataset.cat;
        filterEl.querySelectorAll('.blog-filter-btn').forEach(function (b) {
          b.classList.toggle('on', b === btn);
        });
        render();
      });
    }

    /* --------- 弹窗控制 --------- */
    function openModal() {
      if (modal) modal.classList.remove('hide');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      if (modal) modal.classList.add('hide');
      document.body.style.overflow = '';
      setHint('', '');
    }

    if (publishBtn) {
      publishBtn.addEventListener('click', function () {
        if (!window.Auth || !Auth.isLoggedIn()) {
          window.siteToast && window.siteToast('请先登录');
          setTimeout(function () { location.href = 'index.html?redirect=blog.html'; }, 800);
          return;
        }
        if (Auth.isGuest && Auth.isGuest()) {
          window.siteToast && window.siteToast('游客账号无法发布，请注册正式账号', 3600);
          return;
        }
        resetForm();
        openModal();
      });
    }

    if ($('publishClose')) $('publishClose').addEventListener('click', closeModal);
    if ($('publishCancel')) $('publishCancel').addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }

    /* --------- 编辑 --------- */
    function openEdit(id) {
      var cached = allPosts.find(function (p) { return p.id === id; });
      if (!cached || !isMine(cached)) {
        window.siteToast && window.siteToast('无权限编辑');
        return;
      }
      Auth.client.from('blog_posts').select('*').eq('id', id).maybeSingle()
        .then(function (res) {
          if (res.error || !res.data) {
            window.siteToast && window.siteToast('加载失败');
            return;
          }
          var p = res.data;
          editingId = p.id;
          existingCoverUrl = p.cover_url || '';
          pendingImage = null;

          $('pTitle').value = p.title || '';
          $('pCategory').value = p.category || 'essay';
          $('pExcerpt').value = p.excerpt || '';
          $('pContent').value = p.content || '';

          /* 匹配主题色 */
          var themeKey = 'red';
          Object.keys(THEMES).forEach(function (k) {
            if (THEMES[k].c1.toLowerCase() === String(p.cover_c1).toLowerCase()) themeKey = k;
          });
          $('pTheme').value = themeKey;

          /* 已有封面 */
          if (p.cover_url) showImagePreview(p.cover_url);
          else hideImagePreview();

          $('publishModalTitle').textContent = '编辑文章';
          $('publishForm').querySelector('.blog-publish-submit').textContent = '保存修改';
          openModal();
        });
    }

    /* --------- 删除 --------- */
    function doDelete(id) {
      var post = allPosts.find(function (p) { return p.id === id; });
      if (!post || !isMine(post)) {
        window.siteToast && window.siteToast('无权限删除');
        return;
      }
      if (!window.confirm('确定删除《' + post.title + '》吗？此操作不可撤销。')) return;

      Auth.client.from('blog_posts').delete().eq('id', id).then(function (res) {
        if (res.error) {
          console.error('[blog] 删除失败:', res.error);
          window.siteToast && window.siteToast(res.error.message || '删除失败');
          return;
        }
        window.siteToast && window.siteToast('已删除');
        loadPosts();
      });
    }

    /* --------- 表单重置 --------- */
    function resetForm() {
      editingId = null;
      pendingImage = null;
      existingCoverUrl = '';
      var form = $('publishForm');
      if (form) form.reset();
      hideImagePreview();
      $('publishModalTitle').textContent = '发布新文章';
      $('publishForm').querySelector('.blog-publish-submit').textContent = '发布';
      setHint('', '');
    }

    /* --------- 图片上传区 --------- */
    var imageUpload = $('imageUpload');
    var imageInput = $('imageInput');

    if (imageUpload && imageInput) {
      imageUpload.addEventListener('click', function (e) {
        if (e.target.closest('.blog-image-remove')) return;
        imageInput.click();
      });

      imageInput.addEventListener('change', function () {
        var file = imageInput.files && imageInput.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          setHint('请选择图片文件', 'warn');
          imageInput.value = '';
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          setHint('图片请控制在 8MB 以内', 'warn');
          imageInput.value = '';
          return;
        }
        pendingImage = file;
        var url = URL.createObjectURL(file);
        showImagePreview(url);
        setHint('图片已选择，发布时自动上传', 'ok');
        imageInput.value = '';
      });

      ['dragenter','dragover'].forEach(function (evt) {
        imageUpload.addEventListener(evt, function (e) {
          e.preventDefault(); e.stopPropagation();
          imageUpload.classList.add('over');
        });
      });
      ['dragleave','drop'].forEach(function (evt) {
        imageUpload.addEventListener(evt, function (e) {
          e.preventDefault(); e.stopPropagation();
          imageUpload.classList.remove('over');
        });
      });
      imageUpload.addEventListener('drop', function (e) {
        var file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          setHint('请选择图片文件', 'warn');
          return;
        }
        pendingImage = file;
        showImagePreview(URL.createObjectURL(file));
        setHint('图片已选择，发布时自动上传', 'ok');
      });
    }

    function showImagePreview(url) {
      if (!imageUpload) return;
      imageUpload.innerHTML =
        '<img class="blog-image-preview" src="' + esc(url) + '" alt="">' +
        '<button type="button" class="blog-image-remove" id="imageRemoveBtn">✕</button>';
      var rb = $('imageRemoveBtn');
      if (rb) {
        rb.addEventListener('click', function (e) {
          e.stopPropagation();
          pendingImage = null;
          existingCoverUrl = '';
          hideImagePreview();
        });
      }
    }

    function hideImagePreview() {
      if (!imageUpload) return;
      imageUpload.innerHTML =
        '<span class="icon">🖼</span>' +
        '<b>点击上传封面图</b>' +
        '<span>或将图片拖拽到此处 · 支持 JPG / PNG · 8MB 以内</span>';
    }

    function setHint(msg, type) {
      var el = $('publishHint');
      if (!el) return;
      el.textContent = msg || '';
      el.className = 'blog-publish-hint' + (type ? ' ' + type : '');
    }

    /* --------- 提交 --------- */
    var form = $('publishForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!window.Auth || !Auth.isLoggedIn()) {
          setHint('请先登录', 'warn'); return;
        }
        if (Auth.isGuest && Auth.isGuest()) {
          setHint('游客账号无法发布', 'warn'); return;
        }

        var title    = ($('pTitle').value || '').trim();
        var category = $('pCategory').value;
        var themeKey = $('pTheme').value;
        var excerpt  = ($('pExcerpt').value || '').trim();
        var content  = ($('pContent').value || '').trim();

        if (!title) { setHint('请填写标题', 'warn'); return; }
        if (title.length < 2) { setHint('标题至少 2 个字', 'warn'); return; }
        if (!content) { setHint('请填写正文', 'warn'); return; }
        if (content.length < 10) { setHint('正文至少 10 个字', 'warn'); return; }

        if (!excerpt) {
          excerpt = content.replace(/\s+/g, ' ').slice(0, 60);
          if (content.length > 60) excerpt += '…';
        }

        var theme = THEMES[themeKey] || THEMES.red;
        var u = Auth.getCurrentUser();
        var submitBtn = form.querySelector('.blog-publish-submit');
        var originalText = submitBtn.textContent;

        submitBtn.disabled = true;
        setHint('正在处理…', '');

        var uploadPromise = pendingImage
          ? (function () {
              submitBtn.textContent = '上传图片中…';
              return uploadImage(pendingImage);
            })()
          : Promise.resolve(existingCoverUrl || null);

        uploadPromise.then(function (coverUrl) {
          submitBtn.textContent = '提交中…';

          var payload = {
            title: title,
            category: category,
            excerpt: excerpt,
            content: content,
            cover_url: coverUrl,
            cover_c1: theme.c1,
            cover_c2: theme.c2
          };

          var query;
          if (editingId) {
            payload.updated_at = new Date().toISOString();
            query = Auth.client.from('blog_posts').update(payload).eq('id', editingId);
          } else {
            payload.author_id = u.id;
            payload.author_nick = u.nickname;
            query = Auth.client.from('blog_posts').insert(payload);
          }

          return query.then(function (res) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            if (res.error) {
              console.error('[blog] 提交失败:', res.error);
              var msg = res.error.message || '提交失败';
              if (/row.*security|policy|permission/i.test(msg)) {
                msg = '无权限（游客账号无法发布）';
              }
              setHint(msg, 'warn');
              return;
            }
            setHint(editingId ? '已保存！' : '发布成功！', 'ok');
            window.siteToast && window.siteToast(editingId ? '已保存' : '文章已发布');
            setTimeout(function () {
              closeModal();
              loadPosts();
            }, 700);
          });
        }).catch(function (err) {
          console.error('[blog] 上传/提交异常:', err);
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          setHint('图片上传失败：' + (err.message || '请稍后重试'), 'warn');
        });
      });
    }

    /* --------- 启动 --------- */
    if (window.Auth && Auth.ready) {
      Auth.ready.then(function () { setTimeout(loadPosts, 60); });
    } else {
      setTimeout(loadPosts, 300);
    }
  }

  /* ============================================================
     详情页
     ============================================================ */
  function initPost() {
    var articleEl = $('postArticle');
    if (!articleEl) return;

    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    var id = params ? params.get('id') : null;

    if (!id) {
      articleEl.innerHTML = '<div class="blog-post-error">未指定文章编号，请从<a href="blog.html">列表</a>进入</div>';
      return;
    }
    if (!window.Auth || !Auth.client) {
      articleEl.innerHTML = '<div class="blog-post-error">系统未就绪</div>';
      return;
    }

    Auth.client.from('blog_posts').select('*').eq('id', id).maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) {
          console.error('[blog] 加载失败:', res.error);
          articleEl.innerHTML = '<div class="blog-post-error">文章不存在或已被删除，<a href="blog.html">返回列表</a></div>';
          return;
        }
        renderPost(res.data);
        document.title = res.data.title + ' · 校园随笔';
      })
      .catch(function (err) {
        console.error('[blog] 异常:', err);
        articleEl.innerHTML = '<div class="blog-post-error">加载失败</div>';
      });

    function renderPost(p) {
      var label = CATEGORY_LABELS[p.category] || '文章';
      var style = CATEGORY_STYLE[p.category] || CATEGORY_STYLE.essay;
      var c1 = p.cover_c1 || style.c1;
      var c2 = p.cover_c2 || style.c2;
      var hasImg = !!p.cover_url;

      /* 正文渲染：空行分段，> 引用，## 二级标题 */
      var paragraphs = String(p.content || '').split(/\n\s*\n/).map(function (para) {
        var trimmed = para.trim();
        if (!trimmed) return '';
        if (/^>/.test(trimmed)) {
          var text = trimmed.replace(/^>\s*/gm, '').replace(/\n/g, '<br>');
          return '<blockquote><p>' + esc(text) + '</p></blockquote>';
        }
        if (/^##\s+/.test(trimmed)) {
          return '<h2>' + esc(trimmed.replace(/^##\s+/, '')) + '</h2>';
        }
        return '<p>' + esc(trimmed).replace(/\n/g, '<br>') + '</p>';
      }).join('');

      var initial = String(p.author_nick || '?').slice(0, 1).toUpperCase();

      /* 封面（自适应） */
      var coverHtml;
      if (hasImg) {
        coverHtml =
          '<div class="blog-post-cover has-image">' +
            '<img class="blog-post-cover-img" src="' + esc(p.cover_url) + '" alt="">' +
            '<span class="blog-post-cover-label">' + esc(label) + '</span>' +
          '</div>';
      } else {
        coverHtml =
          '<div class="blog-post-cover" style="--c1:' + esc(c1) + ';--c2:' + esc(c2) + '">' +
            '<span class="blog-post-cover-icon">' + style.icon + '</span>' +
            '<span class="blog-post-cover-label">' + esc(label) + '</span>' +
          '</div>';
      }

      var mineActions = isMine(p)
        ? '<div class="blog-post-actions">' +
            '<button class="blog-post-action" id="editThisBtn" type="button">✎ 编辑</button>' +
            '<button class="blog-post-action del" id="deleteThisBtn" type="button">🗑 删除</button>' +
          '</div>'
        : '';

      articleEl.innerHTML = '' +
        '<header class="blog-post-header">' +
          '<div class="blog-post-crumb">' +
            '<a href="mainsite.html">首页</a><i>›</i>' +
            '<a href="blog.html">校园随笔</a><i>›</i>' +
            '<span>正文</span>' +
          '</div>' +
          '<div class="blog-post-cat">' + esc(label) + '</div>' +
          '<h1 class="blog-post-title">' + esc(p.title) + '</h1>' +
          '<div class="blog-post-meta">' +
            '<div class="blog-post-author">' +
              '<span class="blog-post-avatar" style="background:' + esc(c1) + '">' + esc(initial) + '</span>' +
              '<div>' +
                '<div class="blog-post-author-name">' + esc(p.author_nick || '匿名') + '</div>' +
                '<div class="blog-post-author-role">校园随笔 · 投稿</div>' +
              '</div>' +
            '</div>' +
            '<div class="blog-post-date">' + esc(fmtDateCN(p.created_at)) + '</div>' +
          '</div>' +
        '</header>' +
        coverHtml +
        '<div class="blog-post-body">' + paragraphs + '</div>' +
        '<footer class="blog-post-footer">' +
          mineActions +
          '<div class="blog-post-tags">' +
            '<span class="blog-post-tag"># ' + esc(label) + '</span>' +
            '<span class="blog-post-tag"># 校园随笔</span>' +
          '</div>' +
          '<div class="blog-post-back"><a href="blog.html">← 返回随笔列表</a></div>' +
        '</footer>';

      if (mineActions) {
        var editBtn = $('editThisBtn');
        var delBtn = $('deleteThisBtn');
        if (editBtn) {
          editBtn.addEventListener('click', function () {
            location.href = 'blog.html?edit=' + p.id;
          });
        }
        if (delBtn) {
          delBtn.addEventListener('click', function () {
            if (!window.confirm('确定删除《' + p.title + '》吗？此操作不可撤销。')) return;
            Auth.client.from('blog_posts').delete().eq('id', p.id).then(function (res) {
              if (res.error) {
                window.siteToast && window.siteToast(res.error.message || '删除失败');
                return;
              }
              window.siteToast && window.siteToast('已删除');
              setTimeout(function () { location.href = 'blog.html'; }, 600);
            });
          });
        }
      }
    }
  }

})();