package com.supermap.udbx.enums;

/**
 * 视口空间查询错误或 capability 诊断原因。
 *
 * @since udbx4spec 1.1
 */
public enum SpatialQueryReason {

    INVALID_VIEWPORT("invalid_viewport"),
    SPATIAL_INDEX_UNAVAILABLE("spatial_index_unavailable"),
    ENVELOPE_CACHE_BUDGET_EXCEEDED("envelope_cache_budget_exceeded"),
    QUERY_TIMEOUT("query_timeout"),
    CORRUPT_GEOMETRY("corrupt_geometry"),
    UNSUPPORTED_DATASET_KIND("unsupported_dataset_kind");

    private final String value;

    SpatialQueryReason(String value) {
        this.value = value;
    }

    /** @return 规范字符串值 */
    public String getValue() {
        return value;
    }
}
