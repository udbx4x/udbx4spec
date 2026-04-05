# udbx4spec — 特定语言映射示例（Language Mapping）

本文档展示如何将 udbx4spec 规范映射到具体编程语言的惯用法。每种语言的映射遵循以下原则：

1. **保留规范语义**：类名、方法名、数据模型与规范一致
2. **接纳语言惯用法**：同步/异步、生命周期管理、类型系统表达方式随语言特性变化

---

## TypeScript

### 基本类型映射表

| udbx4spec 类型 | TypeScript 类型 |
|---------------|----------------|
| `int` / `number` | `number` |
| `string` / `String` | `string` |
| `boolean` | `boolean` |
| `Feature[]` | `Feature[]` 或 `ReadonlyArray<Feature>` |
| `Stream<T>` | `AsyncIterable<T>` |
| `Map<K,V>` | `Record<K,V>` 或 `Map<K,V>` |

### 接口 vs 类型别名

```typescript
// 推荐：使用 interface 定义类实现契约
export interface Dataset {
  readonly info: DatasetInfo;
  count(): Promise<number>;
}

// 推荐：使用 type alias 定义联合类型
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

// 推荐：使用 interface 定义对象形状
export interface PointGeometry {
  readonly type: "Point";
  readonly coordinates: [number, number] | [number, number, number];
  readonly srid?: number;
  readonly hasZ?: boolean;
  readonly bbox?: [number, number, number, number];
}
```

### 异步迭代器实现

```typescript
// VectorDataset 的 iterate() 返回 AsyncIterable
export interface VectorDataset<TFeature> extends Dataset {
  iterate(): AsyncIterable<TFeature>;
}

// 使用示例
async function processFeatures(dataset: VectorDataset<Feature>) {
  for await (const feature of dataset.iterate()) {
    console.log(feature.id, feature.geometry);
  }
}

// 或使用异步生成器
async function* filterFeatures(
  dataset: VectorDataset<Feature>,
  predicate: (f: Feature) => boolean
): AsyncIterable<Feature> {
  for await (const feature of dataset.iterate()) {
    if (predicate(feature)) {
      yield feature;
    }
  }
}
```

### 可选属性

```typescript
export interface FieldInfo {
  readonly name: string;
  readonly fieldType: FieldType;
  readonly alias?: string;        // 可选
  readonly required?: boolean;    // 可选
  readonly nullable?: boolean;    // 可选
  readonly defaultValue?: unknown; // 可选
}

// 使用 Partial<T> 构建更新对象
type FieldInfoUpdate = Partial<Omit<FieldInfo, 'name' | 'fieldType'>>;
```

### 错误处理

```typescript
// 错误基类
export class UdbxError extends Error {
  readonly code?: string;
  readonly cause?: Error;

  constructor(message: string, options?: { code?: string; cause?: Error }) {
    super(message);
    this.name = 'UdbxError';
    this.code = options?.code;
    this.cause = options?.cause;
  }
}

// 使用示例
try {
  await dataset.insert(feature);
} catch (error) {
  if (error instanceof UdbxConstraintError) {
    console.error('Constraint violated:', error.message);
  } else if (error instanceof UdbxNotFoundError) {
    console.error('Dataset not found:', error.message);
  } else {
    throw error;
  }
}
```

### Worker 架构

```typescript
// core/ 中定义接口（平台无关）
export interface DatasetClient<T> {
  list(options?: QueryOptions): Promise<T[]>;
  getById(id: number): Promise<T | null>;
  insert(feature: T): Promise<T>;
  // ...
}

// runtime-browser/ 中实现 RPC 代理
export class BrowserDatasetClient<T> implements DatasetClient<T> {
  constructor(private worker: Worker, private datasetId: string) {}

  async list(options?: QueryOptions): Promise<T[]> {
    return this.rpc('list', { datasetId: this.datasetId, options });
  }

  private async rpc(method: string, params: unknown): Promise<any> {
    // 通过 postMessage 与 Worker 通信
  }
}
```

---

## Java

### 基本类型映射表

| udbx4spec 类型 | Java 类型 |
|---------------|-----------|
| `int` / `number` | `int` / `Integer` |
| `string` / `String` | `String` |
| `boolean` | `boolean` / `Boolean` |
| `Feature[]` | `List<Feature>` |
| `Stream<T>` | `Stream<T>` (Java 8+) |
| `Map<K,V>` | `Map<K,V>` |

### 抽象类 vs 接口

```java
// 推荐：Dataset 定义为接口，允许灵活实现
public interface Dataset {
    DatasetInfo getInfo();
    int count();
}

// 推荐：VectorDataset 使用泛型参数
public interface VectorDataset<T extends Feature<?>> extends Dataset {
    List<T> list(QueryOptions options);
    Stream<T> stream();  // Java Stream API
}

// 内部实现可使用抽象类提供公共逻辑
public abstract class AbstractVectorDataset<T extends Feature<?>>
        implements VectorDataset<T> {
    protected final Connection connection;
    protected final DatasetInfo info;

    protected AbstractVectorDataset(Connection connection, DatasetInfo info) {
        this.connection = connection;
        this.info = info;
    }

    @Override
    public int count() {
        return info.getObjectCount();
    }
}
```

### Stream API 集成

```java
// VectorDataset.stream() 返回 Java Stream
public interface VectorDataset<T extends Feature<?>> extends Dataset {
    Stream<T> stream() throws UdbxError;
}

// 使用示例
try (PointDataset dataset = datasource.getDataset("cities")) {
    dataset.stream()
        .filter(f -> f.getAttribute("population") != null)
        .filter(f -> (Integer) f.getAttribute("population") > 1000000)
        .sorted(Comparator.comparing(f -> (Integer) f.getAttribute("population")).reversed())
        .limit(10)
        .forEach(f -> System.out.println(f.getAttribute("name")));
}

// 并行流（大数据集）
long largeCityCount = dataset.stream()
    .parallel()
    .filter(f -> {
        Integer pop = (Integer) f.getAttribute("population");
        return pop != null && pop > 1000000;
    })
    .count();
```

### 泛型使用模式

```java
// Feature 使用泛型参数表示几何类型
public interface Feature<T extends Geometry> {
    int getId();
    T getGeometry();
    Map<String, Object> getAttributes();
}

// 特化类型
public interface PointFeature extends Feature<PointGeometry> {}
public interface LineFeature extends Feature<MultiLineStringGeometry> {}
public interface RegionFeature extends Feature<MultiPolygonGeometry> {}

// VectorDataset 泛型参数表示 Feature 类型
public interface PointDataset extends VectorDataset<PointFeature> {}
public interface LineDataset extends VectorDataset<LineFeature> {}
```

### 异常处理

```java
// 所有异常继承运行时异常，便于使用
try {
    PointFeature feature = dataset.getById(42);
    if (feature != null) {
        dataset.update(feature.getId(), changes);
    }
} catch (UdbxNotFoundError e) {
    logger.warn("Feature not found: {}", e.getMessage());
} catch (UdbxConstraintError e) {
    logger.error("Constraint violation: {}", e.getMessage());
    throw new BusinessException("Invalid data", e);
} catch (UdbxError e) {
    logger.error("UDBX error [{}]: {}", e.getCode(), e.getMessage(), e.getCause());
    throw e;
}
```

### 资源管理

```java
// 实现 AutoCloseable 支持 try-with-resources
public interface UdbxDataSource extends AutoCloseable {
    // ...
}

// 使用示例
try (UdbxDataSource ds = UdbxDataSource.open("/path/to/data.udbx")) {
    PointDataset cities = ds.getDataset("cities");
    // ...
} // 自动关闭
```

---

## Python

### 基本类型映射表

| udbx4spec 类型 | Python 类型 |
|---------------|-------------|
| `int` / `number` | `int` / `float` |
| `string` / `String` | `str` |
| `boolean` | `bool` |
| `Feature[]` | `List[Feature]` |
| `Stream<T>` | `Iterator[T]` / `AsyncIterator[T]` |
| `Map<K,V>` | `Dict[K,V]` |

### Dataclass 模型

```python
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Union, Iterator

@dataclass(frozen=True)
class PointGeometry:
    """点几何对象"""
    coordinates: Union[tuple[float, float], tuple[float, float, float]]
    type: str = "Point"
    srid: Optional[int] = None
    hasZ: Optional[bool] = None
    bbox: Optional[tuple[float, float, float, float]] = None

@dataclass(frozen=True)
class Feature:
    """要素"""
    id: int
    geometry: PointGeometry  # 或其他几何类型
    attributes: Dict[str, Any]

    def get_attribute(self, name: str) -> Any:
        return self.attributes.get(name)

@dataclass
class DatasetInfo:
    """数据集元信息"""
    id: int
    name: str
    table_name: str
    kind: str  # DatasetKind
    object_count: int
    srid: Optional[int] = None
    geometry_type: Optional[int] = None
```

### Pydantic 模型（推荐用于验证）

```python
from pydantic import BaseModel, Field
from typing import Literal

class PointGeometry(BaseModel):
    """点几何模型"""
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float] | tuple[float, float, float]
    srid: int | None = None
    hasZ: bool | None = None
    bbox: tuple[float, float, float, float] | None = None

class Feature(BaseModel):
    """要素模型"""
    id: int = Field(..., ge=1)
    geometry: PointGeometry  # 或使用 Union 支持多种几何
    attributes: dict[str, Any]

# 自动验证
feature = Feature(
    id=1,
    geometry={"type": "Point", "coordinates": [116.4, 39.9]},
    attributes={"name": "北京"}
)
```

### 迭代器协议

```python
from typing import Iterator, Iterable

class VectorDataset:
    """矢量数据集"""

    def iter_features(self) -> Iterator[Feature]:
        """返回迭代器（惰性读取）"""
        # 实现...
        yield from self._fetch_batch()

    def __iter__(self) -> Iterator[Feature]:
        """使数据集可直接迭代"""
        return self.iter_features()

    def list(self, limit: int | None = None) -> List[Feature]:
        """返回列表（全部或分页）"""
        features = []
        for i, feature in enumerate(self):
            if limit is not None and i >= limit:
                break
            features.append(feature)
        return features

# 使用示例
dataset = VectorDataset(...)

# 惰性迭代
for feature in dataset:
    print(feature.id)

# 列表推导
large_cities = [
    f for f in dataset
    if f.attributes.get("population", 0) > 1000000
]
```

### 上下文管理器

```python
from contextlib import contextmanager
from typing import Generator

class UdbxDataSource:
    """数据源"""

    @classmethod
    @contextmanager
    def open(cls, path: str) -> Generator["UdbxDataSource", None, None]:
        """上下文管理器支持"""
        ds = cls._open(path)
        try:
            yield ds
        finally:
            ds.close()

# 使用示例
with UdbxDataSource.open("/path/to/data.udbx") as ds:
    dataset = ds.get_dataset("cities")
    # ...
```

### 异常处理

```python
class UdbxError(Exception):
    """UDBX 错误基类"""
    def __init__(self, message: str, code: str | None = None, cause: Exception | None = None):
        super().__init__(message)
        self.code = code or "UDBX_ERROR"
        self.__cause__ = cause

class UdbxNotFoundError(UdbxError):
    """未找到错误"""
    def __init__(self, message: str, cause: Exception | None = None):
        super().__init__(message, "NOT_FOUND", cause)

# 使用示例
try:
    feature = dataset.get_by_id(42)
except UdbxNotFoundError as e:
    print(f"Not found: {e.code}")
except UdbxError as e:
    print(f"UDBX error: {e.code} - {e}")
```

---

## C#

### 基本类型映射表

| udbx4spec 类型 | C# 类型 |
|---------------|---------|
| `int` / `number` | `int` / `double` |
| `string` / `String` | `string` |
| `boolean` | `bool` |
| `Feature[]` | `List<Feature>` 或 `IEnumerable<Feature>` |
| `Stream<T>` | `IEnumerable<T>` 或 `IAsyncEnumerable<T>` |
| `Map<K,V>` | `Dictionary<K,V>` |

### Interface 定义

```csharp
// 接口定义
public interface IDataset
{
    DatasetInfo Info { get; }
    int Count { get; }
}

public interface IVectorDataset<T> : IDataset where T : IFeature
{
    IEnumerable<T> List(QueryOptions? options = null);
    T? GetById(int id);
    IAsyncEnumerable<T> IterateAsync();  // C# 8.0+ async streams
    T Insert(T feature);
    int InsertMany(IEnumerable<T> features);
    T Update(int id, FeatureChanges changes);
    bool Delete(int id);
}

// 属性语法
public interface IFeature
{
    int Id { get; }
    IGeometry Geometry { get; }
    Dictionary<string, object> Attributes { get; }
    object? GetAttribute(string name);
}
```

### 属性语法

```csharp
public class DatasetInfo
{
    public int Id { get; init; }           // init-only (C# 9.0+)
    public string Name { get; init; } = "";
    public string TableName { get; init; } = "";
    public DatasetKind Kind { get; init; }
    public int ObjectCount { get; init; }
    public int? Srid { get; init; }
    public int? GeometryType { get; init; }
    public List<FieldInfo> Fields { get; init; } = new();
}

public record FieldInfo(    // record 类型 (C# 9.0+)
    string Name,
    FieldType FieldType,
    string? Alias = null,
    bool? Required = null,
    bool? Nullable = null,
    object? DefaultValue = null
);
```

### LINQ 集成

```csharp
// IAsyncEnumerable + LINQ (System.Linq.Async)
await foreach (var feature in dataset.IterateAsync()
    .Where(f => f.Attributes.GetValueOrDefault("population") is int pop && pop > 1000000)
    .OrderByDescending(f => f.Attributes.GetValueOrDefault("population"))
    .Take(10))
{
    Console.WriteLine(feature.Attributes["name"]);
}

// 同步 LINQ
var largeCities = dataset.List()
    .Where(f => f.Attributes.GetValueOrDefault("population") is int pop && pop > 1000000)
    .OrderByDescending(f => f.Attributes.GetValueOrDefault("population"))
    .ToList();
```

### 异步流

```csharp
// C# 8.0+ IAsyncEnumerable
public interface IVectorDataset<T>
{
    IAsyncEnumerable<T> IterateAsync(CancellationToken ct = default);
}

// 使用示例
await foreach (var feature in dataset.IterateAsync().WithCancellation(ct))
{
    await ProcessFeatureAsync(feature);
}
```

---

## Go

### 基本类型映射表

| udbx4spec 类型 | Go 类型 |
|---------------|---------|
| `int` / `number` | `int` / `int32` / `int64` / `float64` |
| `string` / `String` | `string` |
| `boolean` | `bool` |
| `Feature[]` | `[]Feature` |
| `Stream<T>` | channel (`<-chan T`) 或 callback |
| `Map<K,V>` | `map[K]V` |

### Interface 设计

```go
package udbx

// Geometry 接口
type Geometry interface {
    Type() string
    Srid() *int
    HasZ() bool
    Bbox() *[4]float64
}

// PointGeometry 接口
type PointGeometry interface {
    Geometry
    Coordinates() []float64
    X() float64
    Y() float64
    Z() float64
}

// Feature 接口
type Feature interface {
    Id() int
    Geometry() Geometry
    Attributes() map[string]interface{}
    GetAttribute(name string) (interface{}, bool)
}

// Dataset 接口
type Dataset interface {
    Info() DatasetInfo
    Count() int
}

// VectorDataset 接口
type VectorDataset interface {
    Dataset
    List(opts *QueryOptions) ([]Feature, error)
    GetById(id int) (Feature, error)
    Iterate() (<-chan Feature, error)  // channel-based streaming
    Insert(feature Feature) (Feature, error)
    InsertMany(features []Feature) (int, error)
    Update(id int, changes FeatureChanges) (Feature, error)
    Delete(id int) error
}
```

### 结构体标签

```go
type DatasetInfo struct {
    Id            int        `json:"id"`
    Name          string     `json:"name"`
    TableName     string     `json:"tableName"`
    Kind          DatasetKind `json:"kind"`
    Srid          *int       `json:"srid,omitempty"`
    ObjectCount   int        `json:"objectCount"`
    GeometryType  *int       `json:"geometryType,omitempty"`
}

type PointGeometry struct {
    Type        string     `json:"type"`
    Coordinates []float64  `json:"coordinates"`
    Srid        *int       `json:"srid,omitempty"`
    HasZ        *bool      `json:"hasZ,omitempty"`
    Bbox        *[4]float64 `json:"bbox,omitempty"`
}
```

### 错误处理模式

```go
package udbx

import "errors"

// 错误代码常量
const (
    ErrCodeFormat     = "FORMAT_ERROR"
    ErrCodeNotFound   = "NOT_FOUND"
    ErrCodeUnsupported = "UNSUPPORTED"
    ErrCodeConstraint = "CONSTRAINT_VIOLATION"
    ErrCodeIO         = "IO_ERROR"
)

// 错误类型
type Error struct {
    Msg   string
    Code  string
    Cause error
}

func (e *Error) Error() string {
    if e.Cause != nil {
        return e.Msg + ": " + e.Cause.Error()
    }
    return e.Msg
}

func (e *Error) Unwrap() error {
    return e.Cause
}

// 辅助函数
func IsNotFound(err error) bool {
    var e *Error
    if errors.As(err, &e) {
        return e.Code == ErrCodeNotFound
    }
    return false
}

// 构造错误
func NewFormatError(msg string, cause ...error) *Error {
    var c error
    if len(cause) > 0 {
        c = cause[0]
    }
    return &Error{Msg: msg, Code: ErrCodeFormat, Cause: c}
}

// 使用示例
dataset, err := ds.GetDataset("cities")
if err != nil {
    if IsNotFound(err) {
        log.Printf("Dataset not found: %v", err)
        return nil
    }
    return err
}
```

---

## Rust

### 基本类型映射表

| udbx4spec 类型 | Rust 类型 |
|---------------|-----------|
| `int` / `number` | `i32` / `i64` / `f64` |
| `string` / `String` | `String` |
| `boolean` | `bool` |
| `Feature[]` | `Vec<Feature>` |
| `Stream<T>` | `impl Iterator<Item=T>` 或 `Stream<Item=T>` |
| `Map<K,V>` | `HashMap<K,V>` |

### Trait 定义

```rust
use std::collections::HashMap;

// Geometry trait
pub trait Geometry {
    fn geometry_type(&self) -> &str;
    fn srid(&self) -> Option<i32>;
    fn has_z(&self) -> bool;
    fn bbox(&self) -> Option<[f64; 4]>;
}

// Feature trait
pub trait Feature<G: Geometry> {
    fn id(&self) -> i32;
    fn geometry(&self) -> &G;
    fn attributes(&self) -> &HashMap<String, Box<dyn std::any::Any>>;
}

// Dataset trait
pub trait Dataset {
    fn info(&self) -> &DatasetInfo;
    fn count(&self) -> usize;
}

// VectorDataset trait
pub trait VectorDataset<F: Feature<dyn Geometry>>: Dataset {
    fn list(&self, options: Option<&QueryOptions>) -> Result<Vec<F>, UdbxError>;
    fn get_by_id(&self, id: i32) -> Result<Option<F>, UdbxError>;
    fn iter(&self) -> Box<dyn Iterator<Item = Result<F, UdbxError>> + '_>;
    fn insert(&mut self, feature: F) -> Result<F, UdbxError>;
    fn insert_many(&mut self, features: Vec<F>) -> Result<usize, UdbxError>;
    fn update(&mut self, id: i32, changes: FeatureChanges) -> Result<F, UdbxError>;
    fn delete(&mut self, id: i32) -> Result<bool, UdbxError>;
}
```

### 生命周期标注

```rust
// 带有生命周期标注的特征
pub trait Feature<'a, G: Geometry> {
    fn id(&self) -> i32;
    fn geometry(&self) -> &'a G;
    fn attributes(&self) -> &'a HashMap<String, Box<dyn std::any::Any>>;
}

// 实现示例
pub struct PointFeature<'a> {
    id: i32,
    geometry: &'a PointGeometry,
    attributes: HashMap<String, Box<dyn std::any::Any>>,
}

impl<'a> Feature<'a, PointGeometry> for PointFeature<'a> {
    fn id(&self) -> i32 { self.id }
    fn geometry(&self) -> &'a PointGeometry { self.geometry }
    fn attributes(&self) -> &'a HashMap<String, Box<dyn std::any::Any>> { &self.attributes }
}
```

### 所有权模型适配

```rust
use std::sync::Arc;

// 使用 Arc 共享只读数据
pub struct SharedDataset {
    info: Arc<DatasetInfo>,
    connection: Arc<Mutex<Connection>>,
}

// 使用 Rc 单线程共享
use std::rc::Rc;

pub struct LocalDataset {
    info: Rc<DatasetInfo>,
}

// Feature 所有权转移
pub fn insert(mut self, feature: Feature) -> Result<Feature, UdbxError> {
    // 转移所有权，返回新的 Feature（可能含新 ID）
}

// 借用
pub fn get_by_id(&self, id: i32) -> Result<Option<Feature>, UdbxError> {
    // 不可变借用
}
```

### 错误处理

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum UdbxError {
    #[error("Format error: {0}")]
    FormatError(String),

    #[error("Not found: {0}")]
    NotFoundError(String),

    #[error("Unsupported: {0}")]
    UnsupportedError(String),

    #[error("Constraint violation: {0}")]
    ConstraintError(String),

    #[error("IO error: {0}")]
    IOError(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, UdbxError>;

// 使用示例
pub fn open(path: &str) -> Result<UdbxDataSource> {
    let file = std::fs::File::open(path)?;  // ? 自动转换 io::Error
    // ...
    Ok(UdbxDataSource { file })
}
```

---

## 总结

| 特性 | TypeScript | Java | Python | C# | Go | Rust |
|-----|------------|------|--------|-----|-----|------|
| **类型定义** | interface | interface | dataclass / BaseModel | interface / record | interface + struct | trait |
| **可选属性** | `?` 或 `undefined` | `@Nullable` / Optional | `Optional[T]` / `T \| None` | `T?` | `*T` | `Option<T>` |
| **流式读取** | `AsyncIterable` | `Stream<T>` | `Iterator` / `AsyncIterator` | `IAsyncEnumerable` | channel | `Iterator` / `Stream` |
| **泛型** | 支持 | 支持 | 支持 (3.5+) | 支持 | 不支持 | 支持 |
| **错误处理** | throw/catch | throw/catch | raise/except | throw/catch | return error | Result<T,E> |
| **资源管理** | try-finally / async dispose | try-with-resources | contextmanager | using | defer | Drop trait |

---

## 相关文档

- [`01-naming-conventions.md`](./01-naming-conventions.md) — 类名、方法名规范
- [`02-geometry-model.md`](./02-geometry-model.md) — 几何数据模型
- [`reference/typescript/udbx4spec.d.ts`](../reference/typescript/udbx4spec.d.ts) — TypeScript 参考定义
- [`reference/java/`](../reference/java/) — Java 伪接口参考
