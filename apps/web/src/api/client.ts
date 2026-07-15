import { MemberRole, type CurrentUser } from "@openfit/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ADMIN_ROLE = MemberRole.OrgAdmin;

export function setApiRole(_role: MemberRole) {
  // 兼容旧调用；当前 Web 工作台固定为单管理员视角。
}

export function getApiRole() {
  return ADMIN_ROLE;
}

export function buildApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-openfit-role": ADMIN_ROLE,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? `请求失败：${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getMe() {
  return apiFetch<CurrentUser>("/api/me");
}
