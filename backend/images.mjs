import { fileTypeFromBuffer } from "file-type";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_DATA_URL_SIZE = Math.ceil(MAX_IMAGE_SIZE / 3) * 4 + 64 * 1024;

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_IMAGE_DIMENSION = 4096;
const MAX_IMAGE_PIXELS = 16_777_216;

function imageDimensions(data, mimeType) {
  if (mimeType === "image/png") {
    if (data.length < 24) return null;
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (data[offset] === 0xff) offset += 1;
      const marker = data[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > data.length) return null;
      const segmentLength = data.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > data.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (segmentLength < 7) return null;
        return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5) };
      }
      offset += segmentLength;
    }
    return null;
  }

  if (mimeType === "image/webp" && data.length >= 30) {
    const chunk = data.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return {
        width: 1 + data.readUIntLE(24, 3),
        height: 1 + data.readUIntLE(27, 3),
      };
    }
    if (chunk === "VP8L" && data[20] === 0x2f) {
      const bits = data.readUInt32LE(21);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >> 14) & 0x3fff),
      };
    }
    if (chunk === "VP8 " && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
      return {
        width: data.readUInt16LE(26) & 0x3fff,
        height: data.readUInt16LE(28) & 0x3fff,
      };
    }
  }
  return null;
}

export async function parseImage(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw invalid("Imagem inválida.");

  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/);
  if (!match) throw invalid("A imagem deve estar no formato JPEG, PNG ou WebP.");

  const data = Buffer.from(match[2], "base64");
  if (data.length === 0 || data.length > MAX_IMAGE_SIZE || data.toString("base64") !== match[2]) {
    throw invalid("A imagem deve ter no máximo 5 MB.");
  }

  const detected = await fileTypeFromBuffer(data);
  const declaredMimeType = `image/${match[1]}`;
  if (!detected || !acceptedMimeTypes.has(detected.mime) || detected.mime !== declaredMimeType) {
    throw invalid("O conteúdo do arquivo não corresponde a uma imagem JPEG, PNG ou WebP válida.");
  }

  const dimensions = imageDimensions(data, detected.mime);
  if (!dimensions || !Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) ||
    dimensions.width < 1 || dimensions.height < 1 ||
    dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    throw invalid("A imagem possui dimensões inválidas ou excede o limite de 4096 × 4096 pixels.");
  }

  return { data, mimeType: detected.mime, width: dimensions.width, height: dimensions.height };
}

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
