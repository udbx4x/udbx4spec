# TypeScript 实现合规检查清单

本清单用于验证 udbx4ts (TypeScript 实现) 是否符合 udbx4spec 规范。

## 命名规范合规度

### 入口类

- [ ] 提供 `UdbxDataSource` 类/接口
  - [ ] 方法 `open()`
  - [ ] 方法 `create()`
  - [ ] 方法 `getDataset(name)`
  - [ ] 方法 `listDatasets()`
  - [ ] 方法 `close()` (可为 async)

### 数据集类名

- [ ] 提供 `Dataset` 接口
- [ ] 提供 `PointDataset` 接口
- [ ] 提供 `LineDataset` 接口
- [ ] 提供 `RegionDataset` 接口
- [ ] 提供 `PointZDataset` 接口
- [ ] 提供 `LineZDataset` 接口
- [ ] 提供 `RegionZDataset` 接口
- [ ] 提供 `TabularDataset` 接口
- [ ] 提供 `CadDataset` 接口

### 方法名 (CRUD)

- [ ] `list(options?)`
- [ ] `getById(id)`
- [ ] `iterate()` (返回 `AsyncIterable<T>`)
- [ ] `insert(feature)`
- [ ] `insertMany(features)`
- [ ] `update(id, changes)`
- [ ] `delete(id)`
- [ ] `count()`

### 属性名

- [ ] Feature/Record 使用 `id`
- [ ] Feature 使用 `geometry`
- [ ] Feature/Record 使用 `attributes`
- [ ] DatasetInfo 使用 `name`
- [ ] DatasetInfo 使用 `tableName`
- [ ] DatasetInfo 使用 `kind`
- [ ] FieldInfo 使用 `name`
- [ ] FieldInfo 使用 `alias`

### 类型定义

- [ ] `DatasetKind` string union
  - [ ] `"tabular"`, `"point"`, `"line"`, `"region"`
  - [ ] `"pointZ"`, `"lineZ"`, `"regionZ"`
  - [ ] `"text"`, `"cad"`
- [ ] `FieldType` string union (全部 14 种)

---

## 几何模型合规度

### GeoJSON-like 结构支持

- [ ] `PointGeometry` interface 定义正确
- [ ] `MultiLineStringGeometry` interface 定义正确
- [ ] `MultiPolygonGeometry` interface 定义正确
- [ ] 坐标数组类型正确

### SRID 处理规则

- [ ] Geometry 级别 `srid` 优先级最高
- [ ] Dataset 级别作为默认值
- [ ] 回退到 0

### Z 值检测

- [ ] 通过 `coordinates` 长度检测
- [ ] `hasZ` 可选属性

### JSTS 适配层 (可选但推荐)

- [ ] 提供 `toJsts(geometry)` 函数
- [ ] 提供 `fromJsts(geom)` 函数
- [ ] 或提供 `JstsGeometryCodec` 类

---

## DatasetKind 映射正确性

- [ ] 所有 kind 字符串与规范一致
- [ ] 运行时正确映射 SmDatasetType 到 kind

---

## FieldType 映射正确性

- [ ] 所有 14 种类型字符串与规范一致
- [ ] 运行时正确映射 SmFieldType 到 FieldType
- [ ] 原有 `"float"` 合并为 `"single"`
- [ ] 原有 `"string"` 对应到 `"text"` 或 `"ntext"`

---

## CRUD 操作正确性

### 读取操作

- [ ] `list()` 正确实现
- [ ] `list(options)` 支持分页
- [ ] `getById()` 正确实现
- [ ] `count()` 正确实现
- [ ] `iterate()` 返回 `AsyncIterable`

### 写入操作

- [ ] `insert()` 单条写入
- [ ] `insertMany()` 批量写入
- [ ] 使用事务包裹批量操作

### 更新/删除

- [ ] `update()` 正确实现
- [ ] `delete()` 正确实现

---

## Worker 架构合规度

### Core + Runtime 分离

- [ ] `src/core/` 不包含浏览器/Electron 特定代码
- [ ] 数据库操作在 Worker 中执行
- [ ] `BrowserDatasetClient` 作为 RPC 代理

---

## 编解码器字节级一致性

### Golden Bytes 测试

- [ ] 所有 golden bytes 文件解码正确
- [ ] 编码输出与 golden bytes 一致

---

## 错误分类合规度

### 异常类型

- [ ] `UdbxError` 基类
- [ ] `UdbxFormatError`
- [ ] `UdbxNotFoundError`
- [ ] `UdbxUnsupportedError`
- [ ] `UdbxConstraintError`
- [ ] `UdbxIOError`

### 错误选项

- [ ] 支持 `code` 属性
- [ ] 支持 `cause` 错误链

---

## 系统表处理

- [ ] 正确读取 SmRegister
- [ ] 正确读取 SmFieldInfo
- [ ] 空间数据集正确注册 geometry_columns

---

## 测试覆盖率要求

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 集成测试覆盖所有场景
- [ ] 浏览器测试通过 Playwright

---

## 签名

```
实现者: ________________
日期: ________________
版本: udbx4ts v_______
```
