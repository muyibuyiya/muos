/* ============================================================
   把 One UI Asset Studio 图标包（Android VectorDrawable）
   转成 MUOS **状态栏**图标包 JSON。
   素材：OneUIProject/oneui-icons 提供的 material.zip（主要供个人导入使用）
   用法：
     1) 解压 material.zip，得到 materialicons/ 目录
     2) node tools/convert-oneui-pack.js <解压目录> [输出json]
   产物默认写到 open-iconpacks/oneui.json（已在 .gitignore 中忽略）
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { convert, findFile } = require('./lib-vectordrawable');

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