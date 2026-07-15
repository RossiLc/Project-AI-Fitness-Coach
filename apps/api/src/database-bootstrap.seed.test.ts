import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

describe("database bootstrap seed", () => {
  it("does not create demo members during database bootstrap", () => {
    const bootstrap = readFileSync(resolve(repoRoot, "apps/api/prisma/bootstrap.mjs"), "utf8");
    const seed = readFileSync(resolve(repoRoot, "apps/api/prisma/seed.ts"), "utf8");
    const seedSources = `${bootstrap}\n${seed}`;

    expect(seedSources).not.toContain("prisma.member.upsert");
    expect(seedSources).not.toContain("prisma.member.create");
    expect(seedSources).not.toContain("员工小李");
    expect(seedSources).not.toContain("活动管理员王姐");
    expect(seedSources).not.toContain("企业管理员老周");
  });

  it("does not delete member records during database bootstrap", () => {
    const bootstrap = readFileSync(resolve(repoRoot, "apps/api/prisma/bootstrap.mjs"), "utf8");
    const seed = readFileSync(resolve(repoRoot, "apps/api/prisma/seed.ts"), "utf8");
    const seedSources = `${bootstrap}\n${seed}`;

    expect(seedSources).not.toContain("deleteLegacyDemoData");
    expect(seedSources).not.toContain("prisma.member.delete");
    expect(seedSources).not.toContain("legacyDemoMemberIds");
  });

  it("does not run prisma generate during container bootstrap", () => {
    const bootstrap = readFileSync(resolve(repoRoot, "apps/api/prisma/bootstrap.mjs"), "utf8");

    expect(bootstrap).not.toContain("runPrismaGenerate");
    expect(bootstrap).not.toContain('"generate"');
  });
});
