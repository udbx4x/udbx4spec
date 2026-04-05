package com.supermap.udbx.codec;

import com.supermap.udbx.exception.UdbxFormatError;
import com.supermap.udbx.feature.PointGeometry;

/**
 * GAIA 点编解码器。
 *
 * <p>支持 geoType：</p>
 * <ul>
 *   <li>1 - GAIAPoint (2D)</li>
 *   <li>1001 - GAIAPointZ (3D)</li>
 * </ul>
 *
 * @since udbx4spec 1.0
 * @see GaiaGeometryCodec
 */
public interface GaiaPointCodec {

    /**
     * 解码 2D 点。
     *
     * @param blob GAIA BLOB (geoType=1)
     * @return 点几何
     * @throws UdbxFormatError 格式错误
     */
    PointGeometry readPoint(byte[] blob) throws UdbxFormatError;

    /**
     * 解码 3D 点。
     *
     * @param blob GAIA BLOB (geoType=1001)
     * @return 点几何
     * @throws UdbxFormatError 格式错误
     */
    PointGeometry readPointZ(byte[] blob) throws UdbxFormatError;

    /**
     * 编码 2D 点。
     *
     * @param geometry 点几何
     * @param srid 坐标系 ID
     * @return GAIA BLOB (geoType=1)
     * @throws UdbxFormatError 编码失败
     */
    byte[] writePoint(PointGeometry geometry, int srid) throws UdbxFormatError;

    /**
     * 编码 3D 点。
     *
     * @param geometry 点几何
     * @param srid 坐标系 ID
     * @return GAIA BLOB (geoType=1001)
     * @throws UdbxFormatError 编码失败
     */
    byte[] writePointZ(PointGeometry geometry, int srid) throws UdbxFormatError;
}
