import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { WeComDirectoryMemberDto } from "@openfit/shared";

@Injectable()
export class WeComDirectoryService {
  private tokenCache?: { value: string; expiresAt: number };

  constructor(@Optional() @Inject(ConfigService) private readonly config?: ConfigService) {}

  async listMembers(): Promise<WeComDirectoryMemberDto[]> {
    const corpId = this.config?.get<string>("WECOM_CORP_ID") ?? process.env.WECOM_CORP_ID;
    const secret = this.config?.get<string>("WECOM_APP_SECRET") ?? process.env.WECOM_APP_SECRET;
    if (!corpId || !secret) return [];

    const token = await this.getAccessToken(corpId, secret);
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/list?access_token=${encodeURIComponent(token)}&department_id=1&fetch_child=1`);
    const payload = (await response.json()) as { errcode?: number; errmsg?: string; userlist?: Array<{ userid: string; name?: string; department?: number[] }> };
    if (!response.ok || payload.errcode !== 0) throw new Error(`企业微信通讯录同步失败：${payload.errmsg ?? response.status}`);

    return (payload.userlist ?? [])
      .filter((item) => item.userid && item.name)
      .map((item) => ({
        userid: item.userid,
        name: item.name!,
        department: item.department?.join(",")
      }));
  }

  private async getAccessToken(corpId: string, secret: string): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) return this.tokenCache.value;
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`);
    const payload = (await response.json()) as { errcode?: number; errmsg?: string; access_token?: string; expires_in?: number };
    if (!response.ok || payload.errcode !== 0 || !payload.access_token) throw new Error(`企业微信 access_token 获取失败：${payload.errmsg ?? response.status}`);
    this.tokenCache = { value: payload.access_token, expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000 };
    return payload.access_token;
  }
}
