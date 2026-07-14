import { Module } from "@nestjs/common";
import { WeComModule } from "../wecom/wecom.module.js";
import { RemindersController } from "./reminders.controller.js";
import { RemindersService } from "./reminders.service.js";

@Module({
  imports: [WeComModule],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService]
})
export class RemindersModule {}
