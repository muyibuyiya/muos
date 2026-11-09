/* ============================================================
   MUOS — 08-apppacks.js
   应用图标包：按应用 id 覆盖桌面字形（可选覆盖底色）
   · 不改默认样式；仅在 S.settings.appIconPack = pack:<id> 时生效
   · 包格式：{ name, author, apps: { 应用id: { i: {w,b}, bg: [c1,c2] } } }
   ============================================================ */
(function (W) {
  'use strict';
  var NM = W.NM, S = NM.S;
  var KEY = 'muos-apppacks-v1';
  var baseIconBox = NM.iconBox;

  var packs = [];
  try {
    packs = JSON.parse(W.localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(packs)) packs = [];
  } catch (e) { packs = []; }
  NM.APP_PACKS = packs;

  function persist() {
    try { W.localStorage.setItem(KEY, JSON.stringify(packs)); }
    catch (e) { throw new Error('图标包过大，浏览器存储空间不足'); }
  }
  NM.getAppPacks = function () { return packs; };
  NM.findAppPack = function (id) {
    return packs.filter(function (p) { return p.id === id; })[0] || null;
  };
  NM.importAppPack = function (obj) {
    if (!obj || typeof obj !== 'object' || !obj.apps || typeof obj.apps !== 'object')
      throw new Error('格式不正确：需要 { name, apps: { 应用id: { i: {w,b} } } }');
    if (!Object.keys(obj.apps).length) throw new Error('图标包为空');
    var id = 'a' + Date.now().toString(36);
    packs.push({
      id: id,
      name: String(obj.name || '自定义应用图标包').slice(0, 40),
      author: String(obj.author || '').slice(0, 40),
      apps: obj.apps
    });
    NM.APP_PACKS = packs;
    persist();
    return id;
  };
  NM.deleteAppPack = function (id) {
    packs = packs.filter(function (p) { return p.id !== id; });
    NM.APP_PACKS = packs;
    persist();
    if ((S.settings.appIconPack || '') === 'pack:' + id) S.settings.appIconPack = 'default';
  };
  function active() {
    var id = S.settings.appIconPack || 'default';
    return id.indexOf('pack:') === 0 ? NM.findAppPack(id.slice(5)) : null;
  }

  /* 覆盖 iconBox：命中包内应用时用位图字形，其余全部走原始实现 */
  NM.iconBox = function (app, size) {
    var pk = active();
    if (!pk || !app) return baseIconBox(app, size);
    var item = pk.apps[app.id];
    if (!item) return baseIconBox(app, size);
    var set = item.i || item.icon;
    if (!set) return baseIconBox(app, size);
    var url = typeof set === 'string' ? set : (set.w || set.b || '');
    if (!url) return baseIconBox(app, size);
    var s = size || 20;
    var bg = item.bg || null;
    var c1 = (bg && bg[0]) || app.c1, c2 = (bg && bg[1]) || app.c2;
    return '<span class="ic-box" style="background:linear-gradient(140deg,' + c1 + ',' + c2 + ')">' +
      '<img class="ic-glyph" src="' + url + '" alt="" style="width:' + s + 'px;height:' + s + 'px">' +
      '</span>';
  };

  /* 换包后重绘所有出现应用图标的位置 */
  NM.refreshAppIcons = function () {
    if (NM.renderPages) NM.renderPages();
    if (NM.renderDock) NM.renderDock();
    if (NM.renderDrawer) NM.renderDrawer();
    if (NM.renderEdge) NM.renderEdge();
    if (NM.renderStatusBarIcons) NM.renderStatusBarIcons();
  };
})(window);