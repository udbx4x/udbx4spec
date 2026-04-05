package com.supermap.udbx.feature;

import javax.annotation.Nullable;

/**
 * 几何对象基础接口。
 *
 * <p>UDBX 采用 GeoJSON-like 结构作为跨语言几何数据交换的 lingua franca。
 * 所有几何类型都必须实现此接口。</p>
 *
 * @since udbx4spec 1.0
 * @see PointGeometry
 * @see MultiLineStringGeometry
 * @see MultiPolygonGeometry
 */
public interface Geometry {

    /**
     * 获取几何类型。
     *
     * @return 几何类型字符串（Point, MultiLineString, MultiPolygon）
     */
    String getType();

    /**
     * 获取坐标系 ID。
     *
     * @return SRID，可能为 null
     */
    @Nullable
    Integer getSrid();

    /**
     * 判断是否有 Z 值。
     *
     * @return true 如果是 3D 几何
     */
    boolean hasZ();

    /**
     * 获取边界框。
     *
     * @return 边界框 [minX, minY, maxX, maxY]，可能为 null
     */
    @Nullable
    double[] getBbox();
}
