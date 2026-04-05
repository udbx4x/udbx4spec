# udbx4spec — 字段类型分类（Field Taxonomy）

## 概述

UDBX 在 `SmFieldInfo` 系统表中使用 `SmFieldType` 整数字段标识用户字段类型。`udbx4spec` 定义了跨语言的 `FieldType` 分类，并给出每种类型对应的 SQLite 存储类型。

所有实现必须完整支持以下 14 种字段类型的读取、写入和元信息交换。

## FieldType 映射表

| 规范名 | SmFieldType 数值 | SQLite 类型 | 说明 |
|--------|-----------------|-------------|------|
| `boolean` | 1 | `INTEGER` | 布尔值（0/1） |
| `byte` | 2 | `INTEGER` | 单字节整数 |
| `int16` | 3 | `INTEGER` | 16 位有符号整数 |
| `int32` | 4 | `INTEGER` | 32 位有符号整数 |
| `int64` | 5 | `INTEGER` | 64 位有符号整数 |
| `single` | 6 | `REAL` | 单精度浮点数（IEEE 754 float） |
| `double` | 7 | `REAL` | 双精度浮点数（IEEE 754 double） |
| `date` | 8 | `TEXT` | 日期（格式由应用层约定） |
| `binary` | 9 | `BLOB` | 二进制数据 |
| `geometry` | 10 | `BLOB` | 几何 BLOB（非 SmGeometry 系统字段） |
| `char` | 11 | `TEXT` | 定长字符 |
| `ntext` | 127 | `TEXT` | Unicode 长文本 |
| `text` | 128 | `TEXT` | 长文本 |
| `time` | 16 | `TEXT` | 时间（格式由应用层约定） |

## 语言映射参考

### TypeScript

```typescript
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
```

- TypeScript 当前实现缺少 `byte`、`single`、`geometry`、`char`、`ntext`、`text`、`time`。
- 现有 `"float"` 应合并为 `"single"`（float 是 single 的通俗说法）。
- 现有 `"string"` 应明确对应到 `"text"` 或 `"ntext"`。

### Java

```java
public enum FieldType {
    BOOLEAN(1),
    BYTE(2),
    INT16(3),
    INT32(4),
    INT64(5),
    SINGLE(6),
    DOUBLE(7),
    DATE(8),
    BINARY(9),
    GEOMETRY(10),
    CHAR(11),
    NTEXT(127),
    TEXT(128),
    TIME(16);

    private final int value;
    FieldType(int value) { this.value = value; }
    public int getValue() { return value; }

    public static FieldType fromValue(int value) {
        for (FieldType t : values()) {
            if (t.value == value) return t;
        }
        throw new UdbxUnsupportedError("Unknown field type: " + value);
    }
}
```

- Java v2.0.0 中，`FieldType` enum 的命名应统一为大写下划线风格（当前部分命名如 `NText` 需改为 `NTEXT`）。

## FieldInfo 属性规范

```typescript
interface FieldInfo {
  readonly name: string;
  readonly fieldType: FieldType;
  readonly alias?: string;
  readonly required?: boolean;
  readonly nullable?: boolean;
  readonly defaultValue?: unknown;
}
```

### 属性说明

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `name` | `string` | 字段名称（对应 `SmFieldName`） |
| `fieldType` | `FieldType` | 字段类型 |
| `alias` | `string?` | 字段别名/标题（对应 `SmFieldCaption`） |
| `required` | `boolean?` | 是否必填（对应 `SmFieldbRequired`） |
| `nullable` | `boolean?` | 是否允许为 NULL（建议在 DDL 中使用） |
| `defaultValue` | `unknown?` | 默认值（对应 `SmFieldDefaultValue`） |

**兼容性说明**：
- Java 当前有 `alias`（`fieldAlias`）和 `required`，但无 `nullable` 和 `defaultValue`。
- TypeScript 当前有 `nullable` 和 `defaultValue`，但无 `alias` 和 `required`。
- 两者各补其缺即可达到规范一致。

## 建表时的 DDL 映射

创建用户字段时，各实现必须将 `FieldType` 映射为 SQLite 列类型：

```typescript
function sqliteColumnType(field: FieldInfo): string {
  switch (field.fieldType) {
    case "boolean":
    case "byte":
    case "int16":
    case "int32":
    case "int64":
      return "INTEGER";
    case "single":
    case "double":
      return "REAL";
    case "binary":
    case "geometry":
      return "BLOB";
    case "date":
    case "char":
    case "ntext":
    case "text":
    case "time":
    default:
      return "TEXT";
  }
}
```

- `nullability` 在建表 DDL 中的表达方式：`field.nullable === false ? "NOT NULL" : ""`。
