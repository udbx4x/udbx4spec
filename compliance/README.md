# UDBX 合规测试资产

本目录用于存放跨语言一致性测试资产，用于验证各 UDBX 实现之间的兼容性。

当前状态：本目录已包含覆盖 2D/3D 矢量、tabular、CAD 最小 GeoHeader 与首个 GeoText 最小 UTF-8 样本的 Golden 二进制夹具、机器可读 manifest、真实 `compliance.udbx`、语言检查清单和 roundtrip 矩阵文档。任何 SDK 不得仅因本目录存在资产文件而宣称已经通过完整合规测试，仍需按矩阵执行并记录结果。

## 目录结构

```
compliance/
├── README.md                          # 本文件
├── fixtures/                          # 标准合规数据库 manifest
├── golden-gaia-bytes/                 # 标准 GAIA 二进制 BLOB 与 manifest
├── golden-text-bytes/                 # 标准 GeoText 二进制 BLOB 与 manifest
├── roundtrip/                         # 跨语言 roundtrip 数据库夹具与 manifest
├── source-derived/                    # 从公开真实样本派生的 T3 合规夹具
├── compliance.udbx                      # 标准测试数据库
├── fixture-standard.md                # 合规夹具分层、准入和 manifest 字段标准
├── roundtrip-matrix.md                # 跨语言 roundtrip 合规测试矩阵
├── java-compliance-checklist.md       # Java 实现检查清单
└── ts-compliance-checklist.md         # TypeScript 实现检查清单
```

## 组成部分

### 1. Golden GAIA Bytes

位于 `golden-gaia-bytes/` 目录。当前已生成首批最小 `.bin` 文件和 `manifest.json`，用于验证 GAIA 编解码器的字节级一致性。

当前覆盖范围：

| Fixture | geometryType | geoType | SRID | 说明 |
|---------|--------------|---------|------|------|
| `point-2d/simple.bin` | Point | 1 | 4326 | 2D 点 |
| `point-3d/simple.bin` | Point | 1001 | 4326 | 3D 点 |
| `multilinestring-2d/simple.bin` | MultiLineString | 5 | 4326 | 2D 多线 |
| `multilinestring-3d/simple.bin` | MultiLineString | 1005 | 4326 | 3D 多线 |
| `multipolygon-2d/simple.bin` | MultiPolygon | 6 | 4326 | 2D 多面 |
| `multipolygon-3d/simple.bin` | MultiPolygon | 1006 | 4326 | 3D 多面 |

详见：[golden-gaia-bytes/README.md](./golden-gaia-bytes/README.md)

### 2. Golden GeoText Bytes

位于 `golden-text-bytes/` 目录。当前已生成首个最小 UTF-8 GeoText `.bin` 文件和 `manifest.json`，用于验证 Text / GeoText 编解码器的字节级一致性。

当前覆盖范围：

| Fixture | geometryType | geoType | 说明 |
|---------|--------------|---------|------|
| `geotext/simple-utf8.bin` | Text | 7 | 单子对象 GeoText，字体 `宋体`，文本 `河南省` |

### 3. compliance.udbx

标准测试数据库，包含已知数据集和特征，用于集成测试。当前数据库已经生成，哈希、大小和验收约束记录在 [`fixtures/manifest.json`](./fixtures/manifest.json)。

**数据库内容**：

| 数据集名称 | 类型 | 对象数 | 描述 |
|-----------|------|--------|------|
| `test_points` | PointDataset | 3 | 2D 点，字段包含 `NAME`、`CATEGORY`、`ELEVATION` |
| `test_lines` | LineDataset | 2 | 2D 多线，字段包含 `NAME`、`LEVEL`、`LENGTH_KM` |
| `test_regions` | RegionDataset | 1 | 带内环的 2D 多边形，字段包含 `NAME`、`LEVEL`、`AREA_KM2` |
| `test_points_z` | PointZDataset | 2 | 3D 点，字段包含 `NAME`、`CATEGORY`、`ELEVATION` |
| `test_lines_z` | LineZDataset | 1 | 3D 多线，字段包含 `NAME`、`LEVEL`、`LENGTH_KM` |
| `test_regions_z` | RegionZDataset | 1 | 3D 多面，字段包含 `NAME`、`LEVEL`、`AREA_KM2` |
| `test_tabular` | TabularDataset | 2 | 纯属性记录，字段包含 `NAME`、`VALUE`、`SCORE` |
| `test_cad` | CadDataset | 3 | CAD 最小 GeoHeader，覆盖 `GeoPoint`、`GeoLine`、`GeoRegion`，字段包含 `NAME`、`LEVEL` |
| `test_text` | TextDataset | 1 | Text / GeoText 最小 UTF-8 样本，字段包含 `NAME`、`LEVEL`，`SmGeometry` 为 GeoText，`SmIndexKey` 为范围 polygon |

**字段定义**：

当前数据库至少覆盖以下 FieldType：

- `text`
- `int32`
- `double`

**生成方式**：

```bash
cd udbx4spec
node tools/generate-compliance-db.mjs
```

当前脚本复用 `udbx4ts/dist/index.js` 中的核心 `UdbxDataSource` 与 Dataset API，并使用 Node 内置 `node:sqlite` 驱动写出文件型 SQLite 数据库。生成后会统一系统表时间戳，使二进制输出尽可能稳定。

### 4. roundtrip 夹具

位于 `roundtrip/` 目录。当前已提供三份跨语言 roundtrip 夹具：

- `udbx4ts-roundtrip.udbx`：由 `udbx4ts` 读取标准 `compliance.udbx` 后重新写出
- `udbx4go-roundtrip.udbx`：由 `udbx4go` 读取标准 `compliance.udbx` 后重新写出
- `udbx4j-roundtrip.udbx`：由 `udbx4j` 读取标准 `compliance.udbx` 后重新写出

这些夹具用于验证不同语言实现对其他实现写出结果的读取兼容性。

生成方式：

```bash
cd udbx4spec
node tools/generate-roundtrip-fixtures.mjs
```

### 5. 合规检查清单

- `java-compliance-checklist.md` — Java 实现合规检查项
- `ts-compliance-checklist.md` — TypeScript 实现合规检查项

实现者应逐项检查并签名确认。

### 6. Roundtrip 矩阵

- [`roundtrip-matrix.md`](./roundtrip-matrix.md) — 定义 Golden Bytes、`compliance.udbx` 读取、语义 roundtrip、字节级 roundtrip 的优先级与验收要求

### 7. 夹具标准

- [`fixture-standard.md`](./fixture-standard.md) — 定义 T0/T1/T2/T3 分层、manifest 必填字段、稳定性语义、消费方式和准入规则。
- 当前 manifest 条目必须声明 `tier`、`stability` 和 `usage`，并由 `tools/check-fixtures.mjs` 校验。

### 8. Source-derived Fixtures

位于 `source-derived/` 目录。该目录只接收已完成公开状态判定、来源记录和规范价值说明的 T3 夹具。

当前 `SampleData.udbx` 派生的 T3 夹具为 `stable`，用于固定已完成公开状态判定、来源记录、授权确认、生成工具版本、脱敏结论和 Java / TypeScript / Go 三端自动化验证的真实样本行为。新来源首次接入时可先标记为 `experimental`，完成准入后再提升为 `stable`。

## 使用方法

### 本地资产检查

```bash
cd udbx4spec
node tools/check-fixtures.mjs
```

该检查会验证：

- `fixtures/manifest.json` 的基础结构。
- `golden-gaia-bytes/manifest.json` 的基础结构。
- `golden-text-bytes/manifest.json` 的基础结构。
- `roundtrip/manifest.json` 的基础结构。
- `source-derived/manifest.json` 的基础结构。
- 每个 manifest 条目的 `tier`、`stability` 和 `usage` 是否符合 [夹具标准](./fixture-standard.md)。
- `compliance.udbx` 的文件大小、SHA-256、系统表和数据集覆盖。
- `roundtrip/*.udbx` 的文件大小、SHA-256、系统表和数据集覆盖。
- 每个 golden bytes 文件的文件大小、SHA-256、GAIA 头部标记、SRID、`geoType` 和结束标记。
- 每个 golden GeoText bytes 文件的 `geoType`、`styleSize`、`subCount`、字符串字节长度和子文本布局。
- 每个 T3 source-derived GeoText bytes 文件的来源字段、授权状态、脱敏状态、文件大小、SHA-256 和原始字符串字节布局。
- 每个 T3 source-derived CAD bytes 文件的来源字段、授权状态、脱敏状态、文件大小、SHA-256 和无样式 GeoHeader 布局。
- 每个 T3 source-derived metadata-json 文件的文件大小、SHA-256、JSON 结构，以及与源样本系统表和首条 GAIA header 的一致性。

### 编解码器测试

各实现应提供测试读取 golden bytes 并验证解码结果：

```typescript
// TypeScript 示例
test('compliance: decode golden point-2d', async () => {
  const blob = await fs.readFile('compliance/golden-gaia-bytes/point-2d/simple.bin');
  const codec = new GaiaPointCodec();
  const geometry = codec.readPoint(blob);

  expect(geometry.type).toBe('Point');
  expect(geometry.coordinates).toEqual([116.123, 39.456]);
  expect(geometry.srid).toBe(4326);
});
```

```java
// Java 示例
@Test
void testDecodeGoldenPoint2D() throws Exception {
    byte[] blob = Files.readAllBytes(Path.of("compliance/golden-gaia-bytes/point-2d/simple.bin"));
    GaiaPointCodec codec = new GaiaPointCodec();
    PointGeometry geometry = codec.readPoint(blob);

    assertEquals("Point", geometry.getType());
    assertArrayEquals(new double[]{116.123, 39.456}, geometry.getCoordinates(), 0.0001);
    assertEquals(4326, geometry.getSrid());
}
```

### 数据库测试

```typescript
// TypeScript 示例
test('compliance: open compliance.udbx', async () => {
  const ds = await createElectronUdbx({ path: 'compliance/compliance.udbx' });
  const pointDs = await ds.getDataset('test_points') as PointDataset;

  expect(await pointDs.count()).toBe(3);

  const features = await pointDs.list();
  expect(features[0].attributes.NAME).toBe('Alpha City');
});
```

## 更新 Golden Bytes

当规范变更需要更新 golden bytes 时：

1. 先更新规范文档，明确变更原因、几何语义和期望行为。
2. 更新 `tools/generate-golden-gaia-bytes.mjs` 中的 fixture 定义。
3. 执行 `node tools/generate-golden-gaia-bytes.mjs` 生成 `.bin` 文件和 manifest。
4. 执行 `node tools/check-fixtures.mjs` 校验资产。
5. 确保所有实现都能正确解码新生成的文件。
6. 提交更新并标注规范版本。

## 版本管理

Golden bytes 和 `compliance.udbx` 应与 udbx4spec 版本同步：

- v1.0.0: 初始规范版本，合规资产结构、首批 Golden GAIA bytes、`compliance.udbx`、manifest、检查清单和 roundtrip 矩阵已建立
- v1.1.0: 当前基线新增 `pointZ`、`lineZ`、`regionZ` 的 Golden Bytes、`compliance.udbx` 和三实现 roundtrip 覆盖
- v1.2.0: 当前基线新增 CAD 最小 GeoHeader（`GeoPoint`、`GeoLine`、`GeoRegion`）的 `compliance.udbx` 和三实现 roundtrip 覆盖
- v1.3.0: 当前基线新增首个 GeoText Golden Bytes 样本、校验规则和 `compliance.udbx` 中的 `test_text` 合规数据库
- 后续版本: 新增更多 GeoText 样式组合、Text roundtrip 夹具和更广泛的 SuperMap 主流 UDBX 样本集合

---

**注意**：`compliance.udbx`、`roundtrip/*.udbx` 和各 `.bin` 文件为二进制文件，
应由实际运行代码生成，不应手动编辑。
