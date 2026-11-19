/* 转发到博客 - 前端逻辑
 * 1. 读取 Web Share Target 传来的 title/text/url（也支持手动 mode=manual）
 * 2. 生成符合 Chirpy Jekyll 主题的 Markdown（YAML front matter）
 * 3. 通过 GitHub Contents API 提交到仓库 _posts/ 目录
 * 令牌只存在 localStorage，不上传任何第三方。
 */
(function () {
  'use strict';

  // ---- 配置存储（仅本地） ----
  var CFG_KEY = 'share2blog_cfg_v1';
  var DEFAULT_CFG = {
    token: '',
    repo: 'JJportvila/junxin-blog',
    branch: 'main',
    postDir: '_posts'
  };

  function loadCfg() {
    try {
      var raw = localStorage.getItem(CFG_KEY);
      if (!raw) return Object.assign({}, DEFAULT_CFG);
      var o = JSON.parse(raw);
      return Object.assign({}, DEFAULT_CFG, o);
    } catch (e) {
      return Object.assign({}, DEFAULT_CFG);
    }
  }
  function saveCfg(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  // ---- DOM ----
  var $ = function (id) { return document.getElementById(id); };
  var form = $('postForm');
  var titleEl = $('title');
  var urlEl = $('url');
  var noteEl = $('note');
  var categoryEl = $('category');
  var tagsEl = $('tags');
  var submitBtn = $('submitBtn');
  var submitLabel = $('submitLabel');
  var statusLine = $('statusLine');
  var setupBanner = $('setupBanner');
  var setupPanel = $('setupPanel');
  var previewBox = $('previewBox');

  var cfg = loadCfg();

  // ---- 初始化：填入配置 ----
  $('token').value = cfg.token;
  $('repo').value = cfg.repo;
  $('branch').value = cfg.branch;
  $('postDir').value = cfg.postDir;

  function hasToken() { return !!(cfg.token && cfg.token.trim()); }
  function refreshBanner() { setupBanner.hidden = hasToken(); }

  // ---- 读取分享参数 ----
  // Web Share Target 以 GET 传参：?title=..&text=..&url=..
  // 有些来源把链接塞在 text 里，这里做归类。
  function prefillFromShare() {
    var q = new URLSearchParams(location.search);
    var t = q.get('title') || '';
    var u = q.get('url') || '';
    var text = q.get('text') || '';

    // 若 url 为空但 text 里含链接，抽出来当 url
    if (!u) {
      var m = text.match(/https?:\/\/[^\s]+/);
      if (m) {
        u = m[0];
        text = text.replace(m[0], '').trim();
      }
    }
    // 若标题为空，用 text 的第一行当标题
    if (!t && text) {
      var firstLine = text.split('\n')[0].trim();
      if (firstLine) {
        t = firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine;
        text = text.slice(firstLine.length).trim();
      }
    }

    if (t) titleEl.value = t;
    if (u) urlEl.value = u;
    if (text && !noteEl.value) noteEl.value = text;
  }

  prefillFromShare();
  refreshBanner();

  // ---- 工具函数 ----
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // 生成北京时间（UTC+8）时间戳，格式与现有文章一致：YYYY-MM-DD HH:MM:SS +0800
  function beijingNow() {
    var d = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    var bj = new Date(utc + 8 * 3600000);
    return bj.getFullYear() + '-' + pad(bj.getMonth() + 1) + '-' + pad(bj.getDate()) +
      ' ' + pad(bj.getHours()) + ':' + pad(bj.getMinutes()) + ':' + pad(bj.getSeconds()) + ' +0800';
  }

  function slugFromTitle(title) {
    // 中文保留，英文转小写，其余连字符；用于 URL 友好文件名
    var s = title.trim().toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return s || 'share';
  }

  function yamlQuote(s) {
    // 用双引号包裹并转义，避免 YAML 解析出错
    return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';
  }

  function parseList(s, fallback) {
    if (!s || !s.trim()) return fallback;
    return s.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // ---- 生成 Markdown（核心，可单测） ----
  function buildPost(data) {
    var dateStr = data.date || beijingNow();
    var cats = parseList(data.category, ['随笔']);
    var tagList = parseList(data.tags, ['分享', '新闻']);
    var catStr = '[' + cats.map(yamlQuote).join(', ') + ']';
    var tagStr = '[' + tagList.map(yamlQuote).join(', ') + ']';

    var lines = [];
    lines.push('---');
    lines.push('title: ' + yamlQuote(data.title));
    lines.push('date: ' + dateStr);
    lines.push('categories: ' + catStr);
    lines.push('tags: ' + tagStr);
    lines.push('lang: zh-CN');
    lines.push('---');
    lines.push('');

    if (data.url) {
      lines.push('> 原文链接：[' + data.url.replace(/[\[\]]/g, '') + '](' + data.url + ')');
      lines.push('');
    }
    if (data.note) {
      lines.push(data.note);
      lines.push('');
    }
    if (!data.url && !data.note) {
      lines.push('（分享转发，暂无短评。）');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
    lines.push('> 由「转发到博客」快捷分享生成。');

    return lines.join('\n') + '\n';
  }

  // 文件名：YYYY-MM-DD-slug.md（日期取 dateStr 前 10 位）
  function buildFilename(title, dateStr) {
    var day = (dateStr || beijingNow()).slice(0, 10);
    var slug = slugFromTitle(title);
    return day + '-' + slug + '.md';
  }

  // ---- 预览 ----
  var previewOn = false;
  function refreshPreview() {
    if (!previewOn) return;
    var md = buildPost({
      title: titleEl.value || '（标题）',
      url: urlEl.value.trim(),
      note: noteEl.value.trim(),
      category: categoryEl.value,
      tags: tagsEl.value
    });
    previewBox.textContent = md;
  }
  $('togglePreview').addEventListener('click', function () {
    previewOn = !previewOn;
    previewBox.hidden = !previewOn;
    $('togglePreview').textContent = previewOn ? '收起' : '展开';
    if (previewOn) refreshPreview();
  });
  [titleEl, urlEl, noteEl, categoryEl, tagsEl].forEach(function (el) {
    el.addEventListener('input', refreshPreview);
  });

  // ---- 配置面板交互 ----
  function openSetup() {
    setupPanel.hidden = false;
    setupPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('goSetupBtn').addEventListener('click', openSetup);
  $('openSetupFromHelp').addEventListener('click', openSetup);
  $('reinstallHint').addEventListener('click', function (e) {
    e.preventDefault();
    $('reinstallText').hidden = !$('reinstallText').hidden;
  });

  $('saveSetup').addEventListener('click', function () {
    cfg.token = $('token').value.trim();
    cfg.repo = $('repo').value.trim() || DEFAULT_CFG.repo;
    cfg.branch = $('branch').value.trim() || DEFAULT_CFG.branch;
    cfg.postDir = $('postDir').value.trim() || DEFAULT_CFG.postDir;
    saveCfg(cfg);
    refreshBanner();
    $('setupStatus').textContent = hasToken()
      ? '已保存。令牌只存在本设备，可以开始转发了。'
      : '已保存，但令牌为空 —— 发布前需要先填令牌。';
    $('setupStatus').style.color = hasToken() ? 'var(--ok)' : 'var(--warn)';
  });

  $('clearSetup').addEventListener('click', function () {
    cfg.token = '';
    saveCfg(cfg);
    $('token').value = '';
    refreshBanner();
    $('setupStatus').textContent = '令牌已从本设备清除。';
    $('setupStatus').style.color = 'var(--sub)';
  });

  // ---- 发布 ----
  function base64Utf8(str) {
    // 用 TextEncoder + btoa，正确处理中文
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function setBusy(busy, label) {
    submitBtn.disabled = busy;
    submitLabel.textContent = busy ? (label || '发布中…') : '发布到博客';
  }

  function showStatus(msg, color) {
    statusLine.textContent = msg;
    statusLine.style.color = color || 'var(--sub)';
  }

  async function publish() {
    if (!hasToken()) {
      showStatus('还没有配置 GitHub 令牌，请先点「去配置」。', 'var(--warn)');
      openSetup();
      return;
    }
    var title = titleEl.value.trim();
    if (!title) {
      showStatus('标题不能为空。', 'var(--warn)');
      titleEl.focus();
      return;
    }

    var dateStr = beijingNow();
    var md = buildPost({
      title: title,
      url: urlEl.value.trim(),
      note: noteEl.value.trim(),
      category: categoryEl.value,
      tags: tagsEl.value,
      date: dateStr
    });
    var filename = buildFilename(title, dateStr);
    var path = cfg.postDir.replace(/^\/+|\/+$/g, '') + '/' + filename;
    var api = 'https://api.github.com/repos/' + cfg.repo + '/contents/' + path;

    setBusy(true, '发布中…');
    showStatus('正在提交到 GitHub…');

    try {
      var res = await fetch(api, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + cfg.token,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'post: ' + title.slice(0, 60),
          content: base64Utf8(md),
          branch: cfg.branch
        })
      });

      var data = {};
      try { data = await res.json(); } catch (e) {}

      if (res.ok || res.status === 201) {
        var slug = filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
        var postUrl = 'https://blog.stret.net/posts/' + encodeURIComponent(slug) + '/';
        showStatus('发布成功！几十秒后见：' + postUrl, 'var(--ok)');
        // 成功后清空短评和链接，标题保留方便连续转发
        noteEl.value = '';
        urlEl.value = '';
        refreshPreview();
        try { window.open(postUrl, '_blank', 'noopener'); } catch (e) {}
      } else {
        var msg = data && data.message ? data.message : ('HTTP ' + res.status);
        if (res.status === 401 || res.status === 403) {
          msg = '令牌无效或权限不足：请确认 Contents 权限为 Read and write，且令牌未过期。';
        } else if (res.status === 422) {
          msg = '提交被拒绝：可能文件名冲突或内容格式有误（' + msg + '）。';
        } else if (res.status === 404) {
          msg = '仓库或分支找不到，请检查配置里的仓库名和分支。';
        }
        showStatus('发布失败：' + msg, 'var(--warn)');
      }
    } catch (err) {
      showStatus('网络错误：' + (err && err.message ? err.message : err), 'var(--warn)');
    } finally {
      setBusy(false);
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    publish();
  });

  // 注册 Service Worker（让 PWA 可安装、接收分享）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/share/sw.js').catch(function () {});
    });
  }

  // 暴露纯函数供自测（不影响正常流程）
  window.__share2blog = {
    buildPost: buildPost,
    buildFilename: buildFilename,
    beijingNow: beijingNow,
    slugFromTitle: slugFromTitle,
    yamlQuote: yamlQuote
  };
})();
