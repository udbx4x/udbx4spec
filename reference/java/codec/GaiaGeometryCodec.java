package com.supermap.udbx.codec;

import com.supermap.udbx.exception.UdbxFormatError;
import com.supermap.udbx.exception.UdbxUnsupportedError;
import com.supermap.udbx.feature.Geometry;
import com.supermap.udbx.feature.PointGeometry;
import com.supermap.udbx.feature.MultiLineStringGeometry;
import com.supermap.udbx.feature.MultiPolygonGeometry;

/**
 * GAIA 几何编解码器统一入口。
 *
 * <p>负责根据 BLOB 头部 geoType 自动分派到具体编解码器。</p>
 *
 * <p>所有 GAIA 几何数据均为 Little-Endian：
 * <pre>
 * 0x00 | byteOrder(0x01) | srid(int32) | MBR(4×double) | 0x7c | geoType(int32) | ...coords... | 0xFE
 * </pre>
 * </p>
 *
 * @since udbx4spec 1.0
 * @see GaiaPointCodec
 * @see GaiaLineCodec
 * @see GaiaPolygonCodec
 */
public interface GaiaGeometryCodec {

    /**
     * 解码 GAIA BLOB 为几何对象。
     *
     * @param blob GAIA 二进制 BLOB
     * @return 解码后的几何对象
     * @throws UdbxFormatError 格式错误时抛出
     * @throws UdbxUnsupportedError 不支持的 geoType 时抛出
     */
    Geometry decode(byte[] blob) throws UdbxFormatError, UdbxUnsupportedError;

    /**
     * 编码几何对象为 GAIA BLOB。
     *
     * @param geometry 几何对象
     * @param srid 坐标系 ID
     * @return GAIA 二进制 BLOB
     * @throws UdbxFormatError 编码失败时抛出
     * @throws UdbxUnsupportedError 不支持的几何类型时抛出
     */
    byte[] encode(Geometry geometry, int srid) throws UdbxFormatError, UdbxUnsupportedError;

    /**
     * 从 BLOB 头部读取 geoType。
     *
     * @param blob GAIA 二进制 BLOB
     * @return geoType 整数值
     * @throws UdbxFormatError BLOB 太短或格式错误
     */
    static int readGeoType(byte[] blob) throws UdbxFormatError {
        throw new UnsupportedOperationException("Implementation required");
    }
}
