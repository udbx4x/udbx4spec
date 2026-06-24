# 合规数据库夹具

本目录用于存放标准合规数据库夹具及其机器可读清单。

当前 `manifest.json` 已记录真实 `compliance.udbx` 的生成状态、哈希、文件大小、覆盖数据集和验收条件。该 manifest 是 `check-fixtures.mjs` 校验数据库内容时的唯一入口。

## 维护要求

- `compliance.udbx` 必须小型、可重复生成、可公开分发。
- 生成脚本必须记录生成实现、版本、命令和输入数据。
- manifest 必须记录 SHA-256、文件大小、覆盖 DatasetKind、覆盖 FieldType 和预期记录数。
- manifest 中的数据集约束变更后，必须同步重新生成 `compliance.udbx` 并重新执行校验。
- SDK 不得把真实世界样本文件等同于合规数据库夹具。

## 生成方式

```bash
cd udbx4spec
node tools/generate-compliance-db.mjs
```

## 本地检查

```bash
cd udbx4spec
node tools/check-fixtures.mjs
```
