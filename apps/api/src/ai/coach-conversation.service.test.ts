import { describe, expect, it } from "vitest";
import { CoachConversationService } from "./coach-conversation.service.js";

function createPrisma() {
  const conversations: Array<Record<string, any>> = [];
  const messages: Array<Record<string, any>> = [];
  let conversationSeq = 0;
  let messageSeq = 0;

  return {
    conversations,
    messages,
    prisma: {
      coachConversation: {
        findFirst: async ({ where }: any) =>
          conversations.find(
            (conversation) =>
              conversation.orgId === where.orgId &&
              conversation.wecomUserid === where.wecomUserid &&
              (where.chatId === undefined ? conversation.chatId === null : conversation.chatId === where.chatId)
          ) ?? null,
        create: async ({ data }: any) => {
          const conversation = { id: `conv_${++conversationSeq}`, ...data, createdAt: new Date(), lastMessageAt: data.lastMessageAt ?? new Date() };
          conversations.push(conversation);
          return conversation;
        },
        update: async ({ where, data }: any) => {
          const conversation = conversations.find((item) => item.id === where.id);
          if (!conversation) throw new Error("conversation not found");
          Object.assign(conversation, data);
          return conversation;
        },
        deleteMany: async ({ where }: any) => {
          const ids = conversations
            .filter((item) => Object.entries(where).every(([key, value]) => item[key] === value))
            .map((item) => item.id);
          for (let index = conversations.length - 1; index >= 0; index -= 1) {
            if (ids.includes(conversations[index].id)) conversations.splice(index, 1);
          }
          for (let index = messages.length - 1; index >= 0; index -= 1) {
            if (ids.includes(messages[index].conversationId)) messages.splice(index, 1);
          }
          return { count: ids.length };
        }
      },
      coachConversationMessage: {
        findMany: async ({ where, orderBy, take }: any) => {
          const rows = messages.filter((message) => message.conversationId === where.conversationId);
          rows.sort((left, right) => {
            const diff = left.createdAt.getTime() - right.createdAt.getTime();
            return orderBy.createdAt === "desc" ? -diff : diff;
          });
          return typeof take === "number" ? rows.slice(0, take) : rows;
        },
        create: async ({ data }: any) => {
          const message = { id: `msg_${++messageSeq}`, ...data, createdAt: data.createdAt ?? new Date(messageSeq) };
          messages.push(message);
          return message;
        },
        count: async ({ where }: any) => messages.filter((message) => message.conversationId === where.conversationId).length,
        deleteMany: async ({ where }: any) => {
          const before = messages.length;
          for (let index = messages.length - 1; index >= 0; index -= 1) {
            if (messages[index].conversationId === where.conversationId && where.createdAt?.lt && messages[index].createdAt < where.createdAt.lt) {
              messages.splice(index, 1);
            }
          }
          return { count: before - messages.length };
        }
      }
    }
  };
}

describe("CoachConversationService", () => {
  it("按群 chatid 和企业微信 userid 隔离上下文", async () => {
    const store = createPrisma();
    const service = new CoachConversationService(store.prisma as never);

    await service.appendExchange({
      orgId: "org_1",
      memberId: "member_1",
      wecomUserid: "user_a",
      chatId: "group_1",
      userText: "A 问题",
      assistantText: "A 回答"
    });
    await service.appendExchange({
      orgId: "org_1",
      memberId: "member_2",
      wecomUserid: "user_b",
      chatId: "group_1",
      userText: "B 问题",
      assistantText: "B 回答"
    });

    const context = await service.buildContext({ orgId: "org_1", memberId: "member_1", wecomUserid: "user_a", chatId: "group_1" });

    expect(context.messages.map((message) => message.content)).toEqual(["A 问题", "A 回答"]);
  });

  it("只返回最近 10 条消息并把更早内容压缩进摘要", async () => {
    const store = createPrisma();
    const service = new CoachConversationService(store.prisma as never);

    for (let index = 1; index <= 6; index += 1) {
      await service.appendExchange({
        orgId: "org_1",
        memberId: "member_1",
        wecomUserid: "user_a",
        chatId: "group_1",
        userText: `问题 ${index}`,
        assistantText: `回答 ${index}`
      });
    }

    const context = await service.buildContext({ orgId: "org_1", memberId: "member_1", wecomUserid: "user_a", chatId: "group_1" });

    expect(context.summary).toContain("问题 1");
    expect(context.messages).toHaveLength(10);
    expect(context.messages[0].content).toBe("问题 2");
    expect(context.messages.at(-1)?.content).toBe("回答 6");
  });

  it("支持清空当前用户在当前群的上下文", async () => {
    const store = createPrisma();
    const service = new CoachConversationService(store.prisma as never);

    await service.appendExchange({ orgId: "org_1", memberId: "member_1", wecomUserid: "user_a", chatId: "group_1", userText: "问题", assistantText: "回答" });
    const cleared = await service.clearConversation({ orgId: "org_1", wecomUserid: "user_a", chatId: "group_1" });
    const context = await service.buildContext({ orgId: "org_1", memberId: "member_1", wecomUserid: "user_a", chatId: "group_1" });

    expect(cleared).toBe(true);
    expect(context.messages).toHaveLength(0);
  });
});
