package com.supermap.udbx;

import com.supermap.udbx.dataset.Dataset;
import com.supermap.udbx.meta.DatasetInfo;
import com.supermap.udbx.exception.UdbxError;

import java.util.List;

/**
 * UDBX 数据源入口类。
 *
 * <p>每个语言实现必须提供一个名为 {@code UdbxDataSource} 的入口类（或结构体/单例），
 * 负责打开、创建和关闭 {@code .udbx} 文件，并作为数据集工厂。</p>
 *
 * @since udbx4spec 1.0
 * @see Dataset
 * @see DatasetInfo
 */
public interface UdbxDataSource extends AutoCloseable {

    /**
     * 打开已有 UDBX 文件。
     *
     * @param path UDBX 文件路径
     * @return 数据源实例
     * @throws UdbxError 打开失败时抛出（文件不存在、格式错误、IO 错误等）
     */
    static UdbxDataSource open(String path) throws UdbxError {
        throw new UnsupportedOperationException("Implementation required");
    }

    /**
     * 创建全新 UDBX 文件。
     *
     * @param path UDBX 文件路径
     * @return 数据源实例
     * @throws UdbxError 创建失败时抛出（路径无效、权限不足等）
     */
    static UdbxDataSource create(String path) throws UdbxError {
        throw new UnsupportedOperationException("Implementation required");
    }

    /**
     * 按数据集名称获取具体数据集实例。
     *
     * @param name 数据集名称
     * @param <T> 数据集类型
     * @return 数据集实例，若不存在返回 null
     * @throws UdbxError 获取失败时抛出
     */
    <T extends Dataset> T getDataset(String name) throws UdbxError;

    /**
     * 列出当前数据源中所有数据集的元信息。
     *
     * @return 数据集元信息列表
     * @throws UdbxError 查询失败时抛出
     */
    List<DatasetInfo> listDatasets() throws UdbxError;

    /**
     * 关闭数据源。
     *
     * <p>实现应为幂等操作，多次调用不抛异常。</p>
     *
     * @throws UdbxError 关闭失败时抛出
     */
    @Override
    void close() throws UdbxError;

    /**
     * 检查数据源是否已关闭。
     *
     * @return true 如果已关闭
     */
    boolean isClosed();
}
