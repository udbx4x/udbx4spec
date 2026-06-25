# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-25

### Added

- Added GeoText binary layout specification in `docs/07-geotext-binary-layout.md`.
- Added the cross-language minimal stable public API surface in `docs/08-api-stable-surface.md`.
- Added `compliance/compliance.udbx` as the shared compliance database for SDK release gates.
- Added golden GAIA bytes manifest and fixtures for 2D/3D Point, MultiLineString, and MultiPolygon.
- Added golden GeoText bytes manifest and UTF-8 baseline fixture.
- Added three-language roundtrip fixtures for Java, TypeScript, and Go.
- Added source-derived stable T3 fixtures from `SampleData.udbx`, including CAD, GeoText, and 3D SRID metadata evidence.
- Added compliance fixture tools under `tools/` for generating and checking golden bytes, compliance database, roundtrip fixtures, and source-derived fixtures.

### Changed

- Aligned Java reference interfaces, TypeScript definitions, and JSON Schema with the stable API surface.
- Expanded geometry model documentation with GeoText, CAD baseline, SRID, Z, and bbox guidance.
- Clarified DatasetKind support boundaries and language mapping rules for Java, TypeScript, and Go.
- Updated compliance documentation to describe fixture tiers, manifests, roundtrip matrix, and release-gate usage.

### Release Gate

The `1.1.0` release requires the following local gate to pass:

```bash
node tools/generate-golden-gaia-bytes.mjs
node tools/generate-golden-text-bytes.mjs
node tools/generate-compliance-db.mjs
node tools/generate-roundtrip-fixtures.mjs
node tools/check-fixtures.mjs
```

## [1.0.0] - 2026-04-05

### Added

- Initial release of udbx4spec cross-language API specification
- **Documentation**
  - `docs/01-naming-conventions.md` - Class, method, and property naming conventions
  - `docs/02-geometry-model.md` - GeoJSON-like geometry data model
  - `docs/03-dataset-taxonomy.md` - DatasetKind classification and value mapping
  - `docs/04-field-taxonomy.md` - FieldType classification and value mapping
  - `docs/05-error-taxonomy.md` - Error/exception classification with 6 language examples
  - `docs/06-language-mapping.md` - Language-specific mapping examples (TS, Java, Python, C#, Go, Rust)
- **Reference Definitions**
  - `reference/typescript/udbx4spec.d.ts` - TypeScript type definitions
  - `reference/json-schema/` - JSON Schema definitions for all core types
  - `reference/java/` - Java pseudo-interface reference (42 files)
- **Compliance Testing**
  - `compliance/golden-gaia-bytes/` - Standard GAIA binary BLOBs structure
  - `compliance/java-compliance-checklist.md` - Java implementation checklist
  - `compliance/ts-compliance-checklist.md` - TypeScript implementation checklist

### Specification Highlights

- **DatasetKind** enum with 9 values: tabular, point, line, region, pointZ, lineZ, regionZ, text, cad
- **FieldType** enum with 14 values covering all SQLite storage types
- **Geometry Types**: Point, MultiLineString, MultiPolygon (2D and 3D variants)
- **Error Hierarchy**: UdbxError base class with 5 specialized error types
- **CRUD Operations**: Unified list(), getById(), insert(), insertMany(), update(), delete() API

[1.0.0]: https://github.com/udbx4x/udbx4spec/releases/tag/v1.0.0
[1.1.0]: https://github.com/udbx4x/udbx4spec/releases/tag/v1.1.0
