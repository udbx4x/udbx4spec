package com.supermap.udbx.dataset;

import com.supermap.udbx.exception.UdbxError;
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
     * @return 对象数量
     */
    default int count() {
        return getInfo().getObjectCount();
    }
}
