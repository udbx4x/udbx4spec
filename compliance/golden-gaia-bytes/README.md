# Golden GAIA Bytes

本目录用于存放标准 GAIA 二进制 BLOB，用于验证各语言编解码器输出字节级一致。

当前状态：首批最小 `.bin` 文件已经生成，并由 `manifest.json` 记录几何内容、SRID、bbox、文件大小、SHA-256 和 GAIA 头部信息。该资产用于编解码器级别的合规验证，不等同于完整 `compliance.udbx` 数据库。

## 文件说明

### 目录结构

```
golden-gaia-bytes/
├── README.md                          # 本文件
├── manifest.json                      # 机器可读清单
├── point-2d/
│   └── simple.bin                     # 简单 2D 点
├── point-3d/
│   └── simple.bin                     # 简单 3D 点
├── multilinestring-2d/
│   └── simple.bin                     # 简单 2D 多线
├── multilinestring-3d/
│   └── simple.bin                     # 简单 3D 多线
├── multipolygon-2d/
│   └── simple.bin                     # 简单 2D 多面
└── multipolygon-3d/
    └── simple.bin                     # 简单 3D 多面
```

## BLOB 格式说明

所有 GAIA 几何数据均为 **Little-Endian**：

```
0x00 | byteOrder(0x01) | srid(int32) | MBR(4×double) | 0x7c | geoType(int32) | coords... | 0xFE
```

- 头部总长度：43 字节（`0x00` 到 `geoType` 结束）
- 坐标数据起始偏移量固定为 43
- 结束标记字节固定为 `0xFE`

## 测试数据详情

### point-2d/simple.bin

**几何内容**：
- 类型：Point (2D)
- 坐标：[116.123, 39.456]
- SRID：4326
- geoType：1

**预期字节序列**：
```
00 01 B6 10 00 00          # 0x00 | byteOrder(0x01) | srid=4326 (小端序)
...                         # MBR (4 doubles: minX=116.123, minY=39.456, maxX=116.123, maxY=39.456)
7C                          # 分隔符 0x7c
01 00 00 00                 # geoType = 1 (Point)
...                         # coordinates (2 doubles)
FE                          # 结束标记
```

### point-3d/simple.bin

**几何内容**：
- 类型：Point (3D)
- 坐标：[116.123, 39.456, 12.5]
- SRID：4326
- geoType：1001

### multilinestring-2d/simple.bin

**几何内容**：
- 类型：MultiLineString (2D)
- 坐标：1 条线，2 个点
- SRID：4326
- geoType：5

### multilinestring-3d/simple.bin

**几何内容**：
- 类型：MultiLineString (3D)
- 坐标：1 条线，2 个三维点
- SRID：4326
- geoType：1005

### multipolygon-2d/simple.bin

**几何内容**：
- 类型：MultiPolygon (2D)
- 坐标：1 个多边形，包含 1 个外环
- SRID：4326
- geoType：6

### multipolygon-3d/simple.bin

**几何内容**：
- 类型：MultiPolygon (3D)
- 坐标：1 个三维多边形，包含 1 个外环
- SRID：4326
- geoType：1006

## manifest

`manifest.json` 是本目录的机器可读索引，字段含义如下：

- `schemaVersion`：manifest 格式版本。
- `generatedAt`：生成时间。
- `generator`：生成脚本和来源实现。
- `byteOrder`：统一为 `little-endian`。
- `gaiaHeaderLayout`：GAIA 头部布局说明。
- `fixtures`：每个 `.bin` 文件的几何内容、bbox、文件大小、SHA-256 和 GAIA 头部摘要。

## 生成 Golden Bytes

```bash
cd udbx4spec
node tools/generate-golden-gaia-bytes.mjs
```

当前生成脚本使用 `../udbx4ts/dist/index.js` 中的 GAIA codec。若加载失败，先执行 `cd udbx4ts && npm run build`。

## 验证方法

### 资产检查

```bash
cd udbx4spec
node tools/check-fixtures.mjs
```

### 字节级比较

```bash
# 比较两个实现的输出
xxd java-output.bin > java.hex
xxd ts-output.bin > ts.hex
diff java.hex ts.hex
```

### 使用合规测试框架

各语言实现应提供测试用例，读取这些 golden bytes 并验证解码结果与 `manifest.json` 中的预期几何一致。

```typescript
// TypeScript 示例
test('decode golden point-2d/simple.bin', () => {
  const blob = fs.readFileSync('golden-gaia-bytes/point-2d/simple.bin');
  const geometry = GaiaPointCodec.readPoint(blob);

  expect(geometry.type).toBe('Point');
  expect(geometry.coordinates).toEqual([116.123, 39.456]);
  expect(geometry.srid).toBe(4326);
});
```
