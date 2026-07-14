import { describe, expect, it } from "vitest";
import { QueueNames } from "./queue-names.js";

describe("QueueNames", () => {
  it("定义第一阶段需要的队列名称", () => {
    expect(QueueNames.WeComMessage).toBe("wecom-message");
    expect(QueueNames.DailyTip).toBe("daily-tip");
    expect(QueueNames.ReminderScan).toBe("reminder-scan");
    expect(QueueNames.LeaderboardSnapshot).toBe("leaderboard-snapshot");
  });
});
