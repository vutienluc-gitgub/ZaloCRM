<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- Mobile dashboard 2026-10-29 (P0).
       "Việc hôm nay" = 3 deep-link đã lọc sẵn + 4 KPI card 2×2. Không chart. -->
  <div class="md">
    <!-- ── Greeting ──────────────────────────────────────────────────── -->
    <header class="md-hello">
      <div class="md-hello__txt">
        <div class="md-hello__hi">{{ greeting }}, {{ firstName }}</div>
        <div class="md-hello__date">{{ todayLabel }}</div>
      </div>
      <button
        type="button"
        class="md-refresh"
        aria-label="Làm mới"
        :class="{ 'is-loading': loading }"
        @click="load"
      >
        <v-icon icon="mdi-refresh" size="20" />
      </button>
    </header>

    <!-- ── Lỗi ───────────────────────────────────────────────────────── -->
    <div v-if="error && !kpi" class="md-error">
      <v-icon icon="mdi-cloud-alert-outline" size="34" />
      <p>Không tải được số liệu</p>
      <button type="button" @click="load">Thử lại</button>
    </div>

    <template v-else>
      <!-- ── Việc hôm nay ───────────────────────────────────────────── -->
      <section class="md-sec">
        <h2 class="md-sec__t">Việc hôm nay</h2>

        <div v-if="loading && !kpi" class="md-tasks">
          <div v-for="i in 3" :key="i" class="md-task md-task--skel">
            <span class="md-sk md-sk--ic" />
            <span class="md-sk md-sk--ln" />
          </div>
        </div>

        <div v-else-if="allDone" class="md-done">
          <v-icon icon="mdi-check-circle-outline" size="34" />
          <p>Hôm nay bạn đã xử lý hết việc</p>
        </div>

        <div v-else class="md-tasks">
          <button type="button" class="md-task" @click="go('/chat', { filter: 'unanswered' })">
            <span class="md-task__ic md-task__ic--chat">
              <v-icon icon="mdi-message-alert-outline" size="20" />
            </span>
            <span class="md-task__txt">
              <span class="md-task__lb">Khách chưa trả lời</span>
              <span class="md-task__sub">Hội thoại đang chờ phản hồi</span>
            </span>
            <span class="md-task__n" :class="{ 'is-zero': !kpi?.messagesUnreplied }">
              {{ kpi?.messagesUnreplied ?? 0 }}
            </span>
            <v-icon icon="mdi-chevron-right" size="18" class="md-task__ch" />
          </button>

          <button type="button" class="md-task" @click="go('/appointments')">
            <span class="md-task__ic md-task__ic--apt">
              <v-icon icon="mdi-calendar-clock-outline" size="20" />
            </span>
            <span class="md-task__txt">
              <span class="md-task__lb">Lịch hẹn hôm nay</span>
              <span class="md-task__sub">Đang chờ xử lý</span>
            </span>
            <span class="md-task__n" :class="{ 'is-zero': !kpi?.appointmentsToday }">
              {{ kpi?.appointmentsToday ?? 0 }}
            </span>
            <v-icon icon="mdi-chevron-right" size="18" class="md-task__ch" />
          </button>

          <button type="button" class="md-task" @click="go('/contacts')">
            <span class="md-task__ic md-task__ic--new">
              <v-icon icon="mdi-account-plus-outline" size="20" />
            </span>
            <span class="md-task__txt">
              <span class="md-task__lb">Khách mới 7 ngày</span>
              <span class="md-task__sub">Cần phân loại / chăm sóc</span>
            </span>
            <span class="md-task__n" :class="{ 'is-zero': !kpi?.newContactsThisWeek }">
              {{ kpi?.newContactsThisWeek ?? 0 }}
            </span>
            <v-icon icon="mdi-chevron-right" size="18" class="md-task__ch" />
          </button>
        </div>
      </section>

      <!-- ── KPI ────────────────────────────────────────────────────── -->
      <section class="md-sec">
        <h2 class="md-sec__t">Hiệu suất của tôi</h2>
        <div class="md-kpis">
          <div class="md-kpi">
            <div class="md-kpi__v">{{ nf(kpi?.messagesToday) }}</div>
            <div class="md-kpi__l">Tin nhắn hôm nay</div>
          </div>
          <div class="md-kpi">
            <div class="md-kpi__v md-kpi__v--warn">{{ nf(kpi?.messagesUnreplied) }}</div>
            <div class="md-kpi__l">Chưa trả lời</div>
          </div>
          <div class="md-kpi">
            <div class="md-kpi__v">{{ nf(kpi?.appointmentsToday) }}</div>
            <div class="md-kpi__l">Lịch hẹn hôm nay</div>
          </div>
          <div class="md-kpi">
            <div class="md-kpi__v md-kpi__v--ok">{{ nf(kpi?.totalContacts) }}</div>
            <div class="md-kpi__l">Tổng khách hàng</div>
          </div>
        </div>

        <RouterLink v-if="canReport" to="/reports" class="md-report">
          Xem báo cáo đầy đủ
          <v-icon icon="mdi-chevron-right" size="18" />
        </RouterLink>
      </section>
    </template>

    <!-- AGPL §7(b)/NOTICE — banner attribution cũng phải hiện trên mobile. -->
    <footer class="md-foot">
      <a
        v-if="attribution.enabled.value"
        :href="attribution.href"
        target="_blank"
        rel="noopener noreferrer"
      >{{ attribution.text }}</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useAttribution } from '@/composables/use-attribution';

interface Kpi {
  messagesToday: number;
  messagesUnreplied: number;
  messagesUnread: number;
  appointmentsToday: number;
  newContactsThisWeek: number;
  totalContacts: number;
}

const router = useRouter();
const auth = useAuthStore();
const attribution = useAttribution();

const kpi = ref<Kpi | null>(null);
const loading = ref(false);
const error = ref(false);

const firstName = computed(() => {
  const full = auth.user?.fullName?.trim() || '';
  if (!full) return 'bạn';
  const parts = full.split(/\s+/);
  return parts[parts.length - 1];
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
});

const todayLabel = computed(() => {
  const s = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
});

const allDone = computed(() => {
  const k = kpi.value;
  if (!k) return false;
  return k.messagesUnreplied === 0 && k.appointmentsToday === 0 && k.newContactsThisWeek === 0;
});

const canReport = computed(() => auth.canAccess('engagement_score'));

const nf = (n?: number) => new Intl.NumberFormat('vi-VN').format(Number(n ?? 0));

async function load() {
  if (loading.value) return;
  loading.value = true;
  error.value = false;
  try {
    const res = await api.get('/dashboard/kpi');
    kpi.value = res.data as Kpi;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function go(path: string, query?: Record<string, string>) {
  router.push(query ? { path, query } : path);
}

onMounted(() => {
  void load();
  document.addEventListener('visibilitychange', onVisible);
});
onUnmounted(() => document.removeEventListener('visibilitychange', onVisible));
function onVisible() {
  if (document.visibilityState === 'visible') void load();
}
</script>

<style scoped>
.md {
  min-height: 100%;
  padding: 14px 14px calc(20px + env(safe-area-inset-bottom, 0px));
  background: var(--surface-2, #f8f9fa);
}

/* ── Greeting ────────────────────────────────────────────────────────── */
.md-hello {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 18px;
}
.md-hello__txt {
  flex: 1 1 auto;
  min-width: 0;
}
.md-hello__hi {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--ink, #101e34);
}
.md-hello__date {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--ink-4, #64748b);
}
.md-refresh {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-top: -4px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-4, #64748b);
  cursor: pointer;
}
.md-refresh:active {
  background: var(--surface-3, #f4f6f8);
}
.md-refresh.is-loading :deep(.v-icon) {
  animation: md-spin 0.9s linear infinite;
}
@keyframes md-spin {
  to { transform: rotate(360deg); }
}

/* ── Sections ────────────────────────────────────────────────────────── */
.md-sec {
  margin-bottom: 20px;
}
.md-sec__t {
  margin: 0 0 8px 4px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4, #64748b);
}

/* ── Tasks ───────────────────────────────────────────────────────────── */
.md-tasks {
  border-radius: var(--r-lg, 14px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  overflow: hidden;
}
.md-task {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--line-2, #eef1f6);
  background: transparent;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.md-tasks > .md-task:last-child {
  border-bottom: 0;
}
.md-task:active {
  background: var(--surface-3, #f4f6f8);
}
.md-task__ic {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
}
.md-task__ic--chat {
  background: var(--brand-soft, #e8eef8);
  color: var(--brand, #2151a1);
}
.md-task__ic--apt {
  background: var(--warning-soft, #fef3c7);
  color: var(--warning, #b45309);
}
.md-task__ic--new {
  background: var(--success-soft, #d1f2e6);
  color: var(--success, #0a805c);
}
.md-task__txt {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.md-task__lb {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink, #101e34);
}
.md-task__sub {
  font-size: 12px;
  color: var(--ink-4, #64748b);
}
.md-task__n {
  flex: 0 0 auto;
  min-width: 26px;
  height: 24px;
  padding: 0 7px;
  border-radius: 12px;
  background: var(--error, #c0392b);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.md-task__n.is-zero {
  background: var(--surface-3, #f4f6f8);
  color: var(--ink-4, #64748b);
}
.md-task__ch {
  flex: 0 0 auto;
  color: var(--ink-4, #64748b);
}

/* ── KPI ─────────────────────────────────────────────────────────────── */
.md-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.md-kpi {
  padding: 14px;
  border-radius: var(--r-lg, 14px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
}
.md-kpi__v {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink, #101e34);
}
.md-kpi__v--warn {
  color: var(--warning, #b45309);
}
.md-kpi__v--ok {
  color: var(--brand, #2151a1);
}
.md-kpi__l {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-4, #64748b);
}

.md-report {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 44px;
  margin-top: 10px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: var(--r-md, 10px);
  background: var(--surface, #fff);
  color: var(--brand, #2151a1);
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
}
.md-report:active {
  background: var(--brand-soft, #e8eef8);
}

/* ── Done / error / skeleton ─────────────────────────────────────────── */
.md-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 16px;
  border-radius: var(--r-lg, 14px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  color: var(--success, #0a805c);
}
.md-done p {
  margin: 0;
  font-size: 13.5px;
  color: var(--ink-3, #475569);
}
.md-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 16px;
  text-align: center;
  color: var(--ink-4, #64748b);
}
.md-error p {
  margin: 0;
  font-size: 14px;
}
.md-error button {
  height: 38px;
  padding: 0 18px;
  border: 1px solid var(--brand, #2151a1);
  border-radius: var(--r-pill, 999px);
  background: transparent;
  color: var(--brand, #2151a1);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.md-sk {
  display: block;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef1f6 25%, #f6f8fb 37%, #eef1f6 63%);
  background-size: 400% 100%;
  animation: md-shimmer 1.3s ease-in-out infinite;
}
.md-sk--ic {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex: 0 0 auto;
}
.md-sk--ln {
  height: 13px;
  flex: 1 1 auto;
}
.md-task--skel {
  cursor: default;
}
@keyframes md-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .md-sk { animation: none; }
  .md-refresh.is-loading :deep(.v-icon) { animation: none; }
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.md-foot {
  margin-top: 8px;
  text-align: center;
}
.md-foot a {
  font-size: 11px;
  line-height: 1.4;
  color: var(--ink-4, #64748b);
  text-decoration: none;
}
</style>
