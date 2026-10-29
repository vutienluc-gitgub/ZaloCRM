<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- Mobile chat 2026-10-29 (P0):
       - Cao 100% khung .m-main (đã trừ bàn phím) — bỏ calc(100vh - 120px).
       - List: header riêng + ConversationList. Thread: MessageThread tự làm header,
         chỉ phủ thêm nút Back ở góc trái. -->
  <div class="m-chat">
    <!-- ── Danh sách hội thoại ─────────────────────────────────────── -->
    <template v-if="!selectedConvId">
      <header class="m-chat__bar">
        <h1 class="m-chat__title">Hội thoại</h1>
        <NotificationBell />
      </header>
      <div v-if="unansweredFilter" class="m-chat__filter">
        <span>Đang lọc: Chưa trả lời</span>
        <button type="button" @click="clearFilter">Bỏ lọc</button>
      </div>
      <div class="m-chat__body">
        <ConversationList
          :conversations="conversations"
          :selected-id="selectedConvId"
          :loading="loadingConvs"
          v-model:search="searchQuery"
          @select="onSelectConversation"
          @filter-account="onFilterAccount"
        />
      </div>
    </template>

    <!-- ── Hội thoại đang mở ───────────────────────────────────────── -->
    <div v-else class="m-chat__thread">
      <button type="button" class="m-chat__back" aria-label="Quay lại" @click="goBack">
        <v-icon icon="mdi-chevron-left" size="26" />
      </button>
      <MessageThread
        :conversation="selectedConv"
        :messages="allMessages"
        :loading="loadingMsgs"
        :sending="sendingMsg"
        :show-contact-panel="false"
        :ai-suggestion="(null as any)"
        :ai-suggestion-loading="false"
        :ai-suggestion-error="(null as any)"
        @send="handleSend"
        @refresh-thread="selectedConvId && fetchMessages(selectedConvId)"
        class="m-chat__mt"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConversationList from '@/components/chat/ConversationList.vue';
import MessageThread from '@/components/chat/MessageThread.vue';
import NotificationBell from '@/components/NotificationBell.vue';
import { useChat } from '@/composables/use-chat';
import { useOfflineQueue } from '@/composables/use-offline-queue';

const route = useRoute();
const router = useRouter();

const {
  conversations, selectedConvId, selectedConv, messages,
  loadingConvs, loadingMsgs, sendingMsg, searchQuery, accountFilter, extraFilters,
  fetchConversations, fetchMessages, selectConversation, sendMessage, sendMessageTo,
  initSocket, destroySocket,
} = useChat();

const { pendingMessages, enqueue, flush } = useOfflineQueue();

// Deep-link từ Dashboard: /chat?filter=unanswered → chỉ hiện hội thoại chưa trả lời.
const unansweredFilter = ref(false);

function syncFilterFromQuery(): boolean {
  const f = route.query.filter;
  const want = f === 'unanswered' || f === 'unreplied';
  if (want === unansweredFilter.value) return false;
  unansweredFilter.value = want;
  extraFilters.value = want ? { unreplied: 'true' } : {};
  return true;
}

function clearFilter() {
  unansweredFilter.value = false;
  extraFilters.value = {};
  router.replace({ name: 'Chat' }).catch(() => {});
  void fetchConversations({ bypassCache: true });
}

function onFilterAccount(id: string | null) {
  accountFilter.value = id;
  fetchConversations();
}

function goBack() {
  selectedConvId.value = null;
  // Rời URL /chat/:convId → F5/link không mở lại hội thoại cũ.
  if (route.params.convId || route.query.contactId) {
    router.replace({ name: 'Chat' }).catch(() => {});
  }
}

/** Chọn hội thoại + đồng bộ URL để F5 / chia sẻ link vẫn mở đúng thread. */
function onSelectConversation(id: string) {
  void selectConversation(id);
  if (route.params.convId !== id) {
    router.replace({ name: 'Chat', params: { convId: id } }).catch(() => {});
  }
}

// Merge real messages with pending offline messages
const allMessages = computed(() => {
  const pending = pendingMessages.value
    .filter(p => p.conversationId === selectedConvId.value)
    .map(p => ({
      id: p.id,
      content: p.content,
      contentType: 'text',
      senderType: 'self',
      senderName: null,
      sentAt: p.createdAt,
      isDeleted: false,
      zaloMsgId: null,
      albumKey: null,
      albumIndex: null,
      albumTotal: null,
      _pending: true,
    }));
  return [...messages.value, ...pending];
});

async function handleSend(
  content: string,
  replyMessageId?: string | null,
  styles?: Array<{ st: string; start: number; len: number }>,
  mentions?: Array<{ uid: string; pos: number; len: number }>,
) {
  if (!selectedConvId.value) return;
  if (!navigator.onLine) {
    enqueue(selectedConvId.value, content);
    return;
  }
  await sendMessage(content, replyMessageId, styles, mentions);
}

// Flush queue when coming back online
function onOnline() {
  flush(sendMessageTo);
}

/** Mở hội thoại từ deep-link: /chat/:convId hoặc /chat?contactId=... */
async function openFromRoute() {
  const cid = route.params.convId;
  if (typeof cid === 'string' && cid) {
    // Đã mở sẵn (vd vừa bấm trong list → URL sync) → không fetch lại.
    if (cid === selectedConvId.value) return;
    await selectConversation(cid);
    return;
  }
  const contactId = route.query.contactId;
  if (typeof contactId === 'string' && contactId) {
    const conv = conversations.value.find(c => c.contact?.id === contactId);
    if (conv) {
      await selectConversation(conv.id);
      const q = { ...route.query };
      delete q.contactId;
      router.replace({ name: 'Chat', params: { convId: conv.id }, query: q }).catch(() => {});
    }
    return;
  }
  // Về /chat (vd bấm tab Hội thoại khi đang mở thread) → đóng thread, hiện danh sách.
  if (selectedConvId.value) selectedConvId.value = null;
}

onMounted(async () => {
  syncFilterFromQuery();
  await fetchConversations();
  await openFromRoute();
  initSocket();
  window.addEventListener('online', onOnline);
});

onUnmounted(() => {
  destroySocket();
  window.removeEventListener('online', onOnline);
  clearTimeout(searchTimeout);
});

let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchConversations(), 300);
});

// Điều hướng từ nơi khác (vd bấm thông báo) trong lúc màn chat đang mở.
const routeKey = computed(
  () =>
    `${String(route.params.convId ?? '')}|${String(route.query.contactId ?? '')}|${String(route.query.filter ?? '')}`,
);
watch(routeKey, async () => {
  if (syncFilterFromQuery()) await fetchConversations({ bypassCache: true });
  await openFromRoute();
});
</script>

<style scoped>
.m-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--surface, #fff);
}

/* ── List mode ───────────────────────────────────────────────────────── */
.m-chat__bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  height: calc(52px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 6px 0 14px;
  background: var(--surface, #fff);
  border-bottom: 1px solid var(--line, #e2e8f0);
}
.m-chat__title {
  flex: 1 1 auto;
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink, #101e34);
}
.m-chat__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.m-chat__filter {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 14px;
  background: var(--brand-soft, #e8eef8);
  color: var(--brand-700, #163870);
  font-size: 12.5px;
  font-weight: 600;
}
.m-chat__filter button {
  border: 0;
  background: transparent;
  color: var(--brand, #2151a1);
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.m-chat__body :deep(.conv-list) {
  height: 100%;
}

/* ConversationList là component desktop → thu gọn header cho mobile:
   nút "Tin nhắn mới" chỉ còn icon 42px, search 16px để iOS không auto-zoom. */
.m-chat__body :deep(.cl-header) {
  padding: 9px 12px;
}
.m-chat__body :deep(.cl-new-msg) {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  justify-content: center;
  gap: 0;
}
.m-chat__body :deep(.cl-new-msg > span:not(.cl-new-msg-caret)) {
  display: none;
}
.m-chat__body :deep(.cl-search) {
  font-size: 16px;
}

/* ── Thread mode ─────────────────────────────────────────────────────── */
.m-chat__thread {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.m-chat__mt {
  flex: 1 1 auto;
  min-height: 0;
}
/* Header của MessageThread là layout desktop 3 dòng (tên + gender + deal stage +
   tag Zalo + nick + đếm tin + online + nút kết bạn) → trên 390px bị cắt nát.
   Mobile thu về 2 dòng: tên KH + nick đang chat; các chip phụ ẩn hết. */
.m-chat__mt :deep(.chat-header) {
  align-items: center;
  gap: 8px;
  padding: calc(8px + env(safe-area-inset-top, 0px)) 8px 8px 48px;
  min-height: 58px;
}
.m-chat__mt :deep(.ch-row-1) {
  /* Chừa chỗ cho cụm actions absolute bên phải (kết bạn + menu ⋮). */
  padding-right: 104px;
  flex-wrap: nowrap;
  gap: 0;
}
/* Ẩn gender chip / deal stage / tag Zalo — chỉ giữ tên KH. */
.m-chat__mt :deep(.ch-row-1 > *:not(.ch-name)) {
  display: none;
}
.m-chat__mt :deep(.ch-name) {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
/* Dòng 2: chỉ giữ nick switcher (biết đang trả lời từ nick nào rất quan trọng). */
.m-chat__mt :deep(.ch-row-chips) {
  flex-wrap: nowrap;
  overflow: hidden;
  gap: 4px;
  padding: 0;
}
.m-chat__mt :deep(.ch-row-chips .ch-cung-cham-chip),
.m-chat__mt :deep(.ch-row-chips .ch-sep),
.m-chat__mt :deep(.ch-row-chips .msg-counts),
.m-chat__mt :deep(.ch-row-chips .last-online),
.m-chat__mt :deep(.ch-row-chips .nick-archived-chip) {
  display: none;
}
.m-chat__mt :deep(.ch-row-chips .nick-name) {
  max-width: 150px;
  font-size: 12px;
}
.m-chat__mt :deep(.chat-header > .ch-actions) {
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  gap: 2px;
}
/* Nút kết bạn chỉ còn icon 34px — chữ "Kết bạn / Đã KB / Đã mời" không vừa. */
.m-chat__mt :deep(.ch-actions .btn-action) {
  width: 34px;
  height: 34px;
  padding: 0;
  justify-content: center;
  gap: 0;
  border-radius: 50%;
  font-size: 0;
}
.m-chat__mt :deep(.ch-actions .btn-action .sub-meta) {
  display: none;
}
/* Hover-pop (Huỷ KB / Thu hồi) không dùng được trên touch. */
.m-chat__mt :deep(.ch-actions .fr-hover-pop) {
  display: none;
}
/* iOS Safari tự zoom khi focus input < 16px. */
.m-chat__mt :deep(.editor-content .tiptap-input) {
  font-size: 16px;
}
/* Toolbar 10 icon không vừa 360px → trước đây wrap, icon AI rơi xuống dòng 2.
   Mobile: 1 hàng cuộn ngang, bỏ nút "Danh thiếp" (chưa implement, chỉ toast). */
.m-chat__mt :deep(.input-toolbar-top) {
  flex-wrap: nowrap;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.m-chat__mt :deep(.input-toolbar-top::-webkit-scrollbar) {
  display: none;
}
.m-chat__mt :deep(.input-toolbar-top .icon-tool[title='Gửi danh thiếp']) {
  display: none;
}
.m-chat__mt :deep(.input-toolbar-top .toolbar-divider) {
  margin: 0 2px;
}
/* Avatar nick đang gửi (trái ô soạn) trùng với nick switcher trên header →
   ẩn để ô nhập rộng thêm ~50px trên màn 360px. */
.m-chat__mt :deep(.input-row .nick-avatar-halo) {
  display: none;
}
.m-chat__back {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 9px);
  left: 4px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink, #101e34);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-chat__back:active {
  background: var(--surface-3, #f4f6f8);
}
</style>
