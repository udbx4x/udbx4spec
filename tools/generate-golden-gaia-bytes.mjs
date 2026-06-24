#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(specRoot, "..");
const outputRoot = resolve(specRoot, "compliance/golden-gaia-bytes");
const udbx4tsDist = resolve(workspaceRoot, "udbx4ts/dist/index.js");

const {
  GaiaPointCodec,
  GaiaLineCodec,
  GaiaPolygonCodec,
  GEO_TYPE_POINT,
  GEO_TYPE_POINTZ,
  GEO_TYPE_MULTILINESTRING,
  GEO_TYPE_MULTILINESTRINGZ,
  GEO_TYPE_MULTIPOLYGON,
  GEO_TYPE_MULTIPOLYGONZ
} = await import(pathToFileURL(udbx4tsDist).href).catch((error) => {
  throw new Error(
    `无法加载 udbx4ts 构建产物：${udbx4tsDist}\n请先执行：cd udbx4ts && npm run build\n${error.message}`
  );
});

const generator = {
  name: "udbx4spec/tools/generate-golden-gaia-bytes.mjs",
  implementation: "udbx4ts",
  implementationPath: "../udbx4ts/dist/index.js"
};
const manifestPath = resolve(outputRoot, "manifest.json");

const fixtures = [
  {
    id: "point-2d/simple",
    path: "point-2d/simple.bin",
    geometryType: "Point",
    geoType: GEO_TYPE_POINT,
    srid: 4326,
    hasZ: false,
    coordinates: [116.123, 39.456],
    encode: () =>
      GaiaPointCodec.writePoint(
        { type: "Point", coordinates: [116.123, 39.456] },
        4326
      )
  },
  {
    id: "point-3d/simple",
    path: "point-3d/simple.bin",
    geometryType: "Point",
    geoType: GEO_TYPE_POINTZ,
    srid: 4326,
    hasZ: true,
    coordinates: [116.123, 39.456, 12.5],
    encode: () =>
      GaiaPointCodec.writePointZ(
        { type: "Point", coordinates: [116.123, 39.456, 12.5] },
        4326
      )
  },
  {
    id: "multilinestring-2d/simple",
    path: "multilinestring-2d/simple.bin",
    geometryType: "MultiLineString",
    geoType: GEO_TYPE_MULTILINESTRING,
    srid: 4326,
    hasZ: false,
    coordinates: [
      [
        [116.123, 39.456],
        [117, 40]
      ]
    ],
    encode: () =>
      GaiaLineCodec.writeMultiLineString(
        {
          type: "MultiLineString",
          coordinates: [
            [
              [116.123, 39.456],
              [117, 40]
            ]
          ]
        },
        4326
      )
  },
  {
    id: "multilinestring-3d/simple",
    path: "multilinestring-3d/simple.bin",
    geometryType: "MultiLineString",
    geoType: GEO_TYPE_MULTILINESTRINGZ,
    srid: 4326,
    hasZ: true,
    coordinates: [
      [
        [116.123, 39.456, 12.5],
        [117, 40, 18.75]
      ]
    ],
    encode: () =>
      GaiaLineCodec.writeMultiLineStringZ(
        {
          type: "MultiLineString",
          coordinates: [
            [
              [116.123, 39.456, 12.5],
              [117, 40, 18.75]
            ]
          ]
        },
        4326
      )
  },
  {
    id: "multipolygon-2d/simple",
    path: "multipolygon-2d/simple.bin",
    geometryType: "MultiPolygon",
    geoType: GEO_TYPE_MULTIPOLYGON,
    srid: 4326,
    hasZ: false,
    coordinates: [
      [
        [
          [116.123, 39.456],
          [117, 39.456],
          [117, 40],
          [116.123, 40],
          [116.123, 39.456]
        ]
      ]
    ],
    encode: () =>
      GaiaPolygonCodec.writeMultiPolygon(
        {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [116.123, 39.456],
                [117, 39.456],
                [117, 40],
                [116.123, 40],
                [116.123, 39.456]
              ]
            ]
          ]
        },
        4326
      )
  },
  {
    id: "multipolygon-3d/simple",
    path: "multipolygon-3d/simple.bin",
    geometryType: "MultiPolygon",
    geoType: GEO_TYPE_MULTIPOLYGONZ,
    srid: 4326,
    hasZ: true,
    coordinates: [
      [
        [
          [116.123, 39.456, 12.5],
          [117, 39.456, 13],
          [117, 40, 14],
          [116.123, 40, 13.5],
          [116.123, 39.456, 12.5]
        ]
      ]
    ],
    encode: () =>
      GaiaPolygonCodec.writeMultiPolygonZ(
        {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [116.123, 39.456, 12.5],
                [117, 39.456, 13],
                [117, 40, 14],
                [116.123, 40, 13.5],
                [116.123, 39.456, 12.5]
              ]
            ]
          ]
        },
        4326
      )
  }
];

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

function bboxFromHeader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return [
    view.getFloat64(6, true),
    view.getFloat64(14, true),
    view.getFloat64(22, true),
    view.getFloat64(30, true)
  ];
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

const entries = [];

for (const fixture of fixtures) {
  const bytes = fixture.encode();
  const outputPath = resolve(outputRoot, fixture.path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);

  entries.push({
    id: fixture.id,
    path: fixture.path,
    tier: "T0",
    stability: "stable",
    usage: ["decode", "encode"],
    geometryType: fixture.geometryType,
    geoType: fixture.geoType,
    srid: fixture.srid,
    hasZ: fixture.hasZ,
    coordinates: fixture.coordinates,
    bbox: bboxFromHeader(bytes),
    byteSize: bytes.byteLength,
    sha256: sha256(bytes),
    gaiaHeader: {
      start: bytes[0],
      byteOrder: bytes[1],
      srid: readInt32LE(bytes, 2),
      mbrOffset: 6,
      mbrByteLength: 32,
      marker: bytes[38],
      geoType: readInt32LE(bytes, 39),
      geometryDataOffset: 43,
      end: bytes[bytes.length - 1]
    }
  });
}

const manifestContent = {
  schemaVersion: 1,
  status: "ready",
  generator,
  byteOrder: "little-endian",
  gaiaHeaderLayout:
    "0x00 | byteOrder(0x01) | srid(int32) | MBR(4*double) | 0x7c | geoType(int32) | coords... | 0xFE",
  fixtures: entries
};
const manifest = {
  schemaVersion: manifestContent.schemaVersion,
  generatedAt: await resolveGeneratedAt(manifestContent),
  status: manifestContent.status,
  generator: manifestContent.generator,
  byteOrder: manifestContent.byteOrder,
  gaiaHeaderLayout: manifestContent.gaiaHeaderLayout,
  fixtures: manifestContent.fixtures
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated ${entries.length} golden GAIA fixtures.`);
