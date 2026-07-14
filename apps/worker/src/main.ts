import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);
  console.log("Open Fit worker started");
}

void bootstrap();
