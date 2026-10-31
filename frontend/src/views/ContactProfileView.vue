<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!--
    ContactProfileView — Tab/page "Hồ sơ KH tổng hợp" (SKELETON).

    STATUS: Phase Y future feature. Component này CHỈ render skeleton UI để
    placeholder route /contacts/:id/profile. Khi backend
    GET /api/v1/contacts/:id/profile sẵn sàng + composable
    use-contact-profile.ts unmock, view này sẽ hiển thị đầy đủ:

      - Header: avatar + tên + score aggregate + primary owner
      - Tab "Thông tin chung": email, địa chỉ, nghề nghiệp (3 field
        đã ẩn khỏi ChatContactPanel cột 4), birthday, gender, demographics
      - Tab "Nick Zalo (N)": list tất cả Friend rows với per-pair score + status
      - Tab "Tags tổng hợp": UNION từ Contact.tags + Friend.crmTagsPerNick
      - Tab "Timeline": aggregated activities từ tất cả Friend
      - Tab "Note": Contact-level notes (vs Friend-level)

    Liên hệ Phase 6: aggregateScore = MAX(Friend.scores) theo architecture
    chốt 2026-05-16 (chát + reference TODO Phase 6+ score).
  -->
  <div class="cp-view">
    <header class="cp-header">
      <button class="back-btn" @click="$router.back()">
        <v-icon icon="mdi-arrow-left" size="16" class="mr-1" /> Quay lại
      </button>
      <h1>
        <v-icon icon="mdi-account" size="24" class="mr-2" color="var(--brand, #2151a1)" />
        Hồ sơ KH tổng hợp
        <span class="badge-skeleton">SKELETON</span>
      </h1>
      <div class="cp-actions">
        <span class="cp-id" :title="contactId">ID: {{ contactId.slice(0, 8) }}…</span>
      </div>
    </header>

    <div v-if="loading" class="cp-loading">
      <v-icon icon="mdi-loading" size="20" class="spin-icon mr-2" /> Đang tải hồ sơ tổng hợp…
    </div>

    <div v-else-if="error" class="cp-error">
      <v-icon icon="mdi-alert-circle" size="20" class="mr-2" color="var(--danger, #dc2626)" /> {{ error }}
    </div>

    <div v-else-if="profile" class="cp-content">
      <section class="cp-card">
        <div class="cp-info-grid">
          <div class="cp-info-row">
            <span class="cp-label">Tên hiển thị:</span>
            <span class="cp-value">{{ profile.contact.displayName || profile.contact.fullName || '—' }}</span>
          </div>
          <div class="cp-info-row">
            <span class="cp-label">Điểm tổng hợp (MAX Friend):</span>
            <span class="cp-value score">{{ profile.aggregateScore }}</span>
          </div>
          <div class="cp-info-row">
            <span class="cp-label">Phụ trách chính:</span>
            <span class="cp-value">{{ profile.primaryOwner?.userName || '— chưa có —' }}</span>
          </div>
        </div>
      </section>

      <section class="cp-card cp-skeleton-note">
        <h2>
          <v-icon icon="mdi-pin" size="18" class="mr-1" color="var(--warning, #b45309)" />
          Đây là skeleton
        </h2>
        <p>Component chưa implement đầy đủ. Khi backend <code>GET /api/v1/contacts/:id/profile</code> sẵn sàng, view này sẽ hiển thị:</p>
        <ul class="cp-todo-list">
          <li><v-icon icon="mdi-email-outline" size="16" class="mr-1 text-muted" /> Email · Địa chỉ · Nghề nghiệp <em>(3 field đã ẩn khỏi ChatContactPanel cột 4)</em></li>
          <li><v-icon icon="mdi-phone" size="16" class="mr-1 text-muted" /> Phone chính + phone2 + phone3</li>
          <li><v-icon icon="mdi-calendar" size="16" class="mr-1 text-muted" /> Birthday, gender, province/district/ward</li>
          <li><v-icon icon="mdi-tag-outline" size="16" class="mr-1 text-muted" /> Tags aggregated (UNION Contact.tags + Friend.crmTagsPerNick)</li>
          <li><v-icon icon="mdi-cellphone" size="16" class="mr-1 text-muted" /> List tất cả {{ profile.friends.length }} nick Zalo per-pair (với per-pair score)</li>
          <li><v-icon icon="mdi-chart-line" size="16" class="mr-1 text-muted" /> Timeline aggregated activities</li>
          <li><v-icon icon="mdi-star" size="16" class="mr-1 text-muted" /> Score breakdown (Phase 6 4-dimension)</li>
        </ul>
        <p class="cp-hint">
          <strong>Trigger build full:</strong> ra lệnh <code>"Implement ContactProfileView full"</code> + backend route stub
          tại <code>backend/src/modules/contacts/contact-routes.ts</code>.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useContactProfile } from '@/composables/use-contact-profile';

const route = useRoute();
const contactId = computed(() => String(route.params.id || ''));
const { profile, loading, error, fetchContactProfile } = useContactProfile();

onMounted(() => {
  if (contactId.value) fetchContactProfile(contactId.value);
});
</script>

<style scoped>
.cp-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  font-family: inherit;
}

.cp-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.cp-header h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  color: var(--ink, #101e34);
  display: flex;
  align-items: center;
}
.badge-skeleton {
  display: inline-block;
  background: var(--warning-soft, #fef3c7);
  color: var(--warning-text, #92400e);
  font-size: 10px;
  padding: 3px 8px;
  border-radius: var(--r-sm, 8px);
  margin-left: 8px;
  vertical-align: middle;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.back-btn {
  background: var(--surface, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  padding: 8px 14px;
  border-radius: var(--r-sm, 8px);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2, #475569);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  transition: all 0.15s ease;
}
.back-btn:hover {
  border-color: var(--brand, #2151a1);
  color: var(--brand, #2151a1);
}

.cp-id {
  font-size: 11px;
  color: var(--ink-4, #94a3b8);
  font-family: ui-monospace, monospace;
}

.cp-loading,
.cp-error {
  background: var(--surface, #ffffff);
  border-radius: var(--r-md, 12px);
  padding: 48px;
  text-align: center;
  color: var(--ink-3, #6b7488);
}
.cp-error {
  color: var(--danger, #dc2626);
}

.cp-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-card {
  background: var(--surface, #ffffff);
  border-radius: var(--r-md, 12px);
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--line, #e2e8f0);
}
.cp-card h2 {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--ink, #101e34);
  display: flex;
  align-items: center;
}

.cp-info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cp-info-row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  align-items: center;
  font-size: 13px;
}
.cp-label {
  font-weight: 600;
  color: var(--ink-3, #6b7488);
}
.cp-value {
  color: var(--ink, #101e34);
}
.cp-value.score {
  display: inline-block;
  font-size: 15px;
  font-weight: 700;
  color: var(--success, #0a805c);
  background: var(--success-soft, #e6f7f0);
  padding: 2px 10px;
  border-radius: var(--r-sm, 8px);
  width: fit-content;
}

.cp-skeleton-note {
  background: var(--warning-soft, #fef3c7);
  border-left: 4px solid var(--warning, #f59e0b);
}
.cp-skeleton-note p {
  font-size: 13px;
  color: var(--warning-text, #78350f);
  margin: 8px 0;
  line-height: 1.55;
}
.cp-todo-list {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}
.cp-todo-list li {
  padding: 5px 0;
  font-size: 13px;
  color: var(--warning-text, #78350f);
  display: flex;
  align-items: center;
}
.cp-todo-list li em {
  color: var(--warning-text, #9a3412);
  font-size: 12px;
}
.cp-hint {
  background: rgba(255, 255, 255, 0.6);
  padding: 10px 12px;
  border-radius: var(--r-sm, 8px);
  font-size: 12px;
  color: var(--warning-text, #78350f);
  margin-top: 12px;
}
.cp-hint code,
.cp-skeleton-note code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--warning-text, #92400e);
}

.spin-icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .cp-view {
    padding: 16px;
  }
  .cp-info-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
