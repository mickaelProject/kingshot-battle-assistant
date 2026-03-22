"use client";

import type { ManagedEventStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

const BADGE_KEYS = [
  "SCHEDULED",
  "STARTING",
  "ACTIVE",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export function StatusBadge({
  status,
}: {
  status: ManagedEventStatus | string;
}) {
  const t = useTranslations("runs.badges");
  const s = String(status);
  const cls = `status-badge status-badge--${s.toLowerCase()}`;
  const label = (BADGE_KEYS as readonly string[]).includes(s)
    ? t(s as (typeof BADGE_KEYS)[number])
    : s;
  return <span className={cls}>{label}</span>;
}
