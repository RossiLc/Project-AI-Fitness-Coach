<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Members</span>
        <h2>成员映射</h2>
      </div>
      <div class="actions compact-actions">
        <button class="ghost" @click="sync">同步预检</button>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>
    <p class="muted">这里维护 Open Fit 成员与企业微信 userid 的绑定。真实通讯录同步接入前，先用 mock 同步预检和手动绑定保证联调路径完整。</p>
    <table v-if="members.length">
      <thead><tr><th>姓名</th><th>部门</th><th>角色</th><th>企业微信 userid</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="member in members" :key="member.id">
          <td>{{ member.displayName }}</td>
          <td>{{ member.department ?? "-" }}</td>
          <td>{{ member.role }}</td>
          <td>{{ member.wecomUserid ?? "-" }}</td>
          <td><span class="status-pill">{{ member.mappingStatus }}</span></td>
          <td><button class="ghost table-action" @click="bind(member.id)">绑定</button></td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">暂无成员数据。</div>
    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { MemberDto } from "@openfit/shared";
import { bindMemberWeComUserid, getMembers, syncWeComMembers } from "../../api/wecom";

const members = ref<MemberDto[]>([]);
const message = ref("");
const error = ref("");

async function load() {
  error.value = "";
  try {
    members.value = await getMembers();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "成员加载失败";
  }
}

async function bind(id: string) {
  const userid = window.prompt("请输入企业微信 userid");
  if (!userid) return;
  await bindMemberWeComUserid(id, userid);
  message.value = "已更新企业微信 userid 绑定";
  await load();
}

async function sync() {
  const result = await syncWeComMembers();
  message.value = result.message;
  await load();
}

onMounted(load);
</script>
