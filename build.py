"""把分模块的源码重新构建成单文件 standalone.html（双击即可运行）。
改完 app.css 或 js/*.js 后执行：python build.py
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
ORDER = ['js/00-core.js', 'js/05-staticons.js', 'js/06-iconpacks.js', 'js/07-openpacks.js', 'js/10-system.js', 'js/20-apps.js', 'js/30-more-apps.js',
         'js/35-native-apps.js', 'js/40-settings.js', 'js/45-device.js',
         'js/50-home.js', 'js/60-motion.js', 'js/90-boot.js']


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


html = read('index.html')
css = read('app.css')
js = '\n\n'.join('/* ==== %s ==== */\n%s' % (os.path.basename(f), read(f)) for f in ORDER)
assert '</script' not in js.lower(), 'JS 中出现了 </script>'
assert '</style' not in css.lower(), 'CSS 中出现了 </style>'

out = html.replace('<link rel="stylesheet" href="app.css">', '<style>\n' + css + '\n</style>')
for f in ORDER:
    out = out.replace('<script src="%s"></script>' % f, '')
out = out.replace('</body>', '<script>\n' + js + '\n</script>\n</body>')
assert '<script src=' not in out

with open(os.path.join(ROOT, 'standalone.html'), 'w', encoding='utf-8') as f:
    f.write(out)
print('built standalone.html:', len(out.encode('utf-8')), 'bytes')
