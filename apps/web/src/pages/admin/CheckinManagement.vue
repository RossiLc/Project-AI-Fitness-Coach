<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Checkin Management</span>
        <h2>打卡管理</h2>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </div>
    <p class="muted">管理员可查看最近打卡记录并作废异常记录；作废操作会写入审计日志。</p>
    <table v-if="checkins.length">
      <thead><tr><th>成员</th><th>运动</th><th>状态</th><th>时长</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="checkin in checkins" :key="checkin.id">
          <td>{{ checkin.memberName }}</td>
          <td>{{ checkin.sportType ?? "-" }}</td>
          <td><span class="status-pill">{{ checkin.status }}</span></td>
          <td>{{ checkin.durationMin ?? 0 }} 分钟</td>
          <td>
            <button class="ghost table-action" :disabled="checkin.status === 'invalid'" @click="invalidate(checkin.id)">
              作废
            </button>
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
import type { AdminCheckinDto } from "@openfit/shared";
import { getAdminCheckins, invalidateCheckin } from "../../api/admin";

const checkins = ref<AdminCheckinDto[]>([]);
const message = ref("");
const error = ref("");

async function load() {
  error.value = "";
  try {
    checkins.value = await getAdminCheckins();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "打卡记录加载失败";
  }
}

async function invalidate(id: string) {
  const reason = window.prompt("请输入作废原因");
  if (!reason) return;
  await invalidateCheckin(id, reason);
  message.value = "已作废并写入审计日志";
  await load();
}

onMounted(load);
</script>
