package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.PointFeature;

/**
 * 三维点数据集接口。
 *
 * <p>存储 GAIAPointZ (geoType=1001)。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.feature.PointGeometry
 */
public interface PointZDataset extends VectorDataset<PointFeature> {
}
