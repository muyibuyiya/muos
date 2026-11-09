/* ============================================================
   把 One UI Asset Studio 图标包里的**应用字形**转成 MUOS 应用图标包 JSON
   用法：node tools/convert-oneui-app-pack.js <materialicons 目录> [输出json]
   产物默认 open-iconpacks/oneui-apps.json（.gitignore 已忽略，仅本机使用）
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { convert, findFile } = require('./lib-vectordrawable');

const ROOT = path.resolve(__dirname, '..');
const srcDir = process.argv[2];
const outFile = process.argv[3] || path.join(ROOT, 'open-iconpacks/oneui-apps.json');

/* MUOS 应用 id → One UI 图标目录；未收录的应用回退默认图标 */
const MAP = {
  phone: 'oui_call',
  messages: 'oui_message',
  browser: 'oui_internet_website',
  camera: 'oui_camera',
  weather: 'oui_weather',
  clock: 'oui_time',
  photos: 'oui_image',
  calculator: 'oui_calculation',
  notes: 'oui_notes',
  calendar: 'oui_calendar',
  music: 'oui_music',
  contacts: 'oui_contact',
  health: 'oui_health',
  assistant: 'oui_bixby',
  settings: 'oui_settings',
  files: 'oui_folder',
  store: 'oui_galaxy_store',
  recorder: 'oui_record',
  maps: 'oui_location',
  game: 'oui_game',
  battery: 'oui_battery',
  about: 'oui_ab_app_info'
};

if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('用法：node tools/convert-oneui-app-pack.js <materialicons 目录> [输出json]');
  process.exit(1);
}

const apps = {}, missing = [];
Object.keys(MAP).forEach(id => {
  const f = findFile(srcDir, MAP[id]);
  if (!f) { missing.push(id + ' -> ' + MAP[id]); return; }
  const xml = fs.readFileSync(f, 'utf8');
  const w = convert(xml, '#ffffff');
  const b = convert(xml, '#111111');
  if (!w || !b) { missing.push(id + ' -> 解析失败'); return; }
  apps[id] = {
    i: {
      w: 'data:image/svg+xml;base64,' + Buffer.from(w).toString('base64'),
      b: 'data:image/svg+xml;base64,' + Buffer.from(b).toString('base64')
    }
  };
});

const pack = {
  name: 'One UI 应用字形（本机转换）',
  author: 'Samsung One UI icons · OneUIProject/oneui-icons',
  apps: apps
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(pack), 'utf8');
console.log('apps=' + Object.keys(apps).length + ' -> ' + outFile);
if (missing.length) console.log('未转换（回退默认）：' + missing.join(', '));