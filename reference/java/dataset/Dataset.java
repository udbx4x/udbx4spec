package com.supermap.udbx.dataset;

import com.supermap.udbx.meta.DatasetInfo;

/**
 * 数据集基础接口。
 *
 * <p>所有数据集必须派生自一个公共抽象根。</p>
 *
 * @since udbx4spec 1.0
 * @see VectorDataset
 * @see TabularDataset
 * @see CadDataset
 */
public interface Dataset {

    /**
     * 获取数据集元信息。
     *
     * @return 元信息对象
     */
    DatasetInfo getInfo();

    /**
     * 获取数据集名称。
     *
     * @return 数据集名称
     */
    default String getName() {
        return getInfo().getName();
    }

    /**
     * 获取对象总数。
     *
     * <p>稳定 API 语义要求读取物理表真实行数，不得以
     * SmRegister.SmObjectCount 缓存值作为公开 count() 的权威来源。</p>
     *
     * @return 物理表真实对象数量
     */
    int count();
}
