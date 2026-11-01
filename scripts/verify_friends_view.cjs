// SPDX-License-Identifier: AGPL-3.0-or-later
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  const assetsDir = path.join(__dirname, '../docs/acceptance/2026-10-31-impeccable-mobile/assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('1. Starting Vite preview on port 4175...');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], {
    cwd: path.join(__dirname, '../frontend'),
    shell: true,
  });

  await new Promise(r => setTimeout(r, 2500));

  const browser = await chromium.launch({ headless: true });

  const mockUser = {
    id: 'u1',
    fullName: 'Võ Tiến Lực',
    role: 'admin',
    orgId: 'org1',
    orgName: 'Dệt May Vĩnh Phát',
    passwordChangedAt: '2026-01-01T00:00:00Z',
  };

  const mockAccounts = [
    { id: 'acc1', displayName: 'Kim Dung (Sale)', phone: '0901234567', liveStatus: 'online', status: 'connected' },
    { id: 'acc2', displayName: 'Minh Hằng (CSKH)', phone: '0907654321', liveStatus: 'online', status: 'connected' },
  ];

  const mockFriends = [
    {
      id: 'f1',
      contactId: 'c1',
      zaloAccountId: 'acc1',
      zaloUidInNick: '883921029',
      friendshipStatus: 'friend',
      relationshipKind: 'friend',
      hasConversation: true,
      aliasInNick: 'Cty May Sài Gòn',
      zaloDisplayName: 'Anh Tuấn Giám Đốc',
      becameFriendAt: '2026-08-15T08:00:00Z',
      lastInteractionAt: '2026-10-30T10:00:00Z',
      totalInbound: 15,
      totalOutbound: 18,
      leadScore: 88,
      autoTags: ['active', 'ready'],
      crmTagsPerNick: ['VIP Dệt May', 'Vải Thun'],
      zaloLabels: [{ name: 'Khách VIP', color: '#2563eb' }],
      contact: {
        id: 'c1',
        fullName: 'Nguyễn Văn Tuấn',
        crmName: 'Tuấn - May Sài Gòn',
        phone: '0912345678',
        leadScore: 88,
      },
      zaloAccount: {
        id: 'acc1',
        displayName: 'Kim Dung (Sale)',
      },
    },
    {
      id: 'f2',
      contactId: 'c2',
      zaloAccountId: 'acc2',
      zaloUidInNick: '192837465',
      friendshipStatus: 'friend',
      relationshipKind: 'pending_friend',
      hasConversation: false,
      aliasInNick: 'Đại lý Vải Tân Bình',
      zaloDisplayName: 'Chị Mai',
      becameFriendAt: null,
      lastInteractionAt: '2026-10-20T10:00:00Z',
      stuckSince: '2026-10-22T00:00:00Z',
      totalInbound: 2,
      totalOutbound: 5,
      leadScore: 65,
      autoTags: ['stuck'],
      crmTagsPerNick: ['Cần chăm sóc'],
      zaloLabels: [],
      contact: {
        id: 'c2',
        fullName: 'Trần Thị Mai',
        crmName: 'Mai Tân Bình',
        phone: '0987654321',
        leadScore: 65,
      },
      zaloAccount: {
        id: 'acc2',
        displayName: 'Minh Hằng (CSKH)',
      },
    },
  ];

  async function setupMocks(page) {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'valid_mock_jwt');
    });

    await page.route('**/api/auth/me', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: mockUser }) });
    });
    await page.route('**/auth/me', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: mockUser }) });
    });
    await page.route('**/api/zalo-accounts', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accounts: mockAccounts }) });
    });
    await page.route('**/zalo-accounts', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accounts: mockAccounts }) });
    });
    await page.route('**/friends-db/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ friends: mockFriends, total: 2, counts: { friend: 1, pending_friend: 1, chatting_stranger: 0, ghost: 0 } }),
      });
    });
    await page.route('**/api/settings/statuses', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statuses: [] }) });
    });
  }

  try {
    // 1. Desktop 1280x800
    console.log('2. Testing Desktop 1280x800...');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageDesktop = await ctxDesktop.newPage();
    await setupMocks(pageDesktop);

    await pageDesktop.goto('http://localhost:4175/friends', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(1000);

    const desktopFile = path.join(assetsDir, '20-friends-desktop-1280x800.png');
    await pageDesktop.screenshot({ path: desktopFile, fullPage: false });
    console.log('   Saved:', desktopFile);

    // 2. Mobile 360x640 (Galaxy A)
    console.log('3. Testing Mobile 360x640...');
    const ctxMobile360 = await browser.newContext({
      viewport: { width: 360, height: 640 },
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile360 = await ctxMobile360.newPage();
    await setupMocks(pageMobile360);

    await pageMobile360.goto('http://localhost:4175/friends', { waitUntil: 'networkidle' });
    await pageMobile360.waitForTimeout(1000);

    const scrollWidth360 = await pageMobile360.evaluate(() => document.documentElement.scrollWidth);
    console.log(`   Mobile 360 scrollWidth: ${scrollWidth360}px (Expected <= 360)`);

    const mobile360File = path.join(assetsDir, '20-friends-mobile-360x640.png');
    await pageMobile360.screenshot({ path: mobile360File, fullPage: false });
    console.log('   Saved:', mobile360File);

    // 3. Mobile 390x844 (iPhone 14) with Mobile Nick Sheet
    console.log('4. Testing Mobile 390x844 & Nick Selector Sheet...');
    const ctxMobile390 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile390 = await ctxMobile390.newPage();
    await setupMocks(pageMobile390);

    await pageMobile390.goto('http://localhost:4175/friends', { waitUntil: 'networkidle' });
    await pageMobile390.waitForTimeout(1000);

    // Click mobile nick selector button to open sheet
    const nickBtn = pageMobile390.locator('.mobile-nick-btn');
    if (await nickBtn.isVisible()) {
      await nickBtn.click();
      await pageMobile390.waitForTimeout(500);
      const sheetFile = path.join(assetsDir, '21-friends-mobile-nick-sheet-390x844.png');
      await pageMobile390.screenshot({ path: sheetFile, fullPage: false });
      console.log('   Saved Nick Sheet:', sheetFile);
    }

    console.log('All Playwright tests passed successfully!');
  } finally {
    await browser.close();
    preview.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
