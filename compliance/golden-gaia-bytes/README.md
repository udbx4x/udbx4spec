# Golden GAIA Bytes

本目录包含标准 GAIA 二进制 BLOB，用于验证各语言编解码器输出字节级一致。

## 文件说明

### 目录结构

```
golden-gaia-bytes/
├── README.md                          # 本文件
├── point-2d/
│   ├── simple.bin                     # 简单 2D 点
│   └── with-srid.bin                  # 带 SRID 的 2D 点
├── point-3d/
│   └── simple.bin                     # 简单 3D 点
├── multilinestring-2d/
│   └── simple.bin                     # 简单 2D 多线
└── multipolygon-2d/
    └── simple-with-hole.bin           # 带内环的 2D 多边形
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
- 坐标：[116.4074, 39.9042] (北京)
- SRID：4326

**预期字节序列**：
```
00 01 B6 10 00 00          # 0x00 | byteOrder(0x01) | srid=4326 (小端序)
...                         # MBR (4 doubles: 116.4074 × 4)
7C                          # 分隔符 0x7c
01 00 00 00                 # geoType = 1 (Point)
...                         # coordinates (2 doubles)
FE                          # 结束标记
```

### point-2d/with-srid.bin

**几何内容**：
- 类型：Point (2D)
- 坐标：[0.0, 0.0]
- SRID：3857 (Web Mercator)

### point-3d/simple.bin

**几何内容**：
- 类型：Point (3D)
- 坐标：[116.4074, 39.9042, 50.0]
- SRID：4326
- geoType：1001

### multilinestring-2d/simple.bin

**几何内容**：
- 类型：MultiLineString (2D)
- 坐标：2 条线，每条线 2 个点
- SRID：4326
- geoType：5

### multipolygon-2d/simple-with-hole.bin

**几何内容**：
- 类型：MultiPolygon (2D)
- 坐标：1 个多边形，包含 1 个外环和 1 个内环
- SRID：4326
- geoType：6

## 生成 Golden Bytes

### TypeScript (Node.js)

```typescript
import * as fs from 'fs';
import { GaiaPointCodec } from 'udbx4ts';

const codec = new GaiaPointCodec();
const blob = codec.writePoint({
  type: "Point",
  coordinates: [116.4074, 39.9042],
  srid: 4326
}, 4326);

fs.writeFileSync('point-2d/simple.bin', Buffer.from(blob));
```

### Java

```java
import com.supermap.udbx.codec.GaiaPointCodec;

GaiaPointCodec codec = new GaiaPointCodec();
byte[] blob = codec.writePoint(pointGeometry, 4326);

Files.write(Path.of("point-2d/simple.bin"), blob);
```

## 验证方法

### 字节级比较

```bash
# 比较两个实现的输出
xxd java-output.bin > java.hex
xxd ts-output.bin > ts.hex
diff java.hex ts.hex
```

### 使用合规测试框架

各语言实现应提供测试用例，读取这些 golden bytes 并验证解码结果与预期几何一致。

```typescript
// TypeScript 示例
test('decode golden point-2d/simple.bin', () => {
  const blob = fs.readFileSync('golden-gaia-bytes/point-2d/simple.bin');
  const geometry = codec.readPoint(blob);

  expect(geometry.type).toBe('Point');
  expect(geometry.coordinates).toEqual([116.4074, 39.9042]);
  expect(geometry.srid).toBe(4326);
});
```
