import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DispatchDuePushCampaignsResult } from "@openfit/shared";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
const DISPATCH_INTERVAL_MS = 60_000;

@Injectable()
export class PushCampaignDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushCampaignDispatcher.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Optional() @Inject("PUSH_CAMPAIGN_FETCH") private readonly fetchImpl: FetchLike = fetch
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => {
      void this.dispatchDue().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`推送管理自动派发失败：${message}`);
      });
    }, DISPATCH_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async dispatchDue(): Promise<DispatchDuePushCampaignsResult> {
    const baseUrl = this.resolveApiBaseUrl();
    const response = await this.fetchImpl(`${baseUrl}/api/internal/push-campaigns/dispatch-due`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    if (!response.ok) {
      throw new Error(`API 返回 ${response.status}`);
    }
    return (await response.json()) as DispatchDuePushCampaignsResult;
  }

  private resolveApiBaseUrl(): string {
    const databaseUrl = String(this.config.get("DATABASE_URL") ?? "");
    return databaseUrl.includes("@postgres:") ? "http://api:13100" : "http://127.0.0.1:13100";
  }
}
