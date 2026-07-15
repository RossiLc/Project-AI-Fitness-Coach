<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Member Detail</span>
        <h2>{{ history?.member.displayName ?? "成员打卡明细" }}</h2>
      </div>
      <div class="actions compact-actions">
        <RouterLink class="link-button" to="/admin/members">返回成员列表</RouterLink>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>

    <div v-if="history" class="member-detail-block">
      <div class="block-title">
        <span class="eyebrow">Profile</span>
        <h3>成员基础信息</h3>
      </div>
      <div class="profile-grid">
        <div>
          <span>企业微信用户名称</span>
          <strong>{{ history.member.displayName }}</strong>
        </div>
        <div>
          <span>企业微信 userid</span>
          <strong class="breakable">{{ history.member.wecomUserid ?? "-" }}</strong>
        </div>
        <div>
          <span>部门</span>
          <strong>{{ history.member.department ?? "-" }}</strong>
        </div>
      </div>
    </div>

    <div class="member-detail-block">
      <div class="block-title">
        <span class="eyebrow">Check-ins</span>
        <h3>打卡数据列表</h3>
      </div>
      <table v-if="history?.checkins.length" class="section-table detail-table">
        <thead>
          <tr>
            <th>提交时间</th>
            <th>运动类型</th>
            <th>运动时长</th>
            <th>消耗能量</th>
            <th>打卡图片</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="checkin in history.checkins" :key="checkin.id">
            <td>{{ formatDateTime(checkin.submittedAt ?? checkin.createdAt) }}</td>
            <td>{{ checkin.sportType ?? "-" }}</td>
            <td>{{ checkin.durationMin ? `${checkin.durationMin} 分钟` : "-" }}</td>
            <td>{{ checkin.calorieEstimate ? `${checkin.calorieEstimate} 千卡` : "-" }}</td>
            <td>
              <div v-if="checkin.attachments?.length" class="image-list">
                <button
                  v-for="attachment in checkin.attachments"
                  :key="attachment.id"
                  class="preview-thumb"
                  type="button"
                  :disabled="previewUnavailable.has(attachment.id)"
                  :title="attachment.localPath"
                  @click="openPreview(attachment)"
                >
                  <img
                    v-if="!previewUnavailable.has(attachment.id)"
                    :src="getAttachmentPreviewUrl(attachment.id)"
                    :alt="imageLabel(attachment.localPath)"
                    loading="lazy"
                    @error="markPreviewUnavailable(attachment.id)"
                  />
                  <span>{{ previewUnavailable.has(attachment.id) ? "无法预览" : imageLabel(attachment.localPath) }}</span>
                </button>
              </div>
              <span v-else class="muted">-</span>
            </td>
            <td><span class="status-pill">{{ statusText(checkin.status) }}</span></td>
            <td class="actions compact-actions">
              <button v-if="checkin.status !== 'invalid'" class="ghost table-action" @click="invalidate(checkin.id)">作废</button>
              <button v-else class="ghost table-action" @click="restore(checkin.id)">恢复</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无打卡记录。</div>
    </div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="previewAttachment" class="preview-modal" role="dialog" aria-modal="true" @click.self="closePreview">
      <div class="preview-dialog">
        <div class="preview-heading">
          <div>
            <span class="eyebrow">Check-in Image</span>
            <h3>{{ imageLabel(previewAttachment.localPath) }}</h3>
          </div>
          <button class="ghost table-action" type="button" @click="closePreview">关闭</button>
        </div>
        <img class="preview-image" :src="getAttachmentPreviewUrl(previewAttachment.id)" :alt="imageLabel(previewAttachment.localPath)" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { CheckinStatus, type AttachmentDto, type MemberCheckinHistoryDto } from "@openfit/shared";
import { getAttachmentPreviewUrl, getMemberCheckins, invalidateCheckin, restoreCheckin } from "../../api/admin";

const props = defineProps<{ id: string }>();
const history = ref<MemberCheckinHistoryDto | null>(null);
const message = ref("");
const error = ref("");
const previewAttachment = ref<AttachmentDto | null>(null);
const previewUnavailable = ref(new Set<string>());

async function load() {
  error.value = "";
  try {
    history.value = await getMemberCheckins(props.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "打卡明细加载失败";
  }
}

async function invalidate(id: string) {
  const reason = window.prompt("请输入作废原因");
  if (!reason) return;
  await invalidateCheckin(id, reason);
  message.value = "已作废该打卡记录";
  await load();
}

async function restore(id: string) {
  await restoreCheckin(id);
  message.value = "已恢复该打卡记录";
  await load();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function statusText(status: string) {
  const map: Record<string, string> = {
    [CheckinStatus.Draft]: "草稿",
    [CheckinStatus.Recognized]: "待确认",
    [CheckinStatus.Submitted]: "已提交",
    [CheckinStatus.Corrected]: "已修正",
    [CheckinStatus.Withdrawn]: "已撤回",
    [CheckinStatus.Invalid]: "已作废"
  };
  return map[status] ?? status;
}

function imageLabel(path: string) {
  return path.split(/[\\/]/).pop() || "查看图片";
}

function openPreview(attachment: AttachmentDto) {
  if (previewUnavailable.value.has(attachment.id)) return;
  previewAttachment.value = attachment;
}

function closePreview() {
  previewAttachment.value = null;
}

function markPreviewUnavailable(id: string) {
  previewUnavailable.value = new Set([...previewUnavailable.value, id]);
  if (previewAttachment.value?.id === id) closePreview();
}

onMounted(load);
</script>
