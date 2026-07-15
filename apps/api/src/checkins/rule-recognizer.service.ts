import { Injectable } from "@nestjs/common";
import type { RecognitionResultDto } from "@openfit/shared";

const sportKeywords: Array<[string, string]> = [
  ["跑", "跑步"],
  ["慢跑", "跑步"],
  ["快走", "快走"],
  ["走", "快走"],
  ["骑", "骑行"],
  ["单车", "骑行"],
  ["游泳", "游泳"],
  ["瑜伽", "瑜伽"],
  ["力量", "力量训练"]
];

@Injectable()
export class RuleRecognizerService {
  recognize(text: string): RecognitionResultDto {
    const sportType = sportKeywords.find(([keyword]) => text.includes(keyword))?.[1] ?? "综合运动";
    const durationMin = this.extractNumberBefore(text, ["分钟", "min"]) ?? 30;
    const distanceKm = this.extractNumberBefore(text, ["公里", "km", "千米"]);
    const intensity = text.includes("累") || text.includes("冲刺") ? "high" : text.includes("轻松") ? "low" : "moderate";
    const calorieEstimate = Math.round(durationMin * (sportType === "跑步" ? 8.5 : sportType === "骑行" ? 6.5 : 5));

    return {
      sportType,
      durationMin,
      distanceKm,
      intensity,
      calorieEstimate,
      confidence: distanceKm ? 0.82 : 0.68,
      notice: "第一阶段使用规则解析器估算，热量仅供活动统计参考。"
    };
  }

  private extractNumberBefore(text: string, units: string[]): number | undefined {
    for (const unit of units) {
      const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}`, "i");
      const match = text.match(pattern);
      if (match?.[1]) return Number(match[1]);
    }
    return undefined;
  }
}
