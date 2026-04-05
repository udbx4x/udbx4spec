package com.supermap.udbx.feature;

/**
 * 多线几何对象。
 *
 * <p>对应 GAIA geoType 5 (2D) 或 1005 (3D)。</p>
 *
 * @since udbx4spec 1.0
 */
public interface MultiLineStringGeometry extends Geometry {

    @Override
    default String getType() {
        return "MultiLineString";
    }

    /**
     * 获取所有线的坐标。
     *
     * @return 三维数组：线 -> 点 -> 坐标 [x, y] 或 [x, y, z]
     */
    double[][][] getCoordinates();

    /**
     * 获取线的数量。
     *
     * @return 线数量
     */
    int getLineCount();
}
