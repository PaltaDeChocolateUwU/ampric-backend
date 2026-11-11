export function esCorreoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

export function errorContrasena(p: string): string | null {
  if (p.length < 8) return "Usa al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Debe incluir letras y números.";
  return null;
}

export type NivelClave = "debil" | "media" | "fuerte";

export function nivelContrasena(p: string): NivelClave {
  let puntos = 0;
  if (p.length >= 8) puntos++;
  if (p.length >= 12) puntos++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) puntos++;
  if (/\d/.test(p)) puntos++;
  if (/[^A-Za-z0-9]/.test(p)) puntos++;
  return puntos <= 2 ? "debil" : puntos <= 3 ? "media" : "fuerte";
}

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Aún no confirmas tu correo. Revisa tu bandeja e ingresa el código que te enviamos.",
  user_already_exists: "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.",
  email_exists: "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.",
  weak_password: "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.",
  over_email_send_rate_limit: "Se enviaron demasiados correos. Espera un momento e inténtalo de nuevo.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos.",
  otp_expired: "El código venció o no es válido. Pide uno nuevo.",
  same_password: "La nueva contraseña debe ser distinta a la anterior.",
  signup_disabled: "Los registros están desactivados por ahora.",
  email_address_not_authorized:
    "No se pudo enviar el correo a esta dirección: el servicio de correo del proyecto todavía está en modo de pruebas.",
};

type ErrorAuth = { code?: string; message?: string } | null | undefined;

export function traducirError(e: ErrorAuth): string {
  if (!e) return "";
  if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code];
  const m = (e.message ?? "").toLowerCase();
  if (m.includes("network") || m.includes("fetch")) return "No hay conexión con el servidor. Revisa tu internet.";
  if (m.includes("invalid login credentials")) return POR_CODIGO.invalid_credentials;
  if (m.includes("expired or is invalid")) return POR_CODIGO.otp_expired;
  if (m.includes("not authorized")) return POR_CODIGO.email_address_not_authorized;
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}