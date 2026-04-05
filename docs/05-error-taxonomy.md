# udbx4spec — 错误分类（Error Taxonomy）

## 概述

本文档定义所有 UDBX 读写库实现必须遵循的错误/异常分类规范。规范涵盖错误基类、具体错误类型、触发场景以及各语言实现映射参考。

所有错误类型均继承自统一的 `UdbxError` 基类，以确保调用者可以通过单一 catch 语句捕获所有 UDBX 相关错误。

## 错误类型层级

```
UdbxError (基类)
├── UdbxFormatError
├── UdbxNotFoundError
├── UdbxUnsupportedError
├── UdbxConstraintError
└── UdbxIOError
```

## 错误类型定义

### 1. UdbxError (基类)

所有 UDBX 相关错误的基类。

**语义**：任何与 UDBX 操作相关的错误都应直接或间接继承此类。

**必须属性**：

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `message` | `string` | 错误描述信息 |
| `code` | `string?` | 可选的错误代码，用于程序化判断 |
| `cause` | `Error?` | 可选的原始错误（用于错误链） |

---

### 2. UdbxFormatError

**语义**：UDBX 文件格式错误或数据损坏。

**触发场景**：
- 损坏的 GAIA BLOB（非法字节序、缺失结束标记 `0xFE` 等）
- 无效的 SQLite 数据库结构（缺失必要的系统表）
- 非法的 geoType 值
- 坐标数据长度与声明不符
- 非法的 SuperMap 字符串编码

**示例消息**：
```
"Invalid GAIA BLOB: missing end marker 0xFE"
"Invalid byte order: expected 0x01, got 0x00"
"Invalid geoType: 999 is not supported"
```

---

### 3. UdbxNotFoundError

**语义**：请求的数据集或要素不存在。

**触发场景**：
- 按名称获取数据集时，指定名称的数据集不存在
- 按 ID 获取要素时，指定 ID 的要素不存在
- 引用的字段不存在

**示例消息**：
```
"Dataset 'cities' not found"
"Feature with id=42 not found in dataset 'roads'"
"Field 'population' does not exist"
```

---

### 4. UdbxUnsupportedError

**语义**：不支持的数据集类型或几何类型。

**触发场景**：
- 尝试打开不受支持的 `DatasetKind`（如 `text` 在尚未支持的实现中）
- 尝试编码/解码不受支持的 GAIA geoType
- 尝试使用尚未实现的功能

**示例消息**：
```
"Dataset kind 'text' is not supported in this implementation"
"GAIA geoType 1002 is not supported"
"Spatial index operations are not yet implemented"
```

---

### 5. UdbxConstraintError

**语义**：数据约束违反。

**触发场景**：
- 重复 ID（插入时指定已存在的 ID）
- 必填字段缺失
- 字段类型不匹配（如向数值字段写入字符串）
- 几何类型与数据集类型不匹配（如向 `PointDataset` 写入 `MultiPolygon`）

**示例消息**：
```
"Duplicate feature id: 42"
"Required field 'name' is missing"
"Geometry type mismatch: expected Point, got MultiPolygon"
```

---

### 6. UdbxIOError

**语义**：文件 I/O 操作失败。

**触发场景**：
- 文件读写权限不足
- 磁盘空间不足
- 文件被其他进程锁定
- 网络文件系统不可用（如网络驱动器断开）

**示例消息**：
```
"Permission denied: /path/to/data.udbx"
"Disk full while writing to /path/to/data.udbx"
"File is locked by another process"
```

## 错误处理最佳实践

### 错误链

实现应支持错误链（error chaining/cause），将底层错误包装为 UDBX 错误：

```typescript
// TypeScript 示例
try {
  await fs.readFile(path);
} catch (cause) {
  throw new UdbxIOError(`Failed to read ${path}`, { cause });
}
```

```java
// Java 示例
try {
  Files.readAllBytes(path);
} catch (IOException e) {
  throw new UdbxIOError("Failed to read " + path, e);
}
```

### 用户友好消息

- 错误消息应清晰说明**发生了什么**和**上下文信息**（如文件名、数据集名、ID）
- 不要暴露内部实现细节（如 SQL 查询语句、堆栈跟踪）给最终用户
- 提供错误代码便于程序化处理和本地化

---

## 各语言实现映射参考

### TypeScript

```typescript
// 基类
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

// 具体错误类型
export class UdbxFormatError extends UdbxError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { code: 'FORMAT_ERROR', ...options });
    this.name = 'UdbxFormatError';
  }
}

export class UdbxNotFoundError extends UdbxError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { code: 'NOT_FOUND', ...options });
    this.name = 'UdbxNotFoundError';
  }
}

export class UdbxUnsupportedError extends UdbxError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { code: 'UNSUPPORTED', ...options });
    this.name = 'UdbxUnsupportedError';
  }
}

export class UdbxConstraintError extends UdbxError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { code: 'CONSTRAINT_VIOLATION', ...options });
    this.name = 'UdbxConstraintError';
  }
}

export class UdbxIOError extends UdbxError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { code: 'IO_ERROR', ...options });
    this.name = 'UdbxIOError';
  }
}
```

### Java

```java
// 基类
public class UdbxError extends RuntimeException {
    private final String code;

    public UdbxError(String message) {
        super(message);
        this.code = "UDBX_ERROR";
    }

    public UdbxError(String message, Throwable cause) {
        super(message, cause);
        this.code = "UDBX_ERROR";
    }

    public UdbxError(String message, String code, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

// 具体错误类型
public class UdbxFormatError extends UdbxError {
    public UdbxFormatError(String message) {
        super(message, "FORMAT_ERROR", null);
    }

    public UdbxFormatError(String message, Throwable cause) {
        super(message, "FORMAT_ERROR", cause);
    }
}

public class UdbxNotFoundError extends UdbxError {
    public UdbxNotFoundError(String message) {
        super(message, "NOT_FOUND", null);
    }

    public UdbxNotFoundError(String message, Throwable cause) {
        super(message, "NOT_FOUND", cause);
    }
}

public class UdbxUnsupportedError extends UdbxError {
    public UdbxUnsupportedError(String message) {
        super(message, "UNSUPPORTED", null);
    }

    public UdbxUnsupportedError(String message, Throwable cause) {
        super(message, "UNSUPPORTED", cause);
    }
}

public class UdbxConstraintError extends UdbxError {
    public UdbxConstraintError(String message) {
        super(message, "CONSTRAINT_VIOLATION", null);
    }

    public UdbxConstraintError(String message, Throwable cause) {
        super(message, "CONSTRAINT_VIOLATION", cause);
    }
}

public class UdbxIOError extends UdbxError {
    public UdbxIOError(String message) {
        super(message, "IO_ERROR", null);
    }

    public UdbxIOError(String message, Throwable cause) {
        super(message, "IO_ERROR", cause);
    }
}
```

### Python

```python
from typing import Optional

class UdbxError(Exception):
    """所有 UDBX 错误的基类"""

    def __init__(self, message: str, code: Optional[str] = None, cause: Optional[Exception] = None):
        super().__init__(message)
        self.code = code or "UDBX_ERROR"
        self.__cause__ = cause

class UdbxFormatError(UdbxError):
    """格式错误"""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message, "FORMAT_ERROR", cause)

class UdbxNotFoundError(UdbxError):
    """未找到错误"""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message, "NOT_FOUND", cause)

class UdbxUnsupportedError(UdbxError):
    """不支持的错误"""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message, "UNSUPPORTED", cause)

class UdbxConstraintError(UdbxError):
    """约束违反错误"""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message, "CONSTRAINT_VIOLATION", cause)

class UdbxIOError(UdbxError):
    """IO 错误"""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message, "IO_ERROR", cause)
```

### C#

```csharp
// 基类
public class UdbxError : Exception
{
    public string Code { get; }

    public UdbxError(string message) : base(message)
    {
        Code = "UDBX_ERROR";
    }

    public UdbxError(string message, Exception innerException) : base(message, innerException)
    {
        Code = "UDBX_ERROR";
    }

    public UdbxError(string message, string code, Exception innerException) : base(message, innerException)
    {
        Code = code;
    }
}

// 具体错误类型
public class UdbxFormatError : UdbxError
{
    public UdbxFormatError(string message) : base(message, "FORMAT_ERROR", null) { }
    public UdbxFormatError(string message, Exception innerException) : base(message, "FORMAT_ERROR", innerException) { }
}

public class UdbxNotFoundError : UdbxError
{
    public UdbxNotFoundError(string message) : base(message, "NOT_FOUND", null) { }
    public UdbxNotFoundError(string message, Exception innerException) : base(message, "NOT_FOUND", innerException) { }
}

public class UdbxUnsupportedError : UdbxError
{
    public UdbxUnsupportedError(string message) : base(message, "UNSUPPORTED", null) { }
    public UdbxUnsupportedError(string message, Exception innerException) : base(message, "UNSUPPORTED", innerException) { }
}

public class UdbxConstraintError : UdbxError
{
    public UdbxConstraintError(string message) : base(message, "CONSTRAINT_VIOLATION", null) { }
    public UdbxConstraintError(string message, Exception innerException) : base(message, "CONSTRAINT_VIOLATION", innerException) { }
}

public class UdbxIOError : UdbxError
{
    public UdbxIOError(string message) : base(message, "IO_ERROR", null) { }
    public UdbxIOError(string message, Exception innerException) : base(message, "IO_ERROR", innerException) { }
}
```

### Go

```go
package udbx

import "fmt"

// 错误代码常量
const (
    CodeUdbxError      = "UDBX_ERROR"
    CodeFormatError    = "FORMAT_ERROR"
    CodeNotFound       = "NOT_FOUND"
    CodeUnsupported    = "UNSUPPORTED"
    CodeConstraint     = "CONSTRAINT_VIOLATION"
    CodeIOError        = "IO_ERROR"
)

// UdbxError 接口
type UdbxError interface {
    error
    Code() string
    Unwrap() error
}

// 基础错误类型
type baseError struct {
    msg   string
    code  string
    cause error
}

func (e *baseError) Error() string {
    if e.cause != nil {
        return fmt.Sprintf("%s: %v", e.msg, e.cause)
    }
    return e.msg
}

func (e *baseError) Code() string {
    return e.code
}

func (e *baseError) Unwrap() error {
    return e.cause
}

// 构造函数
func NewFormatError(msg string, cause ...error) UdbxError {
    var c error
    if len(cause) > 0 {
        c = cause[0]
    }
    return &baseError{msg: msg, code: CodeFormatError, cause: c}
}

func NewNotFoundError(msg string, cause ...error) UdbxError {
    var c error
    if len(cause) > 0 {
        c = cause[0]
    }
    return &baseError{msg: msg, code: CodeNotFound, cause: c}
}

func NewUnsupportedError(msg string, cause ...error) UdbxError {
    var c error
    if len(cause) > 0 {
        c = cause[0]
    }
    return &baseError{msg: msg, code: CodeUnsupported, cause: c}
}

func NewConstraintError(msg string, cause ...error) UdbxError {
    var c error
    if len(cause) > 0 {
        c = cause[0]
    }
    return &baseError{msg: msg, code: CodeConstraint, cause: c}
}

func NewIOError(msg string, cause ...error) UdbxError {
    var c error
    if len(cause) > 0 {
        c = cause[0]
    }
    return &baseError{msg: msg, code: CodeIOError, cause: c}
}
```

### Rust

```rust
use std::error::Error;
use std::fmt;

// 错误代码
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    FormatError,
    NotFound,
    Unsupported,
    ConstraintViolation,
    IOError,
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorCode::FormatError => write!(f, "FORMAT_ERROR"),
            ErrorCode::NotFound => write!(f, "NOT_FOUND"),
            ErrorCode::Unsupported => write!(f, "UNSUPPORTED"),
            ErrorCode::ConstraintViolation => write!(f, "CONSTRAINT_VIOLATION"),
            ErrorCode::IOError => write!(f, "IO_ERROR"),
        }
    }
}

// 基类错误
#[derive(Debug)]
pub struct UdbxError {
    message: String,
    code: ErrorCode,
    source: Option<Box<dyn Error + Send + Sync>>,
}

impl UdbxError {
    pub fn new(message: impl Into<String>, code: ErrorCode) -> Self {
        Self {
            message: message.into(),
            code,
            source: None,
        }
    }

    pub fn with_source(
        message: impl Into<String>,
        code: ErrorCode,
        source: impl Error + Send + Sync + 'static,
    ) -> Self {
        Self {
            message: message.into(),
            code,
            source: Some(Box::new(source)),
        }
    }

    pub fn code(&self) -> &ErrorCode {
        &self.code
    }
}

impl fmt::Display for UdbxError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} [{}]", self.message, self.code)
    }
}

impl Error for UdbxError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        self.source.as_ref().map(|e| e.as_ref())
    }
}

// 便捷构造函数
pub type UdbxResult<T> = Result<T, UdbxError>;

pub fn format_error(message: impl Into<String>) -> UdbxError {
    UdbxError::new(message, ErrorCode::FormatError)
}

pub fn not_found_error(message: impl Into<String>) -> UdbxError {
    UdbxError::new(message, ErrorCode::NotFound)
}

pub fn unsupported_error(message: impl Into<String>) -> UdbxError {
    UdbxError::new(message, ErrorCode::Unsupported)
}

pub fn constraint_error(message: impl Into<String>) -> UdbxError {
    UdbxError::new(message, ErrorCode::ConstraintViolation)
}

pub fn io_error(message: impl Into<String>) -> UdbxError {
    UdbxError::new(message, ErrorCode::IOError)
}
```

---

## 附录：错误代码表

| 错误代码 | 对应错误类型 | HTTP 状态码映射（可选） |
|----------|-------------|------------------------|
| `FORMAT_ERROR` | UdbxFormatError | 400 Bad Request |
| `NOT_FOUND` | UdbxNotFoundError | 404 Not Found |
| `UNSUPPORTED` | UdbxUnsupportedError | 501 Not Implemented |
| `CONSTRAINT_VIOLATION` | UdbxConstraintError | 409 Conflict |
| `IO_ERROR` | UdbxIOError | 500 Internal Server Error |

---

## 相关文档

- [`01-naming-conventions.md`](./01-naming-conventions.md) — 类名、方法名规范
- [`02-geometry-model.md`](./02-geometry-model.md) — 几何数据模型
