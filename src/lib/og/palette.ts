/**
 * THE TOKENS' VALUES, FOR SATORI. Share images are drawn by next/og, which cannot read CSS
 * variables; these are the values of src/styles/tokens.css, named after the tokens, and a test
 * holds them to that file so they cannot drift.
 */
export const OG = {
  bg: "#f7f5ef",
  surface: "#ffffff",
  ink: "#14161c",
  inkMuted: "#5a5d66",
  inkFaint: "#8b8e97",
  border: "#e4dfd3",
  accent: "#2b4acb",
  ok: "#15803d",
  warn: "#b45309",
} as const;

export const OG_TOKENS: Record<keyof typeof OG, string> = {
  bg: "--bg",
  surface: "--surface",
  ink: "--ink",
  inkMuted: "--ink-muted",
  inkFaint: "--ink-faint",
  border: "--border",
  accent: "--accent",
  ok: "--ok",
  warn: "--warn",
};
