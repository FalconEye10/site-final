import { test, expect, Page } from '@playwright/test';

// Session test fixtures
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

const MEMBER_USER = {
  id: 'M072',
  name: 'Beca Rareș',
  role: 'member',
  username: 'beca.rares',
  committee: 'Comitet Voluntariat',
  boardPosition: '',
  status: 'active',
  login_count: 5,
  has_seen_tutorial: true,
  joinDate: '2025-10-01',
  totalPaid: 100,
};

const APP_VERSION = '9.5.0';

/**
 * Helper to inject member authentication session into localStorage before initial page navigation.
 */
async function injectSession(page: Page, user: typeof ADMIN_USER, mode: 'advanced' | 'easy' = 'advanced', theme?: 'dark' | 'light') {
  await page.addInitScript(({ member, version, expMode, themeMode, now }) => {
    localStorage.setItem('active_member_session', JSON.stringify(member));
    localStorage.setItem(`tutorial_seen_v3_${member.username.toLowerCase()}`, 'true');
    localStorage.setItem(`camena_update_seen_v_${version}_${member.username.toLowerCase()}`, 'true');
    localStorage.setItem('interact_push_prompt_dismissed', now.toString());
    localStorage.setItem('ui_experience_mode', expMode);
    if (themeMode && !localStorage.getItem('adminThemeMode')) {
      localStorage.setItem('adminThemeMode', themeMode);
    }
  }, { member: user, version: APP_VERSION, expMode: mode, themeMode: theme || 'dark', now: Date.now() });
}

/**
 * Attach zero-console-error watcher to capture and fail on unhandled rejections, TypeErrors, or Supabase 500 errors.
 */
function attachErrorWatcher(page: Page) {
  const errors: string[] = [];

  page.on('pageerror', (err) => {
    const msg = err.message || '';
    // Filter out external Spline 3D binary parser warning from landing page CDN script
    if (msg.includes('Data read, but end of buffer not reached')) {
      return;
    }
    errors.push(`[PageError] ${msg}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Fail immediately on unhandled rejection, TypeError, or 500 error from Supabase
      if (
        text.includes('Unhandled') ||
        text.includes('TypeError') ||
        text.includes('500') ||
        text.toLowerCase().includes('internal server error')
      ) {
        errors.push(`[ConsoleError] ${text}`);
      }
    }
  });

  return errors;
}

test.describe('Platform Full E2E Audit Suite', () => {

  // =========================================================================
  // MATRICEA A: MATRICEA DE DISPOZITIVE (VIEWPORTS)
  // =========================================================================
  test.describe('A. Matricea de Dispozitive (Viewports)', () => {
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1280, height: 720 },
      { name: 'Tablet (iPad)', width: 768, height: 1024 },
      { name: 'Mobile (iPhone)', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      test(`Viewport ${vp.name} (${vp.width}x${vp.height}) - overflow, sidebar & modals`, async ({ page }) => {
        const errors = attachErrorWatcher(page);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await injectSession(page, ADMIN_USER, 'advanced');

        await page.goto('/#dashboard');
        await page.waitForLoadState('networkidle');

        // 1. Verificare absență overflow orizontal
        const isOverflowing = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          return docEl.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth;
        });
        expect(isOverflowing).toBe(false);

        // 2. Verificare vizibilitate meniu hamburger / sidebar
        const hamburgerBtn = page.locator('button[aria-label="Deschide meniul"]');
        const sidebar = page.locator('#adm-sidebar-nav');

        if (vp.width >= 1024) {
          // Desktop & Laptop: sidebar-ul este vizibil, hamburgerul este ascuns
          await expect(sidebar).toBeVisible();
          await expect(hamburgerBtn).not.toBeVisible();
        } else {
          // Tablet & Mobile: hamburgerul este vizibil
          await expect(hamburgerBtn).toBeVisible();
          // Deschide meniul mobil
          await hamburgerBtn.click();
          await expect(sidebar).toBeVisible();

          // Închide meniul mobil prin butonul X
          const closeBtn = page.locator('button[aria-label="Închide meniul"]');
          await expect(closeBtn).toBeVisible();
          await closeBtn.click();
          await expect(sidebar).not.toBeInViewport();
        }

        // 3. Deschiderea și închiderea corectă a modalelor (Command Palette / Ctrl+K)
        await page.keyboard.press('Control+k');
        const commandInput = page.locator('input[placeholder*="Caută"]');
        await expect(commandInput).toBeVisible({ timeout: 5000 });

        // Închide modalul prin Escape
        await page.keyboard.press('Escape');
        await expect(commandInput).not.toBeVisible();

        expect(errors, `Erori consolă detectate pe ${vp.name}`).toHaveLength(0);
      });
    }
  });

  // =========================================================================
  // MATRICEA B: MATRICEA DE ROLURI (RBAC)
  // =========================================================================
  test.describe('B. Matricea de Roluri (RBAC)', () => {
    test('Rol Membru Normal: acces restricționat la unelte administrative', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, MEMBER_USER, 'advanced');

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      // Verifică sidebar-ul pentru un membru normal
      const navText = await page.locator('#adm-sidebar-nav').innerText();

      // Membrul NU trebuie să aibă acces la Trezorerie sau Rapoarte în meniul principal
      expect(navText).not.toContain('Buget');
      expect(navText).not.toContain('Rapoarte');
      expect(navText).not.toContain('🛡️ Audit Master');
      expect(navText).not.toContain('Membri & Echipă');

      // Navigare la Evenimente/Calendar pentru membru normal
      const calendarNav = page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Calendar")');
      await expect(calendarNav).toBeVisible();
      await calendarNav.click();

      // Membrul NU trebuie să vadă butonul de "Creează Eveniment Nou"
      await expect(page.locator('button:has-text("Creează Eveniment Nou")')).not.toBeVisible();

      // Membrul NU trebuie să vadă butoane de ștergere
      await expect(page.locator('button[title="Șterge"]')).not.toBeVisible();

      expect(errors).toHaveLength(0);
    });

    test('Rol Administrator: acces complet la toate modulele administrative', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, ADMIN_USER, 'advanced');

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      const nav = page.locator('#adm-sidebar-nav');

      // Confirmă prezența tuturor tab-urilor administrative
      await expect(nav.locator('button.adm-nav-item:has-text("Membri")')).toBeVisible();
      await expect(nav.locator('button.adm-nav-item:has-text("Prezență")')).toBeVisible();
      await expect(nav.locator('button.adm-nav-item:has-text("Calendar")')).toBeVisible();
      await expect(nav.locator('button.adm-nav-item:has-text("Buget")')).toBeVisible();
      await expect(nav.locator('button.adm-nav-item:has-text("Rapoarte")')).toBeVisible();
      await expect(nav.locator('button.adm-nav-item:has-text("Audit")')).toBeVisible();

      // Verifică butonul admin din Calendar
      await nav.locator('button.adm-nav-item:has-text("Calendar")').click();
      await expect(page.locator('button:has-text("Creează Eveniment Nou")')).toBeVisible();

      // Verifică butonul admin din Membri (MEMBRU NOU)
      await nav.locator('button.adm-nav-item:has-text("Membri")').click();
      await expect(page.locator('button:has-text("MEMBRU NOU")')).toBeVisible();

      expect(errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // MATRICEA C: CICLUL COMPLET SUPABASE (CRUD ÎN TIMP REAL)
  // =========================================================================
  test.describe('C. Ciclul Complet Supabase (CRUD în Timp Real)', () => {

    test('CRUD Evenimente: Creare, Randare, RSVP/Prezență, Curățare (Ștergere)', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, ADMIN_USER, 'advanced');

      // Auto-accept confirmation dialogs for event deletion
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      // 1. Navigare la Calendar
      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Calendar")').click();

      // 2. Deschidere modal creare eveniment
      const createBtn = page.locator('button:has-text("Creează Eveniment Nou")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();

      const modalTitle = page.locator('h2:has-text("Eveniment Nou")');
      await expect(modalTitle).toBeVisible();

      // 3. Completare formular
      const testEventTitle = `TEST E2E EVENIMENT ${Date.now()}`;
      await page.fill('input[placeholder*="Întâlnire Proiect Camena"]', testEventTitle);
      await page.fill('input[placeholder*="Sediul Central"]', 'Sala de Protocol Interact Camena');

      // 4. Salvare eveniment
      await page.locator('button[type="submit"]:has-text("Creează Eveniment")').click();
      await expect(modalTitle).not.toBeVisible();

      // 5. Verificare randare în listă
      const eventHeadings = page.locator(`h4:has-text("${testEventTitle}")`);
      await expect(eventHeadings.first()).toBeVisible({ timeout: 10000 });

      // 6. Curățare: Ștergerea evenimentului de test
      const deleteBtn = eventHeadings.last()
        .locator('xpath=ancestor::div[contains(@class, "justify-between")][1]//button[@title="Șterge"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();

      // 7. Confirmă absența din listă după ștergere
      await expect(page.locator(`h4:has-text("${testEventTitle}")`)).toHaveCount(0, { timeout: 10000 });

      expect(errors).toHaveLength(0);
    });

    test('Membri: Deschidere MemberDrawer, Verificare Tab-uri Interne & Închidere', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, ADMIN_USER, 'advanced');

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      // 1. Navigare la Membri
      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Membri")').click();

      // 2. Selectare primul membru din tabel
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });
      await firstRow.click();

      // 3. Verificare deschidere MemberDrawer
      const tabFinance = page.locator('button:has-text("Sinteză Financiară")');
      const tabActivity = page.locator('button:has-text("Activitate & Prezențe")');
      const tabAchievements = page.locator('button:has-text("Pașaport & Insigne")');
      const tabProfile = page.locator('button:has-text("Date Contact & Profil")');

      await expect(tabFinance).toBeVisible({ timeout: 5000 });
      await expect(tabActivity).toBeVisible();
      await expect(tabAchievements).toBeVisible();
      await expect(tabProfile).toBeVisible();

      // 4. Navigare prin tab-urile interne ale profilului
      await tabActivity.click();
      await page.waitForTimeout(400);

      await tabAchievements.click();
      await page.waitForTimeout(400);

      await tabProfile.click();
      await page.waitForTimeout(400);

      await tabFinance.click();
      await page.waitForTimeout(400);

      // 5. Închidere drawer
      const closeDrawerBtn = page.locator('button[aria-label="Închide"]').first();
      await closeDrawerBtn.click();
      await expect(tabFinance).not.toBeVisible();

      expect(errors).toHaveLength(0);
    });

    test('Trezorerie / Buget: Navigare prin toate cele 6 sub-tab-uri & validare fără NaN/undefined', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, ADMIN_USER, 'advanced');

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      // 1. Navigare la Buget
      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Buget")').click();

      // 2. Cele 6 sub-tab-uri oficiale
      const budgetTabs = [
        'Dashboard & KPI',
        'Buget General',
        'Buget pe Proiecte',
        'Registru Tranzacții',
        'Urmărire Cotizații',
        'Audit Log',
      ];

      for (const tabLabel of budgetTabs) {
        const tabBtn = page.locator(`button[role="tab"]:has-text("${tabLabel}")`);
        await expect(tabBtn).toBeVisible({ timeout: 8000 });
        await tabBtn.click();

        // Așteaptă încărcarea conținutului tab-ului
        await page.waitForTimeout(600);

        // Verifică absența erorilor de tip NaN, undefined sau [object Object]
        const tabContent = await page.evaluate(() => document.body.innerText);
        expect(tabContent, `Tab-ul "${tabLabel}" conține NaN`).not.toMatch(/\bNaN\b/);
        expect(tabContent, `Tab-ul "${tabLabel}" conține undefined`).not.toMatch(/\bundefined\b/);
        expect(tabContent, `Tab-ul "${tabLabel}" conține [object Object]`).not.toContain('[object Object]');
      }

      expect(errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // MATRICEA D: POLITICA ZERO-CONSOLE-ERROR
  // =========================================================================
  test.describe('D. Politică Zero-Console-Error', () => {
    test('Verificare globală fără excepții neprinse sau erori critice', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, ADMIN_USER, 'advanced');

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      // Navigare prin câteva vederi cheie pentru a asigura încărcarea componentelor
      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Prezență")').click();
      await page.waitForTimeout(600);

      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Repartizare")').click();
      await page.waitForTimeout(600);

      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Kudos")').click();
      await page.waitForTimeout(600);

      await page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Panou Principal")').click();
      await page.waitForTimeout(600);

      // Verificare finală strictă: nicio eroare de tip TypeError, Unhandled sau 500
      expect(errors, 'Au fost detectate erori neașteptate în consolă').toHaveLength(0);
    });
  });

  // =========================================================================
  // MATRICEA E: TEMATIZARE ȘI CONTRAST (LIGHT / DARK MODE)
  // =========================================================================
  test.describe('E. Tematizare și Contrast', () => {
    test('Comutare Light/Dark Mode, aplicare data-theme, clasă .dark și persistență la reload', async ({ page }) => {
      const errors = attachErrorWatcher(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await injectSession(page, ADMIN_USER, 'advanced', 'dark');

      await page.goto('/#dashboard');
      await page.waitForLoadState('networkidle');

      // 1. Verificare inițială: mod Dark
      let currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      let hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(currentTheme).toBe('dark');
      expect(hasDarkClass).toBe(true);

      // 2. Comută la Mod Luminos (Light Mode)
      const themeBtn = page.locator('button[title*="Comută la mod"]').first();
      await expect(themeBtn).toBeVisible();
      await themeBtn.click();

      // 3. Verificare stare Light
      currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      let storedTheme = await page.evaluate(() => localStorage.getItem('adminThemeMode'));

      expect(currentTheme).toBe('light');
      expect(hasDarkClass).toBe(false);
      expect(storedTheme).toBe('light');

      // 4. Reîncărcare pagină și verificare persistență
      await page.reload();
      await page.waitForLoadState('networkidle');

      currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      storedTheme = await page.evaluate(() => localStorage.getItem('adminThemeMode'));

      expect(currentTheme).toBe('light');
      expect(hasDarkClass).toBe(false);
      expect(storedTheme).toBe('light');

      // 5. Comutare înapoi la Dark Mode
      const themeBtnLight = page.locator('button[title*="Comută la mod"]').first();
      await themeBtnLight.click();

      currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      storedTheme = await page.evaluate(() => localStorage.getItem('adminThemeMode'));

      expect(currentTheme).toBe('dark');
      expect(hasDarkClass).toBe(true);
      expect(storedTheme).toBe('dark');

      expect(errors).toHaveLength(0);
    });
  });

});
