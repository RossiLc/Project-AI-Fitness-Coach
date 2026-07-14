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

    <div v-if="history" class="kv detail-kv">
      <div><dt>部门</dt><dd>{{ history.member.department ?? "-" }}</dd></div>
      <div><dt>企业微信 userid</dt><dd class="breakable">{{ history.member.wecomUserid ?? "-" }}</dd></div>
      <div><dt>成员状态</dt><dd>{{ history.member.status }}</dd></div>
    </div>

    <table v-if="history?.checkins.length" class="section-table">
      <thead>
        <tr>
          <th>提交时间</th>
          <th>运动</th>
          <th>时长</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="checkin in history.checkins" :key="checkin.id">
          <td>{{ checkin.submittedAt ?? checkin.createdAt }}</td>
          <td>{{ checkin.sportType ?? "-" }}</td>
          <td>{{ checkin.durationMin ?? 0 }} 分钟</td>
          <td><span class="status-pill">{{ checkin.status }}</span></td>
          <td class="actions compact-actions">
            <button v-if="checkin.status !== 'invalid'" class="ghost table-action" @click="invalidate(checkin.id)">作废</button>
            <button v-else class="ghost table-action" @click="restore(checkin.id)">恢复</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">暂无打卡记录。</div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import type { MemberCheckinHistoryDto } from "@openfit/shared";
import { getMemberCheckins, invalidateCheckin, restoreCheckin } from "../../api/admin";

const props = defineProps<{ id: string }>();
const history = ref<MemberCheckinHistoryDto | null>(null);
const message = ref("");
const error = ref("");

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

onMounted(load);
</script>
