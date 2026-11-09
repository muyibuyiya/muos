# 字体包：MiSans

本目录存放可选的界面字体 **MiSans**（小米发布），以 woff2 形式按需加载。

## 文件

| 文件 | 字重 | 用途 |
| --- | --- | --- |
| `MiSans-Light.woff2` | 300 | 大标题、锁屏时间等细体文字 |
| `MiSans-Regular.woff2` | 400–500 | 正文与控件默认文字 |
| `MiSans-Demibold.woff2` | 600–800 | 强调文字、按钮标题 |

原始包提供 10 个字重（Thin / ExtraLight / Light / Normal / Regular / Medium / Demibold / Semibold / Bold / Heavy），每个 4.2–7.9 MB。
这里只保留 **3 个覆盖界面的字重**（约 14 MB），其余字重通过 `font-weight` 区间映射到最近的字重，避免把站点撑到 50 MB+。

## 使用

设置 → 显示和亮度 → **字体样式 → MiSans**（`S.settings.fontStyle = 'misans'`，写到 `html[data-font]`）。
切回「默认 / 圆润 / 衬线」时不会加载字体文件（`font-display: swap`，仅命中时才请求）。

## 来源与许可

- 官方页面：https://hyperos.mi.com/font/
- 许可：小米 MiSans 字体许可协议（免费商用，需遵守官方声明，不得单独售卖字体文件）
- 本仓库仅随站点提供上述 3 个 woff2 供界面渲染使用；如需完整字重请从官方渠道获取。