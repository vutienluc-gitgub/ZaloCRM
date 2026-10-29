// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
/**
 * use-virtual-window — cửa sổ hoá danh sách dài cho mobile.
 *
 * Danh sách mobile nằm trong `.m-main` (scroll của layout, không phải scroll riêng),
 * nên không thể dùng virtualization kiểu "container tự cuộn". Composable này:
 *  - tìm scroll container gần nhất (hoặc window),
 *  - đo vị trí danh sách so với container,
 *  - chỉ trả về [start, end) của các dòng cần render + chiều cao spacer 2 đầu.
 *
 * Yêu cầu: chiều cao mỗi dòng CỐ ĐỊNH (itemHeight). Dưới `threshold` dòng thì
 * render toàn bộ để giữ DOM/transition đơn giản.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';

export interface UseVirtualWindowOptions {
  /** Phần tử bao ngoài danh sách (điểm neo để đo offset). */
  root: Ref<HTMLElement | null>;
  /** Tổng số dòng. */
  count: Ref<number> | ComputedRef<number>;
  /** Chiều cao 1 dòng (px), gồm cả border/gap. */
  itemHeight: number;
  /** Số dòng render thêm trên/dưới viewport. */
  overscan?: number;
  /** Từ số dòng này trở lên mới windowing. */
  threshold?: number;
}

const SCROLL_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

function findScroller(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    if (SCROLL_OVERFLOW.has(cs.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

export function useVirtualWindow(opts: UseVirtualWindowOptions) {
  const { root, count, itemHeight, overscan = 6, threshold = 60 } = opts;

  const start = ref(0);
  const end = ref(count.value);
  const padTop = ref(0);
  const padBottom = ref(0);

  const isVirtual = computed(() => count.value > threshold);

  let scroller: HTMLElement | null = null;
  let raf = 0;
  let resizeObs: ResizeObserver | null = null;

  function recalc() {
    raf = 0;
    const rootEl = root.value;
    const total = count.value;

    if (!rootEl || total <= threshold) {
      start.value = 0;
      end.value = total;
      padTop.value = 0;
      padBottom.value = 0;
      return;
    }

    // Danh sách có thể render SAU khi mount (fetch xong) → lúc attach chưa có
    // scroll container. Dò lại ở đây để không dính listener vào window.
    if (!scroller || !scroller.isConnected) {
      const found = findScroller(rootEl);
      if (found !== scroller) {
        (scroller ?? window).removeEventListener('scroll', schedule);
        scroller = found;
        (scroller ?? window).addEventListener('scroll', schedule, { passive: true });
      }
    }

    const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
    const viewportH = scroller ? scroller.clientHeight : window.innerHeight;
    const rootRect = rootEl.getBoundingClientRect();
    const listTop = scroller
      ? rootRect.top - scroller.getBoundingClientRect().top + scrollTop
      : rootRect.top + scrollTop;

    const viewTop = scrollTop - listTop;
    const first = Math.floor(Math.max(0, viewTop) / itemHeight) - overscan;
    const last = Math.ceil((viewTop + viewportH) / itemHeight) + overscan;

    const s = Math.max(0, Math.min(total, first));
    const e = Math.max(s, Math.min(total, last));

    if (s !== start.value) start.value = s;
    if (e !== end.value) end.value = e;
    padTop.value = s * itemHeight;
    padBottom.value = (total - e) * itemHeight;
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(recalc);
  }

  function attach() {
    detach();
    scroller = findScroller(root.value);
    (scroller ?? window).addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    if (root.value && typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(schedule);
      resizeObs.observe(root.value);
    }
    recalc();
  }

  function detach() {
    (scroller ?? window).removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    resizeObs?.disconnect();
    resizeObs = null;
    scroller = null;
  }

  onMounted(() => nextTick(attach));
  onBeforeUnmount(() => {
    if (raf) cancelAnimationFrame(raf);
    detach();
  });

  watch(count, schedule);
  watch(root, () => nextTick(attach));

  return {
    start,
    end,
    padTop,
    padBottom,
    isVirtual,
    update: schedule,
  };
}
