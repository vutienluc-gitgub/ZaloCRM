// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
// Vĩnh Phát CRM — derivative work of ZaloCRM, free software under AGPL-3.0 (see LICENSE).
// Commercial (dual) licensing available: locnt@locnguyendata.com
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index';
import { vuetify } from './plugins/vuetify';
import './assets/tokens.css';
import './assets/main.css';
import './assets/rbac-page.css';
import './assets/hs-crm-theme.css'; // Brand theme — load LAST để token/component thắng cascade (migration 2026-06-05)
import './assets/report-kit.css'; // Module Báo cáo — design system scoped .rpt-scope (2026-06-17)

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(vuetify);

// Đợi router resolve route đầu tiên rồi mới mount. Trước đây mount ngay → App.vue
// thấy route.meta rỗng nên chọn MobileLayout/DefaultLayout ở "/", gọi /dashboard/kpi,
// /notifications… trong khi guard còn đang chuyển sang /login (flash shell mobile).
void router.isReady().then(() => app.mount('#app'));

// PWA Service Worker Registration
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] ServiceWorker registration failed:', err);
    });
  });
}
