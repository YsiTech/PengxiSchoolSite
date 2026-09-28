/* ===================================================================
   蓬溪格勒人民高等中学 · 背包系统
   =================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('inventoryGrid');

  function toast(msg) {
    if (window.siteToast) window.siteToast(msg);
    else console.log(msg);
  }

  function loadInventory() {
    if (!window.Auth || !Auth.client) return;
    var user = Auth.getCurrentUser();
    if (!user || user.isGuest) {
      grid.innerHTML = '<div class="empty-inv">请使用正式账号登录查看背包</div>';
      return;
    }

    Auth.client.from('user_inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
            .then(function (res) {
        if (res.error) {
          grid.innerHTML = '<div class="empty-inv">读取背包失败</div>';
          return;
        }
        var list = res.data || [];
        if (!list.length) {
          grid.innerHTML = '<div class="empty-inv">背包空空如也，快去抽奖试试手气吧！</div>';
          return;
        }

        // ⭐ 核心修改：按 type + value + name 合并同类道具
        var mergedMap = {};
        list.forEach(function (item) {
          var key = item.item_type + '|' + item.item_value + '|' + item.prize_name;
          if (mergedMap[key]) {
            // 如果已存在，数量叠加
            mergedMap[key].quantity = (mergedMap[key].quantity || 1) + (item.quantity || 1);
          } else {
            // 第一次遇到，拷贝一份
            mergedMap[key] = Object.assign({}, item);
            mergedMap[key].quantity = item.quantity || 1;
          }
        });

        // 将合并后的对象转回数组
        var mergedList = Object.values(mergedMap);

        var html = '';
        mergedList.forEach(function (item) {
          var icon = '🎁';
          if (item.item_type === 'vip_card') icon = '👑';
          else if (item.item_type === 'subscriber_card') icon = '💎';
          else if (item.item_type === 'money_card') icon = '💰';
          else if (item.item_type === 'exp_card') icon = '⭐';

          var desc = '';
          if (item.item_type === 'vip_card' || item.item_type === 'subscriber_card') {
            desc = '使用后立即获得 ' + item.item_value + ' 天体验时长';
          } else if (item.item_type === 'money_card') {
            desc = '使用后增加 ' + item.item_value + ' 亚斯卢布';
          } else if (item.item_type === 'exp_card') {
            desc = '使用后增加 ' + item.item_value + ' 点经验';
          }

          // ⭐ 显示合并后的数量
          var qtyHtml = item.quantity > 1 ? '<div class="item-qty">x' + item.quantity + '</div>' : '';

          html += '<div class="item-card" data-id="' + item.id + '">' +
                    qtyHtml +
                    '<div class="item-icon">' + icon + '</div>' +
                    '<div class="item-name">' + item.prize_name + '</div>' +
                    '<div class="item-desc">' + desc + '</div>' +
                    '<button class="item-btn" data-id="' + item.id + '">立即使用</button>' +
                  '</div>';
        });
        grid.innerHTML = html;

        // 绑定使用按钮
        grid.querySelectorAll('.item-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-id');
            if (!confirm('确定要使用这个道具吗？')) return;
            btn.disabled = true;
            btn.textContent = '使用中…';

            Auth.client.rpc('use_item', { p_inventory_id: parseInt(id) }).then(function (res) {
              if (res.error) {
                toast('使用失败：' + res.error.message);
                btn.disabled = false;
                btn.textContent = '立即使用';
                return;
              }
              var data = res.data || {};
              if (!data.ok) {
                toast(data.msg || '使用失败');
                btn.disabled = false;
                btn.textContent = '立即使用';
                return;
              }
              toast(data.msg || '使用成功');
              // 刷新背包
              loadInventory();
            });
          });
        });
      });
  }

  if (window.Auth && Auth.ready && Auth.ready.then) {
    Auth.ready.then(function () { setTimeout(loadInventory, 300); });
  } else {
    setTimeout(loadInventory, 500);
  }
})();