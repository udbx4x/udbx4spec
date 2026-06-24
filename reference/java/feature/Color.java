package com.supermap.udbx.feature;

/**
 * UDBX 颜色结构。
 *
 * <p>白皮书 Color 的字节顺序为 ABGR。</p>
 *
 * @since udbx4spec 1.0
 */
public interface Color {

    int getA();

    int getB();

    int getG();

    int getR();
}
