<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">History</span>
        <h2>我的记录</h2>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </div>
    <div v-if="records.length === 0" class="empty">暂无记录。完成一次今日打卡后会显示在这里。</div>
    <table v-else>
      <thead><tr><th>状态</th><th>运动</th><th>时长</th><th>距离</th><th>提交时间</th></tr></thead>
      <tbody>
        <tr v-for="item in records" :key="item.id">
          <td><span class="status-pill">{{ item.status }}</span></td>
          <td>{{ item.sportType ?? "-" }}</td>
          <td>{{ item.durationMin ?? "-" }}</td>
          <td>{{ item.distanceKm ?? "-" }}</td>
          <td>{{ item.submittedAt ?? item.createdAt }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { CheckinRecordDto } from "@openfit/shared";
import { getMyCheckins } from "../../api/checkins";

const records = ref<CheckinRecordDto[]>([]);

async function load() {
  records.value = await getMyCheckins().catch(() => []);
}

onMounted(load);
</script>
