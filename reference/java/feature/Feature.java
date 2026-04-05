package com.supermap.udbx.feature;

import java.util.Map;

/**
 * 通用要素接口。
 *
 * <p>包含 id、geometry 和 attributes 三部分。</p>
 *
 * @param <TGeometry> 几何类型
 * @since udbx4spec 1.0
 */
public interface Feature<TGeometry extends Geometry> {

    /**
     * 获取要素 ID。
     *
     * @return SmID
     */
    int getId();

    /**
     * 获取几何对象。
     *
     * @return 几何对象
     */
    TGeometry getGeometry();

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

    /**
     * 判断是否有指定属性。
     *
     * @param name 字段名
     * @return true 如果存在
     */
    boolean hasAttribute(String name);
}
