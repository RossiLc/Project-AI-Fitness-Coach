import { describe, expect, it } from "vitest";
import { CoachProfileMemoryService } from "./coach-profile-memory.service.js";

function createPrisma() {
  const profiles: Array<Record<string, any>> = [];

  return {
    profiles,
    prisma: {
      coachProfileMemory: {
        findFirst: async ({ where }: any) =>
          profiles.find(
            (profile) =>
              profile.orgId === where.orgId &&
              profile.memberId === where.memberId &&
              profile.wecomUserid === where.wecomUserid
          ) ?? null,
        upsert: async ({ where, create, update }: any) => {
          const existing = profiles.find((profile) => profile.id === where.id || profile.memberId === where.memberId);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const profile = { id: create.id ?? `profile_${profiles.length + 1}`, ...create, createdAt: new Date(), updatedAt: create.updatedAt ?? new Date() };
          profiles.push(profile);
          return profile;
        }
      }
    }
  };
}

describe("CoachProfileMemoryService", () => {
  it("extracts structured profile facts from safe coach conversations", async () => {
    const store = createPrisma();
    const now = new Date("2026-07-17T12:00:00.000Z");
    const service = new CoachProfileMemoryService(store.prisma as never, { now: () => now });

    await service.updateFromExchange({
      orgId: "org_1",
      memberId: "member_1",
      wecomUserid: "user_a",
      userText: "我的目标是减脂，喜欢爬坡和跑步，但是膝盖不舒服",
      assistantText: "建议控制强度"
    });

    expect(store.profiles[0].profileJson).toMatchObject({
      goals: ["减脂"],
      preferences: ["爬坡", "跑步"],
      constraints: ["膝盖不适"]
    });
  });

  it("keeps stable profile memory available even when it has not been updated for more than 7 days", async () => {
    const store = createPrisma();
    const now = new Date("2026-07-17T12:00:00.000Z");
    const service = new CoachProfileMemoryService(store.prisma as never, { now: () => now });

    store.profiles.push({
      id: "profile_1",
      orgId: "org_1",
      memberId: "member_1",
      wecomUserid: "user_a",
      profileJson: {
        goals: ["减脂"],
        preferences: ["爬坡"],
        constraints: ["膝盖不适"],
        notes: []
      },
      updatedAt: new Date("2026-07-01T12:00:00.000Z")
    });

    const prompt = await service.buildProfilePrompt({ orgId: "org_1", memberId: "member_1", wecomUserid: "user_a" });

    expect(prompt).toContain("用户长期结构化画像");
    expect(prompt).toContain("减脂");
    expect(prompt).toContain("爬坡");
    expect(prompt).toContain("膝盖不适");
  });
});
