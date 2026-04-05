package com.supermap.udbx.exception;

/**
 * 所有 UDBX 相关错误的基类。
 *
 * <p>所有与 UDBX 操作相关的错误都应直接或间接继承此类。</p>
 *
 * @since udbx4spec 1.0
 * @see UdbxFormatError
 * @see UdbxNotFoundError
 * @see UdbxUnsupportedError
 * @see UdbxConstraintError
 * @see UdbxIOError
 */
public class UdbxError extends RuntimeException {

    private final String code;

    /**
     * 构造错误实例。
     *
     * @param message 错误描述
     */
    public UdbxError(String message) {
        super(message);
        this.code = "UDBX_ERROR";
    }

    /**
     * 构造错误实例，带原始错误。
     *
     * @param message 错误描述
     * @param cause 原始错误
     */
    public UdbxError(String message, Throwable cause) {
        super(message, cause);
        this.code = "UDBX_ERROR";
    }

    /**
     * 构造错误实例，带错误代码和原始错误。
     *
     * @param message 错误描述
     * @param code 错误代码
     * @param cause 原始错误
     */
    public UdbxError(String message, String code, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    /**
     * 获取错误代码。
     *
     * @return 错误代码
     */
    public String getCode() {
        return code;
    }
}
