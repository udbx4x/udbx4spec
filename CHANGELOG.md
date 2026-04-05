# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
