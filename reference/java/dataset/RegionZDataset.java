package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.RegionFeature;

/**
 * 三维面数据集接口。
 *
 * <p>存储 GAIAMultiPolygonZ (geoType=1006)。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.feature.MultiPolygonGeometry
 */
public interface RegionZDataset extends VectorDataset<RegionFeature> {
}
