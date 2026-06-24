#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(specRoot, "..");
const sourcePath = resolve(specRoot, "compliance/compliance.udbx");
const roundtripRoot = resolve(specRoot, "compliance/roundtrip");
const udbx4tsOutputPath = resolve(roundtripRoot, "udbx4ts-roundtrip.udbx");
const udbx4goOutputPath = resolve(roundtripRoot, "udbx4go-roundtrip.udbx");
const udbx4jOutputPath = resolve(roundtripRoot, "udbx4j-roundtrip.udbx");
const manifestPath = resolve(roundtripRoot, "manifest.json");
const udbx4tsDist = resolve(workspaceRoot, "udbx4ts/dist/index.js");
const udbx4goRoot = resolve(workspaceRoot, "udbx4go");
const udbx4jRoot = resolve(workspaceRoot, "udbx4j");
const m2Root = resolve(process.env.HOME ?? "/Users/zhangyuting", ".m2/repository");

const execFileAsync = promisify(execFile);

const { UdbxDataSource } = await import(pathToFileURL(udbx4tsDist).href).catch(
  (error) => {
    throw new Error(
      `无法加载 udbx4ts 构建产物：${udbx4tsDist}\n请先执行：cd udbx4ts && npm run build\n${error.message}`
    );
  }
);

const FIXED_TIMESTAMP = "2026-01-01T00:00:00Z";
const java17Home = "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home";
const datasetNames = [
  "test_points",
  "test_lines",
  "test_regions",
  "test_points_z",
  "test_lines_z",
  "test_regions_z",
  "test_tabular",
  "test_cad",
  "test_text"
];

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
      default:
        throw new Error(`NodeSqliteDriver does not support ${target.kind} open targets.`);
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

async function snapshotDataset(ds, name) {
  const info = (await ds.listDatasets()).find((dataset) => dataset.name === name);
  if (!info) {
    throw new Error(`源数据库缺少数据集：${name}`);
  }

  const dataset = await ds.getDataset(name);
  if (!dataset) {
    throw new Error(`无法打开源数据集：${name}`);
  }

  return {
    info,
    fields: await dataset.getFields(),
    records: await dataset.list()
  };
}

async function createDataset(target, snapshot) {
  const { info, fields } = snapshot;
  const srid = info.srid ?? 0;

  switch (info.kind) {
    case "point":
      return target.createPointDataset(info.name, srid, fields);
    case "line":
      return target.createLineDataset(info.name, srid, fields);
    case "region":
      return target.createRegionDataset(info.name, srid, fields);
    case "pointZ":
      return target.createPointZDataset(info.name, srid, fields);
    case "lineZ":
      return target.createLineZDataset(info.name, srid, fields);
    case "regionZ":
      return target.createRegionZDataset(info.name, srid, fields);
    case "tabular":
      return target.createTabularDataset(info.name, fields);
    case "cad":
      return target.createCadDataset(info.name, fields);
    case "text":
      return target.createTextDataset(info.name, srid, fields);
    default:
      throw new Error(`暂不支持生成 roundtrip fixture 的数据集类型：${info.kind}`);
  }
}

async function normalizeSystemMetadata(path, description) {
  const driver = new NodeSqliteDriver();
  try {
    await driver.open({ kind: "file", path });
    await driver.transaction(async () => {
      await driver.exec(
        `UPDATE SmDataSourceInfo
         SET SmVersion = 1,
             SmDsDescription = '${description}',
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

await mkdir(roundtripRoot, { recursive: true });
for (const path of [udbx4tsOutputPath, udbx4goOutputPath, udbx4jOutputPath]) {
  await rm(path, { force: true });
  await rm(`${path}-wal`, { force: true });
  await rm(`${path}-shm`, { force: true });
}

const source = await UdbxDataSource.open({
  driver: new NodeSqliteDriver(),
  target: { kind: "file", path: sourcePath },
  runtime: "electron"
});

const snapshots = [];
try {
  for (const name of datasetNames) {
    snapshots.push(await snapshotDataset(source, name));
  }
} finally {
  await source.close();
}

const target = await UdbxDataSource.create({
  driver: new NodeSqliteDriver(),
  target: { kind: "file", path: udbx4tsOutputPath },
  runtime: "electron"
});

try {
  for (const snapshot of snapshots) {
    const dataset = await createDataset(target, snapshot);
    await dataset.insertMany(snapshot.records);
  }
} finally {
  await target.close();
}

await normalizeSystemMetadata(
  udbx4tsOutputPath,
  "udbx4spec udbx4ts roundtrip fixture"
);

await execFileAsync(
  "go",
  [
    "run",
    "./cmd/udbx4go-roundtrip-fixture",
    "--source",
    sourcePath,
    "--output",
    udbx4goOutputPath
  ],
  {
    cwd: udbx4goRoot,
    env: {
      ...process.env,
      GOCACHE: process.env.GOCACHE ?? resolve(tmpdir(), "udbx4go-gocache")
    }
  }
);

await normalizeSystemMetadata(
  udbx4goOutputPath,
  "udbx4spec udbx4go roundtrip fixture"
);

const java17Env = {
  ...process.env,
  JAVA_HOME: java17Home,
  PATH: `${java17Home}/bin:${process.env.PATH}`
};
const udbx4jClasspath = [
  resolve(udbx4jRoot, "target/classes"),
  resolve(udbx4jRoot, "target/test-classes"),
  resolve(m2Root, "org/xerial/sqlite-jdbc/3.45.3.0/sqlite-jdbc-3.45.3.0.jar"),
  resolve(m2Root, "org/locationtech/jts/jts-core/1.19.0/jts-core-1.19.0.jar"),
  resolve(m2Root, "com/zaxxer/HikariCP/5.1.0/HikariCP-5.1.0.jar"),
  resolve(m2Root, "org/slf4j/slf4j-api/1.7.36/slf4j-api-1.7.36.jar")
].join(":");

await execFileAsync("mvn", ["-DskipTests", "test-compile"], {
  cwd: udbx4jRoot,
  env: java17Env
});

await execFileAsync(
  resolve(java17Home, "bin/java"),
  [
    "-cp",
    udbx4jClasspath,
    "com.supermap.udbx.integration.Udbx4SpecRoundtripFixtureGenerator",
    "--source",
    sourcePath,
    "--output",
    udbx4jOutputPath
  ],
  {
    cwd: udbx4jRoot,
    env: java17Env
  }
);

await normalizeSystemMetadata(
  udbx4jOutputPath,
  "udbx4spec udbx4j roundtrip fixture"
);

const udbx4tsBytes = await readFile(udbx4tsOutputPath);
const udbx4goBytes = await readFile(udbx4goOutputPath);
const udbx4jBytes = await readFile(udbx4jOutputPath);
const requiredDatasets = [
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
];
const manifestContent = {
  schemaVersion: 1,
  status: "ready",
  fixtures: [
    {
      id: "udbx4ts-roundtrip-v1",
      path: "udbx4ts-roundtrip.udbx",
      tier: "T2",
      stability: "stable",
      usage: ["read", "roundtrip"],
      source: "../compliance.udbx",
      description: "由 udbx4ts 读取标准 compliance.udbx 后重新写出的跨语言 roundtrip 夹具。",
      producer: {
        implementation: "udbx4ts",
        generator: "udbx4spec/tools/generate-roundtrip-fixtures.mjs",
        implementationPath: "../udbx4ts/dist/index.js"
      },
      requiredDatasets,
      requiredFieldTypes: ["text", "int32", "double"],
      expectedGeometryColumns: 7,
      status: "ready",
      byteSize: udbx4tsBytes.byteLength,
      sha256: sha256(udbx4tsBytes),
      fixedTimestamp: FIXED_TIMESTAMP
    },
    {
      id: "udbx4go-roundtrip-v1",
      path: "udbx4go-roundtrip.udbx",
      tier: "T2",
      stability: "stable",
      usage: ["read", "roundtrip"],
      source: "../compliance.udbx",
      description: "由 udbx4go 读取标准 compliance.udbx 后重新写出的跨语言 roundtrip 夹具。",
      producer: {
        implementation: "udbx4go",
        generator: "udbx4spec/tools/generate-roundtrip-fixtures.mjs",
        implementationPath: "../udbx4go/cmd/udbx4go-roundtrip-fixture"
      },
      requiredDatasets,
      requiredFieldTypes: ["text", "int32", "double"],
      expectedGeometryColumns: 7,
      status: "ready",
      byteSize: udbx4goBytes.byteLength,
      sha256: sha256(udbx4goBytes),
      fixedTimestamp: FIXED_TIMESTAMP
    },
    {
      id: "udbx4j-roundtrip-v1",
      path: "udbx4j-roundtrip.udbx",
      tier: "T2",
      stability: "stable",
      usage: ["read", "roundtrip"],
      source: "../compliance.udbx",
      description: "由 udbx4j 读取标准 compliance.udbx 后重新写出的跨语言 roundtrip 夹具。",
      producer: {
        implementation: "udbx4j",
        generator: "udbx4spec/tools/generate-roundtrip-fixtures.mjs",
        implementationPath:
          "../udbx4j/src/test/java/com/supermap/udbx/integration/Udbx4SpecRoundtripFixtureGenerator.java"
      },
      requiredDatasets,
      requiredFieldTypes: ["text", "int32", "double"],
      expectedGeometryColumns: 7,
      status: "ready",
      byteSize: udbx4jBytes.byteLength,
      sha256: sha256(udbx4jBytes),
      fixedTimestamp: FIXED_TIMESTAMP
    }
  ]
};

const manifest = {
  schemaVersion: manifestContent.schemaVersion,
  generatedAt: await resolveGeneratedAt(manifestContent),
  status: manifestContent.status,
  fixtures: manifestContent.fixtures
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Generated roundtrip fixtures: ${udbx4tsOutputPath}, ${udbx4goOutputPath}, ${udbx4jOutputPath}`
);
