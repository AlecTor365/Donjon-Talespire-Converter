/**
 * Streamlined TaleSpire v1 Slab Encoder
 */

const TalespireSlabs = (() => {
  'use strict';

  // Byte-order mapping to convert a standard 32-char hex UUID string into
  // Microsoft's mixed-endian 16-byte .NET System.Guid struct layout:
  // - Bytes 0..3:  reversed (uint32 little-endian)
  // - Bytes 4..5:  reversed (uint16 little-endian)
  // - Bytes 6..7:  reversed (uint16 little-endian)
  // - Bytes 8..15: unchanged (big-endian byte array)
  const GUID_BYTE_ORDER = [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15];

  /**
   * Converts a UUID string (e.g. "940d013f-c982-43e7-922a-0317cc1c74db")
   * into a 16-byte Uint8Array arranged in .NET System.Guid binary order.
   */
  function uuidToGuidBytes(nguid) {
    const cleanHex = nguid.replace(/[- ]/g, '');
    const rawBytes = new Uint8Array(16);

    for (let i = 0; i < 16; i++) {
      rawBytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
    }

    const guidBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      guidBytes[i] = rawBytes[GUID_BYTE_ORDER[i]];
    }
    return guidBytes;
  }

  /**
   * Serializes an array of asset layout groups into a TaleSpire clipboard string.
   *
   * @param {Array<{nguid: string, assets: Array<{rotation: number, bounds: {center: {x: number, y: number, z: number}, extents: {x: number, y: number, z: number}}}>}>} layouts
   * @returns {string} Gzip-compressed, Base64-encoded slab wrapped in triple backticks.
   */
  function CreateSlab(layouts = []) {
    // 1. Count total placed assets to allocate the exact binary buffer size needed:
    //    - 8 bytes:  Slab header (4B magic number + 2B version + 2B layout count)
    //    - 20 bytes per layout: 16B GUID + 2B asset count + 2B struct alignment padding
    //    - 28 bytes per asset:  12B center + 12B extents + 1B signed rotation + 3B padding
    //    - 28 bytes: Overall slab bounding box (12B union center + 12B union extents + 4B padding)
    let totalAssets = 0;
    for (let i = 0; i < layouts.length; i++) {
      totalAssets += layouts[i].assets.length;
    }

    const totalByteLength = 8 + (layouts.length * 20) + (totalAssets * 28) + 28;
    const buffer = new ArrayBuffer(totalByteLength);
    const view = new DataView(buffer);
    let ptr = 0;

    // 2. Write 8-byte Header (all values little-endian)
    view.setUint32(ptr, 0xD1CEFACE, true)
    ptr += 4;
    view.setUint16(ptr, 1, true);          // Slab format version 1
    ptr += 2;
    view.setUint16(ptr, layouts.length, true);
    ptr += 2;

    // 3. Write Layout Table of Contents (20 bytes per unique asset group)
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i];
      const guidBytes = uuidToGuidBytes(layout.nguid);

      for (let b = 0; b < 16; b++) {
        view.setUint8(ptr + b, guidBytes[b]);
      }
      ptr += 16;

      view.setUint16(ptr, layout.assets.length, true);
      ptr += 4; // 2 bytes for asset count + 2 bytes of zero padding
    }

    // 4. Write Individual Asset Placements (28 bytes each) & Track Global Bounding Box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < layouts.length; i++) {
      const assets = layouts[i].assets;

      for (let j = 0; j < assets.length; j++) {
        const asset = assets[j];
        const center = asset.bounds.center;
        const extents = asset.bounds.extents;

        // Center (X, Y, Z) - 12 bytes
        view.setFloat32(ptr, center.x, true);
        view.setFloat32(ptr + 4, center.y, true);
        view.setFloat32(ptr + 8, center.z, true);
        ptr += 12;

        // Extents / Half-Size (X, Y, Z) - 12 bytes
        view.setFloat32(ptr, extents.x, true);
        view.setFloat32(ptr + 4, extents.y, true);
        view.setFloat32(ptr + 8, extents.z, true);
        ptr += 12;

        // Rotation - 1 signed byte (-12 to +12 in 15-degree steps) + 3 bytes of zero padding
        view.setInt8(ptr, asset.rotation);
        ptr += 4;

        // Expand global Axis-Aligned Bounding Box (AABB)
        if (center.x - extents.x < minX) minX = center.x - extents.x;
        if (center.y - extents.y < minY) minY = center.y - extents.y;
        if (center.z - extents.z < minZ) minZ = center.z - extents.z;

        if (center.x + extents.x > maxX) maxX = center.x + extents.x;
        if (center.y + extents.y > maxY) maxY = center.y + extents.y;
        if (center.z + extents.z > maxZ) maxZ = center.z + extents.z;
      }
    }

    // 5. Write Overall Slab Bounding Box (24 bytes + 4 trailing zero-padding bytes)
    if (totalAssets > 0) {
      view.setFloat32(ptr, 0.5 * (minX + maxX), true);
      view.setFloat32(ptr + 4, 0.5 * (minY + maxY), true);
      view.setFloat32(ptr + 8, 0.5 * (minZ + maxZ), true);
      view.setFloat32(ptr + 12, 0.5 * (maxX - minX), true);
      view.setFloat32(ptr + 16, 0.5 * (maxY - minY), true);
      view.setFloat32(ptr + 20, 0.5 * (maxZ - minZ), true);
    }
    ptr += 28;

    // 6. Compress with Gzip (pako) and encode to Base64 wrapped in triple backticks
    const gzBytes = pako.gzip(buffer);
    let binaryString = '';
    for (let i = 0; i < gzBytes.length; i++) {
      binaryString += String.fromCharCode(gzBytes[i]);
    }

    return '```' + btoa(binaryString) + '```';
  }

  return { CreateSlab };
})();