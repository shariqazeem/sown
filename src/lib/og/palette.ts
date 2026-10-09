/**
 * THE TOKENS' VALUES, FOR SATORI. Share images are drawn by next/og, which cannot read CSS
 * variables; these are the values of src/styles/tokens.css, named after the tokens, and a test
 * holds them to that file so they cannot drift.
 */
export const OG = {
  bg: "#f6f2ea",
  surface: "#ffffff",
  ink: "#10261c",
  inkMuted: "#4d5f56",
  inkFaint: "#7d8d85",
  border: "#e7e1d4",
  brand: "#0f3f2f",
  leaf: "#35c47f",
  gold: "#e0a63a",
  goldInk: "#7a5212",
  goldSoft: "#fbf1da",
  ok: "#167a4b",
  warn: "#a35f06",
  surfaceInverse: "#0b2a1f",
} as const;

export const OG_TOKENS: Record<keyof typeof OG, string> = {
  bg: "--bg",
  surface: "--surface",
  ink: "--ink",
  inkMuted: "--ink-muted",
  inkFaint: "--ink-faint",
  border: "--border",
  brand: "--brand",
  leaf: "--leaf",
  gold: "--gold",
  goldInk: "--gold-ink",
  goldSoft: "--gold-soft",
  ok: "--ok",
  warn: "--warn",
  surfaceInverse: "--surface-inverse",
};
