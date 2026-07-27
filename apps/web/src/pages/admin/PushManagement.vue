<template>
  <section v-if="!groupId" class="empty">请先在群管理中新增并选择一个群。</section>
  <section v-else class="panel push-page">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Push</span>
        <h2>推送管理</h2>
      </div>
      <div class="actions compact-actions">
        <button @click="openCreate">新增推送</button>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>

    <table v-if="campaigns.length" class="section-table">
      <thead>
        <tr>
          <th>推送内容</th>
          <th>目标群</th>
          <th>计划时间</th>
          <th>状态</th>
          <th>最近发送</th>
          <th>失败原因</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="campaign in campaigns" :key="campaign.id">
          <td class="content-cell">{{ summary(campaign.content) }}</td>
          <td>{{ campaign.groupName }}</td>
          <td>
            <strong>{{ scheduleLabel(campaign) }}</strong>
            <small class="cell-note">下次：{{ formatDateTime(campaign.scheduledAt) }}</small>
          </td>
          <td><span class="status-pill">{{ statusLabel(campaign.status) }}</span></td>
          <td>{{ formatDateTime(campaign.lastSentAt) }}</td>
          <td class="breakable">{{ campaign.lastError ?? "-" }}</td>
          <td>
            <div class="actions compact-actions">
              <button class="ghost table-action" @click="openEdit(campaign)">编辑</button>
              <button class="table-action" @click="sendNow(campaign.id)">手动推送</button>
              <button class="ghost table-action danger-action" @click="remove(campaign)">删除</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">当前群还没有推送内容。可以先新增一条运营提醒或活动通知。</div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="modalOpen" class="modal-backdrop" role="dialog" aria-modal="true" aria-label="推送内容表单">
      <form class="modal-dialog" @submit.prevent="save">
        <div class="modal-heading">
          <div>
            <span class="eyebrow">{{ editingId ? "Edit" : "Create" }}</span>
            <h3>{{ editingId ? "编辑推送" : "新增推送" }}</h3>
          </div>
          <button type="button" class="ghost table-action" @click="closeModal">关闭</button>
        </div>

        <label>
          目标群
          <select v-model="form.groupId">
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>

        <label>
          推送方式
          <select v-model="form.scheduleType">
            <option value="daily">每日推送</option>
            <option value="once">指定日期推送</option>
            <option value="draft">不自动推送</option>
          </select>
        </label>

        <label v-if="form.scheduleType === 'once'">
          指定日期
          <input v-model="form.scheduleDate" type="date" />
        </label>

        <label v-if="form.scheduleType !== 'draft'">
          推送时段
          <select v-model="form.scheduleSlot">
            <option v-for="slot in scheduleSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</option>
            <option value="custom">自定义时段</option>
          </select>
        </label>

        <label v-if="form.scheduleType !== 'draft' && form.scheduleSlot === 'custom'">
          自定义时段
          <input v-model="form.customScheduleSlot" type="time" step="60" />
        </label>

        <label>
          推送内容
          <textarea v-model="form.content" placeholder="输入要推送到群里的运营内容，例如：今晚 8 点前记得完成运动打卡。" />
        </label>

        <div class="modal-actions">
          <button type="submit">保存</button>
          <button type="button" class="ghost" @click="closeModal">取消</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from "vue";
import type { PushCampaignDto, PushCampaignScheduleSlot, PushCampaignScheduleType, WeComGroupDto } from "@openfit/shared";
import { createPushCampaign, deletePushCampaign, getGroups, getPushCampaigns, sendPushCampaignNow, updatePushCampaign } from "../../api/admin";
import { getCurrentGroupId, onCurrentGroupChange } from "../../api/group-context";

const campaigns = ref<PushCampaignDto[]>([]);
const groups = ref<WeComGroupDto[]>([]);
const groupId = ref(getCurrentGroupId());
const modalOpen = ref(false);
const editingId = ref("");
const message = ref("");
const error = ref("");
const form = reactive({
  groupId: "",
  content: "",
  scheduleType: "daily" as PushCampaignScheduleType,
  scheduleSlot: "09:00",
  customScheduleSlot: "08:30",
  scheduleDate: ""
});

const scheduleSlots = [
  { label: "早上 9 点", value: "09:00" },
  { label: "中午 12 点", value: "12:00" },
  { label: "下午 6 点", value: "18:00" }
] as const;

async function load() {
  if (!groupId.value) return;
  error.value = "";
  try {
    const [groupList, campaignList] = await Promise.all([getGroups(), getPushCampaigns(groupId.value)]);
    groups.value = groupList;
    campaigns.value = campaignList;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "推送列表加载失败";
  }
}

function openCreate() {
  editingId.value = "";
  form.groupId = groupId.value;
  form.content = "";
  form.scheduleType = "daily";
  form.scheduleSlot = "09:00";
  form.customScheduleSlot = "08:30";
  form.scheduleDate = "";
  modalOpen.value = true;
}

function openEdit(campaign: PushCampaignDto) {
  editingId.value = campaign.id;
  form.groupId = campaign.groupId;
  form.content = campaign.content;
  form.scheduleType = campaign.scheduleType;
  const slot = campaign.scheduleSlot ?? inferScheduleSlot(campaign.scheduledAt) ?? "09:00";
  if (isFixedScheduleSlot(slot)) {
    form.scheduleSlot = slot;
    form.customScheduleSlot = "08:30";
  } else {
    form.scheduleSlot = "custom";
    form.customScheduleSlot = slot;
  }
  form.scheduleDate = campaign.scheduleDate ?? "";
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

async function save() {
  error.value = "";
  message.value = "";
  try {
    const body = {
      groupId: form.groupId,
      content: form.content,
      scheduleType: form.scheduleType,
      scheduleSlot: form.scheduleType === "draft" ? undefined : normalizeScheduleSlot(resolveSelectedScheduleSlot()),
      scheduleDate: form.scheduleType === "once" ? form.scheduleDate : undefined
    };
    if (editingId.value) await updatePushCampaign(editingId.value, body);
    else await createPushCampaign(body);
    message.value = "推送内容已保存。";
    closeModal();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "推送内容保存失败";
  }
}

async function sendNow(id: string) {
  error.value = "";
  message.value = "";
  try {
    const result = await sendPushCampaignNow(id);
    if (result.status === "failed") {
      error.value = result.lastError ?? "企业微信推送失败";
    } else {
      message.value = "已通过打卡助手推送到目标群。";
    }
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "手动推送失败";
  }
}

async function remove(campaign: PushCampaignDto) {
  error.value = "";
  message.value = "";
  if (!window.confirm(`确认删除这条推送计划吗？\n${summary(campaign.content)}`)) return;
  try {
    await deletePushCampaign(campaign.id);
    message.value = "推送计划已删除。";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除推送计划失败";
  }
}

function summary(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

function statusLabel(status: string) {
  return { draft: "草稿", scheduled: "待推送", sent: "已发送", failed: "失败", cancelled: "已取消" }[status] ?? status;
}

function scheduleLabel(campaign: PushCampaignDto) {
  const slotLabel = formatScheduleSlotLabel(campaign.scheduleSlot);
  if (campaign.scheduleType === "daily") return `每日 ${slotLabel}`;
  if (campaign.scheduleType === "once") return `${campaign.scheduleDate ?? "-"} ${slotLabel}`;
  return "不自动推送";
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function inferScheduleSlot(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const slot = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return slot;
}

function normalizeScheduleSlot(value: string): PushCampaignScheduleSlot | undefined {
  const trimmed = value.trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed) ? (trimmed as PushCampaignScheduleSlot) : undefined;
}

function resolveSelectedScheduleSlot() {
  return form.scheduleSlot === "custom" ? form.customScheduleSlot : form.scheduleSlot;
}

function isFixedScheduleSlot(value: string) {
  return scheduleSlots.some((item) => item.value === value);
}

function formatScheduleSlotLabel(value?: string) {
  if (!value) return "-";
  return scheduleSlots.find((item) => item.value === value)?.label ?? `自定义 ${value}`;
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

<style scoped>
.push-page {
  display: grid;
  gap: 14px;
}

.content-cell {
  min-width: 220px;
  max-width: 360px;
  line-height: 1.55;
}

.cell-note {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-weight: 700;
}

.danger-action {
  color: var(--coral);
  border-color: rgba(207, 108, 76, 0.42);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(23, 33, 27, 0.56);
}

.modal-dialog {
  width: min(680px, 96vw);
  display: grid;
  gap: 14px;
  border: 1px solid rgba(255, 250, 240, 0.28);
  border-radius: 8px;
  background: #fffaf0;
  padding: 18px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
}

.modal-heading,
.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.modal-dialog label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-weight: 800;
}

.modal-dialog select {
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fffdf5;
  padding: 8px 10px;
  color: var(--ink);
}

@media (max-width: 760px) {
  .modal-actions {
    flex-direction: column;
  }

  .modal-actions button {
    width: 100%;
  }
}
</style>
