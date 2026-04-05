package com.supermap.udbx.exception;

/**
 * 约束违反错误 - 数据约束违反。
 *
 * <p>触发场景：</p>
 * <ul>
 *   <li>重复 ID（插入时指定已存在的 ID）</li>
 *   <li>必填字段缺失</li>
 *   <li>字段类型不匹配（如向数值字段写入字符串）</li>
 *   <li>几何类型与数据集类型不匹配（如向 PointDataset 写入 MultiPolygon）</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 */
public class UdbxConstraintError extends UdbxError {

    /**
     * 构造约束违反错误实例。
     *
     * @param message 错误描述
     */
    public UdbxConstraintError(String message) {
        super(message, "CONSTRAINT_VIOLATION", null);
    }

    /**
     * 构造约束违反错误实例，带原始错误。
     *
     * @param message 错误描述
     * @param cause 原始错误
     */
    public UdbxConstraintError(String message, Throwable cause) {
        super(message, "CONSTRAINT_VIOLATION", cause);
    }
}
