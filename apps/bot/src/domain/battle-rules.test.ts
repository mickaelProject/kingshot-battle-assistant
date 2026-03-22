import { BattlePhaseType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assertIntegerNonNegativeOffsets,
  prepareTemplateEventsForSession,
  reminderRowCountFromEvents,
  sortTemplateEventsByOffset,
} from "./battle-rules.js";

describe("sortTemplateEventsByOffset", () => {
  it("orders by offsetSeconds ascending", () => {
    const sorted = sortTemplateEventsByOffset([
      { offsetSeconds: 300, orderIndex: 0 },
      { offsetSeconds: 0, orderIndex: 0 },
      { offsetSeconds: 120, orderIndex: 0 },
    ]);
    expect(sorted.map((e) => e.offsetSeconds)).toEqual([0, 120, 300]);
  });

  it("ties break by orderIndex", () => {
    const sorted = sortTemplateEventsByOffset([
      { offsetSeconds: 900, orderIndex: 2 },
      { offsetSeconds: 900, orderIndex: 0 },
      { offsetSeconds: 900, orderIndex: 1 },
    ]);
    expect(sorted.map((e) => e.orderIndex)).toEqual([0, 1, 2]);
  });
});

describe("assertIntegerNonNegativeOffsets", () => {
  it("accepts zero and positive integers", () => {
    expect(() =>
      assertIntegerNonNegativeOffsets([{ offsetSeconds: 0 }, { offsetSeconds: 5 }]),
    ).not.toThrow();
  });

  it("rejects negative offsets", () => {
    expect(() =>
      assertIntegerNonNegativeOffsets([{ offsetSeconds: -1 }]),
    ).toThrowError("INVALID_EVENT_OFFSET");
  });

  it("rejects non-integers", () => {
    expect(() =>
      assertIntegerNonNegativeOffsets([{ offsetSeconds: 1.5 }]),
    ).toThrowError("INVALID_EVENT_OFFSET");
  });
});

describe("reminderRowCountFromEvents", () => {
  it("matches event count", () => {
    expect(reminderRowCountFromEvents(7)).toBe(7);
  });
});

describe("prepareTemplateEventsForSession", () => {
  it("sorts and preserves count", () => {
    const ev = [
      {
        id: "a",
        offsetSeconds: 10,
        orderIndex: 1,
        phaseType: BattlePhaseType.REMINDER,
        title: "A",
        objective: "",
        action: "",
        nextHint: "",
      },
      {
        id: "b",
        offsetSeconds: 0,
        orderIndex: 0,
        phaseType: BattlePhaseType.START,
        title: "B",
        objective: "",
        action: "",
        nextHint: "",
      },
    ];
    const out = prepareTemplateEventsForSession(ev);
    expect(out).toHaveLength(2);
    expect(out[0].offsetSeconds).toBe(0);
    expect(out[1].offsetSeconds).toBe(10);
  });
});
