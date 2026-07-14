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

      <nav class="nav">
        <p>运营后台</p>
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
          <small>单管理员视角</small>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { MemberRole, type CurrentUser } from "@openfit/shared";
import { getMe, setApiRole } from "../api/client";

const me = ref<CurrentUser | null>(null);

onMounted(async () => {
  setApiRole(MemberRole.ActivityAdmin);
  me.value = await getMe().catch(() => null);
});
</script>
