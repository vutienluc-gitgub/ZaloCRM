<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <Teleport to="body">
    <Transition name="msheet">
      <div v-if="modelValue" class="msheet" role="dialog" aria-modal="true" :aria-label="title">
        <div class="msheet__backdrop" @click="onBackdrop" />
        <section class="msheet__panel" :style="panelStyle" role="document">
          <div
            class="msheet__grip"
            @touchstart.passive="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <span />
          </div>

          <header v-if="title || $slots.header" class="msheet__head">
            <slot name="header">
              <h2 class="msheet__title">{{ title }}</h2>
            </slot>
            <button type="button" class="msheet__x" aria-label="Đóng" @click="close">
              <v-icon icon="mdi-close" size="20" />
            </button>
          </header>

          <div class="msheet__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="msheet__foot">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    /** Chiều cao tối đa — mặc định 90% viewport động. */
    maxHeight?: string;
    closeOnBackdrop?: boolean;
  }>(),
  { title: '', maxHeight: '90dvh', closeOnBackdrop: true },
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const dragY = ref(0);
const dragging = ref(false);
let dragStart = 0;
let prevBodyOverflow = '';
let bodyLocked = false;

const panelStyle = computed(() => ({
  maxHeight: props.maxHeight,
  transform: dragY.value > 0 ? `translateY(${dragY.value}px)` : undefined,
  transition: dragging.value ? 'none' : 'transform 180ms cubic-bezier(.2,.8,.2,1)',
}));

function close() {
  emit('update:modelValue', false);
}

function onBackdrop() {
  if (props.closeOnBackdrop) close();
}

// ── Drag-to-close (chỉ ở tay nắm) ──────────────────────────────────────────
function onTouchStart(e: TouchEvent) {
  dragging.value = true;
  dragStart = e.touches[0]?.clientY ?? 0;
}
function onTouchMove(e: TouchEvent) {
  if (!dragging.value) return;
  const y = e.touches[0]?.clientY ?? dragStart;
  dragY.value = Math.max(0, y - dragStart);
}
function onTouchEnd() {
  if (!dragging.value) return;
  dragging.value = false;
  if (dragY.value > 96) close();
  else dragY.value = 0;
}

// ── Body scroll lock + Esc ─────────────────────────────────────────────────
function lockBody() {
  if (bodyLocked) return;
  bodyLocked = true;
  prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onKeydown);
}
function unlockBody() {
  if (!bodyLocked) return;
  bodyLocked = false;
  document.body.style.overflow = prevBodyOverflow;
  window.removeEventListener('keydown', onKeydown);
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) lockBody();
    else {
      dragY.value = 0;
      unlockBody();
    }
  },
  { immediate: true },
);

onBeforeUnmount(unlockBody);
</script>

<style scoped>
.msheet {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.msheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(16, 30, 52, 0.42);
}
.msheet__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--surface, #fff);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -10px 40px rgba(16, 30, 52, 0.18);
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  will-change: transform;
}
.msheet__grip {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}
.msheet__grip span {
  display: block;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--line, #e2e8f0);
}
.msheet__head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 8px 16px;
}
.msheet__title {
  flex: 1 1 auto;
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  color: var(--ink, #101e34);
}
.msheet__x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ink-3, #475569);
  cursor: pointer;
}
.msheet__x:active {
  background: var(--surface-3, #f4f6f8);
}
.msheet__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 0 16px 16px;
}
.msheet__foot {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--line-2, #eef1f6);
  background: var(--surface, #fff);
}

/* ── Transition ──────────────────────────────────────────────────────── */
.msheet-enter-active,
.msheet-leave-active {
  transition: opacity 180ms ease;
}
.msheet-enter-active .msheet__panel,
.msheet-leave-active .msheet__panel {
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.msheet-enter-from,
.msheet-leave-to {
  opacity: 0;
}
.msheet-enter-from .msheet__panel,
.msheet-leave-to .msheet__panel {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .msheet-enter-active,
  .msheet-leave-active,
  .msheet-enter-active .msheet__panel,
  .msheet-leave-active .msheet__panel {
    transition: none;
  }
}
</style>
