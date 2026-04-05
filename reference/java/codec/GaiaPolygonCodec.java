package com.supermap.udbx.codec;

import com.supermap.udbx.exception.UdbxFormatError;
import com.supermap.udbx.feature.MultiPolygonGeometry;

/**
 * GAIA 面编解码器。
 *
 * <p>支持 geoType：</p>
 * <ul>
 *   <li>6 - GAIAMultiPolygon (2D)</li>
 *   <li>1006 - GAIAMultiPolygonZ (3D)</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 * @see GaiaGeometryCodec
 */
public interface GaiaPolygonCodec {

    /**
     * 解码 2D 多边形。
     *
     * @param blob GAIA BLOB (geoType=6)
     * @return 多边形几何
     * @throws UdbxFormatError 格式错误
     */
    MultiPolygonGeometry readMultiPolygon(byte[] blob) throws UdbxFormatError;

    /**
     * 解码 3D 多边形。
     *
     * @param blob GAIA BLOB (geoType=1006)
     * @return 多边形几何
     * @throws UdbxFormatError 格式错误
     */
    MultiPolygonGeometry readMultiPolygonZ(byte[] blob) throws UdbxFormatError;

    /**
     * 编码 2D 多边形。
     *
     * @param geometry 多边形几何
     * @param srid 坐标系 ID
     * @return GAIA BLOB (geoType=6)
     * @throws UdbxFormatError 编码失败
     */
    byte[] writeMultiPolygon(MultiPolygonGeometry geometry, int srid) throws UdbxFormatError;

    /**
     * 编码 3D 多边形。
     *
     * @param geometry 多边形几何
     * @param srid 坐标系 ID
     * @return GAIA BLOB (geoType=1006)
     * @throws UdbxFormatError 编码失败
     */
    byte[] writeMultiPolygonZ(MultiPolygonGeometry geometry, int srid) throws UdbxFormatError;
}
