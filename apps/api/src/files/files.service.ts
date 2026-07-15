import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AttachmentDto, UploadAttachmentRequest } from "@openfit/shared";
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class FilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async upload(body: UploadAttachmentRequest & { orgId: string }): Promise<AttachmentDto> {
    const root = this.config.get<string>("LOCAL_STORAGE_ROOT") ?? "./storage/uploads";
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const safeName = basename(body.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const relativePath = `${body.orgId}/${body.activityId}/${dateKey}/${Date.now()}-${safeName}`;
    const absolutePath = join(root, relativePath);
    const buffer = Buffer.from(body.base64Data, "base64");

    await mkdir(join(root, body.orgId, body.activityId, dateKey), { recursive: true });
    await writeFile(absolutePath, buffer);

    const attachment = await this.prisma.attachment.create({
      data: {
        checkinId: body.checkinId,
        localPath: relativePath.replaceAll("\\", "/"),
        mimeType: body.mimeType,
        sizeBytes: buffer.byteLength,
        status: "active"
      }
    });

    return toDto(attachment);
  }

  async getMetadata(id: string): Promise<AttachmentDto | null> {
    const attachment = await this.prisma.attachment.findFirst({ where: { id } });
    return attachment ? toDto(attachment) : null;
  }

  async getPreviewFile(id: string): Promise<{ absolutePath: string; mimeType: string }> {
    const attachment = await this.prisma.attachment.findFirst({ where: { id } });
    if (!attachment || attachment.status !== "active" || !attachment.mimeType.startsWith("image/")) {
      throw new ApiException("ATTACHMENT_NOT_PREVIEWABLE", "附件不可预览", 404);
    }

    const root = resolve(this.config.get<string>("LOCAL_STORAGE_ROOT") ?? "./storage/uploads");
    const absolutePath = resolve(root, attachment.localPath);
    if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) {
      throw new ApiException("ATTACHMENT_PATH_INVALID", "附件路径非法", 400);
    }

    await access(absolutePath, constants.R_OK).catch(() => {
      throw new ApiException("ATTACHMENT_FILE_NOT_FOUND", "附件文件不存在或不可读取", 404);
    });

    return { absolutePath, mimeType: attachment.mimeType };
  }

  async markDeleted(id: string): Promise<AttachmentDto> {
    const attachment = await this.prisma.attachment.update({
      where: { id },
      data: { status: "deleted" }
    });
    return toDto(attachment);
  }
}

function toDto(attachment: {
  id: string;
  checkinId: string | null;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: Date;
}): AttachmentDto {
  return {
    id: attachment.id,
    checkinId: attachment.checkinId ?? undefined,
    localPath: attachment.localPath,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    status: attachment.status === "deleted" ? "deleted" : "active",
    createdAt: attachment.createdAt.toISOString()
  };
}
