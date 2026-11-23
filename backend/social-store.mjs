import "./load-env.mjs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { digestSessionToken } from "./security.mjs";
import { getObjectStorage } from "./object-storage.mjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export async function initializeSocialStore() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const name of files) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(712034)");
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (applied.rowCount === 0) {
        await client.query(await readFile(path.join(migrationsDirectory, name), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  await pool.query("DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP");
  await pool.query("DELETE FROM registration_tokens WHERE expires_at <= CURRENT_TIMESTAMP");
  await pool.query("DELETE FROM password_reset_tokens WHERE expires_at <= CURRENT_TIMESTAMP");
  await pool.query("DELETE FROM email_queue WHERE status IN ('sent', 'failed', 'skipped') AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
}

export async function createRegistrationToken({ email, tokenHash, expiresAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
    const { rowCount } = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (rowCount > 0) {
      await client.query("COMMIT");
      return false;
    }
    await client.query("DELETE FROM registration_tokens WHERE expires_at <= CURRENT_TIMESTAMP");
    await client.query(
      "INSERT INTO registration_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)",
      [tokenHash, email, expiresAt]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRegistrationToken(tokenHash) {
  await pool.query("DELETE FROM registration_tokens WHERE token_hash = $1", [tokenHash]);
}

export async function createPasswordResetToken({ email, tokenHash, expiresAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
    const { rows: users } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (users.length === 0) {
      await client.query("COMMIT");
      return null;
    }

    await client.query("DELETE FROM password_reset_tokens WHERE expires_at <= CURRENT_TIMESTAMP");
    await client.query(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [tokenHash, users[0].id, expiresAt]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePasswordResetToken(tokenHash) {
  await pool.query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [tokenHash]);
}

export async function enqueueEmail({ email, kind }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${kind}:${email}`]);
    const { rows: existing } = await client.query(
      `SELECT id, status FROM email_queue
       WHERE kind = $1 AND email = $2
         AND (status IN ('pending', 'processing') OR created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute')
       LIMIT 1`,
      [kind, email]
    );
    if (existing.length > 0) {
      await client.query("COMMIT");
      return existing[0];
    }
    const { rows } = await client.query(
      "INSERT INTO email_queue (email, kind) VALUES ($1, $2) RETURNING id, status",
      [email, kind]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function acquireEmailQueueWorkerLock() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock(712035) AS acquired");
    if (!rows[0].acquired) {
      client.release();
      return null;
    }
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function releaseEmailQueueWorkerLock(client) {
  try {
    await client.query("SELECT pg_advisory_unlock(712035)");
  } finally {
    client.release();
  }
}

export async function getEmailQueuePause() {
  const { rows } = await pool.query(
    "SELECT paused_until, pause_reason FROM email_queue_state WHERE singleton = TRUE"
  );
  const state = rows[0];
  if (!state?.paused_until) return null;
  if (new Date(state.paused_until) <= new Date()) {
    await pool.query(
      "UPDATE email_queue_state SET paused_until = NULL, pause_reason = NULL WHERE singleton = TRUE"
    );
    return null;
  }
  return state;
}

export async function getEmailQueueDeliveryStatus(id) {
  const { rows } = await pool.query(
    `SELECT q.status, q.available_at, s.paused_until, s.pause_reason
     FROM email_queue q CROSS JOIN email_queue_state s
     WHERE q.id = $1 AND s.singleton = TRUE`,
    [id]
  );
  const state = rows[0];
  if (!state) return null;
  if (["sent", "failed", "skipped"].includes(state.status)) {
    return { status: state.status };
  }
  if (state.paused_until && new Date(state.paused_until) > new Date()) {
    return { status: "paused", reason: state.pause_reason };
  }
  if (state.status === "pending" && new Date(state.available_at) > new Date()) {
    return { status: "queued" };
  }
  return { status: state.status };
}

export async function waitForEmailQueueDelivery(id, timeoutMs = 16_000) {
  const deadline = Date.now() + timeoutMs;
  let status;
  do {
    status = await getEmailQueueDeliveryStatus(id);
    if (!status || ["sent", "failed", "skipped", "paused", "queued"].includes(status.status)) {
      return status;
    }
    if (Date.now() >= deadline) return status;
    await new Promise((resolve) => setTimeout(resolve, 150));
  } while (Date.now() < deadline);
  return status;
}

export async function pauseEmailQueue(until, reason) {
  await pool.query(
    `UPDATE email_queue_state
     SET paused_until = GREATEST(COALESCE(paused_until, $1), $1), pause_reason = $2
     WHERE singleton = TRUE`,
    [until, reason]
  );
}

export async function claimNextEmail() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE email_queue SET status = 'pending', locked_at = NULL
       WHERE status = 'processing' AND locked_at < CURRENT_TIMESTAMP - INTERVAL '1 minute'`
    );
    const { rows } = await client.query(
      `SELECT id, email, kind, attempts
       FROM email_queue
       WHERE status = 'pending' AND available_at <= CURRENT_TIMESTAMP
       ORDER BY CASE WHEN kind = 'password_reset' THEN 0 ELSE 1 END, created_at, id
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    );
    if (rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }
    await client.query(
      "UPDATE email_queue SET status = 'processing', locked_at = CURRENT_TIMESTAMP WHERE id = $1",
      [rows[0].id]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeEmailQueueItem(id, status = "sent") {
  await pool.query(
    `UPDATE email_queue
     SET status = $2, sent_at = CASE WHEN $2 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
         locked_at = NULL, last_error = NULL
     WHERE id = $1`,
    [id, status]
  );
}

export async function retryEmailQueueItem(id, delayMs, error, { incrementAttempts = true } = {}) {
  await pool.query(
    `UPDATE email_queue
     SET status = 'pending', attempts = attempts + $2,
         available_at = CURRENT_TIMESTAMP + ($3::double precision * INTERVAL '1 millisecond'),
         locked_at = NULL, last_error = $4
     WHERE id = $1`,
    [id, incrementAttempts ? 1 : 0, delayMs, String(error).slice(0, 500)]
  );
}

export async function failEmailQueueItem(id, error) {
  await pool.query(
    `UPDATE email_queue
     SET status = 'failed', attempts = attempts + 1, locked_at = NULL, last_error = $2
     WHERE id = $1`,
    [id, String(error).slice(0, 500)]
  );
}

export async function completePasswordReset({ tokenHash, passwordHash, sessionToken, sessionExpiresAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: tokens } = await client.query(
      `SELECT t.user_id, u.email
       FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );
    if (tokens.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [tokens[0].email]);
    const { rows: validTokens } = await client.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );
    if (validTokens.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const userId = validTokens[0].user_id;
    const { rows } = await client.query(
      `UPDATE users SET password_hash = $1
       WHERE id = $2
       RETURNING id, display_name, email`,
      [passwordHash, userId]
    );
    await client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
    await client.query(
      "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [digestSessionToken(sessionToken), userId, sessionExpiresAt]
    );
    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
    return toUser(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeRegistration({ tokenHash, displayName, passwordHash, sessionToken, sessionExpiresAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: tokens } = await client.query(
      `SELECT email FROM registration_tokens
       WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP
      `,
      [tokenHash]
    );
    if (tokens.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [tokens[0].email]);
    const { rows: validTokens } = await client.query(
      `SELECT email FROM registration_tokens
       WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );
    if (validTokens.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const { rows } = await client.query(
      `INSERT INTO users (display_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, display_name, email`,
      [displayName, validTokens[0].email, passwordHash]
    );
    await client.query(
      "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [digestSessionToken(sessionToken), rows[0].id, sessionExpiresAt]
    );
    await client.query("DELETE FROM registration_tokens WHERE email = $1", [validTokens[0].email]);
    await client.query("COMMIT");
    return toUser(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query(
    "SELECT id, display_name, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  return rows[0] ?? null;
}

export async function createSession(userId, token, expiresAt) {
  await pool.query(
    "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [digestSessionToken(token), userId, expiresAt]
  );
}

export async function getSessionUser(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.email, u.about_me, u.city, u.interests,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id AND i.is_deleted = FALSE) AS has_avatar
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
    [digestSessionToken(token)]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function deleteSession(token) {
  if (!token) return;
  await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [digestSessionToken(token)]);
}

function toUser(row) {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email,
    aboutMe: row.about_me ?? "",
    city: row.city ?? "",
    interests: Array.isArray(row.interests) ? row.interests : [],
    avatarUrl: row.has_avatar ? `/api/users/${row.id}/avatar` : null,
  };
}

export async function updateUserProfile(userId, { name, aboutMe, city, interests, avatar }) {
  const client = await pool.connect();
  let newImageKey = null;
  let oldImageKey = null;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE users SET display_name = $2, about_me = $3, city = $4, interests = $5::jsonb
       WHERE id = $1
       RETURNING id, display_name, email, about_me, city, interests`,
      [userId, name, aboutMe, city, JSON.stringify(interests)]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    if (avatar === null) {
      const { rows: existingImages } = await client.query(
        "SELECT image_key, image_data FROM user_profile_images WHERE user_id = $1 FOR UPDATE",
        [userId]
      );
      const existing = existingImages[0];
      if (existing) {
        oldImageKey = existing.image_key;
        if (existing.image_data !== null) {
          await client.query(
            "UPDATE user_profile_images SET image_key = NULL, is_deleted = TRUE WHERE user_id = $1",
            [userId]
          );
        } else {
          await client.query("DELETE FROM user_profile_images WHERE user_id = $1", [userId]);
        }
      }
    } else if (avatar) {
      const { rows: existingImages } = await client.query(
        "SELECT image_key FROM user_profile_images WHERE user_id = $1 FOR UPDATE",
        [userId]
      );
      oldImageKey = existingImages[0]?.image_key ?? null;
      newImageKey = await getObjectStorage().putImage("avatar", avatar, userId);
      await client.query(
        `INSERT INTO user_profile_images (user_id, mime_type, image_data, byte_size, image_key, is_deleted)
         VALUES ($1, $2, NULL, $3, $4, FALSE)
         ON CONFLICT (user_id) DO UPDATE
         SET mime_type = EXCLUDED.mime_type, byte_size = EXCLUDED.byte_size,
             image_key = EXCLUDED.image_key, is_deleted = FALSE`,
        [userId, avatar.mimeType, avatar.data.length, newImageKey]
      );
    }
    const { rows: updated } = await client.query(
      `SELECT u.id, u.display_name, u.email, u.about_me, u.city, u.interests,
              EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id AND i.is_deleted = FALSE) AS has_avatar
       FROM users u WHERE u.id = $1`,
      [userId]
    );
    await client.query("COMMIT");
    if (oldImageKey && oldImageKey !== newImageKey) await removeObjectBestEffort(oldImageKey);
    return toUser(updated[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (newImageKey) await removeObjectBestEffort(newImageKey);
    throw error;
  } finally {
    client.release();
  }
}

async function removeObjectBestEffort(imageKey) {
  try {
    await getObjectStorage().deleteObject(imageKey);
  } catch {
    console.warn("Não foi possível remover um objeto R2 substituído ou removido.");
  }
}

export async function getPublicUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.about_me, u.city, u.interests,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id AND i.is_deleted = FALSE) AS has_avatar
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  return row ? {
    id: row.id,
    name: row.display_name,
    aboutMe: row.about_me,
    city: row.city ?? "",
    interests: Array.isArray(row.interests) ? row.interests : [],
    avatarUrl: row.has_avatar ? `/api/users/${row.id}/avatar` : null,
  } : null;
}

export async function getUserProfileImage(userId) {
  const { rows } = await pool.query(
    `SELECT mime_type, image_data, image_key
     FROM user_profile_images WHERE user_id = $1 AND is_deleted = FALSE`,
    [userId]
  );
  return rows[0] ? {
    mimeType: rows[0].mime_type,
    data: rows[0].image_data,
    imageKey: rows[0].image_key,
  } : null;
}

export async function searchTribes(userId, { query = "", mine = false, managed = false, limit = 40 }) {
  const { rows } = await pool.query(
    `SELECT t.id, t.name, t.description, t.category, t.format, t.city, t.neighborhood,
            t.created_at,
            COUNT(DISTINCT m.user_id)::int AS member_count,
            COALESCE(bool_or(m.user_id = $1 AND m.status = 'active'), false) AS is_member
     FROM tribes t
     LEFT JOIN tribe_memberships m ON m.tribe_id = t.id AND m.status = 'active'
     WHERE ($2::boolean = false OR EXISTS (
       SELECT 1 FROM tribe_memberships mine
       WHERE mine.tribe_id = t.id AND mine.user_id = $1 AND mine.status = 'active'
     ))
       AND ($3 = '' OR t.name ILIKE $4 OR t.description ILIKE $4 OR t.category ILIKE $4
            OR t.city ILIKE $4 OR t.neighborhood ILIKE $4)
       AND ($6::boolean = false OR t.created_by = $1)
     GROUP BY t.id
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT $5`,
    [userId, mine, query, `%${query}%`, limit, managed]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    format: row.format,
    city: row.city,
    neighborhood: row.neighborhood,
    createdAt: row.created_at,
    memberCount: row.member_count,
    isMember: row.is_member,
  }));
}

export async function createTribe(userId, tribe) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO tribes (name, description, category, format, city, neighborhood, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, category, format, city, neighborhood, created_at`,
      [tribe.name, tribe.description, tribe.category, tribe.format, tribe.city, tribe.neighborhood, userId]
    );
    await client.query(
      "INSERT INTO tribe_memberships (tribe_id, user_id) VALUES ($1, $2)",
      [rows[0].id, userId]
    );
    await client.query("COMMIT");
    return { ...rows[0], memberCount: 1, isMember: true, createdAt: rows[0].created_at };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTribe(userId, tribeId, tribe) {
  const { rows } = await pool.query(
    `UPDATE tribes
     SET name = $3, description = $4, category = $5, format = $6, city = $7, neighborhood = $8
     WHERE id = $1 AND created_by = $2
     RETURNING id, name, description, category, format, city, neighborhood, created_at`,
    [tribeId, userId, tribe.name, tribe.description, tribe.category, tribe.format, tribe.city, tribe.neighborhood]
  );
  return rows[0] ?? null;
}

export async function joinTribe(userId, tribeId) {
  const { rows } = await pool.query(
    `INSERT INTO tribe_memberships (tribe_id, user_id, status, joined_at, left_at)
     SELECT id, $2, 'active', CURRENT_TIMESTAMP, NULL FROM tribes WHERE id = $1
     ON CONFLICT (tribe_id, user_id)
     DO UPDATE SET status = 'active', joined_at = CURRENT_TIMESTAMP, left_at = NULL
     RETURNING tribe_id`,
    [tribeId, userId]
  );
  return rows.length > 0;
}

export async function leaveTribe(userId, tribeId) {
  const { rowCount } = await pool.query(
    `UPDATE tribe_memberships SET status = 'left', left_at = CURRENT_TIMESTAMP
     WHERE tribe_id = $1 AND user_id = $2 AND status = 'active'`,
    [tribeId, userId]
  );
  return rowCount > 0;
}

export async function userBelongsToTribe(userId, tribeId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM tribe_memberships
     WHERE user_id = $1 AND tribe_id = $2 AND status = 'active'`,
    [userId, tribeId]
  );
  return rowCount > 0;
}

export async function getFeed(userId, { tribeId, query, cursor, limit, savedOnly = false }) {
  if (tribeId && !(await userBelongsToTribe(userId, tribeId))) {
    const error = new Error("Você não participa desta tribo.");
    error.statusCode = 403;
    throw error;
  }
  const { rows } = await pool.query(
    `SELECT f.id, f.kind, f.body, f.created_at, f.edited_at,
            author.id AS author_id, author.display_name AS author_name,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = author.id AND i.is_deleted = FALSE) AS author_has_avatar,
            t.id AS tribe_id, t.name AS tribe_name,
            e.title AS event_title, e.starts_at, e.ends_at, e.location, e.cost, e.max_attendees,
            EXISTS (SELECT 1 FROM content_images i WHERE i.content_id = f.id) AS has_image,
            (SELECT COUNT(*) FROM content_likes l WHERE l.content_id = f.id)::int AS like_count,
            (SELECT COUNT(*) FROM content_comments c WHERE c.content_id = f.id)::int AS comment_count,
            EXISTS (SELECT 1 FROM content_likes l WHERE l.content_id = f.id AND l.user_id = $1) AS liked_by_me,
            EXISTS (SELECT 1 FROM saved_content s WHERE s.content_id = f.id AND s.user_id = $1) AS saved_by_me,
            (SELECT COUNT(*) FROM event_attendees a WHERE a.content_id = f.id)::int AS attendee_count,
            EXISTS (SELECT 1 FROM event_attendees a WHERE a.content_id = f.id AND a.user_id = $1) AS attending_by_me
     FROM feed_items f
     JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
     JOIN users author ON author.id = f.author_id
     JOIN tribes t ON t.id = f.tribe_id
     LEFT JOIN tribe_events e ON e.content_id = f.id
     WHERE ($2::uuid IS NULL OR f.tribe_id = $2)
       AND ($3::text IS NULL OR (f.body ILIKE $3 OR author.display_name ILIKE $3 OR t.name ILIKE $3 OR e.title ILIKE $3 OR e.location ILIKE $3))
       AND ($4::timestamptz IS NULL OR (f.created_at, f.id) < ($4, $5::uuid))
       AND ($7::boolean = false OR EXISTS (SELECT 1 FROM saved_content s WHERE s.content_id = f.id AND s.user_id = $1))
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $6`,
    [userId, tribeId ?? null, query ? `%${query}%` : null, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1, savedOnly]
  );
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((row) => ({
    id: row.id,
    type: row.kind,
    body: row.body,
    imageUrl: row.has_image ? `/api/content/${row.id}/image` : null,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    author: {
      id: row.author_id,
      name: row.author_name,
      avatarUrl: row.author_has_avatar ? `/api/users/${row.author_id}/avatar` : null,
    },
    tribe: { id: row.tribe_id, name: row.tribe_name },
    likesCount: row.like_count,
    commentsCount: row.comment_count,
    likedByMe: row.liked_by_me,
    savedByMe: row.saved_by_me,
    event: row.kind === "event" ? {
      title: row.event_title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      location: row.location,
      cost: row.cost,
      maxAttendees: row.max_attendees,
      attendeesCount: row.attendee_count,
      attendingByMe: row.attending_by_me,
    } : null,
  }));
  const last = pageRows.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null,
  };
}

function encodeCursor(cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt)) ||
      !/^\d{4}-\d\d-\d\dT/.test(parsed.createdAt) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id)) {
      throw new Error();
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    const error = new Error("Cursor de paginação inválido.");
    error.statusCode = 400;
    throw error;
  }
}

export async function createContent(userId, tribeId, { type, body, event, image }) {
  const client = await pool.connect();
  let imageKey = null;
  try {
    await client.query("BEGIN");
    const { rows: membership } = await client.query(
      `SELECT 1 FROM tribe_memberships
       WHERE user_id = $1 AND tribe_id = $2 AND status = 'active' FOR SHARE`,
      [userId, tribeId]
    );
    if (membership.length === 0) {
      const error = new Error("Você não participa desta tribo.");
      error.statusCode = 403;
      throw error;
    }
    const { rows } = await client.query(
      `INSERT INTO feed_items (tribe_id, author_id, kind, body)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [tribeId, userId, type, body]
    );
    if (image) {
      imageKey = await getObjectStorage().putImage("content", image);
      await client.query(
        `INSERT INTO content_images (content_id, mime_type, image_data, byte_size, image_key)
         VALUES ($1, $2, NULL, $3, $4)`,
        [rows[0].id, image.mimeType, image.data.length, imageKey]
      );
    }
    if (type === "event") {
      await client.query(
        `INSERT INTO tribe_events (content_id, title, starts_at, ends_at, location, cost, max_attendees)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rows[0].id, event.title, event.startsAt, event.endsAt, event.location, event.cost, event.maxAttendees]
      );
      await client.query(
        `INSERT INTO notifications (recipient_id, actor_id, type, content_id, tribe_id)
         SELECT m.user_id, $2, 'event_created', $1, $3
         FROM tribe_memberships m
         WHERE m.tribe_id = $3 AND m.status = 'active' AND m.user_id <> $2`,
        [rows[0].id, userId, tribeId]
      );
    }
    await client.query("COMMIT");
    imageKey = null;
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (imageKey) await removeObjectBestEffort(imageKey);
    throw error;
  } finally {
    client.release();
  }
}

export async function getContentImage(userId, contentId) {
  const { rows } = await pool.query(
    `SELECT i.mime_type, i.image_data, i.image_key
     FROM content_images i
     JOIN feed_items f ON f.id = i.content_id
     JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
     WHERE i.content_id = $2`,
    [userId, contentId]
  );
  return rows[0] ? {
    mimeType: rows[0].mime_type,
    data: rows[0].image_data,
    imageKey: rows[0].image_key,
  } : null;
}

export async function canAccessContent(userId, contentId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM feed_items f
     JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
     WHERE f.id = $2`,
    [userId, contentId]
  );
  return rowCount > 0;
}

export async function toggleLike(userId, contentId, liked) {
  if (!(await canAccessContent(userId, contentId))) return null;
  if (liked) {
    const inserted = await pool.query(
      "INSERT INTO content_likes (content_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING content_id",
      [contentId, userId]
    );
    if (inserted.rowCount > 0) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, actor_id, type, content_id, tribe_id)
         SELECT f.author_id, $2, 'post_like', f.id, f.tribe_id
         FROM feed_items f WHERE f.id = $1 AND f.author_id <> $2`,
        [contentId, userId]
      );
    }
  } else {
    await pool.query("DELETE FROM content_likes WHERE content_id = $1 AND user_id = $2", [contentId, userId]);
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count,
            EXISTS (SELECT 1 FROM content_likes WHERE content_id = $1 AND user_id = $2) AS liked
     FROM content_likes WHERE content_id = $1`,
    [contentId, userId]
  );
  return { likesCount: rows[0].count, likedByMe: rows[0].liked };
}

export async function setEventAttendance(userId, contentId, attending) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `SELECT 1 FROM feed_items f
       JOIN tribe_events e ON e.content_id = f.id
       JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
       WHERE f.id = $2 FOR SHARE OF f`,
      [userId, contentId]
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    if (attending) {
      const inserted = await client.query(
        "INSERT INTO event_attendees (content_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING content_id",
        [contentId, userId]
      );
      if (inserted.rowCount > 0) {
        await client.query(
          `INSERT INTO notifications (recipient_id, actor_id, type, content_id, tribe_id)
           SELECT f.author_id, $2, 'event_attendance', f.id, f.tribe_id
           FROM feed_items f WHERE f.id = $1 AND f.author_id <> $2`,
          [contentId, userId]
        );
      }
    } else {
      await client.query("DELETE FROM event_attendees WHERE content_id = $1 AND user_id = $2", [contentId, userId]);
    }

    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count,
              EXISTS (SELECT 1 FROM event_attendees WHERE content_id = $1 AND user_id = $2) AS attending
       FROM event_attendees WHERE content_id = $1`,
      [contentId, userId]
    );
    await client.query("COMMIT");
    return { attendeesCount: rows[0].count, attendingByMe: rows[0].attending };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listComments(userId, contentId) {
  if (!(await canAccessContent(userId, contentId))) return null;
  const { rows } = await pool.query(
    `SELECT c.id, c.body, c.created_at, c.edited_at,
            u.id AS author_id, u.display_name AS author_name,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id AND i.is_deleted = FALSE) AS author_has_avatar,
            (c.user_id = $2) AS is_mine
     FROM content_comments c JOIN users u ON u.id = c.user_id
     WHERE c.content_id = $1 ORDER BY c.created_at ASC, c.id ASC LIMIT 200`,
    [contentId, userId]
  );
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    isMine: row.is_mine,
    author: {
      id: row.author_id,
      name: row.author_name,
      avatarUrl: row.author_has_avatar ? `/api/users/${row.author_id}/avatar` : null,
    },
  }));
}

export async function addComment(userId, contentId, body) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `SELECT 1 FROM feed_items f
       JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
       WHERE f.id = $2 FOR SHARE OF f`,
      [userId, contentId]
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      return null;
    }
    const { rows } = await client.query(
      `INSERT INTO content_comments (content_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [contentId, userId, body]
    );
    await client.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, content_id, tribe_id)
       SELECT f.author_id, $2, 'post_comment', f.id, f.tribe_id
       FROM feed_items f WHERE f.id = $1 AND f.author_id <> $2`,
      [contentId, userId]
    );
    await client.query("COMMIT");
    return { ...rows[0], createdAt: rows[0].created_at, author: null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function editComment(userId, commentId, body, remove = false) {
  const { rows } = await pool.query(
    remove
      ? `DELETE FROM content_comments c USING feed_items f, tribe_memberships m
         WHERE c.id = $1 AND c.user_id = $2 AND f.id = c.content_id
           AND m.tribe_id = f.tribe_id AND m.user_id = $2 AND m.status = 'active'
         RETURNING c.id`
      : `UPDATE content_comments c SET body = $3, edited_at = CURRENT_TIMESTAMP
         FROM feed_items f, tribe_memberships m
         WHERE c.id = $1 AND c.user_id = $2 AND f.id = c.content_id
           AND m.tribe_id = f.tribe_id AND m.user_id = $2 AND m.status = 'active'
         RETURNING c.id, c.body, c.created_at, c.edited_at`,
    remove ? [commentId, userId] : [commentId, userId, body]
  );
  return rows[0] ?? null;
}

export async function checkDatabase() {
  await pool.query("SELECT 1");
}


export async function listNotifications(userId, limit = 40) {
  const { rows } = await pool.query(
    `SELECT n.id, n.type, n.content_id, n.tribe_id, n.created_at, n.read_at,
            actor.id AS actor_id, actor.display_name AS actor_name,
            t.name AS tribe_name
     FROM notifications n
     JOIN users actor ON actor.id = n.actor_id
     JOIN tribes t ON t.id = n.tribe_id
     WHERE n.recipient_id = $1
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT $2`,
    [userId, limit]
  );
  const { rows: counts } = await pool.query(
    "SELECT COUNT(*)::int AS unread_count FROM notifications WHERE recipient_id = $1 AND read_at IS NULL",
    [userId]
  );
  return {
    unreadCount: counts[0].unread_count,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      contentId: row.content_id,
      tribeId: row.tribe_id,
      tribeName: row.tribe_name,
      createdAt: row.created_at,
      readAt: row.read_at,
      actor: { id: row.actor_id, name: row.actor_name },
    })),
  };
}

export async function markNotificationRead(userId, notificationId) {
  const { rowCount } = await pool.query(
    "UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = $1 AND recipient_id = $2",
    [notificationId, userId]
  );
  return rowCount > 0;
}

export async function markAllNotificationsRead(userId) {
  const { rowCount } = await pool.query(
    "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = $1 AND read_at IS NULL",
    [userId]
  );
  return rowCount;
}


export async function toggleSavedContent(userId, contentId, saved) {
  if (!(await canAccessContent(userId, contentId))) return null;
  if (saved) {
    await pool.query("INSERT INTO saved_content (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, contentId]);
  } else {
    await pool.query("DELETE FROM saved_content WHERE user_id = $1 AND content_id = $2", [userId, contentId]);
  }
  return { savedByMe: saved };
}

export async function listTribeMembers(userId, tribeId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.about_me, u.city, m.joined_at,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id AND i.is_deleted = FALSE) AS has_avatar,
            (t.created_by = u.id) AS is_owner
     FROM tribe_memberships m
     JOIN users u ON u.id = m.user_id
     JOIN tribes t ON t.id = m.tribe_id
     WHERE m.tribe_id = $2 AND m.status = 'active'
       AND EXISTS (SELECT 1 FROM tribe_memberships viewer_membership WHERE viewer_membership.tribe_id = $2 AND viewer_membership.user_id = $1 AND viewer_membership.status = 'active')
     ORDER BY (t.created_by = u.id) DESC, u.display_name ASC
     LIMIT 200`,
    [userId, tribeId]
  );
  if (rows.length === 0 && !(await userBelongsToTribe(userId, tribeId))) return null;
  return rows.map((row) => ({
    id: row.id, name: row.display_name, aboutMe: row.about_me ?? "", city: row.city ?? "",
    joinedAt: row.joined_at, isOwner: row.is_owner,
    avatarUrl: row.has_avatar ? `/api/users/${row.id}/avatar` : null,
  }));
}

export async function listUpcomingEvents(userId, limit = 100) {
  const { rows } = await pool.query(
    `SELECT f.id, f.body, e.title, e.starts_at, e.ends_at, e.location,
            t.id AS tribe_id, t.name AS tribe_name, u.display_name AS author_name,
            (SELECT COUNT(*) FROM event_attendees a WHERE a.content_id = f.id)::int AS attendees_count,
            EXISTS (SELECT 1 FROM event_attendees a WHERE a.content_id = f.id AND a.user_id = $1) AS attending_by_me
     FROM feed_items f JOIN tribe_events e ON e.content_id = f.id
     JOIN tribes t ON t.id = f.tribe_id JOIN users u ON u.id = f.author_id
     JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
     WHERE e.starts_at >= CURRENT_TIMESTAMP ORDER BY e.starts_at ASC, f.id ASC LIMIT $2`,
    [userId, limit]
  );
  return rows.map((row) => ({
    id: row.id, body: row.body, title: row.title, startsAt: row.starts_at, endsAt: row.ends_at,
    location: row.location, tribe: { id: row.tribe_id, name: row.tribe_name }, authorName: row.author_name,
    attendeesCount: row.attendees_count, attendingByMe: row.attending_by_me,
  }));
}
