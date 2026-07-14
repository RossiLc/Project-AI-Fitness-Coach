<template>
  <section class="page-grid">
    <div class="panel span-2">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">Employee</span>
          <h2>今日打卡</h2>
        </div>
        <span class="status-pill">{{ submitted ? "已提交" : recognition ? "待确认" : "未打卡" }}</span>
      </div>

      <textarea v-model="text" placeholder="例如：今天快走 40 分钟，大概 4 公里" />
      <label class="file-line">
        图片打卡附件
        <input type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange" />
      </label>
      <div class="actions">
        <button @click="recognize" :disabled="loading || !text.trim()">识别运动内容</button>
        <button class="ghost" @click="reset">清空</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div class="panel" v-if="recognition">
      <span class="eyebrow">AI / Rule Result</span>
      <h3>识别结果</h3>
      <dl class="kv">
        <div><dt>运动类型</dt><dd>{{ recognition.recognition.sportType }}</dd></div>
        <div><dt>时长</dt><dd>{{ recognition.recognition.durationMin }} 分钟</dd></div>
        <div><dt>距离</dt><dd>{{ recognition.recognition.distanceKm ?? "-" }} 公里</dd></div>
        <div><dt>强度</dt><dd>{{ recognition.recognition.intensity }}</dd></div>
        <div><dt>估算热量</dt><dd>{{ recognition.recognition.calorieEstimate ?? "-" }} 千卡</dd></div>
      </dl>
      <p class="muted">{{ recognition.recognition.notice }}</p>
      <p v-if="attachmentMessage" class="muted">{{ attachmentMessage }}</p>
      <button @click="submit" :disabled="loading || submitted">确认提交</button>
    </div>

    <div class="panel">
      <span class="eyebrow">Boundary</span>
      <h3>第一阶段说明</h3>
      <p class="muted">文本识别可走 AI adapter；图片当前作为受控附件保存，识别结果后续扩展，原图不通过静态目录公开。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { RecognizeCheckinResponse } from "@openfit/shared";
import { recognizeCheckin, submitCheckin, uploadAttachment } from "../../api/checkins";

const text = ref("今天快走 40 分钟，大概 4 公里");
const recognition = ref<RecognizeCheckinResponse | null>(null);
const loading = ref(false);
const submitted = ref(false);
const error = ref("");
const pendingFile = ref<File | null>(null);
const attachmentMessage = ref("");

async function recognize() {
  loading.value = true;
  error.value = "";
  try {
    recognition.value = await recognizeCheckin("act_demo", text.value);
    if (pendingFile.value) await uploadPendingFile();
    submitted.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "识别失败";
  } finally {
    loading.value = false;
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  pendingFile.value = input.files?.[0] ?? null;
  attachmentMessage.value = pendingFile.value ? `已选择附件：${pendingFile.value.name}` : "";
}

async function uploadPendingFile() {
  if (!pendingFile.value || !recognition.value) return;
  const base64Data = await fileToBase64(pendingFile.value);
  const attachment = await uploadAttachment({
    checkinId: recognition.value.checkinId,
    activityId: "act_demo",
    filename: pendingFile.value.name,
    mimeType: pendingFile.value.type as "image/jpeg" | "image/png" | "image/webp",
    base64Data
  });
  attachmentMessage.value = `附件已保存：${attachment.id}。图片识别结果后续扩展，当前不公开原图。`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function submit() {
  if (!recognition.value) return;
  loading.value = true;
  try {
    await submitCheckin(recognition.value.checkinId, recognition.value.recognition);
    submitted.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "提交失败";
  } finally {
    loading.value = false;
  }
}

function reset() {
  recognition.value = null;
  submitted.value = false;
  error.value = "";
  pendingFile.value = null;
  attachmentMessage.value = "";
  text.value = "";
}
</script>
