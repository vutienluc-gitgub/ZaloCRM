// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import { computed, ref } from 'vue';

/**
 * use-mobile — trạng thái thiết bị dùng chung cho shell mobile.
 *
 * Mobile 2026-10-29 (P0):
 *  - `keyboardHeight` / `--kb`: bàn phím ảo (iOS Safari không resize layout viewport
 *    → phải trừ chiều cao visualViewport thủ công, nếu không composer bị đẩy ra ngoài).
 *  - `viewportHeight` / `--vvh`: chiều cao visual viewport thật (dùng cho 100dvh fallback).
 *  - Nghe thêm `orientationchange` + `visualViewport.resize/scroll` (trước chỉ `resize`).
 */
const MOBILE_BREAKPOINT = 768;
/** Dưới ngưỡng này coi là thanh địa chỉ / safe-area động, KHÔNG phải bàn phím. */
const KEYBOARD_MIN = 120;

const isMobile = ref(false);
const isOnline = ref(true);
const keyboardHeight = ref(0);
const viewportHeight = ref(0);

let initialized = false;

function updateMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
}

function updateOnline() {
  isOnline.value = navigator.onLine;
}

function updateViewport() {
  const vv = window.visualViewport;
  const layoutH = window.innerHeight;
  const vvH = vv ? vv.height : layoutH;
  // Pinch-zoom làm vv.height nhỏ đi → đừng nhầm thành bàn phím.
  const zoomed = !!vv && vv.scale > 1.01;
  const raw = zoomed ? 0 : Math.max(0, layoutH - vvH);
  const kb = raw > KEYBOARD_MIN ? Math.round(raw) : 0;

  keyboardHeight.value = kb;
  viewportHeight.value = Math.round(vvH);

  const root = document.documentElement;
  root.style.setProperty('--kb', `${kb}px`);
  root.style.setProperty('--vvh', `${viewportHeight.value}px`);
}

function onOrientationChange() {
  // Safari cập nhật kích thước SAU event orientationchange.
  window.setTimeout(() => {
    updateMobile();
    updateViewport();
  }, 120);
}

export function useMobile() {
  if (!initialized) {
    initialized = true;
    if (typeof window !== 'undefined') {
      updateMobile();
      updateOnline();
      updateViewport();

      window.addEventListener('resize', updateMobile, { passive: true });
      window.addEventListener('orientationchange', onOrientationChange, { passive: true });
      window.addEventListener('online', updateOnline);
      window.addEventListener('offline', updateOnline);

      const vv = window.visualViewport;
      if (vv) {
        vv.addEventListener('resize', updateViewport, { passive: true });
        vv.addEventListener('scroll', updateViewport, { passive: true });
      }
    }
  }

  const isKeyboardOpen = computed(() => keyboardHeight.value > 0);

  return { isMobile, isOnline, keyboardHeight, viewportHeight, isKeyboardOpen };
}
