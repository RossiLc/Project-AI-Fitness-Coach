<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Leaderboard</span>
        <h2>排行榜</h2>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </div>
    <p class="muted">{{ leaderboard?.rule ?? "按有效打卡天数优先、累计运动时长次之排序。" }}</p>
    <div v-if="leaderboard?.entries.length" class="rank-list">
      <div v-for="entry in leaderboard.entries" :key="entry.memberId">
        <strong>{{ entry.rank }}</strong>
        <span>{{ entry.memberName }}</span>
        <em>有效打卡 {{ entry.checkinDays }} 天 / {{ entry.durationMin }} 分钟</em>
      </div>
    </div>
    <div v-else class="empty">暂无有效打卡数据，提交后会自动进入排行榜计算。</div>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { LeaderboardDto } from "@openfit/shared";
import { getLeaderboard } from "../../api/leaderboards";

const leaderboard = ref<LeaderboardDto>();
const error = ref("");

async function load() {
  error.value = "";
  try {
    leaderboard.value = await getLeaderboard();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "排行榜加载失败";
  }
}

onMounted(load);
</script>
