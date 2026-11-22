import { fileTypeFromBuffer } from "file-type";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_DATA_URL_SIZE = Math.ceil(MAX_IMAGE_SIZE / 3) * 4 + 64 * 1024;

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  return { data, mimeType: detected.mime };
}

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
