<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">OF</span>
        <div>
          <strong>Open Fit</strong>
          <small>管理员工作台</small>
        </div>
      </div>

      <div class="group-switcher">
        <label>当前群</label>
        <select v-model="currentGroupId" @change="selectGroup">
          <option value="">未选择群</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.name }} - {{ group.status === "active" ? "已绑定" : "待绑定" }}
          </option>
        </select>
      </div>

      <nav class="nav">
        <p>运营后台</p>
        <RouterLink to="/admin/groups">群管理</RouterLink>
        <RouterLink to="/admin/dashboard">运营看板</RouterLink>
        <RouterLink to="/admin/members">成员管理</RouterLink>
        <RouterLink to="/admin/activity">活动配置</RouterLink>
        <RouterLink to="/admin/leaderboards">排行榜管理</RouterLink>
      </nav>
    </aside>

    <main class="workspace">
      <header class="topline">
        <div>
          <span class="eyebrow">Admin Workbench</span>
          <h1>Open Fit 管理员工作台</h1>
        </div>
        <div class="user-chip">
          <span>{{ me?.displayName ?? "管理员" }}</span>
          <small>{{ currentGroupName }}</small>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, RouterView } from "vue-router";
import type { CurrentUser, WeComGroupDto } from "@openfit/shared";
import { getMe } from "../api/client";
import { getGroups } from "../api/admin";
import { getCurrentGroupId, setCurrentGroupId } from "../api/group-context";

const me = ref<CurrentUser | null>(null);
const groups = ref<WeComGroupDto[]>([]);
const currentGroupId = ref(getCurrentGroupId());

const currentGroupName = computed(() => groups.value.find((group) => group.id === currentGroupId.value)?.name ?? "未选择群");

function selectGroup() {
  setCurrentGroupId(currentGroupId.value);
}

onMounted(async () => {
  me.value = await getMe().catch(() => null);
  groups.value = await getGroups().catch(() => []);
  if (!currentGroupId.value && groups.value[0]) {
    currentGroupId.value = groups.value[0].id;
    setCurrentGroupId(currentGroupId.value);
  }
});
</script>
