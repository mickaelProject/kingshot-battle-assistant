/** Default language for automated battle copy (MVP). */
export const DEFAULT_REMINDER_LOCALE = "en" as const;

export const BATTLE_SESSION_STATUS = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
  CANCELLED: "CANCELLED",
} as const;

export const REMINDER_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SENT: "SENT",
  SKIPPED: "SKIPPED",
} as const;

/** Discord hard limit; leave headroom for prefix emoji + formatting. */
export const DISCORD_MESSAGE_MAX = 2000;

/** Reminder / battle line soft cap (mobile). */
export const RECOMMENDED_ANNOUNCE_MAX = 350;

/** Max length for `/announce` user text (prefix added on send). */
export const ANNOUNCE_USER_MAX_CHARS = 1900;
