# udbx4spec 工具

本目录存放规范资产的本地生成和检查脚本。脚本必须可重复执行，输出结果应与规范文档和 manifest 保持一致。

## 验证视口空间查询契约

首次运行先安装锁定的本地工具链，再执行契约测试：

```bash
cd udbx4spec
npm install
npm run test:spatial-query-contract
```

测试使用本仓库的 Ajv 2020 验证完整 JSON Schema 引用图，并使用本仓库的 TypeScript 编译器检查参考声明；不依赖全局工具或相邻 SDK 仓库。

## 生成 Golden GAIA Bytes

```bash
cd udbx4spec
node tools/generate-golden-gaia-bytes.mjs
```

该脚本会生成：

- `compliance/golden-gaia-bytes/point-2d/simple.bin`
- `compliance/golden-gaia-bytes/point-3d/simple.bin`
- `compliance/golden-gaia-bytes/multilinestring-2d/simple.bin`
- `compliance/golden-gaia-bytes/multilinestring-3d/simple.bin`
- `compliance/golden-gaia-bytes/multipolygon-2d/simple.bin`
- `compliance/golden-gaia-bytes/multipolygon-3d/simple.bin`
- `compliance/golden-gaia-bytes/manifest.json`

当前脚本依赖 `../udbx4ts/dist/index.js` 暴露的 GAIA codec。若该文件不存在或导出不匹配，先执行：

```bash
cd udbx4ts
npm run build
```

## 生成 Golden GeoText Bytes

```bash
cd udbx4spec
node tools/generate-golden-text-bytes.mjs
```

该脚本会生成：

- `compliance/golden-text-bytes/geotext/simple-utf8.bin`
- `compliance/golden-text-bytes/manifest.json`

当前脚本使用 `udbx4spec` 中已冻结的 GeoText 最小布局，基于 `data/henan.udbx` 的真实样本结构重建最小 UTF-8 文本夹具。

## 生成标准合规数据库

```bash
cd udbx4spec
node tools/generate-compliance-db.mjs
```

该脚本会生成：

- `compliance/compliance.udbx`
- `compliance/fixtures/manifest.json`

当前脚本复用 `../udbx4ts/dist/index.js` 中的核心 `UdbxDataSource`，并通过 Node 内置 `node:sqlite` 驱动生成文件型 SQLite 数据库，因此不依赖 `better-sqlite3` 的本地原生模块状态。

## 生成跨语言 Roundtrip 夹具

```bash
cd udbx4spec
node tools/generate-roundtrip-fixtures.mjs
```

该脚本会生成：

- `compliance/roundtrip/udbx4ts-roundtrip.udbx`
- `compliance/roundtrip/udbx4go-roundtrip.udbx`
- `compliance/roundtrip/udbx4j-roundtrip.udbx`
- `compliance/roundtrip/manifest.json`

当前脚本会生成三份跨语言 roundtrip 夹具：

- `udbx4ts-roundtrip.udbx`：由 `udbx4ts` 读取标准 `compliance.udbx` 后重新写出
- `udbx4go-roundtrip.udbx`：由 `udbx4go` 读取标准 `compliance.udbx` 后重新写出
- `udbx4j-roundtrip.udbx`：由 `udbx4j` 读取标准 `compliance.udbx` 后重新写出

其中 Java 夹具生成依赖本机 Java 17，与 `udbx4j/Makefile` 约定保持一致。

## 生成 Source-derived 夹具

```bash
cd udbx4spec
node tools/generate-source-derived-fixtures.mjs
```

该脚本会从已确认可公开的 `data/SampleData.udbx` 中抽取 T3 stable 夹具：

- `compliance/source-derived/sampledata/county-t/smid-1-smgeometry.bin`
- `compliance/source-derived/sampledata/caddt/smid-1-smgeometry.bin`
- `compliance/source-derived/sampledata/caddt/smid-16-smgeometry.bin`
- `compliance/source-derived/sampledata/caddt/smid-63-smgeometry.bin`
- `compliance/source-derived/sampledata/3d-srid-zero/metadata.json`
- `compliance/source-derived/manifest.json`

当前夹具来源包括 `County_T` Text 异常字节、`CADDT` CAD Point / Line / Region 无样式 GeoHeader，以及 `BaseMap_PZ` / `BaseMap_LZ` / `BaseMap_RZ` 的 3D `SmSRID=0` 系统表摘要。

## 检查合规资产

```bash
cd udbx4spec
node tools/check-fixtures.mjs
```

检查内容包括：

- `compliance/fixtures/manifest.json` 的基础结构。
- `compliance/golden-gaia-bytes/manifest.json` 的基础结构。
- `compliance/golden-text-bytes/manifest.json` 的基础结构。
- `compliance/roundtrip/manifest.json` 的基础结构。
- `compliance/source-derived/manifest.json` 的基础结构。
- 所有 manifest 顶层 `schemaVersion` 和 `status`。
- 所有 fixture 条目的 `tier`、`stability` 和 `usage`，规则以 `compliance/fixture-standard.md` 为准。
- `compliance/compliance.udbx` 的文件大小、SHA-256、系统表、数据集种类、对象数和字段类型覆盖。
- `compliance/roundtrip/*.udbx` 的文件大小、SHA-256、系统表、数据集种类、对象数和字段类型覆盖。
- 每个 golden bytes 文件的文件大小和 SHA-256。
- 每个 golden bytes 文件的 GAIA 起始标记、字节序、SRID、MBR 分隔符、`geoType` 和结束标记。
- 每个 golden GeoText bytes 文件的 `geoType`、`styleSize`、`subCount`、文本样式、字符串字节长度和子文本布局。
- 每个 T3 source-derived GeoText bytes 文件的来源字段、授权状态、脱敏状态、文件大小、SHA-256 和原始字符串字节布局。
- 每个 T3 source-derived CAD bytes 文件的来源字段、授权状态、脱敏状态、文件大小、SHA-256 和无样式 GeoHeader 布局。
- 每个 T3 source-derived metadata-json 文件的文件大小、SHA-256、JSON 结构，以及与源样本系统表和首条 GAIA header 的一致性。

## 维护要求

- 规范语义变更时，先修改 `docs/` 中的规范，再修改生成脚本。
- 任何新增二进制 fixture 都必须写入 manifest，并通过 `check-fixtures.mjs`。
- 任何新增 manifest 条目都必须声明 `tier`、`stability` 和 `usage`。
- 不得手工编辑 `.bin` 文件。
- 不得手工编辑 `compliance.udbx`；数据库内容必须由生成脚本重建。
- 不得手工编辑 `compliance/roundtrip/*.udbx`；roundtrip 数据库必须由生成脚本重建。
- 不得手工编辑 `compliance/source-derived/**/*.bin` 或 `compliance/source-derived/**/*.json`；T3 派生夹具必须由生成脚本重建。
