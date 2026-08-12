<template>
  <section class="panel direct-message-page">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Direct Message</span>
        <h2>单聊推送</h2>
      </div>
    </div>

    <form class="direct-form" @submit.prevent="send">
      <label>
        指定用户 userid
        <input v-model="form.targetUserid" placeholder="输入企业微信 userid，例如：woi1UAEg..." autocomplete="off" />
      </label>

      <label>
        推送内容
        <textarea v-model="form.content" placeholder="输入要通过 Open Fit AI 教练发送给该用户的 Markdown 内容，例如：该打卡啦~" />
      </label>

      <div class="actions">
        <button type="submit" :disabled="sending">{{ sending ? "发送中..." : "发送" }}</button>
        <button type="button" class="ghost" @click="reset">清空</button>
      </div>
    </form>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { sendWeComDirectMessage } from "../../api/wecom";

const sending = ref(false);
const message = ref("");
const error = ref("");
const form = reactive({
  targetUserid: "",
  content: ""
});

async function send() {
  message.value = "";
  error.value = "";
  sending.value = true;
  try {
    const result = await sendWeComDirectMessage({
      targetUserid: form.targetUserid,
      content: form.content
    });
    message.value = result.message || "已通过 Open Fit AI 教练发送单聊消息。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "单聊推送失败";
  } finally {
    sending.value = false;
  }
}

function reset() {
  form.targetUserid = "";
  form.content = "";
  message.value = "";
  error.value = "";
}
</script>

<style scoped>
.direct-message-page {
  display: grid;
  gap: 18px;
}

.direct-form {
  display: grid;
  gap: 16px;
  max-width: 760px;
}

.direct-form label {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-weight: 800;
}

.direct-form input,
.direct-form textarea {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fffdf5;
  color: var(--ink);
  padding: 10px 12px;
  font: inherit;
}

.direct-form textarea {
  min-height: 180px;
  resize: vertical;
  line-height: 1.6;
}
</style>
