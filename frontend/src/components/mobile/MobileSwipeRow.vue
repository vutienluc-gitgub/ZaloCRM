<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- MobileSwipeRow 2026-10-29 (P1):
       Bọc 1 dòng danh sách mobile, vuốt sang trái để lộ tối đa 3 thao tác nhanh.
       - Chỉ bắt đầu kéo khi |dx| > |dy| → không giành scroll dọc của trang.
       - Mỗi lúc chỉ 1 dòng mở (OPEN_UID dùng chung toàn module).
       - Dòng đang mở: chạm vào nội dung = đóng, không kích hoạt click của row. -->
  <div ref="rootRef" class="msw" :class="{ 'is-open': isOpen, 'is-dragging': dragging }">
    <div class="msw__actions" :style="{ width: `${actionsWidth}px` }">
      <button
        v-for="a in actions"
        :key="a.key"
        type="button"
        class="msw__act"
        :class="`msw__act--${a.tone || 'primary'}`"
        :disabled="a.disabled"
        :tabindex="isOpen ? 0 : -1"
        :aria-label="a.label"
        @click.stop="onAction(a)"
      >
        <v-icon :icon="a.icon" size="20" />
        <span class="msw__lb">{{ a.label }}</span>
      </button>
    </div>

    <div
      class="msw__content"
      :style="contentStyle"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @click.capture="onContentClick"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SwipeAction } from './mobile-swipe-types';

const props = withDefaults(
  defineProps<{
    actions: SwipeAction[];
    /** Tắt vuốt (vd đang tải / dòng không có thao tác). */
    disabled?: boolean;
    /** Chiều rộng mỗi nút thao tác (px). */
    actionWidth?: number;
  }>(),
  { disabled: false, actionWidth: 68 },
);

const emit = defineEmits<{ action: [key: string] }>();

/** uid của dòng đang mở — dùng chung để mở dòng này thì đóng dòng khác. */
let seq = 0;
const OPEN_UID = ref<number | null>(null);
const uid = (seq += 1);

const rootRef = ref<HTMLElement | null>(null);
const offset = ref(0);
const dragging = ref(false);

const actionsWidth = computed(() => props.actions.length * props.actionWidth);
const isOpen = computed(() => offset.value > 0);

const contentStyle = computed(() => ({
  transform: `translateX(${-offset.value}px)`,
  transition: dragging.value ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.25, 1)',
}));

watch(OPEN_UID, (open) => {
  if (open !== uid && offset.value !== 0) {
    dragging.value = false;
    offset.value = 0;
  }
});

// ── Gestures ─────────────────────────────────────────────────────────────
let startX = 0;
let startY = 0;
let startOffset = 0;
let axis: 'none' | 'x' | 'y' = 'none';

function reset() {
  axis = 'none';
  dragging.value = false;
}

function onTouchStart(e: TouchEvent) {
  if (props.disabled || props.actions.length === 0 || e.touches.length !== 1) return;
  const t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
  startOffset = offset.value;
  axis = 'none';
  dragging.value = offset.value > 0;
}

function onTouchMove(e: TouchEvent) {
  if (props.disabled || props.actions.length === 0) return;
  if (axis === 'y' || e.touches.length !== 1) return;

  const t = e.touches[0];
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;

  if (axis === 'none') {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    // Ngang phải trội hơn dọc rõ rệt mới nhận — tránh cướp thao tác cuộn.
    axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (axis === 'y') return;
    dragging.value = true;
  }

  if (axis !== 'x') return;
  if (e.cancelable) e.preventDefault();

  const max = actionsWidth.value;
  const next = Math.max(0, Math.min(max, startOffset - dx));
  offset.value = next;
  if (next > 0) OPEN_UID.value = uid;
}

function onTouchEnd() {
  if (axis !== 'x') {
    reset();
    return;
  }
  const max = actionsWidth.value;
  const open = offset.value > max * 0.4;
  dragging.value = false;
  offset.value = open ? max : 0;
  if (open) OPEN_UID.value = uid;
  else if (OPEN_UID.value === uid) OPEN_UID.value = null;
  reset();
}

/** Dòng đang mở: chạm nội dung chỉ để đóng, không mở chi tiết. */
function onContentClick(e: MouseEvent) {
  if (!isOpen.value) return;
  e.preventDefault();
  e.stopPropagation();
  close();
}

function close() {
  offset.value = 0;
  if (OPEN_UID.value === uid) OPEN_UID.value = null;
}

function onAction(a: SwipeAction) {
  if (a.disabled) return;
  close();
  emit('action', a.key);
}

// Chạm ra ngoài → đóng dòng đang mở.
function onDocPointerDown(e: Event) {
  if (OPEN_UID.value !== uid) return;
  const target = e.target as Node | null;
  if (target && rootRef.value && !rootRef.value.contains(target)) close();
}

onMounted(() => document.addEventListener('touchstart', onDocPointerDown, { passive: true }));
onBeforeUnmount(() => document.removeEventListener('touchstart', onDocPointerDown));

// Dòng bị unmount khi đang mở → nhả khoá để dòng khác mở được.
onBeforeUnmount(() => {
  if (OPEN_UID.value === uid) OPEN_UID.value = null;
});

defineExpose({ close });
</script>

<style scoped>
.msw {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
.msw__actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  height: 100%;
  /* Ẩn hẳn khi đóng: tránh lộ 1px màu nút ở mép dòng lúc cuộn (subpixel). */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s linear;
}
.msw.is-open .msw__actions,
.msw.is-dragging .msw__actions {
  opacity: 1;
  pointer-events: auto;
}
.msw__act {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 68px;
  padding: 0;
  border: 0;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.msw__act--primary {
  background: var(--brand, #2151a1);
}
.msw__act--success {
  background: #15803d;
}
.msw__act--warning {
  background: #b45309;
}
.msw__act--danger {
  background: #b91c1c;
}
.msw__act:disabled {
  opacity: 0.55;
}
.msw__act:active {
  filter: brightness(0.92);
}
.msw__lb {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.msw__content {
  position: relative;
  z-index: 1;
  /* pan-y: cho phép cuộn dọc, JS xử lý kéo ngang. */
  touch-action: pan-y;
  background: var(--surface, #fff);
}
.msw.is-open .msw__content {
  box-shadow: 4px 0 12px rgba(16, 30, 52, 0.08);
}
@media (prefers-reduced-motion: reduce) {
  .msw__content {
    transition: none !important;
  }
}
</style>
