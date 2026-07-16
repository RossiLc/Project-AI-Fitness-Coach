<template>
  <section v-if="!groupId" class="empty">请先在群管理中新增并选择一个群。</section>
  <section v-else class="page-grid">
    <div class="metric-card">
      <span>今日打卡人数</span>
      <strong>{{ summary?.todayCheckinCount ?? 0 }}</strong>
    </div>
    <div class="metric-card">
      <span>未打卡人数</span>
      <strong>{{ summary?.missingCount ?? 0 }}</strong>
    </div>
    <div class="metric-card">
      <span>总人数</span>
      <strong>{{ summary?.totalMemberCount ?? 0 }}</strong>
    </div>
    <div class="metric-card">
      <span>打卡率</span>
      <strong>{{ summary?.checkinRate ?? 0 }}%</strong>
    </div>

    <div class="panel span-2">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">Overview</span>
          <h2>运营看板</h2>
        </div>
        <button class="ghost" @click="load">刷新</button>
      </div>
      <p class="muted">当前看板按所选企业微信群统计，只保留今日打卡人数、未打卡人数、总人数和打卡率。</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { DashboardSummary } from "@openfit/shared";
import { getDashboardSummary } from "../../api/admin";
import { getCurrentGroupId, onCurrentGroupChange } from "../../api/group-context";

const summary = ref<DashboardSummary | null>(null);
const groupId = ref(getCurrentGroupId());
const error = ref("");

async function load() {
  if (!groupId.value) return;
  error.value = "";
  try {
    summary.value = await getDashboardSummary(groupId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "运营看板加载失败";
  }
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
