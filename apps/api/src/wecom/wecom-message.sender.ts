import { Injectable } from "@nestjs/common";
import { ApiErrorCode, type WeComSendResult } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";

@Injectable()
export class WeComMessageSender {
  async sendMarkdown(text: string): Promise<WeComSendResult> {
    const mockMode = process.env.WECOM_MOCK_MODE !== "false";
    const webhookUrl = process.env.WECOM_BOT_WEBHOOK_URL;

    if (mockMode) {
      return { mode: "mock", ok: true, message: `mock 已发送：${text}` };
    }

    if (!webhookUrl) {
      throw new ApiException(ApiErrorCode.WeComWebhookNotConfigured, "未配置企业微信群机器人 webhook");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: { content: text }
      })
    });

    if (!response.ok) {
      throw new ApiException(ApiErrorCode.WeComSendFailed, `企业微信发送失败：HTTP ${response.status}`);
    }

    return { mode: "webhook", ok: true, message: "企业微信群机器人消息已发送" };
  }
}
