package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.LineFeature;

/**
 * 三维线数据集接口。
 *
 * <p>存储 GAIAMultiLineStringZ (geoType=1005)。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.feature.MultiLineStringGeometry
 */
public interface LineZDataset extends VectorDataset<LineFeature> {
}
