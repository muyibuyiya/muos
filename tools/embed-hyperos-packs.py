import json, io, os
sb = json.load(open(r'D:\huaweiai\muos\packs\hyperos-statusbar.json', encoding='utf-8'))
ap = json.load(open(r'D:\huaweiai\muos\packs\hyperos-apps.json', encoding='utf-8'))
out = []
out.append('/* ============================================================')
out.append('   MUOS · 09b-hyperos-packs.js（自动生成，勿手改）')
out.append('   素材：小米 14 Pro HyperOS 4 OS4.0.7.0.XPACNXM 固件解包')
out.append('   生成：tools/build-hyperos-packs.py -> tools/embed-hyperos-packs.py')
out.append('   说明：内置但非默认；设置 → 系统风格 → 图标包 / 应用图标包 里手动选择')
out.append('   ============================================================ */')
out.append('(function (W) {')
out.append('  var NM = W.NM;')
out.append('  NM.OPEN_PACKS = NM.OPEN_PACKS || {};')
out.append('  NM.OPEN_PACKS["hyperos"] = %s;' % json.dumps(
    {'name': 'HyperOS 真机（小米 14 Pro）', 'author': 'HyperOS 4 系统提取',
     'license': '系统素材', 'builtin': True, 'style': '实心图标 · 24dp 状态栏',
     'icons': sb['icons']}, ensure_ascii=False, separators=(',', ':')))
out.append('  NM.BUILTIN_APP_PACKS = NM.BUILTIN_APP_PACKS || {};')
out.append('  NM.BUILTIN_APP_PACKS["hyperos"] = %s;' % json.dumps(
    {'name': 'HyperOS 真机（小米 14 Pro）', 'author': 'HyperOS 4 系统应用提取',
     'builtin': True, 'apps': ap['apps']}, ensure_ascii=False, separators=(',', ':')))
out.append('})(window);')
txt = '\n'.join(out)
open(r'D:\huaweiai\muos\js\09b-hyperos-packs.js', 'w', encoding='utf-8').write(txt)
print('written', len(txt.encode('utf-8')) // 1024, 'KB')
