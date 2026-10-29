<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- Mobile reports 2026-10-29 (P1):
       Thay bảng/chart desktop bằng 4 KPI card + danh sách card module.
       Bấm card → mở báo cáo chi tiết (đã có CSS mobile trong report-kit.css). -->
  <div class="mr">
    <header class="mr-head">
      <div class="mr-head__txt">
        <h2 class="mr-head__t">Báo cáo điều hành</h2>
        <p class="mr-head__s">{{ rangeSubtitle }}</p>
      </div>
      <button
        type="button"
        class="mr-refresh"
        :class="{ 'is-loading': loading }"
        aria-label="Làm mới báo cáo"
        @click="load"
      >
        <v-icon icon="mdi-refresh" size="20" />
      </button>
    </header>

    <!-- ── Range ─────────────────────────────────────────────────────── -->
    <div class="mr-range" role="tablist" aria-label="Khoảng thời gian">
      <button
        v-for="b in RANGES"
        :key="b.key"
        type="button"
        class="mr-range__btn"
        :class="{ 'is-active': range === b.key }"
        role="tab"
        :aria-selected="range === b.key"
        @click="range = b.key"
      >{{ b.label }}</button>
    </div>

    <!-- ── Loading ───────────────────────────────────────────────────── -->
    <div v-if="loading && !data" class="mr-kpis" aria-busy="true">
      <div v-for="i in 4" :key="i" class="mr-kpi mr-kpi--skel">
        <span class="mr-sk mr-sk--label" />
        <span class="mr-sk mr-sk--val" />
        <span class="mr-sk mr-sk--sub" />
      </div>
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────── -->
    <div v-else-if="error && !data" class="mr-error">
      <v-icon icon="mdi-chart-box-outline" size="38" />
      <p>Không tải được báo cáo</p>
      <button type="button" @click="load">Thử lại</button>
    </div>

    <template v-else>
      <!-- ── KPI ─────────────────────────────────────────────────────── -->
      <div class="mr-kpis">
        <div v-for="k in kpiCards" :key="k.key" class="mr-kpi">
          <div class="mr-kpi__top">
            <span class="mr-kpi__lb">{{ k.label }}</span>
            <span class="mr-kpi__ic" :class="`is-${k.tone || 'brand'}`">
              <v-icon :icon="k.icon" size="17" />
            </span>
          </div>
          <div class="mr-kpi__val">
            {{ k.value }}<span v-if="k.unit" class="mr-kpi__u">{{ k.unit }}</span>
          </div>
          <div class="mr-kpi__sub">{{ k.sub }}</div>
        </div>
      </div>

      <!-- ── Modules ─────────────────────────────────────────────────── -->
      <h3 class="mr-sec">Báo cáo chi tiết</h3>
      <nav class="mr-mods" aria-label="Các báo cáo chi tiết">
        <RouterLink v-for="m in modules" :key="m.to" :to="m.to" class="mr-mod">
          <span class="mr-mod__ic" :style="{ background: m.soft, color: m.color }">
            <v-icon :icon="m.icon" size="20" />
          </span>
          <span class="mr-mod__main">
            <span class="mr-mod__t">{{ m.label }}</span>
            <span class="mr-mod__s">{{ m.sub }}</span>
          </span>
          <span v-if="m.value" class="mr-mod__val">{{ m.value }}</span>
          <v-icon icon="mdi-chevron-right" size="18" class="mr-mod__ch" />
        </RouterLink>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '@/api';

type Range = 'today' | '7d' | '30d';

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
];

const data = ref<any>(null);
const loading = ref(true);
const error = ref(false);
const range = ref<Range>('7d');

const rangeSubtitle = computed(() =>
  range.value === 'today'
    ? 'Số liệu hôm nay'
    : range.value === '7d'
      ? '7 ngày gần nhất'
      : '30 ngày gần nhất',
);

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeDates(r: Range): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (r === '7d') from.setDate(from.getDate() - 6);
  else if (r === '30d') from.setDate(from.getDate() - 29);
  return { from: ymd(from), to: ymd(to) };
}

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const { from, to } = rangeDates(range.value);
    data.value = (await api.get('/reports/overview', { params: { from, to } })).data;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(range, load);

// ── Helpers ──────────────────────────────────────────────────────────────
function n(v: any): string {
  const num = Number(v);
  return Number.isFinite(num) ? num.toLocaleString('vi-VN') : '0';
}
function pct(v: any): string {
  const num = Number(v);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

const kpis = computed<any>(() => data.value?.kpis ?? {});
const topSales = computed<any[]>(() => data.value?.topSales ?? []);

const kpiCards = computed(() => {
  const k = kpis.value;
  const delta = Number(k.newContactsDelta) || 0;
  return [
    {
      key: 'contacts',
      label: 'Khách hàng mới',
      icon: 'mdi-account-plus-outline',
      tone: 'brand',
      value: n(k.newContacts),
      sub: `${delta >= 0 ? '+' : ''}${n(delta)} so với kỳ trước`,
    },
    {
      key: 'messages',
      label: 'Tin nhắn hôm nay',
      icon: 'mdi-message-text-outline',
      tone: 'info',
      value: n(k.msgToday),
      sub: `${n(k.msgByBot)} do bot gửi`,
    },
    {
      key: 'appointments',
      label: 'Lịch hẹn hôm nay',
      icon: 'mdi-calendar-check-outline',
      tone: 'warn',
      value: n(k.apptToday),
      sub: `${n(k.apptDone)} đã hoàn thành`,
    },
    {
      key: 'close',
      label: 'Tỷ lệ chốt',
      icon: 'mdi-flag-checkered',
      tone: 'ok',
      value: pct(k.closeRate),
      unit: '%',
      sub: `${Number(k.closeRateDelta) >= 0 ? '+' : ''}${pct(k.closeRateDelta)} đ so với kỳ trước`,
    },
  ];
});

const modules = computed(() => {
  const k = kpis.value;
  const top = topSales.value[0];
  return [
    {
      to: '/reports/nick',
      label: 'Nick Zalo',
      icon: 'mdi-cellphone-link',
      color: '#2151a1',
      soft: '#e8eef8',
      value: `${n(k.nicksOnline)}/${n(k.nicksTotal)}`,
      sub: Number(k.nicksNeedRelogin) > 0
        ? `${n(k.nicksNeedRelogin)} nick cần đăng nhập lại`
        : 'Tất cả nick đang hoạt động',
    },
    {
      to: '/reports/sale',
      label: 'Sale & Team',
      icon: 'mdi-account-tie-outline',
      color: '#0a805c',
      soft: '#e6f5ef',
      value: top ? n(top.closed) : '',
      sub: top ? `Dẫn đầu: ${top.name || '—'}` : 'Chưa có dữ liệu sale',
    },
    {
      to: '/reports/pipeline',
      label: 'Pipeline & Lead Pool',
      icon: 'mdi-filter-variant',
      color: '#b45309',
      soft: '#fff4e5',
      value: n(k.leadPoolWaiting),
      sub: `${n(k.leadPoolAutoReturnSoon)} lead sắp tự động trả về`,
    },
    {
      to: '/reports/automation',
      label: 'Automation',
      icon: 'mdi-cog-sync-outline',
      color: '#6d28d9',
      soft: '#f1ebff',
      value: n(k.msgByBot),
      sub: 'tin nhắn gửi tự động',
    },
    {
      to: '/reports/engagement',
      label: 'Engagement',
      icon: 'mdi-fire',
      color: '#be123c',
      soft: '#fdeaef',
      value: `${pct(k.friendAcceptRate)}%`,
      sub: `${n(k.friendInviteAccepted)}/${n(k.friendInviteSent)} lời mời kết bạn`,
    },
    {
      to: '/reports/audit',
      label: 'Audit & Hệ thống',
      icon: 'mdi-shield-check-outline',
      color: '#334155',
      soft: '#eef1f6',
      value: n(k.nicksNeedRelogin),
      sub: 'nick cần xử lý đăng nhập',
    },
  ];
});
</script>

<style scoped>
.mr {
  padding: 12px 12px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--surface-2, #f8f9fa);
}

/* ── Head ─────────────────────────────────────────────────────────────── */
.mr-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 2px 10px;
}
.mr-head__txt {
  flex: 1 1 auto;
  min-width: 0;
}
.mr-head__t {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink, #101e34);
}
.mr-head__s {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--ink-4, #64748b);
}
.mr-refresh {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 50%;
  background: var(--surface, #fff);
  color: var(--ink-3, #475569);
  cursor: pointer;
}
.mr-refresh.is-loading :deep(.v-icon) {
  animation: mr-spin 0.9s linear infinite;
}
@keyframes mr-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .mr-refresh.is-loading :deep(.v-icon) { animation: none; }
}

/* ── Range ────────────────────────────────────────────────────────────── */
.mr-range {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  margin-bottom: 12px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 999px;
  background: var(--surface-2, #f8f9fa);
}
.mr-range__btn {
  height: 30px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-4, #64748b);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mr-range__btn.is-active {
  background: var(--surface, #fff);
  color: var(--brand, #2151a1);
  box-shadow: 0 1px 3px rgba(16, 30, 52, 0.12);
}

/* ── KPI ──────────────────────────────────────────────────────────────── */
.mr-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.mr-kpi {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 13px;
  background: var(--surface, #fff);
}
.mr-kpi__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.mr-kpi__lb {
  min-width: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-4, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mr-kpi__ic {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--brand-soft, #e8eef8);
  color: var(--brand, #2151a1);
}
.mr-kpi__ic.is-ok { background: #e6f5ef; color: #0a805c; }
.mr-kpi__ic.is-warn { background: #fff4e5; color: #b45309; }
.mr-kpi__ic.is-info { background: #e8f0fe; color: #1d4ed8; }
.mr-kpi__val {
  font-size: 23px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink, #101e34);
  font-variant-numeric: tabular-nums;
}
.mr-kpi__u {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-4, #64748b);
}
.mr-kpi__sub {
  font-size: 11px;
  line-height: 1.35;
  color: var(--ink-4, #64748b);
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
.mr-sk {
  display: block;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef1f6 25%, #f6f8fb 37%, #eef1f6 63%);
  background-size: 400% 100%;
  animation: mr-shimmer 1.3s ease-in-out infinite;
}
.mr-sk--label { width: 42%; height: 10px; }
.mr-sk--val { width: 58%; height: 20px; margin-top: 6px; }
.mr-sk--sub { width: 80%; height: 9px; margin-top: 6px; }
@keyframes mr-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .mr-sk { animation: none; }
}

/* ── Error ────────────────────────────────────────────────────────────── */
.mr-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 48px 24px;
  text-align: center;
  color: var(--ink-4, #64748b);
}
.mr-error p {
  margin: 0;
  font-size: 13.5px;
}
.mr-error button {
  margin-top: 6px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid var(--brand, #2151a1);
  border-radius: 999px;
  background: transparent;
  color: var(--brand, #2151a1);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Modules ──────────────────────────────────────────────────────────── */
.mr-sec {
  margin: 18px 2px 8px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-4, #64748b);
}
.mr-mods {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  background: var(--surface, #fff);
  overflow: hidden;
}
.mr-mod {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 62px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-2, #eef1f6);
  color: inherit;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.mr-mod:last-child {
  border-bottom: 0;
}
.mr-mod:active {
  background: var(--surface-3, #f4f6f8);
}
.mr-mod__ic {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
}
.mr-mod__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.mr-mod__t {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mr-mod__s {
  font-size: 11.5px;
  color: var(--ink-4, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mr-mod__val {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2, #f8f9fa);
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-2, #334155);
  font-variant-numeric: tabular-nums;
}
.mr-mod__ch {
  flex: 0 0 auto;
  color: var(--ink-4, #64748b);
}
</style>
