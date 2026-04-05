# udbx4spec

Cross-language API specification for UDBX (Universal Spatial Database Extension) reader/writer libraries.

UDBX 是超图 SuperMap 定义的一种基于 SQLite 的空间数据库扩展格式。`udbx4spec` 旨在为所有编程语言实现的 UDBX 读写库提供统一的公共接口设计规范，包括命名约定、数据模型、类型分类和错误分类。

## 目标

- **统一命名**：类名、方法名、属性名在不同语言实现中保持一致语义。
- **统一数据模型**：以 GeoJSON-like 结构作为跨语言几何交换的 lingua franca。
- **统一类型分类**：`DatasetKind`、`FieldType` 等分类在所有语言中使用相同的整数值映射。
- **允许语言差异**：同步/异步、生命周期管理、类型系统表达、OOP 风格等可随语言特性变化。

## 包含的语言实现

| 语言 | 项目 | 状态 |
|------|------|------|
| Java | [udbx4j](https://github.com/udbx4x/udbx4j) | v1.0.0 已发布，v2.0.0 开发中 |
| TypeScript | [udbx4ts](https://github.com/udbx4x/udbx4ts) | v0.2.0 已发布，v0.3.0 开发中 |
| Python | — | 规划中 |
| C# | — | 规划中 |
| Go | — | 规划中 |
| Rust | — | 规划中 |

## 规范文档

- [`docs/01-naming-conventions.md`](./docs/01-naming-conventions.md) — 类名、方法名、属性名规范
- [`docs/02-geometry-model.md`](./docs/02-geometry-model.md) — GeoJSON-like 几何数据模型
- [`docs/03-dataset-taxonomy.md`](./docs/03-dataset-taxonomy.md) — `DatasetKind` 分类与数值映射
- [`docs/04-field-taxonomy.md`](./docs/04-field-taxonomy.md) — `FieldType` 分类与数值映射
- `docs/05-error-taxonomy.md` — 错误/异常分类（待补充）
- `docs/06-language-mapping.md` — 特定语言的规范映射示例（待补充）

## 参考定义

- [`reference/typescript/udbx4spec.d.ts`](./reference/typescript/udbx4spec.d.ts) — 权威的 TypeScript 参考类型定义
- `reference/json-schema/` — JSON Schema 形式的机器可读规范（待补充）
- `reference/java/` — Java 伪接口参考（待补充）

## 合规测试

`compliance/` 目录包含跨语言一致性测试夹具：

- `golden-gaia-bytes/` — 标准 GAIA 二进制 BLOB，用于验证各语言编解码器输出字节级一致
- `compliance.udbx` — 标准测试数据库，包含已知数据集和特征
- `java-compliance-checklist.md` / `ts-compliance-checklist.md` — 各语言实现的合规检查清单

## 当前工作进展

- [x] 初始化仓库结构
- [x] 命名规范（01-naming-conventions）
- [x] 几何数据模型（02-geometry-model）
- [x] 数据集分类（03-dataset-taxonomy）
- [x] 字段分类（04-field-taxonomy）
- [x] TypeScript 参考定义（udbx4spec.d.ts）
- [ ] 错误分类文档
- [ ] JSON Schema 定义
- [ ] Java 伪接口参考
- [ ] 合规测试夹具

## 相关项目

- [udbx4j](https://github.com/udbx4x/udbx4j) — Java 实现
- [udbx4ts](https://github.com/udbx4x/udbx4ts) — TypeScript 实现（Browser + Electron）
