# 跨语言 Roundtrip 合规测试矩阵

本文档定义 `udbx4spec` 当前阶段要求的跨语言 roundtrip 测试矩阵。目标不是一次性追求所有语言、所有数据类型、所有来源文件全部完成，而是建立一套可增量执行、可记录结果、可用于发版门禁的统一基线。

## 1. 术语

- **Golden GAIA Bytes**：`golden-gaia-bytes/` 目录中的标准 GAIA 几何二进制夹具。
- **Golden GeoText Bytes**：`golden-text-bytes/` 目录中的标准 GeoText 二进制夹具。
- **Compliance DB**：`compliance.udbx`，标准集成测试数据库。
- **语义 roundtrip**：读取后再写出，要求语义等价，不要求字节完全一致。
- **字节 roundtrip**：读取后再写出，要求输出二进制与 Golden Bytes 完全一致。
- **实现**：当前至少指 `udbx4j`、`udbx4ts`、`udbx4go`。

## 2. 优先级

### P0

1. 读取 Golden Bytes 并正确解码为 GeoJSON-like 几何。
2. 按 `fixtures/manifest.json` 打开 `compliance.udbx` 并正确读取数据集、字段和对象数。
3. 重新编码 Golden Bytes，对 point/line/region 做字节级一致性比较。

### P1

1. 以 `compliance.udbx` 为输入做单语言语义 roundtrip。
2. 以 `compliance.udbx` 为输入做跨语言语义 roundtrip。
3. 校验 `SmRegister`、`SmFieldInfo`、`geometry_columns` 的元信息一致性。

### P2

1. 扩展到 `pointZ`、`lineZ`、`regionZ`。（当前基线已完成）
2. 扩展到 `cad` 的最小 GeoHeader 基线。（当前基线已完成，覆盖 `GeoPoint` / `GeoLine` / `GeoRegion`）
3. 扩展到 `text`。（当前基线已完成，覆盖 Golden GeoText Bytes、`test_text` 合规数据库资产和三端 R4/R5 语义 roundtrip）
4. 扩展到未来加入的 SuperMap 主流 UDBX 样本集合。

## 3. 测试维度

| 编号 | 维度 | 输入 | 输出 | 验收要求 | 优先级 |
|------|------|------|------|----------|--------|
| R1 | Golden decode | `point-2d/simple.bin` 等 | GeoJSON-like geometry | 类型、坐标、SRID、bbox 与 manifest 一致 | P0 |
| R2 | Golden encode | GeoJSON-like geometry | `.bin` | 输出 SHA-256 与 Golden Bytes 一致 | P0 |
| R3 | Compliance read | `compliance.udbx` | 数据集对象 | 数据集名称、kind、字段类型、对象数满足 manifest | P0 |
| R4 | Same-language semantic roundtrip | `compliance.udbx` | 新建 `.udbx` | 读取结果语义等价，元信息不退化 | P1 |
| R5 | Cross-language semantic roundtrip | 某语言输出 `.udbx` | 另一语言读取结果 | 几何与属性语义等价，元信息不退化 | P1 |
| R6 | Source fixture expansion | SuperMap 样本 / 未来 fixture | T3 Source-derived Fixture 与验证报告 | 新资产按准入指南进入矩阵并补 manifest | P2 |

## 4. 当前基线资产

### Golden Bytes

- `point-2d/simple.bin`
- `point-3d/simple.bin`
- `multilinestring-2d/simple.bin`
- `multilinestring-3d/simple.bin`
- `multipolygon-2d/simple.bin`
- `multipolygon-3d/simple.bin`
- `golden-text-bytes/geotext/simple-utf8.bin`

### Compliance DB

- 数据集：`test_points`、`test_lines`、`test_regions`、`test_points_z`、`test_lines_z`、`test_regions_z`、`test_tabular`、`test_cad`、`test_text`
- FieldType 覆盖：`text`、`int32`、`double`
- DatasetKind 覆盖：`point`、`line`、`region`、`pointZ`、`lineZ`、`regionZ`、`tabular`、`cad`、`text`

### Roundtrip DB

- `roundtrip/udbx4ts-roundtrip.udbx`：由 `udbx4ts` 读取 `compliance.udbx` 后重新写出，用于验证其他语言读取 TypeScript 写出结果。
- `roundtrip/udbx4go-roundtrip.udbx`：由 `udbx4go` 读取 `compliance.udbx` 后重新写出，用于验证其他语言读取 Go 写出结果。
- `roundtrip/udbx4j-roundtrip.udbx`：由 `udbx4j` 读取 `compliance.udbx` 后重新写出，用于验证其他语言读取 Java 写出结果。

### Source-derived Fixtures

当前 T3 资产：

| Fixture | 来源 | stability | usage | 目标 |
|---|---|---|---|---|
| `sampledata-county-t-smid-1-smgeometry` | `SampleData.udbx` / `County_T` / `SmID=1 SmGeometry` | `stable` | `decode` | 验证真实 Text 数据集中非 UTF-8 可读 `faceName` / `subText` 字节的保留和容错解码行为 |
| `sampledata-caddt-smid-1-smgeometry` | `SampleData.udbx` / `CADDT` / `SmID=1 SmGeometry` | `stable` | `decode` | 验证真实 CAD 数据集中无样式 `GeoPoint` GeoHeader BLOB 的解码行为 |
| `sampledata-caddt-smid-16-smgeometry` | `SampleData.udbx` / `CADDT` / `SmID=16 SmGeometry` | `stable` | `decode` | 验证真实 CAD 数据集中无样式 `GeoLine` GeoHeader BLOB 的子对象和坐标解码行为 |
| `sampledata-caddt-smid-63-smgeometry` | `SampleData.udbx` / `CADDT` / `SmID=63 SmGeometry` | `stable` | `decode` | 验证真实 CAD 数据集中无样式 `GeoRegion` GeoHeader BLOB 的子对象和坐标解码行为 |
| `sampledata-3d-srid-zero-metadata` | `SampleData.udbx` / `BaseMap_PZ`、`BaseMap_LZ`、`BaseMap_RZ` | `stable` | `read` | 验证真实 3D 数据集中 `SmRegister.SmSRID=0`、`geometry_columns.srid=0`、`coord_dimension=3` 和 GAIA 3D `geoType` 共存的系统表行为 |

这些 T3 资产已具备 stable 工程准入记录。manifest 中记录来源、授权确认文件、生成产品版本和脱敏结论。当前 Java / TypeScript / Go 已接入 Text / CAD bytes 的 stable decode 自动化验证、3D metadata-json 自动化校验和三端真实样本读取测试；发布前必须运行各实现的 `test-stable-t3` 门禁。

## 5. 语言实现矩阵

| 实现 | R1 Golden decode | R2 Golden encode | R3 Compliance read | R4 单语言语义 roundtrip | R5 跨语言语义 roundtrip | 当前说明 |
|------|------------------|------------------|--------------------|-------------------------|-------------------------|----------|
| `udbx4spec` | 提供资产 | 提供资产 | 提供资产 | 提供 roundtrip 资产 | 提供三实现 roundtrip 资产 | 规范与夹具仓库；当前提供 `udbx4ts`、`udbx4go`、`udbx4j` 三份写出夹具 |
| `udbx4j` | 已接入 | 已接入 | 已接入 | 已接入 | 已接入三实现闭环 | JVM 主实现；当前基线覆盖 2D/3D 矢量、tabular、Text / GeoText 与 CAD 最小 GeoHeader，并已读取 `udbx4ts-roundtrip.udbx`、`udbx4go-roundtrip.udbx`、`udbx4j-roundtrip.udbx`；已接入 T3 stable GeoText bytes、CAD Point/Line/Region bytes、3D metadata-json 和 `SampleData.udbx` 真实样本读取测试；公开 API 最小稳定面已统一 `getDataset/getById` not found 错误、`list` 升序、`count` 物理表计数、`update/delete` 缺失对象错误和未知字段错误语义 |
| `udbx4ts` | 已接入 | 已接入 | 已接入 | 已接入 | 已接入三实现闭环 | Web/Node 主实现；当前基线覆盖 2D/3D 矢量、tabular、Text / GeoText 与 CAD 最小 GeoHeader，已生成 `udbx4ts-roundtrip.udbx`，并读取 manifest 中全部 roundtrip 夹具；已接入 T3 stable GeoText bytes、CAD Point/Line/Region bytes、3D metadata-json 和 `SampleData.udbx` 真实样本读取测试；公开 API 最小稳定面已统一 `getDataset/getById` rejected not found、`list` 升序、`count` 物理表计数、`update/delete` 缺失对象错误和未知字段错误语义 |
| `udbx4go` | 已接入 | 已接入 | 已接入 | 已接入 | 已接入三实现闭环 | Go 实现；当前基线覆盖 2D/3D 矢量、tabular、Text / GeoText 与 CAD 最小 GeoHeader，已生成 `udbx4go-roundtrip.udbx`，并读取 `udbx4ts-roundtrip.udbx`、`udbx4go-roundtrip.udbx`、`udbx4j-roundtrip.udbx`；已接入 T3 stable GeoText bytes、CAD Point/Line/Region bytes、3D metadata-json 和 `SampleData.udbx` 真实样本读取测试，并统一非法 UTF-8 逐字节替换语义；公开 API 最小稳定面已统一 `GetDataset/GetByID` not found error、`List` 升序、`Count` 物理表计数、`Update/Delete` 缺失对象错误和未知字段错误语义 |

## 5.1 M4 六组合状态

路线图 M4 要求 Java、TypeScript、Go 三端两两互读写。当前三份 roundtrip 夹具均由 `compliance.udbx` 语义写出，覆盖 `point`、`line`、`region`、`pointZ`、`lineZ`、`regionZ`、`tabular`、`cad`、`text`。六个有向组合状态如下：

| 写出实现 | 读取实现 | 夹具 | 自动化证据 | 状态 |
|---|---|---|---|---|
| Java | TypeScript | `roundtrip/udbx4j-roundtrip.udbx` | `udbx4ts/tests/integration/udbx4spec-compliance.integration.spec.ts` 读取 roundtrip manifest 全部夹具 | ✅ 已验证 |
| Java | Go | `roundtrip/udbx4j-roundtrip.udbx` | `udbx4go/udbx4spec_compliance_test.go` 的 `TestUdbx4SpecUdbx4JRoundtripDatabaseRead` | ✅ 已验证 |
| TypeScript | Java | `roundtrip/udbx4ts-roundtrip.udbx` | `udbx4j/src/test/java/com/supermap/udbx/integration/Udbx4SpecComplianceDatabaseReadTest.java` 的 `should_read_udbx4ts_roundtrip_database` | ✅ 已验证 |
| TypeScript | Go | `roundtrip/udbx4ts-roundtrip.udbx` | `udbx4go/udbx4spec_compliance_test.go` 的 `TestUdbx4SpecUdbx4TsRoundtripDatabaseRead` | ✅ 已验证 |
| Go | Java | `roundtrip/udbx4go-roundtrip.udbx` | `udbx4j/src/test/java/com/supermap/udbx/integration/Udbx4SpecComplianceDatabaseReadTest.java` 的 `should_read_udbx4go_roundtrip_database` | ✅ 已验证 |
| Go | TypeScript | `roundtrip/udbx4go-roundtrip.udbx` | `udbx4ts/tests/integration/udbx4spec-compliance.integration.spec.ts` 读取 roundtrip manifest 全部夹具 | ✅ 已验证 |

当前 M4 状态：最小合规基线已完成。后续 M4 扩展不再追求重复证明六个基础组合，而应在新增 DatasetKind、复杂 Text/CAD 行为或新的 T3 stable 夹具时同步扩展 roundtrip manifest 和三端读取测试。

## 6. 发版门禁建议

### `udbx4spec`

- `node tools/generate-golden-gaia-bytes.mjs`
- `node tools/generate-golden-text-bytes.mjs`
- `node tools/generate-compliance-db.mjs`
- `node tools/generate-roundtrip-fixtures.mjs`
- `node tools/check-fixtures.mjs`

### `udbx4j`

- 必须有 R1、R2、R3、R4 自动化测试。
- 必须至少读取一个其他语言写出的 roundtrip 夹具。
- 发布前至少一次针对当前 `compliance.udbx` 的完整执行记录。
- 必须运行 `make test-stable-t3`，覆盖 T3 stable bytes、3D metadata-json 和 `SampleData.udbx` 真实样本读取。
- 若发布说明声明更多真实样本兼容范围，必须同步运行对应真实样本测试，例如 `HenanDatasetReadTest`。

### `udbx4ts`

- 必须有 R1、R2、R3、R4 自动化测试。
- 必须生成至少一个供其他语言读取的 roundtrip 夹具。
- 发布前至少一次针对当前 `compliance.udbx` 的完整执行记录。
- 必须运行 `npm run test:stable-t3`，覆盖 T3 stable bytes、3D metadata-json 和 `SampleData.udbx` 真实样本读取。

### `udbx4go`

- 必须有 R1、R2、R3、R4 自动化测试。
- 必须至少读取一个其他语言写出的 roundtrip 夹具。
- 发布前至少一次针对当前 `compliance.udbx` 的完整执行记录。
- 必须运行 `make test-stable-t3`，覆盖 T3 stable bytes、3D metadata-json 和 `SampleData.udbx` 真实样本读取。

## 7. 结果记录格式

每个实现建议采用统一记录格式：

| 字段 | 说明 |
|------|------|
| `specVersion` | 对应 `udbx4spec` 版本 |
| `fixtureSha256` | `compliance.udbx` 或 Golden Bytes 的 SHA-256 |
| `implementation` | 实现名称与版本 |
| `matrixCase` | 如 `R1-point-2d-simple` |
| `result` | `pass` / `fail` / `not-run` |
| `notes` | 补充说明、已知偏差、缺失能力 |

## 8. 后续扩展规则

新增 fixture、数据类型或来源样本时，必须同步更新以下内容：

1. 相应 manifest。
2. 本矩阵文档的基线资产和测试维度。
3. 至少一个语言实现中的自动化测试入口。
4. 发布说明或变更记录中的合规范围描述。

若新增资产来自真实样本，还必须先按工作区 `docs/guides/source-fixture-admission.md` 完成来源、授权、脱敏和规范价值判定。公开状态待定的样本不得作为公开 T3 夹具发布。
