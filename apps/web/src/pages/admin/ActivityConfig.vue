<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Activity</span>
        <h2>活动配置</h2>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </div>
    <form v-if="config" class="form-grid" @submit.prevent="save">
      <label>
        活动名称
        <input v-model="form.name" />
      </label>
      <label>
        每日提醒时间
        <input v-model="form.reminderTime" placeholder="20:00" />
      </label>
      <label>
        主排序
        <select v-model="form.rankingPrimary">
          <option value="checkin_days">有效打卡天数</option>
        </select>
      </label>
      <label>
        次排序
        <select v-model="form.rankingSecondary">
          <option value="duration_min">累计运动时长</option>
        </select>
      </label>
      <label>
        补卡窗口（天）
        <input v-model.number="form.makeupWindowDays" type="number" min="0" max="30" />
      </label>
      <div class="actions span-2">
        <button type="submit">保存配置</button>
      </div>
    </form>
    <div v-else class="empty">暂无进行中的活动。</div>
    <p class="muted">排行榜规则当前固定为“有效打卡天数优先、累计运动时长次之”，该配置会同步影响 Web 排行榜和企业微信群周榜。</p>
    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { ActivityConfigDto, UpdateActivityConfigRequest } from "@openfit/shared";
import { getActivityConfig, updateActivityConfig } from "../../api/admin";

const config = ref<ActivityConfigDto | null>(null);
const form = reactive<UpdateActivityConfigRequest>({
  name: "",
  reminderTime: "20:00",
  rankingPrimary: "checkin_days",
  rankingSecondary: "duration_min",
  makeupWindowDays: 1
});
const message = ref("");
const error = ref("");

async function load() {
  error.value = "";
  try {
    config.value = await getActivityConfig();
    if (config.value) Object.assign(form, pickForm(config.value));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "活动配置加载失败";
  }
}

async function save() {
  if (!config.value) return;
  config.value = await updateActivityConfig(config.value.id, form);
  Object.assign(form, pickForm(config.value));
  message.value = "活动配置已保存";
}

function pickForm(value: ActivityConfigDto): UpdateActivityConfigRequest {
  return {
    name: value.name,
    reminderTime: value.reminderTime,
    rankingPrimary: value.rankingPrimary,
    rankingSecondary: value.rankingSecondary,
    makeupWindowDays: value.makeupWindowDays
  };
}

onMounted(load);
</script>
