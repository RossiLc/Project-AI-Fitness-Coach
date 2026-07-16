<template>
  <section class="page-grid">
    <div class="panel span-2">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">WeCom</span>
          <h2>企业微信智能机器人</h2>
        </div>
        <span class="status-pill">{{ result?.mode ?? "未测试" }}</span>
      </div>
      <p class="muted">
        群提醒通过 Open Fit 打卡助手的智能机器人长连接主动推送。首次推送前，需要先在目标群里 @ 打卡助手发送任意消息，系统会保存群 chatid。
      </p>
      <textarea v-model="message" />
      <div class="actions">
        <button @click="send" :disabled="loading">测试群推送</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div class="panel" v-if="result">
      <h3>发送结果</h3>
      <dl class="kv">
        <div><dt>通道</dt><dd>{{ result.mode }}</dd></div>
        <div><dt>结果</dt><dd>{{ result.ok ? "成功" : "失败" }}</dd></div>
        <div><dt>说明</dt><dd>{{ result.message }}</dd></div>
      </dl>
    </div>

    <div class="panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">App</span>
          <h3>自建应用状态</h3>
        </div>
        <button class="ghost" @click="loadAppStatus">刷新</button>
      </div>
      <dl class="kv" v-if="appStatus">
        <div><dt>状态</dt><dd>{{ appStatus.mode }}</dd></div>
        <div><dt>Corp ID</dt><dd>{{ appStatus.corpIdConfigured ? "已配置" : "未配置" }}</dd></div>
        <div><dt>Agent ID</dt><dd>{{ appStatus.agentIdConfigured ? "已配置" : "未配置" }}</dd></div>
        <div><dt>Secret</dt><dd>{{ appStatus.secretConfigured ? "已配置" : "未配置" }}</dd></div>
        <div><dt>OAuth</dt><dd>{{ appStatus.oauthReady ? "可生成 URL" : "待配置" }}</dd></div>
        <div><dt>应用消息</dt><dd>{{ appStatus.appMessageReady ? "可联调" : "待配置" }}</dd></div>
      </dl>
      <div class="actions">
        <button class="ghost" @click="previewOAuth">生成 OAuth URL</button>
      </div>
      <p v-if="oauthUrl" class="muted breakable">{{ oauthUrl }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { WeComAppStatusDto, WeComSendResult } from "@openfit/shared";
import { getWeComAppStatus, getWeComOAuthLoginUrl, sendWeComTestMessage } from "../../api/wecom";

const message = ref("Open Fit 企业微信智能机器人测试消息：长连接群推送已触发。");
const result = ref<WeComSendResult | null>(null);
const error = ref("");
const loading = ref(false);
const appStatus = ref<WeComAppStatusDto>();
const oauthUrl = ref("");

async function send() {
  loading.value = true;
  error.value = "";
  try {
    result.value = await sendWeComTestMessage(message.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "发送失败";
  } finally {
    loading.value = false;
  }
}

async function loadAppStatus() {
  appStatus.value = await getWeComAppStatus();
}

async function previewOAuth() {
  const result = await getWeComOAuthLoginUrl();
  oauthUrl.value = result.url ?? result.message ?? "OAuth URL 暂不可用";
}

loadAppStatus();
</script>
