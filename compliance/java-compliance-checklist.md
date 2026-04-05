# Java 实现合规检查清单

本清单用于验证 udbx4j (Java 实现) 是否符合 udbx4spec 规范。

## 命名规范合规度

### 入口类

- [ ] 提供 `UdbxDataSource` 类
  - [ ] 静态方法 `open(String path)`
  - [ ] 静态方法 `create(String path)`
  - [ ] 方法 `getDataset(String name)`
  - [ ] 方法 `listDatasets()`
  - [ ] 方法 `close()`
  - [ ] 实现 `AutoCloseable`

### 数据集类名

- [ ] 提供 `Dataset` 抽象基类/接口
- [ ] 提供 `PointDataset` 类
- [ ] 提供 `LineDataset` 类
- [ ] 提供 `RegionDataset` 类
- [ ] 提供 `PointZDataset` 类
- [ ] 提供 `LineZDataset` 类
- [ ] 提供 `RegionZDataset` 类
- [ ] 提供 `TabularDataset` 类
- [ ] 提供 `CadDataset` 类

### 方法名 (CRUD)

- [ ] `list()` / `list(QueryOptions options)`
- [ ] `getById(int id)`
- [ ] `stream()` (返回 `Stream<T>`)
- [ ] `insert(T feature)`
- [ ] `insertMany(List<T> features)`
- [ ] `update(int id, FeatureChanges changes)`
- [ ] `delete(int id)`
- [ ] `count()`

### 属性名

- [ ] Feature/Record 使用 `id` (非 `smId`)
- [ ] Feature 使用 `geometry`
- [ ] Feature/Record 使用 `attributes`
- [ ] DatasetInfo 使用 `name` (非 `datasetName`)
- [ ] DatasetInfo 使用 `tableName`
- [ ] DatasetInfo 使用 `kind`
- [ ] FieldInfo 使用 `name` (非 `fieldName`)
- [ ] FieldInfo 使用 `alias`

### 枚举类型

- [ ] `DatasetKind` enum (原 `DatasetType` 重命名)
  - [ ] `TABULAR(0)`, `POINT(1)`, `LINE(3)`, `REGION(5)`
  - [ ] `POINT_Z(101)`, `LINE_Z(103)`, `REGION_Z(105)`
  - [ ] `TEXT(7)`, `CAD(149)`
- [ ] `FieldType` enum
  - [ ] 全部 14 种类型
  - [ ] 使用大写下划线命名 (`BOOLEAN`, `INT16`, 等)

---

## 几何模型合规度

### GeoJSON-like 结构支持

- [ ] `PointGeometry` 支持 `type`, `coordinates`, `srid`, `hasZ`, `bbox`
- [ ] `MultiLineStringGeometry` 支持所有属性
- [ ] `MultiPolygonGeometry` 支持所有属性
- [ ] 坐标数组维度正确 (2D: [x,y], 3D: [x,y,z])

### SRID 处理规则

- [ ] Geometry 级别的 `srid` 优先级最高
- [ ] Dataset 级别的 `srid` 作为默认值
- [ ] 两者皆空时回退到 0

### Z 值检测

- [ ] 通过 `coordinates` 长度检测维度
- [ ] 可选 `hasZ` 属性与坐标长度一致

### JTS 适配层 (可选但推荐)

- [ ] 提供 `GeoJsonUtils` 类
  - [ ] `toJts(PointGeometry)` → `Point`
  - [ ] `fromJts(Point)` → `PointGeometry`
  - [ ] 对应多线、多面方法

---

## DatasetKind 映射正确性

- [ ] SmDatasetType=0 映射为 `TABULAR`
- [ ] SmDatasetType=1 映射为 `POINT`
- [ ] SmDatasetType=3 映射为 `LINE`
- [ ] SmDatasetType=5 映射为 `REGION`
- [ ] SmDatasetType=101 映射为 `POINT_Z`
- [ ] SmDatasetType=103 映射为 `LINE_Z`
- [ ] SmDatasetType=105 映射为 `REGION_Z`
- [ ] SmDatasetType=7 映射为 `TEXT`
- [ ] SmDatasetType=149 映射为 `CAD`
- [ ] `DatasetKind.fromValue()` 正确处理所有值

---

## FieldType 映射正确性

- [ ] SmFieldType=1 映射为 `BOOLEAN`
- [ ] SmFieldType=2 映射为 `BYTE`
- [ ] SmFieldType=3 映射为 `INT16`
- [ ] SmFieldType=4 映射为 `INT32`
- [ ] SmFieldType=5 映射为 `INT64`
- [ ] SmFieldType=6 映射为 `SINGLE`
- [ ] SmFieldType=7 映射为 `DOUBLE`
- [ ] SmFieldType=8 映射为 `DATE`
- [ ] SmFieldType=9 映射为 `BINARY`
- [ ] SmFieldType=10 映射为 `GEOMETRY`
- [ ] SmFieldType=11 映射为 `CHAR`
- [ ] SmFieldType=127 映射为 `NTEXT`
- [ ] SmFieldType=128 映射为 `TEXT`
- [ ] SmFieldType=16 映射为 `TIME`
- [ ] `FieldType.getSqliteType()` 返回正确

---

## CRUD 操作正确性

### 读取操作

- [ ] `list()` 返回所有 Feature/Record
- [ ] `list(options)` 支持分页 (limit/offset)
- [ ] `getById(id)` 正确返回或返回 null
- [ ] `count()` 返回准确数量
- [ ] `stream()` 正确实现惰性读取

### 写入操作

- [ ] `insert()` 单条写入成功
- [ ] `insert()` 返回写入后的 Feature（含 ID）
- [ ] `insertMany()` 批量写入成功
- [ ] `insertMany()` 使用事务包裹
- [ ] 写入时检查字段类型匹配
- [ ] 写入时检查几何类型匹配

### 更新操作

- [ ] `update()` 按 ID 更新成功
- [ ] `update()` 支持仅更新 geometry
- [ ] `update()` 支持仅更新 attributes
- [ ] `update()` 支持同时更新两者

### 删除操作

- [ ] `delete()` 按 ID 删除成功
- [ ] `delete()` 返回 boolean 表示是否成功
- [ ] 删除不存在的 ID 不抛异常

---

## 编解码器字节级一致性

### Golden Bytes 测试

- [ ] 解码 `point-2d/simple.bin` 结果正确
- [ ] 解码 `point-2d/with-srid.bin` 结果正确
- [ ] 解码 `point-3d/simple.bin` 结果正确
- [ ] 解码 `multilinestring-2d/simple.bin` 结果正确
- [ ] 解码 `multipolygon-2d/simple-with-hole.bin` 结果正确
- [ ] 编码输出与 golden bytes 字节级一致

### 边界情况

- [ ] 处理空坐标数组
- [ ] 处理无效 geoType
- [ ] 处理缺失结束标记 `0xFE`
- [ ] 处理非法字节序

---

## 错误分类合规度

### 异常类型

- [ ] `UdbxError` 基类继承 `RuntimeException`
- [ ] `UdbxFormatError` 格式错误
- [ ] `UdbxNotFoundError` 未找到
- [ ] `UdbxUnsupportedError` 不支持
- [ ] `UdbxConstraintError` 约束违反
- [ ] `UdbxIOError` IO 错误

### 错误代码

- [ ] 所有异常提供 `getCode()` 方法
- [ ] 代码值与规范一致 (`FORMAT_ERROR`, `NOT_FOUND`, 等)

### 错误链

- [ ] 异常支持 cause 链
- [ ] IO 错误包装原始 `IOException`

---

## 系统表处理

### SmRegister

- [ ] 正确读取数据集元信息
- [ ] 正确处理所有 DatasetKind

### SmFieldInfo

- [ ] 正确读取字段元信息
- [ ] 正确处理所有 FieldType

### geometry_columns

- [ ] 空间数据集正确注册
- [ ] `f_table_name` 小写存储
- [ ] `f_geometry_column` 固定为 "SmGeometry"
- [ ] `geometry_type` 正确设置 GAIA geoType

---

## 测试覆盖率要求

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 集成测试覆盖所有 Dataset 类型
- [ ] 编解码器测试覆盖所有 geoType
- [ ] 错误处理测试覆盖所有异常类型

---

## 签名

完成检查后，在此签名：

```
实现者: ________________
日期: ________________
版本: udbx4j v_______
```
