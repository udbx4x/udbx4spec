package com.supermap.udbx.exception;

/**
 * IO 错误 - 文件 I/O 操作失败。
 *
 * <p>触发场景：</p>
 * <ul>
 *   <li>文件读写权限不足</li>
 *   <li>磁盘空间不足</li>
 *   <li>文件被其他进程锁定</li>
 *   <li>网络文件系统不可用（如网络驱动器断开）</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 */
public class UdbxIOError extends UdbxError {

    /**
     * 构造 IO 错误实例。
     *
     * @param message 错误描述
     */
    public UdbxIOError(String message) {
        super(message, "IO_ERROR", null);
    }

    /**
     * 构造 IO 错误实例，带原始错误。
     *
     * @param message 错误描述
     * @param cause 原始错误
     */
    public UdbxIOError(String message, Throwable cause) {
        super(message, "IO_ERROR", cause);
    }
}
