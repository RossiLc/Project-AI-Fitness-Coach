import { Module } from "@nestjs/common";
import { GroupsController } from "./groups.controller.js";
import { GroupsService } from "./groups.service.js";
import { WeComDirectoryService } from "./wecom-directory.service.js";

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, WeComDirectoryService],
  exports: [GroupsService, WeComDirectoryService]
})
export class GroupsModule {}
