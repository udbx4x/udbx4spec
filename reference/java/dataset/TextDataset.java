package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.TextFeature;

/**
 * 文本数据集接口。
 *
 * <p>Text 数据集使用 GeoText BLOB 存储文本对象，并使用 SmIndexKey
 * 存储对象范围。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.feature.TextGeometry
 */
public interface TextDataset extends VectorDataset<TextFeature> {
}
