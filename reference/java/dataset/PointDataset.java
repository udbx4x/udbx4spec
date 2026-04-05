package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.PointFeature;

/**
 * 点数据集接口。
 *
 * <p>存储 GAIAPoint (geoType=1) 或 GAIAPointZ (geoType=1001)。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.feature.PointGeometry
 */
public interface PointDataset extends VectorDataset<PointFeature> {
