export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_HINT = "Mínimo de 6 caracteres, com pelo menos 1 letra maiúscula e 1 caractere especial (como ! @ # $ ou -).";

// Mesma regra do backend (backend/security.mjs). Vale apenas para criar ou
// redefinir senha. O login não valida, para não bloquear contas antigas.
export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  if (!/\p{Lu}/u.test(password)) return "A senha deve ter pelo menos uma letra maiúscula.";
  if (!/[^\p{L}\p{N}\s]/u.test(password)) return "A senha deve ter pelo menos um caractere especial, como ! @ # $ ou -.";
  return null;
}
