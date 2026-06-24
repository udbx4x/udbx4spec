# Golden GeoText Bytes

本目录存放标准 GeoText 二进制 BLOB，用于验证各语言 Text / GeoText 编解码器的字节级一致性。

当前状态：首批最小 `.bin` 文件已经生成，并由 `manifest.json` 记录文本内容、样式、锚点、文件大小、SHA-256 和关键偏移。该资产用于编解码器级别的合规验证，不等同于完整 `compliance.udbx` 数据库。

## 目录结构

```text
golden-text-bytes/
├── README.md
├── manifest.json
└── geotext/
    └── simple-utf8.bin
```

## BLOB 格式说明

所有 GeoText 数据均为 Little-Endian：

```text
GeoHeader(geoType:int32, styleSize:int32) | subCount:int32 | TextStyle | GeoSubText[]
```

Text 数据集中的 `GeoHeader.styleSize` 固定为 `0`。字符串使用 `int32 byteLength + UTF-8 bytes`。颜色使用 ABGR 字节顺序。

完整布局见 [`../../docs/07-geotext-binary-layout.md`](../../docs/07-geotext-binary-layout.md)。

## 测试数据详情

### geotext/simple-utf8.bin

- 类型：Text / GeoText
- geoType：7
- styleSize：0
- subCount：1
- 字体：宋体
- 文本：河南省
- 锚点：`[113.165187569688, 33.875453985]`
- 旋转角：0 度
- 来源：从 `data/henan.udbx` / `河南省标签` / `SmID=1` 的真实样本结构抽取并最小化重建。

该文件是 T0 Golden Bytes，用于固定 GeoText 最小布局和 UTF-8 字符串编码规则。它不是 `henan.udbx` 原始记录发布，也不代表 `henan.udbx` 已通过 T3 Source-derived Fixture 公开准入。

## 生成 Golden Bytes

```bash
cd udbx4spec
node tools/generate-golden-text-bytes.mjs
```

## 验证方法

```bash
cd udbx4spec
node tools/check-fixtures.mjs
```

各语言实现应提供测试用例，读取这些 golden bytes 并验证解码结果与 `manifest.json` 中的预期文本、锚点、样式和旋转角一致。
