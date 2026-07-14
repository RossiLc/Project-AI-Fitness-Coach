import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FilesService } from "./files.service.js";

describe("FilesService", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("将 base64 图片保存到本地存储并记录相对路径", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "openfit-files-"));
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      attachment: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: "att_1", ...data, createdAt: new Date() };
        }
      }
    };
    const config = { get: (key: string) => (key === "LOCAL_STORAGE_ROOT" ? tempDir : undefined) };
    const service = new FilesService(prisma as never, config as never);

    const result = await service.upload({
      orgId: "org_demo",
      activityId: "act_demo",
      checkinId: "chk_1",
      filename: "run.jpg",
      mimeType: "image/jpeg",
      base64Data: Buffer.from("fake-image").toString("base64")
    });

    expect(result.id).toBe("att_1");
    expect(result.localPath).toContain("org_demo/act_demo/");
    expect(created[0]).toMatchObject({ checkinId: "chk_1", mimeType: "image/jpeg", status: "active" });
  });

  it("删除附件时只标记 deleted 并保留审计可追踪路径", async () => {
    const prisma = {
      attachment: {
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "att_1",
          checkinId: "chk_1",
          localPath: "org_demo/act_demo/file.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          status: data.status,
          createdAt: new Date()
        })
      }
    };
    const service = new FilesService(prisma as never, { get: () => undefined } as never);

    const result = await service.markDeleted("att_1");

    expect(result.status).toBe("deleted");
  });
});
