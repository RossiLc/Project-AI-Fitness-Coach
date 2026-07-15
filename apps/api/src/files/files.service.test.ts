import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

  it("为 active 图片附件返回受控预览文件路径", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "openfit-files-"));
    const relativePath = "org_demo/act_demo/2026-07-15/run.jpg";
    const absolutePath = join(tempDir, relativePath);
    mkdirSync(join(tempDir, "org_demo", "act_demo", "2026-07-15"), { recursive: true });
    writeFileSync(absolutePath, "fake-image");
    const prisma = {
      attachment: {
        findFirst: async () => ({
          id: "att_1",
          checkinId: "chk_1",
          localPath: relativePath,
          mimeType: "image/jpeg",
          sizeBytes: 10,
          status: "active",
          createdAt: new Date()
        })
      }
    };
    const service = new FilesService(prisma as never, { get: (key: string) => (key === "LOCAL_STORAGE_ROOT" ? tempDir : undefined) } as never);

    const result = await service.getPreviewFile("att_1");

    expect(result.absolutePath).toBe(absolutePath);
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("拒绝预览 deleted 附件和非图片附件", async () => {
    const prisma = {
      attachment: {
        findFirst: async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          checkinId: "chk_1",
          localPath: "org_demo/act_demo/file.txt",
          mimeType: where.id === "att_deleted" ? "image/jpeg" : "text/plain",
          sizeBytes: 10,
          status: where.id === "att_deleted" ? "deleted" : "active",
          createdAt: new Date()
        })
      }
    };
    const service = new FilesService(prisma as never, { get: () => undefined } as never);

    await expect(service.getPreviewFile("att_deleted")).rejects.toMatchObject({ code: "ATTACHMENT_NOT_PREVIEWABLE" });
    await expect(service.getPreviewFile("att_text")).rejects.toMatchObject({ code: "ATTACHMENT_NOT_PREVIEWABLE" });
  });

  it("拒绝预览越过本地存储根目录的路径", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "openfit-files-"));
    const prisma = {
      attachment: {
        findFirst: async () => ({
          id: "att_escape",
          checkinId: "chk_1",
          localPath: "../secret.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          status: "active",
          createdAt: new Date()
        })
      }
    };
    const service = new FilesService(prisma as never, { get: (key: string) => (key === "LOCAL_STORAGE_ROOT" ? tempDir : undefined) } as never);

    await expect(service.getPreviewFile("att_escape")).rejects.toMatchObject({ code: "ATTACHMENT_PATH_INVALID" });
  });
});
