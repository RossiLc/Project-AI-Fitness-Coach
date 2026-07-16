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

    const group = await service.bindFromWeComMessage("org_demo", "chat_abc", "luocheng", "@Open Fit 打卡助手 绑定群 OF-123456");

    expect(group?.id).toBe("group_1");
    expect(updates[0]).toMatchObject({ chatId: "chat_abc", status: "active" });
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

    const group = await service.bindFromWeComMessage("org_demo", "chat_abc", "zhangsan", "@Open Fit 打卡助手 OF-123456");

    expect(group?.status).toBe("active");
    expect(updates[0]).toMatchObject({ chatId: "chat_abc", status: "active" });
  });

  it("imports pasted Chinese names by matching WeCom directory members", async () => {
    const createdMembers: Array<Record<string, unknown>> = [];
    const createdGroupMembers: Array<Record<string, unknown>> = [];
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      },
      member: {
        findFirst: async ({ where }: { where: { orgId: string; wecomUserid?: string } }) => (where.wecomUserid === "userid_zs" ? { id: "member_existing", orgId: "org_demo", displayName: "张三", wecomUserid: "userid_zs" } : null),
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "member_existing", orgId: "org_demo", ...data }),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdMembers.push(data);
          return { id: data.id ?? "member_new", ...data };
        }
      },
      weComGroupMember: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => {
          createdGroupMembers.push(create);
          return create;
        }
      }
    };
    const directory = {
      listMembers: async () => [
        { userid: "userid_zs", name: "张三", department: "技术部" },
        { userid: "userid_ls", name: "李四", department: "运营部" },
        { userid: "userid_ww_a", name: "王五", department: "产品部" },
        { userid: "userid_ww_b", name: "王五", department: "技术部" }
      ]
    };
    const service = new GroupsService(prisma as never, directory as never);

    const result = await service.importMembersByNames("org_demo", "group_1", "张三;李四;王五;不存在;");

    expect(result.matched).toHaveLength(2);
    expect(result.duplicates).toEqual([{ name: "王五", candidates: expect.arrayContaining([expect.objectContaining({ userid: "userid_ww_a" }), expect.objectContaining({ userid: "userid_ww_b" })]) }]);
    expect(result.notFound).toEqual(["不存在"]);
    expect(createdMembers[0]).toMatchObject({ displayName: "李四", wecomUserid: "userid_ls" });
    expect(createdGroupMembers).toHaveLength(2);
  });
});
