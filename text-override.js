/* 页面文字替换引擎 —— 无需修改，配合 text-map.js 使用 */
(function () {
  var map = window.TEXT_MAP || {};
  var keys = Object.keys(map);
  if (!keys.length) return;

  function replace(str) {
    if (!str) return str;
    var out = str;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (out.indexOf(k) !== -1) out = out.split(k).join(map[k]);
    }
    return out;
  }
  function skip(node) {
    if (!node) return true;
    var t = node.tagName;
    return t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT';
  }
  function handleTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    if (skip(node.parentNode)) return;
    var t = node.nodeValue;
    if (!t || !t.trim()) return;
    var r = replace(t);
    if (r !== t) node.nodeValue = r;
  }
  // 同时处理 placeholder 的 attribute 与 property 两种写法
  function handlePlaceholder(el) {
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
    var ph = el.getAttribute ? el.getAttribute('placeholder') : null;
    var changed = false;
    if (ph) {
      var r = replace(ph);
      if (r !== ph) { el.setAttribute('placeholder', r); changed = true; }
    }
    // property 兜底（Vue 有时直接赋值 el.placeholder）
    if (typeof el.placeholder === 'string' && el.placeholder) {
      var rp = replace(el.placeholder);
      if (rp !== el.placeholder) { el.placeholder = rp; changed = true; }
    }
    return changed;
  }
  function process(root) {
    if (!root) return;
    if (root.nodeType === 3) { handleTextNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (skip(root)) return;
    handlePlaceholder(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n, list = [];
    while (n = w.nextNode()) list.push(n);
    for (var i = 0; i < list.length; i++) handleTextNode(list[i]);
    // 同时处理该节点下的所有 input/textarea 的 placeholder
    var inputs = [];
    if (root.getElementsByTagName) {
      try {
        var _i = root.getElementsByTagName('INPUT');
        var _t = root.getElementsByTagName('TEXTAREA');
        for (var a = 0; a < _i.length; a++) inputs.push(_i[a]);
        for (var b = 0; b < _t.length; b++) inputs.push(_t[b]);
      } catch (e) {}
    }
    for (var c = 0; c < inputs.length; c++) handlePlaceholder(inputs[c]);
  }
  function runAll() { process(document.body); }

  function start() {
    runAll();
    // 兜底：Vue 异步渲染完成后重跑一次
    setTimeout(runAll, 300);
    setTimeout(runAll, 1200);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) process(m.addedNodes[j]);
        } else if (m.type === 'attributes') {
          // 任意属性变化都重扫一次该节点，确保 placeholder 被替换
          process(m.target);
        }
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['placeholder'],
      characterData: false
    });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
