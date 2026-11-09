# 字体包：MiSans VF（HyperOS 4 真机）

本目录存放可选的界面字体 **MiSans VF 4.009**，取自小米 14 Pro HyperOS OS4.0.7.0 的 `product/fonts/MiSansVF.ttf`，转成 woff2 供网页按需加载。

## 文件

| 文件 | 体积 | 说明 |
| --- | --- | --- |
| `MiSansVF.woff2` | 11.4 MB | 可变字体，`wght 150–700`（默认 330），29,773 字形 |

相比旧方案（Light/Regular/Demibold 三个静态文件，14 MB），单文件可变字体体积更小、字重连续，设置里的粗细滑条可直接 150–700、步进 10。

同一固件里还有 `MiSansL3.otf`（14 MB，60,340 字形，大字库补充），未打包进站点。

## 使用

设置 → 显示和亮度 → **字体样式和大小 → MiSans**（`S.settings.fontStyle = 'misans'`，写入 `html[data-font]`）。
粗细由 `S.settings.fontWeight`（150–700）写入 `--fw-ui` / `html[data-fw]`，`#display` 继承。
其它字体选项不会请求字体文件（`font-display: swap`，命中才加载）。

## 来源与许可

- 来源：小米 14 Pro HyperOS 4 固件 `product/fonts/MiSansVF.ttf`（版本 4.009）
- 官方页面：https://hyperos.mi.com/font/
- 许可：MiSans 字体许可协议（免费商用，禁止单独售卖字体文件）
