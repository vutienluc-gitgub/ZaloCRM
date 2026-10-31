<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div class="more-page">
    <!-- ── Tài khoản ─────────────────────────────────────────────────── -->
    <section class="more-user">
      <Avatar :src="user?.avatarUrl || null" :name="user?.fullName || '?'" :size="52" />
      <div class="more-user__txt">
        <div class="more-user__name">{{ user?.fullName || 'Người dùng' }}</div>
        <div class="more-user__sub">{{ roleLabel }}<template v-if="user?.email"> · {{ user.email }}</template></div>
      </div>
      <RouterLink to="/profile" class="more-user__edit" aria-label="Hồ sơ của tôi">
        <v-icon icon="mdi-chevron-right" size="20" />
      </RouterLink>
    </section>

    <!-- ── Công việc ─────────────────────────────────────────────────── -->
    <section class="more-group">
      <h2 class="more-group__t">Công việc</h2>
      <div class="more-list">
        <RouterLink v-if="can('engagement_score')" to="/reports" class="more-row">
          <v-icon icon="mdi-chart-box-outline" size="21" />
          <span class="more-row__lb">Báo cáo</span>
          <v-icon icon="mdi-chevron-right" size="18" class="more-row__ch" />
        </RouterLink>
        <RouterLink v-if="can('media')" to="/media" class="more-row">
          <v-icon icon="mdi-image-multiple-outline" size="21" />
          <span class="more-row__lb">Kho phương tiện</span>
          <v-icon icon="mdi-chevron-right" size="18" class="more-row__ch" />
        </RouterLink>
        <RouterLink v-if="can('friend')" to="/friends" class="more-row">
          <v-icon icon="mdi-account-multiple-outline" size="21" />
          <span class="more-row__lb">Bạn bè</span>
          <v-icon icon="mdi-chevron-right" size="18" class="more-row__ch" />
        </RouterLink>
        <RouterLink v-if="can('zalo_account')" to="/settings/channels/zalo" class="more-row">
          <v-icon icon="mdi-cellphone-link" size="21" />
          <span class="more-row__lb">Tài khoản Zalo</span>
          <v-icon icon="mdi-chevron-right" size="18" class="more-row__ch" />
        </RouterLink>
      </div>
    </section>

    <!-- ── Hệ thống ──────────────────────────────────────────────────── -->
    <section class="more-group">
      <h2 class="more-group__t">Hệ thống</h2>
      <div class="more-list">
        <RouterLink to="/settings" class="more-row">
          <v-icon icon="mdi-cog-outline" size="21" />
          <span class="more-row__lb">Cài đặt</span>
          <v-icon icon="mdi-chevron-right" size="18" class="more-row__ch" />
        </RouterLink>
        <button type="button" class="more-row more-row--danger" @click="onLogout">
          <v-icon icon="mdi-logout" size="21" />
          <span class="more-row__lb">Đăng xuất</span>
        </button>
      </div>
    </section>

    <!-- ── Ứng dụng di động ──────────────────────────────────────── -->
    <section class="more-group">
      <h2 class="more-group__t">Ứng dụng di động</h2>
      <div class="more-list">
        <button type="button" class="more-row" @click="showInstallGuide = true">
          <v-icon icon="mdi-cellphone-arrow-down" size="21" />
          <span class="more-row__lb">Hướng dẫn ghim ra Màn hình chính</span>
          <span v-if="isStandalone" class="more-badge-installed">Đã ghim</span>
          <v-icon icon="mdi-chevron-right" size="18" class="more-row__ch" />
        </button>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────────────── -->
    <footer class="more-foot">
      <div class="more-foot__ver">Vĩnh Phát CRM v{{ APP_VERSION }}</div>
      <!-- AGPL §7(b)/NOTICE: banner attribution phải hiển thị trên MỌI shell (kể cả mobile). -->
      <a
        v-if="attribution.enabled.value"
        class="more-foot__attr"
        :href="attribution.href"
        target="_blank"
        rel="noopener noreferrer"
      >{{ attribution.text }}</a>
      <a
        class="more-foot__src"
        href="https://github.com/vutienluc-gitgub/ZaloCRM"
        target="_blank"
        rel="noopener noreferrer"
      >Mã nguồn AGPL-3.0</a>
    </footer>

    <!-- ── Sheet hướng dẫn ghim màn hình chính ──────────────────────── -->
    <MobileSheet v-model="showInstallGuide" title="Thêm vào Màn hình chính">
      <div class="pwa-guide">
        <div v-if="isStandalone" class="pwa-status-box is-active">
          <v-icon icon="mdi-check-decagram" size="24" color="var(--success, #0a805c)" />
          <div>
            <div class="pwa-status-title">Đang chạy ở chế độ Màn hình chính</div>
            <div class="pwa-status-desc">Toàn màn hình, không thanh URL, tốc độ phản hồi tối ưu.</div>
          </div>
        </div>
        <div v-else class="pwa-status-box is-browser">
          <v-icon icon="mdi-information-outline" size="24" color="var(--brand, #2151a1)" />
          <div>
            <div class="pwa-status-title">Đang mở trong trình duyệt</div>
            <div class="pwa-status-desc">Hãy ghim ra Màn hình chính để dùng như App độc lập, 1 chạm vào ngay!</div>
          </div>
        </div>

        <div class="pwa-steps">
          <div class="pwa-step-card">
            <div class="pwa-step-head">
              <v-icon icon="mdi-apple" size="20" />
              <span>Dành cho iPhone (Safari)</span>
            </div>
            <ol class="pwa-step-list">
              <li>Chạm vào nút <b>Chia sẻ</b> (biểu tượng ô vuông mũi tên hướng lên <b>⎋</b> ở thanh dưới cùng Safari).</li>
              <li>Cuộn danh sách menu và chọn <b>"Thêm vào MH chính" (Add to Home Screen)</b>.</li>
              <li>Chạm <b>"Thêm"</b> ở góc phải trên. Biểu tượng VPCRM sẽ xuất hiện ngoài màn hình.</li>
            </ol>
          </div>

          <div class="pwa-step-card">
            <div class="pwa-step-head">
              <v-icon icon="mdi-google-chrome" size="20" />
              <span>Dành cho Android (Chrome)</span>
            </div>
            <ol class="pwa-step-list">
              <li>Chạm vào biểu tượng <b>3 chấm đứng ⋮</b> ở góc phải trên cùng trình duyệt Chrome.</li>
              <li>Chọn <b>"Cài đặt ứng dụng"</b> hoặc <b>"Thêm vào Màn hình chính"</b>.</li>
              <li>Xác nhận <b>"Cài đặt"</b>. Ứng dụng sẽ hiển thị trên màn hình ứng dụng điện thoại.</li>
            </ol>
          </div>
        </div>

        <button type="button" class="btn-pwa-close" @click="showInstallGuide = false">
          Đã hiểu
        </button>
      </div>
    </MobileSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAttribution } from '@/composables/use-attribution';
import { useConfirm } from '@/composables/use-confirm';
import Avatar from '@/components/ui/Avatar.vue';
import MobileSheet from '@/components/mobile/MobileSheet.vue';

const APP_VERSION = '3.4.1';

const auth = useAuthStore();
const router = useRouter();
const attribution = useAttribution();
const { confirm } = useConfirm();

const user = computed(() => auth.user);
const showInstallGuide = ref(false);

const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
});

const ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ tổ chức',
  admin: 'Quản trị viên',
  manager: 'Trưởng phòng',
};
const roleLabel = computed(() => ROLE_LABELS[user.value?.role || ''] ?? 'Nhân viên');

function can(resource: string) {
  return auth.canAccess(resource);
}

async function onLogout() {
  const ok = await confirm({
    title: 'Đăng xuất?',
    message: 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng.',
    confirmText: 'Đăng xuất',
    tone: 'danger',
  });
  if (!ok) return;
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.more-page {
  min-height: 100%;
  padding: 16px 16px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--surface-2, #f8f9fa);
}

/* ── User card ───────────────────────────────────────────────────────── */
.more-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: var(--r-lg, 14px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
}
.more-user__txt {
  flex: 1 1 auto;
  min-width: 0;
}
.more-user__name {
  font-size: 16px;
  font-weight: 650;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.more-user__sub {
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ink-4, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.more-user__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: -8px;
  color: var(--ink-4, #64748b);
  text-decoration: none;
}

/* ── Groups ──────────────────────────────────────────────────────────── */
.more-group {
  margin-top: 20px;
}
.more-group__t {
  margin: 0 0 8px 4px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4, #64748b);
}
.more-list {
  border-radius: var(--r-lg, 14px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  overflow: hidden;
}
.more-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  border: 0;
  border-bottom: 1px solid var(--line-2, #eef1f6);
  background: transparent;
  color: var(--ink, #101e34);
  text-decoration: none;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.more-list > .more-row:last-child {
  border-bottom: 0;
}
.more-row:active {
  background: var(--surface-3, #f4f6f8);
}
.more-row :deep(.v-icon),
.more-row > .v-icon {
  color: var(--ink-3, #475569);
}
.more-row__lb {
  flex: 1 1 auto;
}
.more-row__ch {
  color: var(--ink-4, #64748b);
}
.more-row--danger,
.more-row--danger :deep(.v-icon) {
  color: var(--error, #c0392b);
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.more-foot {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.more-foot__ver {
  font-size: 12px;
  color: var(--ink-4, #64748b);
}
.more-foot__attr,
.more-foot__src {
  font-size: 11.5px;
  color: var(--ink-4, #64748b);
  text-decoration: none;
  max-width: 320px;
  line-height: 1.4;
}
.more-foot__src {
  color: var(--brand-700, #163870);
  text-decoration: underline;
}

.more-badge-installed {
  font-size: 11px;
  font-weight: 600;
  color: var(--success, #0a805c);
  background: var(--success-soft, #d1f2e6);
  padding: 2px 8px;
  border-radius: 999px;
  margin-right: 6px;
}

/* ── PWA Guide Sheet ── */
.pwa-guide {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pwa-status-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
}
.pwa-status-box.is-active {
  background: var(--success-soft, #d1f2e6);
  border: 1px solid rgba(10, 128, 92, 0.2);
}
.pwa-status-box.is-browser {
  background: var(--brand-soft, #e8eef8);
  border: 1px solid rgba(33, 81, 161, 0.2);
}
.pwa-status-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink, #101e34);
}
.pwa-status-desc {
  font-size: 12px;
  color: var(--ink-3, #475569);
  margin-top: 2px;
  line-height: 1.4;
}
.pwa-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pwa-step-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 12px;
  padding: 14px 16px;
}
.pwa-step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink, #101e34);
  margin-bottom: 10px;
}
.pwa-step-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-2, #334155);
  line-height: 1.5;
}
.pwa-step-list b {
  color: var(--brand-700, #163870);
}
.btn-pwa-close {
  width: 100%;
  min-height: 46px;
  background: var(--brand, #2151a1);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14.5px;
  font-weight: 650;
  cursor: pointer;
  margin-top: 4px;
  transition: background 0.15s ease;
}
.btn-pwa-close:active {
  background: var(--brand-600, #1a4284);
}
</style>
