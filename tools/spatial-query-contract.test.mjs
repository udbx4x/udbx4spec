import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual, promisify } from "node:util";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const specDir = path.resolve(toolsDir, "..");
const schemaDir = path.join(specDir, "reference", "json-schema");
const javaDir = path.join(specDir, "reference", "java");
const typescriptPath = path.join(specDir, "reference", "typescript", "udbx4spec.d.ts");
const execFileAsync = promisify(execFile);
const schemaIdBase = "https://github.com/udbx4x/udbx4spec/schemas/";
const schemaRoots = [
  "spatial/bounding-box.json",
  "dataset/spatial-query-options.json",
  "dataset/spatial-query-result.json",
  "enum/spatial-query-strategy.json",
  "enum/spatial-query-reason.json",
];
const schemaAnnotations = new Set([
  "$schema",
  "$id",
  "$comment",
  "title",
  "description",
  "default",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
]);
const supportedSchemaKeywords = new Set([
  "$ref",
  "type",
  "required",
  "properties",
  "additionalProperties",
  "minimum",
  "uniqueItems",
  "items",
  "enum",
  "minItems",
  "maxItems",
]);

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

async function findTypeScriptCompiler() {
  if (process.env.TSC) {
    try {
      await access(process.env.TSC, fsConstants.X_OK);
      return process.env.TSC;
    } catch {
      throw new Error(`TSC is not executable: ${process.env.TSC}`);
    }
  }

  try {
    await execFileAsync("tsc", ["--version"]);
    return "tsc";
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const candidates = [
    path.resolve(specDir, "..", "udbx4ts", "node_modules", ".bin", "tsc"),
    path.resolve(specDir, "..", "..", "udbx4ts", "node_modules", ".bin", "tsc"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Continue to the next documented workspace layout.
    }
  }

  throw new Error("TypeScript compiler not found; set TSC=/absolute/path/to/tsc");
}

function collectSchemaRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaRefs(item, refs);
    }
  } else if (value && typeof value === "object") {
    if (typeof value.$ref === "string") {
      refs.push(value.$ref);
    }
    for (const nested of Object.values(value)) {
      collectSchemaRefs(nested, refs);
    }
  }
  return refs;
}

function schemaRelativePath(absolutePath) {
  const relativePath = path.relative(schemaDir, absolutePath);
  assert.ok(
    relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath),
    `schema ref must stay inside ${schemaDir}: ${absolutePath}`,
  );
  return relativePath.split(path.sep).join("/");
}

function resolveSchemaRef(sourcePath, reference) {
  const hashIndex = reference.indexOf("#");
  const fileReference = hashIndex === -1 ? reference : reference.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : reference.slice(hashIndex + 1);
  return {
    path: fileReference ? path.resolve(path.dirname(sourcePath), fileReference) : sourcePath,
    fragment,
  };
}

function resolveSchemaPointer(schema, fragment) {
  if (!fragment) {
    return schema;
  }
  assert.ok(fragment.startsWith("/"), `only JSON Pointer fragments are supported: #${fragment}`);
  return fragment
    .slice(1)
    .split("/")
    .map((token) => decodeURIComponent(token).replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, token) => {
      assert.ok(current && Object.hasOwn(current, token), `unresolved schema pointer: #${fragment}`);
      return current[token];
    }, schema);
}

async function loadSchemaGraph(rootPaths) {
  const graph = new Map();

  async function visit(absolutePath) {
    const normalizedPath = path.resolve(absolutePath);
    if (graph.has(normalizedPath)) {
      return;
    }
    const relativePath = schemaRelativePath(normalizedPath);
    const schema = JSON.parse(await readFile(normalizedPath, "utf8"));
    assert.equal(schema.$id, `${schemaIdBase}${relativePath}`, `$id must match ${relativePath}`);
    graph.set(normalizedPath, { path: normalizedPath, relativePath, schema });
    for (const reference of collectSchemaRefs(schema)) {
      await visit(resolveSchemaRef(normalizedPath, reference).path);
    }
  }

  for (const rootPath of rootPaths) {
    await visit(path.join(schemaDir, rootPath));
  }
  return graph;
}

function matchesSchemaType(instance, type) {
  switch (type) {
    case "array":
      return Array.isArray(instance);
    case "object":
      return instance !== null && typeof instance === "object" && !Array.isArray(instance);
    case "integer":
      return Number.isInteger(instance);
    case "number":
      return typeof instance === "number" && Number.isFinite(instance);
    case "string":
      return typeof instance === "string";
    case "boolean":
      return typeof instance === "boolean";
    case "null":
      return instance === null;
    default:
      throw new Error(`Unsupported schema type: ${type}`);
  }
}

function validateSchemaInstance(node, instance, graph, instancePath = "$") {
  const { schema } = node;
  const errors = [];
  const declaredTypes = schema.type === undefined
    ? undefined
    : Array.isArray(schema.type)
      ? schema.type
      : [schema.type];

  if (declaredTypes && !declaredTypes.some((type) => matchesSchemaType(instance, type))) {
    return [`${instancePath} must have type ${declaredTypes.join(" or ")}`];
  }

  for (const keyword of Object.keys(schema)) {
    if (!schemaAnnotations.has(keyword) && !supportedSchemaKeywords.has(keyword)) {
      throw new Error(`Unsupported schema keyword "${keyword}" affects ${instancePath}`);
    }
  }

  if (schema.$ref) {
    const reference = resolveSchemaRef(node.path, schema.$ref);
    const target = graph.get(reference.path);
    assert.ok(target, `schema graph must contain ${schema.$ref}`);
    errors.push(
      ...validateSchemaInstance(
        { ...target, schema: resolveSchemaPointer(target.schema, reference.fragment) },
        instance,
        graph,
        instancePath,
      ),
    );
  }

  if (schema.enum && !schema.enum.some((value) => isDeepStrictEqual(value, instance))) {
    errors.push(`${instancePath} must be one of ${schema.enum.join(", ")}`);
  }
  if (schema.minimum !== undefined && instance < schema.minimum) {
    errors.push(`${instancePath} must be >= ${schema.minimum}`);
  }

  if (Array.isArray(instance)) {
    if (schema.minItems !== undefined && instance.length < schema.minItems) {
      errors.push(`${instancePath} must contain at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && instance.length > schema.maxItems) {
      errors.push(`${instancePath} must contain at most ${schema.maxItems} items`);
    }
    if (schema.uniqueItems) {
      for (let left = 0; left < instance.length; left += 1) {
        for (let right = left + 1; right < instance.length; right += 1) {
          if (isDeepStrictEqual(instance[left], instance[right])) {
            errors.push(`${instancePath} items must be unique`);
          }
        }
      }
    }
    if (schema.items) {
      const itemNode = { path: node.path, relativePath: node.relativePath, schema: schema.items };
      instance.forEach((item, index) => {
        errors.push(...validateSchemaInstance(itemNode, item, graph, `${instancePath}[${index}]`));
      });
    }
  }

  if (instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
    for (const requiredProperty of schema.required ?? []) {
      if (!Object.hasOwn(instance, requiredProperty)) {
        errors.push(`${instancePath}.${requiredProperty} is required`);
      }
    }
    for (const [propertyName, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(instance, propertyName)) {
        const propertyNode = {
          path: node.path,
          relativePath: node.relativePath,
          schema: propertySchema,
        };
        errors.push(
          ...validateSchemaInstance(
            propertyNode,
            instance[propertyName],
            graph,
            `${instancePath}.${propertyName}`,
          ),
        );
      }
    }
    if (schema.additionalProperties === false) {
      const propertyNames = new Set(Object.keys(schema.properties ?? {}));
      for (const instanceProperty of Object.keys(instance)) {
        if (!propertyNames.has(instanceProperty)) {
          errors.push(`${instancePath}.${instanceProperty} is not allowed`);
        }
      }
    }
  }

  return errors;
}

function schemaNode(graph, relativePath) {
  const node = graph.get(path.join(schemaDir, relativePath));
  assert.ok(node, `schema graph must contain ${relativePath}`);
  return node;
}

function assertSchemaValid(graph, relativePath, instance) {
  assert.deepEqual(validateSchemaInstance(schemaNode(graph, relativePath), instance, graph), []);
}

function assertSchemaInvalid(graph, relativePath, instance, expectedError) {
  const errors = validateSchemaInstance(schemaNode(graph, relativePath), instance, graph);
  assert.ok(errors.some((error) => error.includes(expectedError)), errors.join("\n"));
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
  const tsc = await findTypeScriptCompiler();
  await execFileAsync(
    tsc,
    ["--noEmit", "--skipLibCheck", "--target", "ES2020", typescriptPath],
    { maxBuffer: 1024 * 1024 },
  );
});

test("new schema refs resolve recursively and IDs match their files", async () => {
  const graph = await loadSchemaGraph(schemaRoots);

  for (const root of schemaRoots) {
    assert.ok(graph.has(path.join(schemaDir, root)), `schema graph must contain root ${root}`);
  }
  assert.ok(graph.size > schemaRoots.length, "schema graph must recursively include referenced files");
});

test("spatial query schemas validate positive instances", async () => {
  const graph = await loadSchemaGraph(schemaRoots);
  const zeroAreaBounds = { minX: 4, minY: 7, maxX: 4, maxY: 7 };

  assertSchemaValid(graph, "spatial/bounding-box.json", zeroAreaBounds);
  assert.deepEqual(validateBoundingBoxRuntime(zeroAreaBounds), zeroAreaBounds);
  assertSchemaValid(graph, "dataset/spatial-query-options.json", {
    bounds: zeroAreaBounds,
    limit: 25,
    requiredIds: [1, 9],
  });
  assertSchemaValid(graph, "dataset/spatial-query-result.json", {
    features: [],
    queriedBounds: zeroAreaBounds,
    strategy: "envelope_cache",
    hasMore: false,
    degradedReason: "spatial_index_unavailable",
  });
});

test("spatial query schemas reject invalid options and results", async () => {
  const graph = await loadSchemaGraph(schemaRoots);
  const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-options.json",
    { bounds, limit: 0 },
    "must be >= 1",
  );
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-options.json",
    { bounds, limit: 1, requiredIds: [2, 2] },
    "items must be unique",
  );
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-options.json",
    { bounds, limit: 1, requiredIds: [0] },
    "must be >= 1",
  );
  assertSchemaInvalid(graph, "dataset/spatial-query-options.json", { limit: 1 }, "bounds is required");
  assertSchemaInvalid(graph, "dataset/spatial-query-options.json", { bounds }, "limit is required");
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-options.json",
    { bounds, limit: 1, offset: 0 },
    "offset is not allowed",
  );

  const result = { features: [], queriedBounds: bounds, strategy: "rtree", hasMore: false };
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-result.json",
    { ...result, strategy: "scan" },
    "must be one of",
  );
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-result.json",
    { ...result, degradedReason: "unknown" },
    "must be one of",
  );
  const { hasMore, ...missingHasMore } = result;
  assert.equal(hasMore, false);
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-result.json",
    missingHasMore,
    "hasMore is required",
  );
  assertSchemaInvalid(
    graph,
    "dataset/spatial-query-result.json",
    { ...result, total: 100 },
    "total is not allowed",
  );
  assertSchemaInvalid(
    graph,
    "spatial/bounding-box.json",
    { ...bounds, srid: 4326 },
    "srid is not allowed",
  );
});

test("limited schema validator fails on active unsupported keywords", () => {
  const node = {
    path: path.join(schemaDir, "unsupported-test.json"),
    relativePath: "unsupported-test.json",
    schema: { type: "string", pattern: "^viewport$" },
  };

  assert.throws(
    () => validateSchemaInstance(node, "viewport", new Map()),
    /Unsupported schema keyword "pattern" affects \$/,
  );
});

test("BoundingBox ordering and non-JSON numbers remain runtime concerns", async () => {
  const graph = await loadSchemaGraph(schemaRoots);
  const reversedBounds = { minX: 5, minY: 0, maxX: 4, maxY: 10 };

  assertSchemaValid(graph, "spatial/bounding-box.json", reversedBounds);
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
    readFile(path.join(javaDir, "enums", "SpatialQueryStrategy.java"), "utf8"),
    readFile(path.join(javaDir, "enums", "SpatialQueryReason.java"), "utf8"),
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
