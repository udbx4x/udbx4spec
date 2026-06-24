package com.supermap.udbx.feature;

import java.util.List;
import javax.annotation.Nullable;

/**
 * 文本几何对象。
 *
 * <p>对应 UDBX 白皮书 4.4 GeoText。Text 数据集的 SmGeometry
 * 存储 GeoText BLOB，SmIndexKey 存储对象范围。</p>
 *
 * @since udbx4spec 1.0
 */
public interface TextGeometry extends Geometry {

    @Override
    default String getType() {
        return "Text";
    }

    String getText();

    double[] getAnchor();

    @Nullable
    Double getRotation();

    @Nullable
    TextStyle getStyle();

    List<TextSubText> getSubTexts();
}
