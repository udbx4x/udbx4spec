# udbx4spec

`udbx4spec` 是 UDBX（Universal Spatial Database Extension）读写库的跨语言 API 与合规规范工程。

UDBX 是超图 SuperMap 定义的一种基于 SQLite 的空间数据库扩展格式。`udbx4spec` 旨在为所有编程语言实现的 UDBX 读写库提供统一的公共接口设计规范，包括命名约定、数据模型、类型分类和错误分类。

## 目标

- **统一命名**：类名、方法名、属性名在不同语言实现中保持一致语义。
- **统一数据模型**：以 GeoJSON-like 结构作为跨语言几何交换的 lingua franca。
- **统一类型分类**：`DatasetKind`、`FieldType` 等分类在所有语言中使用相同的整数值映射。
- **允许语言差异**：同步/异步、生命周期管理、类型系统表达、OOP 风格等可随语言特性变化。

## 包含的语言实现

| 语言 | 项目 | 状态 |
|------|------|------|
| Java | [udbx4j](https://github.com/udbx4x/udbx4j) | v2.0.0 开发中，已接入当前最小合规闭环 |
| TypeScript | [udbx4ts](https://github.com/udbx4x/udbx4ts) | v0.3.0 开发中，已接入当前最小合规闭环 |
| Go | [udbx4go](https://github.com/udbx4x/udbx4go) | SDK 已接入当前最小合规闭环 |
| Python | — | 规划中 |
| C# | — | 规划中 |
| Rust | — | 规划中 |

## 规范文档

- [`docs/01-naming-conventions.md`](./docs/01-naming-conventions.md) — 类名、方法名、属性名规范
- [`docs/02-geometry-model.md`](./docs/02-geometry-model.md) — GeoJSON-like 几何数据模型
- [`docs/03-dataset-taxonomy.md`](./docs/03-dataset-taxonomy.md) — `DatasetKind` 分类与数值映射
- [`docs/04-field-taxonomy.md`](./docs/04-field-taxonomy.md) — `FieldType` 分类与数值映射
- [`docs/05-error-taxonomy.md`](./docs/05-error-taxonomy.md) — 错误/异常分类
- [`docs/06-language-mapping.md`](./docs/06-language-mapping.md) — 特定语言的规范映射示例
- [`docs/07-geotext-binary-layout.md`](./docs/07-geotext-binary-layout.md) — GeoText 二进制布局

## 参考定义

- [`reference/typescript/udbx4spec.d.ts`](./reference/typescript/udbx4spec.d.ts) — 权威的 TypeScript 参考类型定义
- [`reference/json-schema/`](./reference/json-schema/) — JSON Schema 形式的机器可读规范
- [`reference/java/`](./reference/java/) — Java 伪接口参考

## 合规测试

[`compliance/`](./compliance/) 目录用于沉淀跨语言一致性测试资产。当前已包含覆盖 2D/3D 矢量、tabular、CAD 最小 GeoHeader 基线与 Text / GeoText 最小样本的 Golden 二进制夹具、机器可读 manifest、可重复生成的 `compliance.udbx`、语言检查清单和 roundtrip 矩阵文档。

- [`golden-gaia-bytes/`](./compliance/golden-gaia-bytes/) — 标准 GAIA 二进制 BLOB，当前覆盖 2D/3D 点、2D/3D 多线和 2D/3D 多面
- [`golden-text-bytes/`](./compliance/golden-text-bytes/) — 标准 GeoText 二进制 BLOB，当前覆盖最小 UTF-8 Text 样本
- [`fixtures/`](./compliance/fixtures/) — 标准合规数据库 manifest，记录 `compliance.udbx` 的哈希、大小和验收约束
- [`compliance.udbx`](./compliance/compliance.udbx) — 标准测试数据库，当前覆盖 point/line/region/pointZ/lineZ/regionZ/tabular/cad/text
- [`roundtrip/`](./compliance/roundtrip/) — 跨语言 roundtrip 数据库夹具，当前包含 `udbx4ts-roundtrip.udbx`、`udbx4go-roundtrip.udbx`、`udbx4j-roundtrip.udbx`
- [`fixture-standard.md`](./compliance/fixture-standard.md) — 合规夹具分层、manifest 必填字段、稳定性语义和准入规则
- [`roundtrip-matrix.md`](./compliance/roundtrip-matrix.md) — 跨语言 roundtrip 合规测试矩阵
- [`java-compliance-checklist.md`](./compliance/java-compliance-checklist.md) / [`ts-compliance-checklist.md`](./compliance/ts-compliance-checklist.md) — 各语言实现的合规检查清单
- [`tools/`](./tools/) — 合规资产生成和校验脚本

## 当前工作进展

- [x] 初始化仓库结构
- [x] 命名规范（01-naming-conventions）
- [x] 几何数据模型（02-geometry-model）
- [x] 数据集分类（03-dataset-taxonomy）
- [x] 字段分类（04-field-taxonomy）
- [x] 错误分类（05-error-taxonomy）
- [x] 语言映射示例（06-language-mapping）
- [x] TypeScript 参考定义（udbx4spec.d.ts）
- [x] JSON Schema 定义
- [x] Java 伪接口参考
- [x] 合规测试目录和语言检查清单
- [x] 首批 Golden GAIA `.bin` 文件
- [x] Golden GAIA manifest
- [x] 真实 `compliance.udbx`
- [x] `compliance.udbx` 生成脚本
- [x] 合规资产自动检查工具
- [x] 跨语言 roundtrip 合规测试矩阵
- [x] P0 自动化测试接入
- [x] P1 单语言语义 roundtrip 自动化测试接入
- [x] P1 三实现跨语言 roundtrip 自动化测试闭环
- [x] P2 三维矢量数据集（`pointZ`/`lineZ`/`regionZ`）合规资产与自动化测试接入
- [x] P2 CAD 最小 GeoHeader 数据集（`GeoPoint`/`GeoLine`/`GeoRegion`）合规资产与自动化测试接入
- [x] Text / GeoText 白皮书依据、真实样本偏移表与规范类型定义接入
- [x] Text / GeoText Golden Bytes 与 `test_text` 合规数据库资产接入
- [x] Text / GeoText 三端最小读写闭环与跨语言 roundtrip 接入
- [x] 合规夹具分层、manifest 必填字段和校验规则标准化

## 相关项目

- [udbx4j](https://github.com/udbx4x/udbx4j) — Java 实现
- [udbx4ts](https://github.com/udbx4x/udbx4ts) — TypeScript 实现（Browser + Electron）
- [udbx4go](https://github.com/udbx4x/udbx4go) — Go 实现
