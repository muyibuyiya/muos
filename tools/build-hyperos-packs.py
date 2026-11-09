#!/usr/bin/env python3
"""从 HyperOS 4 固件抽取图标，生成 MUOS 可导入的图标包 JSON。

用法：
    python tools/build-hyperos-packs.py

输入（解包目录，可用环境变量覆盖）：
    HYPEROS_WORK  默认 D:\\hyperos\\_work
    需要 <work>/assets/out/system_ext/MiuiSystemUI.apk 与 <work>/_ex_apps/*.apk
输出：
    packs/hyperos-statusbar.json   状态栏图标包（w/b 两色）
    packs/hyperos-apps.json        应用图标包（真机彩色图标）
    D:\\hyperos\\icons-out\\        同一份副本
"""
import base64
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

from loguru import logger
logger.remove()

from androguard.core.apk import APK
from androguard.core.axml import AXMLPrinter
from PIL import Image

AND = '{http://schemas.android.com/apk/res/android}'
WORK = os.environ.get('HYPEROS_WORK', r'D:\hyperos\_work')
SYSTEMUI = os.path.join(WORK, 'assets', 'out', 'system_ext', 'MiuiSystemUI.apk')
EX_APPS = os.environ.get('HYPEROS_EX_APPS', r'D:\hyperos\_ex_apps')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'packs')
COPY_DIR = r'D:\hyperos\icons-out'

# 状态栏：MUOS 键 -> SystemUI 资源名（优先 24/20dp 的静态矢量）
STATUSBAR = {
    'wifi':     ['qs_detail_wifi_signal_3', 'ic_no_internet_wifi_signal_4'],
    'signal':   ['stat_sys_signal_4', 'stat_sys_signal_4_tint'],
    'bt':       ['ic_bt_bluetooth'],
    'alarm':    ['stat_sys_alarm', 'stat_sys_alarm_tint'],
    'airplane': ['ic_cc_qs_airplane_on'],
    'dnd':      ['ic_qs_dnd_on'],
    'torch':    ['vd_flashlight', 'ic_qs_lite_flashlight'],
}

# 应用：MUOS app id -> APK 文件名
APPS = {
    'settings': 'Settings.apk',
    'camera': 'MiuiCamera.apk',
    'phone': 'HyperPhone.apk',
    'messages': 'MiuiMms.apk',
    'contacts': 'MIUIContactsT.apk',
    'files': 'MIUIFileExplorer.apk',
    'photos': 'MiuiExtraPhoto.apk',
    'store': 'MIUISuperMarket.apk',
    'health': 'Healthkit.apk',
    'assistant': 'MIUIPersonalAssistantPhoneOS4.apk',
    'security': 'MIUISecurityCenter.apk',
    'theme': 'MIUIThemeManager.apk',
}


def read_axml(apk, path):
    xml = AXMLPrinter(apk.get_file(path)).get_xml()
    return xml.decode('utf-8', 'ignore') if isinstance(xml, bytes) else xml


def find_by_name(apk, name, want_xml=True):
    """资源条目名 -> APK 内真实文件路径"""
    suffix = '.xml' if want_xml else ''
    for p in apk.get_files():
        if not p.startswith('res/'):
            continue
        base = p.rsplit('/', 1)[-1]
        if base == name + '.xml' or base == name + '.png' or base == name + '.webp':
            return p
    for p in apk.get_files():
        if p.startswith('res/') and p.rsplit('/', 1)[-1].replace('$', '').startswith(name):
            return p
    return None


def value_name(apk, rid):
    """资源 id -> 条目名（drawable 通常返回 $name 或 name）"""
    arsc = apk.get_android_resources()
    confs = arsc.get_res_configs(rid)
    if not confs:
        return None
    v = confs[0][1].get_value()
    return v if isinstance(v, str) else None


def resolve_ref(apk, ref):
    m = re.match(r'@((?:0x)?[0-9a-fA-F]{8})', ref or '')
    if not m:
        return None
    return value_name(apk, int(m.group(1), 16))


def load_drawable_xml(apk, name):
    p = find_by_name(apk, name)
    if not p:
        return None
    xml = read_axml(apk, p)
    # animated-vector -> 跟随 android:drawable 指向的基础矢量
    m = re.search(r'android:drawable="@((?:0x)?[0-9a-fA-F]{8})', xml)
    if m:
        base = value_name(apk, int(m.group(1), 16))
        if base:
            p2 = find_by_name(apk, base)
            if p2:
                return read_axml(apk, p2)
    return xml


def resolve_color(apk, value):
    if not value:
        return None
    if value.startswith('#'):
        return argb_to_rgba(value)
    m = re.match(r'@((?:0x)?[0-9a-fA-F]{8})', value)
    if m:
        confs = apk.get_android_resources().get_res_configs(int(m.group(1), 16))
        if confs:
            v = confs[0][1].get_value()
            if isinstance(v, str) and v.startswith('#'):
                return argb_to_rgba(v)
    return None


def argb_to_rgba(v):
    v = v.lstrip('#')
    if len(v) == 8:
        a, r, g, b = v[0:2], v[2:4], v[4:6], v[6:8]
        return 'rgba(%d,%d,%d,%.3f)' % (int(r, 16), int(g, 16), int(b, 16), int(a, 16) / 255)
    if len(v) == 6:
        return '#' + v
    return None


def vector_parts(xml, color, apk=None, keep=False):
    """返回 (viewportW, viewportH, 内部 SVG 片段)"""
    root = ET.fromstring(xml)
    vw = float(root.get(AND + 'viewportWidth') or 24)
    vh = float(root.get(AND + 'viewportHeight') or vw)
    parts = []

    def walk(node):
        tag = node.tag
        if tag == 'group':
            attrs = ''
            tx = float(node.get(AND + 'translateX') or 0)
            ty = float(node.get(AND + 'translateY') or 0)
            sx = float(node.get(AND + 'scaleX') or 1)
            sy = float(node.get(AND + 'scaleY') or 1)
            rot = float(node.get(AND + 'rotation') or 0)
            px = node.get(AND + 'pivotX')
            py = node.get(AND + 'pivotY')
            if tx or ty:
                attrs += ' translate(%g %g)' % (tx, ty)
            if rot:
                if px is not None and py is not None:
                    attrs += ' rotate(%g %g %g)' % (rot, float(px), float(py))
                else:
                    attrs += ' rotate(%g)' % rot
            if sx != 1 or sy != 1:
                attrs += ' scale(%g %g)' % (sx, sy)
            parts.append('<g transform="%s">' % attrs if attrs else '<g>')
            for c in node:
                walk(c)
            parts.append('</g>')
        elif tag == 'path':
            d = node.get(AND + 'pathData')
            if not d:
                return
            fill = node.get(AND + 'fillColor')
            stroke = node.get(AND + 'strokeColor')
            sw = float(node.get(AND + 'strokeWidth') or 0)
            fa = node.get(AND + 'fillAlpha')
            sa = node.get(AND + 'strokeAlpha')
            fill_c = color
            stroke_c = color
            if keep and apk:
                fill_c = resolve_color(apk, fill) or color
                stroke_c = resolve_color(apk, stroke) or color
                # fill 指向另一个 drawable（常见于用矢量渐变铺底）：把它作为子 SVG 铺满画布
                if fill and fill.startswith('@'):
                    nm = resolve_ref(apk, fill)
                    sub_path = find_by_name(apk, nm) if nm else None
                    if sub_path and sub_path.endswith('.xml'):
                        sub_xml = read_axml(apk, sub_path)
                        if '<vector' in sub_xml:
                            svw, svh, sbody = vector_parts(sub_xml, color, apk, True)
                            parts.append('<svg width="%g" height="%g" viewBox="0 0 %g %g">%s</svg>'
                                         % (vw, vh, svw, svh, sbody))
                            return
            attrs = []
            if fill or not stroke:
                attrs.append('fill="%s"' % fill_c)
                if fa is not None:
                    attrs.append('fill-opacity="%s"' % float(fa))
            else:
                attrs.append('fill="none"')
            if stroke and sw:
                attrs.append('stroke="%s"' % stroke_c)
                attrs.append('stroke-width="%g"' % sw)
                attrs.append('stroke-linecap="round"')
                attrs.append('stroke-linejoin="round"')
                if sa is not None:
                    attrs.append('stroke-opacity="%s"' % float(sa))
            parts.append('<path d="%s" %s/>' % (d.strip(), ' '.join(attrs)))
        else:
            for c in node:
                walk(c)

    for c in root:
        walk(c)
    return vw, vh, ''.join(parts)


def vector_to_svg(xml, color, apk=None, keep=False):
    vw, vh, body = vector_parts(xml, color, apk, keep)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %g %g">%s</svg>'
            % (vw, vh, body))


def adaptive_svg(apk, layers):
    """把 adaptive-icon 的矢量层合成为一张 SVG（背景 + 前景）"""
    bg_rect = ''
    bg = layers.get('background')
    if bg:
        if bg[0] == 'color':
            c = argb_to_rgba(bg[1]) or '#000000'
            bg_rect = '<rect width="108" height="108" fill="%s"/>' % c
        elif bg[1].endswith('.xml'):
            vw, vh, body = vector_parts(read_axml(apk, bg[1]), '#000000', apk, True)
            bg_rect = '<svg width="108" height="108" viewBox="0 0 %g %g">%s</svg>' % (vw, vh, body)
    fg = layers.get('foreground')
    fg_svg = ''
    if fg:
        if fg[1].endswith('.xml'):
            vw, vh, body = vector_parts(read_axml(apk, fg[1]), '#000000', apk, True)
            fg_svg = '<svg width="108" height="108" viewBox="0 0 %g %g">%s</svg>' % (vw, vh, body)
        else:
            raw = apk.get_file(fg[1])
            url = base64.b64encode(raw).decode('ascii')
            fg_svg = '<image width="108" height="108" href="data:image/png;base64,%s"/>' % url
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">%s%s</svg>'
            % (bg_rect, fg_svg))


def data_url_svg(svg):
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')


def data_url_png(img):
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def build_statusbar():
    apk = APK(SYSTEMUI)
    icons = {}
    for key, names in STATUSBAR.items():
        xml = None
        for name in names:
            xml = load_drawable_xml(apk, name)
            if xml and '<vector' in xml:
                break
        if not xml or '<vector' not in xml:
            print('  MISS', key)
            continue
        w = vector_to_svg(xml, '#ffffff')
        b = vector_to_svg(xml, '#111111')
        icons[key] = {'w': data_url_svg(w), 'b': data_url_svg(b)}
        print('  OK  ', key, '<-', names[0])
    return {'name': 'HyperOS 4 状态栏图标（真机提取）',
            'author': 'MiuiSystemUI.apk · res/drawable', 'icons': icons}


def adaptive_layers(apk, xml):
    """解析 <adaptive-icon> 的 background/foreground"""
    layers = {}
    for node in ET.fromstring(xml):
        tag = node.tag
        if tag not in ('background', 'foreground', 'monochrome'):
            continue
        ref = node.get(AND + 'drawable')
        confs = apk.get_android_resources().get_res_configs(int(ref.lstrip('@'), 16)) if ref \
            and re.match(r'@[0-9a-fA-Fx]{8,}', ref) else []
        if confs:
            v = confs[0][1].get_value()
            if isinstance(v, str) and v.startswith('#'):
                layers[tag] = ('color', v)
                continue
            if isinstance(v, str):
                p = find_by_name(apk, v.replace('$', ''), want_xml=False)
                if p:
                    layers[tag] = ('file', p)
                    continue
        if ref and ref.startswith('@'):
            name = resolve_ref(apk, ref)
            if name:
                p = find_by_name(apk, name, want_xml=False)
                if p:
                    layers[tag] = ('file', p)
    return layers


def load_layer_image(apk, path, size):
    raw = apk.get_file(path)
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    return im.resize((size, size), Image.LANCZOS)


def app_icon_image(apk, size=192):
    icon = apk.get_app_icon()
    if not icon:
        return None
    if icon.endswith('.xml'):
        xml = read_axml(apk, icon)
        if '<adaptive-icon' not in xml:
            # vector launcher icon
            if '<vector' in xml:
                svg = vector_to_svg(xml, '#000000', apk, True)
                return ('svg', svg)
            return None
        layers = adaptive_layers(apk, xml)
        has_xml = any(v[0] == 'file' and v[1].endswith('.xml') for v in layers.values())
        if has_xml or not layers:
            return ('svg', adaptive_svg(apk, layers))
        base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        bg = layers.get('background')
        fg = layers.get('foreground')
        if bg:
            if bg[0] == 'color':
                c = bg[1]
                base = Image.new('RGBA', (size, size), parse_color(c))
            else:
                base = load_layer_image(apk, bg[1], size)
        if fg:
            if fg[0] == 'file':
                f = load_layer_image(apk, fg[1], size)
                base.alpha_composite(f)
        return ('img', base)
    raw = apk.get_file(icon)
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    # 方形居中缩放，避免非正方形图标被拉伸
    im.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return ('img', canvas)


def parse_color(c):
    c = c.lstrip('#')
    if len(c) == 8:
        r, g, b, a = (int(c[i:i + 2], 16) for i in (0, 2, 4, 6))
        return (r, g, b, a)
    if len(c) == 6:
        r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
        return (r, g, b, 255)
    return (255, 255, 255, 255)


def build_apps():
    out = {}
    for app_id, fname in APPS.items():
        path = os.path.join(EX_APPS, fname)
        if not os.path.exists(path):
            print('  MISS', app_id, fname)
            continue
        try:
            apk = APK(path)
            res = app_icon_image(apk)
        except Exception as e:
            print('  ERR ', app_id, e)
            continue
        if not res:
            print('  MISS', app_id, 'no icon')
            continue
        if res[0] == 'img':
            url = data_url_png(res[1])
        else:
            url = data_url_svg(res[1])
        out[app_id] = {'i': {'w': url, 'b': url}}
        print('  OK  ', app_id, '<-', fname)
    return {'name': 'HyperOS 4 应用图标（真机提取）',
            'author': 'HyperOS 4 系统应用 APK · launcher icon', 'apps': out}


def write_packs(sb, apps):
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(COPY_DIR, exist_ok=True)
    for name, data in (('hyperos-statusbar.json', sb), ('hyperos-apps.json', apps)):
        txt = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        for d in (OUT_DIR, COPY_DIR):
            with open(os.path.join(d, name), 'w', encoding='utf-8') as f:
                f.write(txt)
        print('  wrote %-24s %6.1f KB' % (name, len(txt.encode('utf-8')) / 1024))


if __name__ == '__main__':
    print('== 状态栏图标')
    sb = build_statusbar()
    print('== 应用图标')
    apps = build_apps()
    print('== 输出')
    write_packs(sb, apps)
    print('statusbar: %d, apps: %d' % (len(sb['icons']), len(apps['apps'])))