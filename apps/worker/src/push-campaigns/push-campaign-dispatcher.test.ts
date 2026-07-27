import { describe, expect, it } from "vitest";
import { PushCampaignDispatcher } from "./push-campaign-dispatcher.js";

describe("PushCampaignDispatcher", () => {
  it("calls the API internal endpoint to dispatch due push campaigns", async () => {
    let calledUrl = "";
    let calledMethod = "";
    const dispatcher = new PushCampaignDispatcher(
      {
        get: (key: string) => {
          if (key === "DATABASE_URL") return "postgresql://openfit:openfit@postgres:5432/openfit?schema=public";
          return undefined;
        }
      } as never,
      async (url, init) => {
        calledUrl = String(url);
        calledMethod = init?.method ?? "";
        return {
          ok: true,
          json: async () => ({ scanned: 2, sent: 1, failed: 1 })
        } as Response;
      }
    );

    const result = await dispatcher.dispatchDue();

    expect(calledUrl).toBe("http://api:13100/api/internal/push-campaigns/dispatch-due");
    expect(calledMethod).toBe("POST");
    expect(result).toEqual({ scanned: 2, sent: 1, failed: 1 });
  });
});
