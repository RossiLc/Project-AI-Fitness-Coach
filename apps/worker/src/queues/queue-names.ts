export const QueueNames = {
  WeComMessage: "wecom-message",
  DailyTip: "daily-tip",
  ReminderScan: "reminder-scan",
  LeaderboardSnapshot: "leaderboard-snapshot"
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];
