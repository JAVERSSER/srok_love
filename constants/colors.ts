export const colors = {
  primary: "#E7275E",
  primaryDark: "#C21048",
  primarySoft: "#FCE7EE",
  accent: "#F5A623",
  blue: "#3B9DF8",

  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F7F9",

  text: "#1A1A1E",
  textSecondary: "#6B6B76",
  textTertiary: "#9A9AA5",

  border: "#ECECF0",
  divider: "#F1F1F4",

  success: "#2FBF71",
  danger: "#E74C3C",
  warning: "#F5A623",

  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0,0,0,0.45)",

  pass: "#F0506E",
  like: "#2FBF71",
} as const;

export type ColorKey = keyof typeof colors;
