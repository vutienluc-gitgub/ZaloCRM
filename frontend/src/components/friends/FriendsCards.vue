<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <div class="friends-cards-wrap">
    <!-- Loading skeleton state -->
    <div v-if="loading" class="cards-skeleton">
      <div v-for="i in 4" :key="i" class="card-skel">
        <div class="skel-top">
          <div class="skel-av shimmer" />
          <div class="skel-info">
            <div class="skel-line w-60 shimmer" />
            <div class="skel-line w-40 shimmer" />
          </div>
          <div class="skel-badge shimmer" />
        </div>
        <div class="skel-mid">
          <div class="skel-line w-80 shimmer" />
        </div>
        <div class="skel-actions">
          <div class="skel-btn shimmer" />
          <div class="skel-btn shimmer" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!friends.length" class="cards-empty">
      <div class="empty-icon-wrap">
        <v-icon icon="mdi-account-search-outline" size="36" class="empty-icon" />
      </div>
      <p class="empty-title">Không tìm thấy bạn bè nào</p>
      <p class="empty-sub">Thử đổi bộ lọc, tìm kiếm theo tên hoặc nick khác</p>
    </div>

    <!-- Cards list -->
    <div v-else class="cards-list">
      <article
        v-for="f in friends"
        :key="f.id"
        class="friend-card"
        :class="{ selected: selected.has(f.id) }"
        @click="$emit('open-detail', f)"
      >
        <!-- Header row: Select + Avatar + Name + Badges -->
        <div class="card-header">
          <label class="cb-wrap" @click.stop>
            <input
              type="checkbox"
              :checked="selected.has(f.id)"
              @change="onToggleRow(f.id)"
            />
          </label>

          <div class="customer-av" :class="avatarBgClass(f)">
            <img
              v-if="f.zaloAvatarUrl || f.contact?.avatarUrl"
              :src="f.zaloAvatarUrl || f.contact?.avatarUrl || ''"
              :alt="displayName(f)"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="onAvatarError($event)"
            />
            <span v-else>{{ initials(displayName(f)) }}</span>
          </div>

          <div class="customer-meta">
            <div class="customer-name-row">
              <span class="customer-name">{{ displayName(f) }}</span>
              <span v-if="f.aliasInNick" class="customer-alias">({{ f.aliasInNick }})</span>
            </div>
            <div class="customer-sub">
              <span v-if="f.zaloUidInNick" class="uid-tag">ID: {{ f.zaloUidInNick }}</span>
              <span v-if="f.contact?.phone" class="phone-text">
                <Phone :size="11" class="icon-inline" /> {{ f.contact.phone }}
              </span>
            </div>
          </div>

          <div class="card-badges">
            <span class="status-pill" :class="kbBadgeClass(f.relationshipKind || 'friend')">
              {{ kbBadgeLabel(f.relationshipKind || 'friend') }}
            </span>
            <span v-if="f.leadScore !== undefined && f.leadScore !== null" class="score-pill">
              {{ f.leadScore }} đ
            </span>
          </div>
        </div>

        <!-- Care info row -->
        <div class="card-care-row">
          <div v-if="f.zaloAccount" class="nick-tag">
            <span class="nick-dot" :class="saleBgClass(f.zaloAccount.id || '')" />
            <span class="nick-label">Nick chăm:</span>
            <span class="nick-val">{{ f.zaloAccount.displayName || 'Nick' }}</span>
          </div>

          <div v-if="f.stuckSince" class="stuck-tag">
            <AlertTriangle :size="12" class="icon-inline text-warning" />
            <span>Đình trệ {{ stuckDaysLabel(f.stuckSince) }}</span>
          </div>
          <div v-else-if="silentDays(f) >= 7" class="silent-tag">
            <VolumeX :size="12" class="icon-inline text-danger" />
            <span>Im lặng {{ silentDays(f) }}d</span>
          </div>
          <div v-else-if="f.becameFriendAt" class="date-tag">
            <Clock :size="11" class="icon-inline" />
            <span>KB: {{ relativeDate(f.becameFriendAt) }}</span>
          </div>
        </div>

        <!-- Tags row -->
        <div v-if="hasTags(f)" class="card-tags-row">
          <span
            v-for="t in getAutoTags(f)"
            :key="'at-' + t"
            class="tag-chip auto"
            :class="autoTagColor(t)"
          >
            <Bot :size="10" class="icon-inline" /> {{ autoTagLabel(t) }}
          </span>
          <span
            v-for="t in getCrmTags(f)"
            :key="'crm-' + t"
            class="tag-chip crm"
            :class="tagColor(t)"
          >
            {{ t }}
          </span>
          <span
            v-for="l in getZaloLabels(f)"
            :key="'zlb-' + l.name"
            class="tag-chip zalo"
            :style="l.color ? { background: hexAlpha(l.color, 0.16), color: l.color, borderColor: hexAlpha(l.color, 0.3) } : {}"
          >
            <Tag :size="10" class="icon-inline" /> {{ l.name }}
          </span>
        </div>

        <!-- Action row: 1-tap touch targets -->
        <div class="card-actions" @click.stop>
          <button class="act-btn primary" @click="$emit('open-chat', f)">
            <MessageSquare :size="14" />
            <span>Nhắn Zalo</span>
          </button>
          <button v-if="f.contact?.phone" class="act-btn call" @click="$emit('call', f)">
            <Phone :size="14" />
            <span>Gọi</span>
          </button>
          <button class="act-btn" @click="$emit('open-contact', f)">
            <User :size="14" />
            <span>Hồ sơ</span>
          </button>
          <button class="act-btn detail-btn" title="Xem chi tiết" @click="$emit('open-detail', f)">
            <ChevronRight :size="16" />
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare, Phone, User, Clock, AlertTriangle, VolumeX, Bot, Tag, ChevronRight } from 'lucide-vue-next';
import type { DbFriend } from '@/composables/use-friends';

const props = defineProps<{
  friends: DbFriend[];
  loading?: boolean;
  selected: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'update:selected', s: Set<string>): void;
  (e: 'open-detail', f: DbFriend): void;
  (e: 'open-chat', f: DbFriend): void;
  (e: 'call', f: DbFriend): void;
  (e: 'open-contact', f: DbFriend): void;
}>();

function onToggleRow(id: string): void {
  const next = new Set(props.selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  emit('update:selected', next);
}

function displayName(f: DbFriend): string {
  return f.contact?.crmName || f.zaloDisplayName || f.contact?.fullName || '—';
}

function initials(name: string): string {
  if (!name || name === '—') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CUSTOMER_PALETTE = ['av-c1', 'av-c2', 'av-c3', 'av-c4', 'av-c5', 'av-c6', 'av-c7'];
function avatarBgClass(f: DbFriend): string {
  const id = f.contactId || f.id;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CUSTOMER_PALETTE[h % CUSTOMER_PALETTE.length];
}

const SALE_PALETTE = ['av-s1', 'av-s2', 'av-s3', 'av-s4', 'av-s5', 'av-s6', 'av-s7'];
function saleBgClass(accountId: string): string {
  if (!accountId) return SALE_PALETTE[0];
  let h = 0;
  for (let i = 0; i < accountId.length; i++) h = (h * 31 + accountId.charCodeAt(i)) >>> 0;
  return SALE_PALETTE[h % SALE_PALETTE.length];
}

function onAvatarError(e: Event): void {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('span')) {
    const span = document.createElement('span');
    span.textContent = '?';
    parent.appendChild(span);
  }
}

function kbBadgeClass(kind: string): string {
  const m: Record<string, string> = {
    none: 'stranger',
    friend: 'success',
    pending_friend: 'warn',
    chatting_stranger: 'info',
    ghost: 'grey',
  };
  return m[kind] ?? 'grey';
}

function kbBadgeLabel(kind: string): string {
  const m: Record<string, string> = {
    none: 'Người Lạ',
    friend: 'Đã KB',
    pending_friend: 'Đã mời',
    chatting_stranger: 'Nhắn lạ',
    ghost: 'Đã ngắt',
  };
  return m[kind] ?? '—';
}

function relativeDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays <= 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function stuckDaysLabel(since?: string | null): string {
  if (!since) return '';
  const d = Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
  return `${d}d`;
}

function silentDays(f: DbFriend): number {
  if (!f.lastInteractionAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(f.lastInteractionAt).getTime()) / 86400000));
}

function getAutoTags(f: DbFriend): string[] {
  return Array.isArray(f.autoTags) ? f.autoTags : [];
}

function autoTagLabel(t: string): string {
  return t;
}

function autoTagColor(t: string): string {
  const clean = t.toLowerCase();
  if (clean === 'active') return 'auto-active';
  if (clean === 'ready') return 'auto-ready';
  if (clean === 'rewarmed') return 'auto-rewarmed';
  if (clean === 'stuck') return 'auto-stuck';
  return 'auto-default';
}

function getCrmTags(f: DbFriend): string[] {
  const raw = f.crmTagsPerNick;
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === 'string');
}

function tagColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('vip') || lower.includes('nóng')) return 'red';
  if (lower.includes('thành công') || lower.includes('chốt')) return 'green';
  if (lower.includes('tiềm năng')) return 'blue';
  return 'default';
}

interface ZaloLabelLite { name?: string; color?: string }
function getZaloLabels(f: DbFriend): Array<{ name: string; color: string | null }> {
  const raw = f.zaloLabels;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is ZaloLabelLite => !!l && typeof l === 'object')
    .map((l) => ({ name: l.name || '', color: l.color || null }))
    .filter((l) => l.name.length > 0);
}

function hexAlpha(hex: string | null | undefined, alpha = 0.18): string {
  if (!hex) return 'rgba(90,100,120,0.10)';
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return 'rgba(90,100,120,0.10)';
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function hasTags(f: DbFriend): boolean {
  return getAutoTags(f).length > 0 || getCrmTags(f).length > 0 || getZaloLabels(f).length > 0;
}
</script>

<style scoped>
.friends-cards-wrap {
  padding: 10px 12px;
  background: var(--surface-2);
  min-height: 200px;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.friend-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md, 10px);
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(16, 30, 52, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
}
.friend-card:active {
  transform: scale(0.99);
}
.friend-card.selected {
  border-color: var(--brand);
  background: var(--brand-soft);
}

/* Header row */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cb-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.customer-av {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}
.customer-av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.customer-av::after {
  content: "";
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand, #2151a1);
  border: 1.5px solid var(--surface, #fff);
  z-index: 1;
}

.customer-meta {
  flex: 1;
  min-width: 0;
}
.customer-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.customer-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.customer-alias {
  font-size: 11.5px;
  color: var(--ink-4);
}
.customer-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  flex-wrap: wrap;
}
.uid-tag {
  font-family: var(--mono, monospace);
  font-size: 10px;
  color: var(--ink-3);
  background: var(--surface-3);
  padding: 1px 5px;
  border-radius: 4px;
}
.phone-text {
  font-size: 11px;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.card-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.status-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--r-pill);
}
.status-pill.success { background: var(--success-soft); color: var(--success); }
.status-pill.warn    { background: var(--warning-soft); color: var(--warning); }
.status-pill.info    { background: var(--brand-soft); color: var(--brand); }
.status-pill.stranger{ background: var(--surface-3); color: var(--ink-3); }
.status-pill.grey    { background: var(--surface-3); color: var(--ink-4); }

.score-pill {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--brand);
}

/* Care info row */
.card-care-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  color: var(--ink-3);
  padding: 4px 0;
  border-top: 1px dashed var(--line);
  flex-wrap: wrap;
}
.nick-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.nick-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.nick-label { color: var(--ink-4); font-size: 11px; }
.nick-val { font-weight: 600; color: var(--ink-2); }

.stuck-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--warning);
  font-weight: 600;
}
.silent-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--error);
  font-weight: 600;
}
.date-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ink-4);
}

/* Tags row */
.card-tags-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.tag-chip {
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid transparent;
}
.tag-chip.auto { border-radius: 10px; font-weight: 600; }
.auto-active   { background: var(--success-soft); color: var(--success); }
.auto-ready    { background: var(--warning-soft); color: var(--warning); }
.auto-rewarmed { background: var(--brand-soft); color: var(--brand); }
.auto-stuck    { background: var(--error-soft); color: var(--error); }
.auto-default  { background: var(--surface-3); color: var(--ink-3); }

.tag-chip.crm { background: var(--surface-3); color: var(--ink-2); border-color: var(--line); }
.tag-chip.crm.red { background: var(--error-soft); color: var(--error); }
.tag-chip.crm.green { background: var(--success-soft); color: var(--success); }
.tag-chip.crm.blue { background: var(--brand-soft); color: var(--brand); }

.tag-chip.zalo { font-size: 10px; }

/* Actions row */
.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.act-btn {
  flex: 1;
  min-height: 38px;
  padding: 6px 10px;
  border-radius: var(--r-sm, 7px);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.act-btn:hover { background: var(--surface-2); }
.act-btn.primary {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}
.act-btn.primary:hover { background: var(--brand-600); }
.act-btn.call {
  background: var(--success-soft);
  color: var(--success);
  border-color: var(--success);
}
.act-btn.detail-btn {
  flex: none;
  width: 38px;
  padding: 0;
}

/* Skeletons */
.cards-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card-skel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 14px;
}
.skel-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.skel-av {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.skel-info {
  flex: 1;
}
.skel-line {
  height: 12px;
  border-radius: 4px;
  margin-bottom: 6px;
}
.skel-line.w-60 { width: 60%; }
.skel-line.w-40 { width: 40%; }
.skel-line.w-80 { width: 80%; }
.skel-badge {
  width: 50px;
  height: 20px;
  border-radius: 10px;
}
.skel-mid {
  margin: 12px 0 8px;
}
.skel-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.skel-btn {
  flex: 1;
  height: 36px;
  border-radius: 6px;
}
.shimmer {
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.cards-empty {
  text-align: center;
  padding: 40px 16px;
}
.empty-icon-wrap {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--surface-3);
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  color: var(--ink-4);
}
.empty-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  margin: 0 0 4px;
}
.empty-sub {
  font-size: 12px;
  color: var(--ink-4);
  margin: 0;
}

.icon-inline {
  display: inline-block;
  vertical-align: -1px;
}

/* Palette classes */
.av-c1 { background: linear-gradient(135deg, #2f6ee5, #1d4ed8); }
.av-c2 { background: linear-gradient(135deg, #16a34a, #15803d); }
.av-c3 { background: linear-gradient(135deg, #d97706, #b45309); }
.av-c4 { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
.av-c5 { background: linear-gradient(135deg, #db2777, #be185d); }
.av-c6 { background: linear-gradient(135deg, #0891b2, #0e7490); }
.av-c7 { background: linear-gradient(135deg, #ea580c, #c2410c); }

.av-s1 { background: #4f46e5; }
.av-s2 { background: #0891b2; }
.av-s3 { background: #059669; }
.av-s4 { background: #d97706; }
.av-s5 { background: #db2777; }
.av-s6 { background: #7c3aed; }
.av-s7 { background: #dc2626; }
</style>
