<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div class="settings-layout" :class="{ 'is-mobile': isMobile }">
    <!-- Sidebar desktop -->
    <aside v-if="!isMobile" class="sl-sidebar" aria-label="Cài đặt sidebar">
      <SettingsNavPanel show-header />
    </aside>

    <!-- Content panel -->
    <main class="sl-content" role="main">
      <!-- Desktop: breadcrumb -->
      <header v-if="!isMobile && activeItem" class="sl-breadcrumb">
        <RouterLink to="/settings" class="bc-root">Cài đặt</RouterLink>
        <span class="bc-sep">/</span>
        <span class="bc-group">{{ activeItem.group.label }}</span>
        <span class="bc-sep">/</span>
        <span class="bc-current">{{ activeItem.item.label }}</span>
      </header>

      <!-- Mobile: thanh đổi mục, luôn dính trên đầu nội dung -->
      <header v-else-if="isMobile && !isMobileHome" class="sl-mobile-head">
        <button
          type="button"
          class="sl-mobile-head__btn"
          aria-label="Đổi mục cài đặt"
          aria-haspopup="dialog"
          @click="navOpen = true"
        >
          <span class="sl-mobile-head__group">{{ activeItem?.group.label ?? 'Cài đặt' }}</span>
          <span class="sl-mobile-head__sep">/</span>
          <span class="sl-mobile-head__title">{{ activeItem?.item.label ?? 'Cài đặt' }}</span>
          <v-icon icon="mdi-chevron-down" size="20" />
        </button>
      </header>

      <!-- Mobile: trang danh mục cài đặt (/settings) -->
      <div v-if="isMobileHome" class="sl-mobile-home">
        <SettingsNavPanel mobile @navigate="closeNav" />
      </div>
      <div v-else class="sl-content-body">
        <RouterView />
      </div>
    </main>

    <!-- Mobile: đổi mục cài đặt bằng bottom sheet -->
    <MobileSheet v-if="isMobile" v-model="navOpen" title="Cài đặt" flush>
      <SettingsNavPanel mobile @navigate="closeNav" />
    </MobileSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsNav } from '@/composables/use-settings-nav';
import { useMobile } from '@/composables/use-mobile';
import SettingsNavPanel from '@/components/settings/SettingsNavPanel.vue';
import MobileSheet from '@/components/mobile/MobileSheet.vue';

const route = useRoute();
const router = useRouter();
const { isMobile } = useMobile();
const { activeItem, defaultRoute } = useSettingsNav();

const navOpen = ref(false);

const isMobileHome = computed(
  () => isMobile.value && (route.path === '/settings' || route.path === '/settings/'),
);

function closeNav() {
  navOpen.value = false;
}

// Đóng sheet khi đổi route (kể cả back/forward của trình duyệt).
watch(
  () => route.fullPath,
  () => {
    navOpen.value = false;
  },
);

// Desktop: /settings không có mục con → về route mặc định theo quyền.
// Mobile: giữ /settings làm trang danh mục.
onMounted(() => {
  if (!isMobile.value && (route.path === '/settings' || route.path === '/settings/')) {
    router.replace(defaultRoute.value);
  }
});
</script>

<style scoped>
.settings-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: calc(100vh - 56px);
  background: var(--surface-2, #f8f9fa);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13.5px;
  color: var(--ink, #101e34);
  letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased;
}

/* ── Sidebar ── */
.sl-sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface, #ffffff);
  border-right: 1px solid var(--line, #e2e8f0);
}

/* ── Content ── */
.sl-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-2, #f8f9fa);
}
.sl-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--surface, #ffffff);
  border-bottom: 1px solid var(--line, #e2e8f0);
  color: var(--ink-4, #64748b);
  font-size: 12px;
  flex-shrink: 0;
}
.bc-root {
  color: var(--brand, #2151a1);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease;
}
.bc-root:hover {
  color: var(--brand-600, #1a4284);
  text-decoration: underline;
}
.bc-sep {
  color: var(--line, #e2e8f0);
}
.bc-group {
  color: var(--ink-3, #475569);
}
.bc-current {
  color: var(--ink, #101e34);
  font-weight: 600;
}
.sl-content-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}
.sl-content-body::-webkit-scrollbar {
  width: 8px;
}
.sl-content-body::-webkit-scrollbar-thumb {
  background: var(--line, #e2e8f0);
  border-radius: 4px;
}

/* ── Mobile ─────────────────────────────────────────────────────────────
   Sidebar 260px bị bỏ; nội dung chiếm toàn bộ chiều rộng. Người dùng đổi
   mục qua bottom sheet, hoặc vào /settings để xem danh mục đầy đủ. */
.settings-layout.is-mobile {
  display: block;
  height: auto;
  min-height: 100%;
  background: var(--surface-2, #f8f9fa);
}
.is-mobile .sl-content {
  overflow: visible;
  min-height: 100%;
  background: var(--surface-2, #f8f9fa);
}
.is-mobile .sl-content-body {
  overflow: visible;
  padding: 14px;
}
/* Các trang RBAC tự có padding lớn cho desktop → thu lại trên mobile. */
.is-mobile .sl-content-body :deep(.dept-page) {
  padding: 2px 2px 24px;
  background: transparent;
}

.sl-mobile-home {
  min-height: 100%;
  padding: 6px 14px calc(16px + env(safe-area-inset-bottom, 0px));
  background: var(--surface, #ffffff);
}

.sl-mobile-head {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--surface, #ffffff);
  border-bottom: 1px solid var(--line, #e2e8f0);
  box-shadow: 0 1px 3px rgba(16, 30, 52, 0.05);
  flex-shrink: 0;
}
.sl-mobile-head__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 8px 16px;
  border: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}
.sl-mobile-head__btn:active {
  background: var(--surface-3, #f4f6f8);
}
.sl-mobile-head__group {
  color: var(--ink-4, #64748b);
  font-size: 13px;
  white-space: nowrap;
}
.sl-mobile-head__sep {
  color: var(--line, #e2e8f0);
}
.sl-mobile-head__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--ink, #101e34);
  font-size: 15px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sl-mobile-head__btn :deep(.v-icon) {
  flex: none;
  color: var(--brand, #2151a1);
}

@media (max-width: 767px) {
  .settings-layout {
    display: block;
    height: auto;
    min-height: 100%;
  }
}
</style>
