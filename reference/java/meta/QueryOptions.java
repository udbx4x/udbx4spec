package com.supermap.udbx.meta;

import javax.annotation.Nullable;
import java.util.List;

/**
 * 数据集查询和分页选项。
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.dataset.Dataset#list(QueryOptions)
 */
public interface QueryOptions {

    /**
     * 获取 ID 过滤器。
     *
     * @return 要查询的特定 Feature ID 列表，null 表示不过滤
     */
    @Nullable
    List<Integer> getIds();

    /**
     * 获取返回结果数量限制。
     *
     * @return 最大返回数量，null 表示无限制
     */
    @Nullable
    Integer getLimit();

    /**
     * 获取跳过结果数量。
     *
     * @return 要跳过的结果数量，null 表示从开头开始
     */
    @Nullable
    Integer getOffset();

    /**
     * 获取空间过滤边界框。
     *
     * @return 边界框 [minX, minY, maxX, maxY]，null 表示不过滤（未来扩展）
     */
    @Nullable
    double[] getBbox();

    /**
     * 创建空查询选项（返回所有）。
     *
     * @return 空 QueryOptions 实例
     */
    static QueryOptions empty() {
        throw new UnsupportedOperationException("Implementation required");
    }

    /**
     * 创建按 ID 查询的选项。
     *
     * @param ids 要查询的 ID 列表
     * @return QueryOptions 实例
     */
    static QueryOptions byIds(List<Integer> ids) {
        throw new UnsupportedOperationException("Implementation required");
    }

    /**
     * 创建分页查询选项。
     *
     * @param limit 每页数量
     * @param offset 偏移量
     * @return QueryOptions 实例
     */
    static QueryOptions page(int limit, int offset) {
        throw new UnsupportedOperationException("Implementation required");
    }
}
