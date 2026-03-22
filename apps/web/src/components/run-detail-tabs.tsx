"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";

export type RunDetailTabId = "pilotage" | "timeline" | "details";

const TAB_IDS: RunDetailTabId[] = ["pilotage", "timeline", "details"];

export function RunDetailTabs({
  defaultTab,
  pilotage,
  timeline,
  details,
}: {
  defaultTab: RunDetailTabId;
  pilotage: ReactNode;
  timeline: ReactNode;
  details: ReactNode;
}) {
  const t = useTranslations("runs.detail");
  const [tab, setTab] = useState<RunDetailTabId>(defaultTab);

  const panels: Record<RunDetailTabId, ReactNode> = {
    pilotage,
    timeline,
    details,
  };

  return (
    <div className="run-detail-tabs">
      <div
        className="run-detail-tabs__list"
        role="tablist"
        aria-label={t("tabsAria")}
      >
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`run-detail-tab-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            aria-controls={`run-detail-panel-${id}`}
            className={`run-detail-tabs__tab${tab === id ? " run-detail-tabs__tab--active" : ""}`}
            onClick={() => setTab(id)}
          >
            {id === "pilotage"
              ? t("tabPilotage")
              : id === "timeline"
                ? t("tabTimeline")
                : t("tabDetails")}
          </button>
        ))}
      </div>
      {TAB_IDS.map((id) => (
        <div
          key={id}
          id={`run-detail-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`run-detail-tab-${id}`}
          hidden={tab !== id}
          className="run-detail-tabs__panel"
        >
          {panels[id]}
        </div>
      ))}
    </div>
  );
}
