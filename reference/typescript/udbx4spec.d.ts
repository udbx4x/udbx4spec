/// <reference lib="es2015.iterable" />
/// <reference lib="es2018.asynciterable" />

/**
 * udbx4spec — Cross-Language UDBX Reader/Writer API Specification
 * TypeScript Reference Definitions (Authoritative)
 *
 * This file serves as the machine-readable reference for the udbx4spec
 * naming conventions, data models, and type taxonomy.
 */

// ============================================================================
// 1. Geometry Model — GeoJSON-like lingua franca
// ============================================================================

export interface GeometryBase {
  /** Coordinate Reference System Identifier */
  readonly srid?: number;
  /** Bounding Box [minX, minY, maxX, maxY] */
  readonly bbox?: readonly [number, number, number, number];
  /** Whether the geometry carries Z coordinates */
  readonly hasZ?: boolean;
  /** GAIA geoType integer (e.g. 1, 5, 6, 1001) */
  readonly geoType?: number;
}

export interface PointGeometry extends GeometryBase {
  readonly type: "Point";
  readonly coordinates: readonly [number, number] | readonly [number, number, number];
}

export interface MultiLineStringGeometry extends GeometryBase {
  readonly type: "MultiLineString";
  readonly coordinates: ReadonlyArray<
    ReadonlyArray<readonly [number, number] | readonly [number, number, number]>
  >;
}

export interface MultiPolygonGeometry extends GeometryBase {
  readonly type: "MultiPolygon";
  readonly coordinates: ReadonlyArray<
    ReadonlyArray<
      ReadonlyArray<readonly [number, number] | readonly [number, number, number]>
    >
  >;
}

export interface Color {
  readonly a: number;
  readonly b: number;
  readonly g: number;
  readonly r: number;
}

export interface TextStyle {
  readonly color?: Color;
  readonly backgroundColor?: Color;
  readonly fontWidth?: number;
  readonly fontHeight?: number;
  readonly anchor?: readonly [number, number];
  readonly faceName?: string;
  readonly fixedSize?: number;
  readonly weight?: number;
  readonly styleFlag?: number;
  readonly alignFlag?: number;
}

export interface TextSubText {
  readonly text: string;
  readonly anchor: readonly [number, number];
  readonly rotation?: number;
}

export interface TextGeometry extends GeometryBase {
  readonly type: "Text";
  readonly text: string;
  readonly anchor: readonly [number, number];
  readonly rotation?: number;
  readonly style?: TextStyle;
  readonly subTexts?: readonly TextSubText[];
}

export type Geometry =
  | PointGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry
  | TextGeometry;

// ============================================================================
// 2. Feature & Record
// ============================================================================

export interface Feature<
  TGeometry extends Geometry = Geometry,
  TAttributes extends Record<string, unknown> = Record<string, unknown>
> {
  /** Feature ID (maps to SmID in the UDBX binary spec) */
  readonly id: number;
  readonly geometry: TGeometry;
  readonly attributes: TAttributes;
}

export interface TabularRecord<
  TAttributes extends Record<string, unknown> = Record<string, unknown>
> {
  readonly id: number;
  readonly attributes: TAttributes;
}

export type PointFeature<TAttributes extends Record<string, unknown> = Record<string, unknown>> =
  Feature<PointGeometry, TAttributes>;

export type LineFeature<TAttributes extends Record<string, unknown> = Record<string, unknown>> =
  Feature<MultiLineStringGeometry, TAttributes>;

export type RegionFeature<TAttributes extends Record<string, unknown> = Record<string, unknown>> =
  Feature<MultiPolygonGeometry, TAttributes>;

export type TextFeature<TAttributes extends Record<string, unknown> = Record<string, unknown>> =
  Feature<TextGeometry, TAttributes>;

// ============================================================================
// 3. Metadata & Query Options
// ============================================================================

export type DatasetKind =
  | "tabular"
  | "point"
  | "line"
  | "region"
  | "pointZ"
  | "lineZ"
  | "regionZ"
  | "text"
  | "cad";

export type FieldType =
  | "boolean"
  | "byte"
  | "int16"
  | "int32"
  | "int64"
  | "single"
  | "double"
  | "date"
  | "binary"
  | "geometry"
  | "char"
  | "ntext"
  | "text"
  | "time";

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export type SpatialQueryStrategy =
  | "rtree"
  | "envelope_cache";

export type SpatialQueryReason =
  | "invalid_viewport"
  | "spatial_index_unavailable"
  | "envelope_cache_budget_exceeded"
  | "query_timeout"
  | "corrupt_geometry"
  | "unsupported_dataset_kind";

export interface DatasetInfo {
  readonly id: number;
  readonly name: string;
  readonly tableName: string;
  readonly kind: DatasetKind;
  readonly srid: number | null;
  readonly objectCount: number;
  readonly geometryType: number | null;
  readonly extent?: BoundingBox;
}

export interface FieldInfo {
  readonly name: string;
  readonly fieldType: FieldType;
  readonly alias?: string;
  readonly required?: boolean;
  readonly nullable?: boolean;
  readonly defaultValue?: unknown;
}

export interface QueryOptions {
  readonly ids?: readonly number[];
  readonly limit?: number;
  readonly offset?: number;
}

export interface SpatialQueryOptions {
  readonly bounds: BoundingBox;
  readonly limit: number;
  readonly requiredIds?: readonly number[];
}

export interface SpatialQueryResult<TFeature extends Feature = Feature> {
  readonly features: readonly TFeature[];
  readonly queriedBounds: BoundingBox;
  readonly strategy: SpatialQueryStrategy;
  readonly hasMore: boolean;
}

// ============================================================================
// 4. Error Taxonomy
// ============================================================================

export declare class UdbxError extends Error {}

export declare class UdbxFormatError extends UdbxError {}

export declare class UdbxNotFoundError extends UdbxError {
  constructor(what: string, id?: number);
}

export declare class UdbxUnsupportedError extends UdbxError {
  constructor(what: string);
}

export declare class UdbxConstraintError extends UdbxError {
  constructor(what: string);
}

export declare class UdbxIOError extends UdbxError {
  constructor(cause?: Error);
}

// ============================================================================
// 5. Dataset Abstractions
// ============================================================================

export interface DatasetInfoProvider {
  readonly info: DatasetInfo;
  getFields(): Promise<readonly FieldInfo[]>;
}

/** Common base for all dataset interfaces */
export interface Dataset<TFeature extends Feature = Feature>
  extends DatasetInfoProvider {}

/** Read-only dataset contract */
export interface ReadableDataset<TFeature extends Feature = Feature>
  extends Dataset<TFeature> {
  getById(id: number): Promise<TFeature>;
  list(options?: QueryOptions): Promise<readonly TFeature[]>;
  iterate(options?: QueryOptions): AsyncIterable<TFeature>;
  count(): Promise<number>;
}

/** Writable dataset contract */
export interface WritableDataset<TFeature extends Feature = Feature>
  extends ReadableDataset<TFeature> {
  insert(feature: TFeature): Promise<void>;
  insertMany(
    features: Iterable<TFeature> | AsyncIterable<TFeature>
  ): Promise<void>;
  update(
    id: number,
    changes: { geometry?: TFeature["geometry"]; attributes?: Partial<TFeature["attributes"]> }
  ): Promise<void>;
  delete(id: number): Promise<void>;
}

/** Tabular dataset has a slightly different shape because it carries no geometry */
export interface TabularDatasetReadable {
  readonly info: DatasetInfo;
  getFields(): Promise<readonly FieldInfo[]>;
  getById(id: number): Promise<TabularRecord>;
  list(options?: QueryOptions): Promise<readonly TabularRecord[]>;
  iterate(options?: QueryOptions): AsyncIterable<TabularRecord>;
  count(): Promise<number>;
}

export interface TabularDatasetWritable extends TabularDatasetReadable {
  insert(record: TabularRecord): Promise<void>;
  insertMany(
    records: Iterable<TabularRecord> | AsyncIterable<TabularRecord>
  ): Promise<void>;
  update(id: number, attributes: Record<string, unknown>): Promise<void>;
  delete(id: number): Promise<void>;
}

// ============================================================================
// 6. Entry Point — UdbxDataSource
// ============================================================================

/**
 * The precise constructor and static factory signatures are allowed to vary
 * by language/runtime. This interface documents the conceptual contract.
 */
export interface UdbxDataSourceContract {
  listDatasets(): Promise<readonly DatasetInfo[]>;
  getDataset(name: string): Promise<Dataset>;
  createPointDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createLineDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createRegionDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createPointZDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createLineZDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createRegionZDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createTabularDataset(
    name: string,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createTextDataset(
    name: string,
    srid: number,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  createCadDataset(
    name: string,
    fields?: readonly FieldInfo[]
  ): Promise<Dataset>;
  close(): Promise<void>;
}

// ============================================================================
// 7. Geometry Codecs
// ============================================================================

export interface GaiaGeometryCodecContract {
  decode(input: Uint8Array): Geometry;
  encode(geometry: Geometry, srid: number): Uint8Array;
}

export interface GeoTextCodecContract {
  decode(input: Uint8Array): TextGeometry;
  encode(geometry: TextGeometry): Uint8Array;
}

export interface GaiaPointCodecContract {
  readPoint(input: Uint8Array): PointGeometry;
  readPointZ(input: Uint8Array): PointGeometry;
  writePoint(geometry: PointGeometry, srid: number): Uint8Array;
  writePointZ(geometry: PointGeometry, srid: number): Uint8Array;
}

export interface GaiaLineCodecContract {
  readMultiLineString(input: Uint8Array): MultiLineStringGeometry;
  readMultiLineStringZ(input: Uint8Array): MultiLineStringGeometry;
  writeMultiLineString(
    geometry: MultiLineStringGeometry,
    srid: number
  ): Uint8Array;
  writeMultiLineStringZ(
    geometry: MultiLineStringGeometry,
    srid: number
  ): Uint8Array;
}

export interface GaiaPolygonCodecContract {
  readMultiPolygon(input: Uint8Array): MultiPolygonGeometry;
  readMultiPolygonZ(input: Uint8Array): MultiPolygonGeometry;
  writeMultiPolygon(
    geometry: MultiPolygonGeometry,
    srid: number
  ): Uint8Array;
  writeMultiPolygonZ(
    geometry: MultiPolygonGeometry,
    srid: number
  ): Uint8Array;
}
