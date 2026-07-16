package com.supermap.udbx.meta;

import com.supermap.udbx.enums.SpatialQueryReason;
import com.supermap.udbx.enums.SpatialQueryStrategy;
import com.supermap.udbx.feature.Feature;

import javax.annotation.Nullable;
import java.util.List;

/**
 * 视口空间查询结果及执行事实。
 *
 * @since udbx4spec 1.1
 */
public interface SpatialQueryResult {

    /** @return 去重后的视口匹配对象与必需对象 */
    List<? extends Feature> getFeatures();

    /** @return 实际查询边界 */
    BoundingBox getQueriedBounds();

    /** @return 实际采用的查询策略 */
    SpatialQueryStrategy getStrategy();

    /** @return 是否还存在未返回的视口匹配对象 */
    boolean getHasMore();

    /** @return 降级原因，未降级时为 null */
    @Nullable
    SpatialQueryReason getDegradedReason();
}
