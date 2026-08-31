/**
 * Lightweight phone/email validation for the settings forms. Deliberately not
 * libphonenumber — these are two optional contact fields, and UK councils plus
 * the occasional international number are the whole of the input space.
 *
 * Shared by the client forms (inline errors) and the API routes (400s), so it
 * must stay free of `server-only` and of browser globals.
 */

export const PHONE_PLACEHOLDER = "07123 456789 or +44 7123 456789";
export const PHONE_ERROR = "Enter a UK number like 07123 456789, or an international number like +44 7123 456789.";
export const EMAIL_ERROR = "Enter a valid email address.";

/** Characters a user may type into a phone field. */
const PHONE_INPUT_ALLOWED = /[^0-9+\-() ]/g;

/** Strip formatting so the value can be length-checked. */
export function normalisePhone(input: string): string {
  return input.replace(/[\s\-().]/g, "");
}

/** Filter a keystroke stream down to characters that belong in a phone number. */
export function sanitisePhoneInput(input: string): string {
  // A leading "+" is allowed; any later one is not.
  const cleaned = input.replace(PHONE_INPUT_ALLOWED, "");
  const leadingPlus = cleaned.startsWith("+") ? "+" : "";
  return leadingPlus + cleaned.replace(/\+/g, "");
}

/** Empty is valid — phone is optional everywhere it is used. */
export function isValidPhone(input: string | null | undefined): boolean {
  const value = normalisePhone((input ?? "").trim());
  if (!value) return true;
  if (value.startsWith("+")) return /^\+[1-9]\d{6,14}$/.test(value);
  return /^0\d{9,10}$/.test(value);
}

/** Empty is valid — contact email is optional. */
export function isValidEmail(input: string | null | undefined): boolean {
  const value = (input ?? "").trim();
  if (!value) return true;
  return /^\S+@\S+\.\S+$/.test(value);
}
