import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WeComMessageProcessor } from "./wecom/wecom-message.processor.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] })],
  providers: [WeComMessageProcessor]
})
export class WorkerModule {}
