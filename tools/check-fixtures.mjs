#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specRoot = resolve(__dirname, "..");
const complianceRoot = resolve(specRoot, "compliance");
const goldenRoot = resolve(specRoot, "compliance/golden-gaia-bytes");
const goldenTextRoot = resolve(specRoot, "compliance/golden-text-bytes");
const fixtureManifestPath = resolve(specRoot, "compliance/fixtures/manifest.json");
const goldenManifestPath = resolve(goldenRoot, "manifest.json");
const goldenTextManifestPath = resolve(goldenTextRoot, "manifest.json");
const roundtripRoot = resolve(specRoot, "compliance/roundtrip");
const roundtripManifestPath = resolve(roundtripRoot, "manifest.json");
const sourceDerivedRoot = resolve(specRoot, "compliance/source-derived");
const sourceDerivedManifestPath = resolve(sourceDerivedRoot, "manifest.json");
const workspaceRoot = resolve(specRoot, "..");

const datasetKindValues = {
  tabular: 0,
  point: 1,
  line: 3,
  region: 5,
  pointZ: 101,
  lineZ: 103,
  regionZ: 105,
  text: 7,
  cad: 149
};

const fieldTypeValues = {
  boolean: 1,
  byte: 2,
  int16: 3,
  int32: 4,
  int64: 5,
  single: 6,
  double: 7,
  date: 8,
  binary: 9,
  geometry: 10,
  char: 11,
  ntext: 127,
  text: 128,
  time: 16
};

const errors = [];
const validTiers = new Set(["T0", "T1", "T2", "T3"]);
const validStabilities = new Set(["stable", "experimental", "deprecated"]);
const validUsages = new Set(["decode", "encode", "read", "write", "roundtrip", "performance"]);

const requiredUsageByTier = {
  T0: ["decode"],
  T1: ["read"],
  T2: ["roundtrip"]
};

function fail(message) {
  errors.push(message);
}

function validateCommonManifest(manifest, name) {
  if (manifest.schemaVersion !== 1) {
    fail(`${name}: schemaVersion 必须为 1`);
  }
  if (manifest.status !== "ready") {
    fail(`${name}: status 必须为 ready`);
  }
  if (!Array.isArray(manifest.fixtures)) {
    fail(`${name}: fixtures 必须是数组`);
  }
}

function validateCommonFixtureEntry(entry, manifestName) {
  if (!entry.id || !entry.path || !entry.sha256) {
    fail(`${manifestName}: fixture entry 缺少 id/path/sha256`);
    return false;
  }
  if (!validTiers.has(entry.tier)) {
    fail(`${entry.id}: tier 必须是 T0/T1/T2/T3`);
  }
  if (!validStabilities.has(entry.stability)) {
    fail(`${entry.id}: stability 必须是 stable/experimental/deprecated`);
  }
  if (!Array.isArray(entry.usage) || entry.usage.length === 0) {
    fail(`${entry.id}: usage 必须是非空数组`);
  } else {
    for (const usage of entry.usage) {
      if (!validUsages.has(usage)) {
        fail(`${entry.id}: 未知 usage ${usage}`);
      }
    }
    for (const requiredUsage of requiredUsageByTier[entry.tier] ?? []) {
      if (!entry.usage.includes(requiredUsage)) {
        fail(`${entry.id}: ${entry.tier} fixture 必须包含 usage=${requiredUsage}`);
      }
    }
  }
  if (entry.stability === "stable" && entry.status && entry.status !== "ready") {
    fail(`${entry.id}: stable fixture 的 status 必须为 ready`);
  }
  return true;
}

function validateSourceDerivedEntry(entry) {
  if (entry.tier !== "T3") {
    fail(`${entry.id}: source-derived fixture 的 tier 必须为 T3`);
  }
  if (!entry.source?.sample || !entry.source?.sha256 || !entry.source?.dataset || !entry.source?.selection) {
    fail(`${entry.id}: T3 fixture 缺少 source.sample/source.sha256/source.dataset/source.selection`);
  }
  if (!["public-confirmed", "internal-only", "pending"].includes(entry.licenseStatus)) {
    fail(`${entry.id}: licenseStatus 必须是 public-confirmed/internal-only/pending`);
  }
  if (!["not-required", "applied", "pending"].includes(entry.deidentification)) {
    fail(`${entry.id}: deidentification 必须是 not-required/applied/pending`);
  }
  if (!entry.specValue) {
    fail(`${entry.id}: T3 fixture 缺少 specValue`);
  }
  if (entry.source?.dataset === "CADDT" && entry.format !== "cad-geoheader") {
    fail(`${entry.id}: CADDT source-derived fixture 必须声明 format=cad-geoheader`);
  }
  if (entry.id === "sampledata-3d-srid-zero-metadata" && entry.format !== "metadata-json") {
    fail(`${entry.id}: 3D SRID=0 source-derived fixture 必须声明 format=metadata-json`);
  }
  if (entry.stability === "stable" && entry.licenseStatus !== "public-confirmed") {
    fail(`${entry.id}: stable T3 fixture 必须是 public-confirmed`);
  }
  if (entry.stability === "stable" && entry.deidentification === "pending") {
    fail(`${entry.id}: stable T3 fixture 的 deidentification 不能是 pending`);
  }
  if (entry.stability === "stable") {
    if (!entry.licenseName) {
      fail(`${entry.id}: stable T3 fixture 必须声明 licenseName`);
    }
    if (!entry.licenseDocument) {
      fail(`${entry.id}: stable T3 fixture 必须声明 licenseDocument`);
    } else {
      const licenseDocumentPath = resolve(workspaceRoot, entry.licenseDocument);
      if (!existsSync(licenseDocumentPath)) {
        fail(`${entry.id}: stable T3 fixture 的 licenseDocument 不存在：${entry.licenseDocument}`);
      }
    }
    if (!entry.generator?.product) {
      fail(`${entry.id}: stable T3 fixture 必须声明 generator.product`);
    }
    if (!entry.generator?.productVersion) {
      fail(`${entry.id}: stable T3 fixture 必须声明 generator.productVersion；未知时必须显式写 unknown 并补充证据说明`);
    }
    if (entry.generator?.productVersion === "unknown" && !entry.generator?.productVersionEvidence) {
      fail(`${entry.id}: stable T3 fixture 的 generator.productVersion=unknown 时必须声明 productVersionEvidence`);
    }
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readInt32LE(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`无法读取 JSON：${path}：${error.message}`);
    return null;
  }
}

function validateGaiaBytes(entry, bytes) {
  if (bytes.byteLength !== entry.byteSize) {
    fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
  }

  const actualSha = sha256(bytes);
  if (actualSha !== entry.sha256) {
    fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
  }

  if (bytes[0] !== 0x00) {
    fail(`${entry.id}: GAIA start marker 应为 0x00`);
  }
  if (bytes[1] !== 0x01) {
    fail(`${entry.id}: GAIA byte order 应为 0x01`);
  }
  if (readInt32LE(bytes, 2) !== entry.srid) {
    fail(`${entry.id}: SRID 不匹配`);
  }
  if (bytes[38] !== 0x7c) {
    fail(`${entry.id}: GAIA MBR marker 应为 0x7c`);
  }
  if (readInt32LE(bytes, 39) !== entry.geoType) {
    fail(`${entry.id}: geoType 不匹配`);
  }
  if (bytes[bytes.length - 1] !== 0xfe) {
    fail(`${entry.id}: GAIA end marker 应为 0xFE`);
  }
}

function validateColor(name, actual, expected) {
  for (const component of ["a", "b", "g", "r"]) {
    if (actual[component] !== expected[component]) {
      fail(`${name}: color.${component} 不匹配，manifest=${expected[component]}, actual=${actual[component]}`);
    }
  }
}

function readColor(bytes, offset) {
  return {
    a: bytes[offset],
    b: bytes[offset + 1],
    g: bytes[offset + 2],
    r: bytes[offset + 3]
  };
}

function readDoubleLE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat64(offset, true);
}

function readString(bytes, offset) {
  const length = readInt32LE(bytes, offset);
  const start = offset + 4;
  const end = start + length;
  return {
    length,
    value: Buffer.from(bytes.subarray(start, end)).toString("utf8"),
    nextOffset: end
  };
}

function readRawString(bytes, offset) {
  const length = readInt32LE(bytes, offset);
  const start = offset + 4;
  const end = start + length;
  return {
    length,
    hex: Buffer.from(bytes.subarray(start, end)).toString("hex"),
    nextOffset: end
  };
}

function nearlyEqual(a, b, epsilon = 1e-9) {
  return Math.abs(a - b) <= epsilon;
}

function validateGeoTextBytes(entry, bytes) {
  if (bytes.byteLength !== entry.byteSize) {
    fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
  }

  const actualSha = sha256(bytes);
  if (actualSha !== entry.sha256) {
    fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
  }

  let offset = 0;
  const geoType = readInt32LE(bytes, offset); offset += 4;
  if (geoType !== entry.geoType || geoType !== 7) {
    fail(`${entry.id}: GeoText geoType 应为 7，manifest=${entry.geoType}, actual=${geoType}`);
  }

  const styleSize = readInt32LE(bytes, offset); offset += 4;
  if (styleSize !== entry.styleSize || styleSize !== 0) {
    fail(`${entry.id}: Text 数据集 GeoHeader.styleSize 应为 0，manifest=${entry.styleSize}, actual=${styleSize}`);
  }

  const subCount = readInt32LE(bytes, offset); offset += 4;
  if (subCount !== entry.subCount || subCount < 1) {
    fail(`${entry.id}: subCount 不匹配或非法，manifest=${entry.subCount}, actual=${subCount}`);
  }

  validateColor(`${entry.id}: TextStyle.color`, readColor(bytes, offset), entry.style.color);
  offset += 4;

  const fixedSize = bytes[offset++];
  const weight = bytes[offset++];
  const styleFlag = bytes[offset++];
  const alignFlag = bytes[offset++];
  for (const [name, actual] of Object.entries({ fixedSize, weight, styleFlag, alignFlag })) {
    if (actual !== entry.style[name]) {
      fail(`${entry.id}: TextStyle.${name} 不匹配，manifest=${entry.style[name]}, actual=${actual}`);
    }
  }

  validateColor(`${entry.id}: TextStyle.bgColor`, readColor(bytes, offset), entry.style.backgroundColor);
  offset += 4;

  const fontWidth = readDoubleLE(bytes, offset); offset += 8;
  const fontHeight = readDoubleLE(bytes, offset); offset += 8;
  if (!nearlyEqual(fontWidth, entry.style.fontWidth)) {
    fail(`${entry.id}: fontWidth 不匹配`);
  }
  if (!nearlyEqual(fontHeight, entry.style.fontHeight)) {
    fail(`${entry.id}: fontHeight 不匹配`);
  }

  const styleAnchor = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
  offset += 16;
  if (!nearlyEqual(styleAnchor[0], entry.style.anchor[0]) || !nearlyEqual(styleAnchor[1], entry.style.anchor[1])) {
    fail(`${entry.id}: TextStyle.pntAnchor 不匹配`);
  }

  const faceName = readString(bytes, offset);
  offset = faceName.nextOffset;
  if (faceName.value !== entry.style.faceName) {
    fail(`${entry.id}: faceName 不匹配，manifest=${entry.style.faceName}, actual=${faceName.value}`);
  }
  if (faceName.length !== entry.style.faceNameByteLength) {
    fail(`${entry.id}: faceName byteLength 不匹配`);
  }

  for (let i = 0; i < subCount; i++) {
    const expected = entry.subTexts[i];
    if (!expected) {
      fail(`${entry.id}: manifest 缺少 subTexts[${i}]`);
      break;
    }
    const anchor = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
    offset += 16;
    if (!nearlyEqual(anchor[0], expected.anchor[0]) || !nearlyEqual(anchor[1], expected.anchor[1])) {
      fail(`${entry.id}: GeoSubText[${i}].pntAnchor 不匹配`);
    }
    const subAngle = readInt32LE(bytes, offset); offset += 4;
    if (subAngle !== Math.round(expected.rotation * 10)) {
      fail(`${entry.id}: GeoSubText[${i}].subAngle 不匹配`);
    }
    const reserved = readInt32LE(bytes, offset); offset += 4;
    if (reserved !== 0) {
      fail(`${entry.id}: GeoSubText[${i}].reserved 应为 0`);
    }
    const text = readString(bytes, offset);
    offset = text.nextOffset;
    if (text.value !== expected.text) {
      fail(`${entry.id}: GeoSubText[${i}].subText 不匹配，manifest=${expected.text}, actual=${text.value}`);
    }
    if (text.length !== expected.textByteLength) {
      fail(`${entry.id}: GeoSubText[${i}].subText byteLength 不匹配`);
    }
  }

  if (offset !== bytes.byteLength) {
    fail(`${entry.id}: GeoText 解析后仍有剩余字节，offset=${offset}, length=${bytes.byteLength}`);
  }
}

function validateSourceDerivedGeoTextBytes(entry, bytes) {
  if (bytes.byteLength !== entry.byteSize) {
    fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
  }

  const actualSha = sha256(bytes);
  if (actualSha !== entry.sha256) {
    fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
  }

  let offset = 0;
  const geoType = readInt32LE(bytes, offset); offset += 4;
  if (geoType !== entry.geoType || geoType !== 7) {
    fail(`${entry.id}: GeoText geoType 应为 7，manifest=${entry.geoType}, actual=${geoType}`);
  }

  const styleSize = readInt32LE(bytes, offset); offset += 4;
  if (styleSize !== entry.styleSize || styleSize !== 0) {
    fail(`${entry.id}: Text 数据集 GeoHeader.styleSize 应为 0，manifest=${entry.styleSize}, actual=${styleSize}`);
  }

  const subCount = readInt32LE(bytes, offset); offset += 4;
  if (subCount !== entry.subCount || subCount < 1) {
    fail(`${entry.id}: subCount 不匹配或非法，manifest=${entry.subCount}, actual=${subCount}`);
  }

  validateColor(`${entry.id}: TextStyle.color`, readColor(bytes, offset), entry.style.color);
  offset += 4;

  const fixedSize = bytes[offset++];
  const weight = bytes[offset++];
  const styleFlag = bytes[offset++];
  const alignFlag = bytes[offset++];
  for (const [name, actual] of Object.entries({ fixedSize, weight, styleFlag, alignFlag })) {
    if (actual !== entry.style[name]) {
      fail(`${entry.id}: TextStyle.${name} 不匹配，manifest=${entry.style[name]}, actual=${actual}`);
    }
  }

  validateColor(`${entry.id}: TextStyle.bgColor`, readColor(bytes, offset), entry.style.backgroundColor);
  offset += 4;

  const fontWidth = readDoubleLE(bytes, offset); offset += 8;
  const fontHeight = readDoubleLE(bytes, offset); offset += 8;
  if (!nearlyEqual(fontWidth, entry.style.fontWidth)) {
    fail(`${entry.id}: fontWidth 不匹配`);
  }
  if (!nearlyEqual(fontHeight, entry.style.fontHeight)) {
    fail(`${entry.id}: fontHeight 不匹配`);
  }

  const styleAnchor = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
  offset += 16;
  if (!nearlyEqual(styleAnchor[0], entry.style.anchor[0]) || !nearlyEqual(styleAnchor[1], entry.style.anchor[1])) {
    fail(`${entry.id}: TextStyle.pntAnchor 不匹配`);
  }

  const faceName = readRawString(bytes, offset);
  offset = faceName.nextOffset;
  if (faceName.length !== entry.style.faceNameByteLength) {
    fail(`${entry.id}: faceName byteLength 不匹配`);
  }
  if (faceName.hex !== entry.style.faceNameHex) {
    fail(`${entry.id}: faceName 原始字节不匹配，manifest=${entry.style.faceNameHex}, actual=${faceName.hex}`);
  }

  for (let i = 0; i < subCount; i++) {
    const expected = entry.subTexts[i];
    if (!expected) {
      fail(`${entry.id}: manifest 缺少 subTexts[${i}]`);
      break;
    }
    const anchor = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
    offset += 16;
    if (!nearlyEqual(anchor[0], expected.anchor[0]) || !nearlyEqual(anchor[1], expected.anchor[1])) {
      fail(`${entry.id}: GeoSubText[${i}].pntAnchor 不匹配`);
    }
    const subAngle = readInt32LE(bytes, offset); offset += 4;
    if (subAngle !== expected.subAngle) {
      fail(`${entry.id}: GeoSubText[${i}].subAngle 不匹配`);
    }
    const reserved = readInt32LE(bytes, offset); offset += 4;
    if (reserved !== expected.reserved) {
      fail(`${entry.id}: GeoSubText[${i}].reserved 不匹配`);
    }
    const text = readRawString(bytes, offset);
    offset = text.nextOffset;
    if (text.length !== expected.textByteLength) {
      fail(`${entry.id}: GeoSubText[${i}].subText byteLength 不匹配`);
    }
    if (text.hex !== expected.textHex) {
      fail(`${entry.id}: GeoSubText[${i}].subText 原始字节不匹配，manifest=${expected.textHex}, actual=${text.hex}`);
    }
  }

  if (offset !== bytes.byteLength) {
    fail(`${entry.id}: GeoText 解析后仍有剩余字节，offset=${offset}, length=${bytes.byteLength}`);
  }
  if (entry.parsedByteSize !== bytes.byteLength) {
    fail(`${entry.id}: parsedByteSize 不匹配，manifest=${entry.parsedByteSize}, actual=${bytes.byteLength}`);
  }
}

function validateSourceDerivedCadBytes(entry, bytes) {
  if (bytes.byteLength !== entry.byteSize) {
    fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
  }

  const actualSha = sha256(bytes);
  if (actualSha !== entry.sha256) {
    fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
  }

  let offset = 0;
  const geoType = readInt32LE(bytes, offset); offset += 4;
  if (geoType !== entry.geoType) {
    fail(`${entry.id}: CAD geoType 不匹配，manifest=${entry.geoType}, actual=${geoType}`);
  }
  if (![1, 3, 5].includes(geoType)) {
    fail(`${entry.id}: CAD source-derived fixture 当前只允许 geoType=1/3/5，actual=${geoType}`);
  }

  const styleSize = readInt32LE(bytes, offset); offset += 4;
  if (styleSize !== entry.styleSize) {
    fail(`${entry.id}: CAD styleSize 不匹配，manifest=${entry.styleSize}, actual=${styleSize}`);
  }
  if (styleSize !== 0) {
    fail(`${entry.id}: 当前 CAD source-derived 最小夹具必须无样式，styleSize=${styleSize}`);
  }
  offset += styleSize;

  if (geoType === 1) {
    const x = readDoubleLE(bytes, offset);
    const y = readDoubleLE(bytes, offset + 8);
    offset += 16;
    if (!nearlyEqual(x, entry.x)) {
      fail(`${entry.id}: CAD GeoPoint.x 不匹配`);
    }
    if (!nearlyEqual(y, entry.y)) {
      fail(`${entry.id}: CAD GeoPoint.y 不匹配`);
    }
  } else {
    const numSub = readInt32LE(bytes, offset); offset += 4;
    if (numSub !== entry.numSub) {
      fail(`${entry.id}: CAD numSub 不匹配，manifest=${entry.numSub}, actual=${numSub}`);
    }
    const counts = [];
    let totalPoints = 0;
    for (let index = 0; index < numSub; index++) {
      const count = readInt32LE(bytes, offset); offset += 4;
      counts.push(count);
      totalPoints += count;
      if (count !== entry.subPointCounts?.[index]) {
        fail(`${entry.id}: CAD subPointCounts[${index}] 不匹配`);
      }
    }
    if (totalPoints !== entry.totalPoints) {
      fail(`${entry.id}: CAD totalPoints 不匹配，manifest=${entry.totalPoints}, actual=${totalPoints}`);
    }

    for (let index = 0; index < totalPoints; index++) {
      const coordinate = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
      offset += 16;
      const expected = entry.coordinates?.[index];
      if (!expected) {
        fail(`${entry.id}: manifest 缺少 coordinates[${index}]`);
        continue;
      }
      if (!nearlyEqual(coordinate[0], expected[0]) || !nearlyEqual(coordinate[1], expected[1])) {
        fail(`${entry.id}: CAD coordinates[${index}] 不匹配`);
      }
    }
  }

  if (offset !== bytes.byteLength) {
    fail(`${entry.id}: CAD 解析后仍有剩余字节，offset=${offset}, length=${bytes.byteLength}`);
  }
  if (entry.parsedByteSize !== bytes.byteLength) {
    fail(`${entry.id}: parsedByteSize 不匹配，manifest=${entry.parsedByteSize}, actual=${bytes.byteLength}`);
  }
}

function validateSourceDerivedMetadataJson(entry, bytes) {
  const actualSha = sha256(bytes);
  if (bytes.byteLength !== entry.byteSize) {
    fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
  }
  if (actualSha !== entry.sha256) {
    fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
  }

  let metadata;
  try {
    metadata = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    fail(`${entry.id}: metadata JSON 解析失败：${error.message}`);
    return;
  }

  if (metadata.source?.sample !== entry.source?.sample) {
    fail(`${entry.id}: metadata.source.sample 与 manifest 不一致`);
  }
  if (metadata.source?.sha256 !== entry.source?.sha256) {
    fail(`${entry.id}: metadata.source.sha256 与 manifest 不一致`);
  }
  if (!Array.isArray(metadata.datasets) || metadata.datasets.length !== 3) {
    fail(`${entry.id}: metadata.datasets 必须包含 3 个 3D 数据集`);
    return;
  }

  const sourcePath = resolve(workspaceRoot, entry.source.sample);
  let sourceBytes;
  try {
    sourceBytes = readFileSync(sourcePath);
  } catch (error) {
    fail(`${entry.id}: 无法读取源样本 ${entry.source.sample}：${error.message}`);
    return;
  }
  const actualSourceSha = sha256(sourceBytes);
  if (actualSourceSha !== entry.source.sha256) {
    fail(`${entry.id}: 源样本 SHA-256 不匹配，manifest=${entry.source.sha256}, actual=${actualSourceSha}`);
    return;
  }

  let db;
  try {
    db = new DatabaseSync(sourcePath, { readOnly: true });
  } catch (error) {
    fail(`${entry.id}: 无法打开源样本 ${entry.source.sample}：${error.message}`);
    return;
  }

  const expectedByName = new Map([
    ["BaseMap_PZ", { datasetKind: "pointZ", datasetType: 101, geometryType: 1001 }],
    ["BaseMap_LZ", { datasetKind: "lineZ", datasetType: 103, geometryType: 1005 }],
    ["BaseMap_RZ", { datasetKind: "regionZ", datasetType: 105, geometryType: 1006 }]
  ]);

  try {
    for (const dataset of metadata.datasets) {
      const expected = expectedByName.get(dataset.name);
      if (!expected) {
        fail(`${entry.id}: 未预期的 3D 数据集 ${dataset.name}`);
        continue;
      }
      if (dataset.datasetKind !== expected.datasetKind) {
        fail(`${entry.id}: ${dataset.name} datasetKind 不匹配`);
      }
      if (dataset.datasetType !== expected.datasetType) {
        fail(`${entry.id}: ${dataset.name} datasetType 不匹配`);
      }
      if (dataset.geometryType !== expected.geometryType) {
        fail(`${entry.id}: ${dataset.name} geometryType 不匹配`);
      }
      if (dataset.coordDimension !== 3) {
        fail(`${entry.id}: ${dataset.name} coordDimension 应为 3`);
      }
      if (dataset.smSRID !== 0) {
        fail(`${entry.id}: ${dataset.name} SmRegister.SmSRID 应为 0`);
      }
      if (dataset.geometryColumnSRID !== 0) {
        fail(`${entry.id}: ${dataset.name} geometry_columns.srid 应为 0`);
      }
      if (String(dataset.smGeoColName).toLowerCase() !== "smgeometry") {
        fail(`${entry.id}: ${dataset.name} SmGeoColName 应为 SmGeometry`);
      }
      if (String(dataset.geometryColumn).toLowerCase() !== "smgeometry") {
        fail(`${entry.id}: ${dataset.name} geometry_columns.f_geometry_column 应为 smgeometry`);
      }
      if (dataset.spatialIndexEnabled !== 0) {
        fail(`${entry.id}: ${dataset.name} spatial_index_enabled 应为 0`);
      }

      const sourceMetadata = queryOne(
        db,
        `SELECT r.SmDatasetName, r.SmDatasetType, r.SmObjectCount, r.SmSRID, r.SmGeoColName,
                g.f_table_name, g.f_geometry_column, g.geometry_type, g.coord_dimension,
                g.srid, g.spatial_index_enabled
         FROM SmRegister r
         JOIN geometry_columns g ON lower(g.f_table_name) = lower(r.SmDatasetName)
         WHERE r.SmDatasetName = ?`,
        [dataset.name]
      );
      if (!sourceMetadata) {
        fail(`${entry.id}: 源样本缺少 ${dataset.name} 元数据`);
        continue;
      }
      const sourceRows = queryOne(db, `SELECT COUNT(*) AS count FROM "${dataset.name}"`)?.count ?? 0;
      const sourceFeature = queryOne(
        db,
        `SELECT SmID, SmGeometry, length(SmGeometry) AS geometryByteSize
         FROM "${dataset.name}"
         WHERE SmGeometry IS NOT NULL
         ORDER BY SmID
         LIMIT 1`
      );
      const sourceGeometry = sourceFeature?.SmGeometry ? Buffer.from(sourceFeature.SmGeometry) : null;

      const comparisons = [
        ["datasetType", dataset.datasetType, sourceMetadata.SmDatasetType],
        ["objectCount", dataset.objectCount, sourceMetadata.SmObjectCount],
        ["physicalRowCount", dataset.physicalRowCount, sourceRows],
        ["smSRID", dataset.smSRID, sourceMetadata.SmSRID],
        ["geometryType", dataset.geometryType, sourceMetadata.geometry_type],
        ["coordDimension", dataset.coordDimension, sourceMetadata.coord_dimension],
        ["geometryColumnSRID", dataset.geometryColumnSRID, sourceMetadata.srid],
        ["spatialIndexEnabled", dataset.spatialIndexEnabled, sourceMetadata.spatial_index_enabled]
      ];
      for (const [name, actual, expectedValue] of comparisons) {
        if (actual !== expectedValue) {
          fail(`${entry.id}: ${dataset.name}.${name} 与源样本不一致，metadata=${actual}, source=${expectedValue}`);
        }
      }
      if (String(dataset.tableName).toLowerCase() !== String(sourceMetadata.f_table_name).toLowerCase()) {
        fail(`${entry.id}: ${dataset.name}.tableName 与源样本不一致`);
      }
      if (String(dataset.geometryColumn).toLowerCase() !== String(sourceMetadata.f_geometry_column).toLowerCase()) {
        fail(`${entry.id}: ${dataset.name}.geometryColumn 与源样本不一致`);
      }
      if (!sourceGeometry) {
        fail(`${entry.id}: ${dataset.name} 源样本缺少首条 SmGeometry`);
        continue;
      }
      if (dataset.sampleFeature?.geometryByteSize !== sourceFeature.geometryByteSize) {
        fail(`${entry.id}: ${dataset.name}.sampleFeature.geometryByteSize 与源样本不一致`);
      }
      if (dataset.sampleFeature?.gaiaHeaderSRID !== readInt32LE(sourceGeometry, 2)) {
        fail(`${entry.id}: ${dataset.name}.sampleFeature.gaiaHeaderSRID 与源样本不一致`);
      }
      if (dataset.sampleFeature?.gaiaHeaderSRID !== 0) {
        fail(`${entry.id}: ${dataset.name}.sampleFeature.gaiaHeaderSRID 应为 0`);
      }
      if (dataset.sampleFeature?.gaiaGeoType !== readInt32LE(sourceGeometry, 39)) {
        fail(`${entry.id}: ${dataset.name}.sampleFeature.gaiaGeoType 与源样本不一致`);
      }
      if (dataset.sampleFeature?.gaiaGeoType !== expected.geometryType) {
        fail(`${entry.id}: ${dataset.name}.sampleFeature.gaiaGeoType 应等于 ${expected.geometryType}`);
      }
    }
  } catch (error) {
    fail(`${entry.id}: metadata-json 源样本校验失败：${error.message}`);
  } finally {
    db.close();
  }
}

function validateGeoTextBlob(id, bytes) {
  const entry = {
    id,
    byteSize: bytes.byteLength,
    sha256: sha256(bytes),
    geoType: 7,
    styleSize: 0,
    subCount: 1,
    style: {
      color: { a: 0, b: 0, g: 0, r: 255 },
      backgroundColor: { a: 255, b: 255, g: 255, r: 255 },
      fixedSize: 10,
      weight: 64,
      styleFlag: 6,
      alignFlag: 0,
      fontWidth: 0,
      fontHeight: 0.406494140625,
      anchor: [113.165187569688, 33.875453985],
      faceName: "宋体",
      faceNameByteLength: 6
    },
    subTexts: [
      {
        text: "河南省",
        textByteLength: 9,
        anchor: [113.165187569688, 33.875453985],
        rotation: 0
      }
    ]
  };
  validateGeoTextBytes(entry, bytes);
}

function queryAll(db, sql, params = []) {
  return [...db.prepare(sql).iterate(...params)];
}

function queryOne(db, sql, params = []) {
  return queryAll(db, sql, params)[0] ?? null;
}

function validateComplianceDatabase(entry, bytes, root = complianceRoot) {
  if (entry.status !== "ready") {
    fail(`${entry.id}: status 必须为 ready`);
  }
  if (bytes.byteLength !== entry.byteSize) {
    fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
  }

  const actualSha = sha256(bytes);
  if (actualSha !== entry.sha256) {
    fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
  }

  const dbPath = resolve(root, entry.path);
  let db;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
  } catch (error) {
    fail(`${entry.id}: 无法打开 SQLite 数据库：${error.message}`);
    return;
  }

  try {
    const requiredTables = [
      "SmDataSourceInfo",
      "SmRegister",
      "SmFieldInfo",
      "geometry_columns"
    ];
    for (const tableName of requiredTables) {
      const row = queryOne(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        [tableName]
      );
      if (!row) {
        fail(`${entry.id}: 缺少系统表 ${tableName}`);
      }
    }

    for (const dataset of entry.requiredDatasets ?? []) {
      const expectedKindValue = datasetKindValues[dataset.kind];
      if (expectedKindValue === undefined) {
        fail(`${entry.id}: 未知 DatasetKind ${dataset.kind}`);
        continue;
      }

      const registerRow = queryOne(
        db,
        `SELECT SmDatasetID, SmDatasetName, SmDatasetType, SmObjectCount
         FROM SmRegister
         WHERE SmDatasetName = ?`,
        [dataset.name]
      );

      if (!registerRow) {
        fail(`${entry.id}: 缺少数据集 ${dataset.name}`);
        continue;
      }
      if (registerRow.SmDatasetType !== expectedKindValue) {
        fail(
          `${entry.id}: ${dataset.name} kind 不匹配，manifest=${dataset.kind}, actual=${registerRow.SmDatasetType}`
        );
      }
      if (registerRow.SmObjectCount < dataset.minimumFeatureCount) {
        fail(
          `${entry.id}: ${dataset.name} 对象数不足，manifest>=${dataset.minimumFeatureCount}, actual=${registerRow.SmObjectCount}`
        );
      }

      const countRow = queryOne(
        db,
        `SELECT COUNT(*) AS count FROM "${dataset.name}"`
      );
      if ((countRow?.count ?? 0) < dataset.minimumFeatureCount) {
        fail(
          `${entry.id}: ${dataset.name} 物理表记录数不足，manifest>=${dataset.minimumFeatureCount}, actual=${countRow?.count ?? 0}`
        );
      }

      for (const fieldType of dataset.expectedFieldTypes ?? []) {
        const expectedFieldValue = fieldTypeValues[fieldType];
        const fieldRow = queryOne(
          db,
          `SELECT 1 AS ok
           FROM SmFieldInfo
           WHERE SmDatasetID = ? AND SmFieldType = ?
           LIMIT 1`,
          [registerRow.SmDatasetID, expectedFieldValue]
        );
        if (!fieldRow) {
          fail(`${entry.id}: ${dataset.name} 缺少字段类型 ${fieldType}`);
        }
      }

      if (dataset.kind === "text") {
        const geometryColumnRow = queryOne(
          db,
          `SELECT f_geometry_column, geometry_type, coord_dimension, srid, spatial_index_enabled
           FROM geometry_columns
           WHERE lower(f_table_name) = lower(?)`,
          [dataset.name]
        );
        if (!geometryColumnRow) {
          fail(`${entry.id}: ${dataset.name} 缺少 geometry_columns 注册`);
        } else {
          if (String(geometryColumnRow.f_geometry_column).toLowerCase() !== dataset.expectedGeometryColumn) {
            fail(`${entry.id}: ${dataset.name} geometry column 不匹配`);
          }
          if (geometryColumnRow.geometry_type !== dataset.expectedGeometryType) {
            fail(`${entry.id}: ${dataset.name} geometry_type 不匹配`);
          }
          if (geometryColumnRow.coord_dimension !== 2) {
            fail(`${entry.id}: ${dataset.name} coord_dimension 应为 2`);
          }
          if (geometryColumnRow.spatial_index_enabled !== 0) {
            fail(`${entry.id}: ${dataset.name} spatial_index_enabled 应为 0`);
          }
        }

        const textRow = queryOne(
          db,
          `SELECT SmGeometry, length(SmGeometry) AS byteSize
           FROM "${dataset.name}"
           WHERE SmGeometry IS NOT NULL
           ORDER BY SmID
           LIMIT 1`
        );
        if (!textRow) {
          fail(`${entry.id}: ${dataset.name} 缺少 GeoText BLOB`);
        } else {
          validateGeoTextBlob(`${entry.id}: ${dataset.name}`, Buffer.from(textRow.SmGeometry));
        }
      }
    }

    for (const fieldType of entry.requiredFieldTypes ?? []) {
      const expectedFieldValue = fieldTypeValues[fieldType];
      const fieldRow = queryOne(
        db,
        "SELECT 1 AS ok FROM SmFieldInfo WHERE SmFieldType = ? LIMIT 1",
        [expectedFieldValue]
      );
      if (!fieldRow) {
        fail(`${entry.id}: 缺少全局字段类型覆盖 ${fieldType}`);
      }
    }

    const geometryCountRow = queryOne(
      db,
      "SELECT COUNT(*) AS count FROM geometry_columns"
    );
    const expectedGeometryColumns = entry.expectedGeometryColumns ?? 0;
    if ((geometryCountRow?.count ?? 0) !== expectedGeometryColumns) {
      fail(
        `${entry.id}: geometry_columns 数量不匹配，manifest=${expectedGeometryColumns}, actual=${geometryCountRow?.count ?? 0}`
      );
    }
  } catch (error) {
    fail(`${entry.id}: SQLite 内容检查失败：${error.message}`);
  } finally {
    db.close();
  }
}

const fixtureManifest = await readJson(fixtureManifestPath);
if (fixtureManifest) {
  validateCommonManifest(fixtureManifest, "fixtures/manifest.json");
  if (Array.isArray(fixtureManifest.fixtures)) {
    for (const entry of fixtureManifest.fixtures) {
      if (!validateCommonFixtureEntry(entry, "fixtures/manifest.json")) {
        continue;
      }
      try {
        const bytes = await readFile(resolve(complianceRoot, entry.path));
        validateComplianceDatabase(entry, bytes);
      } catch (error) {
        fail(`${entry.id}: 无法读取 fixture 文件 ${entry.path}：${error.message}`);
      }
    }
  }
}

const roundtripManifest = await readJson(roundtripManifestPath);
if (roundtripManifest) {
  validateCommonManifest(roundtripManifest, "roundtrip/manifest.json");
  if (Array.isArray(roundtripManifest.fixtures)) {
    for (const entry of roundtripManifest.fixtures) {
      if (!validateCommonFixtureEntry(entry, "roundtrip/manifest.json")) {
        continue;
      }
      if (!entry.producer) {
        fail(`${entry.id}: roundtrip fixture entry 缺少 producer`);
        continue;
      }
      try {
        const bytes = await readFile(resolve(roundtripRoot, entry.path));
        validateComplianceDatabase(entry, bytes, roundtripRoot);
      } catch (error) {
        fail(`${entry.id}: 无法读取 roundtrip fixture 文件 ${entry.path}：${error.message}`);
      }
    }
  }
}

const goldenManifest = await readJson(goldenManifestPath);
if (goldenManifest) {
  validateCommonManifest(goldenManifest, "golden-gaia-bytes/manifest.json");
  if (!Array.isArray(goldenManifest.fixtures) || goldenManifest.fixtures.length === 0) {
    fail("golden-gaia-bytes/manifest.json: fixtures 必须是非空数组");
  } else {
    for (const entry of goldenManifest.fixtures) {
      if (!validateCommonFixtureEntry(entry, "golden-gaia-bytes/manifest.json")) {
        continue;
      }
      try {
        const bytes = await readFile(resolve(goldenRoot, entry.path));
        validateGaiaBytes(entry, bytes);
      } catch (error) {
        fail(`${entry.id}: 无法读取 fixture 文件 ${entry.path}：${error.message}`);
      }
    }
  }
}

const goldenTextManifest = await readJson(goldenTextManifestPath);
if (goldenTextManifest) {
  validateCommonManifest(goldenTextManifest, "golden-text-bytes/manifest.json");
  if (!Array.isArray(goldenTextManifest.fixtures) || goldenTextManifest.fixtures.length === 0) {
    fail("golden-text-bytes/manifest.json: fixtures 必须是非空数组");
  } else {
    for (const entry of goldenTextManifest.fixtures) {
      if (!validateCommonFixtureEntry(entry, "golden-text-bytes/manifest.json")) {
        continue;
      }
      try {
        const bytes = await readFile(resolve(goldenTextRoot, entry.path));
        validateGeoTextBytes(entry, bytes);
      } catch (error) {
        fail(`${entry.id}: 无法读取 GeoText fixture 文件 ${entry.path}：${error.message}`);
      }
    }
  }
}

const sourceDerivedManifest = await readJson(sourceDerivedManifestPath);
if (sourceDerivedManifest) {
  validateCommonManifest(sourceDerivedManifest, "source-derived/manifest.json");
  if (Array.isArray(sourceDerivedManifest.fixtures)) {
    for (const entry of sourceDerivedManifest.fixtures) {
      if (!validateCommonFixtureEntry(entry, "source-derived/manifest.json")) {
        continue;
      }
      validateSourceDerivedEntry(entry);
      try {
        const bytes = await readFile(resolve(sourceDerivedRoot, entry.path));
        if (entry.geoType === 7) {
          validateSourceDerivedGeoTextBytes(entry, bytes);
        } else if (entry.format === "metadata-json") {
          validateSourceDerivedMetadataJson(entry, bytes);
        } else if (entry.format === "cad-geoheader") {
          validateSourceDerivedCadBytes(entry, bytes);
        } else {
          if (bytes.byteLength !== entry.byteSize) {
            fail(`${entry.id}: byteSize 不匹配，manifest=${entry.byteSize}, actual=${bytes.byteLength}`);
          }
          const actualSha = sha256(bytes);
          if (actualSha !== entry.sha256) {
            fail(`${entry.id}: sha256 不匹配，manifest=${entry.sha256}, actual=${actualSha}`);
          }
        }
      } catch (error) {
        fail(`${entry.id}: 无法读取 source-derived fixture 文件 ${entry.path}：${error.message}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("合规资产检查失败：");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("合规资产检查通过。");
