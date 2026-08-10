# udbx4spec — 数据集类型分类（Dataset Taxonomy）

## 概述

UDBX 文件格式在 `SmRegister` 系统表中使用 `SmDatasetType` 整数字段标识数据集类型。`udbx4spec` 将整数映射为跨语言的分类名称 `DatasetKind`，所有实现必须使用本文档定义的分类名称和数值。

## DatasetKind 映射表

| 规范 kind | SmDatasetType 数值 | 几何维度 | 几何列 | 说明 |
|-----------|-------------------|----------|--------|------|
| `tabular` | 0 | 无 | 无 | 纯属性表，无空间数据 |
| `point` | 1 | 2D | `SmGeometry` | 点数据集，存储 GAIAPoint (geoType=1) |
| `line` | 3 | 2D | `SmGeometry` | 线数据集，存储 GAIAMultiLineString (geoType=5) |
| `region` | 5 | 2D | `SmGeometry` | 面数据集，存储 GAIAMultiPolygon (geoType=6) |
| `pointZ` | 101 | 3D | `SmGeometry` | 三维点数据集，存储 GAIAPointZ (geoType=1001) |
| `lineZ` | 103 | 3D | `SmGeometry` | 三维线数据集，存储 GAIAMultiLineStringZ (geoType=1005) |
| `regionZ` | 105 | 3D | `SmGeometry` | 三维面数据集，存储 GAIAMultiPolygonZ (geoType=1006) |
| `text` | 7 | 2D | `SmGeometry` / `SmIndexKey` | 文本数据集，`SmGeometry` 存储 GeoText，`SmIndexKey` 存储对象范围 |
| `cad` | 149 | 2D/3D | `SmGeometry` | CAD 数据集，使用 SuperMap GeoHeader 自定义二进制格式 |

## 视口空间查询覆盖

`querySpatial` 契约（见 `08-api-stable-surface.md`）覆盖 `point`、`line`、`region`、`pointZ`、`lineZ`、`regionZ`、`text`、`cad` 八类空间数据集；`tabular` 不适用。该覆盖集合是跨语言契约的一部分：各语言 SDK 必须支持同一集合。当前 Go 已实现全部覆盖类型；Java/TypeScript 运行时待实现。

## 语言映射参考

### TypeScript

```typescript
export type DatasetKind =
  | "tabular"
  | "point"
  | "line"
  | "region"
  | "pointZ"
  | "lineZ"
  | "regionZ"
  | "text"
  | "cad";
```

- TypeScript 当前实现已使用该字符串 union，无需重命名。
- 需补全运行时支持：`pointZ`、`lineZ`、`regionZ`、`cad` 的数据集类与工厂方法。

### Java

```java
public enum DatasetKind {
    TABULAR(0),
    POINT(1),
    LINE(3),
    REGION(5),
    POINT_Z(101),
    LINE_Z(103),
    REGION_Z(105),
    TEXT(7),
    CAD(149);

    private final int value;
    DatasetKind(int value) { this.value = value; }
    public int getValue() { return value; }

    public static DatasetKind fromValue(int value) {
        for (DatasetKind k : values()) {
            if (k.value == value) return k;
        }
        throw new UdbxUnsupportedError("Unknown dataset kind: " + value);
    }
}
```

- Java v2.0.0 中，现有 `DatasetType` enum 必须重命名为 `DatasetKind`。
- 枚举常量命名采用 Java 惯例大写下划线（如 `POINT_Z`）。

## 数据集类与 kind 的对应关系

| kind | 规范 Dataset 类名 | 规范 Feature 类型名 |
|------|------------------|---------------------|
| `tabular` | `TabularDataset` | `TabularRecord` |
| `point` | `PointDataset` | `PointFeature` |
| `line` | `LineDataset` | `LineFeature` |
| `region` | `RegionDataset` | `RegionFeature` |
| `pointZ` | `PointZDataset` | `PointFeature` |
| `lineZ` | `LineZDataset` | `LineFeature` |
| `regionZ` | `RegionZDataset` | `RegionFeature` |
| `text` | `TextDataset` | `TextFeature` |
| `cad` | `CadDataset` | `CadFeature` |

**说明**：
- `pointZ` / `lineZ` / `regionZ` 的 Feature 类型与 2D 版本共用（`PointFeature`、`LineFeature`、`RegionFeature`），因为 GeoJSON-like 模型通过 `coordinates` 长度或 `hasZ` 标识维度，无需独立的 Feature 类型。
- Java 当前使用独立的 `PointZDataset`、`LineZDataset`、`RegionZDataset`，这一做法在规范中继续被接受。
- TypeScript 当前已补齐 `PointZDataset`、`LineZDataset`、`RegionZDataset`、`TextDataset` 与 `CadDataset` 的合规基线；Text / GeoText 的二进制布局以 `07-geotext-binary-layout.md` 为准。

## geometry_columns 注册要求

对于标准 GAIA 矢量数据集（`point` ~ `regionZ`），创建数据表后必须在 `geometry_columns` 系统表中注册几何列信息：

| 字段 | 说明 |
|------|------|
| `f_table_name` | 数据表名称（规范要求小写存储） |
| `f_geometry_column` | 几何列名，固定为 `"SmGeometry"` |
| `geometry_type` | GAIA geoType 整数值（见上表） |
| `coord_dimension` | 坐标维度：2D=2，3D=3 |
| `srid` | 坐标系 ID |
| `spatial_index_enabled` | 空间索引是否启用，UDBX 规范固定为 `0` |

**注意**：`tabular` 数据集不注册 `geometry_columns`。`cad` 数据集使用 SuperMap GeoHeader 自定义二进制格式，当前合规基线要求不注册 `geometry_columns`，这一点与 Java 参考实现和三端 roundtrip 夹具保持一致。

Text 数据集是特殊矢量数据集：白皮书 3.1.5 规定 `SmGeometry` 为 `GeoText` BLOB，`SmIndexKey` 为对象范围 `GAIAPolygon`。真实样本 `data/SampleData.udbx` 和 `data/henan.udbx` 均在 `geometry_columns` 中注册 `smindexkey`，`geometry_type=3`，`srid` 与 `SmRegister.SmSRID` 一致。因此 Text 创建规则应以 `SmIndexKey` 注册为准，而不是把 `SmGeometry` 注册为普通 GAIA 几何列。
