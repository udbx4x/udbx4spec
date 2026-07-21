# UDBX Java 参考契约

本目录包含 UDBX 规范的可编译 Java 参考契约，为 Java 开发者提供规范映射指导。

## 目录结构

```
reference/java/
├── README.md
├── UdbxDataSource.java              # 入口类
├── exception/                       # 异常类型
│   ├── package-info.java
│   ├── UdbxError.java              # 基类
│   ├── UdbxFormatError.java
│   ├── UdbxNotFoundError.java
│   ├── UdbxUnsupportedError.java
│   ├── UdbxConstraintError.java
│   └── UdbxIOError.java
├── enums/                           # 枚举类型（com.supermap.udbx.enums）
│   ├── package-info.java
│   ├── DatasetKind.java
│   ├── FieldType.java
│   ├── SpatialQueryStrategy.java
│   └── SpatialQueryReason.java
├── meta/                            # 元信息类型
│   ├── package-info.java
│   ├── BoundingBox.java
│   ├── DatasetInfo.java
│   ├── FieldInfo.java
│   ├── QueryOptions.java
│   ├── SpatialQueryOptions.java
│   └── SpatialQueryResult.java
├── feature/                         # Feature 类型
│   ├── package-info.java
│   ├── Geometry.java               # 基类
│   ├── PointGeometry.java
│   ├── MultiLineStringGeometry.java
│   ├── MultiPolygonGeometry.java
│   ├── TextGeometry.java
│   ├── TextStyle.java
│   ├── TextSubText.java
│   ├── Color.java
│   ├── Feature.java                # 泛型 Feature
│   ├── PointFeature.java           # Feature<PointGeometry> 特化
│   ├── LineFeature.java            # Feature<MultiLineStringGeometry> 特化
│   ├── RegionFeature.java          # Feature<MultiPolygonGeometry> 特化
│   ├── TextFeature.java            # Feature<TextGeometry> 特化
│   └── TabularRecord.java          # 无几何记录
├── dataset/                         # 数据集类型
│   ├── package-info.java
│   ├── Dataset.java                # 基类
│   ├── VectorDataset.java          # 带几何数据集基类
│   ├── PointDataset.java
│   ├── LineDataset.java
│   ├── RegionDataset.java
│   ├── PointZDataset.java
│   ├── LineZDataset.java
│   ├── RegionZDataset.java
│   ├── TextDataset.java
│   ├── TabularDataset.java
│   └── CadDataset.java
└── codec/                           # 编解码器
    ├── package-info.java
    ├── GaiaGeometryCodec.java
    ├── GaiaPointCodec.java
    ├── GaiaLineCodec.java
    ├── GaiaPolygonCodec.java
    └── GeoTextCodec.java
```

## 使用说明

### 这是可编译的参考契约

这些 `.java` 文件用于展示 udbx4spec 在 Java 中的规范映射。它们：

- 必须能由 Java 11 编译器整体编译
- 展示正确的类名、方法名和属性名
- 展示泛型使用模式
- 展示 Javadoc 注释风格
- **不包含 SDK 运行时实现**（静态工厂方法仅声明参考行为）

### 实际实现参考

真正的 Java 实现请参考 [udbx4j](https://github.com/udbx4x/udbx4j) 项目。

## 关键设计决策

### 1. 接口 vs 抽象类

- **Dataset、Feature、Geometry**：定义为 `interface`，允许灵活实现
- **异常类型**：继承 `RuntimeException`，便于使用

### 2. 泛型设计

```java
import com.supermap.udbx.enums.DatasetKind;
import com.supermap.udbx.enums.FieldType;

// Feature 使用泛型参数表示几何类型
public interface Feature<TGeometry extends Geometry> { ... }

// VectorDataset 使用泛型参数表示 Feature 类型
public interface VectorDataset<TFeature extends Feature<?>> { ... }
```

### 3. 可选属性

使用 `@Nullable` 注解标记可选属性：

```java
@Nullable
String getAlias();
```

### 4. 流式读取

Java 实现使用 `Stream<T>`：

```java
Stream<PointFeature> stream() throws UdbxError;
```

## 命名规范

遵循 udbx4spec 命名规范：

| 规范名 | Java 实现 |
|--------|-----------|
| `list()` | `List<T> list(@Nullable QueryOptions options)` |
| `getById(id)` | `T getById(int id)`；不存在时抛出 `UdbxNotFoundError` |
| `stream()` | `Stream<T> stream()` |
| `insert(feature)` | `T insert(T feature)` |
| `insertMany(features)` | `int insertMany(List<T> features)` |
| `update(id, changes)` | `T update(int id, FeatureChanges changes)` |
| `delete(id)` | `boolean delete(int id)` |
| `count()` | `int count()`；读取物理表真实行数 |
| `querySpatial(datasetName, options)` | `SpatialQueryResult querySpatial(String datasetName, SpatialQueryOptions options)`；定义在 `UdbxDataSource` |
| `id` | `int getId()` |
| `geometry` | `TGeometry getGeometry()` |
| `attributes` | `Map<String, Object> getAttributes()` |

### 5. 稳定面约束

Java 参考契约必须与 `docs/08-api-stable-surface.md` 保持一致：

- `getById(id)` 找不到对象时抛出 `UdbxNotFoundError`，不得返回 `null`。
- `list(options)` 默认按 `SmID` 升序返回；`ids` 过滤不改变排序语义。
- `count()` 读取物理表真实行数，不以 `DatasetInfo.getObjectCount()` 或 `SmRegister.SmObjectCount` 缓存为准。
- `UdbxDataSource.querySpatial(datasetName, options)` 是视口空间查询入口，成功结果只允许 `rtree` 或 `envelope_cache`。
- `update(id, ...)` 和 `delete(id)` 的目标对象不存在时抛出 `UdbxNotFoundError`。

## 相关文档

- `docs/01-naming-conventions.md` — 命名规范
- `docs/02-geometry-model.md` — 几何数据模型
- `docs/03-dataset-taxonomy.md` — DatasetKind 分类
- `docs/04-field-taxonomy.md` — FieldType 分类
- `docs/05-error-taxonomy.md` — 错误分类
- `reference/typescript/udbx4spec.d.ts` — TypeScript 参考定义
