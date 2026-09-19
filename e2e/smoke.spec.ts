import { test, expect } from '@playwright/test';

test('smoke test - loads dashboard with session', async ({ page }) => {
  const ADMIN_USER = {
    id: 'M061',
    name: 'Stan Stefan',
    role: 'admin',
    username: 'stan.stefan',
    committee: 'Board Executiv',
    boardPosition: 'Trezorier',
    status: 'active',
    login_count: 5,
    has_seen_tutorial: true,
    joinDate: '2025-10-01',
    totalPaid: 100,
  };

  await page.addInitScript(({ member }) => {
    localStorage.setItem('active_member_session', JSON.stringify(member));
    localStorage.setItem(`tutorial_seen_v3_${member.username.toLowerCase()}`, 'true');
    localStorage.setItem(`camena_update_seen_v_9.5.0_${member.username.toLowerCase()}`, 'true');
    localStorage.setItem('ui_experience_mode', 'advanced');
    localStorage.setItem('adminThemeMode', 'dark');
  }, { member: ADMIN_USER });

  await page.goto('/#dashboard');
  await page.waitForLoadState('networkidle');

  const sidebar = page.locator('#adm-sidebar-nav');
  await expect(sidebar).toBeVisible();
  console.log('Sidebar is visible!');
});
