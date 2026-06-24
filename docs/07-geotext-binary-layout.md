# udbx4spec — GeoText 二进制布局

本文档定义 Text 数据集 `SmGeometry` 中 GeoText BLOB 的最小可验证布局。依据来自 `UDBX开放数据格式白皮书(V1.0).pdf` 3.1.5、4.1、4.3、4.4，以及 `data/SampleData.udbx`、`data/henan.udbx` 的真实样本观察。

## 权威依据

- 白皮书 3.1.5：文本数据集一张表，系统字段为 `SmID`、`SmUserID`、`SmGeometry`、`SmIndexKey`。
- 白皮书 3.1.5：`SmGeometry` 存储 GeoText 二进制流；`SmIndexKey` 存储对象范围，格式为 `GAIAPolygon`。
- 白皮书 4.1：对象二进制字节序为 Little-Endian。
- 白皮书 4.1.2：`String` 为 `int32 length` 加 UTF-8 bytes。
- 白皮书 4.1.10：`Color` 为 `a`、`b`、`g`、`r` 四个 byte。
- 白皮书 4.4：Text 数据集中的 `GeoHeader.styleSize` 为 `0`。

## 数据表规则

Text 数据集使用 `SmDatasetType=7`。

| 字段 | SQLite 类型 | 是否允许空 | 说明 |
|---|---|---|---|
| `SmID` | `INTEGER` | 否 | 主键，文本对象唯一标识 |
| `SmUserID` | `INTEGER` | 是 | 用户自定义 ID |
| `SmGeometry` | `BLOB` | 是 | GeoText 二进制流 |
| `SmIndexKey` | `POLYGON` | 是 | 对象范围，`GAIAPolygon` |

真实样本显示 Text 数据集会在 `geometry_columns` 中注册 `SmIndexKey`，而不是把 `SmGeometry` 注册为普通 GAIA 几何列。

| 字段 | 规则 |
|---|---|
| `f_table_name` | Text 数据表名，大小写按 SQLite/SpatiaLite 规则处理 |
| `f_geometry_column` | `smindexkey` 或大小写等价名称 |
| `geometry_type` | `3`，即 `GAIAPolygon` |
| `coord_dimension` | `2` |
| `srid` | 与 `SmRegister.SmSRID` 一致 |
| `spatial_index_enabled` | `0` |

## GeoText 结构

```text
GeoText {
  GeoHeader  header;
  int32      subCount;
  TextStyle  textStyle;
  GeoSubText subTexts[subCount];
}
```

### GeoHeader

Text 数据集中的 `GeoHeader` 不包含 CAD style payload。

| 偏移 | 类型 | 字段 | 规则 |
|---:|---|---|---|
| 0 | `int32` | `geoType` | 固定为 `7` |
| 4 | `int32` | `styleSize` | Text 数据集固定为 `0` |

### TextStyle

`TextStyle` 紧跟在 `subCount` 后。

| 顺序 | 类型 | 字段 | 说明 |
|---:|---|---|---|
| 1 | `Color` | `color` | 文本颜色，ABGR 字节顺序 |
| 2 | `TextStyleBit` | `textStyleBit` | 文本风格位 |
| 3 | `Color` | `bgColor` | 文本背景颜色，ABGR 字节顺序 |
| 4 | `double` | `fontWidth` | 字体宽度 |
| 5 | `double` | `fontHeight` | 字体高度 |
| 6 | `Point` | `pntAnchor` | 文本定位点 |
| 7 | `String` | `faceName` | 字体名称，UTF-8 |

### TextStyleBit

```text
TextStyleBit {
  byte fixedSize;
  byte weight;
  byte styleFlag;
  byte alignFlag;
}
```

`fixedSize`、`weight`、`styleFlag`、`alignFlag` 的位语义仍需更多白皮书解释或样本验证。实现必须保留这些字段，不能丢弃。

### GeoSubText

```text
GeoSubText {
  Point      pntAnchor;
  int32      subAngle;
  int32      reserved;
  String     subText;
}
```

| 字段 | 规则 |
|---|---|
| `pntAnchor` | 子文本定位点 |
| `subAngle` | 实际旋转角度乘 10 的四舍五入整数 |
| `reserved` | 预留字段，当前样本为 `0` |
| `subText` | UTF-8 文本 |

规范交换模型中的 `rotation` 使用角度值，单位为度。读取时应将 `subAngle` 除以 `10`；写入时应将角度乘以 `10` 后四舍五入为 `int32`。

## 样本偏移

### henan.udbx / 河南省标签 / SmID=1

该样本可完整解码为 UTF-8 文本。

| 偏移 | 长度 | 字段 | 值 |
|---:|---:|---|---|
| 0 | 4 | `GeoHeader.geoType` | `7` |
| 4 | 4 | `GeoHeader.styleSize` | `0` |
| 8 | 4 | `subCount` | `1` |
| 12 | 4 | `TextStyle.color` | `ABGR=(0,0,0,255)` |
| 16 | 4 | `TextStyleBit` | `fixedSize=10, weight=64, styleFlag=6, alignFlag=0` |
| 20 | 4 | `TextStyle.bgColor` | `ABGR=(255,255,255,255)` |
| 24 | 8 | `TextStyle.fontWidth` | `0` |
| 32 | 8 | `TextStyle.fontHeight` | `0.406494140625` |
| 40 | 8 | `TextStyle.pntAnchor.x` | `113.165187569688` |
| 48 | 8 | `TextStyle.pntAnchor.y` | `33.875453985` |
| 56 | 4 | `TextStyle.faceName.length` | `6` |
| 60 | 6 | `TextStyle.faceName.bytes` | `宋体` |
| 66 | 8 | `GeoSubText[0].pntAnchor.x` | `113.165187569688` |
| 74 | 8 | `GeoSubText[0].pntAnchor.y` | `33.875453985` |
| 82 | 4 | `GeoSubText[0].subAngle` | `0` |
| 86 | 4 | `GeoSubText[0].reserved` | `0` |
| 90 | 4 | `GeoSubText[0].subText.length` | `9` |
| 94 | 9 | `GeoSubText[0].subText.bytes` | `河南省` |

### SampleData.udbx / County_T

`County_T` 前三条记录均可按同一布局解析：

- `geoType=7`
- `styleSize=0`
- `subCount=1`
- `faceName.length=4`
- `subText.length=30`
- `subAngle` 样本值包括 `-32`、`-27`

该样本的 `faceName` 和 `subText` 存在非 UTF-8 可读字节或编码异常显示，不能作为规范文本内容样本；但它可以作为“真实文件中存在异常/历史编码文本字节”的兼容性样本。实现读取时应能保留原始字节上下文并返回明确错误或替代策略，不能硬编码跳过。

## 最小实现要求

读取实现必须支持：

- Little-Endian。
- `geoType=7`。
- Text 数据集 `styleSize=0`。
- `subCount >= 1`。
- `TextStyle` 全字段读取。
- `GeoSubText` 全字段读取。
- `String` 的 `int32 length + UTF-8 bytes` 解码。
- `Color` 的 ABGR 分量。
- `subAngle / 10` 的旋转角语义。

写入实现必须支持：

- 写出 `geoType=7`、`styleSize=0` 的 Text 数据集 GeoText。
- 写出 `TextStyle` 与至少一个 `GeoSubText`。
- 写出 UTF-8 `faceName` 和 `subText`。
- 写出 `SmIndexKey` 的 `GAIAPolygon` 对象范围。
- 在 `geometry_columns` 中注册 `SmIndexKey`。

## 待确认项

- `TextStyleBit` 四个 byte 的完整位语义。
- 多个 `GeoSubText` 的显示拼接规则、样式继承规则和跨语言交换策略。
- `SmIndexKey` 范围 polygon 的精确生成规则，尤其是字体高度、旋转和对齐方式对范围的影响。
- `SampleData.udbx` 中非 UTF-8 可读文本字节的来源、生成软件版本和兼容处理策略。
