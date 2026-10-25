/* ===================================================================
   IECP · 管理员控制台逻辑
   =================================================================== */

(function () {
  var I = IECP;
  var profileList = [];
  var currentEditingId = null;

  I.requireAuth().then(function (ok) {
    if (!ok) return;
    I.initTopbar(''); // 管理员页面不需要高亮导航

    // 检查是否有管理员权限
    I.getProfile(true).then(function (p) {
      if (!p || p.role !== 'admin') {
        I.$('#adminWrap').innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-ban" style="color:var(--red)"></i>
            <p style="font-size:18px;color:var(--ink)">拒绝访问</p>
            <small>你必须拥有管理员权限才能进入此控制台。</small>
            <div style="margin-top:20px"><a href="index.html" class="btn btn-ghost">返回首页</a></div>
          </div>
        `;
        return;
      }
      renderLayout();
      loadData();
    });
  });

  function renderLayout() {
    I.$('#adminWrap').innerHTML = `
      <!-- 数据看板 -->
      <div class="admin-stats">
        <div class="stat-box glass">
          <div class="stat-icon"><i class="fa-solid fa-globe"></i></div>
          <div class="stat-info"><h4>注册国家总数</h4><b id="statCountries">-</b></div>
        </div>
        <div class="stat-box glass">
          <div class="stat-icon"><i class="fa-solid fa-coins"></i></div>
          <div class="stat-info"><h4>全服资金总额 (₽)</h4><b id="statBalance">-</b></div>
        </div>
        <div class="stat-box glass">
          <div class="stat-icon"><i class="fa-solid fa-newspaper"></i></div>
          <div class="stat-info"><h4>新闻发布总数</h4><b id="statNews">-</b></div>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="admin-toolbar glass">
        <div class="admin-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="searchInput" type="text" placeholder="搜索国家名..." oninput="filterTable()">
        </div>
        <button class="btn btn-gold" onclick="loadData()"><i class="fa-solid fa-rotate-right"></i> 刷新数据</button>
      </div>

      <!-- 用户列表 -->
      <div class="admin-table-wrap glass">
        <table class="admin-table">
          <thead>
            <tr>
              <th>国家档案</th>
              <th>社会性质 / 首都</th>
              <th>国库余额</th>
              <th>身份</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <tr><td colspan="5" style="text-align:center;padding:40px">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function loadData() {
    I.$('#tableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto;"></div></td></tr>`;

    // 获取所有国家
    I.client.from('profiles').select('*').order('created_at', { ascending: false }).then(function (res) {
      profileList = res.data || [];
      
      // 计算数据看板
      var totalBalance = 0;
      profileList.forEach(p => totalBalance += (p.balance || 0));
      I.$('#statCountries').textContent = profileList.length;
      I.$('#statBalance').textContent = I.fmtNumber(totalBalance);
      
      I.client.from('news').select('*', { count: 'exact', head: true }).then(function (nRes) {
        I.$('#statNews').textContent = nRes.count || 0;
      });

      renderTable(profileList);
    });
  }

  function renderTable(list) {
    var tbody = I.$('#tableBody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)">暂无数据</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      var isAdmin = p.role === 'admin';
      return `
        <tr data-name="${I.escapeHtml(p.username).toLowerCase()}">
          <td>
            <div class="td-country">
              <img src="${p.flag_url || I.avatarFallback(p.username)}">
              <div>
                <b>${I.escapeHtml(p.username)}</b>
                <span>注册于 ${I.fmtDate(p.created_at).split(' ')[0]}</span>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size:13px">${I.escapeHtml(p.social_system)}</div>
            <div style="font-size:12px;color:var(--muted)">首都: ${I.escapeHtml(p.capital)}</div>
          </td>
          <td class="td-balance">${I.fmtNumber(p.balance)} ₽</td>
          <td><span class="td-role ${p.role}">${isAdmin ? '管理员' : '普通用户'}</span></td>
          <td>
            <div class="td-actions">
              <button class="btn-icon" title="编辑档案" onclick="openEditModal('${p.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon danger" title="删除国家" onclick="deleteCountry('${p.id}', '${I.escapeHtml(p.username)}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.filterTable = function() {
    var kw = I.$('#searchInput').value.toLowerCase();
    I.$$('#tableBody tr').forEach(tr => {
      var name = tr.getAttribute('data-name') || '';
      tr.style.display = name.includes(kw) ? '' : 'none';
    });
  };

  window.openEditModal = function(id) {
    var p = profileList.find(x => x.id === id);
    if (!p) return;
    currentEditingId = id;

    I.$('#editUsername').value = p.username;
    I.$('#editBalance').value = p.balance;
    I.$('#editRole').value = p.role;

    I.$('#editModal').classList.add('open');
  };

  I.$('#modalSaveBtn').addEventListener('click', function() {
    if (!currentEditingId) return;
    var btn = this;
    btn.disabled = true;

    var newBalance = parseInt(I.$('#editBalance').value, 10) || 0;
    var newRole = I.$('#editRole').value;

    I.client.from('profiles').update({
      balance: newBalance,
      role: newRole
    }).eq('id', currentEditingId).then(function(res) {
      btn.disabled = false;
      if (res.error) { I.toast(res.error.message, 'error'); return; }
      
      I.$('#editModal').classList.remove('open');
      I.toast('数据已更新', 'success');
      loadData(); // 重新加载
    });
  });

  window.deleteCountry = function(id, name) {
    if (!confirm(`警告：你确定要彻底删除国家【${name}】吗？\n\n该操作将清空该国的国库、外交关系、新闻、商品等所有关联数据，且不可恢复！`)) return;

    I.client.from('profiles').delete().eq('id', id).then(function(res) {
      if (res.error) {
        I.toast('删除失败：' + res.error.message, 'error');
        return;
      }
      I.toast('国家已删除', 'success');
      loadData();
    });
  };

})();