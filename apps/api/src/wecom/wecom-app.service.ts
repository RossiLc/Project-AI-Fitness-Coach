import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type CurrentUser,
  type WeComAppMessageRequest,
  type WeComAppMessageResult,
  type WeComAppStatusDto,
  type WeComOAuthCallbackRequest,
  type WeComOAuthCallbackResponse,
  type WeComOAuthLoginUrlResponse
} from "@openfit/shared";
import type { MembersService } from "../members/members.service.js";

@Injectable()
export class WeComAppService {
  private tokenCache?: { value: string; expiresAt: number };

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getStatus(): WeComAppStatusDto {
    const corpIdConfigured = Boolean(this.config.get<string>("WECOM_CORP_ID"));
    const agentIdConfigured = Boolean(this.config.get<string>("WECOM_AGENT_ID"));
    const secretConfigured = Boolean(this.config.get<string>("WECOM_APP_SECRET"));
    const callbackUrl = this.config.get<string>("WECOM_APP_CALLBACK_URL") ?? this.config.get<string>("WECOM_OAUTH_CALLBACK_URL");
    const ready = corpIdConfigured && agentIdConfigured && secretConfigured;

    return {
      mode: ready ? "configured" : "missing_config",
      corpIdConfigured,
      agentIdConfigured,
      secretConfigured,
      callbackUrl,
      oauthReady: corpIdConfigured && agentIdConfigured && Boolean(callbackUrl),
      appMessageReady: ready,
      memberSyncReady: ready
    };
  }

  buildOAuthLoginUrl(state = `openfit_${Date.now()}`): WeComOAuthLoginUrlResponse {
    const corpId = this.config.get<string>("WECOM_CORP_ID");
    const agentId = this.config.get<string>("WECOM_AGENT_ID");
    const callbackUrl = this.config.get<string>("WECOM_APP_CALLBACK_URL") ?? this.config.get<string>("WECOM_OAUTH_CALLBACK_URL");

    if (!corpId || !agentId || !callbackUrl) {
      return {
        mode: "missing_config",
        state,
        message: "缺少 WECOM_CORP_ID、WECOM_AGENT_ID 或 WECOM_APP_CALLBACK_URL，暂不能生成企业微信 OAuth URL。"
      };
    }

    const redirectUri = encodeURIComponent(callbackUrl);
    const encodedState = encodeURIComponent(state);
    return {
      mode: "configured",
      state,
      url: `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&agentid=${agentId}&state=${encodedState}#wechat_redirect`
    };
  }

  async handleOAuthCallback(body: WeComOAuthCallbackRequest, members: Pick<MembersService, "findByWeComUserid">): Promise<WeComOAuthCallbackResponse> {
    const isTestCode = body.code.startsWith("mock:");
    const userid = isTestCode ? body.code.replace(/^mock:/, "") : await this.fetchUseridByCode(body.code);
    const user = await members.findByWeComUserid(userid);
    if (!user) {
      return {
        mode: isTestCode ? "mock" : "wecom_api",
        user: {
          id: "unbound",
          orgId: "org_demo",
          displayName: "未绑定企业微信用户",
          role: "employee" as CurrentUser["role"],
          wecomUserid: userid
        },
        message: "企业微信 userid 未绑定，请联系管理员在成员管理中处理。"
      };
    }

    return {
      mode: isTestCode ? "mock" : "wecom_api",
      user,
      message: "OAuth 回调已完成，本地用户已按企业微信 userid 映射。"
    };
  }

  async sendAppMessage(body: WeComAppMessageRequest): Promise<WeComAppMessageResult> {
    const token = await this.getAccessToken();
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        touser: body.toUserId,
        msgtype: "text",
        agentid: this.config.get<string>("WECOM_AGENT_ID"),
        text: { content: body.text },
        safe: 0
      })
    });
    const payload = (await response.json()) as { errcode?: number; errmsg?: string };
    if (response.ok && payload.errcode === 0) {
      return { mode: "wecom_api", ok: true, message: `企业微信自建应用消息已发送给 ${body.toUserId}` };
    }

    return {
      mode: "wecom_api",
      ok: false,
      message: `企业微信自建应用消息发送失败：${payload.errmsg ?? response.status}`
    };
  }

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) return this.tokenCache.value;
    const corpId = this.config.get<string>("WECOM_CORP_ID");
    const secret = this.config.get<string>("WECOM_APP_SECRET");
    if (!corpId || !secret) throw new Error("缺少 WECOM_CORP_ID 或 WECOM_APP_SECRET");

    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`);
    const payload = (await response.json()) as { errcode?: number; errmsg?: string; access_token?: string; expires_in?: number };
    if (!response.ok || payload.errcode !== 0 || !payload.access_token) {
      throw new Error(`企业微信 access_token 获取失败：${payload.errmsg ?? response.status}`);
    }
    this.tokenCache = { value: payload.access_token, expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000 };
    return payload.access_token;
  }

  private async fetchUseridByCode(code: string): Promise<string> {
    const token = await this.getAccessToken();
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${encodeURIComponent(token)}&code=${encodeURIComponent(code)}`);
    const payload = (await response.json()) as { errcode?: number; errmsg?: string; UserId?: string; userid?: string };
    const userid = payload.UserId ?? payload.userid;
    if (!response.ok || payload.errcode !== 0 || !userid) {
      throw new Error(`企业微信 OAuth code 换 userid 失败：${payload.errmsg ?? response.status}`);
    }
    return userid;
  }
}
