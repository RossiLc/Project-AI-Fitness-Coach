<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Reminder</span>
        <h2>提醒任务</h2>
      </div>
      <div class="actions compact-actions">
        <button class="ghost" @click="scan">扫描未打卡</button>
        <button class="ghost" @click="load">刷新</button>
      </div>
    </div>
    <table>
      <thead><tr><th>成员</th><th>渠道</th><th>状态</th><th>失败原因</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="task in tasks" :key="task.id">
          <td>{{ task.memberName }}</td>
          <td>{{ task.channel }}</td>
          <td><span class="status-pill">{{ task.status }}</span></td>
          <td>{{ task.lastError ?? "-" }}</td>
          <td>
            <div class="actions compact-actions">
              <button class="ghost table-action" @click="sendPersonal(task.id)">个人提醒</button>
              <button class="ghost table-action" @click="retry(task.id)">重试</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ReminderTaskDto } from "@openfit/shared";
import { getReminderTasks, retryReminderTask, scanReminderTasks, sendPersonalReminder } from "../../api/admin";

const tasks = ref<ReminderTaskDto[]>([]);
const message = ref("");
const error = ref("");

async function load() {
  error.value = "";
  try {
    tasks.value = await getReminderTasks();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "提醒任务加载失败";
  }
}

async function scan() {
  const result = await scanReminderTasks();
  message.value = `已生成 ${result.created} 条待人工处理提醒任务`;
  await load();
}

async function retry(id: string) {
  await retryReminderTask(id);
  message.value = "已提交重试";
  await load();
}

async function sendPersonal(id: string) {
  await sendPersonalReminder(id);
  message.value = "已发送个人提醒或更新为人工处理";
  await load();
}

onMounted(load);
</script>
