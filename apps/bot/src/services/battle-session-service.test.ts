import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReminderStatus } from "@prisma/client";

vi.mock("../db/prisma.js", () => ({
  prisma: {
    battleReminder: {
      updateMany: vi.fn(),
    },
    battleSession: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../db/prisma.js";
import { cancelPendingReminders } from "./battle-session-service.js";

describe("cancelPendingReminders", () => {
  beforeEach(() => {
    vi.mocked(prisma.battleReminder.updateMany).mockReset();
    vi.mocked(prisma.battleReminder.updateMany).mockResolvedValue({ count: 4 });
  });

  it("marks PENDING and PROCESSING reminders as SKIPPED", async () => {
    await cancelPendingReminders("sess_test");

    expect(prisma.battleReminder.updateMany).toHaveBeenCalledWith({
      where: {
        sessionId: "sess_test",
        status: { in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING] },
      },
      data: { status: ReminderStatus.SKIPPED },
    });
  });
});
