import { Body, Controller, Delete, Get, Header, Inject, Param, Post, Res } from "@nestjs/common";
import type { CurrentUser, UploadAttachmentRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { FilesService } from "./files.service.js";

@Controller("files")
export class FilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @Post("upload")
  upload(@CurrentUserDecorator() user: CurrentUser, @Body() body: UploadAttachmentRequest) {
    return this.files.upload({ ...body, orgId: user.orgId });
  }

  @Get(":attachmentId")
  getFile(@Param("attachmentId") attachmentId: string) {
    return this.files.getMetadata(attachmentId);
  }

  @Get(":attachmentId/content")
  @Header("Cache-Control", "private, max-age=300")
  async getFileContent(@Param("attachmentId") attachmentId: string, @Res() response: { type: (mimeType: string) => void; sendFile: (path: string) => unknown }) {
    const file = await this.files.getPreviewFile(attachmentId);
    response.type(file.mimeType);
    return response.sendFile(file.absolutePath);
  }

  @Delete(":attachmentId")
  deleteFile(@Param("attachmentId") attachmentId: string) {
    return this.files.markDeleted(attachmentId);
  }
}
