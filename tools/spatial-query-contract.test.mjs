import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const specDir = path.resolve(toolsDir, "..");
const schemaDir = path.join(specDir, "reference", "json-schema");
const javaDir = path.join(specDir, "reference", "java");
const typescriptPath = path.join(specDir, "reference", "typescript", "udbx4spec.d.ts");
const typescriptCompilerPath = path.join(specDir, "node_modules", ".bin", "tsc");
const execFileAsync = promisify(execFile);
const schemaIdBase = "https://github.com/udbx4x/udbx4spec/schemas/";
const contractSchemaIds = {
  boundingBox: `${schemaIdBase}spatial/bounding-box.json`,
  options: `${schemaIdBase}dataset/spatial-query-options.json`,
  result: `${schemaIdBase}dataset/spatial-query-result.json`,
  datasetInfo: `${schemaIdBase}dataset/dataset-info.json`,
};
let contractValidatorsPromise;

const strategyValues = ["rtree", "envelope_cache"];
const reasonValues = [
  "invalid_viewport",
  "spatial_index_unavailable",
  "envelope_cache_budget_exceeded",
  "query_timeout",
  "corrupt_geometry",
  "unsupported_dataset_kind",
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(schemaDir, relativePath), "utf8"));
}

async function readSpec(relativePath) {
  return readFile(path.join(specDir, relativePath), "utf8");
}

async function listFiles(root, extension) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(root, entry.name);
      return entry.isDirectory()
        ? listFiles(entryPath, extension)
        : entry.name.endsWith(extension)
          ? [entryPath]
          : [];
    }),
  );
  return nested.flat().sort();
}

async function loadContractValidators() {
  if (!contractValidatorsPromise) {
    contractValidatorsPromise = (async () => {
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      const schemaFiles = await listFiles(schemaDir, ".json");
      const schemas = await Promise.all(
        schemaFiles.map(async (schemaFile) => {
          const schema = JSON.parse(await readFile(schemaFile, "utf8"));
          const relativePath = path.relative(schemaDir, schemaFile).split(path.sep).join("/");
          assert.equal(schema.$id, `${schemaIdBase}${relativePath}`, `$id must match ${relativePath}`);
          return schema;
        }),
      );
      for (const schema of schemas) {
        ajv.addSchema(schema);
      }

      const validators = {};
      for (const [name, schemaId] of Object.entries(contractSchemaIds)) {
        const validate = ajv.getSchema(schemaId);
        assert.ok(validate, `Ajv must compile ${schemaId}`);
        validators[name] = validate;
      }
      return { ajv, schemas, validators };
    })();
  }
  return contractValidatorsPromise;
}

function assertAjvValid(validate, instance) {
  assert.equal(validate(instance), true, JSON.stringify(validate.errors, null, 2));
}

function assertAjvInvalid(validate, instance, expectedKeyword) {
  assert.equal(validate(instance), false, "instance must be rejected");
  assert.ok(
    validate.errors?.some((error) => error.keyword === expectedKeyword),
    JSON.stringify(validate.errors, null, 2),
  );
}

function validateBoundingBoxRuntime(bounds) {
  for (const coordinate of [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY]) {
    if (!Number.isFinite(coordinate)) {
      throw new RangeError("BoundingBox coordinates must be finite");
    }
  }
  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new RangeError("BoundingBox coordinates must be ordered");
  }
  return bounds;
}

function assertExactKeys(actual, expected, message) {
  assert.deepEqual(Object.keys(actual).sort(), [...expected].sort(), message);
}

function extractTypeScriptUnion(source, typeName) {
  const match = source.match(new RegExp(`export type ${typeName}\\s*=([\\s\\S]*?);`));
  assert.ok(match, `TypeScript must declare ${typeName}`);
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
}

function extractJavaEnumValues(source) {
  const declaration = source.match(/public enum \w+\s*\{([\s\S]*?);/);
  assert.ok(declaration, "Java enum declaration must have a constant section");
  return [...declaration[1].matchAll(/\b[A-Z][A-Z0-9_]*\("([^"]+)"\)/g)].map(
    (item) => item[1],
  );
}

function extractMarkdownSection(source, heading) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  assert.notEqual(start, -1, `document must contain section: ${heading}`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}

test("Java reference sources compile with javac 11", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "udbx4spec-javac-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const stubDirectory = path.join(temporaryRoot, "stubs", "javax", "annotation");
  const classesDirectory = path.join(temporaryRoot, "classes");
  const nullableStub = path.join(stubDirectory, "Nullable.java");
  const sources = await listFiles(javaDir, ".java");
  const sourceText = (await Promise.all(sources.map((source) => readFile(source, "utf8")))).join("\n");

  assert.equal(sources.length, 53, "compile every Java reference source");
  assert.ok(sources.some((source) => source.includes(`${path.sep}enums${path.sep}`)));
  assert.doesNotMatch(sourceText, /com\.supermap\.udbx\.enum(?:\.|;)/);
  await mkdir(stubDirectory, { recursive: true });
  await mkdir(classesDirectory, { recursive: true });
  await writeFile(
    nullableStub,
    [
      "package javax.annotation;",
      "import java.lang.annotation.ElementType;",
      "import java.lang.annotation.Retention;",
      "import java.lang.annotation.RetentionPolicy;",
      "import java.lang.annotation.Target;",
      "@Retention(RetentionPolicy.RUNTIME)",
      "@Target({ElementType.METHOD, ElementType.PARAMETER, ElementType.FIELD})",
      "public @interface Nullable {}",
      "",
    ].join("\n"),
  );

  await execFileAsync(
    "javac",
    ["--release", "11", "-d", classesDirectory, nullableStub, ...sources],
    { maxBuffer: 1024 * 1024 },
  );
});

test("Java enum package and documentation use com.supermap.udbx.enums", async () => {
  const enumDirectory = path.join(javaDir, "enums");
  const enumSources = await listFiles(enumDirectory, ".java");
  const [javaReadme, naming, languageMapping] = await Promise.all([
    readSpec("reference/java/README.md"),
    readSpec("docs/01-naming-conventions.md"),
    readSpec("docs/06-language-mapping.md"),
  ]);

  assert.equal(enumSources.length, 5);
  for (const source of enumSources) {
    assert.match(await readFile(source, "utf8"), /package com\.supermap\.udbx\.enums;/);
  }
  for (const documentation of [javaReadme, naming, languageMapping]) {
    assert.match(documentation, /com\.supermap\.udbx\.enums/);
    assert.doesNotMatch(documentation, /com\.supermap\.udbx\.enum(?:\.|;)/);
  }
  assert.match(javaReadme, /├── enums\//);
});

test("TypeScript reference compiles with a real tsc", async () => {
  await execFileAsync(
    typescriptCompilerPath,
    ["--noEmit", typescriptPath],
    { maxBuffer: 1024 * 1024 },
  );
});

test("Ajv compiles the complete spatial query reference graph", async () => {
  const { schemas, validators } = await loadContractValidators();
  const schemaFiles = await listFiles(schemaDir, ".json");

  assert.equal(schemas.length, schemaFiles.length, "register every JSON Schema by $id");
  for (const [name, validate] of Object.entries(validators)) {
    assert.equal(typeof validate, "function", `Ajv must compile ${name}`);
  }
});

test("Ajv validates real Point Feature and spatial query positive instances", async () => {
  const { validators } = await loadContractValidators();
  const zeroAreaBounds = { minX: 4, minY: 7, maxX: 4, maxY: 7 };
  const pointFeature = {
    id: 1,
    geometry: { type: "Point", coordinates: [116.4, 39.9] },
    attributes: { name: "sample" },
  };

  assertAjvValid(validators.boundingBox, zeroAreaBounds);
  assert.deepEqual(validateBoundingBoxRuntime(zeroAreaBounds), zeroAreaBounds);
  assertAjvValid(validators.options, {
    bounds: zeroAreaBounds,
    limit: 25,
    requiredIds: [1, 9],
  });
  assertAjvValid(validators.result, {
    features: [pointFeature],
    queriedBounds: zeroAreaBounds,
    strategy: "envelope_cache",
    hasMore: false,
  });
  assertAjvValid(validators.datasetInfo, {
    id: 1,
    name: "sample_points",
    tableName: "sample_points",
    kind: "point",
    srid: 4326,
    objectCount: 1,
    geometryType: 1,
    extent: zeroAreaBounds,
    fields: [],
  });
});

test("bounded_sample is a Viewer preview strategy, not an SDK spatial query result", async () => {
  const { validators } = await loadContractValidators();
  assertAjvInvalid(
    validators.result,
    {
      features: [],
      queriedBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      strategy: "bounded_sample",
      hasMore: false,
    },
    "enum",
  );
});

test("degradedReason is not part of an SDK spatial query result", async () => {
  const { validators } = await loadContractValidators();
  assertAjvInvalid(
    validators.result,
    {
      features: [],
      queriedBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      strategy: "envelope_cache",
      hasMore: false,
      degradedReason: "envelope_cache_budget_exceeded",
    },
    "additionalProperties",
  );
});

test("Ajv rejects invalid Point Feature, options, and results", async () => {
  const { validators } = await loadContractValidators();
  const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const pointFeature = {
    id: 1,
    geometry: { type: "Point", coordinates: [1, 2] },
    attributes: {},
  };
  const result = {
    features: [pointFeature],
    queriedBounds: bounds,
    strategy: "rtree",
    hasMore: false,
  };

  assertAjvInvalid(
    validators.result,
    { ...result, features: [{ ...pointFeature, geometry: { type: "Point", coordinates: [1] } }] },
    "oneOf",
  );
  assertAjvInvalid(
    validators.result,
    { ...result, features: [{ ...pointFeature, geometry: { type: "LineString", coordinates: [1, 2] } }] },
    "oneOf",
  );
  const { attributes, ...featureWithoutAttributes } = pointFeature;
  assert.deepEqual(attributes, {});
  assertAjvInvalid(
    validators.result,
    { ...result, features: [featureWithoutAttributes] },
    "required",
  );

  assertAjvInvalid(
    validators.options,
    { bounds, limit: 0 },
    "minimum",
  );
  assertAjvInvalid(
    validators.options,
    { bounds, limit: 1, requiredIds: [2, 2] },
    "uniqueItems",
  );
  assertAjvInvalid(
    validators.options,
    { bounds, limit: 1, requiredIds: [0] },
    "minimum",
  );
  assertAjvInvalid(validators.options, { limit: 1 }, "required");
  assertAjvInvalid(validators.options, { bounds }, "required");
  assertAjvInvalid(
    validators.options,
    { bounds, limit: 1, offset: 0 },
    "additionalProperties",
  );

  assertAjvInvalid(
    validators.result,
    { ...result, strategy: "scan" },
    "enum",
  );
  const { hasMore, ...missingHasMore } = result;
  assert.equal(hasMore, false);
  assertAjvInvalid(validators.result, missingHasMore, "required");
  assertAjvInvalid(
    validators.result,
    { ...result, total: 100 },
    "additionalProperties",
  );
  assertAjvInvalid(
    validators.boundingBox,
    { ...bounds, srid: 4326 },
    "additionalProperties",
  );
});

test("BoundingBox ordering and non-JSON numbers remain runtime concerns", async () => {
  const { validators } = await loadContractValidators();
  const reversedBounds = { minX: 5, minY: 0, maxX: 4, maxY: 10 };

  assertAjvValid(validators.boundingBox, reversedBounds);
  assert.throws(() => validateBoundingBoxRuntime(reversedBounds), /must be ordered/);
  assert.throws(
    () => JSON.parse('{"minX":NaN,"minY":0,"maxX":1,"maxY":1}'),
    SyntaxError,
  );
  assert.throws(
    () => validateBoundingBoxRuntime({ ...reversedBounds, minX: Number.NaN }),
    /must be finite/,
  );
});

test("BoundingBox schema fixes the four-field object shape", async () => {
  const schema = await readJson("spatial/bounding-box.json");

  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["minX", "minY", "maxX", "maxY"]);
  assertExactKeys(schema.properties, ["minX", "minY", "maxX", "maxY"]);
  for (const property of Object.values(schema.properties)) {
    assert.equal(property.type, "number");
  }
  assert.equal(schema.additionalProperties, false);
});

test("SpatialQueryOptions schema requires bounds and a positive limit", async () => {
  const schema = await readJson("dataset/spatial-query-options.json");

  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["bounds", "limit"]);
  assertExactKeys(schema.properties, ["bounds", "limit", "requiredIds"]);
  assert.equal(schema.properties.bounds.$ref, "../spatial/bounding-box.json");
  assert.deepEqual(
    { type: schema.properties.limit.type, minimum: schema.properties.limit.minimum },
    { type: "integer", minimum: 1 },
  );
  assert.equal(schema.properties.requiredIds.type, "array");
  assert.equal(schema.properties.requiredIds.uniqueItems, true);
  assert.deepEqual(schema.properties.requiredIds.items, { type: "integer", minimum: 1 });
  assert.equal(schema.additionalProperties, false);
});

test("SpatialQueryResult schema contains only successful result facts", async () => {
  const schema = await readJson("dataset/spatial-query-result.json");

  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["features", "queriedBounds", "strategy", "hasMore"]);
  assertExactKeys(schema.properties, ["features", "queriedBounds", "strategy", "hasMore"]);
  assert.equal(schema.properties.features.type, "array");
  assert.deepEqual(schema.properties.features.items, { $ref: "../feature/feature.json" });
  assert.equal(schema.properties.queriedBounds.$ref, "../spatial/bounding-box.json");
  assert.equal(schema.properties.strategy.$ref, "../enum/spatial-query-strategy.json");
  assert.equal(schema.properties.hasMore.type, "boolean");
  assert.equal(schema.additionalProperties, false);
});

test("strategy and reason values stay ordered across JSON, TypeScript, and Java", async () => {
  const [strategySchema, reasonSchema, typescript, strategyJava, reasonJava] = await Promise.all([
    readJson("enum/spatial-query-strategy.json"),
    readJson("enum/spatial-query-reason.json"),
    readFile(typescriptPath, "utf8"),
    readFile(path.join(javaDir, "enums", "SpatialQueryStrategy.java"), "utf8"),
    readFile(path.join(javaDir, "enums", "SpatialQueryReason.java"), "utf8"),
  ]);

  assert.deepEqual(strategySchema.enum, strategyValues);
  assert.deepEqual(extractTypeScriptUnion(typescript, "SpatialQueryStrategy"), strategyValues);
  assert.deepEqual(extractJavaEnumValues(strategyJava), strategyValues);
  assert.match(strategyJava, /public String getValue\(\)/);

  assert.deepEqual(reasonSchema.enum, reasonValues);
  assert.match(reasonSchema.description, /error.*capability diagnostic/i);
  assert.doesNotMatch(reasonSchema.description, /degrad/i);
  assert.deepEqual(extractTypeScriptUnion(typescript, "SpatialQueryReason"), reasonValues);
  assert.deepEqual(extractJavaEnumValues(reasonJava), reasonValues);
  assert.match(reasonJava, /错误或 capability 诊断原因/);
  assert.doesNotMatch(reasonJava, /降级原因/);
  assert.match(reasonJava, /public String getValue\(\)/);
});

test("TypeScript reference declares the spatial query data contract", async () => {
  const source = await readFile(typescriptPath, "utf8");
  const spatialQueryResult = source.match(
    /export interface SpatialQueryResult<TFeature extends Feature = Feature>\s*\{([\s\S]*?)\}/,
  );

  assert.match(source, /export interface BoundingBox\s*\{[\s\S]*?readonly minX: number;[\s\S]*?readonly minY: number;[\s\S]*?readonly maxX: number;[\s\S]*?readonly maxY: number;[\s\S]*?\}/);
  assert.match(source, /export interface SpatialQueryOptions\s*\{[\s\S]*?readonly bounds: BoundingBox;[\s\S]*?readonly limit: number;[\s\S]*?readonly requiredIds\?: readonly number\[\];[\s\S]*?\}/);
  assert.ok(spatialQueryResult);
  assert.match(spatialQueryResult[1], /readonly features: readonly TFeature\[\];[\s\S]*?readonly queriedBounds: BoundingBox;[\s\S]*?readonly strategy: SpatialQueryStrategy;[\s\S]*?readonly hasMore: boolean;/);
  assert.doesNotMatch(spatialQueryResult[1], /degradedReason|SpatialQueryReason/);
  assert.match(source, /export interface DatasetInfo\s*\{[\s\S]*?readonly extent\?: BoundingBox;[\s\S]*?\}/);
});

test("Java reference uses Feature wildcard lists and excludes result diagnostics", async () => {
  const [bounds, options, result, datasetInfo] = await Promise.all([
    readFile(path.join(javaDir, "meta", "BoundingBox.java"), "utf8"),
    readFile(path.join(javaDir, "meta", "SpatialQueryOptions.java"), "utf8"),
    readFile(path.join(javaDir, "meta", "SpatialQueryResult.java"), "utf8"),
    readFile(path.join(javaDir, "meta", "DatasetInfo.java"), "utf8"),
  ]);

  for (const getter of ["getMinX", "getMinY", "getMaxX", "getMaxY"]) {
    assert.match(bounds, new RegExp(`double ${getter}\\(\\);`));
  }
  assert.match(options, /BoundingBox getBounds\(\);/);
  assert.match(options, /int getLimit\(\);/);
  assert.match(options, /@Nullable\s+List<Integer> getRequiredIds\(\);/);
  assert.match(result, /import com\.supermap\.udbx\.feature\.Feature;/);
  assert.match(result, /List<\? extends Feature> getFeatures\(\);/);
  assert.doesNotMatch(result, /degradedReason|SpatialQueryReason|Nullable/i);
  assert.match(datasetInfo, /@Nullable\s+BoundingBox getExtent\(\);/);
});

test("DatasetInfo and schema index expose every new schema", async () => {
  const [datasetInfo, index] = await Promise.all([
    readJson("dataset/dataset-info.json"),
    readJson("index.json"),
  ]);
  const expectedRefs = [
    "./spatial/bounding-box.json",
    "./dataset/spatial-query-options.json",
    "./dataset/spatial-query-result.json",
    "./enum/spatial-query-strategy.json",
    "./enum/spatial-query-reason.json",
  ];

  assert.equal(datasetInfo.properties.extent.$ref, "../spatial/bounding-box.json");
  assert.equal(datasetInfo.required.includes("extent"), false);
  assert.equal(index.$defs.spatial.boundingBox.$ref, expectedRefs[0]);
  assert.equal(index.$defs.dataset.spatialQueryOptions.$ref, expectedRefs[1]);
  assert.equal(index.$defs.dataset.spatialQueryResult.$ref, expectedRefs[2]);
  assert.equal(index.$defs.enum.spatialQueryStrategy.$ref, expectedRefs[3]);
  assert.equal(index.$defs.enum.spatialQueryReason.$ref, expectedRefs[4]);
  for (const reference of expectedRefs) {
    assert.ok(index.properties.$ref.enum.includes(reference), `index must list ${reference}`);
  }
});

test("ordinary QueryOptions remains pagination-only", async () => {
  const [schema, java, typescript] = await Promise.all([
    readJson("dataset/query-options.json"),
    readFile(path.join(javaDir, "meta", "QueryOptions.java"), "utf8"),
    readFile(typescriptPath, "utf8"),
  ]);

  assertExactKeys(schema.properties, ["ids", "limit", "offset"]);
  assert.doesNotMatch(java, /getBbox|BoundingBox/);
  const queryOptions = typescript.match(/export interface QueryOptions\s*\{([\s\S]*?)\}/);
  assert.ok(queryOptions);
  assert.doesNotMatch(queryOptions[1], /bbox|bounds|extent/);
});

test("documentation defines viewport query semantics and reference-only status", async () => {
  const [stableSurface, geometryModel, errorTaxonomy, languageMapping] = await Promise.all([
    readSpec("docs/08-api-stable-surface.md"),
    readSpec("docs/02-geometry-model.md"),
    readSpec("docs/05-error-taxonomy.md"),
    readSpec("docs/06-language-mapping.md"),
  ]);
  const contract = extractMarkdownSection(stableSurface, "视口空间查询契约");

  assert.match(contract, /MBR.*边界接触.*相交/);
  assert.match(contract, /`limit \+ 1`|`limit\+1`/);
  assert.match(contract, /第 `limit \+ 1` 条.*`hasMore`|第 `limit\+1` 条.*`hasMore`/);
  assert.match(contract, /前 `limit` 个.*`requiredIds`.*去重并集/);
  assert.match(contract, /`requiredIds`.*唯一正整数/);
  assert.match(contract, /追加在普通结果之后/);
  assert.match(contract, /不占用 `limit`/);
  assert.match(contract, /`hasMore`.*只描述视口匹配集合/);
  assert.match(contract, /不返回.*精确命中总数/);
  assert.match(contract, /`strategy`.*结果事实/);
  assert.doesNotMatch(contract, /`degradedReason`/);
  assert.match(contract, /前端.*不可.*猜/);
  assert.match(contract, /缓存预算.*15%.*预取.*并发.*防抖.*不属于格式契约/);
  assert.match(geometryModel, /几何交换 `bbox`.*tuple[\s\S]*查询 `BoundingBox`.*对象/);
  assert.match(errorTaxonomy, /SpatialQueryReason[\s\S]*错误[\s\S]*capability/);
  assert.doesNotMatch(errorTaxonomy, /degradedReason/);
  assert.match(languageMapping, /reference-only[\s\S]*Go.*后续/);
  assert.doesNotMatch(languageMapping, /degradedReason/);
});

test("JSON Schema README lists the spatial query schema family", async () => {
  const readme = await readSpec("reference/json-schema/README.md");

  for (const file of [
    "bounding-box.json",
    "spatial-query-options.json",
    "spatial-query-result.json",
    "spatial-query-strategy.json",
    "spatial-query-reason.json",
  ]) {
    assert.match(readme, new RegExp(file.replaceAll(".", "\\.")));
  }
});
