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
    return {
      mode: "api-intelligent-bot",
      ok: false,
      message: `企业微信群主动推送由 API 进程内的智能机器人长连接发送器承担，worker 仅保留队列边界：${job.data.text}`
    };
  }
}
