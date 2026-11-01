<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div v-if="count > 0" class="bulk-bar">
    <span class="count">{{ count }}</span>
    <span>đã chọn</span>
    <button @click="$emit('msg-batch')">
      <MessageSquare :size="13" class="btn-icon" /> Nhắn hàng loạt
    </button>
    <button @click="$emit('tag')">
      <Tag :size="13" class="btn-icon" /> Gắn tag
    </button>
    <button @click="$emit('change-status')">
      <Calendar :size="13" class="btn-icon" /> Đổi trạng thái
    </button>
    <button @click="$emit('export')">
      <Download :size="13" class="btn-icon" /> Xuất
    </button>
    <button class="clear-btn" @click="$emit('clear')">
      <X :size="13" class="btn-icon" /> Bỏ chọn
    </button>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare, Tag, Calendar, Download, X } from 'lucide-vue-next';

defineProps<{
  count: number;
}>();

defineEmits<{
  (e: 'msg-batch'): void;
  (e: 'tag'): void;
  (e: 'change-status'): void;
  (e: 'export'): void;
  (e: 'clear'): void;
}>();
</script>

<style scoped>
.bulk-bar {
  padding: 8px 20px;
  background: var(--brand);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  animation: slideDown .15s ease;
  flex-wrap: wrap;
}
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.bulk-bar .count { font-weight: 700; }
.bulk-bar button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.2);
  color: #fff;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: background .12s;
}
.bulk-bar button:hover { background: rgba(255,255,255,.2); }
.bulk-bar .btn-icon { flex-shrink: 0; }
.bulk-bar .clear-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  opacity: .85;
}
.bulk-bar .clear-btn:hover { background: rgba(255,255,255,.15); opacity: 1; }
</style>
