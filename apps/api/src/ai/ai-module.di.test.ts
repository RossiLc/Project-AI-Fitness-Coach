import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { CoachConversationService } from "./coach-conversation.service.js";
import { CoachProfileMemoryService } from "./coach-profile-memory.service.js";

describe("AI Nest dependency injection", () => {
  it("creates coach memory services without requiring options providers", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CoachConversationService,
        CoachProfileMemoryService,
        {
          provide: PrismaService,
          useValue: {}
        }
      ]
    }).compile();

    expect(moduleRef.get(CoachConversationService)).toBeInstanceOf(CoachConversationService);
    expect(moduleRef.get(CoachProfileMemoryService)).toBeInstanceOf(CoachProfileMemoryService);
  });
});
