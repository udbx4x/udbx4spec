package com.supermap.udbx.meta;

import com.supermap.udbx.enum.DatasetKind;

import javax.annotation.Nullable;
import java.util.List;

/**
 * 数据集元信息。
 *
 * <p>对应 UDBX SmRegister 表的数据集定义。</p>
 *
 * @since udbx4spec 1.0
 * @see com.supermap.udbx.dataset.Dataset
 */
public interface DatasetInfo {

    /**
     * 获取数据集 ID。
     *
     * @return 数据集 ID (SmDatasetID)
     */
    int getId();

    /**
     * 获取数据集名称。
     *
     * @return 数据集名称 (SmDatasetName)
     */
    String getName();

    /**
     * 获取物理表名。
     *
     * @return 物理表名 (SmTableName)
     */
    String getTableName();

    /**
     * 获取数据集类型。
     *
     * @return 数据集类型分类
     */
    DatasetKind getKind();

    /**
     * 获取坐标系 ID。
     *
     * @return 坐标系 ID (SmSRID)，对于纯属性表可能为 null
     */
    @Nullable
    Integer getSrid();

    /**
     * 获取对象数量。
     *
     * @return 数据集中对象数量 (SmObjectCount)
     */
    int getObjectCount();

    /**
     * 获取几何类型。
     *
     * @return GAIA geoType 整数值，对于纯属性表可能为 null
     */
    @Nullable
    Integer getGeometryType();

    /**
     * 获取字段元信息列表。
     *
     * @return 字段列表
     */
    List<FieldInfo> getFields();
}
