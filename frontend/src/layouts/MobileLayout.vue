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
          <button
            type="button"
            class="m-bar__btn"
            aria-label="Tài khoản và tùy chọn"
            aria-haspopup="dialog"
            :aria-expanded="menuOpen"
            @click="menuOpen = true"
          >
            <v-icon icon="mdi-dots-vertical" size="22" />
          </button>
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
      <ToastContainer placement="bottom-mobile" />
    </div>

    <!-- Header actions sheet (P1 2026-10-29): thay v-menu desktop bằng bottom
         sheet — ngón cái với tới, có danh tính tài khoản, an toàn khi đóng. -->
    <MobileSheet v-model="menuOpen" title="Tài khoản" flush>
      <div class="m-acct">
        <Avatar :src="user?.avatarUrl || null" :name="user?.fullName || '?'" :size="44" />
        <div class="m-acct__txt">
          <div class="m-acct__name">{{ user?.fullName || 'Người dùng' }}</div>
          <div class="m-acct__sub">{{ user?.email || 'Chưa cập nhật email' }}</div>
        </div>
      </div>

      <nav class="m-menu" aria-label="Tùy chọn tài khoản">
        <button
          v-for="item in menuItems"
          :key="item.key"
          type="button"
          class="m-menu__item"
          :class="{ 'is-danger': item.danger }"
          @click="onMenuSelect(item.key)"
        >
          <span class="m-menu__ic"><v-icon :icon="item.icon" size="21" /></span>
          <span class="m-menu__lb">{{ item.label }}</span>
          <v-icon icon="mdi-chevron-right" size="18" class="m-menu__ch" />
        </button>
      </nav>
    </MobileSheet>
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
import ToastContainer from '@/components/ui/ToastContainer.vue';
import MobileSheet from '@/components/mobile/MobileSheet.vue';
import Avatar from '@/components/ui/Avatar.vue';

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

// ── Header actions sheet ────────────────────────────────────────────────
const menuOpen = ref(false);
const user = computed(() => authStore.user);

type MenuKey = 'profile' | 'settings' | 'reports' | 'logout';
interface MenuItem {
  key: MenuKey;
  label: string;
  icon: string;
  danger?: boolean;
}

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    { key: 'profile', label: 'Hồ sơ của tôi', icon: 'mdi-account-outline' },
    { key: 'settings', label: 'Cài đặt', icon: 'mdi-cog-outline' },
  ];
  // Giữ parity với quyền route: không có engagement_score thì ẩn Báo cáo.
  if (authStore.canAccess('engagement_score')) {
    items.push({ key: 'reports', label: 'Báo cáo', icon: 'mdi-chart-box-outline' });
  }
  items.push({ key: 'logout', label: 'Đăng xuất', icon: 'mdi-logout', danger: true });
  return items;
});

function onMenuSelect(key: MenuKey) {
  menuOpen.value = false;
  if (key === 'logout') {
    void onLogout();
    return;
  }
  router.push(
    key === 'profile' ? '/profile' : key === 'settings' ? '/settings' : '/reports',
  );
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

/* ── Account sheet ───────────────────────────────────────────────────── */
.m-acct {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  background: var(--surface-2, #f8f9fa);
}
.m-acct__txt {
  flex: 1 1 auto;
  min-width: 0;
}
.m-acct__name {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.m-acct__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-4, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.m-menu {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  background: var(--surface, #fff);
}
.m-menu__item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid var(--line-2, #eef1f6);
  background: transparent;
  color: var(--ink, #101e34);
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-menu__item:last-child {
  border-bottom: 0;
}
.m-menu__item:active {
  background: var(--surface-3, #f4f6f8);
}
.m-menu__ic {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--brand-soft, #e8eef8);
  color: var(--brand, #2151a1);
}
.m-menu__lb {
  flex: 1 1 auto;
  min-width: 0;
}
.m-menu__ch {
  flex: 0 0 auto;
  color: var(--ink-4, #64748b);
}
.m-menu__item.is-danger {
  color: #b91c1c;
}
.m-menu__item.is-danger .m-menu__ic {
  background: #fdeceb;
  color: #b91c1c;
}
.m-menu__item.is-danger .m-menu__ch {
  color: #dc8a86;
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
