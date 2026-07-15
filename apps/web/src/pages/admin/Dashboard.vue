<template>
  <section class="page-grid">
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
      <p class="muted">当前看板只保留打卡闭环核心指标，后续需要运营分析时再扩展。</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { DashboardSummary } from "@openfit/shared";
import { getDashboardSummary } from "../../api/admin";

const summary = ref<DashboardSummary | null>(null);
const error = ref("");

async function load() {
  error.value = "";
  try {
    summary.value = await getDashboardSummary();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "运营看板加载失败";
  }
}

onMounted(load);
</script>
