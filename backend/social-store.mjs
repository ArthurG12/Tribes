import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { digestSessionToken } from "./security.mjs";

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
}

export async function createRegistrationToken({ email, tokenHash, expiresAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
    await client.query("DELETE FROM registration_tokens WHERE expires_at <= CURRENT_TIMESTAMP");
    const recent = await client.query(
      `SELECT 1 FROM registration_tokens
       WHERE email = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
      [email]
    );
    if (recent.rowCount > 0) {
      await client.query("COMMIT");
      return false;
    }
    await client.query("DELETE FROM registration_tokens WHERE email = $1", [email]);
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
    const { rowCount } = await client.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
      [users[0].id]
    );
    if (rowCount > 0) {
      await client.query("COMMIT");
      return false;
    }

    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [users[0].id]);
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

export async function completePasswordReset({ tokenHash, passwordHash, sessionToken, sessionExpiresAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: tokens } = await client.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );
    if (tokens.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const userId = tokens[0].user_id;
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
    await client.query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [tokenHash]);
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
       FOR UPDATE`,
      [tokenHash]
    );
    if (tokens.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const { rows } = await client.query(
      `INSERT INTO users (display_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, display_name, email`,
      [displayName, tokens[0].email, passwordHash]
    );
    await client.query(
      "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [digestSessionToken(sessionToken), rows[0].id, sessionExpiresAt]
    );
    await client.query("DELETE FROM registration_tokens WHERE token_hash = $1", [tokenHash]);
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
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id) AS has_avatar
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
      await client.query("DELETE FROM user_profile_images WHERE user_id = $1", [userId]);
    } else if (avatar) {
      await client.query(
        `INSERT INTO user_profile_images (user_id, mime_type, image_data, byte_size)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET mime_type = EXCLUDED.mime_type, image_data = EXCLUDED.image_data, byte_size = EXCLUDED.byte_size`,
        [userId, avatar.mimeType, avatar.data, avatar.data.length]
      );
    }
    const { rows: updated } = await client.query(
      `SELECT u.id, u.display_name, u.email, u.about_me, u.city, u.interests,
              EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id) AS has_avatar
       FROM users u WHERE u.id = $1`,
      [userId]
    );
    await client.query("COMMIT");
    return toUser(updated[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPublicUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.about_me, u.city, u.interests,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id) AS has_avatar
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
    "SELECT mime_type, image_data FROM user_profile_images WHERE user_id = $1",
    [userId]
  );
  return rows[0] ? { mimeType: rows[0].mime_type, data: rows[0].image_data } : null;
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

export async function getFeed(userId, { tribeId, cursor, limit }) {
  if (tribeId && !(await userBelongsToTribe(userId, tribeId))) {
    const error = new Error("Você não participa desta tribo.");
    error.statusCode = 403;
    throw error;
  }
  const { rows } = await pool.query(
    `SELECT f.id, f.kind, f.body, f.created_at, f.edited_at,
            author.id AS author_id, author.display_name AS author_name,
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = author.id) AS author_has_avatar,
            t.id AS tribe_id, t.name AS tribe_name,
            e.title AS event_title, e.starts_at, e.ends_at, e.location, e.cost, e.max_attendees,
            EXISTS (SELECT 1 FROM content_images i WHERE i.content_id = f.id) AS has_image,
            (SELECT COUNT(*) FROM content_likes l WHERE l.content_id = f.id)::int AS like_count,
            (SELECT COUNT(*) FROM content_comments c WHERE c.content_id = f.id)::int AS comment_count,
            EXISTS (SELECT 1 FROM content_likes l WHERE l.content_id = f.id AND l.user_id = $1) AS liked_by_me,
            (SELECT COUNT(*) FROM event_attendees a WHERE a.content_id = f.id)::int AS attendee_count,
            EXISTS (SELECT 1 FROM event_attendees a WHERE a.content_id = f.id AND a.user_id = $1) AS attending_by_me
     FROM feed_items f
     JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
     JOIN users author ON author.id = f.author_id
     JOIN tribes t ON t.id = f.tribe_id
     LEFT JOIN tribe_events e ON e.content_id = f.id
     WHERE ($2::uuid IS NULL OR f.tribe_id = $2)
       AND ($3::timestamptz IS NULL OR (f.created_at, f.id) < ($3, $4::uuid))
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $5`,
    [userId, tribeId ?? null, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1]
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
      await client.query(
        `INSERT INTO content_images (content_id, mime_type, image_data, byte_size)
         VALUES ($1, $2, $3, $4)`,
        [rows[0].id, image.mimeType, image.data, image.data.length]
      );
    }
    if (type === "event") {
      await client.query(
        `INSERT INTO tribe_events (content_id, title, starts_at, ends_at, location, cost, max_attendees)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rows[0].id, event.title, event.startsAt, event.endsAt, event.location, event.cost, event.maxAttendees]
      );
    }
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getContentImage(userId, contentId) {
  const { rows } = await pool.query(
    `SELECT i.mime_type, i.image_data
     FROM content_images i
     JOIN feed_items f ON f.id = i.content_id
     JOIN tribe_memberships m ON m.tribe_id = f.tribe_id AND m.user_id = $1 AND m.status = 'active'
     WHERE i.content_id = $2`,
    [userId, contentId]
  );
  return rows[0] ? { mimeType: rows[0].mime_type, data: rows[0].image_data } : null;
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
    await pool.query(
      "INSERT INTO content_likes (content_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [contentId, userId]
    );
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
      await client.query(
        "INSERT INTO event_attendees (content_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [contentId, userId]
      );
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
            EXISTS (SELECT 1 FROM user_profile_images i WHERE i.user_id = u.id) AS author_has_avatar,
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
