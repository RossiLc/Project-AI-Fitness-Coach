<template>
  <section v-if="!groupId" class="empty">请先在群管理中新增并选择一个群。</section>
  <section v-else class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Members</span>
        <h2>成员管理</h2>
      </div>
      <div class="actions compact-actions">
        <button class="ghost" @click="toggleMissing">
          {{ missingOnly ? "查看全部成员" : "筛选今日未打卡" }}
        </button>
        <button @click="sendReminder">提醒未打卡</button>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>

    <table v-if="members.length">
      <thead>
        <tr>
          <th>成员</th>
          <th>部门</th>
          <th>企业微信 userid</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="member in members" :key="member.id">
          <td>{{ member.displayName }}</td>
          <td>{{ member.department ?? "-" }}</td>
          <td class="breakable">{{ member.wecomUserid ?? "-" }}</td>
          <td><span class="status-pill">{{ member.status }}</span></td>
          <td>
            <RouterLink class="link-button" :to="`/admin/members/${member.id}`">打卡明细</RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">{{ missingOnly ? "今天没有未打卡成员。" : "当前群暂无成员，请先在群管理中导入成员。" }}</div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import type { MemberDto } from "@openfit/shared";
import { getMembers, sendGroupMissingCheckinReminder } from "../../api/admin";
import { getCurrentGroupId, onCurrentGroupChange } from "../../api/group-context";

const members = ref<MemberDto[]>([]);
const missingOnly = ref(false);
const groupId = ref(getCurrentGroupId());
const message = ref("");
const error = ref("");

async function load() {
  if (!groupId.value) return;
  error.value = "";
  try {
    members.value = await getMembers(missingOnly.value, groupId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "成员加载失败";
  }
}

async function toggleMissing() {
  missingOnly.value = !missingOnly.value;
  await load();
}

async function sendReminder() {
  if (!groupId.value) return;
  error.value = "";
  try {
    const result = await sendGroupMissingCheckinReminder(groupId.value);
    message.value = `已通过打卡助手推送当前群未打卡提醒：今日未打卡 ${result.missingCount} 人。`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "未打卡提醒发送失败";
  }
}

let stop = () => {};
onMounted(() => {
  stop = onCurrentGroupChange((next) => {
    groupId.value = next;
    void load();
  });
  void load();
});
onUnmounted(() => stop());
</script>
