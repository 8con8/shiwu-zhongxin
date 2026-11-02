/*!
 * card-view.js — 卡片详情页（页内浮层，纯静态可用）
 * ------------------------------------------------------------------
 * 替代原来的 card-<id>.html 文件跳转：
 *   以前靠 python 服务 POST /__make_card 写出独立 HTML，静态托管下必然 404。
 *   现在改为在当前页面里用 iframe + srcdoc 渲染同款详情页，零文件依赖。
 *
 * 模板源自 detail.html（样式与结构 1:1 保留），改版式改下面的 CARD_STYLE / CARD_BODY。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.__openCardView) return;

  /* ============ 模板（来自 detail.html） ============ */
  var CARD_STYLE = `<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
    background: #fff;
    max-width: 497px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex; flex-direction: column;
    color: #333;
  }

  /* ===== 应用导航栏 ===== */
  .navbar {
    background: #fbfbfb;
    padding: 10px 16px 6px;
    text-align: center;
    position: relative;
    border-bottom: 1px solid #ececec;
  }
  .navbar .close {
    position: absolute; left: 16px; top: 13px;
    font-size: 22px; font-weight: 300; color: #111; line-height: 1;
    text-decoration: none;
  }
  .navbar .more {
    position: absolute; right: 16px; top: 14px;
    display: flex; gap: 4px;
  }
  .navbar .more i {
    width: 5px; height: 5px; border-radius: 50%;
    background: #111; display: block;
  }
  .navbar h1 { font-size: 17px; font-weight: 600; color: #111; }
  .navbar .url { font-size: 11px; color: #8e8e93; margin-top: 3px; }

  /* ===== 蓝色状态条 ===== */
  .status-bar {
    background: #4285f4;
    color: #fff;
    display: flex; justify-content: space-between; align-items: center;
    height: 38px;
    padding: 0 14px;
    font-size: 15px;
  }
  .status-bar .left { display: flex; align-items: center; gap: 7px; }
  .pin-icon { width: 15px; height: 15px; flex-shrink: 0; }
  .status-bar .right { font-size: 14px; }

  /* 收起上方的分隔横线 */
  .divider { height: 1px; background: #e5e5e5; margin: 0 16px; }

  /* ===== 表单区 ===== */
  .form-list { background: #fff; }
  .form-item {
    display: flex;
    border-bottom: 1px solid #eee;
    position: relative;
  }
  .form-item .form-label {
    width: 96px; flex-shrink: 0;
    padding: 10px 2px 10px 12px;
    font-size: 14px; color: #111; line-height: 1.6;
  }
  .form-item .form-content {
    flex: 1; padding: 9px 14px 11px 16px;
    font-size: 14px; color: #111;
  }
  .form-item .handle {
    color: #34a853; font-size: 14px;
    position: absolute; right: 14px;
  }
  .form-content .sub { color: #9a9a9a; font-size: 13.5px; margin-top: 7px; }

  .gap { height: 6px; background: #fff; }

  /* ===== 申请单页面 ===== */
  .page-title {
    background: #f2f2f4;
    text-align: center;
    font-size: 20px; font-weight: 600; color: #111;
    padding: 20px 0 22px;
  }
  .section-head {
    background: #fff;
    padding: 12px 12px;
    font-size: 15px; color: #111;
    border-bottom: 1px solid #e5e5e5;
    border-top: 1px solid #e5e5e5;
  }
  .info-item {
    display: flex;
    background: #fff;
    border-bottom: 1px solid #e5e5e5;
  }
  .info-item .info-label {
    width: 110px; flex-shrink: 0;
    padding: 13px 4px 13px 12px;
    font-size: 15px; color: #333; line-height: 1.55;
  }
  .info-item .info-label .req { color: #e53935; margin-right: 2px; }
  .info-item .info-value {
    flex: 1;
    padding: 13px 14px 13px 0;
    font-size: 15px; color: #333;
  }

  /* ===== 办理进度卡片 ===== */
  .progress-card {
    background: #fff;
    padding: 12px 16px 0;
  }
  .progress-title {
    display: flex; align-items: center; gap: 9px;
    font-size: 15px; font-weight: 600; color: #111;
  }
  .progress-title::before {
    content: ""; width: 4px; height: 15px;
    background: #4285f4; border-radius: 3px;
  }
  
  .timeline { list-style: none; margin-top: 16px; }
  
  .timeline li {
    position: relative;
    padding-left: 18px;
    padding-bottom: 16px; /* 节点间距 */
  }
  .timeline li:last-child { padding-bottom: 10px; }
  
  .timeline li::before {
    content: ""; position: absolute; left: 0; top: 4px;
    width: 8px; height: 8px; border-radius: 50%;
    background: #34a853;
    z-index: 1;
  }
  
  /* 🌟 核心修复：定义好上下安全区（留白），利用 margin 自动完美居中 */
  .timeline li::after {
    content: ""; 
    position: absolute; 
    left: 3.5px; 
    width: 1px;
    background: #6fbf87;
    border-radius: 1px;
    
    top: 14px; /* 距离上方绿球底部有 2px 空隙 */
    bottom: 6px; /* 距离下方绿球顶部有 2px 空隙 */
    margin: auto 0; /* 在这段安全区内自动垂直居中 */
  }

  /* 🌟 第二、三根线：长度保持原样（22px），完美居中 */
  .timeline li:not(:first-child)::after {
    height: 22px; 
  }

  /* 🌟 第一根线：稍微加长（12px），完美居中 */
  .timeline li:first-child::after {
    height: 12px; 
  }

  .timeline li:last-child::after { display: none; }
  
  .timeline .step-name { 
    font-size: 14px; 
    color: #111; 
    font-weight: 500; 
    line-height: 20px; 
  }
  
  .timeline .detail {
    display: flex; justify-content: space-between;
    margin-top: 6px; 
    padding-left: 0; 
    font-size: 13px; color: #9a9a9a;
    line-height: 18px;
  }
  
  /* 强制数字等宽，右侧时间对齐 */
  .timeline .detail span:last-child {
    font-variant-numeric: tabular-nums; 
    font-feature-settings: "tnum";
    text-align: right;
  }

  /* 默认折叠 */
  .timeline li.extra { display: none; }
  .timeline.expanded li.extra { display: block; }
  
  /* 折叠时第三步下方不显示绿线 */
  .timeline:not(.expanded) li:nth-child(3)::after { display: none !important; }

  /* ===== 三个点精确对齐 ===== */
  .dots {
    display: flex;
    align-items: center;
    padding-left: 2px; 
    padding-top: 2px;
    padding-bottom: 10px;
  }
  .dots i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #4a4a4a;
    display: block;
    flex-shrink: 0;
  }
  .dots i + i {
    margin-left: 4px; 
  }

  /* ===== 展开/收起按钮 ===== */
  .collapse {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #4285f4;
    font-size: 14px;
    padding: 8px 0 14px;
    cursor: pointer;
  }
  .collapse .chev { 
    width: 14px; 
    height: 14px; 
    margin-right: 4px; 
    transition: transform .2s; 
  }
  .collapse.closed .chev { 
    transform: rotate(180deg); 
  }

  /* ===== 底部按钮 ===== */
  .footer {
    margin-top: auto;
    background: #fff;
    padding: 8px 12px 4px;
  }
  .btn-circulate {
    display: block; width: 100%;
    background: #4285f4; color: #fff;
    border: none; border-radius: 6px;
    height: 42px;
    font-size: 16px; letter-spacing: 6px; text-indent: 6px;
    cursor: pointer;
  }
  .btn-circulate:active { background: #3372dd; }

  .home-indicator {
    width: 134px; height: 5px; border-radius: 3px;
    background: #1a1a1a;
    margin: 10px auto 8px;
  }
</style>`;

  var CARD_BODY = `

  <div class="status-bar">
    <span class="left"><svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>已结束</span>
    <span class="right">流转记录</span>
  </div>

  <div class="page-title">中职学生申请单</div>

  <div class="section-head">申请信息</div>
  <div class="info-item">
    <div class="info-label">申请人</div>
    <div class="info-value">谢哮</div>
  </div>
  <div class="info-item">
    <div class="info-label">申请时间</div>
    <div class="info-value" data-t="applyTime">2026-10-31 10:06</div>
  </div>
  <div class="info-item">
    <div class="info-label">学号</div>
    <div class="info-value">511321200902288919</div>
  </div>
  <div class="info-item">
    <div class="info-label">部门</div>
    <div class="info-value">中职部</div>
  </div>
  <div class="info-item">
    <div class="info-label"><span class="req">*</span>联系电话</div>
    <div class="info-value">13550584615</div>
  </div>
  <div class="info-item">
    <div class="info-label">班级</div>
    <div class="info-value">2024级医学检验技术3班</div>
  </div>
  <div class="info-item">
    <div class="info-label"><span class="req">*</span>请假开始时间</div>
    <div class="info-value" data-t="leaveStart">2026-10-31</div>
  </div>
  <div class="info-item">
    <div class="info-label"><span class="req">*</span>请假结束时间</div>
    <div class="info-value" data-t="leaveEnd">2026-10-31</div>
  </div>
  <div class="info-item">
    <div class="info-label"><span class="req">*</span>请假天数</div>
    <div class="info-value" data-t="leaveDays">1</div>
  </div>
  <div class="info-item">
    <div class="info-label"><span class="req">*</span>请假原因</div>
    <div class="info-value" data-t="reason">感冒发烧咽痛</div>
  </div>
  <div class="info-item" style="border-bottom:none;">
    <div class="info-label">附件上传</div>
    <div class="info-value"></div>
  </div>

  <div class="section-head" style="margin-top:8px;">审批信息</div>

  <div class="form-list">
    <div class="form-item">
      <div class="form-label">班主任意见</div>
      <div class="form-content">
        <a class="handle" href="javascript:;">办理</a>
        <div>同意</div>
        <div class="sub">李永熙</div>
        <div class="sub" data-t="approveTime">2026-10-30 10:10:46</div>
      </div>
    </div>
    <div class="form-item">
      <div class="form-label">学工部中职学生管理人员意见</div>
      <div class="form-content"></div>
    </div>
    <div class="form-item">
      <div class="form-label">学工部负责人意见</div>
      <div class="form-content"></div>
    </div>
    <div class="form-item" style="border-bottom:none;">
      <div class="form-label">分管校长意见</div>
      <div class="form-content"></div>
    </div>
  </div>

  <div class="gap"></div>

  <div class="progress-card">
    <div class="progress-title">办理进度</div>
    <ul class="timeline">
      <li>
        <div class="step-name">开始</div>
      </li>
      <li>
        <div class="step-name">申请</div>
        <div class="detail"><span>谢哮</span><span data-t="tlApply">2026-10-30 10:06:36</span></div>
      </li>
      <li>
        <div class="step-name">班主任意见</div>
        <div class="detail"><span>李永熙</span><span data-t="tlApprove">2026-10-30 10:10:46</span></div>
      </li>
      <li class="extra">
        <div class="step-name">已结束</div>
      </li>
    </ul>
    
    <div class="dots" id="dots"><i></i><i></i><i></i></div>
    <div class="divider"></div>
    
    <div class="collapse closed" id="btnCollapse">
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>
      <span id="collapseText">展开</span>
    </div>
  </div>

  

  <div class="footer">
    <button class="btn-circulate">传阅</button>
    <div class="home-indicator"></div>
  </div>

`;

  /* ============ 时间推算 ============ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function parseTime(s) {
    var m = /(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s || ''));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 9), +(m[5] || 0), +(m[6] || 0));
  }

  /* "2天" / "1天4小时" / "4小时" / "90分钟" 统一折成毫秒 */
  function parseDuration(s) {
    var t = String(s || '');
    var ms = 0, hit = false;
    var d  = /(\d+(?:\.\d+)?)\s*天/.exec(t);
    if (d)  { ms += parseFloat(d[1])  * 86400000; hit = true; }
    var h  = /(\d+(?:\.\d+)?)\s*(?:小时|时)/.exec(t);
    if (h)  { ms += parseFloat(h[1])  * 3600000;  hit = true; }
    var mi = /(\d+(?:\.\d+)?)\s*分/.exec(t);
    if (mi) { ms += parseFloat(mi[1]) * 60000;    hit = true; }
    return hit ? ms : 0;
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtD(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtM(d) { return fmtD(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function fmtS(d) { return fmtM(d) + ':' + pad2(d.getSeconds()); }

  function buildHtml(item) {
    var name   = item.name   || '中职学生请假流程';
    var end    = item.end    || '';
    var cost   = item.cost   || '';
    var result = item.result || '已完成';

    var body = CARD_BODY;

    /* 用「完结时间 − 总耗时」反推申请时间，让整页时间自洽。
       模板里原本 7 个日期全是写死的示例值（申请 10-31、审批 10-30、时间线只差 4 分钟），
       跟卡片上的「总耗时 2天」完全对不上，这里全部按真实数据算。 */
    var endT  = parseTime(end) || new Date();
    var durMs = parseDuration(cost);
    if (!durMs || durMs < 60000) durMs = 4 * 3600000;           /* 解析不出来按 4 小时兜底 */

    /* 表单里填了真实开始时间就照用；老数据没有才用「完结 − 耗时」反推 */
    var realStart = parseTime(item.start || '');
    var startT   = realStart || new Date(endT.getTime() - durMs);
    if (realStart && endT > realStart) durMs = endT.getTime() - realStart.getTime();
    var approveT = new Date(startT.getTime() + durMs * 0.65);   /* 班主任审批落在流程 65% 处 */
    var days     = Math.max(1, Math.round((endT.getTime() - startT.getTime()) / 86400000));

    function setT(key, val) {
      body = body.replace(
        new RegExp('(data-t="' + key + '">)[^<]*(<)', 'g'),
        '$1' + esc(val) + '$2'
      );
    }

    setT('applyTime',   fmtM(startT));     /* 申请时间 */
    setT('leaveStart',  fmtD(startT));     /* 请假开始 = 申请当天 */
    setT('leaveEnd',    fmtD(endT));       /* 请假结束 = 卡片上的完结时间 */
    setT('leaveDays',   String(days));     /* 请假天数 = 总耗时折算 */
    setT('approveTime', fmtS(approveT));   /* 审批意见区的时间 */
    setT('tlApply',     fmtS(startT));     /* 时间线：申请 */
    setT('tlApprove',   fmtS(approveT));   /* 时间线：班主任意见 */
    if (item.reason) setT('reason', item.reason);   /* 请假原因：填了才覆盖 */

    /* 办理进度最后一步 */
    body = body.replace(
      /(<li class="extra">\s*<div class="step-name">)[^<]*(<\/div>)/,
      '$1' + esc(result) + '$2'
    );

    /* 卡片 ID 徽标（插在蓝色状态条右边） */
    var cid = (item.cardNo != null && item.cardNo !== '') ? item.cardNo
            : (item.id != null && item.id !== '' ? item.id : '');
    if (cid !== '') {
      var label = (String(cid) === 'orig') ? '原始记录' : ('卡片 ' + cid);
      body = body.replace(
        /(<span class="right">)([^<]*)(<\/span>)/,
        function (m, a, b, c) { return a + b + ' · ' + label + c; }
      );
    }

    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
      '<title>' + esc(name) + '</title>' + CARD_STYLE + '</head><body>' +
      body + '</body></html>';
  }

  /* ============ 浮层 ============ */
  var root = null;

  function close() {
    if (!root) return;
    root.parentNode && root.parentNode.removeChild(root);
    root = null;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function open(item) {
    if (!item) item = {};
    close();

    root = document.createElement('div');
    root.id = '__cardView';
    root.style.cssText = [
      'position:fixed', 'left:0', 'top:0', 'right:0', 'bottom:0',
      'z-index:100002', 'background:#fff',
      'display:flex', 'flex-direction:column',
      '-webkit-overflow-scrolling:touch'
    ].join(';');

    var bar = document.createElement('div');
    bar.style.cssText = [
      'flex:none', 'height:46px', 'display:flex', 'align-items:center',
      'padding:0 6px', 'background:#fbfbfb', 'border-bottom:1px solid #ececec',
      'box-sizing:border-box'
    ].join(';');

    var back = document.createElement('div');
    back.textContent = '‹ 返回';
    back.style.cssText = 'font-size:16px;color:#4285f4;padding:10px 12px;cursor:pointer;user-select:none;';
    back.onclick = function () { close(); };

    var title = document.createElement('div');
    title.textContent = item.name || '中职学生请假流程';
    title.style.cssText = 'flex:1;text-align:center;font-size:16px;font-weight:500;color:#111;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    var spacer = document.createElement('div');
    spacer.style.cssText = 'width:64px;flex:none;';

    bar.appendChild(back);
    bar.appendChild(title);
    bar.appendChild(spacer);

    var frame = document.createElement('iframe');
    frame.setAttribute('frameborder', '0');
    frame.style.cssText = 'flex:1;width:100%;border:0;display:block;background:#fff;';

    root.appendChild(bar);
    root.appendChild(frame);
    document.body.appendChild(root);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    var html = buildHtml(item);
    try {
      frame.srcdoc = html;
    } catch (e) {
      /* 极老 WebView 不支持 srcdoc：退化为 document.write */
      var doc = frame.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
    }
  }

  window.__openCardView = open;
  window.__closeCardView = close;

  /* 物理返回键 / popstate 时关掉浮层 */
  window.addEventListener('popstate', function () {
    if (root) close();
  });
})();
