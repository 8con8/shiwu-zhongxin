/*!
 * page-guard.js — 路由自愈
 * ------------------------------------------------------------------
 * 这套前端把「登录 + 系统设置」的初始化写在了首页组件里：
 * 只有先渲染过 #/，再去别的路由才拿得到登录态。
 * 结果就是：直接打开 / 刷新到 #/xxx 这种子页面，会一片空白。
 *
 * 这里做一件事：发现「不是首页 + 页面空白 + 还没初始化过」，
 * 就先悄悄回到首页把初始化跑完，再自动跳回原来的页面。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.__PAGE_GUARD__) return;
  window.__PAGE_GUARD__ = true;

  var HOME = '#/';
  var booted = false;    /* 应用是否已经初始化过（首页渲染出内容） */
  var pending = null;    /* 自愈时要跳回的目标 hash */
  var jumped = false;

  function rootLen() {
    var r = document.getElementById('root');
    if (!r) return 0;
    return (r.textContent || '').replace(/\s+/g, '').length;
  }

  function isHome(h) {
    return !h || h === '#' || h === '#/' || h === HOME;
  }

  /* 首页渲染出内容 = 初始化完成 */
  function markBootedIfHomeHasContent() {
    if (isHome(location.hash) && rootLen() > 20) {
      booted = true;
      return true;
    }
    return false;
  }

  function heal() {
    if (jumped) return;
    jumped = true;

    pending = location.hash;
    location.hash = HOME;

    /* 固定等 2.2 秒：首页要拉 chunk + 打一串接口，轮询容易被误判，
       这里直接按经验值等待后无条件跳回，跳不回也不会停在首页。 */
    setTimeout(function () {
      var target = pending;
      pending = null;
      if (target && target !== location.hash) {
        location.hash = target;
      }
    }, 2200);
  }

  function start() {
    var h = location.hash;
    if (isHome(h)) {
      /* 首页：正常等着，初始化完成后打标记 */
      var t = 0;
      var timer = setInterval(function () {
        t++;
        if (markBootedIfHomeHasContent()) clearInterval(timer);
        if (t > 40) clearInterval(timer);
      }, 150);
      return;
    }

    /* 子路由：给 1.2 秒机会，还没内容就自愈 */
    setTimeout(function () {
      if (markBootedIfHomeHasContent()) return;
      if (booted) return;          /* 已经初始化过（SPA 内部导航），不干预 */
      if (rootLen() > 15) { booted = true; return; }
      heal();
      /* 跳回后如果页面依旧空，给个提示 */
      setTimeout(function () { checkEmpty(location.hash); }, 3200);
    }, 1200);
  }

  /* 记录初始化状态：只要在首页出现过内容，之后就不再自愈 */
  window.addEventListener('hashchange', function () {
    if (isHome(location.hash)) {
      setTimeout(markBootedIfHomeHasContent, 300);
    } else {
      setTimeout(function () { checkEmpty(location.hash); }, 2000);
    }
  });

  /* ---- 空页面兜底 ----
     个别页面（全部事务 / 办事指南 / 常用意见 / 设置）在离线环境里拿不到
     深层业务数据，会渲染成一片空白。这里给个明确提示，别让人以为卡死了。 */
  var NAME_MAP = {
    'allaffair': '全部事务',
    'guide': '办事指南',
    'opinions': '常用意见',
    'setting': '设置',
    'searchaffair': '搜索事务',
    'mailList': '通讯录',
    'course': '课程',
    'signaturedraw': '手写签名',
    'signaturedrawupload': '签名上传',
    'password': '修改密码',
    'defaultbanner': '默认横幅',
    'studentachievement': '学籍成绩',
    'freeclass': '空教室',
    'statistic': '统计'
  };

  function humanName(h) {
    var k = String(h || '').replace(/^#\/?/, '').split('?')[0].split('/')[0].toLowerCase();
    return NAME_MAP[k] || '该页面';
  }

  function checkEmpty(h) {
    if (document.getElementById('__pgTip')) return;
    var root = document.getElementById('root');
    if (!root) return;
    var len = (root.textContent || '').replace(/\s+/g, '').length;
    if (len >= 5) return;

    var p = document.createElement('div');
    p.id = '__pgTip';
    p.style.cssText = [
      'position:fixed', 'left:0', 'top:0', 'right:0', 'bottom:0',
      'background:#f5f7fa', 'z-index:100003',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
      'box-sizing:border-box', 'padding:0 32px'
    ].join(';');

    var icon = document.createElement('div');
    icon.style.cssText = 'width:72px;height:72px;border-radius:50%;background:#e8eefc;' +
      'display:flex;align-items:center;justify-content:center;margin-bottom:20px;';
    icon.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" ' +
      'stroke="#4A79EF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>' +
      '<path d="M8 13h8"/><path d="M8 17h5"/></svg>';

    var title = document.createElement('div');
    title.textContent = humanName(h);
    title.style.cssText = 'font-size:17px;font-weight:500;color:#1f272c;margin-bottom:10px;';

    var desc = document.createElement('div');
    desc.textContent = '离线演示版未包含该模块的数据，接入服务器后即可正常使用。';
    desc.style.cssText = 'font-size:13.5px;color:#8b95a1;line-height:1.7;text-align:center;' +
      'max-width:300px;margin-bottom:28px;';

    var btn = document.createElement('div');
    btn.textContent = '返回首页';
    btn.style.cssText = 'background:#4A79EF;color:#fff;font-size:15px;padding:11px 38px;' +
      'border-radius:24px;box-shadow:0 4px 14px rgba(74,121,239,.35);cursor:pointer;' +
      'user-select:none;-webkit-tap-highlight-color:transparent;';
    btn.onclick = function () {
      closeTip();
      location.hash = HOME;
    };

    p.appendChild(icon);
    p.appendChild(title);
    p.appendChild(desc);
    p.appendChild(btn);
    document.body.appendChild(p);
  }

  function closeTip() {
    var el = document.getElementById('__pgTip');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
