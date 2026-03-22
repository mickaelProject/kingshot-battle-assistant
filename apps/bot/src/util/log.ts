type Fields = Record<string, string | number | undefined>;

function fmt(fields?: Fields): string {
  if (!fields) return "";
  const parts = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (parts.length === 0) return "";
  return ` ${parts.map(([k, v]) => `${k}=${v}`).join(" ")}`;
}

/** Concise structured-ish logs for ops. */
export const log = {
  info(scope: string, msg: string, fields?: Fields): void {
    console.log(`[kingshot:${scope}] ${msg}${fmt(fields)}`);
  },
  warn(scope: string, msg: string, fields?: Fields): void {
    console.warn(`[kingshot:${scope}] ${msg}${fmt(fields)}`);
  },
  error(scope: string, msg: string, fields?: Fields): void {
    console.error(`[kingshot:${scope}] ${msg}${fmt(fields)}`);
  },
};
