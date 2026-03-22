import type { BattlePhaseTypeDto } from "./battle-phase.js";
import { BATTLE_SESSION_STATUS, REMINDER_STATUS } from "./constants.js";

export type BattleSessionStatus =
  (typeof BATTLE_SESSION_STATUS)[keyof typeof BATTLE_SESSION_STATUS];

export type ReminderStatus =
  (typeof REMINDER_STATUS)[keyof typeof REMINDER_STATUS];

/** Portable DTO for future dashboard / API (event manager). */
export interface BattleTemplateEventDto {
  id: string;
  offsetSeconds: number;
  key: string;
  phaseType: BattlePhaseTypeDto;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  orderIndex: number;
}

export interface BattleTemplateDto {
  id: string;
  guildId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  events: BattleTemplateEventDto[];
}
