/**
 * Inferno-only (10 October): the D.A.V.E. Club's Sign (building 150), a free decoration whose message anyone who
 * looks at the yard can read (the game: com/monsters/subscriptions/IoSign.ts). The message travels with the sign
 * in the yard's building data ("msg"); a save keeps at most SIGN_LIMIT signs, each message plain text, one line,
 * at most SIGN_MAX characters.
 */
export const SIGN_TYPE = 150;
export const SIGN_MAX = 80;
export const SIGN_LIMIT = 10;

export const cleanSignText = (raw: unknown): string =>
  String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SIGN_MAX);

/** The signs in a yard's building data, made safe (in place). */
export const sanitizeSigns = (buildingData: unknown) => {
  if (!buildingData || typeof buildingData !== "object") return;
  let n = 0;
  const data = buildingData as Record<string, Record<string, unknown>>;
  for (const key of Object.keys(data)) {
    const b = data[key];
    if (!b || typeof b !== "object" || Number(b.t) !== SIGN_TYPE) continue;
    if (++n > SIGN_LIMIT) {
      delete data[key];
      continue;
    }
    if (b.msg != null) b.msg = cleanSignText(b.msg);
  }
};
