<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div class="snp" :class="{ 'is-mobile': mobile }">
    <header v-if="showHeader" class="snp-header">
      <h1 class="snp-title">
        <v-icon class="snp-title__icon" icon="mdi-cog-outline" size="20" />
        <span>Cài đặt</span>
      </h1>
    </header>

    <div class="snp-search">
      <v-icon class="snp-search__ic" icon="mdi-magnify" size="16" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Tìm cài đặt..."
        aria-label="Tìm cài đặt"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="snp-search__clear"
        aria-label="Xoá tìm kiếm"
        @click="searchQuery = ''"
      >
        ✕
      </button>
    </div>

    <nav class="snp-nav" :aria-label="searchQuery ? 'Kết quả tìm kiếm' : 'Cài đặt'">
      <div v-if="searchQuery" class="snp-search-results">
        <div v-if="searchResults.length === 0" class="snp-empty">
          Không tìm thấy "{{ searchQuery }}"
        </div>
        <RouterLink
          v-for="item in searchResults"
          :key="`sr-${item.route}`"
          :to="item.route"
          class="snp-item"
          :class="{ active: isItemActive(item.route) }"
          @click="emit('navigate', item.route)"
        >
          <v-icon class="snp-item__icon" :icon="item.icon" size="18" />
          <span class="snp-item__label">{{ item.label }}</span>
          <span v-if="item.comingSoon" class="snp-lock" title="Sắp ra mắt">🔒</span>
        </RouterLink>
      </div>

      <div v-else>
        <div v-for="group in visibleGroups" :key="group.id" class="snp-group">
          <button
            type="button"
            class="snp-group__header"
            :class="{ collapsed: !openGroups[group.id] }"
            @click="toggleGroup(group.id)"
          >
            <v-icon class="snp-group__icon" :icon="group.icon" size="17" />
            <span class="snp-group__label">{{ group.label }}</span>
            <span class="snp-chevron">▾</span>
          </button>
          <div v-if="openGroups[group.id]" class="snp-group__body">
            <RouterLink
              v-for="item in group.items"
              :key="item.route"
              :to="item.route"
              class="snp-item"
              :class="{ active: isItemActive(item.route) }"
              @click="emit('navigate', item.route)"
            >
              <v-icon class="snp-item__icon" :icon="item.icon" size="18" />
              <span class="snp-item__label">{{ item.label }}</span>
              <span v-if="item.comingSoon" class="snp-lock" title="Sắp ra mắt">🔒</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSettingsNav } from '@/composables/use-settings-nav';

withDefaults(
  defineProps<{
    /** Hiện tiêu đề "Cài đặt" (sidebar desktop). */
    showHeader?: boolean;
    /** Touch target lớn hơn cho bottom sheet / trang mobile. */
    mobile?: boolean;
  }>(),
  { showHeader: false, mobile: false },
);

const emit = defineEmits<{ navigate: [route: string] }>();

const route = useRoute();
const { visibleGroups, activeItem, searchItems } = useSettingsNav();

// Active class — hỗ trợ entry có query (vd /settings/channels/zalo?tab=internal-contact).
function isItemActive(itemRoute: string): boolean {
  const [itemPath, itemQuery] = itemRoute.split('?');
  if (itemPath !== route.path) return false;
  if (!itemQuery) {
    const currentTab = route.query.tab as string | undefined;
    return !currentTab;
  }
  const expected = new URLSearchParams(itemQuery).get('tab');
  return expected === (route.query.tab as string | undefined);
}

const searchQuery = ref('');
const searchResults = computed(() => searchItems(searchQuery.value));

const SECTION_KEY_PREFIX = 'settings-nav.group.';
function loadGroupState(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const g of visibleGroups.value) {
    const raw = localStorage.getItem(SECTION_KEY_PREFIX + g.id);
    const defaultOpen = g.id !== 'dev';
    result[g.id] = raw === null ? defaultOpen : raw === '1';
  }
  return result;
}
const openGroups = reactive<Record<string, boolean>>(loadGroupState());

function toggleGroup(id: string) {
  openGroups[id] = !openGroups[id];
  localStorage.setItem(SECTION_KEY_PREFIX + id, openGroups[id] ? '1' : '0');
}

// Mở nhóm chứa mục đang xem.
watch(
  activeItem,
  (info) => {
    if (info) openGroups[info.group.id] = true;
  },
  { immediate: true },
);

// Role tải sau khi login → bổ sung group mới vào state.
watch(visibleGroups, (groups) => {
  for (const g of groups) {
    if (!(g.id in openGroups)) {
      const raw = localStorage.getItem(SECTION_KEY_PREFIX + g.id);
      const defaultOpen = g.id !== 'dev';
      openGroups[g.id] = raw === null ? defaultOpen : raw === '1';
    }
  }
});
</script>

<style scoped>
.snp {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
}

.snp-header {
  padding: 16px 18px 12px;
  border-bottom: 1px solid #e4e5e9;
  flex-shrink: 0;
}
.snp-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
}
.snp-title__icon {
  font-size: 16px;
}

.snp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #e4e5e9;
  background: #fff;
  flex-shrink: 0;
}
.snp-search__ic {
  color: #97a0ac;
  font-size: 13px;
}
.snp-search input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  outline: none;
  background: #f4f4f7;
  color: #1f2d3d;
  font-family: inherit;
  font-size: 12.5px;
}
.snp-search input:focus {
  background: #fff;
  border-color: #5e6ad2;
  box-shadow: 0 0 0 2px rgba(94, 106, 210, 0.12);
}
.snp-search__clear {
  padding: 4px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #97a0ac;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
}
.snp-search__clear:hover {
  color: #ef4444;
  background: #fef2f2;
}

.snp-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 6px 16px;
}
.snp-nav::-webkit-scrollbar {
  width: 5px;
}
.snp-nav::-webkit-scrollbar-thumb {
  background: #d4d6db;
  border-radius: 2px;
}

.snp-group {
  margin-bottom: 4px;
}
.snp-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  user-select: none;
}
.snp-group__header:hover {
  background: #f4f4f7;
}
.snp-group__icon {
  font-size: 13px;
  flex-shrink: 0;
}
.snp-group__label {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: #6b7785;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.snp-chevron {
  color: #97a0ac;
  font-size: 10px;
  transition: transform 0.15s;
}
.snp-group__header.collapsed .snp-chevron {
  transform: rotate(-90deg);
}
.snp-group__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0 6px 8px;
}
.snp-search-results {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.snp-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 6px;
  color: #1f2d3d;
  font-size: 12.5px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.snp-item:hover {
  background: #f4f4f7;
}
.snp-item.active,
.snp-item.router-link-exact-active {
  background: #eef0ff;
  color: #5e6ad2;
  font-weight: 600;
  box-shadow: inset 3px 0 0 #5e6ad2;
}
.snp-item__icon {
  font-size: 14px;
  flex-shrink: 0;
}
.snp-item__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.snp-lock {
  flex-shrink: 0;
  font-size: 11px;
  opacity: 0.6;
}
.snp-empty {
  padding: 20px 14px;
  color: #97a0ac;
  font-size: 12px;
  font-style: italic;
  text-align: center;
}

/* ── Mobile: vùng chạm lớn, không tự cuộn (sheet/trang đã cuộn) ── */
.snp.is-mobile {
  height: auto;
  min-height: 0;
}
.snp.is-mobile .snp-search {
  padding: 4px 0 10px;
  border-bottom: 1px solid #eef1f6;
  background: transparent;
}
.snp.is-mobile .snp-search input {
  min-height: 44px;
  padding: 10px 12px;
  font-size: 14px;
}
.snp.is-mobile .snp-search__clear {
  width: 44px;
  height: 44px;
  font-size: 13px;
}
.snp.is-mobile .snp-nav {
  overflow: visible;
  padding: 6px 0 8px;
}
.snp.is-mobile .snp-group__header {
  min-height: 44px;
  padding: 10px 8px;
}
.snp.is-mobile .snp-group__label {
  font-size: 11.5px;
}
.snp.is-mobile .snp-group__body {
  gap: 0;
  padding: 0 0 6px;
}
.snp.is-mobile .snp-item {
  gap: 12px;
  min-height: 48px;
  padding: 12px 10px;
  border-radius: 10px;
  font-size: 14.5px;
}
.snp.is-mobile .snp-item__icon {
  font-size: 18px;
}
.snp.is-mobile .snp-item.active,
.snp.is-mobile .snp-item.router-link-exact-active {
  box-shadow: inset 3px 0 0 #5e6ad2;
}
.snp.is-mobile .snp-search-results {
  gap: 0;
}
</style>
