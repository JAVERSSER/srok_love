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

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Password must contain letters and numbers.";
  return null;
}
