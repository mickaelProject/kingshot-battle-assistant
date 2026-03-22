"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LivePlayerPhaseDTO,
  LivePlayerViewDTO,
} from "@/lib/live-player-payload";
import type { BattlePhaseType, ManagedEventStatus } from "@prisma/client";

function formatShortDuration(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const sec = s % 60;
  const min = m % 60;
  if (h > 0) return `${h}h ${min}m`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function phaseCopy(
  p: LivePlayerPhaseDTO | null,
  missionTitle: string,
  runStatus: ManagedEventStatus,
  t: (key: string, values?: Record<string, string | number>) => string,
): { title: string; objective: string; action: string } {
  if (!p) {
    return { title: "—", objective: "—", action: "—" };
  }
  if (p.syntheticUi === "scheduled") {
    return {
      title: t("synthetic.scheduled.title", { mission: missionTitle }),
      objective: t("synthetic.scheduled.objective"),
      action: t("synthetic.scheduled.action"),
    };
  }
  if (p.syntheticUi === "starting") {
    return {
      title: t("synthetic.starting.title"),
      objective: t("synthetic.starting.objective"),
      action: t("synthetic.starting.action"),
    };
  }
  if (p.syntheticUi === "ended") {
    const objective =
      runStatus === "COMPLETED"
        ? t("synthetic.ended.objectiveCompleted")
        : runStatus === "CANCELLED"
          ? t("synthetic.ended.objectiveCancelled")
          : t("synthetic.ended.objectiveFailed");
    return {
      title: t("synthetic.ended.title", { mission: missionTitle }),
      objective,
      action: t("synthetic.ended.action"),
    };
  }
  if (p.syntheticUi === "active_idle") {
    return {
      title: t("synthetic.active_idle.title", { mission: missionTitle }),
      objective: t("synthetic.active_idle.objective"),
      action: t("synthetic.active_idle.action"),
    };
  }
  return {
    title: p.title || "—",
    objective: p.objective || "—",
    action: p.action || "—",
  };
}

function statusLabel(
  status: ManagedEventStatus,
  isPaused: boolean,
  t: (key: string) => string,
): string {
  if (status === "ACTIVE" && isPaused) return t("pause");
  if (status === "ACTIVE") return t("liveBadge");
  if (status === "STARTING") return t("starting");
  if (status === "SCHEDULED") return t("scheduled");
  if (status === "COMPLETED") return t("completed");
  if (status === "CANCELLED") return t("cancelled");
  if (status === "FAILED") return t("failed");
  return t("completed");
}

const POLL_MS = 5000;

export function LivePlayerScreen({
  initial,
  runId,
  playerMe,
}: {
  initial: LivePlayerViewDTO;
  runId: string;
  playerMe: string | null;
}) {
  const t = useTranslations("livePlayer");
  const [data, setData] = useState<LivePlayerViewDTO>(initial);
  const [focus, setFocus] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [phasePulse, setPhasePulse] = useState(false);
  const lastPhaseKey = useRef(initial.currentPhase?.phaseKey ?? "");

  const tick = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [tick]);

  const pollUrl = useMemo(() => {
    const q = playerMe ? `?me=${encodeURIComponent(playerMe)}` : "";
    return `/api/live/${encodeURIComponent(runId)}${q}`;
  }, [runId, playerMe]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(pollUrl, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next = (await res.json()) as LivePlayerViewDTO;
        const pk = next.currentPhase?.phaseKey ?? "";
        if (pk !== lastPhaseKey.current) {
          lastPhaseKey.current = pk;
          if (pk) {
            setPhasePulse(true);
            window.setTimeout(() => setPhasePulse(false), 900);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([18, 40, 18]);
            }
          }
        }
        setData(next);
      } catch {
        /* ignore transient network errors */
      }
    };
    void pull();
    const id = window.setInterval(pull, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollUrl]);

  const sessionStartMs = data.sessionStartedAtIso
    ? new Date(data.sessionStartedAtIso).getTime()
    : null;
  const totalMs = Math.max(1, data.eventDurationMinutes * 60_000);

  const elapsedMs =
    sessionStartMs != null &&
    (data.runStatus === "ACTIVE" ||
      data.runStatus === "STARTING" ||
      data.runStatus === "COMPLETED" ||
      data.runStatus === "FAILED" ||
      data.runStatus === "CANCELLED")
      ? Math.max(0, now - sessionStartMs)
      : 0;

  const progressPct =
    data.runStatus === "ACTIVE" || data.runStatus === "STARTING"
      ? Math.min(100, (elapsedMs / totalMs) * 100)
      : data.runStatus === "COMPLETED" ||
          data.runStatus === "FAILED" ||
          data.runStatus === "CANCELLED"
        ? 100
        : 0;

  const tPlusMinutes =
    sessionStartMs != null
      ? Math.max(0, Math.floor(elapsedMs / 60_000))
      : null;

  const nextCountdownMs =
    data.nextPhase?.scheduledAtIso != null
      ? Math.max(0, new Date(data.nextPhase.scheduledAtIso).getTime() - now)
      : null;

  const current = data.currentPhase;
  const phaseType: BattlePhaseType = current?.phaseType ?? "REMINDER";
  const copy = phaseCopy(
    current,
    data.missionTitle,
    data.runStatus,
    t,
  );

  const typeKey = `phaseType_${phaseType}` as
    | "phaseType_START"
    | "phaseType_OBJECTIVE"
    | "phaseType_REMINDER"
    | "phaseType_FINAL";

  const scheduledStartMs = new Date(data.scheduledAtIso).getTime();
  const untilStartMs = Math.max(0, scheduledStartMs - now);

  const isLiveNow =
    data.runStatus === "ACTIVE" && !data.isPaused && !focus;
  const phaseIsTactical =
    Boolean(current) &&
    !current?.syntheticUi &&
    (data.runStatus === "ACTIVE" || data.runStatus === "STARTING");

  const showPlayerStrip = !focus;
  const personalMeLink = data.meQueryProvided;

  return (
    <div
      className={["live-player", focus ? "live-player--focus" : ""]
        .filter(Boolean)
        .join(" ")}
      role="main"
      aria-label={t("commandLandmark")}
    >
      <header className="live-player__top">
        <div className="live-player__top-band">
          <div className="live-player__top-left">
            <p className="live-player__event-kind">{data.eventDisplayName}</p>
            <h1 className="live-player__mission">{data.missionTitle}</h1>
          </div>
          <div className="live-player__top-right">
            <span
              className={[
                "live-player__status-pill",
                `live-player__status-pill--${data.runStatus}`,
                data.isPaused ? "live-player__status-pill--paused" : "",
                data.runStatus === "ACTIVE" && !data.isPaused
                  ? "live-player__status-pill--live-now"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {statusLabel(data.runStatus, data.isPaused, t)}
            </span>
            {data.runStatus === "SCHEDULED" ? (
              <div className="live-player__tblock" aria-live="polite">
                <span className="live-player__tblock-label">
                  {t("timerScheduled")}
                </span>
                <span className="live-player__tblock-value">
                  {formatShortDuration(untilStartMs)}
                </span>
              </div>
            ) : tPlusMinutes != null ? (
              <div className="live-player__tblock" aria-live="polite">
                <span className="live-player__tblock-label">
                  {t("clockLabel")}
                </span>
                <span className="live-player__tblock-value">
                  {t("timerElapsed", { minutes: tPlusMinutes })}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {!focus ? (
          <div className="live-player__progress-block" aria-hidden>
            <div className="live-player__progress-head">
              <span className="live-player__progress-label">
                {t("progressLabel")}
              </span>
              <span className="live-player__progress-pct">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="live-player__progress-track">
              <div
                className="live-player__progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      <main className="live-player__center">
        <div
          className={[
            "live-player__phase-card",
            `live-player__phase-card--${phaseType}`,
            phasePulse ? "live-player__phase-card--anim" : "",
            isLiveNow && phaseIsTactical ? "live-player__phase-card--live-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-phase={phaseType}
        >
          <div
            key={current?.phaseKey ?? "none"}
            className="live-player__phase-inner"
          >
            <div className="live-player__phase-type-row">
              <span className="live-player__phase-type">{t(typeKey)}</span>
            </div>
            <h2 className="live-player__phase-title">{copy.title}</h2>
            <div className="live-player__objective-block">
              <span className="live-player__block-label">{t("objective")}</span>
              <p className="live-player__phase-objective">{copy.objective}</p>
            </div>
            <div className="live-player__phase-action-wrap">
              <span className="live-player__phase-action-label">
                {t("action")}
              </span>
              <p className="live-player__phase-action">{copy.action}</p>
            </div>
          </div>
        </div>
      </main>

      {showPlayerStrip ? (
        <section
          className="live-player__chips"
          aria-label={t("metaStrip")}
        >
          {data.meQueryProvided && !data.hasPersonalAssignment ? (
            <p className="live-player__chips-alert">{t("noAssignmentForMe")}</p>
          ) : null}
          <div className="live-player__chip-row">
            <div className="live-player__chip">
              <span className="live-player__chip-k">{t("leader")}</span>
              <span className="live-player__chip-v">
                {data.leaderName ?? "—"}
              </span>
            </div>
            <div className="live-player__chip">
              <span className="live-player__chip-k">{t("building")}</span>
              <span className="live-player__chip-v">
                {data.assignedBuilding ?? "—"}
              </span>
            </div>
            <div className="live-player__chip">
              <span className="live-player__chip-k">{t("role")}</span>
              <span className="live-player__chip-v">
                {data.personalSlotLabel ?? "—"}
              </span>
            </div>
            {!personalMeLink ? (
              <>
                <div className="live-player__chip">
                  <span className="live-player__chip-k">
                    {t("legionHeader")}
                  </span>
                  <span className="live-player__chip-v">
                    {data.legionIndex != null
                      ? t("legion", { n: data.legionIndex })
                      : "—"}
                  </span>
                </div>
                <div className="live-player__chip">
                  <span className="live-player__chip-k">{t("side")}</span>
                  <span className="live-player__chip-v">
                    {data.assignedSide === "west"
                      ? t("sideWest")
                      : data.assignedSide === "east"
                        ? t("sideEast")
                        : "—"}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className="live-player__bottom">
        <div className="live-player__next-shell">
          <div className="live-player__next-head">{t("nextPhaseTitle")}</div>
          {data.nextPhase ? (
            <div className="live-player__next-body">
              <div className="live-player__next-title-row">
                <h3 className="live-player__next-title">
                  {data.nextPhase.title?.trim() ||
                    t(
                      `phaseType_${data.nextPhase.phaseType}` as
                        | "phaseType_START"
                        | "phaseType_OBJECTIVE"
                        | "phaseType_REMINDER"
                        | "phaseType_FINAL",
                    )}
                </h3>
                {nextCountdownMs != null ? (
                  <span className="live-player__next-countdown">
                    {formatShortDuration(nextCountdownMs)}
                  </span>
                ) : null}
              </div>
              <p className="live-player__next-sum">
                {(data.nextPhase.objective || "").slice(0, 160)}
                {(data.nextPhase.objective || "").length > 160 ? "…" : ""}
              </p>
            </div>
          ) : (
            <p className="live-player__next-empty">{t("noNext")}</p>
          )}
        </div>

        <div className="live-player__toolbar">
          <button
            type="button"
            className="live-player__btn"
            onClick={() => setFocus((f) => !f)}
          >
            {focus ? t("focusOff") : t("focusOn")}
          </button>
          {!focus ? (
            <Link href="/app" className="live-player__link">
              {t("backApp")}
            </Link>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
