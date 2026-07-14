import { MemberRole, type CurrentUser } from "@openfit/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

let currentRole: MemberRole = MemberRole.Employee;

export function setApiRole(role: MemberRole) {
  currentRole = role;
}

export function getApiRole() {
  return currentRole;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-openfit-role": currentRole,
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
