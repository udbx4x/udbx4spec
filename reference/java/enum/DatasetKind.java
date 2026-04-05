package com.supermap.udbx.enum;

import com.supermap.udbx.exception.UdbxUnsupportedError;

/**
 * 数据集类型分类。
 *
 * <p>对应 UDBX SmRegister 表中的 SmDatasetType 字段，所有实现必须使用
 * 本文档定义的分类名称和数值。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.dataset.Dataset
 */
public enum DatasetKind {

    /** 纯属性表，无空间数据 (SmDatasetType = 0) */
    TABULAR(0),

    /** 二维点数据集 (SmDatasetType = 1) */
    POINT(1),

    /** 二维线数据集 (SmDatasetType = 3) */
    LINE(3),

    /** 二维面数据集 (SmDatasetType = 5) */
    REGION(5),

    /** 三维点数据集 (SmDatasetType = 101) */
    POINT_Z(101),

    /** 三维线数据集 (SmDatasetType = 103) */
    LINE_Z(103),

    /** 三维面数据集 (SmDatasetType = 105) */
    REGION_Z(105),

    /** 文本数据集 (SmDatasetType = 7) */
    TEXT(7),

    /** CAD 数据集 (SmDatasetType = 149) */
    CAD(149);

    private final int value;

    DatasetKind(int value) {
        this.value = value;
    }

    /**
     * 获取 SmDatasetType 整数值。
     *
     * @return SmDatasetType 值
     */
    public int getValue() {
        return value;
    }

    /**
     * 根据 SmDatasetType 值获取枚举实例。
     *
     * @param value SmDatasetType 值
     * @return DatasetKind 枚举实例
     * @throws UdbxUnsupportedError 如果值未知
     */
    public static DatasetKind fromValue(int value) {
        for (DatasetKind kind : values()) {
            if (kind.value == value) {
                return kind;
            }
        }
        throw new UdbxUnsupportedError("Unknown dataset kind: " + value);
    }

    /**
     * 判断是否携带几何数据。
     *
     * @return true 如果是空间数据集
     */
    public boolean hasGeometry() {
        return this != TABULAR;
    }

    /**
     * 判断是否为 3D 数据集。
     *
     * @return true 如果是 3D 数据集
     */
    public boolean is3D() {
        return this == POINT_Z || this == LINE_Z || this == REGION_Z;
    }
}
