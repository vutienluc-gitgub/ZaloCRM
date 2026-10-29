<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <v-app>
    <!-- Mobile shell 2026-10-29 (P0) — thay gradient neon + dark toggle cũ.
         - Cao đúng 1 visual viewport: `100dvh - var(--kb)` (bàn phím ảo iOS).
         - App bar 56px nền surface, safe-area top.
         - Chat là màn "immersive": ẩn app bar để MessageThread tự làm header. -->
    <div class="m-shell" :class="{ 'is-immersive': isImmersive }">
      <header v-if="!isImmersive" class="m-bar">
        <button
          v-if="showBack"
          type="button"
          class="m-bar__btn"
          aria-label="Quay lại"
          @click="goBack"
        >
          <v-icon icon="mdi-chevron-left" size="26" />
        </button>
        <RouterLink v-else to="/" class="m-bar__brand" aria-label="Về tổng quan">
          <img :src="brandLogo" alt="" @error="onLogoError" />
        </RouterLink>

        <h1 class="m-bar__title">{{ pageTitle }}</h1>

        <div class="m-bar__actions">
          <NotificationBell />
          <v-menu location="bottom end" offset="6">
            <template #activator="{ props: menuProps }">
              <button type="button" class="m-bar__btn" aria-label="Menu" v-bind="menuProps">
                <v-icon icon="mdi-dots-vertical" size="22" />
              </button>
            </template>
            <v-list density="compact" min-width="190">
              <v-list-item prepend-icon="mdi-account-outline" title="Hồ sơ của tôi" to="/profile" />
              <v-list-item prepend-icon="mdi-cog-outline" title="Cài đặt" to="/settings" />
              <v-divider class="my-1" />
              <v-list-item prepend-icon="mdi-logout" title="Đăng xuất" @click="onLogout" />
            </v-list>
          </v-menu>
        </div>
      </header>

      <div v-if="!isOnline" class="m-offline">
        <v-icon icon="mdi-wifi-off" size="15" />
        <span>Mất kết nối — tin nhắn sẽ gửi khi có mạng</span>
      </div>

      <main class="m-main">
        <slot />
      </main>

      <BottomNav v-show="!isKeyboardOpen" />
    </div>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMobile } from '@/composables/use-mobile';
import { useConfirm } from '@/composables/use-confirm';
import { fetchPublicBranding } from '@/api/public-branding';
import NotificationBell from '@/components/NotificationBell.vue';
import BottomNav from '@/components/BottomNav.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isOnline, isKeyboardOpen } = useMobile();
const { confirm } = useConfirm();

const DEFAULT_LOGO = '/brand/vp-monogram.png';
const brandLogo = ref(DEFAULT_LOGO);
function onLogoError() {
  if (brandLogo.value !== DEFAULT_LOGO) brandLogo.value = DEFAULT_LOGO;
}

// Chat tự render header riêng (MessageThread) → shell ẩn app bar để tiết kiệm 56px.
const isImmersive = computed(() => route.path === '/chat' || route.path.startsWith('/chat/'));

const ROOT_PATHS = ['/', '/chat', '/contacts', '/appointments', '/more'];
const isRootTab = computed(() => ROOT_PATHS.includes(route.path));
const showBack = computed(() => !isRootTab.value);

const TITLES: Array<{ match: (p: string) => boolean; title: string }> = [
  { match: (p) => p === '/', title: 'Tổng quan' },
  { match: (p) => p.startsWith('/chat'), title: 'Hội thoại' },
  { match: (p) => p.startsWith('/contacts'), title: 'Khách hàng' },
  { match: (p) => p.startsWith('/appointments'), title: 'Lịch hẹn' },
  { match: (p) => p === '/more', title: 'Thêm' },
  { match: (p) => p.startsWith('/media'), title: 'Kho phương tiện' },
  { match: (p) => p.startsWith('/reports') || p.startsWith('/analytics'), title: 'Báo cáo' },
  { match: (p) => p.startsWith('/settings'), title: 'Cài đặt' },
  { match: (p) => p.startsWith('/profile'), title: 'Hồ sơ' },
  { match: (p) => p.startsWith('/friends'), title: 'Bạn bè' },
  { match: (p) => p.startsWith('/marketing'), title: 'Marketing' },
];
const pageTitle = computed(
  () => TITLES.find((t) => t.match(route.path))?.title ?? 'Vĩnh Phát CRM',
);

function goBack() {
  if (window.history.state?.back) router.back();
  else router.push('/');
}

async function onLogout() {
  const ok = await confirm({
    title: 'Đăng xuất?',
    message: 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng.',
    confirmText: 'Đăng xuất',
    tone: 'danger',
  });
  if (!ok) return;
  authStore.logout();
  router.push('/login');
}

onMounted(() => {
  fetchPublicBranding()
    .then((b) => {
      if (b?.logoUrl) brandLogo.value = b.logoUrl;
    })
    .catch(() => {});
});
</script>

<style scoped>
.m-shell {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  /* 100dvh = layout viewport động; trừ --kb (bàn phím ảo) do use-mobile set. */
  height: calc(100dvh - var(--kb, 0px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-2, #f8f9fa);
  color: var(--ink, #101e34);
}

/* ── App bar ─────────────────────────────────────────────────────────── */
.m-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  height: calc(56px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 8px 0 10px;
  background: var(--surface, #fff);
  border-bottom: 1px solid var(--line, #e2e8f0);
}
.m-bar__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--brand-soft, #e8eef8);
  overflow: hidden;
  flex: 0 0 auto;
}
.m-bar__brand img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3px;
}
.m-bar__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.m-bar__actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
}
.m-bar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ink-2, #334155);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-bar__btn:active {
  background: var(--surface-3, #f4f6f8);
}

/* ── Offline strip ───────────────────────────────────────────────────── */
.m-offline {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 12px;
  background: var(--warning-soft, #fef3c7);
  color: var(--warning, #b45309);
  font-size: 12.5px;
  font-weight: 500;
}

/* ── Content ─────────────────────────────────────────────────────────── */
.m-main {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
.m-shell.is-immersive .m-main {
  overflow: hidden;
  background: var(--surface, #fff);
}
</style>
