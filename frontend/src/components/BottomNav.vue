<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- Bottom nav 5 tab (2026-10-29 P0) — custom HTML thay v-bottom-navigation:
       kiểm soát 100% chiều cao/safe-area/badge, không phụ thuộc API Vuetify. -->
  <nav class="m-nav" aria-label="Điều hướng chính">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.path"
      class="m-tab"
      :class="{ 'is-active': activeKey === tab.key }"
      :aria-current="activeKey === tab.key ? 'page' : undefined"
    >
      <span class="m-tab__ic">
        <v-icon :icon="tab.icon" size="22" />
        <span v-if="badgeOf(tab.key)" class="m-tab__badge">{{ badgeOf(tab.key) }}</span>
      </span>
      <span class="m-tab__lb">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';

interface Tab {
  key: 'dashboard' | 'chat' | 'contacts' | 'appointments' | 'more';
  label: string;
  icon: string;
  path: string;
}

const tabs: Tab[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'mdi-view-dashboard-outline', path: '/' },
  { key: 'chat', label: 'Hội thoại', icon: 'mdi-message-text-outline', path: '/chat' },
  { key: 'contacts', label: 'Khách hàng', icon: 'mdi-account-group-outline', path: '/contacts' },
  { key: 'appointments', label: 'Lịch hẹn', icon: 'mdi-calendar-clock-outline', path: '/appointments' },
  { key: 'more', label: 'Thêm', icon: 'mdi-dots-horizontal-circle-outline', path: '/more' },
];

const route = useRoute();

const activeKey = computed<Tab['key']>(() => {
  const p = route.path;
  if (p === '/') return 'dashboard';
  if (p.startsWith('/chat')) return 'chat';
  if (p.startsWith('/contacts')) return 'contacts';
  if (p.startsWith('/appointments')) return 'appointments';
  // Mọi màn khác (báo cáo/cài đặt/media/hồ sơ…) đều nằm dưới tab "Thêm".
  return 'more';
});

// ── Badge: dùng /dashboard/kpi (endpoint nhẹ, chỉ 6 COUNT) ───────────────────
const unread = ref(0);
const appointmentsToday = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
let lastFetch = 0;

function formatBadge(n: number): string {
  if (!n || n <= 0) return '';
  return n > 99 ? '99+' : String(n);
}

function badgeOf(key: Tab['key']): string {
  if (key === 'chat') return formatBadge(unread.value);
  if (key === 'appointments') return formatBadge(appointmentsToday.value);
  return '';
}

async function refreshBadges(force = false) {
  const now = Date.now();
  if (!force && now - lastFetch < 5000) return;
  lastFetch = now;
  try {
    const res = await api.get('/dashboard/kpi');
    unread.value = Number(res.data?.messagesUnread ?? 0);
    appointmentsToday.value = Number(res.data?.appointmentsToday ?? 0);
  } catch {
    // im lặng — badge không được phép làm hỏng điều hướng
  }
}

watch(() => route.path, () => void refreshBadges());

onMounted(() => {
  void refreshBadges(true);
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void refreshBadges();
  }, 60000);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('chat:inbound-message', onInbound);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('chat:inbound-message', onInbound);
});

function onVisible() {
  if (document.visibilityState === 'visible') void refreshBadges(true);
}
function onInbound() {
  // Tin mới đến → cập nhật badge sớm (debounce tự nhiên bởi lastFetch 5s).
  void refreshBadges();
}
</script>

<style scoped>
.m-nav {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--surface, #fff);
  border-top: 1px solid var(--line, #e2e8f0);
  z-index: 100;
}
.m-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  height: 56px;
  color: var(--ink-4, #64748b);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.m-tab:active {
  background: var(--surface-3, #f4f6f8);
}
.m-tab.is-active {
  color: var(--brand, #2151a1);
}
.m-tab__ic {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
}
.m-tab__lb {
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.m-tab.is-active .m-tab__lb {
  font-weight: 700;
}
.m-tab__badge {
  position: absolute;
  top: -5px;
  left: 13px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--error, #c0392b);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 17px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px var(--surface, #fff);
}
</style>
