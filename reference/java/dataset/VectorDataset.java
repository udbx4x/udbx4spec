package com.supermap.udbx.dataset;

import com.supermap.udbx.exception.UdbxError;
import com.supermap.udbx.feature.Feature;
import com.supermap.udbx.feature.Geometry;
import com.supermap.udbx.meta.QueryOptions;

import javax.annotation.Nullable;
import java.util.List;
import java.util.stream.Stream;

/**
 * 矢量数据集基础接口。
 *
 * <p>所有带几何的数据集（PointDataset, LineDataset, RegionDataset, *ZDataset, CadDataset）
 * 的公共接口。</p>
 *
 * @param <TFeature> Feature 类型
 * @since udbx4spec 1.0
 */
public interface VectorDataset<TFeature extends Feature<? extends Geometry>> extends Dataset {

    /**
     * 查询全部或带条件查询。
     *
     * @param options 查询选项，null 表示查询全部
     * @return Feature 列表
     * @throws UdbxError 查询失败时抛出
     */
    List<TFeature> list(@Nullable QueryOptions options) throws UdbxError;

    /**
     * 查询全部。
     *
     * @return Feature 列表
     * @throws UdbxError 查询失败时抛出
     */
    default List<TFeature> list() throws UdbxError {
        return list(null);
    }

    /**
     * 按 ID 查询单条。
     *
     * @param id SmID
     * @return Feature，不存在返回 null
     * @throws UdbxError 查询失败时抛出
     */
    @Nullable
    TFeature getById(int id) throws UdbxError;

    /**
     * 流式读取。
     *
     * @return Java Stream
     * @throws UdbxError 读取失败时抛出
     */
    Stream<TFeature> stream() throws UdbxError;

    /**
     * 单条写入。
     *
     * @param feature 要写入的 Feature
     * @return 写入后的 Feature（可能包含新生成的 ID）
     * @throws UdbxError 写入失败时抛出
     */
    TFeature insert(TFeature feature) throws UdbxError;

    /**
     * 批量写入。
     *
     * @param features 要写入的 Feature 列表
     * @return 写入数量
     * @throws UdbxError 写入失败时抛出
     */
    int insertMany(List<TFeature> features) throws UdbxError;

    /**
     * 按 ID 更新。
     *
     * @param id 要更新的 Feature ID
     * @param changes 变更对象（geometry, attributes）
     * @return 更新后的 Feature
     * @throws UdbxError 更新失败时抛出
     */
    TFeature update(int id, FeatureChanges changes) throws UdbxError;

    /**
     * 按 ID 删除。
     *
     * @param id 要删除的 Feature ID
     * @return true 如果删除成功
     * @throws UdbxError 删除失败时抛出
     */
    boolean delete(int id) throws UdbxError;

    /**
     * 变更对象（用于更新）。
     */
    interface FeatureChanges {
        @Nullable
        Geometry getGeometry();

        @Nullable
        java.util.Map<String, Object> getAttributes();
    }
