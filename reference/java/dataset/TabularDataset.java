package com.supermap.udbx.dataset;

import com.supermap.udbx.exception.UdbxError;
import com.supermap.udbx.feature.TabularRecord;
import com.supermap.udbx.meta.QueryOptions;

import javax.annotation.Nullable;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 纯属性表数据集接口。
 *
 * <p>无几何数据，仅包含属性记录。</p>
 *
 * @since udbx4spec 1.0
 * @see TabularRecord
 */
public interface TabularDataset extends Dataset {

    /**
     * 查询全部或带条件查询。
     *
     * @param options 查询选项，null 表示查询全部
     * @return 记录列表
     * @throws UdbxError 查询失败时抛出
     */
    List<TabularRecord> list(@Nullable QueryOptions options) throws UdbxError;

    /**
     * 查询全部。
     *
     * @return 记录列表
     * @throws UdbxError 查询失败时抛出
     */
    default List<TabularRecord> list() throws UdbxError {
        return list(null);
    }

    /**
     * 按 ID 查询单条。
     *
     * @param id SmID
     * @return 记录，不存在返回 null
     * @throws UdbxError 查询失败时抛出
     */
    @Nullable
    TabularRecord getById(int id) throws UdbxError;

    /**
     * 流式读取。
     *
     * @return Java Stream
     * @throws UdbxError 读取失败时抛出
     */
    Stream<TabularRecord> stream() throws UdbxError;

    /**
     * 单条写入。
     *
     * @param record 要写入的记录
     * @return 写入后的记录（可能包含新生成的 ID）
     * @throws UdbxError 写入失败时抛出
     */
    TabularRecord insert(TabularRecord record) throws UdbxError;

    /**
     * 批量写入。
     *
     * @param records 要写入的记录列表
     * @return 写入数量
     * @throws UdbxError 写入失败时抛出
     */
    int insertMany(List<TabularRecord> records) throws UdbxError;

    /**
     * 按 ID 更新。
     *
     * @param id 要更新的记录 ID
     * @param attributes 变更的属性
     * @return 更新后的记录
     * @throws UdbxError 更新失败时抛出
     */
    TabularRecord update(int id, Map<String, Object> attributes) throws UdbxError;

    /**
     * 按 ID 删除。
     *
     * @param id 要删除的记录 ID
     * @return true 如果删除成功
     * @throws UdbxError 删除失败时抛出
     */
    boolean delete(int id) throws UdbxError;
}
