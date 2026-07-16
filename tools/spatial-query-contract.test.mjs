import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const specDir = path.resolve(toolsDir, "..");
const schemaDir = path.join(specDir, "reference", "json-schema");
const javaDir = path.join(specDir, "reference", "java");
const typescriptPath = path.join(specDir, "reference", "typescript", "udbx4spec.d.ts");

const strategyValues = ["rtree", "envelope_cache", "bounded_sample"];
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

test("SpatialQueryResult schema requires result facts and keeps degradation optional", async () => {
  const schema = await readJson("dataset/spatial-query-result.json");

  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["features", "queriedBounds", "strategy", "hasMore"]);
  assertExactKeys(schema.properties, [
    "features",
    "queriedBounds",
    "strategy",
    "hasMore",
    "degradedReason",
  ]);
  assert.equal(schema.properties.features.type, "array");
  assert.deepEqual(schema.properties.features.items, { $ref: "../feature/feature.json" });
  assert.equal(schema.properties.queriedBounds.$ref, "../spatial/bounding-box.json");
  assert.equal(schema.properties.strategy.$ref, "../enum/spatial-query-strategy.json");
  assert.equal(schema.properties.hasMore.type, "boolean");
  assert.equal(schema.properties.degradedReason.$ref, "../enum/spatial-query-reason.json");
  assert.equal(schema.required.includes("degradedReason"), false);
  assert.equal(schema.additionalProperties, false);
});

test("strategy and reason values stay ordered across JSON, TypeScript, and Java", async () => {
  const [strategySchema, reasonSchema, typescript, strategyJava, reasonJava] = await Promise.all([
    readJson("enum/spatial-query-strategy.json"),
    readJson("enum/spatial-query-reason.json"),
    readFile(typescriptPath, "utf8"),
    readFile(path.join(javaDir, "enum", "SpatialQueryStrategy.java"), "utf8"),
    readFile(path.join(javaDir, "enum", "SpatialQueryReason.java"), "utf8"),
  ]);

  assert.deepEqual(strategySchema.enum, strategyValues);
  assert.deepEqual(extractTypeScriptUnion(typescript, "SpatialQueryStrategy"), strategyValues);
  assert.deepEqual(extractJavaEnumValues(strategyJava), strategyValues);
  assert.match(strategyJava, /public String getValue\(\)/);

  assert.deepEqual(reasonSchema.enum, reasonValues);
  assert.deepEqual(extractTypeScriptUnion(typescript, "SpatialQueryReason"), reasonValues);
  assert.deepEqual(extractJavaEnumValues(reasonJava), reasonValues);
  assert.match(reasonJava, /public String getValue\(\)/);
});

test("TypeScript reference declares the spatial query data contract", async () => {
  const source = await readFile(typescriptPath, "utf8");

  assert.match(source, /export interface BoundingBox\s*\{[\s\S]*?readonly minX: number;[\s\S]*?readonly minY: number;[\s\S]*?readonly maxX: number;[\s\S]*?readonly maxY: number;[\s\S]*?\}/);
  assert.match(source, /export interface SpatialQueryOptions\s*\{[\s\S]*?readonly bounds: BoundingBox;[\s\S]*?readonly limit: number;[\s\S]*?readonly requiredIds\?: readonly number\[\];[\s\S]*?\}/);
  assert.match(source, /export interface SpatialQueryResult<TFeature extends Feature = Feature>\s*\{[\s\S]*?readonly features: readonly TFeature\[\];[\s\S]*?readonly queriedBounds: BoundingBox;[\s\S]*?readonly strategy: SpatialQueryStrategy;[\s\S]*?readonly hasMore: boolean;[\s\S]*?readonly degradedReason\?: SpatialQueryReason;[\s\S]*?\}/);
  assert.match(source, /export interface DatasetInfo\s*\{[\s\S]*?readonly extent\?: BoundingBox;[\s\S]*?\}/);
});

test("Java reference uses Feature wildcard lists and nullable degradation", async () => {
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
  assert.match(result, /@Nullable\s+SpatialQueryReason getDegradedReason\(\);/);
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
  assert.match(contract, /`strategy`.*`degradedReason`.*结果事实/);
  assert.match(contract, /前端.*不可.*猜/);
  assert.match(contract, /缓存预算.*15%.*预取.*并发.*防抖.*不属于格式契约/);
  assert.match(geometryModel, /几何交换 `bbox`.*tuple[\s\S]*查询 `BoundingBox`.*对象/);
  assert.match(errorTaxonomy, /SpatialQueryReason[\s\S]*不是异常分类/);
  assert.match(languageMapping, /reference-only[\s\S]*Go.*后续/);
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
