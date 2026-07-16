package com.supermap.udbx.enum;

/**
 * 视口空间查询实际采用的策略。
 *
 * @since udbx4spec 1.1
 */
public enum SpatialQueryStrategy {

    RTREE("rtree"),
    ENVELOPE_CACHE("envelope_cache"),
    BOUNDED_SAMPLE("bounded_sample");

    private final String value;

    SpatialQueryStrategy(String value) {
        this.value = value;
    }

    /** @return 规范字符串值 */
    public String getValue() {
        return value;
    }
}
