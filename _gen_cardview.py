#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 detail.html 生成 card-view.js（把模板内联进去，纯静态可用）"""
import re, json, io, os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'detail.html')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'card-view.js')

html = open(SRC, encoding='utf-8').read()

m_style = re.search(r'<style>(.*?)</style>', html, re.S)
style = m_style.group(1) if m_style else ''

m_body = re.search(r'<body>(.*?)</body>', html, re.S)
body = m_body.group(1) if m_body else html


def js_tpl(s):
    """转成 JS 反引号模板字符串，转义反引号 / 反斜杠 / ${"""
    s = s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return s


def strip_script(b):
    """去掉 body 里的内联 script（折叠按钮逻辑单独写进新文件）"""
    return re.sub(r'<script>.*?</script>', '', b, flags=re.S)


# 注意：不要把 <script> 剥掉 —— 详情页的「展开 / 收起」绑定就在里面，
# 剥掉之后 btnCollapse 只是个空 div，点了没反应。
# body = strip_script(body)

HEAD = r'''/*!
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
  var CARD_STYLE = `<style>'''

TAIL = r'''</style>`;

  var CARD_BODY = `'''

MID = r'''`;

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
    /* 四级审批按流程进度分布：班主任 20% / 学工部管理员 45% / 学工部负责人 70% / 分管校长 95% */
    var approveT = new Date(startT.getTime() + durMs * 0.20);
    var t2 = new Date(startT.getTime() + durMs * 0.45);
    var t3 = new Date(startT.getTime() + durMs * 0.70);
    var t4 = new Date(startT.getTime() + durMs * 0.95);
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
    setT('tl2', fmtS(t2)); setT('op2Time', fmtS(t2));   /* 学工部中职学生管理人员 */
    setT('tl3', fmtS(t3)); setT('op3Time', fmtS(t3));   /* 学工部负责人 */
    setT('tl4', fmtS(t4)); setT('op4Time', fmtS(t4));   /* 分管校长 */
    if (item.reason) setT('reason', item.reason);       /* 请假原因：填了才覆盖 */
    if (result === '已驳回') setT('op4', '不同意');      /* 驳回时最后一级改为不同意 */

    /* 办理进度最后一步：用专属 data-t 精确替换，
       不能再用「第一个 li.extra」那种写法 —— 前面还有三级审批的 extra 节点 */
    setT('endStep', result);

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
'''

tpl_js = HEAD + js_tpl(style) + TAIL + js_tpl(body) + MID

open(OUT, 'w', encoding='utf-8').write(tpl_js)
print('written:', OUT, len(tpl_js), 'bytes')
