#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specRoot = resolve(__dirname, "..");
const outputRoot = resolve(specRoot, "compliance/golden-text-bytes");
const manifestPath = resolve(outputRoot, "manifest.json");

const generator = {
  name: "udbx4spec/tools/generate-golden-text-bytes.mjs",
  implementation: "udbx4spec",
  implementationPath: "tools/generate-golden-text-bytes.mjs"
};

const fixtures = [
  {
    id: "geotext/simple-utf8",
    path: "geotext/simple-utf8.bin",
    geometryType: "Text",
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
    },
    source: {
      kind: "sample-derived",
      file: "data/henan.udbx",
      dataset: "河南省标签",
      smid: 1
    }
  }
];

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

function byteLengthOfString(value) {
  return Buffer.byteLength(value, "utf8");
}

function colorBytes(color) {
  return [color.a, color.b, color.g, color.r];
}

function encodeTextFixture(fixture) {
  const faceName = Buffer.from(fixture.style.faceName, "utf8");
  const text = Buffer.from(fixture.text, "utf8");
  const byteLength =
    4 + // geoType
    4 + // styleSize
    4 + // subCount
    4 + // color
    4 + // TextStyleBit
    4 + // bgColor
    8 + // fontWidth
    8 + // fontHeight
    16 + // TextStyle.pntAnchor
    4 + faceName.byteLength +
    16 + // GeoSubText.pntAnchor
    4 + // subAngle
    4 + // reserved
    4 + text.byteLength;

  const bytes = Buffer.alloc(byteLength);
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

const entries = [];

for (const fixture of fixtures) {
  const bytes = encodeTextFixture(fixture);
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
    styleSize: fixture.styleSize,
    subCount: fixture.subCount,
    text: fixture.text,
    anchor: fixture.anchor,
    rotation: fixture.rotation,
    style: {
      ...fixture.style,
      faceNameByteLength: byteLengthOfString(fixture.style.faceName)
    },
    subTexts: [
      {
        text: fixture.text,
        textByteLength: byteLengthOfString(fixture.text),
        anchor: fixture.anchor,
        rotation: fixture.rotation
      }
    ],
    byteSize: bytes.byteLength,
    sha256: sha256(bytes),
    layout: {
      geoHeaderOffset: 0,
      subCountOffset: 8,
      textStyleOffset: 12,
      firstSubTextOffset:
        12 + 4 + 4 + 4 + 8 + 8 + 16 + 4 + byteLengthOfString(fixture.style.faceName)
    },
    source: fixture.source
  });
}

const manifestContent = {
  schemaVersion: 1,
  status: "ready",
  generator,
  byteOrder: "little-endian",
  geotextLayout:
    "GeoHeader(geoType:int32, styleSize:int32) | subCount:int32 | TextStyle | GeoSubText[]",
  fixtures: entries
};

const manifest = {
  schemaVersion: manifestContent.schemaVersion,
  generatedAt: await resolveGeneratedAt(manifestContent),
  status: manifestContent.status,
  generator: manifestContent.generator,
  byteOrder: manifestContent.byteOrder,
  geotextLayout: manifestContent.geotextLayout,
  fixtures: manifestContent.fixtures
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated ${entries.length} golden GeoText fixtures.`);
