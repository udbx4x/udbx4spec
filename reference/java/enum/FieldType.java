package com.supermap.udbx.enum;

import com.supermap.udbx.exception.UdbxUnsupportedError;

/**
 * 字段类型分类。
 *
 * <p>对应 UDBX SmFieldInfo 表中的 SmFieldType 字段，所有实现必须完整支持
 * 以下 14 种字段类型的读取、写入和元信息交换。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.meta.FieldInfo
 */
public enum FieldType {

    /** 布尔值 (0/1) - SmFieldType = 1 */
    BOOLEAN(1),

    /** 单字节整数 - SmFieldType = 2 */
    BYTE(2),

    /** 16 位有符号整数 - SmFieldType = 3 */
    INT16(3),

    /** 32 位有符号整数 - SmFieldType = 4 */
    INT32(4),

    /** 64 位有符号整数 - SmFieldType = 5 */
    INT64(5),

    /** 单精度浮点数 - SmFieldType = 6 */
    SINGLE(6),

    /** 双精度浮点数 - SmFieldType = 7 */
    DOUBLE(7),

    /** 日期 - SmFieldType = 8 */
    DATE(8),

    /** 二进制数据 - SmFieldType = 9 */
    BINARY(9),

    /** 几何 BLOB - SmFieldType = 10 */
    GEOMETRY(10),

    /** 定长字符 - SmFieldType = 11 */
    CHAR(11),

    /** Unicode 长文本 - SmFieldType = 127 */
    NTEXT(127),

    /** 长文本 - SmFieldType = 128 */
    TEXT(128),

    /** 时间 - SmFieldType = 16 */
    TIME(16);

    private final int value;

    FieldType(int value) {
        this.value = value;
    }

    /**
     * 获取 SmFieldType 整数值。
     *
     * @return SmFieldType 值
     */
    public int getValue() {
        return value;
    }

    /**
     * 根据 SmFieldType 值获取枚举实例。
     *
     * @param value SmFieldType 值
     * @return FieldType 枚举实例
     * @throws UdbxUnsupportedError 如果值未知
     */
    public static FieldType fromValue(int value) {
        for (FieldType type : values()) {
            if (type.value == value) {
                return type;
            }
        }
        throw new UdbxUnsupportedError("Unknown field type: " + value);
    }

    /**
     * 获取对应的 SQLite 列类型。
     *
     * @return SQLite 类型字符串
     */
    public String getSqliteType() {
        return switch (this) {
            case BOOLEAN, BYTE, INT16, INT32, INT64 -> "INTEGER";
            case SINGLE, DOUBLE -> "REAL";
            case BINARY, GEOMETRY -> "BLOB";
            case DATE, CHAR, NTEXT, TEXT, TIME -> "TEXT";
        };
    }

    /**
     * 判断是否为数值类型。
     *
     * @return true 如果是数值类型
     */
    public boolean isNumeric() {
        return switch (this) {
            case BYTE, INT16, INT32, INT64, SINGLE, DOUBLE -> true;
            default -> false;
        };
    }

    /**
     * 判断是否为文本类型。
     *
     * @return true 如果是文本类型
     */
    public boolean isText() {
        return switch (this) {
            case CHAR, NTEXT, TEXT -> true;
            default -> false;
        };
    }
}
