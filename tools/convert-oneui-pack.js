/* ============================================================
   把 One UI Asset Studio 图标包（Android VectorDrawable）
   转成 MUOS 图标包 JSON。
   素材：OneUIProject/oneui-icons 提供的 material.zip（主要供个人导入使用）
   用法：
     1) 解压 material.zip，得到 materialicons/ 目录
     2) node tools/convert-oneui-pack.js <解压目录> [输出json]
   产物默认写到 open-iconpacks/oneui.json（已在 .gitignore 中忽略）
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const srcDir = process.argv[2];
const outFile = process.argv[3] || path.join(ROOT, 'open-iconpacks/oneui.json');

/* MUOS 图标名 → One UI 图标目录名（缺项会回退内置图标） */
const MAP = {
  wifi: 'oui_wifi',
  bt: 'oui_bluetooth',
  battery: 'oui_battery',
  charging: 'oui_charging',
  alarm: 'oui_alarm',
  dnd: 'oui_do_not_disturb',
  torch: 'oui_flashlight',
  airplane: 'oui_airplane_mode',
  gps: 'oui_current_location',
  nfc: 'oui_nfc'
};

function colorOf(v, tone) {
  if (!v) return null;
  if (/transparent|@null/i.test(v)) return null;
  /* Android 颜色可能是 #RRGGBB 或 #AARRGGBB；alpha=00 视为完全透明 */
  var h = String(v).replace(/^#/, '');
  if (h.length === 8 && h.slice(0, 2).toLowerCase() === '00') return null;
  return tone; /* 其余不透明色统一替换为目标色 */
}

function convert(xml, tone) {
  const vbW = (/android:viewportWidth="([\d.]+)"/.exec(xml) || [, '24'])[1];
  const vbH = (/android:viewportHeight="([\d.]+)"/.exec(xml) || [, '24'])[1];
  const paths = [];
  const re = /<path\b([^>]*)>/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const d = (/android:pathData="([^"]+)"/.exec(attrs) || [])[1];
    if (!d) continue;
    const fill = colorOf((/android:fillColor="([^"]+)"/.exec(attrs) || [])[1], tone);
    const stroke = colorOf((/android:strokeColor="([^"]+)"/.exec(attrs) || [])[1], tone);
    const sw = (/android:strokeWidth="([^"]+)"/.exec(attrs) || [])[1];
    const fa = (/android:fillAlpha="([^"]+)"/.exec(attrs) || [])[1];
    const sa = (/android:strokeAlpha="([^"]+)"/.exec(attrs) || [])[1];
    const type = (/android:fillType="([^"]+)"/.exec(attrs) || [])[1];
    const cap = (/android:strokeLineCap="([^"]+)"/.exec(attrs) || [])[1];
    const join = (/android:strokeLineJoin="([^"]+)"/.exec(attrs) || [])[1];
    let s = '<path d="' + d.trim().replace(/\s+/g, ' ') + '"';
    s += ' fill="' + (fill || 'none') + '"';
    if (type && /evenodd/i.test(type)) s += ' fill-rule="evenodd"';
    if (fa && +fa < 1) s += ' fill-opacity="' + fa + '"';
    if (stroke) {
      s += ' stroke="' + stroke + '"';
      if (sw) s += ' stroke-width="' + sw + '"';
      if (cap) s += ' stroke-linecap="' + cap.toLowerCase() + '"';
      if (join) s += ' stroke-linejoin="' + join.toLowerCase() + '"';
      if (sa && +sa < 1) s += ' stroke-opacity="' + sa + '"';
    }
    s += '/>';
    paths.push(s);
  }
  if (!paths.length) return null;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vbW + ' ' + vbH +
    '" width="24" height="24">' + paths.join('') + '</svg>';
}

function findFile(dir, name) {
  const base = path.join(dir, name);
  if (!fs.existsSync(base)) return null;
  const f = fs.readdirSync(base).filter(x => /\.xml$/i.test(x))[0];
  return f ? path.join(base, f) : null;
}

if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('用法：node tools/convert-oneui-pack.js <materialicons 目录> [输出json]');
  process.exit(1);
}

const icons = {}, missing = [];
Object.keys(MAP).forEach(k => {
  const f = findFile(srcDir, MAP[k]);
  if (!f) { missing.push(k + ' -> ' + MAP[k]); return; }
  const xml = fs.readFileSync(f, 'utf8');
  const w = convert(xml, '#ffffff');
  const b = convert(xml, '#111111');
  if (!w || !b) { missing.push(k + ' -> 解析失败'); return; }
  icons[k] = {
    w: 'data:image/svg+xml;base64,' + Buffer.from(w).toString('base64'),
    b: 'data:image/svg+xml;base64,' + Buffer.from(b).toString('base64')
  };
});

const pack = {
  name: 'One UI（本机转换）',
  author: 'Samsung One UI icons · OneUIProject/oneui-icons',
  icons: icons
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(pack), 'utf8');
console.log('icons=' + Object.keys(icons).length + ' -> ' + outFile);
if (missing.length) console.log('未转换（回退内置）：' + missing.join(', '));