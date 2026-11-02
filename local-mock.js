/*!
 * local-mock.js — 事务中心「纯静态本地后端」
 * ------------------------------------------------------------------
 * 作用：不需要 python / php / 任何服务器。
 *       在浏览器里直接拦截所有 XHR 与 fetch 请求，本地应答。
 *       日志、登录、部门、事务列表、我的申请、图标下载全部覆盖。
 *
 * 放在 index.html 里 <script src="./common…js"> 之前加载即可。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.__SHIWU_MOCK__) return;
  window.__SHIWU_MOCK__ = true;

  /* ================= 1. 数据 ================= */
  var USER = {
    userId: '511321200902288919',
    userName: '谢哮',
    name: '谢哮',
    loginName: '谢哮',
    tokenId: 'mock-token-123456',
    accessToken: 'mock-token-123456'
  };

  /* 审批中：给一条示例，方便直接看到卡片；不想要清空即可 */
  var CURRENT_LIST = [
    {
      orunid: 'UsJnW2q03C7BijSAMbKmj',
      subject: '中职学生请假流程',
      processName: '中职学生请假流程',
      createTime: '2026-11-02 09:20',
      endTime: '2026-11-04 18:00',
      totalCost: '2天',
      currentNodeName: '班主任审批',
      status: 'CURRENT',
      followStatus: '0',
      processId: 'PROC001',
      transactionId: 'TX002',
      author: '511321200902288919',
      url: 'detail.html'
    }
  ];

  var ARC_LIST = [
    {
      orunid: 'UsJnW2q03C7BijSAMbKmj',
      subject: '中职学生请假流程',
      processName: '中职学生请假流程',
      createTime: '2026-11-01 10:30',
      endTime: '2026-11-02 15:00',
      totalCost: '1天4小时',
      currentNodeName: '已完成',
      status: 'ARC',
      followStatus: '0',
      processId: 'PROC001',
      transactionId: 'TX001',
      author: '511321200902288919',
      url: 'detail.html'
    }
  ];

  var DEPARTMENTS = [
    { id: '3', name: '南充卫生职业学院' },
    { id: '4', name: '后勤处' }
  ];

  var AFFAIRS = [
    {
      id: 'BX001', name: '报修申请', departmentIds: '4', belongClass: '后勤处',
      heatTotal: 100, isReadGuideline: 0,
      attachment: { id: '7600b178-7aa7-49fa-a347-247a3b50ee85' },
      isLimited: false, visibleOpenIcon: true,
      icon: '', iconCode: '', url: '', processId: '', phoneUrl: ''
    },
    {
      id: 'GZ001', name: '高职学生请假申请', departmentIds: '3', belongClass: '南充卫生职业学院',
      heatTotal: 90, isReadGuideline: 0,
      attachment: { id: '7e99659e-10cb-4d67-9358-ae106ca71c86' },
      isLimited: false, visibleOpenIcon: true,
      icon: '', iconCode: '', url: '', processId: '', phoneUrl: ''
    },
    {
      id: 'ZZ001', name: '中职学生请假申请', departmentIds: '3', belongClass: '南充卫生职业学院',
      heatTotal: 80, isReadGuideline: 0,
      attachment: { id: 'ea2d5e45-137c-4238-98d4-c1d073eaf98d' },
      isLimited: false, visibleOpenIcon: true,
      icon: '', iconCode: '', url: '', processId: '', phoneUrl: ''
    }
  ];

  var SYS_SETTING = {
    appId: 'swzx3', systemName: '事务中心',
    mobileBackground: '0', mobileRoute: '/',
    serviceListType: '2', sortingMode: 'asc', defaultSort: 'nameOrder',
    mobileOpenEntrust: '1', mobileOpenFeedback: '0',
    mobileOpenSystemNews: '0', logOff: '0'
  };

  /* 附件 ID → 本地图标 */
  var ICON_MAP = {
    '7600b178-7aa7-49fa-a347-247a3b50ee85': 'icons/bx.png',
    '7e99659e-10cb-4d67-9358-ae106ca71c86': 'icons/gz.png',
    'ea2d5e45-137c-4238-98d4-c1d073eaf98d': 'icons/zz.png'
  };

  /* ================= 2. 工具 ================= */
  function ok(data) {
    return '{"meta":{"success":true,"statusCode":200,"message":"ok"},"data":' +
      JSON.stringify(data === undefined ? null : data) + '}';
  }

  function parseQuery(u) {
    var out = {};
    var i = u.indexOf('?');
    if (i < 0) return out;
    var q = u.slice(i + 1).split('#')[0];
    q.split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      try {
        out[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      } catch (e) {
        out[p[0]] = p[1] || '';
      }
    });
    return out;
  }

  /* ================= 3. 路由表（顺序与 mock_server.py 完全一致） ================= */
  function route(method, rawUrl, body) {
    var low = rawUrl.toLowerCase();
    var path = low.split('#')[0].split('?')[0];
    var params = parseQuery(rawUrl);

    try {
      if (window.__SM_DEBUG) {
        (window.__SM_ALL = window.__SM_ALL || []).push(method + ' ' + path);
      }
    } catch (e) {}

    /* 生成卡片：纯前端不再写文件，只回一个文件名让前端流程走完 */
    if (path.indexOf('__make_card') > -1) {
      var cid = '1';
      try {
        var b = JSON.parse(body || '{}');
        cid = String(b.id || '1');
      } catch (e) {}
      return { status: 200, text: ok({ file: 'card-' + cid + '.html', id: cid }) };
    }

    /* 登录：不管密码对错一律成功 */
    if (method === 'POST' && /\/login$/.test(path)) return { status: 200, text: ok(USER) };
    if (path.indexOf('tryloginuserinfo') > -1) return { status: 200, text: ok(USER) };
    if (path.indexOf('logout') > -1) return { status: 200, text: ok(null) };

    /* 系统设置 */
    if (path.indexOf('getsystemsetting') > -1) return { status: 200, text: ok(SYS_SETTING) };
    if (path.indexOf('systemsetting') > -1 ||
        path.indexOf('getsysinfo') > -1 ||
        path.indexOf('systeminfo') > -1) {
      return {
        status: 200,
        text: ok({ appId: 'swzx3', systemName: '事务中心', systemIcon: '', loginImgAttachments: [] })
      };
    }

    /* 首页待办 / 待阅数量 */
    if (path.indexOf('getcountforflowcard') > -1) {
      return { status: 200, text: ok({ toDoCount: 0, toReadCount: 0 }) };
    }

    /* 事务分类 tab */
    if (path.indexOf('affairs/types') > -1) return { status: 200, text: ok([]) };

    /* 标签：必须是数组，否则页面取 .length 会抛 TypeError 白屏 */
    if (path.indexOf('uis/affairs/tags') > -1) return { status: 200, text: ok([]) };

    /* 部门 tab */
    if (path.indexOf('affairs/departments') > -1) return { status: 200, text: ok(DEPARTMENTS) };

    /* 推荐事项 */
    if (path.indexOf('recommend/affairs') > -1) {
      return { status: 200, text: ok({ list: AFFAIRS, total: AFFAIRS.length }) };
    }

    /* 事项列表（按部门筛选） */
    if (path.indexOf('uis/affairs') > -1) {
      var dep = params.departmentIds || '';
      var lst = dep ? AFFAIRS.filter(function (a) { return a.departmentIds === dep; }) : AFFAIRS;
      return { status: 200, text: ok({ list: lst, total: lst.length }) };
    }

    /* 我的申请：审批中 / 已办结 */
    if (path.indexOf('tasks/apply') > -1) {
      var st = params.status || 'Current';
      var l2 = (st === 'ARC') ? ARC_LIST : CURRENT_LIST;
      return { status: 200, text: ok({ list: l2, total: l2.length }) };
    }

    /* 头像：设置页 / 我的页要用，返回本地图片，别返回空对象 */
    if (path.indexOf('getportrait') > -1) {
      return { status: 200, text: ok('static/touxiang.e147bdeb.png') };
    }

    /* BPM 表单系统地址。
       注意：这里必须返回「非空字符串」—— 日历 / 消息 / 评价 / 草稿 / 委托 / 设置 / 收藏 /
       关注 / 通知 / 指南 等页面都先拿这个地址做初始化，返回空串会直接中断渲染（白屏）。 */
    if (path.indexOf('restfulbpmurlprefix') > -1) {
      return { status: 200, text: ok('http://112.19.32.254:7778') };
    }

    /* 列表类接口：给空数组，避免前端 .indexOf / .includes 报错 */
    if (/withdrawal|pendinglist|getopenevaluations|getendinstancenumber|affairtypes/.test(path)) {
      return { status: 200, text: ok([]) };
    }

    /* 附件下载（img 直连时走不到这里，见下方 DOM 兜底） */
    if (path.indexOf('files/download') > -1 || path.indexOf('files/obtainer') > -1) {
      return { status: 200, text: ok(null) };
    }

    /* 其余一律返回「万能空结构」。
       不能返回 ok({})：列表页会去取 data.list / data.records / data.rows 再 .length / .map，
       拿到 undefined 就抛 TypeError，整个页面白屏。
       这里把所有常见容器字段都给成空数组，页面至少能渲染出「暂无数据」的空状态。 */
    try {
      var miss = (window.__SM_MISS = window.__SM_MISS || []);
      if (miss.length < 400 && miss.indexOf(path) === -1) miss.push(path);
    } catch (e) {}
    return {
      status: 200,
      text: ok({
        list: [], records: [], rows: [], items: [], content: [], data: [],
        total: 0, count: 0, pageNum: 1, pageSize: 20, pages: 0,
        state: 0, status: 0, readAll: false, unreadCount: 0
      })
    };
  }

  /* ================= 4. 判断哪些请求要拦 =================
     注意：项目里 axios 的地址是「不带前导斜杠」的 api/xxx（例如 api/authc/users/relationInfo），
     所以这里不能用 '/api/' 做判断，要兼容 "api/xxx" 和 "/api/xxx" 两种写法。 */
  function shouldMock(url) {
    if (!url) return false;
    var u = String(url);
    if (/^(data|blob|about|javascript|chrome-extension):/i.test(u)) return false;

    var path = u.split('#')[0].split('?')[0].toLowerCase();

    /* 生成卡片接口没有后缀，优先判断 */
    if (path.indexOf('__make_card') > -1) return true;

    /* 静态资源一律放行 */
    if (/\.(js|css|png|jpe?g|gif|svg|woff2?|ttf|eot|ico|html?|json|map|mp4|webp)$/.test(path)) {
      return false;
    }

    /* 接口：兼容 api/xxx、/api/xxx、完整 URL http://host/api/xxx */
    if (/(^|\/)api\//.test(path)) return true;
    if (path.indexOf('tryloginuserinfo') > -1) return true;
    if (path.indexOf('logout') > -1) return true;
    if (path.indexOf('files/download') > -1) return true;
    if (path.indexOf('files/obtainer') > -1) return true;
    if (/(^|\/)login$/.test(path)) return true;
    if (path.indexOf('restfulbpmurlprefix') > -1) return true;

    return false;
  }

  /* ================= 5. 拦截 XMLHttpRequest ================= */
  var XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    var proto = XHR.prototype;
    var nativeOpen = proto.open;
    var nativeSend = proto.send;
    var nativeSetHeader = proto.setRequestHeader;

    function def(o, k, v) {
      try {
        Object.defineProperty(o, k, { value: v, configurable: true, writable: true });
      } catch (e) {
        try { o[k] = v; } catch (e2) {}
      }
    }

    function fire(xhr, type) {
      var ev;
      try {
        ev = document.createEvent('Event');
        ev.initEvent(type, false, false);
        xhr.dispatchEvent(ev);
        return;
      } catch (e) {}
      var h = xhr['on' + type];
      if (typeof h === 'function') {
        try { h.call(xhr, { type: type, target: xhr }); } catch (e3) {}
      }
    }

    proto.open = function (method, url) {
      this.__smMethod = String(method || 'GET').toUpperCase();
      this.__smUrl = String(url || '');
      this.__smMock = shouldMock(this.__smUrl);
      this.__smHdrs = {};
      this.__smBase = '';

      try {
        if (window.__SM_DEBUG) {
          (window.__SM_LOG = window.__SM_LOG || []).push({ m: this.__smMethod, u: this.__smUrl, mock: this.__smMock });
        }
      } catch (e0) {}

      if (!this.__smMock) return nativeOpen.apply(this, arguments);

      /* 拦截：不调原生 open，自己维护状态 */
      var self = this;
      self.getResponseHeader = function (n) {
        var k = String(n || '').toLowerCase();
        return (self.__smHdrs && self.__smHdrs[k]) || null;
      };
      self.getAllResponseHeaders = function () {
        var out = '';
        for (var k in self.__smHdrs) out += k + ': ' + self.__smHdrs[k] + '\r\n';
        return out;
      };
      def(self, 'readyState', 1);
      return undefined;
    };

    proto.setRequestHeader = function () {
      if (this.__smMock) return undefined;
      return nativeSetHeader.apply(this, arguments);
    };

    proto.send = function (body) {
      var self = this;
      if (!self.__smMock) return nativeSend.apply(this, arguments);

      var res = route(self.__smMethod, self.__smUrl, body);
      var headers = {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-cache'
      };

      setTimeout(function () {
        def(self, 'readyState', 2);
        fire(self, 'readystatechange');

        def(self, 'readyState', 3);
        fire(self, 'readystatechange');

        self.__smHdrs = headers;
        def(self, 'status', res.status);
        def(self, 'statusText', 'OK');
        def(self, 'responseURL', self.__smUrl);
        def(self, 'responseText', res.text);

        var rt = self.responseType;
        if (rt === 'json') {
          try { def(self, 'response', JSON.parse(res.text)); } catch (e) { def(self, 'response', null); }
        } else if (rt === 'blob' || rt === 'arraybuffer') {
          try { def(self, 'response', new Blob([res.text], { type: 'application/json' })); }
          catch (e) { def(self, 'response', res.text); }
        } else if (rt === 'document') {
          def(self, 'response', null);
        } else {
          def(self, 'response', res.text);
        }

        def(self, 'readyState', 4);
        fire(self, 'readystatechange');
        fire(self, 'load');
        fire(self, 'loadend');
      }, 8);
    };

    proto.abort = function () {
      if (!this.__smMock) {
        try { return XHR.prototype.__nativeAbort && XHR.prototype.__nativeAbort.call(this); } catch (e) {}
        return undefined;
      }
      def(this, 'readyState', 4);
      def(this, 'status', 0);
      fire(this, 'abort');
      fire(this, 'loadend');
    };
  }

  /* ================= 6. 拦截 fetch ================= */
  if (window.fetch) {
    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (!shouldMock(url)) return nativeFetch.apply(this, arguments);

      var res = route(method, url, init && init.body);
      try {
        return Promise.resolve(new Response(res.text, {
          status: res.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }));
      } catch (e) {
        return Promise.resolve({
          ok: true, status: res.status,
          text: function () { return Promise.resolve(res.text); },
          json: function () { return Promise.resolve(JSON.parse(res.text)); }
        });
      }
    };
  }

  /* ================= 7. 图标兜底：把远端的附件请求换成本地图标 =================
     <img src="/api/global/gtc/files/download?attachmentId=xxx"> 走的是浏览器原生加载，
     XHR 拦不到，所以直接在 DOM 里改写 src。 */
  function fixIcons() {
    var imgs = document.querySelectorAll('img[src*="attachmentId="]');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.getAttribute('data-sm-fixed')) continue;
      var m = /attachmentId=([0-9a-fA-F\-]+)/.exec(img.getAttribute('src') || '');
      if (!m) continue;
      var local = ICON_MAP[m[1]];
      if (!local) continue;
      img.setAttribute('data-sm-fixed', '1');
      img.setAttribute('src', local);
    }
    /* 顺手修一下 background-image 里的 */
    var all = document.querySelectorAll('[style*="attachmentId="]');
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      if (el.getAttribute('data-sm-fixed')) continue;
      var s = el.getAttribute('style') || '';
      var m2 = /attachmentId=([0-9a-fA-F\-]+)/.exec(s);
      if (!m2) continue;
      var l2 = ICON_MAP[m2[1]];
      if (!l2) continue;
      el.setAttribute('data-sm-fixed', '1');
      el.setAttribute('style', s.replace(/url\(([^)]*attachmentId=[^)]*)\)/g, 'url(' + l2 + ')'));
    }
  }

  function startFix() {
    fixIcons();
    try {
      new MutationObserver(fixIcons).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style']
      });
    } catch (e) {}
    setTimeout(fixIcons, 500);
    setTimeout(fixIcons, 1500);
    setTimeout(fixIcons, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startFix);
  } else {
    startFix();
  }

  /* 调试开关：控制台看 __SM.isMock('http://x/api/a') */
  window.__SM = {
    version: '1.0',
    route: route,
    shouldMock: shouldMock,
    data: { USER: USER, DEPARTMENTS: DEPARTMENTS, AFFAIRS: AFFAIRS, ARC_LIST: ARC_LIST }
  };
})();
