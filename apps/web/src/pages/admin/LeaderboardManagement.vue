<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Leaderboard</span>
        <h2>排行榜管理</h2>
      </div>
      <div class="actions compact-actions">
        <button @click="rebuild">重建当前排行</button>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>

    <div class="category-tabs" role="tablist" aria-label="排行榜分类">
      <button
        v-for="item in categories"
        :key="item.value"
        :class="{ active: category === item.value }"
        type="button"
        @click="changeCategory(item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <p class="muted">{{ leaderboard?.rule ?? "请选择分类查看当前活动排行榜。" }}</p>

    <table v-if="leaderboard?.entries.length" class="section-table">
      <thead>
        <tr>
          <th>排名</th>
          <th>成员</th>
          <th>{{ metricLabel }}</th>
          <th>打卡天数</th>
          <th>运动时长</th>
          <th>消耗能量</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in leaderboard.entries" :key="entry.memberId">
          <td>{{ entry.rank }}</td>
          <td>{{ entry.memberName }}</td>
          <td><strong>{{ metricValue(entry) }}</strong></td>
          <td>{{ entry.checkinDays }} 天</td>
          <td>{{ entry.durationMin }} 分钟</td>
          <td>{{ entry.calorieEstimate }} kcal</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">暂无当前分类的有效打卡数据。</div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { LeaderboardCategory, LeaderboardDto, LeaderboardEntryDto } from "@openfit/shared";
import { getLeaderboard, rebuildLeaderboard } from "../../api/leaderboards";

const categories: { label: string; value: LeaderboardCategory }[] = [
  { label: "打卡次数", value: "checkin_days" },
  { label: "运动时长", value: "duration_min" },
  { label: "消耗能量", value: "calorie_estimate" }
];

const category = ref<LeaderboardCategory>("checkin_days");
const leaderboard = ref<LeaderboardDto>();
const message = ref("");
const error = ref("");

const metricLabel = computed(() => categories.find((item) => item.value === category.value)?.label ?? "指标");

async function changeCategory(next: LeaderboardCategory) {
  category.value = next;
  await load();
}

async function load() {
  error.value = "";
  message.value = "";
  try {
    leaderboard.value = await getLeaderboard(category.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "排行榜加载失败";
  }
}

async function rebuild() {
  error.value = "";
  try {
    leaderboard.value = await rebuildLeaderboard(category.value);
    message.value = `${metricLabel.value}排行榜已按当前活动数据重建。`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "排行榜重建失败";
  }
}

function metricValue(entry: LeaderboardEntryDto) {
  if (category.value === "duration_min") return `${entry.durationMin} 分钟`;
  if (category.value === "calorie_estimate") return `${entry.calorieEstimate} kcal`;
  return `${entry.checkinDays} 次`;
}

onMounted(load);
</script>

<style scoped>
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.category-tabs button {
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--line);
}

.category-tabs button.active {
  color: #fffaf0;
  background: var(--green);
  border-color: var(--green);
}
</style>
