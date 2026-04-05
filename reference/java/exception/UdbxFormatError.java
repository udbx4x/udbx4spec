package com.supermap.udbx.exception;

/**
 * 格式错误 - UDBX 文件格式错误或数据损坏。
 *
 * <p>触发场景：</p>
 * <ul>
 *   <li>损坏的 GAIA BLOB（非法字节序、缺失结束标记 0xFE 等）</li>
 *   <li>无效的 SQLite 数据库结构（缺失必要的系统表）</li>
 *   <li>非法的 geoType 值</li>
 *   <li>坐标数据长度与声明不符</li>
 *   <li>非法的 SuperMap 字符串编码</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 */
public class UdbxFormatError extends UdbxError {

    /**
     * 构造格式错误实例。
     *
     * @param message 错误描述
     */
    public UdbxFormatError(String message) {
        super(message, "FORMAT_ERROR", null);
    }

    /**
     * 构造格式错误实例，带原始错误。
     *
     * @param message 错误描述
     * @param cause 原始错误
     */
    public UdbxFormatError(String message, Throwable cause) {
        super(message, "FORMAT_ERROR", cause);
    }
}
