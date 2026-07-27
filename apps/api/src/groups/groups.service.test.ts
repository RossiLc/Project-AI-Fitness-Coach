import { describe, expect, it } from "vitest";
import { GroupsService } from "./groups.service.js";

describe("GroupsService", () => {
  it("binds a pending group when a WeCom group message contains its bind code", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo", bindCode: "OF-123456", status: "pending_binding" }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return { id: "group_1", orgId: "org_demo", name: "测试群", chatId: data.chatId, status: data.status, bindCode: "OF-123456", createdAt: new Date(), lastSeenAt: new Date() };
        }
      },
      member: {
        findFirst: async () => ({ id: "member_admin", orgId: "org_demo", displayName: "张三", wecomUserid: "zhangsan" })
      },
      weComGroupMember: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => create
      }
    };
    const service = new GroupsService(prisma as never);

    const group = await service.bindFromWeComMessage("org_demo", "chat_abc", "luocheng", "@Open Fit AI教练 绑定群 OF-123456", "coach");

    expect(group?.id).toBe("group_1");
    expect(updates[0]).toMatchObject({ chatId: "chat_abc", status: "active", botRole: "coach" });
  });

  it("treats an already active group bind code as idempotent success", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo", bindCode: "OF-123456", status: "active", chatId: "chat_abc" }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return { id: "group_1", orgId: "org_demo", name: "测试群", chatId: data.chatId, status: data.status, bindCode: "OF-123456", createdAt: new Date(), lastSeenAt: new Date() };
        }
      },
      member: {
        findFirst: async () => ({ id: "member_admin", orgId: "org_demo", displayName: "张三", wecomUserid: "zhangsan" })
      },
      weComGroupMember: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => create
      }
    };
    const service = new GroupsService(prisma as never);

    const group = await service.bindFromWeComMessage("org_demo", "chat_abc", "zhangsan", "@Open Fit AI教练 OF-123456", "coach");

    expect(group?.status).toBe("active");
    expect(updates[0]).toMatchObject({ chatId: "chat_abc", status: "active", botRole: "coach" });
  });

  it("imports Excel rows by userid and upserts existing members", async () => {
    const memberUpdates: Array<Record<string, unknown>> = [];
    const memberCreates: Array<Record<string, unknown>> = [];
    const groupMemberUpserts: Array<Record<string, unknown>> = [];
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      },
      member: {
        findFirst: async ({ where }: { where: { orgId: string; wecomUserid?: string } }) =>
          where.wecomUserid === "userid_existing" ? { id: "member_existing", orgId: "org_demo", displayName: "旧姓名", wecomUserid: "userid_existing" } : null,
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          memberUpdates.push({ where, data });
          return { id: where.id, orgId: "org_demo", ...data };
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          memberCreates.push(data);
          return { id: data.id ?? "member_new", ...data };
        }
      },
      weComGroupMember: {
        upsert: async (args: Record<string, unknown>) => {
          groupMemberUpserts.push(args);
          return args;
        }
      }
    };
    const service = new GroupsService(prisma as never);

    const result = await service.importMembersByUseridRows("org_demo", "group_1", [
      { userid: "userid_existing", name: "张三", department: "技术部" },
      { userid: "userid_new", name: "李四", department: "运营部" },
      { userid: "", name: "无 userid" }
    ]);

    expect(result.updated).toEqual([{ userid: "userid_existing", name: "张三", memberId: "member_existing", department: "技术部" }]);
    expect(result.created).toEqual([{ userid: "userid_new", name: "李四", memberId: expect.stringMatching(/^wecom_/) as unknown as string, department: "运营部" }]);
    expect(result.skipped).toEqual([{ rowNumber: 4, reason: "缺少 userid" }]);
    expect(memberUpdates[0]).toMatchObject({ where: { id: "member_existing" }, data: { displayName: "张三", department: "技术部", status: "active" } });
    expect(memberCreates[0]).toMatchObject({ displayName: "李四", department: "运营部", wecomUserid: "userid_new", status: "active" });
    expect(groupMemberUpserts).toHaveLength(2);
  });
});
