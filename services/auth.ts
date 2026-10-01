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

// Expects YYYY-MM-DD, the format the backend's date_of_birth field takes.
export function validateDateOfBirth(dob: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return "Use the format YYYY-MM-DD, e.g. 2002-05-14.";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
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
