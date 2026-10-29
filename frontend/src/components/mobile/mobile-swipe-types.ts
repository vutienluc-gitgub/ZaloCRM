// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc

/** Một thao tác trong ngăn kéo vuốt của MobileSwipeRow. */
export interface SwipeAction {
  key: string;
  label: string;
  icon: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
}
