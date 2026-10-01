// Client-side checks so the user gets instant feedback. The backend is the
// source of truth and may reject values these allow.

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3) return "Username must be at least 3 characters.";
  if (u.length > 20) return "Username must be 20 characters or fewer.";
  if (!/^[a-zA-Z0-9_.]+$/.test(u))
    return "Use only letters, numbers, dots and underscores.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  return null;
}

// Accepts local (012 345 678) or international (+855 12 345 678) numbers;
// spaces and dashes are ignored.
export function validatePhoneNumber(phone: string): string | null {
  const p = phone.replace(/[\s-]/g, "");
  if (!/^\+?\d{8,15}$/.test(p)) return "Enter a valid phone number, e.g. 012 345 678.";
  return null;
}

// Formats raw input as DD/MM/YYYY while the user types, inserting the slashes.
export function formatDateOfBirthInput(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Converts DD/MM/YYYY to YYYY-MM-DD, the format the backend's date_of_birth
// field takes. Returns null if the input isn't in DD/MM/YYYY form.
export function dateOfBirthToIso(dob: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// Expects DD/MM/YYYY.
export function validateDateOfBirth(dob: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob.trim());
  if (!m) return "Use the format DD/MM/YYYY, e.g. 14/05/2002.";
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
    return "That date doesn't exist.";
  const now = new Date();
  const age = now.getFullYear() - y - (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d) ? 1 : 0);
  if (age < 18) return "You must be at least 18 to use SrokLove.";
  if (age > 100) return "Please check your date of birth.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Password must contain letters and numbers.";
  return null;
}
