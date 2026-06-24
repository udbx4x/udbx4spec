# 合规夹具标准

本文档定义 `udbx4spec/compliance/` 下合规夹具的分层、准入、manifest 字段和维护规则。它用于保证 Java、TypeScript、Go 以及后续语言实现消费同一组资产时，能够得到一致的测试含义。

合规夹具是规范资产，不是真实样本归档。真实样本应先记录在工作区 `docs/samples/`，只有在来源、授权、脱敏和规范价值明确后，才能沉淀为 `udbx4spec` 合规夹具。

## 分层

| 层级 | 名称 | 目录 | 目标 | 发布要求 |
|---|---|---|---|---|
| T0 | Golden Bytes | `golden-gaia-bytes/`、`golden-text-bytes/` | 验证二进制编解码的字节级事实 | 必须小型、确定、可公开、可重复生成 |
| T1 | Compliance DB | `compliance.udbx`、`fixtures/manifest.json` | 验证标准数据库读取、系统表、字段、对象数和最小数据集行为 | 必须小型、确定、可公开、可重复生成 |
| T2 | Roundtrip DB | `roundtrip/` | 验证单语言和跨语言写出结果能被其他实现读取 | 必须记录生产实现、源夹具和语义验收范围 |
| T3 | Source-derived Fixture | `source-derived/` | 将真实样本中的稳定、可公开、可脱敏行为沉淀为规范夹具 | 必须先完成样本授权和规范归因；新来源首次接入默认 `experimental`，完成准入后可提升为 `stable` |

当前 `source-derived/` 已接入 `SampleData.udbx` 派生的 T3 `stable` 资产，覆盖 `County_T` Text 异常字节、`CADDT` CAD Point / Line / Region bytes，以及 3D `SmSRID=0` metadata-json。授权确认记录见 `docs/samples/licenses/sampledata-public-distribution-confirmation.md`；生成产品版本为 `SuperMap iDesktopX 2025 V12.0.1.0`。

## Manifest 必填字段

所有 manifest 顶层必须包含：

- `schemaVersion`：manifest 格式版本，当前为 `1`。
- `generatedAt`：生成时间。若内容未变化，生成脚本应保留原值。
- `status`：资产状态。当前可用值为 `ready`。
- `fixtures`：夹具条目数组。

所有 fixture 条目必须包含：

- `id`：稳定唯一标识。不得因文件移动之外的原因变更。
- `path`：相对当前资产目录的文件路径。
- `tier`：夹具层级，取值为 `T0`、`T1`、`T2`、`T3`。
- `stability`：稳定性，取值为 `stable`、`experimental`、`deprecated`。
- `usage`：消费方式数组，取值为 `decode`、`encode`、`read`、`write`、`roundtrip`、`performance`。
- `byteSize`：文件大小。
- `sha256`：文件 SHA-256。

不同层级还应包含：

- T0：`geometryType` 或等价类型、二进制布局、坐标或文本语义。
- T1：`requiredDatasets`、`requiredFieldTypes`、`expectedGeometryColumns`。
- T2：`source`、`producer`、`requiredDatasets`。
- T3：`source`、`licenseStatus`、`deidentification` 和从真实样本抽取的规范价值 `specValue`。

T3 条目的 `source` 至少应包含：

- `sample`：源样本路径。
- `sha256`：源样本 SHA-256。
- `dataset`：源数据集名称。
- `selection`：源记录、字段或筛选条件。

T3 条目的 `licenseStatus` 取值为：

- `public-confirmed`：已确认可公开分发。
- `internal-only`：仅限内部验证，不得进入公开发布资产。
- `pending`：公开状态待定，不得进入公开发布资产。

T3 条目的 `deidentification` 取值为：

- `not-required`：无需脱敏。
- `applied`：已脱敏。
- `pending`：脱敏结论待确认，不得提升为 stable 发布门禁资产。

## 稳定性语义

| stability | 含义 |
|---|---|
| `stable` | 发布基线资产。SDK 发布前必须通过对应检查。 |
| `experimental` | 探索性资产。可以用于本地验证，不作为发布门禁。 |
| `deprecated` | 保留用于历史回归，不再作为新实现验收目标。 |

当前 `compliance/` 内已有 T0、T1、T2 资产均应标记为 `stable`；已接入并完成公开分发确认的 T3 source-derived 资产标记为 `stable`。

## 消费方式语义

| usage | 含义 |
|---|---|
| `decode` | SDK 必须能从二进制或数据库解码为规范语义。 |
| `encode` | SDK 写出结果应与 Golden Bytes 或规范语义一致。 |
| `read` | SDK 必须能打开并读取数据库夹具。 |
| `write` | SDK 必须能生成同类数据库或数据集。 |
| `roundtrip` | SDK 必须能读入后写出，并保持语义等价。 |
| `performance` | 可作为性能基线输入。当前 `udbx4spec` 合规夹具不承担性能基线职责。 |

## 准入规则

新增或修改夹具必须满足以下要求：

1. 先更新规范文档，明确新增行为属于格式事实、API 语义还是兼容性证据。
2. 更新生成脚本，不得手工编辑 `.bin`、`.udbx`、roundtrip 数据库或 source-derived metadata-json。
3. 更新对应 manifest，补齐必填字段。
4. 执行 `node tools/check-fixtures.mjs`。
5. 更新 `compliance/README.md`、`roundtrip-matrix.md` 和相关语言合规报告。
6. 若夹具来自真实样本，先在工作区 `docs/samples/` 补齐来源、授权、脱敏和公开状态。

真实来源夹具的详细操作流程见工作区指南 `docs/guides/source-fixture-admission.md`。

## 不允许的做法

- 不得把来源未确认或不可公开样本直接放入 `udbx4spec/compliance/`。
- 不得把真实样本中的偶然值硬编码为规范。
- 不得只新增二进制文件而不更新 manifest。
- 不得绕过 `check-fixtures.mjs` 发布合规资产。
- 不得用性能样本替代合规夹具。
