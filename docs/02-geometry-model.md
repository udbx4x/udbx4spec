# udbx4spec — 几何数据模型（Geometry Model）

## 核心原则

`udbx4spec` 采用 **GeoJSON-like 结构** 作为跨语言几何数据交换的 **lingua franca**。所有 UDBX 读写库实现必须至少支持该模型进行数据读取和写入。

各语言实现可以在 GeoJSON-like 模型的基础上，额外提供原生几何库的适配层（例如 Java 的 JTS、TypeScript 的 JSTS），但规范测试（compliance tests）以 GeoJSON-like 输出为准。

## 1. 支持的 Geometry 类型

UDBX 白皮书 §4.2 定义的 GAIA 几何类型与规范类型的映射关系：

| GAIA geoType | 规范 Geometry Type | 说明 |
|--------------|-------------------|------|
| 1 | `PointGeometry` | 2D 点 |
| 1001 | `PointGeometry`（`hasZ: true`） | 3D 点 |
| 5 | `MultiLineStringGeometry` | 2D 多线 |
| 1005 | `MultiLineStringGeometry`（`hasZ: true`） | 3D 多线 |
| 6 | `MultiPolygonGeometry` | 2D 多面 |
| 1006 | `MultiPolygonGeometry`（`hasZ: true`） | 3D 多面 |

**注意**：UDBX 的矢量数据集在物理存储上只使用 `Point`、`MultiLineString`、`MultiPolygon` 三种顶层类型（及其 Z 变体）。CAD 数据集使用自定义 GeoHeader 格式，不在 GeoJSON-like 范围内，由 `CadGeometry` 单独定义（参见 udbx4j 的 `CadGeometry` 密封接口）。

## 2. GeoJSON-like 结构定义

### PointGeometry

```typescript
interface PointGeometry {
  readonly type: "Point";
  readonly coordinates: [number, number] | [number, number, number];
  readonly srid?: number;
  readonly hasZ?: boolean;
  readonly bbox?: [number, number, number, number];
}
```

- `coordinates` 长度决定维度：长度为 2 表示 2D，长度为 3 表示 3D。
- `hasZ` 为可选提示字段。若显式提供，应与 `coordinates` 长度一致。
- `srid` 优先级规则：**Feature/Geometry 级别的 `srid` > Dataset 级别的默认 `srid` > 0**。

### MultiLineStringGeometry

```typescript
interface MultiLineStringGeometry {
  readonly type: "MultiLineString";
  readonly coordinates: Array<
    Array<[number, number] | [number, number, number]>
  >;
  readonly srid?: number;
  readonly hasZ?: boolean;
  readonly bbox?: [number, number, number, number];
}
```

- 外层数组表示多个 `LineString`。
- 每个 `LineString` 是坐标点数组。
- 所有内层坐标点必须维度一致（不允许同一条线中混用 2D 和 3D 点）。

### MultiPolygonGeometry

```typescript
interface MultiPolygonGeometry {
  readonly type: "MultiPolygon";
  readonly coordinates: Array<
    Array<
      Array<[number, number] | [number, number, number]>
    >
  >;
  readonly srid?: number;
  readonly hasZ?: boolean;
  readonly bbox?: [number, number, number, number];
}
```

- 最外层数组表示多个 `Polygon`。
- 每个 `Polygon` 是 `Ring` 数组，其中第 0 个 `Ring` 为外环（shell），其余为内环（holes）。
- 每个 `Ring` 是坐标点数组，首尾点必须重复（与 GeoJSON 规范一致）。

## 3. SRID 处理规则

规范强制以下优先级：

1. 若 `geometry.srid` 显式提供且非空，使用该值。
2. 否则，使用数据集元信息中的 `DatasetInfo.srid` 默认值。
3. 若两者皆为空，回退到 `0`。

此规则与当前 udbx4ts 的行为一致，明确优于 udbx4j v1.0.0 中仅从 `DatasetInfo` 取 SRID 的做法。

## 4. Z 值检测规则

规范不强制要求单独的 `*ZDataset` 类。各语言实现可以：

- **方案 A（推荐）**：统一使用 `PointDataset` / `LineDataset` / `RegionDataset`，通过检查 `coordinates` 长度或 `hasZ` 标志来判断维度。
- **方案 B（Java 传统）**：保留 `PointZDataset` / `LineZDataset` / `RegionZDataset` 作为明确类型区分。

两种方案都被 udbx4spec 接受，但对外交换的 GeoJSON-like 几何对象必须符合上述结构定义。

## 5. 各语言原生几何适配（可选但推荐）

### Java — JTS

Java 实现 v2.0.0 中，内部可以继续使用 `org.locationtech.jts.geom.*` 作为主要几何模型，但必须在 `com.supermap.udbx.geometry.geojson` 包中提供以下工具：

```java
public final class GeoJsonUtils {
    public static Point toJts(PointGeometry g, int srid);
    public static MultiLineString toJts(MultiLineStringGeometry g, int srid);
    public static MultiPolygon toJts(MultiPolygonGeometry g, int srid);

    public static PointGeometry fromJts(Point p);
    public static MultiLineStringGeometry fromJts(MultiLineString ml);
    public static MultiPolygonGeometry fromJts(MultiPolygon mp);
}
```

### TypeScript — JSTS

TypeScript 实现 v0.3.0 中，应在 `src/core/geometry/jsts/` 下提供 JSTS 适配层。推荐方式：

```typescript
// 转换函数
export function toJsts(geometry: Geometry): jsts.geom.Geometry;
export function fromJsts(geom: jsts.geom.Geometry): Geometry;

// 或直接提供编解码器
export class JstsGeometryCodec {
  static decode(input: Uint8Array): jsts.geom.Geometry;
  static encode(geometry: jsts.geom.Geometry, srid: number): Uint8Array;
}
```

- `jsts` 可作为 `peerDependency`（推荐，避免强制拖入）或 `dependency`。
- 该适配层与现有的 `GaiaGeometryCodec` 并存，用户按需选择。

### 其他语言映射建议

| 语言 | 推荐原生库 | 适配层建议 |
|------|-----------|-----------|
| Python | Shapely / GeoPandas | `to_shapely` / `from_shapely` |
| C# | NetTopologySuite | `ToNts` / `FromNts` |
| Go | orb | `ToOrb` / `FromOrb` |
| Rust | geo / geojson crate | `to_geo` / `from_geo` |

## 6. 编解码器命名规范

所有实现的标准 GeoJSON-like 编解码器统一命名：

| 规范类/模块名 | 职责 |
|--------------|------|
| `GaiaGeometryCodec` | 统一入口，根据 BLOB 头部 `geoType` 自动分派到具体编解码器 |
| `GaiaPointCodec` | `geoType=1` / `1001` |
| `GaiaLineCodec` | `geoType=5` / `1005` |
| `GaiaPolygonCodec` | `geoType=6` / `1006` |

每个编解码器至少暴露以下方法（命名允许语言微调，如 TS 的 `readPoint` / `writePoint`，Java 的 `readPoint` / `writePoint`）：

- `readPoint(input: bytes): PointGeometry`
- `readPointZ(input: bytes): PointGeometry`
- `writePoint(geometry, srid): bytes`
- `writePointZ(geometry, srid): bytes`
- 以及线、面的对应变体

## 7. 几何 BLOB 结构提示

所有 GAIA 几何数据均为 **Little-Endian**：

```
0x00 | byteOrder(0x01) | srid(int32) | MBR(4×double) | 0x7c | geoType(int32) | ...coords... | 0xFE
```

- 头部总长度：43 字节（`0x00` 到 `geoType` 结束）。
- 坐标数据起始偏移量固定为 43。
- 结束标记字节固定为 `0xFE`。

此结构为 UDBX 白皮书 §4.2 定义，所有实现必须严格遵守。
