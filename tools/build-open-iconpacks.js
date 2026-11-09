/* ============================================================
   生成内置开源图标包数据：js/07-openpacks.js
   数据源（npm，需先安装）：
     @material-design-icons/svg  Apache-2.0  Material Symbols
     @tabler/icons               MIT         Tabler Icons
   用法：npm install --no-save @material-design-icons/svg @tabler/icons
         node tools/build-open-iconpacks.js
   产物：每个图标输出 w(白) / b(黑) 两个 dataURL（SVG）
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAT = path.join(ROOT, 'node_modules/@material-design-icons/svg/outlined');
const TAB = path.join(ROOT, 'node_modules/@tabler/icons/icons/outline');

const MAP_MATERIAL = {
  wifi: 'wifi', signal: 'signal_cellular_4_bar', bt: 'bluetooth',
  battery: 'battery_full', charging: 'battery_charging_full',
  alarm: 'alarm', dnd: 'do_not_disturb_on', torch: 'flashlight_on',
  airplane: 'airplanemode_active', gps: 'location_on', nfc: 'nfc',
  hd: 'hd', nr5g: '5g'
};
const MAP_TABLER = {
  wifi: 'wifi', signal: 'cell-signal-5', bt: 'bluetooth',
  battery: 'battery-4', charging: 'battery-charging',
  alarm: 'alarm', dnd: 'moon', torch: 'bulb',
  airplane: 'plane', gps: 'map-pin', nfc: 'nfc'
};

function recolor(svg, color) {
  if (svg.indexOf('currentColor') >= 0) return svg.split('currentColor').join(color);
  /* 无显式填充色的（Material）：在根节点注入 fill，子元素自然继承 */
  return svg.replace(/<svg\b([^>]*)>/, function (m, attrs) {
    if (/\bfill=/.test(attrs)) return m;
    return '<svg' + attrs + ' fill="' + color + '">';
  });
}
function payload(dir, file) {
  const p = path.join(dir, file + '.svg');
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8').replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ');
  const enc = c => 'data:image/svg+xml;base64,' +
    Buffer.from(recolor(raw, c), 'utf8').toString('base64');
  return { w: enc('#ffffff'), b: enc('#111111') };
}

function build(meta, dir, map) {
  const icons = {}, missing = [];
  Object.keys(map).forEach(k => {
    const v = payload(dir, map[k]);
    if (v) icons[k] = v; else missing.push(k + ' -> ' + map[k] + '.svg');
  });
  return { meta: meta, icons: icons, missing: missing };
}

if (!fs.existsSync(MAT) || !fs.existsSync(TAB)) {
  console.error('缺少素材包，请先执行：npm install --no-save @material-design-icons/svg @tabler/icons');
  process.exit(1);
}

const packs = {
  material: build({
    name: 'Material Symbols', author: 'Google', license: 'Apache-2.0',
    src: 'https://github.com/google/material-design-icons', style: '线条 / 官方 Material'
  }, MAT, MAP_MATERIAL),
  tabler: build({
    name: 'Tabler Icons', author: 'Tabler', license: 'MIT',
    src: 'https://github.com/tabler/tabler-icons', style: '线条 / 2px 圆头'
  }, TAB, MAP_TABLER)
};

let out = '/* ============================================================\n' +
  '   MUOS — 07-openpacks.js（自动生成，勿手改）\n' +
  '   由 tools/build-open-iconpacks.js 生成；图标授权见 THIRD-PARTY.md\n' +
  '   ============================================================ */\n' +
  '(function (W) {\n  var NM = W.NM;\n  NM.OPEN_PACKS = NM.OPEN_PACKS || {};\n';
Object.keys(packs).forEach(k => {
  const p = packs[k];
  out += '  NM.OPEN_PACKS[' + JSON.stringify(k) + '] = ' +
    JSON.stringify({ name: p.meta.name, author: p.meta.author, license: p.meta.license, src: p.meta.src, style: p.meta.style, icons: p.icons }) + ';\n';
  if (p.missing.length) console.warn('[' + k + '] 缺失：' + p.missing.join(', '));
  console.log('[' + k + '] ' + Object.keys(p.icons).length + ' 个图标');
});
out += '})(window);\n';
fs.writeFileSync(path.join(ROOT, 'js/07-openpacks.js'), out, 'utf8');
console.log('written js/07-openpacks.js ' + out.length + ' bytes');