import type { CoachAdviceResponse } from "@openfit/shared";
import { apiFetch } from "./client";

export function askCoach(question: string) {
  return apiFetch<CoachAdviceResponse>("/api/coach/advice", {
    method: "POST",
    body: JSON.stringify({ question })
  });
}
