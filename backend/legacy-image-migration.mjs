import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { getObjectStorage } from "./object-storage.mjs";

const supportedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function transferLegacyImageRow(pool, { table, id, storage = getObjectStorage() }) {
  const target = table === "content_images"
    ? {
        select: "SELECT content_id AS id, mime_type, image_data, image_key FROM content_images WHERE content_id = $1",
        update: "UPDATE content_images SET image_key = $1, mime_type = $3 WHERE content_id = $2 AND image_key IS NULL AND image_data = $4",
        prefix: "legacy/content",
      }
    : table === "user_profile_images"
      ? {
          select: "SELECT user_id AS id, mime_type, image_data, image_key FROM user_profile_images WHERE user_id = $1 AND is_deleted = FALSE",
          update: "UPDATE user_profile_images SET image_key = $1, mime_type = $3 WHERE user_id = $2 AND image_key IS NULL AND image_data = $4 AND is_deleted = FALSE",
          prefix: "legacy/avatars",
        }
      : null;
  if (!target) throw new Error("Tabela de imagens inválida.");

  const { rows } = await pool.query(target.select, [id]);
  const row = rows[0];
  if (!row || row.image_key || !row.image_data) return { transferred: false, imageKey: row?.image_key ?? null };

  const data = Buffer.from(row.image_data);
  const detected = await fileTypeFromBuffer(data);
  const extension = supportedTypes.get(detected?.mime);
  if (!extension || data.length > 5 * 1024 * 1024) {
    throw new Error(`Imagem legada inválida para transferência (${table}, ${id}).`);
  }

  const mimeType = detected.mime;
  const hash = createHash("sha256").update(data).digest("hex");
  const imageKey = `${target.prefix}/${id}/${hash}.${extension}`;
  await storage.putObject(imageKey, data, mimeType);

  const remote = await storage.getObject(imageKey);
  const remoteHash = createHash("sha256").update(remote.data).digest("hex");
  if (remote.data.length !== data.length || remoteHash !== hash || remote.mimeType !== mimeType) {
    throw new Error(`A verificação da imagem no armazenamento falhou (${table}, ${id}).`);
  }

  const { rowCount } = await pool.query(target.update, [imageKey, id, mimeType, row.image_data]);
  return { transferred: rowCount === 1, imageKey: rowCount === 1 ? imageKey : null };
}

export async function transferAllLegacyImages(pool, { storage = getObjectStorage(), batchSize = 50 } = {}) {
  const result = { content: 0, avatars: 0 };

  for (;;) {
    const { rows } = await pool.query(
      `SELECT content_id AS id FROM content_images WHERE image_key IS NULL ORDER BY content_id LIMIT $1`,
      [batchSize]
    );
    if (rows.length === 0) break;
    for (const row of rows) {
      if ((await transferLegacyImageRow(pool, { table: "content_images", id: row.id, storage })).transferred) {
        result.content += 1;
      }
    }
  }

  for (;;) {
    const { rows } = await pool.query(
      `SELECT user_id AS id FROM user_profile_images
       WHERE image_key IS NULL AND is_deleted = FALSE ORDER BY user_id LIMIT $1`,
      [batchSize]
    );
    if (rows.length === 0) break;
    for (const row of rows) {
      if ((await transferLegacyImageRow(pool, { table: "user_profile_images", id: row.id, storage })).transferred) {
        result.avatars += 1;
      }
    }
  }

  return result;
}
