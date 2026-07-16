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
      <p class="muted">上传企业微信成员 Excel，表头需包含 userId、中文名称、部门。userid 相同会覆盖姓名和部门，新 userid 会新增成员。</p>
      <input ref="fileInput" type="file" accept=".xlsx,.xls" @change="selectMemberFile" />
      <div class="actions">
        <button :disabled="!pendingRows.length" @click="importMembersByFile">导入成员</button>
      </div>
      <p v-if="pendingRows.length" class="muted">已解析 {{ pendingRows.length }} 条成员数据。</p>
    </div>

    <div v-if="useridImportResult" class="import-result">
      <p><strong>新增：</strong>{{ useridImportResult.created.length }} 人</p>
      <p><strong>覆盖更新：</strong>{{ useridImportResult.updated.length }} 人</p>
      <p><strong>跳过：</strong>{{ useridImportResult.skipped.length }} 行</p>
      <p v-if="useridImportResult.skipped.length" class="muted">
        {{ useridImportResult.skipped.map((item) => `第 ${item.rowNumber} 行：${item.reason}`).join("；") }}
      </p>
    </div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { ImportGroupMemberByUseridRow, ImportGroupMembersByUseridResult, WeComGroupDto } from "@openfit/shared";
import { createGroup, getGroups, importGroupMembersByUseridRows } from "../../api/admin";
import { getCurrentGroupId, setCurrentGroupId } from "../../api/group-context";
import { parseGroupMembersFromWorkbook } from "./group-member-import";

const groups = ref<WeComGroupDto[]>([]);
const newName = ref("");
const currentGroupId = ref(getCurrentGroupId());
const pendingRows = ref<ImportGroupMemberByUseridRow[]>([]);
const useridImportResult = ref<ImportGroupMembersByUseridResult | null>(null);
const fileInput = ref<HTMLInputElement>();
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

async function selectMemberFile(event: Event) {
  error.value = "";
  message.value = "";
  useridImportResult.value = null;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    pendingRows.value = await parseGroupMembersFromWorkbook(await file.arrayBuffer());
    if (!pendingRows.value.length) error.value = "未解析到成员数据，请确认表头包含 userId 和中文名称";
  } catch (err) {
    pendingRows.value = [];
    error.value = err instanceof Error ? err.message : "Excel 解析失败";
  }
}

async function importMembersByFile() {
  if (!currentGroupId.value) return;
  error.value = "";
  message.value = "";
  if (!pendingRows.value.length) {
    error.value = "请先选择成员 Excel 文件";
    return;
  }
  try {
    useridImportResult.value = await importGroupMembersByUseridRows(currentGroupId.value, pendingRows.value);
    message.value = `导入完成：新增 ${useridImportResult.value.created.length} 人，覆盖更新 ${useridImportResult.value.updated.length} 人。`;
    pendingRows.value = [];
    if (fileInput.value) fileInput.value.value = "";
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
