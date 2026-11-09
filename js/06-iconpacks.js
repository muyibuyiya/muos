/* ============================================================
   MUOS — 06-iconpacks.js
   图标包系统（叠加在 05-staticons.js 的雪碧图资源之上）
   · 内置三套线条图标：HyperOS / One UI / OriginOS 风格（按规范绘制）
   · 支持导入自定义图标包（JSON + PNG dataURL，仅存本机 localStorage）
   · 图标颜色随状态栏明暗（currentColor），无需双色素材
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S;
  var KEY = 'muos-iconpacks-v1';
  var baseSicon = NM.sicon || function () { return ''; };

  /* ---------- 内置线条图标（24×24 网格，圆角描边，颜色继承文字色） ---------- */
  var GLYPHS = {
    wifi: '<path d="M3.2 9.2a14 14 0 0 1 17.6 0"/>' +
      '<path d="M6.2 12.6a9.4 9.4 0 0 1 11.6 0"/>' +
      '<path d="M9.2 15.9a4.6 4.6 0 0 1 5.6 0"/>' +
      '<circle cx="12" cy="19.1" r="1.15" fill="currentColor" stroke="none"/>',
    signal: '<rect x="3" y="14.2" width="3" height="6.3" rx="1"/>' +
      '<rect x="8" y="10.6" width="3" height="9.9" rx="1"/>' +
      '<rect x="13" y="7" width="3" height="13.5" rx="1"/>' +
      '<rect x="18" y="3.4" width="3" height="17.1" rx="1" fill="currentColor" stroke="none"/>',
    bt: '<path d="M8.2 7.4 15.8 16.6 12 20.4V3.6l3.8 3.8L8.2 16.6"/>',
    dnd: '<path d="M20.2 14.9A8.6 8.6 0 0 1 9.1 3.8a8.6 8.6 0 1 0 11.1 11.1z" fill="currentColor" stroke="none"/>',
    torch: '<path d="M9.2 3h5.6l.9 5.1-1.5 1.6V21h-2.4V9.7L10 8.1z"/>' +
      '<path d="M10.6 6.4h2.8M10.6 3.9h2.8"/>',
    alarm: '<circle cx="12" cy="13.6" r="7.1"/>' +
      '<path d="M12 9.6v4.4l2.8 1.9M4.8 5.2 7.2 2.9M19.2 5.2 16.8 2.9"/>',
    airplane: '<path d="M12 2.8c.95 0 1.5 1.15 1.5 2.5l-.2 4.3 6.9 3.3v2.1l-6.9-1.6-.3 4.2 2 1.6v1.4L12 20l-3 .6v-1.4l2-1.6-.3-4.2-6.9 1.6v-2.1l6.9-3.3-.2-4.3c0-1.35.55-2.5 1.5-2.5z" fill="currentColor" stroke="none"/>',
    gps: '<path d="M12 21.2S5.2 15.2 5.2 9.8a6.8 6.8 0 1 1 13.6 0c0 5.4-6.8 11.4-6.8 11.4z"/>' +
      '<circle cx="12" cy="9.8" r="2.5"/>',
    charging: '<path d="M13.2 2 5.6 13.3h4.8L10.8 22l7.6-11.3h-4.8z" fill="currentColor" stroke="none"/>',
    nfc: '<path d="M6.4 4.6a11.8 11.8 0 0 1 0 14.8"/>' +
      '<path d="M10.2 7.3a7.6 7.6 0 0 1 0 9.4"/>' +
      '<path d="M14 10a3.6 3.6 0 0 1 0 4"/>' +
      '<circle cx="17.6" cy="12" r="1.15" fill="currentColor" stroke="none"/>'
  };
  /* 电池：轮廓 + 动态电量填充 + 正极 */
  function batteryGlyph(level) {
    var pct = Math.max(0, Math.min(100, level == null ? 100 : level)) / 100;
    var w = 2.1 + pct * 12.3;
    return '<rect x="2.4" y="7" width="17.2" height="10" rx="2.8"/>' +
      '<rect x="21" y="10.2" width="1.7" height="3.6" rx="0.85" fill="currentColor" stroke="none"/>' +
      (pct > 0 ? '<rect x="4.2" y="8.8" width="' + w.toFixed(2) + '" height="6.4" rx="1.4" fill="currentColor" stroke="none"/>' : '');
  }
  /* 文字型图标：HD / VoLTE / 5G */
  function textGlyph(label, size) {
    return '<rect x="2.4" y="6.6" width="19.2" height="10.8" rx="3"/>' +
      '<text x="12" y="14.4" text-anchor="middle" font-size="' + size +
      '" font-weight="700" fill="currentColor" stroke="none" font-family="inherit">' + label + '</text>';
  }
  var TEXTS = { hd: ['HD', 7.4], volte: ['VoLTE', 5.6], nr5g: ['5G', 8.2] };

  /* 三套风格：仅线宽与转角参数不同（符合各自规范的视觉密度） */
  var STYLES = {
    hyperos: { w: 1.7, cap: 'round', join: 'round' },   /* 小米：中等线宽、全圆角 */
    oneui: { w: 1.35, cap: 'round', join: 'round' },    /* 三星：更细的几何线条 */
    originos: { w: 2.05, cap: 'round', join: 'round' }  /* vivo：更饱满的笔画 */
  };
  function builtinSvg(name, style, opt) {
    var s = STYLES[style] || STYLES.hyperos;
    var body = name === 'battery' ? batteryGlyph(opt && opt.level)
      : (TEXTS[name] ? textGlyph(TEXTS[name][0], TEXTS[name][1]) : GLYPHS[name]);
    if (!body) return '';
    var vb = name === 'battery' ? '1.5 6 22 12' : '0 0 24 24';
    return '<svg class="sb-ico" viewBox="' + vb + '" fill="none" stroke="currentColor" stroke-width="' +
      s.w + '" stroke-linecap="' + s.cap + '" stroke-linejoin="' + s.join + '">' + body + '</svg>';
  }

  /* ---------- 自定义图标包（localStorage，仅本机） ---------- */
  var packs = [];
  try {
    packs = JSON.parse(W.localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(packs)) packs = [];
  } catch (e) { packs = []; }
  NM.ICON_PACKS = packs;
  function persist() {
    try { W.localStorage.setItem(KEY, JSON.stringify(packs)); }
    catch (e) { throw new Error('图标包过大，浏览器存储空间不足'); }
  }
  NM.getIconPacks = function () { return packs; };
  NM.findIconPack = function (id) {
    return packs.filter(function (p) { return p.id === id; })[0] || null;
  };
  NM.importIconPack = function (obj) {
    if (!obj || typeof obj !== 'object' || !obj.icons || typeof obj.icons !== 'object')
      throw new Error('格式不正确：需要 { name, icons: { 图标名: {w/b/c: dataURL} } }');
    var keys = Object.keys(obj.icons);
    if (!keys.length) throw new Error('图标包为空');
    var id = 'p' + Date.now().toString(36);
    packs.push({
      id: id,
      name: String(obj.name || '自定义图标包').slice(0, 40),
      author: String(obj.author || '').slice(0, 40),
      icons: obj.icons
    });
    persist();
    return id;
  };
  NM.deleteIconPack = function (id) {
    packs = packs.filter(function (p) { return p.id !== id; });
    NM.ICON_PACKS = packs;
    persist();
    if ((S.settings.iconPack || '') === 'pack:' + id) S.settings.iconPack = 'auto';
  };

  /* ---------- 取图标：内置风格 / 导入包 / 默认雪碧图 ---------- */
  NM.sicon = function (name, tone, opt) {
    var id = S.settings.iconPack || 'auto';
    /* auto：跟随界面风格（生命感美学 → HyperOS，清爽玻璃 → One UI，经典 → 系统素材） */
    if (id === 'auto') {
      var tp = S.settings.themePack || 'hyperos';
      id = tp === 'oneui' ? 'builtin:oneui' : tp === 'classic' ? 'default' : 'builtin:hyperos';
    }
    if (id.indexOf('builtin:') === 0) return builtinSvg(name, id.slice(8), opt);
    if (id.indexOf('pack:') === 0) {
      var pk = NM.findIconPack(id.slice(5));
      if (pk && pk.icons[name]) {
        var set = pk.icons[name];
        var url = set[tone] || set.w || set.b || set.c || '';
        return url ? '<img class="sb-ico" src="' + url + '" alt="">' : '';
      }
    }
    return baseSicon(name, tone, opt);
  };
})(window);