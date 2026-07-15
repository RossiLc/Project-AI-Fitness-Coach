import { Injectable } from "@nestjs/common";

export interface AiRuntimeConfig {
  provider: "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
}

@Injectable()
export class AiConfigService {
  getConfig(): AiRuntimeConfig {
    return {
      provider: "openai-compatible",
      baseUrl: process.env.AI_BASE_URL ?? "",
      apiKey: process.env.AI_API_KEY ?? "",
      model: process.env.AI_MODEL || "gpt-5.5"
    };
  }
}
