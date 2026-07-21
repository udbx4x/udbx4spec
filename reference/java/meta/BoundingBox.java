package com.supermap.udbx.meta;

/**
 * 轴对齐空间边界框。
 *
 * @since udbx4spec 1.1
 */
public interface BoundingBox {

    /** @return 最小 X 坐标 */
    double getMinX();

    /** @return 最小 Y 坐标 */
    double getMinY();

    /** @return 最大 X 坐标 */
    double getMaxX();

    /** @return 最大 Y 坐标 */
    double getMaxY();
}
