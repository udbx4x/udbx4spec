package com.supermap.udbx.feature;

/**
 * 点几何对象。
 *
 * <p>对应 GAIA geoType 1 (2D) 或 1001 (3D)。</p>
 *
 * @since udbx4spec 1.0
 */
public interface PointGeometry extends Geometry {

    @Override
    default String getType() {
        return "Point";
    }

    /**
     * 获取坐标。
     *
     * @return 坐标数组 [x, y] 或 [x, y, z]
     */
    double[] getCoordinates();

    /**
     * 获取 X 坐标。
     *
     * @return X 坐标
     */
    double getX();

    /**
     * 获取 Y 坐标。
     *
     * @return Y 坐标
     */
    double getY();

    /**
     * 获取 Z 坐标。
     *
     * @return Z 坐标，如果无 Z 返回 NaN
     */
    double getZ();
}
