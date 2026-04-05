# UDBX 合规测试夹具

本目录包含跨语言一致性测试夹具，用于验证各 UDBX 实现之间的兼容性。

## 目录结构

```
compliance/
├── README.md                          # 本文件
├── golden-gaia-bytes/                 # 标准 GAIA 二进制 BLOB
│   ├── point-2d/
│   ├── point-3d/
│   ├── multilinestring-2d/
│   └── multipolygon-2d/
├── compliance.udbx                    # 标准测试数据库（待生成）
├── java-compliance-checklist.md       # Java 实现检查清单
└── ts-compliance-checklist.md         # TypeScript 实现检查清单
```

## 组成部分

### 1. Golden GAIA Bytes

位于 `golden-gaia-bytes/` 目录，包含标准 GAIA 二进制 BLOB，用于验证编解码器字节级一致性。

详见：[golden-gaia-bytes/README.md](./golden-gaia-bytes/README.md)

### 2. compliance.udbx

标准测试数据库，包含已知数据集和特征，用于集成测试。

**数据库内容**：

| 数据集名称 | 类型 | 对象数 | 描述 |
|-----------|------|--------|------|
| `test_points` | PointDataset | 3 | 已知坐标的点 |
| `test_lines` | LineDataset | 2 | 已知坐标的多线 |
| `test_regions` | RegionDataset | 1 | 带内环的多边形 |
| `test_tabular` | TabularDataset | 2 | 纯属性记录 |

**字段定义**：

所有空间数据集包含以下字段：
- `name` (text) - 名称
- `value` (int32) - 数值

**生成方式**：

```bash
# 使用 TypeScript 实现生成
cd ../udbx4ts
npm run build
node scripts/generate-compliance-db.js --output ../udbx4spec/compliance/compliance.udbx

# 或使用 Java 实现生成
cd ../udbx4j
mvn compile exec:java -Dexec.mainClass="com.supermap.udbx.cli.GenerateComplianceDb" \
  -Dexec.args="--output ../udbx4spec/compliance/compliance.udbx"
```

### 3. 合规检查清单

- `java-compliance-checklist.md` - Java 实现合规检查项
- `ts-compliance-checklist.md` - TypeScript 实现合规检查项

实现者应逐项检查并签名确认。

## 使用方法

### 编解码器测试

各实现应提供测试读取 golden bytes 并验证解码结果：

```typescript
// TypeScript 示例
test('compliance: decode golden point-2d', async () => {
  const blob = await fs.readFile('compliance/golden-gaia-bytes/point-2d/simple.bin');
  const codec = new GaiaPointCodec();
  const geometry = codec.readPoint(blob);

  expect(geometry.type).toBe('Point');
  expect(geometry.coordinates).toEqual([116.4074, 39.9042]);
  expect(geometry.srid).toBe(4326);
});
```

```java
// Java 示例
@Test
void testDecodeGoldenPoint2D() throws Exception {
    byte[] blob = Files.readAllBytes(Path.of("compliance/golden-gaia-bytes/point-2d/simple.bin"));
    GaiaPointCodec codec = new GaiaPointCodec();
    PointGeometry geometry = codec.readPoint(blob);

    assertEquals("Point", geometry.getType());
    assertArrayEquals(new double[]{116.4074, 39.9042}, geometry.getCoordinates(), 0.0001);
    assertEquals(4326, geometry.getSrid());
}
```

### 数据库测试

```typescript
// TypeScript 示例
test('compliance: open compliance.udbx', async () => {
  const ds = await UdbxDataSource.open('compliance/compliance.udbx');
  const pointDs = await ds.getDataset('test_points') as PointDataset;

  expect(await pointDs.count()).toBe(3);

  const features = await pointDs.list();
  expect(features[0].attributes.name).toBe('Point1');
});
```

## 更新 Golden Bytes

当规范变更需要更新 golden bytes 时：

1. 更新 `golden-gaia-bytes/README.md` 中的预期字节序列
2. 使用任一实现重新生成 `.bin` 文件
3. 确保所有实现都能正确解码新生成的文件
4. 提交更新并标注版本

## 版本管理

Golden bytes 和 compliance.udbx 应与 udbx4spec 版本同步：

- v1.0.0: 初始版本，支持基本几何类型
- v1.1.0: 新增 CAD 数据集支持（未来）

---

**注意**：`compliance.udbx` 和各 `.bin` 文件为二进制文件，
应由实际运行代码生成，不应手动编辑。
