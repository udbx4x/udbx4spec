#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(specRoot, "..");
const sourcePath = resolve(workspaceRoot, "data/SampleData.udbx");
const expectedSourceSha256 = "b3cbac16f48e4e07fec726c781c42feeff8d5fd85dad4f2381fa538f3afbde39";
const outputRoot = resolve(specRoot, "compliance/source-derived");
const sampleDataAdmission = {
  licenseStatus: "public-confirmed",
  licenseName: "项目维护者确认的 SampleData.udbx 公开分发授权",
  licenseDocument: "docs/samples/licenses/sampledata-public-distribution-confirmation.md",
  generator: {
    product: "SuperMap iDesktopX 2025",
    productVersion: "V12.0.1.0",
    productVersionEvidence: "项目维护者确认；样本内部系统表同时记录 SQLite/SpatiaLite 版本作为生成环境证据",
    sqliteVersion: "3.24.0",
    spatialiteVersion: "4.3.0-RC1"
  }
};

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

function readDoubleLE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat64(offset, true);
}

function parseGeoTextSummary(bytes) {
  let offset = 0;
  const geoType = readInt32LE(bytes, offset); offset += 4;
  const styleSize = readInt32LE(bytes, offset); offset += 4;
  const subCount = readInt32LE(bytes, offset); offset += 4;
  const color = { a: bytes[offset], b: bytes[offset + 1], g: bytes[offset + 2], r: bytes[offset + 3] };
  offset += 4;
  const fixedSize = bytes[offset++];
  const weight = bytes[offset++];
  const styleFlag = bytes[offset++];
  const alignFlag = bytes[offset++];
  const backgroundColor = { a: bytes[offset], b: bytes[offset + 1], g: bytes[offset + 2], r: bytes[offset + 3] };
  offset += 4;
  const fontWidth = readDoubleLE(bytes, offset); offset += 8;
  const fontHeight = readDoubleLE(bytes, offset); offset += 8;
  const styleAnchor = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
  offset += 16;
  const faceNameByteLength = readInt32LE(bytes, offset); offset += 4;
  const faceNameBytes = bytes.subarray(offset, offset + faceNameByteLength);
  offset += faceNameByteLength;

  const subTexts = [];
  for (let i = 0; i < subCount; i++) {
    const anchor = [readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)];
    offset += 16;
    const subAngle = readInt32LE(bytes, offset); offset += 4;
    const reserved = readInt32LE(bytes, offset); offset += 4;
    const textByteLength = readInt32LE(bytes, offset); offset += 4;
    const textBytes = bytes.subarray(offset, offset + textByteLength);
    offset += textByteLength;
    subTexts.push({
      anchor,
      rotation: subAngle / 10,
      subAngle,
      reserved,
      textByteLength,
      textHex: Buffer.from(textBytes).toString("hex")
    });
  }

  return {
    geoType,
    styleSize,
    subCount,
    style: {
      color,
      backgroundColor,
      fixedSize,
      weight,
      styleFlag,
      alignFlag,
      fontWidth,
      fontHeight,
      anchor: styleAnchor,
      faceNameByteLength,
      faceNameHex: Buffer.from(faceNameBytes).toString("hex")
    },
    subTexts,
    parsedByteSize: offset
  };
}

async function assertSourceSample() {
  const bytes = await readFile(sourcePath);
  const actual = sha256(bytes);
  if (actual !== expectedSourceSha256) {
    throw new Error(`SampleData.udbx SHA-256 不匹配，expected=${expectedSourceSha256}, actual=${actual}`);
  }
}

function parseCadSummary(bytes) {
  let offset = 0;
  const geoType = readInt32LE(bytes, offset); offset += 4;
  const styleSize = readInt32LE(bytes, offset); offset += 4;
  offset += styleSize;

  const summary = {
    format: "cad-geoheader",
    geoType,
    styleSize
  };

  if (geoType === 1) {
    return {
      ...summary,
      x: readDoubleLE(bytes, offset),
      y: readDoubleLE(bytes, offset + 8),
      parsedByteSize: offset + 16
    };
  }

  if (geoType !== 3 && geoType !== 5) {
    throw new Error(`不支持生成 CAD source-derived fixture：geoType=${geoType}`);
  }

  const numSub = readInt32LE(bytes, offset); offset += 4;
  const subPointCounts = [];
  let totalPoints = 0;
  for (let index = 0; index < numSub; index++) {
    const count = readInt32LE(bytes, offset); offset += 4;
    subPointCounts.push(count);
    totalPoints += count;
  }

  const coordinates = [];
  for (let index = 0; index < totalPoints; index++) {
    coordinates.push([readDoubleLE(bytes, offset), readDoubleLE(bytes, offset + 8)]);
    offset += 16;
  }

  return {
    ...summary,
    numSub,
    subPointCounts,
    totalPoints,
    coordinates,
    parsedByteSize: offset
  };
}

async function extractSourceDerivedBlob(db, options) {
  const row = db.prepare(
    `SELECT SmGeometry FROM "${options.dataset}" WHERE SmID = ?`
  ).get(options.smId);
  if (!row?.SmGeometry) {
    throw new Error(`${options.dataset} SmID=${options.smId} 缺少 SmGeometry`);
  }

  const blob = Buffer.from(row.SmGeometry);
  await writeFile(resolve(outputRoot, options.relativePath), blob);
  return {
    id: options.id,
    path: options.relativePath,
    tier: "T3",
    stability: "stable",
    usage: ["decode"],
    byteSize: blob.byteLength,
    sha256: sha256(blob),
    source: {
      sample: "data/SampleData.udbx",
      sha256: expectedSourceSha256,
      dataset: options.dataset,
      selection: `SmID=${options.smId} SmGeometry`
    },
    licenseStatus: sampleDataAdmission.licenseStatus,
    licenseName: sampleDataAdmission.licenseName,
    licenseDocument: sampleDataAdmission.licenseDocument,
    generator: sampleDataAdmission.generator,
    deidentification: "not-required",
    specValue: options.specValue,
    ...options.parse(blob)
  };
}

function queryOne(db, sql, params = []) {
  return [...db.prepare(sql).iterate(...params)][0] ?? null;
}

async function extractSridZero3dMetadata(db) {
  const datasetSpecs = [
    { name: "BaseMap_PZ", datasetKind: "pointZ", datasetType: 101, geometryType: 1001 },
    { name: "BaseMap_LZ", datasetKind: "lineZ", datasetType: 103, geometryType: 1005 },
    { name: "BaseMap_RZ", datasetKind: "regionZ", datasetType: 105, geometryType: 1006 }
  ];

  const datasets = [];
  for (const spec of datasetSpecs) {
    const metadata = queryOne(
      db,
      `SELECT r.SmDatasetName, r.SmDatasetType, r.SmObjectCount, r.SmSRID, r.SmGeoColName,
              g.f_table_name, g.f_geometry_column, g.geometry_type, g.coord_dimension,
              g.srid, g.spatial_index_enabled
       FROM SmRegister r
       JOIN geometry_columns g ON lower(g.f_table_name) = lower(r.SmDatasetName)
       WHERE r.SmDatasetName = ?`,
      [spec.name]
    );
    if (!metadata) {
      throw new Error(`${spec.name} 缺少 SmRegister 或 geometry_columns 元数据`);
    }

    const count = queryOne(db, `SELECT COUNT(*) AS count FROM "${spec.name}"`)?.count ?? 0;
    const sampleFeature = queryOne(
      db,
      `SELECT SmID, SmGeometry, length(SmGeometry) AS geometryByteSize
       FROM "${spec.name}"
       WHERE SmGeometry IS NOT NULL
       ORDER BY SmID
       LIMIT 1`
    );
    if (!sampleFeature?.SmGeometry) {
      throw new Error(`${spec.name} 缺少可用于校验 GAIA header 的 SmGeometry`);
    }

    const geometryBytes = Buffer.from(sampleFeature.SmGeometry);
    datasets.push({
      name: metadata.SmDatasetName,
      tableName: metadata.f_table_name,
      datasetKind: spec.datasetKind,
      datasetType: metadata.SmDatasetType,
      objectCount: metadata.SmObjectCount,
      physicalRowCount: count,
      smSRID: metadata.SmSRID,
      smGeoColName: metadata.SmGeoColName,
      geometryColumn: metadata.f_geometry_column,
      geometryType: metadata.geometry_type,
      coordDimension: metadata.coord_dimension,
      geometryColumnSRID: metadata.srid,
      spatialIndexEnabled: metadata.spatial_index_enabled,
      sampleFeature: {
        smId: sampleFeature.SmID,
        geometryByteSize: sampleFeature.geometryByteSize,
        gaiaHeaderSRID: readInt32LE(geometryBytes, 2),
        gaiaGeoType: readInt32LE(geometryBytes, 39)
      }
    });
  }

  const metadata = {
    source: {
      sample: "data/SampleData.udbx",
      sha256: expectedSourceSha256
    },
    datasets
  };
  const content = JSON.stringify(metadata, null, 2) + "\n";
  const relativePath = "sampledata/3d-srid-zero/metadata.json";
  await writeFile(resolve(outputRoot, relativePath), content);

  return {
    id: "sampledata-3d-srid-zero-metadata",
    path: relativePath,
    tier: "T3",
    stability: "stable",
    usage: ["read"],
    byteSize: Buffer.byteLength(content),
    sha256: sha256(Buffer.from(content)),
    source: {
      sample: "data/SampleData.udbx",
      sha256: expectedSourceSha256,
      dataset: "BaseMap_PZ,BaseMap_LZ,BaseMap_RZ",
      selection: "SmRegister + geometry_columns + first non-null SmGeometry header"
    },
    licenseStatus: sampleDataAdmission.licenseStatus,
    licenseName: sampleDataAdmission.licenseName,
    licenseDocument: sampleDataAdmission.licenseDocument,
    generator: sampleDataAdmission.generator,
    deidentification: "not-required",
    specValue: "验证真实 3D 数据集中 SmRegister.SmSRID=0 与 geometry_columns.srid=0、coord_dimension=3、GAIA 3D geoType 共存的系统表行为",
    format: "metadata-json"
  };
}

await assertSourceSample();
await mkdir(resolve(outputRoot, "sampledata/county-t"), { recursive: true });
await mkdir(resolve(outputRoot, "sampledata/caddt"), { recursive: true });
await mkdir(resolve(outputRoot, "sampledata/3d-srid-zero"), { recursive: true });

const db = new DatabaseSync(sourcePath, { readOnly: true });
try {
  const fixtures = [
    await extractSourceDerivedBlob(db, {
      id: "sampledata-county-t-smid-1-smgeometry",
      dataset: "County_T",
      smId: 1,
      relativePath: "sampledata/county-t/smid-1-smgeometry.bin",
      specValue: "验证真实 Text 数据集中非 UTF-8 可读 faceName/subText 字节的保留和容错解码行为",
      parse: parseGeoTextSummary
    }),
    await extractSourceDerivedBlob(db, {
      id: "sampledata-caddt-smid-1-smgeometry",
      dataset: "CADDT",
      smId: 1,
      relativePath: "sampledata/caddt/smid-1-smgeometry.bin",
      specValue: "验证真实 CAD 数据集中无样式 GeoPoint GeoHeader BLOB 的解码行为",
      parse: parseCadSummary
    }),
    await extractSourceDerivedBlob(db, {
      id: "sampledata-caddt-smid-16-smgeometry",
      dataset: "CADDT",
      smId: 16,
      relativePath: "sampledata/caddt/smid-16-smgeometry.bin",
      specValue: "验证真实 CAD 数据集中无样式 GeoLine GeoHeader BLOB 的子对象和坐标解码行为",
      parse: parseCadSummary
    }),
    await extractSourceDerivedBlob(db, {
      id: "sampledata-caddt-smid-63-smgeometry",
      dataset: "CADDT",
      smId: 63,
      relativePath: "sampledata/caddt/smid-63-smgeometry.bin",
      specValue: "验证真实 CAD 数据集中无样式 GeoRegion GeoHeader BLOB 的子对象和坐标解码行为",
      parse: parseCadSummary
    }),
    await extractSridZero3dMetadata(db)
  ];

  const manifest = {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    status: "ready",
    fixtures
  };

  await writeFile(resolve(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
} finally {
  db.close();
}

console.log("Source-derived fixtures generated.");
