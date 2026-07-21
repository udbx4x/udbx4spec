package com.supermap.udbx.meta;

import javax.annotation.Nullable;
import java.util.List;

/**
 * 视口空间查询选项。
 *
 * @since udbx4spec 1.1
 */
public interface SpatialQueryOptions {

    /** @return 查询视口边界 */
    BoundingBox getBounds();

    /** @return 视口匹配对象的最大返回数量 */
    int getLimit();

    /** @return 必须追加返回的唯一正整数 ID，未指定时为 null */
    @Nullable
    List<Integer> getRequiredIds();
}
