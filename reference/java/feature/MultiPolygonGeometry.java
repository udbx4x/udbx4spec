package com.supermap.udbx.feature;

/**
 * 多边形几何对象。
 *
 * <p>对应 GAIA geoType 6 (2D) 或 1006 (3D)。</p>
 *
 * @since udbx4spec 1.0
 */
public interface MultiPolygonGeometry extends Geometry {

    @Override
    default String getType() {
        return "MultiPolygon";
    }

    /**
     * 获取所有多边形的坐标。
     *
     * @return 四维数组：多边形 -> 环 -> 点 -> 坐标 [x, y] 或 [x, y, z]
     */
    double[][][][] getCoordinates();

    /**
     * 获取多边形数量。
     *
     * @return 多边形数量
     */
    int getPolygonCount();
}
