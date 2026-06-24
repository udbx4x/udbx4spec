# Source-derived Fixtures

本目录存放从已确认可公开真实样本派生的 T3 合规夹具。

T3 夹具必须由 `udbx4spec/tools/generate-source-derived-fixtures.mjs` 生成，不能手工编辑二进制文件。每个条目必须在 `manifest.json` 中记录源样本、源 SHA-256、抽取条件、授权状态、脱敏状态和规范价值。

当前 T3 夹具均为 `stable`，用于固定已确认可公开真实来源行为。

这些资产由 `node tools/check-fixtures.mjs` 校验；Java、TypeScript、Go 已具备 Text、CAD、3D 真实样本读取或解码证据。授权确认记录见 `docs/samples/licenses/sampledata-public-distribution-confirmation.md`。生成产品版本为 `SuperMap iDesktopX 2025 V12.0.1.0`。

## 当前资产

| Fixture | 来源 | 目标行为 |
|---|---|---|
| `sampledata-county-t-smid-1-smgeometry` | `SampleData.udbx` / `County_T` / `SmID=1 SmGeometry` | 真实 Text 中非 UTF-8 可读 `faceName` / `subText` 原始字节保留和容错解码 |
| `sampledata-caddt-smid-1-smgeometry` | `SampleData.udbx` / `CADDT` / `SmID=1 SmGeometry` | 真实 CAD `GeoPoint` 无样式 GeoHeader 解码 |
| `sampledata-caddt-smid-16-smgeometry` | `SampleData.udbx` / `CADDT` / `SmID=16 SmGeometry` | 真实 CAD `GeoLine` 子对象和坐标解码 |
| `sampledata-caddt-smid-63-smgeometry` | `SampleData.udbx` / `CADDT` / `SmID=63 SmGeometry` | 真实 CAD `GeoRegion` 子对象和坐标解码 |
| `sampledata-3d-srid-zero-metadata` | `SampleData.udbx` / `BaseMap_PZ`、`BaseMap_LZ`、`BaseMap_RZ` | 真实 3D 数据集中 `SmRegister.SmSRID=0`、`geometry_columns.srid=0`、`coord_dimension=3` 和 GAIA 3D `geoType` 共存 |
