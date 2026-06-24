package com.supermap.udbx.feature;

import javax.annotation.Nullable;

/**
 * 文本子对象。
 *
 * <p>对应白皮书 4.4 GeoSubText。</p>
 *
 * @since udbx4spec 1.0
 */
public interface TextSubText {

    String getText();

    double[] getAnchor();

    @Nullable
    Double getRotation();
}
