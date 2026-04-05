package com.supermap.udbx.exception;

/**
 * 不支持错误 - 不支持的数据集类型或几何类型。
 *
 * <p>触发场景：</p>
 * <ul>
 *   <li>尝试打开不受支持的 DatasetKind（如 text 在尚未支持的实现中）</li>
 *   <li>尝试编码/解码不受支持的 GAIA geoType</li>
 *   <li>尝试使用尚未实现的功能</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 */
public class UdbxUnsupportedError extends UdbxError {

    /**
     * 构造不支持错误实例。
     *
     * @param message 错误描述
     */
    public UdbxUnsupportedError(String message) {
        super(message, "UNSUPPORTED", null);
    }

    /**
     * 构造不支持错误实例，带原始错误。
     *
     * @param message 错误描述
     * @param cause 原始错误
     */
    public UdbxUnsupportedError(String message, Throwable cause) {
        super(message, "UNSUPPORTED", cause);
    }
}
