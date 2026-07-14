<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Leaderboard</span>
        <h2>排行榜管理</h2>
      </div>
      <div class="actions compact-actions">
        <button @click="rebuild">重建排行榜</button>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>

    <p class="muted">{{ leaderboard?.rule ?? "参与天数优先，累计运动时长作为同分排序。" }}</p>

    <div v-if="leaderboard?.entries.length" class="rank-list">
      <div v-for="entry in leaderboard.entries" :key="entry.memberId">
        <strong>{{ entry.rank }}</strong>
        <span>{{ entry.memberName }}</span>
        <em>参与 {{ entry.checkinDays }} 天 / {{ entry.durationMin }} 分钟</em>
      </div>
    </div>
    <div v-else class="empty">暂无有效打卡数据，成员完成打卡后会进入参与天数排行榜。</div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { LeaderboardDto } from "@openfit/shared";
import { getLeaderboard, rebuildLeaderboard } from "../../api/leaderboards";

const leaderboard = ref<LeaderboardDto>();
const message = ref("");
const error = ref("");

async function load() {
  error.value = "";
  try {
    leaderboard.value = await getLeaderboard();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "排行榜加载失败";
  }
}

async function rebuild() {
  error.value = "";
  try {
    leaderboard.value = await rebuildLeaderboard();
    message.value = "排行榜已按当前活动数据重建。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "排行榜重建失败";
  }
}

onMounted(load);
</script>
