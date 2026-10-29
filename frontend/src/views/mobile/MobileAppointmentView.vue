<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- Mobile appointments 2026-10-29 (P1):
       date strip → card list theo ngày → bottom sheet chi tiết + thao tác.
       Tái sử dụng AppointmentEditor cho tạo/sửa, MobileSheet cho chi tiết. -->
  <div class="ma">
    <!-- ── Date strip ─────────────────────────────────────────────────── -->
    <div ref="stripRef" class="ma-strip" role="tablist" aria-label="Chọn ngày xem lịch hẹn">
      <button
        v-for="d in days"
        :key="d.key"
        type="button"
        class="ma-day"
        :class="{ 'is-active': d.key === selectedKey, 'is-today': d.isToday }"
        :data-day="d.key"
        role="tab"
        :aria-selected="d.key === selectedKey"
        @click="selectDay(d.key)"
      >
        <span class="ma-day__dow">{{ d.dow }}</span>
        <span class="ma-day__num">{{ d.dayNum }}</span>
        <span
          class="ma-day__dot"
          :class="{ 'has-dot': d.count > 0, 'is-overdue': d.overdue > 0 }"
        />
      </button>
    </div>

    <!-- ── Filter + create ────────────────────────────────────────────── -->
    <div class="ma-tools">
      <div class="ma-chips" role="tablist" aria-label="Lọc trạng thái lịch hẹn">
        <button
          v-for="m in STATUS_MODES"
          :key="m.value"
          type="button"
          class="ma-chip"
          :class="{ 'is-active': statusMode === m.value }"
          role="tab"
          :aria-selected="statusMode === m.value"
          @click="setStatusMode(m.value)"
        >{{ m.label }}</button>
      </div>
      <button type="button" class="ma-add" aria-label="Tạo nhắc hẹn" @click="openCreate">
        <v-icon icon="mdi-plus" size="24" />
      </button>
    </div>

    <!-- ── Quá hạn (collapsed by default) ─────────────────────────────── -->
    <div v-if="statusMode === 'pending' && overdue.length" class="ma-overdue">
      <button
        type="button"
        class="ma-overdue__head"
        :aria-expanded="overdueOpen"
        @click="overdueOpen = !overdueOpen"
      >
        <span class="ma-overdue__ic">
          <v-icon icon="mdi-alert-circle-outline" size="18" />
        </span>
        <span class="ma-overdue__txt">
          <b>{{ overdue.length }} lịch quá hạn</b>
          <em>Cần xử lý ngay</em>
        </span>
        <v-icon :icon="overdueOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" />
      </button>

      <div v-if="overdueOpen" class="ma-overdue__list">
        <button
          v-for="a in overdue"
          :key="a.id"
          type="button"
          class="ma-overdue__row"
          @click="openDetail(a)"
        >
          <span class="ma-overdue__date">{{ shortDay(a) }}</span>
          <span class="ma-overdue__time">{{ timeLabel(a) }}</span>
          <span class="ma-overdue__name">{{ contactName(a) }}</span>
          <v-icon icon="mdi-chevron-right" size="16" />
        </button>
      </div>
    </div>

    <!-- ── Selected day ───────────────────────────────────────────────── -->
    <div class="ma-dayhead">
      <div class="ma-dayhead__main">
        <h2 class="ma-dayhead__title">{{ dayTitle }}</h2>
        <p class="ma-dayhead__sub">{{ daySubtitle }}</p>
      </div>
      <button
        v-if="selectedKey !== todayKey"
        type="button"
        class="ma-today"
        @click="goToday"
      >Hôm nay</button>
    </div>

    <div v-if="loading && appointments.length === 0" class="ma-list" aria-busy="true">
      <div v-for="i in 4" :key="i" class="ma-card ma-card--skel">
        <span class="ma-sk ma-sk--time" />
        <span class="ma-sk ma-sk--lines" />
      </div>
    </div>

    <div v-else-if="dayList.length === 0" class="ma-empty">
      <v-icon :icon="emptyIcon" size="42" />
      <p>{{ emptyText }}</p>
      <button type="button" class="ma-empty__btn" @click="openCreate">Tạo nhắc hẹn</button>
    </div>

    <div v-else class="ma-list">
      <MobileSwipeRow
        v-for="a in dayList"
        :key="a.id"
        :actions="rowActions(a)"
        @action="(key) => onCardAction(key, a)"
      >
        <button
          type="button"
          class="ma-card"
          @click="openDetail(a)"
        >
          <span class="ma-card__time">
            <span class="ma-card__hh">{{ timeLabel(a) }}</span>
            <span class="ma-card__dur">{{ durationLabel(a) }}</span>
          </span>
          <span class="ma-card__bar" :style="{ background: typeBgColor(a.type) }" />
          <span class="ma-card__main">
            <span class="ma-card__top">
              <span class="ma-card__name">{{ contactName(a) }}</span>
              <span v-if="a.status !== 'scheduled'" class="ma-st" :class="`ma-st--${a.status}`">{{ statusLabel(a.status) }}</span>
            </span>
            <span class="ma-card__title">{{ a.title || 'Nhắc hẹn' }}</span>
            <span class="ma-card__meta">
              <span class="ma-type" :style="typeStyle(a)">{{ typeIcon(a.type) }} {{ typeLabel(a.type) }}</span>
              <span v-if="a.location" class="ma-loc">
                <v-icon icon="mdi-map-marker-outline" size="12" />{{ a.location }}
              </span>
              <span
                class="ma-owner"
                :style="ownerStyle(a)"
                :title="ownerName(a)"
              >{{ initials(ownerName(a)) }}</span>
            </span>
          </span>
        </button>
      </MobileSwipeRow>
    </div>

    <!-- ── Bottom sheet: chi tiết lịch hẹn ────────────────────────────── -->
    <MobileSheet v-model="sheetOpen" max-height="90dvh">
      <template v-if="selected" #header>
        <div class="ma-shead">
          <Avatar :src="contactAvatar(selected)" :name="contactName(selected)" :size="46" />
          <div class="ma-shead__txt">
            <div class="ma-shead__name">{{ contactName(selected) }}</div>
            <div class="ma-shead__sub">{{ selected.contact?.phone || 'Chưa có số điện thoại' }}</div>
          </div>
          <span class="ma-st" :class="`ma-st--${selected.status}`">{{ statusLabel(selected.status) }}</span>
        </div>
      </template>

      <template v-if="selected">
        <div class="ma-when">
          <div class="ma-when__ic" :style="{ background: typeStyle(selected).background, color: typeStyle(selected).color }">
            {{ typeIcon(selected.type) }}
          </div>
          <div class="ma-when__txt">
            <div class="ma-when__d">{{ longDay(selected) }}</div>
            <div class="ma-when__t">
              {{ timeLabel(selected) }} – {{ endTimeLabel(selected) }}
              <span>· {{ durationLabel(selected) }}</span>
            </div>
            <div v-if="selected.location" class="ma-when__loc">
              <v-icon icon="mdi-map-marker-outline" size="13" />{{ selected.location }}
            </div>
          </div>
        </div>

        <div class="ma-block">
          <div class="ma-block__lb">Nội dung</div>
          <div class="ma-block__title">{{ selected.title || 'Nhắc hẹn' }}</div>
          <p v-if="selected.notes" class="ma-block__notes">{{ selected.notes }}</p>
        </div>

        <div class="ma-block">
          <div class="ma-block__lb">Chi tiết</div>
          <div class="ma-kv">
            <span>Loại</span>
            <b>{{ typeIcon(selected.type) }} {{ typeLabel(selected.type) }}</b>
          </div>
          <div class="ma-kv">
            <span>Phụ trách</span>
            <b>
              <i class="ma-owner ma-owner--sm" :style="ownerStyle(selected)">{{ initials(ownerName(selected)) }}</i>
              {{ ownerName(selected) }}
            </b>
          </div>
          <div class="ma-kv">
            <span>Nguồn</span>
            <b>{{ selected.source === 'zalo' ? 'Tự động từ Zalo' : 'Tạo thủ công' }}</b>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="ma-actions">
          <a
            v-if="selected.contact?.phone"
            :href="`tel:${selected.contact.phone}`"
            class="ma-act"
          >
            <v-icon icon="mdi-phone-outline" size="21" />
            <span>Gọi</span>
          </a>
          <span v-else class="ma-act is-disabled">
            <v-icon icon="mdi-phone-outline" size="21" />
            <span>Gọi</span>
          </span>

          <button type="button" class="ma-act" @click="openChat(selected)">
            <v-icon icon="mdi-message-text-outline" size="21" />
            <span>Nhắn Zalo</span>
          </button>

          <button type="button" class="ma-act" @click="openEdit(selected)">
            <v-icon icon="mdi-pencil-outline" size="21" />
            <span>Đổi giờ</span>
          </button>
        </div>

        <p v-if="actionError" class="ma-error">{{ actionError }}</p>

        <!-- Status actions -->
        <div v-if="canAct" class="ma-status-actions">
          <button
            type="button"
            class="ma-sbtn ma-sbtn--ok"
            :disabled="acting"
            @click="setStatus(selected, 'completed')"
          >
            <v-icon icon="mdi-check-circle-outline" size="18" />
            {{ acting ? 'Đang lưu…' : 'Hoàn thành' }}
          </button>
          <button
            type="button"
            class="ma-sbtn ma-sbtn--warn"
            :disabled="acting"
            @click="setStatus(selected, 'no_show')"
          >
            <v-icon icon="mdi-account-off-outline" size="18" />
            Vắng mặt
          </button>
          <button
            type="button"
            class="ma-sbtn ma-sbtn--danger"
            :disabled="acting"
            @click="setStatus(selected, 'cancelled')"
          >
            <v-icon icon="mdi-close-circle-outline" size="18" />
            Huỷ lịch
          </button>
        </div>

        <div v-else class="ma-status-actions">
          <button
            type="button"
            class="ma-sbtn ma-sbtn--reopen"
            :disabled="acting"
            @click="setStatus(selected, 'scheduled')"
          >
            <v-icon icon="mdi-restore" size="18" />
            {{ acting ? 'Đang lưu…' : 'Mở lại lịch hẹn' }}
          </button>
        </div>
      </template>

      <template #footer>
        <RouterLink
          v-if="selected?.contactId"
          :to="`/contacts/${selected.contactId}/profile`"
          class="ma-profile"
          @click="sheetOpen = false"
        >
          Mở hồ sơ khách hàng
          <v-icon icon="mdi-chevron-right" size="16" />
        </RouterLink>
      </template>
    </MobileSheet>

    <!-- ── Editor (create + edit) ─────────────────────────────────────── -->
    <AppointmentEditor
      v-model="editorOpen"
      :appointment="editing"
      :default-date="editorDate"
      :users="users"
      :current-user-id="currentUserId"
      @created="onCreated"
      @updated="onUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppointments } from '@/composables/use-appointments';
import { useUsers } from '@/composables/use-users';
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
import {
  appointmentEnd,
  appointmentOwnerId,
  appointmentOwnerName,
  appointmentStart,
  initials,
  saleColor,
  statusLabel,
  type AppointmentEx as Appointment,
  typeBgColor,
  typeIcon,
  typeLabel,
  typeTint,
} from '@/composables/appointment-helpers';
import {
  formatInOrgTz,
  orgDayKey,
  orgWallClockToUtc,
  weekdayInOrgTz,
} from '@/composables/use-org-timezone';
import Avatar from '@/components/ui/Avatar.vue';
import MobileSheet from '@/components/mobile/MobileSheet.vue';
import MobileSwipeRow from '@/components/mobile/MobileSwipeRow.vue';
import type { SwipeAction } from '@/components/mobile/mobile-swipe-types';
import AppointmentEditor from '@/components/appointments/AppointmentEditor.vue';

const router = useRouter();
const auth = useAuthStore();
const { confirm } = useConfirm();
const toast = useToast();

const {
  appointments,
  filters,
  loading,
  fetchAppointments,
  changeStatus,
} = useAppointments();
const { users, fetchUsers } = useUsers();

const currentUserId = computed<string | null>(() => auth.user?.id ?? null);

// ── Date range ───────────────────────────────────────────────────────────
// Strip hiển thị 21 ngày (3 trước + hôm nay + 17 sau) để vuốt nhanh.
// Fetch rộng hơn (−7 → +30) để overdue cũ vẫn có mặt + tạo lịch xa không bị mất.
const STRIP_BACK = 3;
const STRIP_DAYS = 21;

const todayKey = orgDayKey(new Date());

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map((s) => parseInt(s, 10));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function shiftKey(key: string, offset: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + offset);
  return orgDayKey(d);
}

function formatKey(key: string, withYear = false): string {
  const [y, m, d] = key.split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

function rangeIso(offset: number, endOfDay: boolean): string {
  const key = shiftKey(todayKey, offset);
  const d = orgWallClockToUtc(key, endOfDay ? '23:59' : '00:00');
  return (d ?? new Date()).toISOString();
}

// ── State ────────────────────────────────────────────────────────────────
const selectedKey = ref(todayKey);
const statusMode = ref<'pending' | 'done' | 'all'>('pending');
const STATUS_MODES = [
  { value: 'pending' as const, label: 'Cần làm' },
  { value: 'done' as const, label: 'Hoàn thành' },
  { value: 'all' as const, label: 'Tất cả' },
];

const overdueOpen = ref(false);
const sheetOpen = ref(false);
const selected = ref<Appointment | null>(null);
const actionError = ref('');
const acting = ref(false);

const editorOpen = ref(false);
const editing = ref<Appointment | null>(null);
const editorDate = ref<Date | null>(null);

const stripRef = ref<HTMLElement | null>(null);

// ── Derived data ─────────────────────────────────────────────────────────
const countsByDay = computed<Record<string, { total: number; overdue: number }>>(() => {
  const map: Record<string, { total: number; overdue: number }> = {};
  for (const a of appointments.value as Appointment[]) {
    const key = orgDayKey(a.appointmentDate);
    if (!key) continue;
    const bucket = (map[key] ||= { total: 0, overdue: 0 });
    bucket.total += 1;
    if (a.status === 'overdue') bucket.overdue += 1;
  }
  return map;
});

interface DayItem {
  key: string;
  dow: string;
  dayNum: number;
  isToday: boolean;
  count: number;
  overdue: number;
}

const days = computed<DayItem[]>(() => {
  const items: DayItem[] = [];
  for (let i = -STRIP_BACK; i < STRIP_DAYS - STRIP_BACK; i += 1) {
    const key = shiftKey(todayKey, i);
    const date = keyToDate(key);
    const counts = countsByDay.value[key];
    items.push({
      key,
      dow: weekdayInOrgTz(date, undefined, 'short'),
      dayNum: date.getDate(),
      isToday: key === todayKey,
      count: counts?.total ?? 0,
      overdue: counts?.overdue ?? 0,
    });
  }
  return items;
});

function matchesMode(a: Appointment): boolean {
  if (statusMode.value === 'pending') return a.status === 'scheduled' || a.status === 'overdue';
  if (statusMode.value === 'done') return a.status === 'completed';
  return true;
}

function byStart(a: Appointment, b: Appointment): number {
  return appointmentStart(a).getTime() - appointmentStart(b).getTime()
    || (a.title || '').localeCompare(b.title || '');
}

const dayAppointments = computed<Appointment[]>(() =>
  (appointments.value as Appointment[]).filter(
    (a) => orgDayKey(a.appointmentDate) === selectedKey.value,
  ),
);

const dayList = computed<Appointment[]>(() =>
  dayAppointments.value.filter(matchesMode).sort(byStart),
);

const overdue = computed<Appointment[]>(() =>
  (appointments.value as Appointment[])
    .filter((a) => a.status === 'overdue')
    .sort(byStart),
);

const dayTitle = computed(() => {
  if (selectedKey.value === todayKey) return 'Hôm nay';
  if (selectedKey.value === shiftKey(todayKey, 1)) return 'Ngày mai';
  if (selectedKey.value === shiftKey(todayKey, -1)) return 'Hôm qua';
  return weekdayInOrgTz(keyToDate(selectedKey.value), undefined, 'long');
});

const daySubtitle = computed(
  () => `${formatKey(selectedKey.value, true)} · ${dayList.value.length} lịch`,
);

const emptyText = computed(() => {
  if (statusMode.value === 'pending') return 'Không còn lịch cần làm trong ngày này';
  if (statusMode.value === 'done') return 'Chưa có lịch hoàn thành trong ngày này';
  return 'Chưa có lịch hẹn trong ngày này';
});
const emptyIcon = computed(() =>
  statusMode.value === 'done' ? 'mdi-check-all' : 'mdi-calendar-blank-outline',
);

const canAct = computed(
  () => !!selected.value && ['scheduled', 'overdue'].includes(selected.value.status),
);

// ── Display helpers ──────────────────────────────────────────────────────
function contactName(a: Appointment): string {
  return a.contact?.fullName || 'Khách hàng';
}

function contactAvatar(a: Appointment): string | null {
  return a.contact?.avatarUrl || null;
}

function timeLabel(a: Appointment): string {
  const raw = (a.appointmentTime || '').trim();
  if (raw) return raw.slice(0, 5);
  return formatInOrgTz(appointmentStart(a), undefined, { timeOnly: true });
}

function endTimeLabel(a: Appointment): string {
  return formatInOrgTz(appointmentEnd(a), undefined, { timeOnly: true });
}

function durationLabel(a: Appointment): string {
  const m = a.durationMin ?? 30;
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}g${rest}` : `${h}g`;
}

function shortDay(a: Appointment): string {
  return formatKey(orgDayKey(a.appointmentDate));
}

function longDay(a: Appointment): string {
  const key = orgDayKey(a.appointmentDate);
  return `${weekdayInOrgTz(keyToDate(key), undefined, 'long')}, ${formatKey(key, true)}`;
}

function ownerName(a: Appointment): string {
  return appointmentOwnerName(a);
}

function ownerStyle(a: Appointment): Record<string, string> {
  const c = saleColor(appointmentOwnerId(a));
  return { background: c.soft, color: c.bg };
}

function typeStyle(a: Appointment): Record<string, string> {
  const c = typeTint(a.type);
  return { background: c.bg, color: c.text };
}

// ── Strip navigation ─────────────────────────────────────────────────────
function centerSelected(smooth = true) {
  nextTick(() => {
    const strip = stripRef.value;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-day="${selectedKey.value}"]`);
    if (!el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
    strip.scrollTo({
      left: Math.max(0, left),
      behavior: smooth ? 'smooth' : 'auto',
    });
  });
}

function selectDay(key: string) {
  selectedKey.value = key;
  sheetOpen.value = false;
  centerSelected(true);
}

function goToday() {
  selectDay(todayKey);
}

function setStatusMode(mode: 'pending' | 'done' | 'all') {
  statusMode.value = mode;
  if (mode !== 'pending') overdueOpen.value = false;
}

watch(selectedKey, () => centerSelected(true));

// ── Data load ────────────────────────────────────────────────────────────
async function load() {
  filters.from = rangeIso(-7, false);
  filters.to = rangeIso(30, true);
  filters.status = '';
  filters.contactId = '';
  filters.source = 'all';
  await fetchAppointments();
}

// ── Detail / editor ──────────────────────────────────────────────────────
function openDetail(a: Appointment) {
  selected.value = a;
  actionError.value = '';
  sheetOpen.value = true;
}

function openCreate() {
  editing.value = null;
  editorDate.value = keyToDate(selectedKey.value);
  editorOpen.value = true;
}

function openEdit(a: Appointment) {
  sheetOpen.value = false;
  editing.value = a;
  editorDate.value = null;
  editorOpen.value = true;
}

/** Vuốt trái trên card → 2 thao tác nhanh theo trạng thái. */
function rowActions(a: Appointment): SwipeAction[] {
  if (a.status === 'scheduled' || a.status === 'overdue') {
    return [
      { key: 'complete', label: 'Xong', icon: 'mdi-check-circle', tone: 'success' },
      { key: 'edit', label: 'Đổi giờ', icon: 'mdi-clock-edit-outline', tone: 'primary' },
    ];
  }
  return [
    { key: 'reopen', label: 'Mở lại', icon: 'mdi-restore', tone: 'primary' },
    { key: 'edit', label: 'Đổi giờ', icon: 'mdi-clock-edit-outline', tone: 'primary' },
  ];
}

function onCardAction(key: string, a: Appointment) {
  if (key === 'edit') {
    openEdit(a);
    return;
  }
  if (key === 'complete') {
    void setStatus(a, 'completed', true);
    return;
  }
  if (key === 'reopen') {
    void setStatus(a, 'scheduled', true);
  }
}

function onCreated(a: Appointment) {
  const key = a?.appointmentDate ? orgDayKey(a.appointmentDate) : '';
  if (key) {
    setStatusMode('pending');
    selectedKey.value = key;
    centerSelected(true);
  }
  void load();
}

function onUpdated() {
  void load();
}

function openChat(a: Appointment) {
  sheetOpen.value = false;
  if (a.conversationId) {
    router.push(`/chat/${a.conversationId}`);
  } else if (a.contactId) {
    router.push({ path: '/chat', query: { contactId: a.contactId } });
  }
}

async function setStatus(
  target: Appointment | null,
  status: 'completed' | 'cancelled' | 'no_show' | 'scheduled',
  quiet = false,
) {
  if (!target || acting.value) return;

  if (status === 'cancelled' || status === 'no_show') {
    const isCancel = status === 'cancelled';
    const ok = await confirm({
      title: isCancel ? 'Huỷ lịch hẹn?' : 'Đánh dấu khách vắng mặt?',
      message: isCancel
        ? 'Lịch hẹn sẽ chuyển sang trạng thái Đã huỷ.'
        : 'Lịch hẹn sẽ chuyển sang trạng thái Vắng mặt.',
      confirmText: isCancel ? 'Huỷ lịch' : 'Vắng mặt',
      tone: 'danger',
    });
    if (!ok) return;
  }

  actionError.value = '';
  acting.value = true;
  const ok = await changeStatus(target.id, status);
  acting.value = false;

  if (!ok) {
    if (quiet) toast.error('Không cập nhật được trạng thái. Vui lòng thử lại.');
    else actionError.value = 'Không cập nhật được trạng thái. Vui lòng thử lại.';
    return;
  }
  if (quiet) {
    toast.success(
      status === 'completed'
        ? 'Đã hoàn thành lịch hẹn'
        : status === 'scheduled'
          ? 'Đã mở lại lịch hẹn'
          : 'Đã cập nhật lịch hẹn',
    );
  }
  sheetOpen.value = false;
}

onMounted(async () => {
  await load();
  centerSelected(false);
  void fetchUsers();
});
</script>

<style scoped>
.ma {
  min-height: 100%;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  background: var(--surface-2, #f8f9fa);
}

/* ── Date strip ───────────────────────────────────────────────────────── */
.ma-strip {
  position: sticky;
  top: 0;
  z-index: 6;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 10px 9px;
  background: var(--surface, #fff);
  border-bottom: 1px solid var(--line-2, #eef1f6);
  scrollbar-width: none;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.ma-strip::-webkit-scrollbar {
  display: none;
}
.ma-day {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 46px;
  height: 60px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 14px;
  background: var(--surface-3, #f4f6f8);
  color: var(--ink-3, #475569);
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ma-day__dow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-4, #64748b);
}
.ma-day__num {
  font-size: 17px;
  font-weight: 650;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ma-day__dot {
  width: 5px;
  height: 5px;
  margin-top: 2px;
  border-radius: 50%;
  background: transparent;
}
.ma-day__dot.has-dot {
  background: var(--brand, #2151a1);
}
.ma-day__dot.is-overdue {
  background: var(--warning, #b45309);
}
.ma-day.is-today {
  border-color: var(--brand-soft-2, #c7d7f0);
}
.ma-day.is-active {
  background: var(--brand, #2151a1);
  border-color: var(--brand, #2151a1);
  color: #fff;
  box-shadow: 0 3px 10px rgba(33, 81, 161, 0.28);
}
.ma-day.is-active .ma-day__dow {
  color: rgba(255, 255, 255, 0.82);
}
.ma-day.is-active .ma-day__dot.has-dot,
.ma-day.is-active .ma-day__dot.is-overdue {
  background: #fff;
}

/* ── Filter + add ─────────────────────────────────────────────────────── */
.ma-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 6px;
}
.ma-chips {
  display: flex;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.ma-chips::-webkit-scrollbar {
  display: none;
}
.ma-chip {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 13px;
  border-radius: 999px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--ink-3, #475569);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ma-chip.is-active {
  background: var(--brand, #2151a1);
  border-color: var(--brand, #2151a1);
  color: #fff;
  font-weight: 600;
}
.ma-add {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--brand, #2151a1);
  color: #fff;
  box-shadow: 0 2px 8px rgba(33, 81, 161, 0.3);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ma-add:active {
  background: var(--brand-700, #163870);
}

/* ── Overdue ──────────────────────────────────────────────────────────── */
.ma-overdue {
  margin: 6px 12px 0;
  border: 1px solid #f5d9a8;
  border-radius: 13px;
  background: #fffaf0;
  overflow: hidden;
}
.ma-overdue__head {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.ma-overdue__ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #fdeccd;
  color: #9a5a08;
  flex: 0 0 auto;
}
.ma-overdue__txt {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ma-overdue__txt b {
  font-size: 13.5px;
  font-weight: 650;
  color: #7a4a05;
}
.ma-overdue__txt em {
  font-size: 11.5px;
  font-style: normal;
  color: #9a6a1c;
}
.ma-overdue__list {
  border-top: 1px solid #f5e3c2;
}
.ma-overdue__row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid #f7ead2;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.ma-overdue__row:last-child {
  border-bottom: 0;
}
.ma-overdue__row:active {
  background: #fff3df;
}
.ma-overdue__date {
  flex: 0 0 auto;
  font-size: 11.5px;
  font-weight: 600;
  color: #9a5a08;
  font-variant-numeric: tabular-nums;
}
.ma-overdue__time {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 650;
  color: var(--ink, #101e34);
  font-variant-numeric: tabular-nums;
}
.ma-overdue__name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--ink-2, #334155);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Day heading ──────────────────────────────────────────────────────── */
.ma-dayhead {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 14px 14px 8px;
}
.ma-dayhead__main {
  flex: 1 1 auto;
  min-width: 0;
}
.ma-dayhead__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink, #101e34);
}
.ma-dayhead__sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--ink-4, #64748b);
}
.ma-today {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 999px;
  background: var(--surface, #fff);
  color: var(--brand, #2151a1);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Cards ────────────────────────────────────────────────────────────── */
.ma-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 10px;
}
/* MobileSwipeRow: giữ bo góc khi lộ ngăn kéo thao tác. */
.ma-list :deep(.msw) {
  border-radius: 14px;
}
.ma-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  background: var(--surface, #fff);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ma-card:active {
  background: var(--surface-3, #f4f6f8);
}
.ma-card__time {
  flex: 0 0 46px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding-top: 1px;
}
.ma-card__hh {
  font-size: 16.5px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink, #101e34);
  font-variant-numeric: tabular-nums;
}
.ma-card__dur {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--ink-4, #64748b);
}
.ma-card__bar {
  flex: 0 0 3px;
  border-radius: 2px;
}
.ma-card__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ma-card__top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.ma-card__name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 650;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ma-card__title {
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--ink-3, #475569);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ma-card__meta {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 3px;
  font-size: 11px;
  color: var(--ink-4, #64748b);
  min-width: 0;
}
.ma-type {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}
.ma-loc {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 45%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ma-owner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 21px;
  height: 21px;
  margin-left: auto;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  font-style: normal;
  letter-spacing: 0.01em;
  flex: 0 0 auto;
}
.ma-owner--sm {
  width: 19px;
  height: 19px;
  margin-left: 0;
  margin-right: 4px;
  vertical-align: -4px;
}

/* Status pills */
.ma-st {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.ma-st--scheduled {
  background: #e8f0fe;
  color: #1d4ed8;
}
.ma-st--overdue {
  background: #fef3c7;
  color: #92400e;
}
.ma-st--completed {
  background: #dcfce7;
  color: #15803d;
}
.ma-st--cancelled {
  background: #eef1f6;
  color: #64748b;
}
.ma-st--no_show {
  background: #fee2e2;
  color: #b91c1c;
}

/* ── Skeleton / empty ─────────────────────────────────────────────────── */
.ma-card--skel {
  align-items: center;
  gap: 12px;
  cursor: default;
}
.ma-sk {
  display: block;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef1f6 25%, #f6f8fb 37%, #eef1f6 63%);
  background-size: 400% 100%;
  animation: ma-shimmer 1.3s ease-in-out infinite;
}
.ma-sk--time {
  width: 44px;
  height: 30px;
  flex: 0 0 auto;
}
.ma-sk--lines {
  height: 38px;
  flex: 1 1 auto;
}
@keyframes ma-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .ma-sk { animation: none; }
}
.ma-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 52px 28px;
  text-align: center;
  color: var(--ink-4, #64748b);
}
.ma-empty p {
  margin: 0;
  max-width: 250px;
  font-size: 13.5px;
  line-height: 1.45;
}
.ma-empty__btn {
  margin-top: 8px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid var(--brand, #2151a1);
  border-radius: 999px;
  background: transparent;
  color: var(--brand, #2151a1);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Sheet ────────────────────────────────────────────────────────────── */
.ma-shead {
  display: flex;
  align-items: center;
  gap: 11px;
  flex: 1 1 auto;
  min-width: 0;
}
.ma-shead__txt {
  flex: 1 1 auto;
  min-width: 0;
}
.ma-shead__name {
  font-size: 16.5px;
  font-weight: 700;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ma-shead__sub {
  margin-top: 1px;
  font-size: 12.5px;
  color: var(--ink-4, #64748b);
}
.ma-when {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px;
  border-radius: 13px;
  background: var(--surface-2, #f8f9fa);
  border: 1px solid var(--line-2, #eef1f6);
}
.ma-when__ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  font-size: 18px;
  flex: 0 0 auto;
}
.ma-when__txt {
  min-width: 0;
}
.ma-when__d {
  font-size: 13px;
  font-weight: 650;
  color: var(--ink, #101e34);
}
.ma-when__t {
  margin-top: 1px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand, #2151a1);
  font-variant-numeric: tabular-nums;
}
.ma-when__t span {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ink-4, #64748b);
}
.ma-when__loc {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-4, #64748b);
}
.ma-block {
  margin-top: 14px;
}
.ma-block__lb {
  margin-bottom: 4px;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4, #64748b);
}
.ma-block__title {
  font-size: 14.5px;
  font-weight: 550;
  line-height: 1.4;
  color: var(--ink, #101e34);
  overflow-wrap: anywhere;
}
.ma-block__notes {
  margin: 6px 0 0;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--surface-2, #f8f9fa);
  font-size: 13px;
  line-height: 1.45;
  color: var(--ink-3, #475569);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ma-kv {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--line-2, #eef1f6);
  font-size: 13px;
}
.ma-kv:last-child {
  border-bottom: 0;
}
.ma-kv > span {
  flex: 0 0 34%;
  color: var(--ink-4, #64748b);
}
.ma-kv > b {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 550;
  color: var(--ink, #101e34);
}
.ma-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-top: 14px;
}
.ma-act {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 60px;
  padding: 0;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 11px;
  background: var(--surface, #fff);
  color: var(--brand, #2151a1);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ma-act:active {
  background: var(--brand-soft, #e8eef8);
}
.ma-act.is-disabled {
  color: var(--ink-4, #64748b);
  opacity: 0.5;
  cursor: not-allowed;
}
.ma-status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.ma-sbtn {
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 100px;
  height: 42px;
  padding: 0 10px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 11px;
  background: var(--surface, #fff);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ma-sbtn:disabled {
  opacity: 0.55;
  cursor: wait;
}
.ma-sbtn--ok {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}
.ma-sbtn--warn {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}
.ma-sbtn--danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
.ma-sbtn--reopen {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}
.ma-error {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 9px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12.5px;
}
.ma-profile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  padding: 8px 0;
  color: var(--brand, #2151a1);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}
</style>
