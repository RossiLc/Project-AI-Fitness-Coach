import { Injectable } from "@nestjs/common";

export interface AiRuntimeConfig {
  provider: "openai-compatible";
  mockMode: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

@Injectable()
export class AiConfigService {
  getConfig(): AiRuntimeConfig {
    return {
      provider: "openai-compatible",
      mockMode: process.env.AI_MOCK_MODE !== "false",
      baseUrl: process.env.AI_BASE_URL ?? "",
      apiKey: process.env.AI_API_KEY ?? "",
      model: process.env.AI_MODEL || "gpt-5.5"
    };
  }
}
