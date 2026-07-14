import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Job, Worker } from "bullmq";
import { Redis } from "ioredis";
import { QueueNames } from "../queues/queue-names.js";

export interface WeComMessageJob {
  text: string;
}

@Injectable()
export class WeComMessageProcessor implements OnModuleInit, OnModuleDestroy {
  private connection?: Redis;
  private worker?: Worker<WeComMessageJob>;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker<WeComMessageJob>(
      QueueNames.WeComMessage,
      async (job) => this.process(job),
      { connection: this.connection }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.connection?.quit();
  }

  async process(job: Job<WeComMessageJob>) {
    const mockMode = process.env.WECOM_MOCK_MODE !== "false";
    if (mockMode) {
      return {
        mode: "mock",
        ok: true,
        message: `worker mock 已发送：${job.data.text}`
      };
    }
    return {
      mode: "pending-webhook",
      ok: false,
      message: "第一阶段真实 webhook 发送由 API WeComMessageSender 承担，worker 已保留队列边界。"
    };
  }
}
