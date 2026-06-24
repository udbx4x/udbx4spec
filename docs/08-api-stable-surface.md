# udbx4spec — 公开 API 最小稳定面

本文档定义 Java、TypeScript、Go 三端 SDK 在公开发布前必须保持一致的最小 API 语义。语言实现可以使用各自生态惯用写法，但不得改变本文件定义的行为。

## 目标

最小稳定面用于保证开发者在三端 SDK 中执行同一类 UDBX 操作时得到一致结果：

- 核心概念一致。
- 返回数据结构语义一致。
- 错误分类一致。
- 读写基础行为一致。
- 可由自动化测试和合规报告证明。

## 稳定概念

| 概念 | 规范名 | 说明 |
|---|---|---|
| 数据源 | `DataSource` / `UdbxDataSource` | 一个 UDBX 文件或数据库连接 |
| 数据集 | `Dataset` | UDBX 内一个逻辑数据集 |
| 数据集类型 | `DatasetKind` | 见 `03-dataset-taxonomy.md` |
| 字段类型 | `FieldType` | 见 `04-field-taxonomy.md` |
| 数据集信息 | `DatasetInfo` | 数据集 id、名称、物理表、类型、对象数、SRID |
| 字段信息 | `FieldInfo` | 字段名称、类型、别名、是否必填/可空 |
| 要素 | `Feature` | 空间对象，包含 `id`、`geometry`、`attributes` |
| 属性记录 | `TabularRecord` | 非空间记录，包含 `id`、`attributes` |
| 查询选项 | `QueryOptions` | `ids`、`limit`、`offset` |

## DataSource 稳定面

| 语义 | Java | TypeScript | Go | 统一行为 |
|---|---|---|---|---|
| 打开数据源 | `UdbxDataSource.open` | `UdbxDataSource.open` | `Open` | 打开已有 UDBX；格式错误使用 format error |
| 创建数据源 | `UdbxDataSource.create` | `UdbxDataSource.create` | `Create` | 创建新 UDBX 并初始化系统表 |
| 关闭数据源 | `close` | `close` | `Close` | 释放连接资源；重复关闭不得破坏数据 |
| 列出数据集 | `listDatasets` | `listDatasets` | `ListDatasets` | 返回 `DatasetInfo` 列表，至少包含可识别数据集 |
| 按名称获取数据集 | `getDataset` | `getDataset` | `GetDataset` | 不存在时返回 not found |

## Dataset 稳定面

| 语义 | Java | TypeScript | Go | 统一行为 |
|---|---|---|---|---|
| 元数据 | `getInfo` / `info` | `info` | `Info` | 返回 `DatasetInfo` |
| 字段 | `getFields` | `getFields` | `GetFields` | 返回用户字段，不应暴露系统字段为业务字段 |
| 计数 | `count` | `count` | `Count` | 读取物理表真实行数，不以 `SmRegister.SmObjectCount` 缓存值为准 |
| 列表 | `list` | `list` | `List` | 默认按 `SmID` 升序返回 |
| 迭代读取 | `stream` | `iterate` | 可选 | 与 `list` 同一排序和过滤语义 |
| 按 ID 查询 | `getById` | `getById` | `GetByID` | 不存在时返回 not found，不返回 `null` / `nil` 成功值 |
| 插入 | `insert` | `insert` | `Insert` | 写入记录或要素，并同步对象数 |
| 批量插入 | `insertMany` | `insertMany` | `InsertMany` | 写入多条记录或要素，并同步对象数 |
| 更新 | `update` | `update` | `Update` | 目标不存在时返回 not found；字段不存在时返回字段 not found 或约束错误 |
| 删除 | `delete` | `delete` | `Delete` | 目标不存在时返回 not found，并同步对象数 |

## `getById` 语义

`getById` / `GetByID` 的输入是业务对象 id，对应物理表 `SmID`。

统一规则：

- 找到对象时返回对象。
- 找不到对象时必须进入 not found 错误分支。
- TypeScript 不使用 `null` 表示未找到；应 reject `UdbxNotFoundError`。
- Java 抛出 `UdbxNotFoundError`。
- Go 返回 `nil, error`，且 `errors.IsNotFound(err)` 为 `true`。
- 错误上下文应包含数据集名称和请求 id。

## `list` 语义

统一规则：

- 默认按 `SmID` 升序返回。
- `ids` 过滤只限制结果集合，不改变升序排序。
- `limit` 限制返回数量。
- `offset` 表示跳过升序结果中的前 N 条。
- 空结果返回空集合，不返回 not found。

## `count` 语义

`count` / `Count` 必须读取物理数据表真实行数。

原因：

- `SmRegister.SmObjectCount` 是系统表缓存，可能因外部工具或异常写入产生漂移。
- SDK 对外 API 应反映当前可读取对象数。

写入、更新、删除成功后，SDK 应尽量同步 `SmObjectCount`，但 `count` 的权威来源仍是物理表。

## 错误语义

| 规范错误 | Java | TypeScript | Go | 使用场景 |
|---|---|---|---|---|
| format error | `UdbxFormatError` | `UdbxFormatError` | `CodeFormatError` / `IsFormatError` | 文件结构、二进制编码、系统表内容不合法 |
| not found | `UdbxNotFoundError` | `UdbxNotFoundError` | `CodeNotFound` / `IsNotFound` | 数据源对象、数据集、字段、记录、要素不存在 |
| unsupported | `UdbxUnsupportedError` | `UdbxUnsupportedError` | `CodeUnsupported` / `IsUnsupported` | 格式中存在已识别但暂不支持的能力 |
| constraint | `UdbxConstraintError` | `UdbxConstraintError` | `CodeConstraintViolation` / `IsConstraintViolation` | 写入类型不匹配、字段约束不满足 |
| IO error | `UdbxIOError` | `UdbxIOError` | `CodeIOError` / `IsIOError` | 文件或数据库读写失败 |

## 语言差异边界

允许差异：

- Java 使用同步 API、异常、`AutoCloseable`。
- TypeScript 使用 `Promise`、`AsyncIterable`、联合类型。
- Go 使用 `(value, error)`、导出结构体和接口。

不允许差异：

- 同一对象缺失在某端返回空值、某端返回错误。
- `count` 在某端读物理表、某端读系统表缓存。
- `list` 默认排序在不同语言中不一致。
- `DatasetKind`、`FieldType` 的枚举值或字符串语义不一致。

## 第一阶段验收范围

第一阶段稳定面必须覆盖：

- `tabular`
- `point`
- `line`
- `region`
- `pointZ`
- `lineZ`
- `regionZ`
- `text`
- `cad`

每个语言实现至少应有自动化测试覆盖：

- `getById` 命中和未命中。
- `list` 默认排序。
- `count` 读取物理表真实行数。
- `update/delete` 的缺失对象错误。
- 字段不存在错误。
