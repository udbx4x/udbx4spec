# udbx4spec — 命名规范（Naming Conventions）

本文档定义所有 UDBX 读写库实现必须遵循的公共命名规范。规范涵盖类/类型名、方法名、属性名以及流式读取概念名。各语言实现可在保留本规范命名的前提下，接纳语言自身惯用法（如同步/异步、生命周期管理、类型系统表达方式的差异）。

## 1. 入口类

每个语言实现必须提供一个名为 **`UdbxDataSource`** 的入口类（或结构体/单例），负责打开、创建和关闭 `.udbx` 文件，并作为数据集工厂。

**必须暴露的公共方法/函数**：

| 规范名 | 语义 | 说明 |
|--------|------|------|
| `open(...)` | 打开已有 UDBX 文件 | 参数形式允许语言差异（如 Java 直接传路径字符串，TS 传 `SqlDriver+SqlOpenTarget`） |
| `create(...)` | 创建全新 UDBX 文件 | 同上 |
| `getDataset(name)` | 按数据集名称获取具体数据集实例 | 返回语言内部的数据集类型（如 `PointDataset`） |
| `listDatasets()` | 列出当前数据源中所有数据集的元信息 | 返回 `DatasetInfo[]` 或语言等价集合 |
| `close()` | 关闭数据源 | 允许同步（Java `close()`）或异步（TS `async close()`）形式 |

## 2. 数据集（Dataset）类/类型命名

所有数据集必须派生自一个公共抽象根，名为 **`Dataset`**（Java 可为抽象类，TS 可为接口）。

**具体数据集类型名**（规范强制）：

| 规范类名 | 对应 kind | 说明 |
|----------|-----------|------|
| `PointDataset` | `point` | 2D 点数据集 |
| `LineDataset` | `line` | 2D 线数据集 |
| `RegionDataset` | `region` | 2D 面数据集 |
| `PointZDataset` | `pointZ` | 3D 点数据集 |
| `LineZDataset` | `lineZ` | 3D 线数据集 |
| `RegionZDataset` | `regionZ` | 3D 面数据集 |
| `TabularDataset` | `tabular` | 无几何属性表数据集 |
| `CadDataset` | `cad` | CAD 数据集 |

**Java 特例**：允许保留 `VectorDataset` 作为 `PointDataset` / `LineDataset` / `RegionDataset` / `CadDataset` 的中间抽象类，但公共 API 方法名必须与规范一致。

## 3. 数据集公共方法命名（CRUD）

**矢量数据集**（`PointDataset`、`LineDataset`、`RegionDataset`、`*ZDataset`、`CadDataset`）和 **属性表数据集**（`TabularDataset`）必须提供以下公共方法。

### 读取方法

| 规范名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `list(options?)` | `QueryOptions?` | `Feature[]` / `TabularRecord[]` | 查询全部或分页/带条件查询 |
| `getById(id)` | `number` / `int` | `Feature \| null` | 按 SmID（统一称为 `id`）查询单条 |
| `count()` | 无 | `number` / `int` | 返回数据集中对象总数 |

### 流式读取

规范将流式/惰性读取作为**概念**统一，但允许返回类型随语言而异：

- **Java**：`stream()` 返回 `java.util.Stream<T>`
- **TypeScript / JS**：`iterate()` 返回 `AsyncIterable<T>`
- **Python**：`iter_features()` 返回 `Iterator[T]`
- **Go**：提供回调式或 channel 式遍历
- **Rust**：返回 `impl Iterator<Item=T>` 或 `Stream`

名称不要求全世界一字不差，但必须在文档中声明“此方法对应 udbx4spec 的 stream/iterate 概念”。

### 写入方法

| 规范名 | 参数 | 说明 |
|--------|------|------|
| `insert(feature)` | 单个 `Feature` / `TabularRecord` | 单条写入。参数为**结构化的 Feature 对象**，禁止像旧 Java API 那样展开为 `id, geometry, attributes` 三个参数。 |
| `insertMany(features)` | `Feature[]` / `Iterable<Feature>` / `AsyncIterable<Feature>` | 批量写入。推荐使用事务包裹。 |
| `update(id, changes)` | `id` + 变更对象 | 按 ID 更新。`changes` 至少包含可选的 `geometry` 和 `attributes`。 |
| `delete(id)` | `id` | 按 ID 删除。 |

## 4. Feature 与 Record 命名

| 概念 | 规范名 | 说明 |
|------|--------|------|
| 通用要素 | `Feature<TGeometry, TAttributes>` | 泛型结构，包含 `id`、`geometry`、`attributes` |
| 点要素 | `PointFeature` | `Feature<PointGeometry, TAttributes>` 的别名或特化 |
| 线要素 | `LineFeature` | `Feature<MultiLineStringGeometry, TAttributes>` 的别名或特化 |
| 面要素 | `RegionFeature` | `Feature<MultiPolygonGeometry, TAttributes>` 的别名或特化 |
| CAD 要素 | `CadFeature` | `Feature<CadGeometry, TAttributes>` 的别名或特化 |
| 属性记录 | `TabularRecord` | 无几何，仅包含 `id` + `attributes` |

### Feature / Record 的公共属性名

| 规范属性名 | 类型 | 说明 |
|------------|------|------|
| `id` | `number` / `int` | 要素唯一标识符（即 UDBX 中的 SmID） |
| `geometry` | `TGeometry` | 几何对象（`TabularRecord` 不包含此属性） |
| `attributes` | `Record<string, T>` | 用户字段键值对集合 |

**注意**：旧 udbx4j 中使用的 `smId` 名称被废弃，统一为 `id`。

## 5. 元信息类型命名

| 规范名 | 用途 | 关键属性 |
|--------|------|----------|
| `DatasetInfo` | 数据集元信息 | `id`, `name`, `tableName`, `kind`, `srid`, `objectCount`, `geometryType` |
| `FieldInfo` | 字段元信息 | `name`, `fieldType`, `alias?`, `required?`, `nullable?`, `defaultValue?` |
| `QueryOptions` | 查询/分页选项 | `ids?`, `limit?`, `offset?`（未来可扩展 `bbox?`） |

### DatasetInfo 属性名规范

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `id` | `number` / `int` | 数据集 ID（SmDatasetID） |
| `name` | `string` / `String` | 数据集名称（SmDatasetName） |
| `tableName` | `string` / `String` | 物理表名（通常等于 `name`，但规范要求显式暴露） |
| `kind` | `DatasetKind` | 数据集类型分类 |
| `srid` | `number \| null` / `int` | 坐标系 ID |
| `objectCount` | `number` / `int` | 对象数量 |
| `geometryType` | `number \| null` / `int` | GAIA geoType 整数值（如 1, 5, 6, 1001 等） |

### FieldInfo 属性名规范

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `name` | `string` / `String` | 字段名称（原 `fieldName`） |
| `fieldType` | `FieldType` | 字段类型 |
| `alias` | `string?` / `String?` | 字段别名（可选） |
| `required` | `boolean?` | 是否必填（可选） |
| `nullable` | `boolean?` | 是否可为 null（可选） |
| `defaultValue` | `unknown?` / `Object?` | 默认值（可选） |

## 6. 枚举/分类命名

### DatasetKind

规范值为以下字符串（或语言对应 enum）：

- `tabular`
- `point`
- `line`
- `region`
- `pointZ`
- `lineZ`
- `regionZ`
- `text`
- `cad`

**Java v2.0.0 映射**：`DatasetType` 重命名为 `DatasetKind`，枚举常量使用大写下划线（如 `DatasetKind.POINT`、`DatasetKind.POINT_Z`）。

### FieldType

规范值为以下字符串（或语言对应 enum）：

- `boolean`
- `byte`
- `int16`
- `int32`
- `int64`
- `single`
- `double`
- `date`
- `binary`
- `geometry`
- `char`
- `ntext`
- `text`
- `time`

**Java v2.0.0 映射**：`FieldType.BOOLEAN`、`FieldType.INT16` 等。

## 7. 错误/异常命名

| 规范名 | 语义 |
|--------|------|
| `UdbxError` | 所有 UDBX 相关错误的基类 |
| `UdbxFormatError` | 格式错误（损坏的 GAIA BLOB、非法字节序等） |
| `UdbxNotFoundError` | 未找到（数据集或要素不存在） |
| `UdbxUnsupportedError` | 不支持的数据集 kind 或几何类型 |
| `UdbxConstraintError` | 约束错误（重复 ID、必填字段缺失等） |
| `UdbxIOError` | IO 错误（文件读写失败） |

## 8. 几何编解码器命名

**GeoJSON-like 编解码器**（所有实现必须提供）：

| 规范名 | 说明 |
|--------|------|
| `GaiaGeometryCodec` | 统一入口，负责根据 geoType 自动分派 |
| `GaiaPointCodec` | 点编解码 |
| `GaiaLineCodec` | 线编解码 |
| `GaiaPolygonCodec` | 面编解码 |

**各语言可选原生几何适配层**（命名建议）：

- **Java**：`GeoJsonUtils`（JTS ↔ GeoJSON-like 转换）
- **TypeScript**：`JstsGeometryCodec` 或 `toJsts` / `fromJsts`（JSTS ↔ GeoJSON-like 转换）

---

## 附录：新旧命名对照表

| 旧 udbx4j 名 | 旧 udbx4ts 名 | **udbx4spec 规范名** |
|--------------|---------------|----------------------|
| `getFeatures()` | `list()` | **`list()`** |
| `getFeature(int)` | `getById(id)` | **`getById(id)`** |
| `streamFeatures()` | `iterate()` | **概念：`stream` / `iterate`** |
| `addFeature(...)` | `insert(feature)` | **`insert(feature)`** |
| `addFeaturesBatch(...)` | `insertMany(...)` | **`insertMany(...)`** |
| `updateFeature(...)` | （缺失） | **`update(id, changes)`** |
| `deleteFeature(...)` / `deleteRow(...)` | `delete(id)` | **`delete(id)`** |
| `getCount()` | （缺失） | **`count()`** |
| `smId` | `id` | **`id`** |
| `datasetName` | `name` | **`name`** |
| `DatasetType` | `DatasetKind` | **`DatasetKind`** |
| `fieldName` | `name` | **`name`** |
| `fieldAlias` | （缺失） | **`alias`** |

---

## 附录 B：白皮书（UDBX Open Data Format White Paper）字段映射

本规范（udbx4spec）与白皮书（UDBX开放数据格式白皮书 V1.0）的命名对照：

### 数据集类型映射

| 白皮书字段 | udbx4spec 类型 | 说明 |
|------------|----------------|------|
| `SmDatasetType`（SmRegister 表字段） | `DatasetKind` | 白皮书使用数据库字段名，本规范使用 API 类型名 |

### DatasetKind 与白皮书枚举值对照

| DatasetKind | 白皮书枚举值 | 白皮书名称 | 说明 |
|-------------|--------------|------------|------|
| `tabular` | 0 | Tabular | 纯属性表 |
| `point` | 1 | Point | 二维点数据集 |
| `line` | 3 | Line | 二维线数据集 |
| `region` | 5 | Region | 二维面数据集 |
| `pointZ` | 101 | PointZ | 三维点数据集 |
| `lineZ` | 103 | LineZ | 三维线数据集 |
| `regionZ` | 105 | RegionZ | 三维面数据集 |
| `text` | 7 | Text | 文本数据集 |
| `cad` | 149 | CAD | CAD 数据集 |

### 数据库字段映射

| udbx4spec 属性 | 白皮书 SmRegister 表字段 | 说明 |
|----------------|--------------------------|------|
| `DatasetInfo.id` | `SmDatasetID` | 数据集唯一标识 |
| `DatasetInfo.name` | `SmDatasetName` | 数据集名称 |
| `DatasetInfo.tableName` | `SmTableName` | 物理表名 |
| `DatasetInfo.kind` | `SmDatasetType` | 数据集类型（见上表映射） |
| `DatasetInfo.srid` | `SmSRID` | 坐标系 ID |
| `DatasetInfo.objectCount` | `SmObjectCount` | 对象数量 |
| `DatasetInfo.geometryType` | - | GAIA geoType（由 kind 推导） |

| udbx4spec 属性 | 白皮书 SmFieldInfo 表字段 | 说明 |
|----------------|---------------------------|------|
| `FieldInfo.name` | `SmFieldName` | 字段名称 |
| `FieldInfo.fieldType` | `SmFieldType` | 字段类型（需映射到 FieldType） |
| `FieldInfo.alias` | `SmFieldCaption` | 字段别名 |
