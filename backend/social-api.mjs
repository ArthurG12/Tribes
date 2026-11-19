import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword, createSessionToken, digestSessionToken } from "./security.mjs";
import { readJson, sendJson } from "./http-utils.mjs";
import { sendRegistrationEmail } from "./registration-email.mjs";
import { sendPasswordResetEmail } from "./password-reset-email.mjs";
import {
  addComment,
  completePasswordReset,
  completeRegistration,
  createContent,
  createPasswordResetToken,
  createRegistrationToken,
  createSession,
  createTribe,
  decodeCursor,
  deleteSession,
  deletePasswordResetToken,
  deleteRegistrationToken,
  editComment,
  getContentImage,
  getFeed,
  getPublicUserProfile,
  getSessionUser,
  getUserByEmail,
  getUserProfileImage,
  joinTribe,
  leaveTribe,
  listComments,
  searchTribes,
  setEventAttendance,
  toggleLike,
  updateUserProfile,
} from "./social-store.mjs";

const SESSION_COOKIE = "tribes_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const REGISTRATION_TOKEN_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_POST_PAYLOAD_SIZE = Math.ceil(MAX_IMAGE_SIZE / 3) * 4 + 64 * 1024;
const MAX_PROFILE_PAYLOAD_SIZE = MAX_POST_PAYLOAD_SIZE;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const authAttempts = new Map();
const dummyPasswordHash = hashPassword("tribes-invalid-account-password");

function parseImage(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw invalid("Imagem inválida.");
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/);
  if (!match) throw invalid("A imagem deve estar no formato JPEG, PNG ou WebP.");
  const data = Buffer.from(match[2], "base64");
  if (data.length === 0 || data.length > MAX_IMAGE_SIZE || data.toString("base64") !== match[2]) {
    throw invalid("A imagem deve ter no máximo 5 MB.");
  }
  const signatures = {
    jpeg: data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    png: data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    webp: data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP",
  };
  if (!signatures[match[1]]) throw invalid("O conteúdo do arquivo não corresponde a uma imagem válida.");
  return { data, mimeType: `image/${match[1]}` };
}

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return null;
}

function allowAuthAttempt(request) {
  const now = Date.now();
  const ip = (request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? request.socket.remoteAddress ?? "unknown").slice(0, 64);
  if (authAttempts.size > 2000) {
    for (const [key, attempt] of authAttempts) if (now - attempt.startedAt > 60_000) authAttempts.delete(key);
  }
  const attempt = authAttempts.get(ip);
  if (!attempt || now - attempt.startedAt > 60_000) {
    authAttempts.set(ip, { count: 1, startedAt: now });
    return true;
  }
  attempt.count += 1;
  return attempt.count <= 12;
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function requiredString(value, field, min, max) {
  if (typeof value !== "string") throw invalid(`Campo ${field} inválido.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw invalid(`Campo ${field} deve ter entre ${min} e ${max} caracteres.`);
  }
  return trimmed;
}

function requireUuid(value, label) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw invalid(`${label} inválido.`);
  return value;
}

function withUser(user, data = {}) {
  return { ...data, user: { id: user.id, name: user.name, email: user.email } };
}

async function authenticatedUser(request) {
  return getSessionUser(readCookie(request, SESSION_COOKIE));
}

export async function handleSocialRequest(request, response, url) {
  const { pathname } = url;
  const method = request.method ?? "GET";
  const routeKnown = pathname.startsWith("/api/auth/") ||
    pathname === "/api/profile" || /^\/api\/users\/[^/]+\/(?:profile|avatar)$/.test(pathname) ||
    pathname === "/api/feed" || pathname === "/api/tribes" ||
    /^\/api\/tribes\/[^/]+\/(?:join|membership|posts|events)$/.test(pathname) ||
    /^\/api\/content\/[^/]+\/image$/.test(pathname) ||
    /^\/api\/content\/[^/]+\/(?:like|comments|attendance)$/.test(pathname) ||
    /^\/api\/comments\/[^/]+$/.test(pathname);
  if (!routeKnown) return false;

  try {
    if (pathname === "/api/auth/me" && method === "GET") {
      return sendJson(response, 200, { user: await authenticatedUser(request) }), true;
    }

    if (pathname === "/api/auth/register" && method === "POST") {
      if (!allowAuthAttempt(request)) {
        sendJson(response, 429, { error: "Muitas tentativas. Aguarde um minuto e tente novamente." });
        return true;
      }
      const payload = await readJson(request);
      const email = requiredString(payload.email, "e-mail", 3, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid("Informe um e-mail válido.");
      const existingUser = await getUserByEmail(email);
      if (!existingUser) {
        const token = randomBytes(32).toString("base64url");
        const tokenHash = digestSessionToken(token);
        const created = await createRegistrationToken({
          email,
          tokenHash,
          expiresAt: new Date(Date.now() + REGISTRATION_TOKEN_TTL_MS),
        });
        if (created) {
          try {
            await sendRegistrationEmail(email, token);
          } catch (error) {
            await deleteRegistrationToken(tokenHash);
            throw error;
          }
        }
      }
      return sendJson(response, 202, {
        message: "Se este e-mail puder ser cadastrado, enviaremos um link para continuar.",
      }), true;
    }

    if (pathname === "/api/auth/register/complete" && method === "POST") {
      if (!allowAuthAttempt(request)) {
        sendJson(response, 429, { error: "Muitas tentativas. Aguarde um minuto e tente novamente." });
        return true;
      }
      const payload = await readJson(request);
      const token = requiredString(payload.token, "token", 20, 200);
      const name = requiredString(payload.name, "nome", 2, 80);
      if (typeof payload.password !== "string" || payload.password.length < 10 || payload.password.length > 128) {
        throw invalid("A senha deve ter entre 10 e 128 caracteres.");
      }
      const sessionToken = createSessionToken();
      let user;
      try {
        user = await completeRegistration({
          tokenHash: digestSessionToken(token),
          displayName: name,
          passwordHash: await hashPassword(payload.password),
          sessionToken,
          sessionExpiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
        });
      } catch (error) {
        if (error.code === "23505") {
          const conflict = new Error("Este e-mail já possui uma conta. Entre pela tela de login.");
          conflict.statusCode = 409;
          throw conflict;
        }
        throw error;
      }
      if (!user) throw invalid("Este link é inválido, expirou ou já foi usado. Solicite um novo link.");
      return sendJson(response, 201, withUser(user), { "Set-Cookie": sessionCookie(sessionToken) }), true;
    }

    if (pathname === "/api/auth/password-reset" && method === "POST") {
      if (!allowAuthAttempt(request)) {
        sendJson(response, 429, { error: "Muitas tentativas. Aguarde um minuto e tente novamente." });
        return true;
      }
      const payload = await readJson(request);
      const email = requiredString(payload.email, "e-mail", 3, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid("Informe um e-mail válido.");
      const token = randomBytes(32).toString("base64url");
      const tokenHash = digestSessionToken(token);
      const created = await createPasswordResetToken({
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      });
      if (created === null) {
        return sendJson(response, 404, { error: "Este e-mail não está cadastrado." }), true;
      }
      if (created) {
        try {
          await sendPasswordResetEmail(email, token);
        } catch (error) {
          await deletePasswordResetToken(tokenHash);
          throw error;
        }
      }
      return sendJson(response, 202, {
        message: "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.",
      }), true;
    }

    if (pathname === "/api/auth/password-reset/complete" && method === "POST") {
      if (!allowAuthAttempt(request)) {
        sendJson(response, 429, { error: "Muitas tentativas. Aguarde um minuto e tente novamente." });
        return true;
      }
      const payload = await readJson(request);
      const token = requiredString(payload.token, "token", 20, 200);
      if (typeof payload.password !== "string" || payload.password.length < 10 || payload.password.length > 128) {
        throw invalid("A senha deve ter entre 10 e 128 caracteres.");
      }
      const sessionToken = createSessionToken();
      const user = await completePasswordReset({
        tokenHash: digestSessionToken(token),
        passwordHash: await hashPassword(payload.password),
        sessionToken,
        sessionExpiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
      });
      if (!user) throw invalid("Este link é inválido, expirou ou já foi usado. Solicite um novo link.");
      return sendJson(response, 200, withUser(user), { "Set-Cookie": sessionCookie(sessionToken) }), true;
    }

    if (pathname === "/api/auth/login" && method === "POST") {
      if (!allowAuthAttempt(request)) {
        sendJson(response, 429, { error: "Muitas tentativas. Aguarde um minuto e tente novamente." });
        return true;
      }
      const payload = await readJson(request);
      const email = requiredString(payload.email, "e-mail", 3, 254).toLowerCase();
      if (typeof payload.password !== "string" || payload.password.length > 128) throw invalid("Credenciais inválidas.");
      const stored = await getUserByEmail(email);
      const validPassword = await verifyPassword(payload.password, stored?.password_hash ?? await dummyPasswordHash);
      if (!stored || !validPassword) {
        const error = new Error("E-mail ou senha incorretos.");
        error.statusCode = 401;
        throw error;
      }
      const user = { id: stored.id, name: stored.display_name, email: stored.email };
      const token = createSessionToken();
      await createSession(user.id, token, new Date(Date.now() + SESSION_TTL_SECONDS * 1000));
      return sendJson(response, 200, withUser(user), { "Set-Cookie": sessionCookie(token) }), true;
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      await deleteSession(readCookie(request, SESSION_COOKIE));
      return sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() }), true;
    }

    const user = await authenticatedUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Autenticação necessária." });
      return true;
    }
    if (request.headers["sec-fetch-site"] === "cross-site" && !["GET", "HEAD"].includes(method)) {
      sendJson(response, 403, { error: "Requisição cross-site não permitida." });
      return true;
    }

    if (pathname === "/api/profile" && method === "PATCH") {
      const payload = await readJson(request, {
        maxSize: MAX_PROFILE_PAYLOAD_SIZE,
        requireObject: true,
        invalidMessage: "Objeto JSON inválido.",
      });
      const name = requiredString(payload.name, "nome", 2, 80);
      if (typeof payload.aboutMe !== "string" || payload.aboutMe.trim().length > 500) {
        throw invalid("O campo sobre mim deve ter até 500 caracteres.");
      }
      const aboutMe = payload.aboutMe.trim();
      const avatar = Object.hasOwn(payload, "avatar")
        ? payload.avatar === null ? null : parseImage(payload.avatar)
        : undefined;
      const updatedUser = await updateUserProfile(user.id, { name, aboutMe, avatar });
      if (!updatedUser) {
        sendJson(response, 404, { error: "Usuário não encontrado." });
        return true;
      }
      sendJson(response, 200, { user: updatedUser });
      return true;
    }

    const publicProfileMatch = pathname.match(/^\/api\/users\/([^/]+)\/profile$/);
    if (publicProfileMatch && method === "GET") {
      const profile = await getPublicUserProfile(requireUuid(publicProfileMatch[1], "Usuário"));
      if (!profile) {
        sendJson(response, 404, { error: "Perfil não encontrado." });
        return true;
      }
      sendJson(response, 200, { profile });
      return true;
    }

    const profileAvatarMatch = pathname.match(/^\/api\/users\/([^/]+)\/avatar$/);
    if (profileAvatarMatch && method === "GET") {
      const avatar = await getUserProfileImage(requireUuid(profileAvatarMatch[1], "Usuário"));
      if (!avatar) {
        sendJson(response, 404, { error: "Foto de perfil não encontrada." });
        return true;
      }
      response.writeHead(200, {
        "Content-Type": avatar.mimeType,
        "Content-Length": avatar.data.length,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(avatar.data);
      return true;
    }

    const contentImageMatch = pathname.match(/^\/api\/content\/([^/]+)\/image$/);
    if (contentImageMatch && method === "GET") {
      const contentId = requireUuid(contentImageMatch[1], "Conteúdo");
      const image = await getContentImage(user.id, contentId);
      if (!image) {
        sendJson(response, 404, { error: "Imagem não encontrada ou sem acesso." });
        return true;
      }
      response.writeHead(200, {
        "Content-Type": image.mimeType,
        "Content-Length": image.data.length,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(image.data);
      return true;
    }

    if (pathname === "/api/feed" && method === "GET") {
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit === null ? 20 : Number(rawLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw invalid("Limite de página inválido (1–50).");
      const tribeId = url.searchParams.get("tribeId") || undefined;
      if (tribeId) requireUuid(tribeId, "Tribo");
      const result = await getFeed(user.id, {
        tribeId,
        cursor: decodeCursor(url.searchParams.get("cursor")),
        limit,
      });
      sendJson(response, 200, result);
      return true;
    }

    if (pathname === "/api/tribes" && method === "GET") {
      const query = (url.searchParams.get("q") ?? "").trim();
      if (query.length > 100) throw invalid("A busca deve ter até 100 caracteres.");
      const mine = url.searchParams.get("mine") === "true";
      const tribes = await searchTribes(user.id, { query, mine, limit: 50 });
      sendJson(response, 200, { tribes });
      return true;
    }

    if (pathname === "/api/tribes" && method === "POST") {
      const payload = await readJson(request);
      const format = payload.format;
      if (!["Presencial", "Híbrido", "Online"].includes(format)) throw invalid("Formato de tribo inválido.");
      const tribe = await createTribe(user.id, {
        name: requiredString(payload.name, "nome", 2, 80),
        description: requiredString(payload.description, "descrição", 2, 1000),
        category: requiredString(payload.category, "categoria", 2, 60),
        format,
        city: requiredString(payload.city, "cidade", 2, 100),
        neighborhood: typeof payload.neighborhood === "string" ? payload.neighborhood.trim().slice(0, 100) : "",
      });
      sendJson(response, 201, { tribe });
      return true;
    }

    const membershipMatch = pathname.match(/^\/api\/tribes\/([^/]+)\/(join|membership)$/);
    if (membershipMatch && ["POST", "DELETE"].includes(method)) {
      const tribeId = requireUuid(membershipMatch[1], "Tribo");
      const joined = method === "POST";
      const success = joined ? await joinTribe(user.id, tribeId) : await leaveTribe(user.id, tribeId);
      if (!success && joined) {
        const error = new Error("Tribo não encontrada.");
        error.statusCode = 404;
        throw error;
      }
      sendJson(response, 200, { isMember: joined });
      return true;
    }

    const contentMatch = pathname.match(/^\/api\/tribes\/([^/]+)\/(posts|events)$/);
    if (contentMatch && method === "POST") {
      const tribeId = requireUuid(contentMatch[1], "Tribo");
      const type = contentMatch[2] === "posts" ? "post" : "event";
      const payload = await readJson(request, {
        maxSize: type === "post" ? MAX_POST_PAYLOAD_SIZE : 64 * 1024,
        requireObject: true,
        invalidMessage: "Objeto JSON inválido.",
      });
      const body = requiredString(payload.body, "texto", 1, 5000);
      const image = type === "post" ? parseImage(payload.image) : null;
      let event;
      if (type === "event") {
        const startsAt = requiredString(payload.startsAt, "data do evento", 10, 40);
        if (!Number.isFinite(Date.parse(startsAt))) throw invalid("Data do evento inválida.");
        const endsAt = payload.endsAt ? requiredString(payload.endsAt, "fim do evento", 10, 40) : null;
        if (endsAt && (!Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) < Date.parse(startsAt))) {
          throw invalid("A data de término deve ser posterior ao início.");
        }
        const maxAttendees = payload.maxAttendees === "" || payload.maxAttendees == null
          ? null : Number(payload.maxAttendees);
        if (maxAttendees !== null && (!Number.isInteger(maxAttendees) || maxAttendees < 1 || maxAttendees > 10000)) {
          throw invalid("Limite de participantes inválido.");
        }
        event = {
          title: requiredString(payload.title, "título do evento", 2, 120),
          startsAt,
          endsAt,
          location: requiredString(payload.location, "local", 2, 240),
          cost: typeof payload.cost === "string" ? payload.cost.trim().slice(0, 100) : "",
          maxAttendees,
        };
      }
      const item = await createContent(user.id, tribeId, { type, body, event, image });
      sendJson(response, 201, { id: item.id, createdAt: item.created_at });
      return true;
    }

    const likeMatch = pathname.match(/^\/api\/content\/([^/]+)\/like$/);
    if (likeMatch && ["POST", "DELETE"].includes(method)) {
      const contentId = requireUuid(likeMatch[1], "Conteúdo");
      const result = await toggleLike(user.id, contentId, method === "POST");
      if (!result) {
        sendJson(response, 404, { error: "Conteúdo não encontrado ou sem acesso." });
        return true;
      }
      sendJson(response, 200, result);
      return true;
    }

    const attendanceMatch = pathname.match(/^\/api\/content\/([^/]+)\/attendance$/);
    if (attendanceMatch && ["POST", "DELETE"].includes(method)) {
      const contentId = requireUuid(attendanceMatch[1], "Evento");
      const result = await setEventAttendance(user.id, contentId, method === "POST");
      if (!result) {
        sendJson(response, 404, { error: "Evento não encontrado ou sem acesso." });
        return true;
      }
      sendJson(response, 200, result);
      return true;
    }

    const commentsMatch = pathname.match(/^\/api\/content\/([^/]+)\/comments$/);
    if (commentsMatch && ["GET", "POST"].includes(method)) {
      const contentId = requireUuid(commentsMatch[1], "Conteúdo");
      if (method === "GET") {
        const comments = await listComments(user.id, contentId);
        if (!comments) {
          sendJson(response, 404, { error: "Conteúdo não encontrado ou sem acesso." });
          return true;
        }
        sendJson(response, 200, { comments });
        return true;
      }
      const payload = await readJson(request);
      const body = requiredString(payload.body, "comentário", 1, 2000);
      const comment = await addComment(user.id, contentId, body);
      if (!comment) {
        sendJson(response, 404, { error: "Conteúdo não encontrado ou sem acesso." });
        return true;
      }
      const comments = await listComments(user.id, contentId);
      sendJson(response, 201, { comment: comments.find((entry) => entry.id === comment.id) });
      return true;
    }

    const commentMatch = pathname.match(/^\/api\/comments\/([^/]+)$/);
    if (commentMatch && ["PATCH", "DELETE"].includes(method)) {
      const commentId = requireUuid(commentMatch[1], "Comentário");
      const body = method === "PATCH" ? requiredString((await readJson(request)).body, "comentário", 1, 2000) : undefined;
      const comment = await editComment(user.id, commentId, body, method === "DELETE");
      if (!comment) {
        sendJson(response, 404, { error: "Comentário não encontrado ou sem permissão." });
        return true;
      }
      sendJson(response, 200, {
        ok: true,
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.created_at,
          editedAt: comment.edited_at,
        },
      });
      return true;
    }

    if (method !== "GET" && method !== "POST" && method !== "PATCH" && method !== "DELETE") {
      sendJson(response, 405, { error: "Método não permitido." });
      return true;
    }
    sendJson(response, 404, { error: "Rota não encontrada." });
    return true;
  } catch (error) {
    if ((error.statusCode ?? 500) >= 500) console.error("Falha na API social:", error);
    sendJson(response, error.statusCode ?? 500, {
      error: error.statusCode ? error.message : "Não foi possível concluir a operação.",
    });
    return true;
  }
}
