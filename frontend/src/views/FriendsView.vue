<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div class="friends-page">
    <!-- 2-col layout: sidebar (nicks) + main -->
    <div class="page-grid">
      <NickSidebar
        class="desktop-sidebar"
        :accounts="accounts"
        :selected-nick-id="effectiveNickId"
        :count-by-nick="countByNick"
        :total-friends-all="totalAcrossAllNicks"
        @select="onSelectNick"
      />

      <main class="main">
        <header class="page-head">
          <div class="head-title">
            <v-icon icon="mdi-account-group-outline" size="22" class="title-icon text-brand" />
            <h1>Bạn bè</h1>
          </div>

          <!-- Mobile Nick Selector Trigger (visible only on mobile) -->
          <button v-if="isMobile" class="mobile-nick-btn" @click="showMobileNickSheet = true">
            <span class="av" :class="activeAccount ? nickAvatarClass(activeAccount.id) : 'all'">
              {{ activeAccount ? nickInitials(activeAccount.displayName) : '∑' }}
            </span>
            <span class="nick-name">{{ activeAccount ? activeAccount.displayName : 'Tất cả nick' }}</span>
            <v-icon icon="mdi-chevron-down" size="16" class="chevron-icon" />
          </button>

          <!-- Desktop active nick badge -->
          <span v-if="activeAccount && !isMobile" class="active-nick desktop-only">
            <span class="av" :class="nickAvatarClass(activeAccount.id)">{{ nickInitials(activeAccount.displayName) }}</span>
            <span class="nick-name">{{ activeAccount.displayName || 'Nick' }}</span>
            <span class="dot-sep">·</span>
            <span>{{ friendsDbTotal }} bạn</span>
          </span>
          <span v-else-if="effectiveNickId === 'all' && !isMobile" class="active-nick all desktop-only">
            <span class="av">∑</span>
            <span class="nick-name">Tất cả nick</span>
            <span class="dot-sep">·</span>
            <span>{{ totalAcrossAllNicks }} bạn</span>
          </span>

          <div class="spacer" />

          <!-- Search with icon & clear -->
          <div class="head-search-wrap">
            <v-icon icon="mdi-magnify" size="16" class="search-icon" />
            <input
              v-model="searchInput"
              class="head-search"
              placeholder="Tìm theo tên, SĐT, nick..."
              @input="debouncedFetch"
            />
            <button v-if="searchInput" class="search-clear" @click="searchInput = ''; debouncedFetch()">
              <v-icon icon="mdi-close-circle" size="14" />
            </button>
          </div>

          <button class="btn desktop-only" title="Xuất CSV danh sách" @click="onExportCsv">
            <v-icon icon="mdi-download-outline" size="15" />
            <span>Xuất CSV</span>
          </button>

          <!-- Column configuration menu (Desktop) -->
          <v-menu :close-on-content-click="false">
            <template #activator="{ props: act }">
              <button v-bind="act" class="btn desktop-only" title="Bật/tắt cột tuỳ chọn">
                <v-icon icon="mdi-view-column-outline" size="15" />
                <span>Cột</span>
              </button>
            </template>
            <v-list density="compact" min-width="280">
              <v-list-subheader>Cột mặc định (luôn hiện)</v-list-subheader>
              <v-list-item v-for="c in DEFAULT_COLUMNS" :key="c.key" disabled>
                <template #prepend>
                  <v-icon size="18" color="primary">mdi-checkbox-marked</v-icon>
                  <v-icon size="16" class="ml-1 mr-2 text-muted">{{ c.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ c.label }}</v-list-item-title>
                <v-list-item-subtitle v-if="c.hint" class="text-caption">{{ c.hint }}</v-list-item-subtitle>
              </v-list-item>
              <v-divider class="my-1" />
              <v-list-subheader>Cột tuỳ chọn (bật/tắt)</v-list-subheader>
              <v-list-item
                v-for="c in OPTIONAL_COLUMNS"
                :key="c.key"
                @click="toggleColumn(c.key)"
              >
                <template #prepend>
                  <v-icon size="18" :color="visibleCols[c.key] ? 'primary' : ''">
                    {{ visibleCols[c.key] ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
                  </v-icon>
                  <v-icon size="16" class="ml-1 mr-2 text-muted">{{ c.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ c.label }}</v-list-item-title>
                <v-list-item-subtitle v-if="c.hint" class="text-caption">{{ c.hint }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-menu>

          <button
            v-if="activeAccount"
            class="btn primary"
            :disabled="syncing"
            title="Auto-sync mỗi 15 phút. Click để refresh ngay lập tức."
            @click="onSync"
          >
            <v-icon icon="mdi-sync" size="15" :class="{ 'spin-anim': syncing }" />
            <span>{{ syncing ? 'Đang làm mới…' : 'Làm mới ngay' }}</span>
          </button>
        </header>

        <FriendsSmartHints :friends="friendsDb" @apply="onApplyHint" />

        <FriendsFilterBar
          :kind-filter="state.kindFilter.value"
          :count-by-kind="countByKind"
          :care-status="state.careStatus.value"
          @update:kind-filter="onKindChange"
          @update:care-status="onCareChange"
        />

        <div class="stats">
          <div class="stat good"><span class="sdot ok"></span>Đã KB: <strong>{{ friendCounts.friend ?? 0 }}</strong></div>
          <div class="stat warn"><span class="sdot warn"></span>Đang chờ: <strong>{{ friendCounts.pending_friend ?? 0 }}</strong></div>
          <div class="stat"><span class="sdot info"></span>Đang nhắn lạ: <strong>{{ friendCounts.chatting_stranger ?? 0 }}</strong></div>
          <div class="stat"><span class="sdot mut"></span>Đã ngắt: <strong>{{ friendCounts.ghost ?? 0 }}</strong></div>
          <div v-if="silentCount > 0" class="stat bad"><span class="sdot err"></span>Im lặng &gt; 7d: <strong>{{ silentCount }}</strong></div>
          <div class="spacer-flex desktop-only" />
          <span class="density-label desktop-only">Hiển thị:</span>
          <div class="density-toggle desktop-only">
            <button
              v-for="d in DENSITY_OPTIONS"
              :key="d.value"
              :class="{ active: state.density.value === d.value }"
              @click="state.density.value = d.value"
            >{{ d.label }}</button>
          </div>
        </div>

        <FriendsBulkBar
          :count="selected.size"
          @clear="selected = new Set()"
          @msg-batch="onBulkMessage"
          @tag="onBulkTag"
          @change-status="onBulkChangeStatus"
          @export="onBulkExport"
        />

        <!-- Smart Cards view for Mobile, High-density Table for Desktop -->
        <FriendsCards
          v-if="isMobile"
          :friends="friendsDb"
          :loading="loadingDb"
          :selected="selected"
          @update:selected="selected = $event"
          @open-detail="onOpenDetail"
          @open-chat="onOpenChat"
          @call="onCall"
          @open-contact="onOpenContact"
        />
        <FriendsTable
          v-else
          :friends="friendsDb"
          :loading="loadingDb"
          :density="state.density.value"
          :selected="selected"
          :visible-cols="visibleCols"
          :sort-by="sortBy"
          @update:selected="selected = $event"
          @open-detail="onOpenDetail"
          @open-chat="onOpenChat"
          @open-contact="onOpenContact"
          @sort-by="setSortBy"
        />

        <div class="pag">
          <span>{{ pagFrom }}–{{ pagTo }} / {{ friendsDbTotal }}</span>
          <div class="spacer-flex" />
          <span class="desktop-only">Trang:</span>
          <button :disabled="pagination.page === 1" @click="goPage(pagination.page - 1)">« Trước</button>
          <button
            v-for="p in visiblePages"
            :key="p"
            :class="{ primary: p === pagination.page }"
            @click="goPage(p)"
          >{{ p }}</button>
          <button :disabled="pagination.page >= totalPages" @click="goPage(pagination.page + 1)">Sau »</button>
        </div>
      </main>
    </div>

    <!-- Mobile Nick Selector Sheet -->
    <MobileSheet
      v-model="showMobileNickSheet"
      title="Chọn Nick Zalo"
      flush
    >
      <div class="mobile-nick-sheet-list">
        <div
          class="sheet-nick-item"
          :class="{ active: effectiveNickId === 'all' }"
          @click="onSelectNick('all'); showMobileNickSheet = false"
        >
          <div class="av all">∑</div>
          <div class="info">
            <div class="name">Tất cả nick</div>
            <div class="sub">Tổng hợp {{ accounts.length }} nick</div>
          </div>
          <span class="count">{{ totalAcrossAllNicks }}</span>
          <v-icon v-if="effectiveNickId === 'all'" icon="mdi-check" size="18" color="primary" />
        </div>
        <div
          v-for="acc in accounts"
          :key="acc.id"
          class="sheet-nick-item"
          :class="{ active: effectiveNickId === acc.id }"
          @click="onSelectNick(acc.id); showMobileNickSheet = false"
        >
          <div class="av" :class="nickAvatarClass(acc.id)">
            <img v-if="acc.avatarUrl" :src="acc.avatarUrl" :alt="acc.displayName || 'Nick'" />
            <span v-else>{{ nickInitials(acc.displayName) }}</span>
          </div>
          <div class="info">
            <div class="name">{{ acc.displayName || 'Nick chưa đặt tên' }}</div>
            <div class="sub">{{ acc.phone || acc.zaloUid || '—' }}</div>
          </div>
          <span class="count">{{ countByNick[acc.id] ?? 0 }}</span>
          <v-icon v-if="effectiveNickId === acc.id" icon="mdi-check" size="18" color="primary" />
        </div>
      </div>
    </MobileSheet>

    <FriendDetailPanel
      :friend="detailFriend"
      :active-nick-name="activeAccount?.displayName || 'Nick'"
      @close="detailFriend = null"
      @open-chat="onOpenChat"
      @call="onCall"
      @open-contact="onOpenContact"
    />

    <!-- Hồ sơ KH tổng (tái dùng) -->
    <CustomerProfileDialog
      v-model="showProfileDialog"
      :contact-id="profileContactId"
      :friend-id="profileFriendId"
      initial-tab="nicks"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useFriends, type DbFriend } from '@/composables/use-friends';
import { useZaloAccounts } from '@/composables/use-zalo-accounts';
import { useFriendsState, type DensityMode, type FriendKindFilter } from '@/composables/use-friends-state';
import { useFriendSocket, type FriendUpdatedPayload } from '@/composables/use-friend-socket';
import { useMobile } from '@/composables/use-mobile';
import NickSidebar from '@/components/friends/NickSidebar.vue';
import FriendsFilterBar from '@/components/friends/FriendsFilterBar.vue';
import FriendsSmartHints from '@/components/friends/FriendsSmartHints.vue';
import FriendsTable from '@/components/friends/FriendsTable.vue';
import FriendsCards from '@/components/friends/FriendsCards.vue';
import FriendsBulkBar from '@/components/friends/FriendsBulkBar.vue';
import FriendDetailPanel from '@/components/friends/FriendDetailPanel.vue';
import CustomerProfileDialog from '@/components/contacts/CustomerProfileDialog.vue';
import MobileSheet from '@/components/mobile/MobileSheet.vue';
import { useToast } from '@/composables/use-toast';
import type { SmartHint } from '@/components/friends/FriendsSmartHints.vue';

const router = useRouter();
const toast = useToast();
const { isMobile } = useMobile();
const { accounts, fetchAccounts } = useZaloAccounts();
const {
  friendsDb,
  friendsDbTotal,
  friendCounts,
  loadingDb,
  syncing,
  fetchFriendsDb,
  fetchFriendsDbAllNicks,
  syncFriendsDb,
} = useFriends();

const stateRaw = useFriendsState();
const state = {
  kindFilter: stateRaw.kindFilter,
  careStatus: stateRaw.careStatus,
  density: stateRaw.density,
  restoredFromStorage: stateRaw.restoredFromStorage,
  dismissRestoreToast: stateRaw.dismissRestoreToast,
};

const DENSITY_OPTIONS: { value: DensityMode; label: string }[] = [
  { value: 'compact',  label: 'Gọn' },
  { value: 'normal',   label: 'Vừa' },
  { value: 'detailed', label: 'Rộng' },
];

const showMobileNickSheet = ref(false);

// ─── Column toggle (Tier 1 default vs Tier 2 optional) ───
const DEFAULT_COLUMNS = [
  { key: 'becameFriendAt', label: 'KB từ ngày',  hint: 'Ngày trở thành bạn bè trên Zalo', icon: 'mdi-clock-outline' },
  { key: 'stuckSince',     label: 'Đình trệ',    hint: 'KH bị cron flag stuck do không tương tác', icon: 'mdi-alert-circle-outline' },
  { key: 'autoTags',       label: 'Auto tag',    hint: 'System auto: active / stuck / cold / ready ...', icon: 'mdi-robot-outline' },
] as const;

const OPTIONAL_COLUMNS = [
  { key: 'zaloGlobalId',  label: 'Global ID',         hint: 'Zalo global identity, cross-nick', icon: 'mdi-web' },
  { key: 'zaloUsername',  label: 'Username',          hint: 'Zalo handle (@t_abc...)', icon: 'mdi-at' },
  { key: 'lastInboundAt', label: 'KH nhắn cuối',      hint: 'Tách riêng inbound (tin từ KH)', icon: 'mdi-inbox-arrow-down-outline' },
  { key: 'lastOutboundAt',label: 'Sale nhắn cuối',    hint: 'Tách riêng outbound (tin từ sale)', icon: 'mdi-send-outline' },
  { key: 'firstMessageAt',label: 'First message',     hint: 'Mở chat 1-1 lần đầu', icon: 'mdi-message-text-outline' },
  { key: 'stageEnteredAt',label: 'Stage từ',           hint: 'Vào trạng thái KH hiện tại lúc nào', icon: 'mdi-timer-outline' },
  { key: 'silent',        label: 'Silent',            hint: 'Số ngày KH không nhắn (KH cold tail)', icon: 'mdi-volume-off' },
  { key: 'replyRate',     label: 'Reply rate',        hint: 'Tỷ lệ outbound/inbound — sale có chăm đủ không', icon: 'mdi-email-sync-outline' },
  { key: 'healthBars',    label: 'Health bars',       hint: 'Score breakdown 4-dim mini bars (engagement/intent/fit/velocity)', icon: 'mdi-chart-timeline-variant-shimmer' },
] as const;

type OptionalColKey = (typeof OPTIONAL_COLUMNS)[number]['key'];

const LS_KEY_COLS = 'friendsview.visibleCols.v1';
function loadVisibleCols(): Record<OptionalColKey, boolean> {
  const def: Record<OptionalColKey, boolean> = {
    zaloGlobalId: false, zaloUsername: false,
    lastInboundAt: false, lastOutboundAt: false,
    firstMessageAt: false, stageEnteredAt: false,
    silent: false, replyRate: false, healthBars: false,
  };
  try {
    const raw = localStorage.getItem(LS_KEY_COLS);
    if (raw) return { ...def, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return def;
}
const visibleCols = ref<Record<OptionalColKey, boolean>>(loadVisibleCols());
function toggleColumn(key: OptionalColKey) {
  visibleCols.value[key] = !visibleCols.value[key];
  try { localStorage.setItem(LS_KEY_COLS, JSON.stringify(visibleCols.value)); } catch { /* ignore */ }
}

function onExportCsv() {
  toast.push('Tính năng xuất CSV đang được chuẩn hóa.');
}

const searchInput = ref('');
const pagination = reactive({ page: 1, limit: 25 });
const selected = ref<Set<string>>(new Set());
const detailFriend = ref<DbFriend | null>(null);

const effectiveNickId = computed<string | null>(() => stateRaw.selectedNickId.value);
const activeAccount = computed(() =>
  accounts.value.find(a => a.id === effectiveNickId.value) || null,
);

const countByNick = ref<Record<string, number>>({});
const totalAcrossAllNicks = computed(() => {
  return Object.values(countByNick.value).reduce((s, v) => s + v, 0);
});
const countByKind = computed<Record<string, number>>(() => {
  return {
    all: friendsDbTotal.value,
    friend: friendCounts.value.friend ?? 0,
    pending_friend: friendCounts.value.pending_friend ?? 0,
    chatting_stranger: friendCounts.value.chatting_stranger ?? 0,
    ghost: friendCounts.value.ghost ?? 0,
  };
});

const silentCount = computed(() => {
  const SEVEN = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return friendsDb.value.filter(f => f.lastInteractionAt && now - new Date(f.lastInteractionAt).getTime() >= SEVEN).length;
});

const totalPages = computed(() => Math.max(1, Math.ceil(friendsDbTotal.value / pagination.limit)));
const pagFrom = computed(() => {
  if (friendsDbTotal.value === 0) return 0;
  return (pagination.page - 1) * pagination.limit + 1;
});
const pagTo = computed(() => Math.min(pagination.page * pagination.limit, friendsDbTotal.value));
const visiblePages = computed<number[]>(() => {
  const total = totalPages.value;
  const cur = pagination.page;
  const out = new Set<number>([1, total, cur - 1, cur, cur + 1]);
  return [...out].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
});

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetch();
  }, 300);
}

async function fetch() {
  const id = effectiveNickId.value;
  if (!id) return;
  if (id === 'all') {
    await fetchFriendsDbAllNicks({
      kind: state.kindFilter.value === 'all' ? undefined : state.kindFilter.value,
      page: pagination.page,
      limit: pagination.limit,
      search: searchInput.value || undefined,
      sortBy: sortBy.value,
      statusId: state.careStatus.value || undefined,
    });
    return;
  }
  await fetchFriendsDb(id, {
    kind: state.kindFilter.value === 'all' ? undefined : state.kindFilter.value,
    page: pagination.page,
    limit: pagination.limit,
    search: searchInput.value || undefined,
    sortBy: sortBy.value,
    statusId: state.careStatus.value || undefined,
  });
}

type SortBy = 'recent' | 'score-desc' | 'score-asc' | 'stuck';
const SORT_LS_KEY = 'friendsview.sortBy.v1';
const sortBy = ref<SortBy>((localStorage.getItem(SORT_LS_KEY) as SortBy) || 'recent');
function setSortBy(v: SortBy) {
  sortBy.value = v;
  try { localStorage.setItem(SORT_LS_KEY, v); } catch { /* ignore */ }
  pagination.page = 1;
  fetch();
}

function goPage(p: number) {
  pagination.page = p;
  fetch();
}

function onSelectNick(nickId: string) {
  stateRaw.selectedNickId.value = nickId;
  pagination.page = 1;
  selected.value = new Set();
  fetch();
}

function onKindChange(v: FriendKindFilter) {
  state.kindFilter.value = v;
  pagination.page = 1;
  fetch();
}

function onCareChange(v: string) {
  state.careStatus.value = v;
  pagination.page = 1;
  fetch();
}

async function onSync() {
  if (!effectiveNickId.value || effectiveNickId.value === 'all') return;
  const result = await syncFriendsDb(effectiveNickId.value);
  if (result?.cooldown) {
    console.warn('[FriendsView] sync cooldown:', result.message);
    return;
  }
  await fetch();
}

useFriendSocket((payload: FriendUpdatedPayload) => {
  const row = friendsDb.value.find((f) => f.id === payload.friendId);
  if (!row) return;
  Object.assign(row as Record<string, unknown>, payload.patch);
});

function onOpenDetail(f: DbFriend) {
  detailFriend.value = f;
}

async function onOpenChat(f: DbFriend) {
  try {
    const { api } = await import('@/api/index');
    const res = await api.post<{ conversationId: string }>(`/friends/${f.id}/ensure-conversation`, {});
    if (res.data?.conversationId) {
      router.push({ name: 'Chat', params: { convId: res.data.conversationId } });
      return;
    }
  } catch (err) {
    console.error('[FriendsView] ensure-conversation failed:', err);
  }
  if (f.contact?.id) router.push({ path: '/chat', query: { contactId: f.contact.id } });
}

const showProfileDialog = ref(false);
const profileContactId = ref<string | null>(null);
const profileFriendId = ref<string | null>(null);
function onOpenContact(f: DbFriend) {
  if (!f.contact?.id) {
    toast.warning('Bạn này chưa gắn khách CRM — không mở được hồ sơ.');
    return;
  }
  profileContactId.value = f.contact.id;
  profileFriendId.value = f.id;
  showProfileDialog.value = true;
}

function onCall(f: DbFriend) {
  if (f.contact?.phone) {
    window.location.href = `tel:${f.contact.phone}`;
  }
}

function onBulkMessage() {
  console.log('[bulk] message to', [...selected.value]);
}
function onBulkTag() {
  console.log('[bulk] tag', [...selected.value]);
}
function onBulkChangeStatus() {
  console.log('[bulk] change status', [...selected.value]);
}
function onBulkExport() {
  console.log('[bulk] export', [...selected.value]);
}

function onApplyHint(h: SmartHint) {
  if (h.key === 'silent7d') {
    console.log('[hint] silent7d');
  } else if (h.key === 'newThisWeek') {
    console.log('[hint] newThisWeek');
  } else if (h.key === 'hotPending') {
    state.careStatus.value = 'hot';
    fetch();
  } else if (h.key === 'aliasDup') {
    console.log('[hint] aliasDup');
  }
}

const NICK_PALETTE = ['av-c1', 'av-c2', 'av-c3', 'av-c4', 'av-c5', 'av-c6', 'av-c7'];
function nickAvatarClass(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NICK_PALETTE[h % NICK_PALETTE.length];
}
function nickInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

watch(accounts, (list) => {
  if (!stateRaw.selectedNickId.value && list.length) {
    stateRaw.selectedNickId.value = list[0].id;
    fetch();
  }
}, { immediate: false });

onMounted(async () => {
  await fetchAccounts();
  const persisted = stateRaw.selectedNickId.value;
  if (persisted && persisted !== 'all') {
    const exists = accounts.value.some(a => a.id === persisted);
    if (!exists && accounts.value.length) {
      stateRaw.selectedNickId.value = accounts.value[0].id;
    }
  } else if (!persisted && accounts.value.length) {
    stateRaw.selectedNickId.value = accounts.value[0].id;
  }
  fetch();

  if (stateRaw.restoredFromStorage.value) {
    setTimeout(() => stateRaw.dismissRestoreToast(), 5000);
  }
});
</script>

<style scoped>
.friends-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  overflow: hidden;
}

.page-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  flex: 1;
  min-height: 0;
}

@media (max-width: 1100px) {
  .page-grid { grid-template-columns: 220px 1fr; }
}
@media (max-width: 800px) {
  .page-grid { grid-template-columns: 1fr; }
  .desktop-sidebar { display: none !important; }
  .desktop-only { display: none !important; }
}

.main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  flex: 1;
}

.page-head {
  padding: 12px 18px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.head-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.head-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--ink);
}
.title-icon {
  color: var(--brand);
}

/* Mobile Nick Selector Button */
.mobile-nick-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  padding: 4px 10px;
  border-radius: var(--r-pill, 20px);
  font-weight: 600;
  font-size: 12px;
  color: var(--ink);
  cursor: pointer;
  font-family: inherit;
}
.mobile-nick-btn .av {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
}
.mobile-nick-btn .av.all {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}
.mobile-nick-btn .nick-name {
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chevron-icon {
  opacity: .6;
}

.active-nick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--brand-soft);
  color: var(--brand);
  padding: 3px 10px;
  border-radius: var(--r-pill);
  font-weight: 600;
  font-size: 12px;
}
.active-nick .av {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
}
.active-nick.all .av {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}
.active-nick .dot-sep { opacity: .6; }

.spacer { flex: 1; }

/* Head search box with vector icons */
.head-search-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.head-search-wrap .search-icon {
  position: absolute;
  left: 10px;
  color: var(--ink-4);
  pointer-events: none;
}
.head-search {
  padding: 7px 30px 7px 32px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  width: 240px;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface);
  font-family: inherit;
  transition: border-color .12s, box-shadow .12s;
}
.head-search:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
@media (max-width: 600px) {
  .head-search { width: 100%; min-width: 160px; }
  .head-search-wrap { flex: 1; width: 100%; order: 3; }
}
.search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--ink-4);
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
}
.search-clear:hover { color: var(--ink); }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.btn:hover { background: var(--surface-3); color: var(--ink); }
.btn.primary {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
  box-shadow: var(--sh-xs);
}
.btn.primary:hover:not(:disabled) { background: var(--brand-600); }
.btn:disabled { opacity: .6; cursor: not-allowed; }

.spin-anim {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.stats {
  padding: 8px 18px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  display: flex;
  gap: 14px;
  align-items: center;
  font-size: 12px;
  color: var(--ink-2);
  flex-wrap: wrap;
}
.stats .stat { display: inline-flex; align-items: center; gap: 5px; }
.stats .stat strong { color: var(--ink); font-weight: 700; }
.stats .stat.good strong { color: var(--success); }
.stats .stat.warn strong { color: var(--warning); }
.stats .stat.bad strong { color: var(--error); }
.sdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex: none; }
.sdot.ok { background: var(--success); }
.sdot.warn { background: var(--warning); }
.sdot.info { background: var(--brand); }
.sdot.mut { background: var(--ink-4); }
.sdot.err { background: var(--error); }
.spacer-flex { flex: 1; }

.density-label { font-size: 11px; color: var(--ink-3); }
.density-toggle {
  display: inline-flex;
  background: var(--surface-3);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 2px;
}
.density-toggle button {
  padding: 4px 9px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  font-family: inherit;
}
.density-toggle button.active {
  background: var(--surface);
  color: var(--brand);
  box-shadow: var(--sh-xs);
}

.pag {
  padding: 8px 18px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-2);
  flex-wrap: wrap;
}
.pag button {
  min-height: 32px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--r-sm);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
  font-family: inherit;
  transition: all .12s;
}
.pag button:hover:not(:disabled) { background: var(--surface-3); }
.pag button.primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.pag button:disabled { opacity: .4; cursor: not-allowed; }

/* Mobile Nick Sheet List */
.mobile-nick-sheet-list {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  max-height: 60vh;
  overflow-y: auto;
}
.sheet-nick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background .12s;
}
.sheet-nick-item:hover, .sheet-nick-item.active {
  background: var(--brand-soft);
}
.sheet-nick-item .av {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  overflow: hidden;
  flex-shrink: 0;
}
.sheet-nick-item .av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sheet-nick-item .av.all {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}
.sheet-nick-item .info {
  flex: 1;
  min-width: 0;
}
.sheet-nick-item .name {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sheet-nick-item .sub {
  font-size: 11px;
  color: var(--ink-4);
}
.sheet-nick-item .count {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--surface-3);
  color: var(--ink-2);
}
.sheet-nick-item.active .count {
  background: var(--brand);
  color: #fff;
}

.av-c1 { background: linear-gradient(135deg, #2f6ee5, #1d4ed8); }
.av-c2 { background: linear-gradient(135deg, #16a34a, #15803d); }
.av-c3 { background: linear-gradient(135deg, #d97706, #b45309); }
.av-c4 { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
.av-c5 { background: linear-gradient(135deg, #db2777, #be185d); }
.av-c6 { background: linear-gradient(135deg, #0891b2, #0e7490); }
.av-c7 { background: linear-gradient(135deg, #ea580c, #c2410c); }
</style>
