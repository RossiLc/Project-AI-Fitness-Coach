<template>
  <section class="panel group-page">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Groups</span>
        <h2>群管理</h2>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </div>

    <div class="group-create">
      <input v-model="newName" placeholder="输入企业微信群名称，例如：Open Fit 打卡群" />
      <button @click="create">新增群</button>
    </div>

    <table v-if="groups.length" class="section-table">
      <thead>
        <tr>
          <th>群名称</th>
          <th>状态</th>
          <th>绑定口令</th>
          <th>chatid</th>
          <th>成员数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="group in groups" :key="group.id">
          <td><strong>{{ group.name }}</strong></td>
          <td><span class="status-pill">{{ statusLabel(group.status) }}</span></td>
          <td class="breakable">{{ group.bindCode }}</td>
          <td class="breakable">{{ group.chatId ?? "未绑定" }}</td>
          <td>{{ group.memberCount }}</td>
          <td>
            <button class="table-action" @click="select(group.id)">设为当前群</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">还没有群。请先新增群，然后在目标企业微信群里 @Open Fit 打卡助手发送绑定口令。</div>

    <div v-if="currentGroup" class="member-import">
      <h3>导入当前群成员</h3>
      <p class="muted">支持从群里复制中文名后粘贴，例如：张三;李四;。系统会用企业微信通讯录匹配 userid，重名和未找到会显示出来。</p>
      <textarea v-model="namesText" rows="6" placeholder="张三;李四;"></textarea>
      <div class="actions">
        <button @click="importMembers">解析并导入</button>
      </div>
    </div>

    <div v-if="importResult" class="import-result">
      <p><strong>已匹配：</strong>{{ importResult.matched.length }} 人</p>
      <p><strong>重名待确认：</strong>{{ importResult.duplicates.map((item) => item.name).join("、") || "无" }}</p>
      <p><strong>未找到：</strong>{{ importResult.notFound.join("、") || "无" }}</p>
    </div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { ImportGroupMembersByNameResult, WeComGroupDto } from "@openfit/shared";
import { createGroup, getGroups, importGroupMembers } from "../../api/admin";
import { getCurrentGroupId, setCurrentGroupId } from "../../api/group-context";

const groups = ref<WeComGroupDto[]>([]);
const newName = ref("");
const namesText = ref("");
const currentGroupId = ref(getCurrentGroupId());
const importResult = ref<ImportGroupMembersByNameResult | null>(null);
const message = ref("");
const error = ref("");

const currentGroup = computed(() => groups.value.find((item) => item.id === currentGroupId.value));

async function load() {
  error.value = "";
  groups.value = await getGroups().catch((err) => {
    error.value = err instanceof Error ? err.message : "群列表加载失败";
    return [];
  });
  if (!currentGroupId.value && groups.value[0]) select(groups.value[0].id);
}

async function create() {
  error.value = "";
  message.value = "";
  if (!newName.value.trim()) {
    error.value = "请填写群名称";
    return;
  }
  try {
    const group = await createGroup(newName.value);
    groups.value = [group, ...groups.value];
    select(group.id);
    newName.value = "";
    message.value = `群已创建。请在目标企业微信群里发送：@Open Fit 打卡助手 绑定群 ${group.bindCode}`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "群创建失败";
  }
}

function select(groupId: string) {
  currentGroupId.value = groupId;
  setCurrentGroupId(groupId);
}

async function importMembers() {
  if (!currentGroupId.value) return;
  error.value = "";
  message.value = "";
  try {
    importResult.value = await importGroupMembers(currentGroupId.value, namesText.value);
    message.value = `导入完成：已匹配 ${importResult.value.matched.length} 人。`;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "成员导入失败";
  }
}

function statusLabel(status: string) {
  return { pending_binding: "待绑定", active: "已绑定", archived: "已归档" }[status] ?? status;
}

onMounted(load);
</script>

<style scoped>
.group-page {
  display: grid;
  gap: 16px;
}

.group-create {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 10px;
}

.member-import,
.import-result {
  border-top: 1px solid rgba(23, 33, 27, 0.12);
  padding-top: 16px;
}

@media (max-width: 760px) {
  .group-create {
    grid-template-columns: 1fr;
  }
}
</style>
