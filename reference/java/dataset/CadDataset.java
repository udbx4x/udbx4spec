package com.supermap.udbx.dataset;

import com.supermap.udbx.feature.Feature;
import com.supermap.udbx.feature.Geometry;

/**
 * CAD 数据集接口。
 *
 * <p>使用 SuperMap GeoHeader 自定义二进制格式存储，不在 GeoJSON-like 范围内。
 * 内部表示由实现决定，对外可提供 bytes 或特定 CAD 结构。</p>
 *
 * @param <TFeature> CAD Feature 类型
 * @since udbx4spec 1.0
 */
public interface CadDataset<TFeature extends Feature<? extends Geometry>> extends VectorDataset<TFeature> {
}
