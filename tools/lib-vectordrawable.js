/* Android VectorDrawable → SVG 的工具函数（供 One UI 转换脚本共用）
   · 处理 #AARRGGBB：alpha=00 视为透明（关键，否则描边图标会被填成实心）
   · 保留 fillType=evenOdd、stroke 宽度与线帽/线接 */
const fs = require('fs');
const path = require('path');

function colorOf(v, tone) {
  if (!v) return null;
  if (/transparent|@null/i.test(v)) return null;
  var h = String(v).replace(/^#/, '');
  if (h.length === 8 && h.slice(0, 2).toLowerCase() === '00') return null;
  return tone;
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

module.exports = { colorOf, convert, findFile };