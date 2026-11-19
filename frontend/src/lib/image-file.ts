const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export type ImageFileErrorCode = "unsupported-type" | "too-large" | "read-failed";

export class ImageFileError extends Error {
  constructor(public readonly code: ImageFileErrorCode) {
    super(code);
    this.name = "ImageFileError";
  }
}

export function readImageAsDataUrl(file: File, maxSize = DEFAULT_MAX_IMAGE_SIZE): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new ImageFileError("unsupported-type"));
  }
  if (file.size > maxSize) {
    return Promise.reject(new ImageFileError("too-large"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new ImageFileError("read-failed"));
    };
    reader.onerror = () => reject(new ImageFileError("read-failed"));
    reader.readAsDataURL(file);
  });
}
