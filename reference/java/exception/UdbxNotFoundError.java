package com.supermap.udbx.exception;

/**
 * 未找到错误 - 请求的数据集或要素不存在。
 *
 * <p>触发场景：</p>
 * <ul>
 *   <li>按名称获取数据集时，指定名称的数据集不存在</li>
 *   <li>按 ID 获取要素时，指定 ID 的要素不存在</li>
 *   <li>引用的字段不存在</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 */
public class UdbxNotFoundError extends UdbxError {

    /**
     * 构造未找到错误实例。
     *
     * @param message 错误描述
     */
    public UdbxNotFoundError(String message) {
        super(message, "NOT_FOUND", null);
    }

    /**
     * 构造未找到错误实例，带原始错误。
     *
     * @param message 错误描述
     * @param cause 原始错误
     */
    public UdbxNotFoundError(String message, Throwable cause) {
        super(message, "NOT_FOUND", cause);
    }
}
