<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div v-if="hints.length" class="smart-hints">
    <div class="hint-row">
      <button
        v-for="h in hints"
        :key="h.key"
        class="hint-chip"
        :class="h.kind"
        @click="$emit('apply', h)"
      >
        <component :is="h.iconComponent" :size="13" class="hint-icon" />
        <span>{{ h.label }}</span>
        <ArrowRight :size="12" class="arrow-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { AlertTriangle, CheckCircle2, Flame, Lightbulb, ArrowRight } from 'lucide-vue-next';
import type { DbFriend } from '@/composables/use-friends';

export type HintKey = 'silent7d' | 'newThisWeek' | 'hotPending' | 'aliasDup';
export interface SmartHint {
  key: HintKey;
  label: string;
  iconComponent: Component;
  kind: 'warn' | 'success' | 'danger' | 'info';
}

const props = defineProps<{
  friends: DbFriend[];
}>();

defineEmits<{
  (e: 'apply', hint: SmartHint): void;
}>();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const hints = computed<SmartHint[]>(() => {
  if (!props.friends.length) return [];
  const list: SmartHint[] = [];
  const now = Date.now();

  const silent = props.friends.filter(f => {
    if (!f.lastInteractionAt) return false;
    return now - new Date(f.lastInteractionAt).getTime() >= SEVEN_DAYS_MS;
  }).length;
  if (silent > 0) {
    list.push({
      key: 'silent7d',
      label: `${silent} KH chưa nhắn ≥7 ngày — risk lạnh`,
      iconComponent: AlertTriangle,
      kind: 'warn',
    });
  }

  const newKB = props.friends.filter(f => {
    if (!f.becameFriendAt) return false;
    return now - new Date(f.becameFriendAt).getTime() <= SEVEN_DAYS_MS;
  }).length;
  if (newKB > 0) {
    list.push({
      key: 'newThisWeek',
      label: `${newKB} KH mới kết bạn tuần này`,
      iconComponent: CheckCircle2,
      kind: 'success',
    });
  }

  const hot = props.friends.filter(f => f.statusRef?.name?.toLowerCase().includes('nóng') || f.statusRef?.name?.toLowerCase() === 'hot').length;
  if (hot > 0) {
    list.push({
      key: 'hotPending',
      label: `${hot} KH đang "Nóng" cần follow gấp`,
      iconComponent: Flame,
      kind: 'danger',
    });
  }

  // Alias duplicate detection — same alias trên nhiều pair
  const aliasMap = new Map<string, number>();
  props.friends.forEach(f => {
    if (f.aliasInNick) aliasMap.set(f.aliasInNick, (aliasMap.get(f.aliasInNick) || 0) + 1);
  });
  const dupAlias = [...aliasMap.values()].filter(c => c > 1).length;
  if (dupAlias > 0) {
    list.push({
      key: 'aliasDup',
      label: `${dupAlias} alias trùng — gợi ý merge`,
      iconComponent: Lightbulb,
      kind: 'info',
    });
  }

  return list;
});
</script>

<style scoped>
.smart-hints {
  padding: 8px 20px 0;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.hint-row {
  display: flex;
  gap: 8px;
  padding: 0 0 10px;
  flex-wrap: wrap;
}
.hint-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--warning-soft);
  color: var(--warning);
  border: 1px solid var(--warning);
  padding: 4px 10px;
  border-radius: var(--r-pill);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.hint-chip:hover {
  filter: brightness(0.96);
}
.hint-chip.success {
  background: var(--success-soft);
  color: var(--success);
  border-color: var(--success);
}
.hint-chip.danger {
  background: var(--error-soft);
  color: var(--error);
  border-color: var(--error);
}
.hint-chip.info {
  background: var(--brand-soft);
  color: var(--brand);
  border-color: var(--brand);
}
.hint-icon {
  flex-shrink: 0;
}
.arrow-icon {
  opacity: .6;
  margin-left: 2px;
  flex-shrink: 0;
}
</style>
