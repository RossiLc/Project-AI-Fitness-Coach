import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
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

  @Delete(":attachmentId")
  deleteFile(@Param("attachmentId") attachmentId: string) {
    return this.files.markDeleted(attachmentId);
  }
}
