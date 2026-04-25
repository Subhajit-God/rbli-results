// Shared input sanitization & validation helpers used across all forms.
// Keep these pure — UI calls them on change/submit, server re-validates independently.

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export const MAX_LENGTHS = {
  studentId: 40,
  email: 254,
  password: 128,
  name: 100,
  generic: 255,
} as const;

export function sanitizeStudentId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, MAX_LENGTHS.studentId);
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase().replace(CONTROL_CHARS, "").slice(0, MAX_LENGTHS.email);
}

export function sanitizePassword(value: string): string {
  return value.replace(CONTROL_CHARS, "").slice(0, MAX_LENGTHS.password);
}

export function sanitizeClassNumber(value: string | number): string {
  const n = typeof value === "number" ? value : parseInt(value, 10);
  if ([5, 6, 7, 8, 9].includes(n)) return String(n);
  return "";
}

export function sanitizeName(value: string): string {
  return value.replace(CONTROL_CHARS, "").trim().slice(0, MAX_LENGTHS.name);
}

export function sanitizeGenericText(value: string, max: number = MAX_LENGTHS.generic): string {
  return value.replace(CONTROL_CHARS, "").slice(0, max);
}

export const isValidStudentId = (v: string): boolean =>
  /^[A-Za-z0-9_-]{1,40}$/.test(v);

export const isValidEmail = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= MAX_LENGTHS.email;
