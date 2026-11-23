import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

// Regra para NOVAS senhas (cadastro e redefinição). O login não usa esta regra,
// para que contas criadas com a política anterior continuem entrando normalmente.
export function passwordPolicyError(password) {
  if (typeof password !== "string") return "Informe uma senha.";
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  if (!/\p{Lu}/u.test(password)) return "A senha deve ter pelo menos uma letra maiúscula.";
  if (!/[^\p{L}\p{N}\s]/u.test(password)) return "A senha deve ter pelo menos um caractere especial, como ! @ # $ ou -.";
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, saltText, keyText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (expected.length !== PASSWORD_KEY_LENGTH) return false;
    const actual = await scrypt(password, salt, expected.length, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function digestSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
