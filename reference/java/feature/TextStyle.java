package com.supermap.udbx.feature;

import javax.annotation.Nullable;

/**
 * 文本样式。
 *
 * <p>对应白皮书 4.4 TextStyle。</p>
 *
 * @since udbx4spec 1.0
 */
public interface TextStyle {

    @Nullable
    Color getColor();

    @Nullable
    Color getBackgroundColor();

    @Nullable
    Double getFontWidth();

    @Nullable
    Double getFontHeight();

    @Nullable
    double[] getAnchor();

    @Nullable
    String getFaceName();

    @Nullable
    Integer getFixedSize();

    @Nullable
    Integer getWeight();

    @Nullable
    Integer getStyleFlag();

    @Nullable
    Integer getAlignFlag();
}
