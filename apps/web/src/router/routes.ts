import type { RouteRecordRaw } from "vue-router";
import Dashboard from "../pages/admin/Dashboard.vue";
import ActivityConfig from "../pages/admin/ActivityConfig.vue";
import DirectMessage from "../pages/admin/DirectMessage.vue";
import GroupManagement from "../pages/admin/GroupManagement.vue";
import LeaderboardManagement from "../pages/admin/LeaderboardManagement.vue";
import MemberDetail from "../pages/admin/MemberDetail.vue";
import Members from "../pages/admin/Members.vue";
import PushManagement from "../pages/admin/PushManagement.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/admin/dashboard" },
  { path: "/admin/groups", component: GroupManagement },
  { path: "/admin/dashboard", component: Dashboard },
  { path: "/admin/members", component: Members },
  { path: "/admin/members/:id", component: MemberDetail, props: true },
  { path: "/admin/activity", component: ActivityConfig },
  { path: "/admin/leaderboards", component: LeaderboardManagement },
  { path: "/admin/pushes", component: PushManagement },
  { path: "/admin/direct-message", component: DirectMessage }
];
