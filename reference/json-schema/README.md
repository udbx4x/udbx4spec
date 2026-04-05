# UDBX JSON Schema Reference

本目录包含 UDBX 规范的机器可读 JSON Schema 定义，使用 JSON Schema Draft 2020-12 标准。

## 目录结构

```
reference/json-schema/
├── index.json              # 统一入口，包含所有 schema 引用
├── README.md               # 本文件
├── geometry/               # 几何类型 schema
│   ├── point.json
│   ├── multi-line-string.json
│   ├── multi-polygon.json
│   └── geometry.json       # 所有几何类型的联合
├── feature/                # Feature 类型 schema
│   ├── feature.json
│   ├── point-feature.json
│   ├── line-feature.json
│   ├── region-feature.json
│   └── tabular-record.json
├── dataset/                # 数据集元信息 schema
│   ├── dataset-info.json
│   ├── field-info.json
│   └── query-options.json
└── enum/                   # 枚举类型 schema
    ├── dataset-kind.json
    └── field-type.json
```

## 使用方式

### 直接引用

在 JSON Schema 中通过 `$ref` 引用：

```json
{
  "$ref": "https://github.com/udbx4x/udbx4spec/schemas/geometry/point.json"
}
```

或使用相对路径：

```json
{
  "$ref": "./geometry/point.json"
}
```

### 验证示例

使用 Ajv (JavaScript) 验证：

```javascript
import Ajv from 'ajv';
import pointSchema from './geometry/point.json' assert { type: 'json' };

const ajv = new Ajv();
const validate = ajv.compile(pointSchema);

const valid = validate({
  type: "Point",
  coordinates: [116.4074, 39.9042],
  srid: 4326
});

if (!valid) {
  console.log(validate.errors);
}
```

使用 jsonschema (Python) 验证：

```python
import json
from jsonschema import validate, ValidationError

with open('geometry/point.json') as f:
    schema = json.load(f)

try:
    validate(
        instance={"type": "Point", "coordinates": [116.4074, 39.9042]},
        schema=schema
    )
    print("Valid!")
except ValidationError as e:
    print(f"Invalid: {e.message}")
```

## Schema 版本

- **标准**: JSON Schema Draft 2020-12
- **$schema**: `https://json-schema.org/draft/2020-12/schema`

## 规范文档

这些 schema 对应以下规范文档：

- `geometry/*.json` → `docs/02-geometry-model.md`
- `enum/dataset-kind.json` → `docs/03-dataset-taxonomy.md`
- `enum/field-type.json` → `docs/04-field-taxonomy.md`
- `dataset/*.json` → `docs/01-naming-conventions.md` (元信息类型命名)
- `feature/*.json` → `docs/02-geometry-model.md` (Feature 结构)

## 完整示例

```json
{
  "id": 1,
  "geometry": {
    "type": "Point",
    "coordinates": [116.4074, 39.9042],
    "srid": 4326
  },
  "attributes": {
    "name": "北京",
    "population": 21540000
  }
}
```

对应 schema: `./feature/point-feature.json`
