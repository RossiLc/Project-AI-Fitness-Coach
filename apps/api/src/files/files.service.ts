import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AttachmentDto, UploadAttachmentRequest } from "@openfit/shared";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
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
