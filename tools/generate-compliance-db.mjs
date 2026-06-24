#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(specRoot, "..");
const fixtureRoot = resolve(specRoot, "compliance/fixtures");
const outputPath = resolve(specRoot, "compliance/compliance.udbx");
const manifestPath = resolve(fixtureRoot, "manifest.json");
const udbx4tsDist = resolve(workspaceRoot, "udbx4ts/dist/index.js");

const { UdbxDataSource } = await import(pathToFileURL(udbx4tsDist).href).catch(
  (error) => {
    throw new Error(
      `无法加载 udbx4ts 构建产物：${udbx4tsDist}\n请先执行：cd udbx4ts && npm run build\n${error.message}`
    );
  }
);

const FIXED_TIMESTAMP = "2026-01-01T00:00:00Z";
const generator = {
  name: "udbx4spec/tools/generate-compliance-db.mjs",
  implementation: "udbx4ts",
  implementationPath: "../udbx4ts/dist/index.js"
};

const pointFields = [
  { name: "NAME", fieldType: "text", nullable: false },
  { name: "CATEGORY", fieldType: "text", nullable: false },
  { name: "ELEVATION", fieldType: "double", nullable: false }
];

const lineFields = [
  { name: "NAME", fieldType: "text", nullable: false },
  { name: "LEVEL", fieldType: "int32", nullable: false },
  { name: "LENGTH_KM", fieldType: "double", nullable: false }
];

const regionFields = [
  { name: "NAME", fieldType: "text", nullable: false },
  { name: "LEVEL", fieldType: "int32", nullable: false },
  { name: "AREA_KM2", fieldType: "double", nullable: false }
];

const tabularFields = [
  { name: "NAME", fieldType: "text", nullable: false },
  { name: "VALUE", fieldType: "int32", nullable: false },
  { name: "SCORE", fieldType: "double", nullable: false }
];

const cadFields = [
  { name: "NAME", fieldType: "text", nullable: false },
  { name: "LEVEL", fieldType: "int32", nullable: false }
];

const textFields = [
  { name: "NAME", fieldType: "text", nullable: false },
  { name: "LEVEL", fieldType: "int32", nullable: false }
];

const fixtureSpec = {
  id: "compliance-udbx-v1",
  path: "compliance.udbx",
  tier: "T1",
  stability: "stable",
  usage: ["read", "write", "roundtrip"],
  description: "标准合规数据库，覆盖 point/line/region/pointZ/lineZ/regionZ/tabular/cad/text 的最小可执行集成夹具。",
  requiredDatasets: [
    {
      name: "test_points",
      kind: "point",
      minimumFeatureCount: 3,
      expectedFieldTypes: ["text", "double"]
    },
    {
      name: "test_lines",
      kind: "line",
      minimumFeatureCount: 2,
      expectedFieldTypes: ["text", "int32", "double"]
    },
    {
      name: "test_regions",
      kind: "region",
      minimumFeatureCount: 1,
      expectedFieldTypes: ["text", "int32", "double"]
    },
    {
      name: "test_points_z",
      kind: "pointZ",
      minimumFeatureCount: 2,
      expectedFieldTypes: ["text", "double"]
    },
    {
      name: "test_lines_z",
      kind: "lineZ",
      minimumFeatureCount: 1,
      expectedFieldTypes: ["text", "int32", "double"]
    },
    {
      name: "test_regions_z",
      kind: "regionZ",
      minimumFeatureCount: 1,
      expectedFieldTypes: ["text", "int32", "double"]
    },
    {
      name: "test_tabular",
      kind: "tabular",
      minimumFeatureCount: 2,
      expectedFieldTypes: ["text", "int32", "double"]
    },
    {
      name: "test_cad",
      kind: "cad",
      minimumFeatureCount: 3,
      expectedFieldTypes: ["text", "int32"]
    },
    {
      name: "test_text",
      kind: "text",
      minimumFeatureCount: 1,
      expectedFieldTypes: ["text", "int32"],
      expectedGeometryColumn: "smindexkey",
      expectedGeometryType: 3
    }
  ],
  requiredFieldTypes: ["text", "int32", "double"],
  expectedGeometryColumns: 7
};

function normalizeSqlValues(params = []) {
  return params.map((value) => {
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    return value;
  });
}

class NodeSqliteStatement {
  constructor(statement) {
    this.statement = statement;
    this.queryMode = this.statement.columns().length > 0;
    this.boundParams = undefined;
    this.iterator = null;
    this.currentRow = null;
    this.executed = false;
  }

  async bind(params) {
    this.boundParams = params;
    this.iterator = null;
    this.currentRow = null;
    this.executed = false;
  }

  async step() {
    if (!this.queryMode) {
      if (!this.executed) {
        this.statement.run(...normalizeSqlValues(this.boundParams));
        this.executed = true;
      }
      return false;
    }

    if (!this.iterator) {
      this.iterator = this.statement.iterate(
        ...normalizeSqlValues(this.boundParams)
      );
    }

    const next = this.iterator.next();
    if (next.done) {
      this.currentRow = null;
      return false;
    }

    this.currentRow = next.value;
    return true;
  }

  async getRow() {
    if (!this.currentRow) {
      throw new Error("No current row is available. Call step() first.");
    }
    return this.currentRow;
  }

  async reset() {
    this.iterator = null;
    this.currentRow = null;
    this.executed = false;
  }

  async finalize() {
    this.iterator = null;
    this.currentRow = null;
    this.boundParams = undefined;
  }
}

class NodeSqliteDriver {
  constructor() {
    this.db = null;
    this.transactionDepth = 0;
  }

  async open(target) {
    if (this.db) {
      throw new Error("Database is already open.");
    }

    switch (target.kind) {
      case "file":
        this.db = new DatabaseSync(target.path);
        break;
      case "memory":
        this.db = new DatabaseSync(":memory:");
        break;
      case "buffer":
        throw new Error("NodeSqliteDriver does not support buffer open targets.");
      case "opfs":
        throw new Error("NodeSqliteDriver does not support OPFS open targets.");
      default:
        throw new Error(`Unsupported open target: ${target.kind}`);
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.transactionDepth = 0;
    }
  }

  async exec(sql) {
    this.requireDb().exec(sql);
  }

  async prepare(sql) {
    return new NodeSqliteStatement(this.requireDb().prepare(sql));
  }

  async transaction(operation) {
    const db = this.requireDb();
    const nested = this.transactionDepth > 0;
    const savepointName = `udbx_sp_${this.transactionDepth}`;

    if (nested) {
      db.exec(`SAVEPOINT ${savepointName}`);
    } else {
      db.exec("BEGIN");
    }

    this.transactionDepth += 1;

    try {
      const result = await operation();
      this.transactionDepth -= 1;

      if (nested) {
        db.exec(`RELEASE SAVEPOINT ${savepointName}`);
      } else {
        db.exec("COMMIT");
      }

      return result;
    } catch (error) {
      this.transactionDepth -= 1;

      if (nested) {
        db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        db.exec(`RELEASE SAVEPOINT ${savepointName}`);
      } else {
        db.exec("ROLLBACK");
      }

      throw error;
    }
  }

  requireDb() {
    if (!this.db) {
      throw new Error("Database is not open.");
    }
    return this.db;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function colorBytes(color) {
  return [color.a, color.b, color.g, color.r];
}

function encodeGeoText() {
  const fixture = {
    geoType: 7,
    styleSize: 0,
    subCount: 1,
    text: "河南省",
    anchor: [113.165187569688, 33.875453985],
    rotation: 0,
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
      faceName: "宋体"
    }
  };

  const faceName = Buffer.from(fixture.style.faceName, "utf8");
  const text = Buffer.from(fixture.text, "utf8");
  const bytes = Buffer.alloc(
    4 + 4 + 4 + 4 + 4 + 4 + 8 + 8 + 16 + 4 + faceName.byteLength +
    16 + 4 + 4 + 4 + text.byteLength
  );
  let offset = 0;

  bytes.writeInt32LE(fixture.geoType, offset); offset += 4;
  bytes.writeInt32LE(fixture.styleSize, offset); offset += 4;
  bytes.writeInt32LE(fixture.subCount, offset); offset += 4;
  bytes.set(colorBytes(fixture.style.color), offset); offset += 4;
  bytes[offset++] = fixture.style.fixedSize;
  bytes[offset++] = fixture.style.weight;
  bytes[offset++] = fixture.style.styleFlag;
  bytes[offset++] = fixture.style.alignFlag;
  bytes.set(colorBytes(fixture.style.backgroundColor), offset); offset += 4;
  bytes.writeDoubleLE(fixture.style.fontWidth, offset); offset += 8;
  bytes.writeDoubleLE(fixture.style.fontHeight, offset); offset += 8;
  bytes.writeDoubleLE(fixture.style.anchor[0], offset); offset += 8;
  bytes.writeDoubleLE(fixture.style.anchor[1], offset); offset += 8;
  bytes.writeInt32LE(faceName.byteLength, offset); offset += 4;
  faceName.copy(bytes, offset); offset += faceName.byteLength;
  bytes.writeDoubleLE(fixture.anchor[0], offset); offset += 8;
  bytes.writeDoubleLE(fixture.anchor[1], offset); offset += 8;
  bytes.writeInt32LE(Math.round(fixture.rotation * 10), offset); offset += 4;
  bytes.writeInt32LE(0, offset); offset += 4;
  bytes.writeInt32LE(text.byteLength, offset); offset += 4;
  text.copy(bytes, offset); offset += text.byteLength;

  if (offset !== bytes.byteLength) {
    throw new Error(`GeoText 编码长度不一致：offset=${offset}, length=${bytes.byteLength}`);
  }

  return bytes;
}

function encodeGaiaPolygon(points, srid) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const bytes = Buffer.alloc(1 + 1 + 4 + 32 + 1 + 4 + 4 + 4 + points.length * 16 + 1);
  let offset = 0;
  bytes[offset++] = 0x00;
  bytes[offset++] = 0x01;
  bytes.writeInt32LE(srid, offset); offset += 4;
  bytes.writeDoubleLE(Math.min(...xs), offset); offset += 8;
  bytes.writeDoubleLE(Math.min(...ys), offset); offset += 8;
  bytes.writeDoubleLE(Math.max(...xs), offset); offset += 8;
  bytes.writeDoubleLE(Math.max(...ys), offset); offset += 8;
  bytes[offset++] = 0x7c;
  bytes.writeInt32LE(3, offset); offset += 4;
  bytes.writeInt32LE(0, offset); offset += 4;
  bytes.writeInt32LE(points.length, offset); offset += 4;
  for (const [x, y] of points) {
    bytes.writeDoubleLE(x, offset); offset += 8;
    bytes.writeDoubleLE(y, offset); offset += 8;
  }
  bytes[offset++] = 0xfe;
  return bytes;
}

async function insertTextComplianceDataset() {
  const driver = new NodeSqliteDriver();
  const srid = 4326;
  const datasetId = 9;
  const name = "test_text";
  const textBlob = encodeGeoText();
  const indexKey = encodeGaiaPolygon([
    [113.155187569688, 33.865453985],
    [113.175187569688, 33.865453985],
    [113.175187569688, 33.885453985],
    [113.155187569688, 33.885453985],
    [113.155187569688, 33.865453985]
  ], srid);

  try {
    await driver.open({ kind: "file", path: outputPath });
    await driver.transaction(async () => {
      await driver.exec(
        `CREATE TABLE "${name}" (
          SmID INTEGER NOT NULL PRIMARY KEY,
          SmUserID INTEGER DEFAULT 0,
          SmGeometry BLOB,
          SmIndexKey POLYGON,
          NAME TEXT NOT NULL,
          LEVEL INTEGER NOT NULL
        )`
      );
      const db = driver.requireDb();
      db.prepare(
        `INSERT INTO SmRegister (
          SmDatasetID, SmDatasetName, SmTableName, SmDatasetType, SmObjectCount,
          SmSRID, SmIDColName, SmGeoColName, SmLeft, SmRight, SmTop, SmBottom,
          SmIndexType, SmMaxGeometrySize, SmCreateTime, SmLastUpdateTime
        ) VALUES (?, ?, ?, 7, 1, ?, 'SmID', 'SmGeometry', ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`
      ).run(
        datasetId,
        name,
        name,
        srid,
        113.155187569688,
        113.175187569688,
        33.885453985,
        33.865453985,
        textBlob.byteLength
      );
      db.prepare(
        `INSERT INTO geometry_columns (
          f_table_name, f_geometry_column, geometry_type, coord_dimension, srid, spatial_index_enabled
        ) VALUES (?, 'smindexkey', 3, 2, ?, 0)`
      ).run(name, srid);
      const fieldStatement = db.prepare(
        `INSERT INTO SmFieldInfo (
          SmDatasetID, SmFieldName, SmFieldCaption, SmFieldType, SmFieldSign,
          SmFieldUpdatable, SmFieldbRequired, SmFieldDefaultValue, SmFieldSize
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
      );
      const systemFields = [
        ["SmID", "SmID", 4, 11, 1, "", 4],
        ["SmUserID", "SmUserID", 4, 0, 1, "0", 4],
        ["SmIndexKey", "SmIndexKey", 128, 12, 1, "", 0],
        ["SmGeometry", "SmGeometry", 128, 0, 1, "", 0]
      ];
      const userFields = textFields.map((field) => [
        field.name,
        field.name,
        field.fieldType === "int32" ? 4 : 128,
        0,
        field.nullable ? 0 : 1,
        "",
        field.fieldType === "int32" ? 4 : 0
      ]);
      for (const field of [...systemFields, ...userFields]) {
        fieldStatement.run(datasetId, ...field);
      }
      db.prepare(
        `INSERT INTO "${name}" (SmID, SmUserID, SmGeometry, SmIndexKey, NAME, LEVEL)
         VALUES (1, 0, ?, ?, 'Text Label', 1)`
      ).run(textBlob, indexKey);
    });
  } finally {
    await driver.close();
  }
}

function withoutGeneratedAt(manifest) {
  const { generatedAt, ...content } = manifest;
  return content;
}

async function resolveGeneratedAt(nextManifestContent) {
  try {
    const existing = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      JSON.stringify(withoutGeneratedAt(existing)) ===
      JSON.stringify(nextManifestContent)
    ) {
      return existing.generatedAt ?? new Date().toISOString();
    }
  } catch {
    // 首次生成或旧 manifest 损坏时使用当前时间。
  }

  return new Date().toISOString();
}

async function normalizeSystemMetadata() {
  const driver = new NodeSqliteDriver();
  try {
    await driver.open({ kind: "file", path: outputPath });
    await driver.transaction(async () => {
      await driver.exec(
        `UPDATE SmDataSourceInfo
         SET SmVersion = 1,
             SmDsDescription = 'udbx4spec compliance fixture',
             SmLastUpdateTime = '${FIXED_TIMESTAMP}',
             SmDataFormat = 1`
      );
      await driver.exec(
        `UPDATE SmRegister
         SET SmCreateTime = '${FIXED_TIMESTAMP}',
             SmLastUpdateTime = '${FIXED_TIMESTAMP}'`
      );
    });
    await driver.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    await driver.exec("PRAGMA journal_mode = DELETE");
  } finally {
    await driver.close();
  }
}

await mkdir(fixtureRoot, { recursive: true });
await rm(outputPath, { force: true });
await rm(`${outputPath}-wal`, { force: true });
await rm(`${outputPath}-shm`, { force: true });

const createDriver = new NodeSqliteDriver();
const ds = await UdbxDataSource.create({
  driver: createDriver,
  target: { kind: "file", path: outputPath },
  runtime: "electron"
});

try {
  const points = await ds.createPointDataset("test_points", 4326, pointFields);
  const lines = await ds.createLineDataset("test_lines", 4326, lineFields);
  const regions = await ds.createRegionDataset("test_regions", 4326, regionFields);
  const pointsZ = await ds.createPointZDataset("test_points_z", 4326, pointFields);
  const linesZ = await ds.createLineZDataset("test_lines_z", 4326, lineFields);
  const regionsZ = await ds.createRegionZDataset("test_regions_z", 4326, regionFields);
  const tabular = await ds.createTabularDataset("test_tabular", tabularFields);
  const cad = await ds.createCadDataset("test_cad", cadFields);

  await points.insertMany([
    {
      id: 1,
      geometry: { type: "Point", coordinates: [116.123, 39.456], srid: 4326 },
      attributes: {
        NAME: "Alpha City",
        CATEGORY: "capital",
        ELEVATION: 39.5
      }
    },
    {
      id: 2,
      geometry: { type: "Point", coordinates: [117.2, 40.1], srid: 4326 },
      attributes: {
        NAME: "Beta Port",
        CATEGORY: "harbor",
        ELEVATION: 12.25
      }
    },
    {
      id: 3,
      geometry: { type: "Point", coordinates: [118.05, 32.78], srid: 4326 },
      attributes: {
        NAME: "Gamma Hub",
        CATEGORY: "logistics",
        ELEVATION: 8.75
      }
    }
  ]);

  await lines.insertMany([
    {
      id: 10,
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [116.123, 39.456],
            [116.8, 39.9],
            [117.2, 40.1]
          ]
        ],
        srid: 4326
      },
      attributes: {
        NAME: "North Corridor",
        LEVEL: 1,
        LENGTH_KM: 128.4
      }
    },
    {
      id: 11,
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [117.2, 40.1],
            [117.6, 39.4]
          ],
          [
            [117.6, 39.4],
            [118.05, 32.78]
          ]
        ],
        srid: 4326
      },
      attributes: {
        NAME: "East Connector",
        LEVEL: 2,
        LENGTH_KM: 312.75
      }
    }
  ]);

  await regions.insert({
    id: 20,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [116.0, 39.2],
            [117.4, 39.2],
            [117.4, 40.3],
            [116.0, 40.3],
            [116.0, 39.2]
          ],
          [
            [116.4, 39.5],
            [116.9, 39.5],
            [116.9, 39.9],
            [116.4, 39.9],
            [116.4, 39.5]
          ]
        ]
      ],
      srid: 4326
    },
    attributes: {
      NAME: "Core Region",
      LEVEL: 3,
      AREA_KM2: 845.6
    }
  });

  await pointsZ.insertMany([
    {
      id: 101,
      geometry: {
        type: "Point",
        coordinates: [116.123, 39.456, 12.5],
        srid: 4326,
        hasZ: true
      },
      attributes: {
        NAME: "Alpha Tower",
        CATEGORY: "control",
        ELEVATION: 88.8
      }
    },
    {
      id: 102,
      geometry: {
        type: "Point",
        coordinates: [117.2, 40.1, 6.75],
        srid: 4326,
        hasZ: true
      },
      attributes: {
        NAME: "Beta Pier",
        CATEGORY: "harbor",
        ELEVATION: 6.75
      }
    }
  ]);

  await linesZ.insert({
    id: 110,
    geometry: {
      type: "MultiLineString",
      coordinates: [
        [
          [116.123, 39.456, 12.5],
          [116.8, 39.9, 15.25],
          [117.2, 40.1, 18.75]
        ]
      ],
      srid: 4326,
      hasZ: true
    },
    attributes: {
      NAME: "Sky Corridor",
      LEVEL: 5,
      LENGTH_KM: 128.4
    }
  });

  await regionsZ.insert({
    id: 120,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [116.0, 39.2, 10],
            [117.4, 39.2, 11],
            [117.4, 40.3, 12],
            [116.0, 40.3, 11],
            [116.0, 39.2, 10]
          ]
        ]
      ],
      srid: 4326,
      hasZ: true
    },
    attributes: {
      NAME: "Elevated Region",
      LEVEL: 7,
      AREA_KM2: 845.6
    }
  });

  await tabular.insertMany([
    {
      id: 30,
      attributes: {
        NAME: "config.maxZoom",
        VALUE: 18,
        SCORE: 0.95
      }
    },
    {
      id: 31,
      attributes: {
        NAME: "config.retryCount",
        VALUE: 3,
        SCORE: 0.5
      }
    }
  ]);

  await cad.insertMany([
    {
      id: 130,
      geometry: {
        type: "CadPoint",
        x: 116.123,
        y: 39.456,
        style: {
          kind: "marker",
          markerStyle: 1,
          markerSize: 20,
          markerAngle: 0,
          markerColor: 255,
          markerWidth: 20,
          markerHeight: 20,
          fillOpaqueRate: 100,
          fillGradientType: 0,
          fillAngle: 0,
          fillCenterOffsetX: 0,
          fillCenterOffsetY: 0,
          fillBackcolor: 16777215
        }
      },
      attributes: {
        NAME: "CAD Point",
        LEVEL: 1
      }
    },
    {
      id: 131,
      geometry: {
        type: "CadLine",
        numSub: 1,
        subPointCounts: [3],
        coordinates: [
          [116.123, 39.456],
          [116.8, 39.9],
          [117.2, 40.1]
        ],
        style: {
          kind: "line",
          lineStyle: 1,
          lineWidth: 1,
          lineColor: 65280
        }
      },
      attributes: {
        NAME: "CAD Line",
        LEVEL: 2
      }
    },
    {
      id: 132,
      geometry: {
        type: "CadRegion",
        numSub: 1,
        subPointCounts: [5],
        coordinates: [
          [116.0, 39.2],
          [117.4, 39.2],
          [117.4, 40.3],
          [116.0, 40.3],
          [116.0, 39.2]
        ],
        style: {
          kind: "fill",
          lineStyle: 1,
          lineWidth: 1,
          lineColor: 0,
          fillStyle: 0,
          fillForecolor: 16711680,
          fillBackcolor: 16777215,
          fillOpaquerate: 100,
          fillGadientType: 0,
          fillAngle: 0,
          fillCenterOffsetX: 0,
          fillCenterOffsetY: 0
        }
      },
      attributes: {
        NAME: "CAD Region",
        LEVEL: 3
      }
    }
  ]);
} finally {
  await ds.close();
}

await insertTextComplianceDataset();

await normalizeSystemMetadata();

const bytes = await readFile(outputPath);
const fixtureEntry = {
  ...fixtureSpec,
  status: "ready",
  byteSize: bytes.byteLength,
  sha256: sha256(bytes),
  generator,
  fixedTimestamp: FIXED_TIMESTAMP
};

const manifestContent = {
  schemaVersion: 1,
  status: "ready",
  fixtures: [fixtureEntry]
};
const manifest = {
  schemaVersion: manifestContent.schemaVersion,
  generatedAt: await resolveGeneratedAt(manifestContent),
  status: manifestContent.status,
  fixtures: manifestContent.fixtures
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated compliance fixture: ${outputPath}`);
