package com.supermap.udbx.meta;

import com.supermap.udbx.enum.FieldType;

import javax.annotation.Nullable;

/**
 * 字段元信息。
 *
 * <p>对应 UDBX SmFieldInfo 表的字段定义。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.enum.FieldType
 */
public interface FieldInfo {

    /**
     * 获取字段名称。
     *
     * @return 字段名称 (SmFieldName)
     */
    String getName();

    /**
     * 获取字段类型。
     *
     * @return 字段类型
     */
    FieldType getFieldType();

    /**
     * 获取字段别名。
     *
     * @return 字段别名 (SmFieldCaption)，可能为 null
     */
    @Nullable
    String getAlias();

    /**
     * 判断是否必填。
     *
     * @return true 如果字段必填 (SmFieldbRequired)
     */
    @Nullable
    Boolean getRequired();

    /**
     * 判断是否可为 null。
     *
     * @return true 如果字段可为 null
     */
    @Nullable
    Boolean getNullable();

    /**
     * 获取默认值。
     *
     * @return 默认值 (SmFieldDefaultValue)，可能为 null
     */
    @Nullable
    Object getDefaultValue();
}
