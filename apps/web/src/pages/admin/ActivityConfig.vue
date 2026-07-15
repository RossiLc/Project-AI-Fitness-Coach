<template>
  <section class="panel activity-page">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Activity</span>
        <h2>{{ mode === "list" ? "活动配置" : "活动表单" }}</h2>
      </div>
      <div class="actions compact-actions">
        <button v-if="mode === 'form'" class="ghost" type="button" @click="backToList">返回列表</button>
        <button class="ghost" type="button" @click="load">刷新</button>
      </div>
    </div>

    <div v-if="mode === 'list'" class="list-view">
      <div class="table-toolbar">
        <p class="muted">活动内容会作为企业微信 AI 教练回答活动信息和活动规则查询的知识来源。</p>
        <button type="button" @click="openCreateForm">新增活动</button>
      </div>

      <table v-if="configs.length" class="section-table">
        <thead>
          <tr>
            <th>活动名称</th>
            <th>状态</th>
            <th>活动周期</th>
            <th>活动内容摘要</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in configs" :key="item.id">
            <td><strong>{{ item.name }}</strong></td>
            <td><span class="status-pill">{{ statusLabel(item.status) }}</span></td>
            <td>{{ formatDate(item.startAt) }} - {{ formatDate(item.endAt) }}</td>
            <td class="summary-cell">{{ summarize(item.content) }}</td>
            <td>
              <button class="table-action" type="button" @click="openForm(item)">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无活动配置。</div>
    </div>

    <form v-else class="activity-form" @submit.prevent="save">
      <label>
        活动名称
        <input v-model="form.name" placeholder="例如：夏季 21 天运动打卡" />
      </label>
      <div class="date-grid">
        <label>
          开始日期
          <input v-model="form.startAt" type="date" />
        </label>
        <label>
          结束日期
          <input v-model="form.endAt" type="date" />
        </label>
      </div>
      <label>
        活动内容
        <textarea v-model="form.content" rows="16" placeholder="填写活动说明、打卡规则、排行榜规则、隐私边界等内容。AI 教练会读取这里回答群内活动查询。"></textarea>
      </label>
      <div class="form-meta">
        <template v-if="selected">
          <span>状态：{{ statusLabel(selected.status) }}</span>
          <span>周期：{{ formatDate(selected.startAt) }} - {{ formatDate(selected.endAt) }}</span>
        </template>
        <template v-else>
          <span>状态：草稿</span>
          <span>周期：{{ form.startAt }} - {{ form.endAt }}</span>
        </template>
      </div>
      <div class="actions">
        <button type="submit" :disabled="saving">{{ selected ? "保存活动" : "创建活动" }}</button>
        <button class="ghost" type="button" @click="backToList">取消</button>
      </div>
    </form>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { ActivityConfigDto, UpdateActivityConfigRequest } from "@openfit/shared";
import { createActivityConfig, getActivityConfigs, updateActivityConfig } from "../../api/admin";

const mode = ref<"list" | "form">("list");
const configs = ref<ActivityConfigDto[]>([]);
const selected = ref<ActivityConfigDto | null>(null);
const message = ref("");
const error = ref("");
const saving = ref(false);

const form = reactive<UpdateActivityConfigRequest>({
  name: "",
  content: "",
  startAt: "",
  endAt: ""
});

async function load() {
  error.value = "";
  try {
    configs.value = await getActivityConfigs();
    if (selected.value) {
      selected.value = configs.value.find((item) => item.id === selected.value?.id) ?? selected.value;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "活动配置加载失败";
  }
}

function openForm(item: ActivityConfigDto) {
  selected.value = item;
  form.name = item.name;
  form.content = item.content;
  form.startAt = formatDate(item.startAt);
  form.endAt = formatDate(item.endAt);
  mode.value = "form";
  message.value = "";
  error.value = "";
}

function openCreateForm() {
  selected.value = null;
  form.name = "";
  form.content = "";
  const period = defaultPeriod();
  form.startAt = period.startAt;
  form.endAt = period.endAt;
  mode.value = "form";
  message.value = "";
  error.value = "";
}

function backToList() {
  mode.value = "list";
  selected.value = null;
  message.value = "";
  error.value = "";
}

async function save() {
  error.value = "";
  message.value = "";
  if (!form.name.trim() || !form.content.trim() || !form.startAt || !form.endAt) {
    error.value = "活动名称、活动周期和活动内容不能为空";
    return;
  }
  if (form.endAt < form.startAt) {
    error.value = "活动结束日期不能早于开始日期";
    return;
  }
  saving.value = true;
  const isEditing = Boolean(selected.value);
  try {
    const payload = { name: form.name.trim(), content: form.content.trim(), startAt: form.startAt, endAt: form.endAt };
    const saved = isEditing && selected.value ? await updateActivityConfig(selected.value.id, payload) : await createActivityConfig(payload);
    configs.value = isEditing ? configs.value.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...configs.value];
    selected.value = saved;
    message.value = isEditing ? "活动已保存" : "活动已创建";
    mode.value = "list";
  } catch (err) {
    error.value = err instanceof Error ? err.message : isEditing ? "活动保存失败" : "活动创建失败";
  } finally {
    saving.value = false;
  }
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function defaultPeriod() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return { startAt: toDateInputValue(start), endAt: toDateInputValue(end) };
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function summarize(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact || "未填写";
}

function statusLabel(value: string) {
  return {
    active: "进行中",
    draft: "草稿",
    paused: "暂停",
    ended: "已结束"
  }[value] ?? value;
}

onMounted(load);
</script>

<style scoped>
.activity-page {
  display: grid;
  gap: 14px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-cell {
  max-width: 420px;
  color: var(--muted);
}

.activity-form {
  display: grid;
  gap: 14px;
  max-width: 880px;
}

.activity-form label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-weight: 800;
}

.activity-form textarea {
  min-height: 360px;
  line-height: 1.7;
}

.date-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 760px) {
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .date-grid {
    grid-template-columns: 1fr;
  }
}
</style>
