package com.supermap.udbx.codec;

import com.supermap.udbx.exception.UdbxFormatError;
import com.supermap.udbx.feature.MultiLineStringGeometry;

/**
 * GAIA 线编解码器。
 *
 * <p>支持 geoType：</p>
 * <ul>
 *   <li>5 - GAIAMultiLineString (2D)</li>
 *   <li>1005 - GAIAMultiLineStringZ (3D)</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 * @see GaiaGeometryCodec
 */
public interface GaiaLineCodec {

    /**
     * 解码 2D 多线。
     *
     * @param blob GAIA BLOB (geoType=5)
     * @return 多线几何
     * @throws UdbxFormatError 格式错误
     */
    MultiLineStringGeometry readMultiLineString(byte[] blob) throws UdbxFormatError;

    /**
     * 解码 3D 多线。
     *
     * @param blob GAIA BLOB (geoType=1005)
     * @return 多线几何
     * @throws UdbxFormatError 格式错误
     */
    MultiLineStringGeometry readMultiLineStringZ(byte[] blob) throws UdbxFormatError;

    /**
     * 编码 2D 多线。
     *
     * @param geometry 多线几何
     * @param srid 坐标系 ID
     * @return GAIA BLOB (geoType=5)
     * @throws UdbxFormatError 编码失败
     */
    byte[] writeMultiLineString(MultiLineStringGeometry geometry, int srid) throws UdbxFormatError;

    /**
     * 编码 3D 多线。
     *
     * @param geometry 多线几何
     * @param srid 坐标系 ID
     * @return GAIA BLOB (geoType=1005)
     * @throws UdbxFormatError 编码失败
     */
    byte[] writeMultiLineStringZ(MultiLineStringGeometry geometry, int srid) throws UdbxFormatError;
}
