<template>
  <section class="page-grid">
    <div class="panel span-2">
      <span class="eyebrow">AI Coach</span>
      <h2>AI 教练</h2>
      <p class="muted">默认使用 mock/GPT-5.5 兼容适配层。高风险健康问题会直接返回安全模板，不进入开放式模型回答。</p>
      <textarea v-model="question" placeholder="例如：今天适合做 20 分钟快走吗？" />
      <div class="actions">
        <button @click="ask" :disabled="loading || !question.trim()">询问教练</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div class="panel" v-if="answer">
      <span class="eyebrow">{{ answer.source }} / {{ answer.model }}</span>
      <h3>{{ answer.riskLevel === "escalate" ? "安全提醒" : "建议" }}</h3>
      <p class="muted">{{ answer.answer }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { CoachAdviceResponse } from "@openfit/shared";
import { askCoach } from "../../api/coach";

const question = ref("今天适合做 20 分钟快走吗？");
const answer = ref<CoachAdviceResponse | null>(null);
const loading = ref(false);
const error = ref("");

async function ask() {
  loading.value = true;
  error.value = "";
  try {
    answer.value = await askCoach(question.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "AI 教练暂不可用";
  } finally {
    loading.value = false;
  }
}
</script>
