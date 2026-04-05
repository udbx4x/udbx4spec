# UDBX Java 伪接口参考

本目录包含 UDBX 规范的 Java 伪接口（pseudo-interface）参考实现，为 Java 开发者提供规范映射指导。

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
├── enum/                            # 枚举类型
│   ├── package-info.java
│   ├── DatasetKind.java
│   └── FieldType.java
├── meta/                            # 元信息类型
│   ├── package-info.java
│   ├── DatasetInfo.java
│   ├── FieldInfo.java
│   └── QueryOptions.java
├── feature/                         # Feature 类型
│   ├── package-info.java
│   ├── Geometry.java               # 基类
│   ├── PointGeometry.java
│   ├── MultiLineStringGeometry.java
│   ├── MultiPolygonGeometry.java
│   ├── Feature.java                # 泛型 Feature
│   ├── PointFeature.java           # Feature<PointGeometry> 特化
│   ├── LineFeature.java            # Feature<MultiLineStringGeometry> 特化
│   ├── RegionFeature.java          # Feature<MultiPolygonGeometry> 特化
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
│   ├── TabularDataset.java
│   └── CadDataset.java
└── codec/                           # 编解码器
    ├── package-info.java
    ├── GaiaGeometryCodec.java
    ├── GaiaPointCodec.java
    ├── GaiaLineCodec.java
    └── GaiaPolygonCodec.java
```

## 使用说明

### 这不是可运行的代码

这些 `.java` 文件是**伪接口**，用于展示 udbx4spec 在 Java 中的规范映射。它们：

- 展示正确的类名、方法名和属性名
- 展示泛型使用模式
- 展示 Javadoc 注释风格
- **不包含实际实现**（方法体抛出 `UnsupportedOperationException`）

### 实际实现参考

真正的 Java 实现请参考 [udbx4j](https://github.com/udbx4x/udbx4j) 项目。

## 关键设计决策

### 1. 接口 vs 抽象类

- **Dataset、Feature、Geometry**：定义为 `interface`，允许灵活实现
- **异常类型**：继承 `RuntimeException`，便于使用

### 2. 泛型设计

```java
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
| `getById(id)` | `@Nullable T getById(int id)` |
| `stream()` | `Stream<T> stream()` |
| `insert(feature)` | `T insert(T feature)` |
| `insertMany(features)` | `int insertMany(List<T> features)` |
| `update(id, changes)` | `T update(int id, FeatureChanges changes)` |
| `delete(id)` | `boolean delete(int id)` |
| `count()` | `int count()` (default 方法) |
| `id` | `int getId()` |
| `geometry` | `TGeometry getGeometry()` |
| `attributes` | `Map<String, Object> getAttributes()` |

## 相关文档

- `docs/01-naming-conventions.md` — 命名规范
- `docs/02-geometry-model.md` — 几何数据模型
- `docs/03-dataset-taxonomy.md` — DatasetKind 分类
- `docs/04-field-taxonomy.md` — FieldType 分类
- `docs/05-error-taxonomy.md` — 错误分类
- `reference/typescript/udbx4spec.d.ts` — TypeScript 参考定义
