import { Inject, Injectable } from "@nestjs/common";
import type { AiImageCheckinParseInput, RecognitionResultDto } from "@openfit/shared";
import { AiProviderService } from "./ai-provider.service.js";

@Injectable()
export class AiCheckinParserService {
  constructor(@Inject(AiProviderService) private readonly provider: AiProviderService) {}

  async parse(text: string): Promise<RecognitionResultDto> {
    return this.provider.parseCheckinText(text);
  }

  async parseImage(input: AiImageCheckinParseInput): Promise<RecognitionResultDto> {
    return this.provider.parseCheckinImage(input);
  }
}
