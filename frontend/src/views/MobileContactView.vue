<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- Mobile contacts 2026-10-29 (P0): card → list row (quét nhanh 20-30 KH/màn),
       bỏ FAB nổi, chi tiết mở bằng bottom sheet thay dialog desktop. -->
  <div class="mc">
    <!-- ── Search + add ──────────────────────────────────────────────── -->
    <div class="mc-tools">
      <div class="mc-search">
        <v-icon icon="mdi-magnify" size="18" class="mc-search__ic" />
        <input
          v-model="filters.search"
          type="search"
          inputmode="search"
          placeholder="Tìm tên / SĐT khách hàng"
          aria-label="Tìm khách hàng"
          @input="onSearch"
        />
        <button
          v-if="filters.search"
          type="button"
          class="mc-search__x"
          aria-label="Xoá tìm kiếm"
          @click="clearSearch"
        >
          <v-icon icon="mdi-close-circle" size="16" />
        </button>
      </div>
      <button type="button" class="mc-add" aria-label="Thêm khách hàng" @click="openCreate">
        <v-icon icon="mdi-plus" size="22" />
      </button>
    </div>

    <!-- ── Status chips ──────────────────────────────────────────────── -->
    <div class="mc-chips" role="tablist" aria-label="Lọc theo trạng thái">
      <button
        v-for="status in STATUS_OPTIONS"
        :key="status.value"
        type="button"
        class="mc-chip"
        :class="[`mc-chip--${status.value}`, { 'is-active': filters.status === status.value }]"
        role="tab"
        :aria-selected="filters.status === status.value"
        @click="toggleStatus(status.value)"
      >
        {{ status.text }}
      </button>
    </div>

    <div class="mc-count">{{ total }} khách hàng</div>

    <!-- ── List ──────────────────────────────────────────────────────── -->
    <div v-if="loading && contacts.length === 0" class="mc-list" aria-busy="true">
      <div v-for="i in 6" :key="i" class="mc-row mc-row--skel">
        <span class="mc-sk mc-sk--av" />
        <span class="mc-sk mc-sk--ln" />
      </div>
    </div>

    <div v-else-if="contacts.length === 0" class="mc-empty">
      <v-icon icon="mdi-account-search-outline" size="44" />
      <p>Không tìm thấy khách hàng</p>
      <button type="button" class="mc-empty__btn" @click="openCreate">Thêm khách hàng</button>
    </div>

    <div v-else class="mc-list">
      <MobileSwipeRow
        v-for="contact in contacts"
        :key="contact.id"
        :actions="rowActions(contact)"
        @action="(key) => onRowAction(key, contact)"
      >
        <button
          type="button"
          class="mc-row"
          @click="openContact(contact)"
        >
          <Avatar :src="contact.avatarUrl || null" :name="displayName(contact)" :size="40" />
          <span class="mc-row__main">
            <span class="mc-row__name">{{ displayName(contact) }}</span>
            <span class="mc-row__sub">{{ subline(contact) }}</span>
          </span>
          <span
            v-if="contact.status"
            class="mc-row__st"
            :class="`mc-st--${contact.status}`"
          >{{ statusLabel(contact.status) }}</span>
          <v-icon icon="mdi-chevron-right" size="18" class="mc-row__ch" />
        </button>
      </MobileSwipeRow>
    </div>

    <button v-if="hasMore" type="button" class="mc-more" :disabled="loading" @click="loadMore">
      {{ loading ? 'Đang tải…' : 'Tải thêm' }}
    </button>

    <!-- ── Bottom sheet: chi tiết KH ────────────────────────────────── -->
    <MobileSheet v-model="sheetOpen" :title="sheetTitle">
      <template v-if="selectedContact" #header>
        <div class="mc-sheet-head">
          <Avatar
            :src="selectedContact.avatarUrl || null"
            :name="displayName(selectedContact)"
            :size="48"
          />
          <div class="mc-sheet-head__txt">
            <div class="mc-sheet-head__name">{{ displayName(selectedContact) }}</div>
            <div class="mc-sheet-head__sub">
              <span v-if="selectedContact.status" :class="`mc-dot mc-st--${selectedContact.status}`" />
              {{ selectedContact.status ? statusLabel(selectedContact.status) : 'Chưa phân loại' }}
            </div>
          </div>
        </div>
      </template>

      <template v-if="selectedContact">
        <!-- Quick actions -->
        <div class="mc-actions">
          <a v-if="selectedContact.phone" :href="`tel:${selectedContact.phone}`" class="mc-act">
            <v-icon icon="mdi-phone-outline" size="20" />
            <span>Gọi</span>
          </a>
          <button v-else type="button" class="mc-act" disabled>
            <v-icon icon="mdi-phone-outline" size="20" />
            <span>Gọi</span>
          </button>

          <button type="button" class="mc-act" @click="messageContact">
            <v-icon icon="mdi-message-text-outline" size="20" />
            <span>Nhắn</span>
          </button>

          <button type="button" class="mc-act" @click="editContact">
            <v-icon icon="mdi-pencil-outline" size="20" />
            <span>Sửa</span>
          </button>
        </div>

        <!-- Info -->
        <dl class="mc-info">
          <div class="mc-info__row">
            <dt>Số điện thoại</dt>
            <dd>{{ selectedContact.phone || '—' }}</dd>
          </div>
          <div class="mc-info__row">
            <dt>Nguồn</dt>
            <dd>{{ sourceLabel(selectedContact.source) }}</dd>
          </div>
          <div class="mc-info__row">
            <dt>Phụ trách</dt>
            <dd>{{ selectedContact.assignedUser?.fullName || '—' }}</dd>
          </div>
          <div class="mc-info__row">
            <dt>Ngày tạo</dt>
            <dd>{{ formatDate(selectedContact.createdAt) }}</dd>
          </div>
          <div class="mc-info__row mc-info__row--col">
            <dt>Ghi chú</dt>
            <dd>{{ selectedContact.notes || '—' }}</dd>
          </div>
        </dl>
      </template>

      <template #footer>
        <RouterLink
          v-if="selectedContact"
          :to="`/contacts/${selectedContact.id}/profile`"
          class="mc-sheet-link"
          @click="sheetOpen = false"
        >
          Mở hồ sơ đầy đủ
        </RouterLink>
      </template>
    </MobileSheet>

    <!-- Dialog desktop giữ nguyên cho tạo/sửa (form nhiều trường). -->
    <ContactDetailDialog
      v-model="showDialog"
      :contact="selectedContact"
      @saved="onSaved"
      @deleted="onDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Avatar from '@/components/ui/Avatar.vue';
import MobileSheet from '@/components/mobile/MobileSheet.vue';
import MobileSwipeRow from '@/components/mobile/MobileSwipeRow.vue';
import type { SwipeAction } from '@/components/mobile/mobile-swipe-types';
import ContactDetailDialog from '@/components/contacts/ContactDetailDialog.vue';
import { useContacts, STATUS_OPTIONS, SOURCE_OPTIONS } from '@/composables/use-contacts';
import type { Contact } from '@/composables/use-contacts';

const router = useRouter();
const { contacts, total, loading, filters, pagination, fetchContacts } = useContacts();

const showDialog = ref(false);
const sheetOpen = ref(false);
const selectedContact = ref<Contact | null>(null);

const sheetTitle = computed(() => (selectedContact.value ? 'Hồ sơ khách hàng' : ''));
const hasMore = computed(() => contacts.value.length < total.value);

function displayName(c: Contact): string {
  return c.crmName || c.fullName || 'Chưa có tên';
}

function subline(c: Contact): string {
  const parts = [c.phone || 'Chưa có SĐT', c.assignedUser?.fullName].filter(Boolean);
  return parts.join(' · ');
}

function statusLabel(value: string) {
  return STATUS_OPTIONS.find(o => o.value === value)?.text ?? value;
}

function sourceLabel(value: string | null) {
  if (!value) return '—';
  return SOURCE_OPTIONS.find(o => o.value === value)?.text ?? value;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

function toggleStatus(value: string) {
  filters.status = filters.status === value ? '' : value;
  pagination.page = 1;
  fetchContacts();
}

let searchTimeout: ReturnType<typeof setTimeout>;
function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetchContacts();
  }, 300);
}

function clearSearch() {
  filters.search = '';
  pagination.page = 1;
  fetchContacts();
}

async function loadMore() {
  if (loading.value || !hasMore.value) return;
  const prev = [...contacts.value];
  const seen = new Set(prev.map(c => c.id));
  pagination.page += 1;
  await fetchContacts();
  contacts.value = [...prev, ...contacts.value.filter(c => !seen.has(c.id))];
}

function openContact(contact: Contact) {
  selectedContact.value = contact;
  sheetOpen.value = true;
}

/** Vuốt trái trên dòng KH → thao tác nhanh (chỉ hiện khi có SĐT / có Zalo). */
function rowActions(c: Contact): SwipeAction[] {
  const actions: SwipeAction[] = [];
  if (c.phone) {
    actions.push({ key: 'call', label: 'Gọi', icon: 'mdi-phone', tone: 'success' });
  }
  actions.push({ key: 'message', label: 'Nhắn', icon: 'mdi-message-text', tone: 'primary' });
  return actions;
}

function onRowAction(key: string, c: Contact) {
  if (key === 'call' && c.phone) {
    window.location.href = `tel:${c.phone}`;
    return;
  }
  if (key === 'message') {
    router.push({ path: '/chat', query: { contactId: c.id } });
  }
}

function openCreate() {
  selectedContact.value = null;
  showDialog.value = true;
}

function editContact() {
  if (!selectedContact.value) return;
  sheetOpen.value = false;
  showDialog.value = true;
}

function messageContact() {
  if (!selectedContact.value) return;
  sheetOpen.value = false;
  router.push({ path: '/chat', query: { contactId: selectedContact.value.id } });
}

function onSaved() {
  fetchContacts();
}
function onDeleted() {
  sheetOpen.value = false;
  fetchContacts();
}

onMounted(() => fetchContacts());
onUnmounted(() => clearTimeout(searchTimeout));
</script>

<style scoped>
.mc {
  min-height: 100%;
  padding: 10px 0 20px;
  background: var(--surface-2, #f8f9fa);
}

/* ── Tools ───────────────────────────────────────────────────────────── */
.mc-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}
.mc-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  height: 42px;
  padding: 0 10px;
  border-radius: var(--r-pill, 999px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  color: var(--ink-4, #64748b);
}
.mc-search__ic {
  flex: 0 0 auto;
}
.mc-search input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  /* 16px: dưới ngưỡng này iOS Safari tự zoom khi focus input. */
  font-size: 16px;
  color: var(--ink, #101e34);
  font-family: inherit;
}
.mc-search input::-webkit-search-cancel-button {
  display: none;
}
.mc-search__x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--ink-4, #64748b);
  cursor: pointer;
}
.mc-add {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: var(--brand, #2151a1);
  color: #fff;
  box-shadow: 0 2px 8px rgba(33, 81, 161, 0.28);
  cursor: pointer;
}
.mc-add:active {
  background: var(--brand-700, #163870);
}

/* ── Chips ───────────────────────────────────────────────────────────── */
.mc-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 10px 12px 2px;
  scrollbar-width: none;
}
.mc-chips::-webkit-scrollbar {
  display: none;
}
.mc-chip {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--r-pill, 999px);
  border: 1px solid var(--line, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--ink-3, #475569);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mc-chip.is-active {
  background: var(--brand, #2151a1);
  border-color: var(--brand, #2151a1);
  color: #fff;
  font-weight: 600;
}

.mc-count {
  padding: 8px 14px 4px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-4, #64748b);
}

/* ── List ────────────────────────────────────────────────────────────── */
.mc-list {
  margin: 2px 8px 0;
  border-radius: var(--r-lg, 14px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  overflow: hidden;
}
.mc-row {
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
.mc-list > .msw:last-child .mc-row {
  border-bottom: 0;
}
.mc-row:active {
  background: var(--surface-3, #f4f6f8);
}
.mc-row__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mc-row__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-row__sub {
  font-size: 12.5px;
  color: var(--ink-4, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-row__st {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--r-pill, 999px);
  background: var(--surface-3, #f4f6f8);
}
.mc-row__ch {
  flex: 0 0 auto;
  color: var(--ink-4, #64748b);
}

/* Status colors dùng chung cho row + sheet */
.mc-st--new { color: var(--ink-3, #475569); }
.mc-st--contacted { color: var(--info, #2151a1); }
.mc-st--interested { color: var(--warning, #b45309); }
.mc-st--converted { color: var(--success, #0a805c); }
.mc-st--lost { color: var(--error, #c0392b); }

/* ── Skeleton / empty ────────────────────────────────────────────────── */
.mc-row--skel {
  cursor: default;
}
.mc-sk {
  display: block;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef1f6 25%, #f6f8fb 37%, #eef1f6 63%);
  background-size: 400% 100%;
  animation: mc-shimmer 1.3s ease-in-out infinite;
}
.mc-sk--av {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.mc-sk--ln {
  height: 12px;
  flex: 1 1 auto;
}
@keyframes mc-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .mc-sk { animation: none; }
}
.mc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 56px 24px;
  text-align: center;
  color: var(--ink-4, #64748b);
}
.mc-empty p {
  margin: 0;
  font-size: 14px;
}
.mc-empty__btn {
  margin-top: 8px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid var(--brand, #2151a1);
  border-radius: var(--r-pill, 999px);
  background: transparent;
  color: var(--brand, #2151a1);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.mc-more {
  display: block;
  width: calc(100% - 16px);
  margin: 10px 8px 0;
  height: 44px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: var(--r-md, 10px);
  background: var(--surface, #fff);
  color: var(--brand, #2151a1);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Sheet ───────────────────────────────────────────────────────────── */
.mc-sheet-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
}
.mc-sheet-head__txt {
  min-width: 0;
}
.mc-sheet-head__name {
  font-size: 17px;
  font-weight: 650;
  color: var(--ink, #101e34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-sheet-head__sub {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ink-4, #64748b);
}
.mc-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.mc-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 6px 0 14px;
}
.mc-act {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 62px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: var(--r-md, 10px);
  background: var(--surface, #fff);
  color: var(--brand, #2151a1);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.mc-act:disabled {
  color: var(--ink-4, #64748b);
  opacity: 0.55;
  cursor: not-allowed;
}
.mc-act:active {
  background: var(--brand-soft, #e8eef8);
}
.mc-info {
  margin: 0;
  border-top: 1px solid var(--line-2, #eef1f6);
}
.mc-info__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line-2, #eef1f6);
  font-size: 13.5px;
}
.mc-info__row dt {
  flex: 0 0 40%;
  color: var(--ink-4, #64748b);
}
.mc-info__row dd {
  flex: 1 1 auto;
  margin: 0;
  color: var(--ink, #101e34);
  font-weight: 500;
  word-break: break-word;
}
.mc-info__row--col {
  flex-direction: column;
  gap: 4px;
  border-bottom: 0;
}
.mc-info__row--col dd {
  font-weight: 400;
  white-space: pre-wrap;
}
.mc-sheet-link {
  display: block;
  width: 100%;
  padding: 10px 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand, #2151a1);
  text-decoration: none;
}
</style>
