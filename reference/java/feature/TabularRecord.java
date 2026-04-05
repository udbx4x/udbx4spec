package com.supermap.udbx.feature;

import java.util.Map;

/**
 * 属性记录（无几何）。
 *
 * <p>对应 TabularDataset 中的记录，仅包含 id 和 attributes。</p>
 *
 * @since udbx4spec 1.0
 */
public interface TabularRecord {

    /**
     * 获取记录 ID。
     *
     * @return SmID
     */
    int getId();

    /**
     * 获取属性。
     *
     * @return 用户字段键值对
     */
    Map<String, Object> getAttributes();

    /**
     * 获取单个属性值。
     *
     * @param name 字段名
     * @return 属性值，不存在返回 null
     */
    Object getAttribute(String name);
}
