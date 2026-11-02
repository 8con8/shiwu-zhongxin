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


body = strip_script(body)

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

  /* ============ 字段替换 ============ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildHtml(item) {
    var name   = item.name   || '中职学生请假流程';
    var end    = item.end    || '';
    var cost   = item.cost   || '';
    var result = item.result || '已完成';

    var body = CARD_BODY;

    /* 请假结束时间 */
    body = body.replace(
      /(请假结束时间<\/div>\s*<div class="info-value">)[^<]*(<\/div>)/,
      '$1' + esc(end) + '$2'
    );

    /* 请假天数 */
    body = body.replace(
      /(请假天数<\/div>\s*<div class="info-value">)[^<]*(<\/div>)/,
      '$1' + esc(cost) + '$2'
    );

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
'''

tpl_js = HEAD + js_tpl(style) + TAIL + js_tpl(body) + MID

open(OUT, 'w', encoding='utf-8').write(tpl_js)
print('written:', OUT, len(tpl_js), 'bytes')
