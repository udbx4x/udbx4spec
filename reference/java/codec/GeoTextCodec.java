package com.supermap.udbx.codec;

import com.supermap.udbx.exception.UdbxFormatError;
import com.supermap.udbx.exception.UdbxUnsupportedError;
import com.supermap.udbx.feature.TextGeometry;

/**
 * GeoText 编解码器。
 *
 * <p>用于 Text 数据集 SmGeometry 中的 GeoText BLOB。二进制布局见
 * docs/07-geotext-binary-layout.md。</p>
 *
 * @since udbx4spec 1.0
 */
public interface GeoTextCodec {

    TextGeometry decode(byte[] blob) throws UdbxFormatError, UdbxUnsupportedError;

    byte[] encode(TextGeometry geometry) throws UdbxFormatError, UdbxUnsupportedError;
}
