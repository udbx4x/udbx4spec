package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.RegionFeature;

/**
 * 面数据集接口。
 *
 * <p>存储 GAIAMultiPolygon (geoType=6) 或 GAIAMultiPolygonZ (geoType=1006)。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.feature.MultiPolygonGeometry
 */
public interface RegionDataset extends VectorDataset<RegionFeature> {
