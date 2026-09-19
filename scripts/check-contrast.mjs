import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

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

// In-browser contrast evaluation function
const contrastEvaluator = () => {
  function parseColor(str) {
    if (!str || str === 'transparent' || str === 'inherit') return null;
    const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!match) return null;
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0,
    };
  }

  function composite(fg, bg) {
    const a = fg.a;
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
      a: 1.0,
    };
  }

  function getLuminance(rgb) {
    const a = [rgb.r, rgb.g, rgb.b].map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getEffectiveBg(el, defaultBg) {
    let current = el;
    const bgStack = [];

    while (current && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a > 0) {
        bgStack.unshift(bg);
        if (bg.a === 1.0) break;
      }
      current = current.parentElement;
    }

    let finalBg = defaultBg;
    for (const bg of bgStack) {
      finalBg = composite(bg, finalBg);
    }
    return finalBg;
  }

  const isDark = document.documentElement.classList.contains('dark') ||
                 document.documentElement.getAttribute('data-theme') === 'dark';
  const defaultBg = isDark ? { r: 9, g: 13, b: 22, a: 1.0 } : { r: 255, g: 255, b: 255, a: 1.0 };

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_SKIP;
        const tag = node.tagName.toLowerCase();
        if (['script', 'style', 'svg', 'path', 'noscript', 'canvas'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const violations = [];
  const visitedTexts = new Set();

  while (walker.nextNode()) {
    const el = walker.currentNode;
    const style = window.getComputedStyle(el);

    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      continue;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

    // Direct text check
    let hasDirectText = false;
    for (let i = 0; i < el.childNodes.length; i++) {
      const c = el.childNodes[i];
      if (c.nodeType === Node.TEXT_NODE && c.textContent.trim().length > 0) {
        hasDirectText = true;
        break;
      }
    }

    // Input placeholder or text
    const isInput = el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea';
    if (!hasDirectText && !isInput) continue;

    const rawText = isInput ? (el.value || el.placeholder || '').trim() : el.innerText.trim();
    if (!rawText || rawText.length === 0) continue;
    const snippet = rawText.split('\n')[0].slice(0, 40);

    const fgColor = parseColor(style.color);
    if (!fgColor) continue;

    const effectiveBg = getEffectiveBg(el, defaultBg);
    const effectiveFg = fgColor.a < 1.0 ? composite(fgColor, effectiveBg) : fgColor;

    const fgLum = getLuminance(effectiveFg);
    const bgLum = getLuminance(effectiveBg);
    const ratio = getContrastRatio(fgLum, bgLum);

    const fontSize = parseFloat(style.fontSize) || 14;
    const fontWeight = parseInt(style.fontWeight, 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    const required = isLarge ? 3.0 : 4.5;

    const dedupeKey = `${snippet}__${style.color}__${Math.round(ratio * 10) / 10}`;
    if (ratio < required && !visitedTexts.has(dedupeKey)) {
      visitedTexts.add(dedupeKey);
      violations.push({
        text: snippet,
        tag: el.tagName.toLowerCase(),
        classes: (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 6).join(' ') : '',
        fg: `rgb(${effectiveFg.r},${effectiveFg.g},${effectiveFg.b})`,
        bg: `rgb(${effectiveBg.r},${effectiveBg.g},${effectiveBg.b})`,
        ratio: Math.round(ratio * 100) / 100,
        required,
        fontSize: Math.round(fontSize),
        fontWeight,
        isLarge,
      });
    }
  }

  return violations;
};

async function auditTheme(browser, themeMode) {
  const results = {
    theme: themeMode,
    views: {},
  };

  // --- 1. Audit WelcomeLogin page ---
  const authContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const authPage = await authContext.newPage();
  await authPage.addInitScript((theme) => {
    localStorage.clear();
    localStorage.setItem('adminThemeMode', theme);
  }, themeMode);

  await authPage.goto(`${BASE_URL}/#auth`);
  await authPage.waitForTimeout(1000);
  await authPage.evaluate((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, themeMode);
  await authPage.waitForTimeout(500);

  results.views['WelcomeLogin'] = await authPage.evaluate(contrastEvaluator);
  await authContext.close();

  // --- 2. Audit Dashboard with Admin Session ---
  const dashContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await dashContext.newPage();

  await page.addInitScript(({ user, theme }) => {
    localStorage.setItem('active_member_session', JSON.stringify(user));
    localStorage.setItem(`tutorial_seen_v3_${user.username.toLowerCase()}`, 'true');
    localStorage.setItem(`camena_update_seen_v_9.5.0_${user.username.toLowerCase()}`, 'true');
    localStorage.setItem('interact_push_prompt_dismissed', Date.now().toString());
    localStorage.setItem('ui_experience_mode', 'advanced');
    localStorage.setItem('adminThemeMode', theme);
  }, { user: ADMIN_USER, theme: themeMode });

  await page.goto(`${BASE_URL}/#dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.evaluate((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, themeMode);

  await page.waitForSelector('#adm-sidebar-nav', { timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(500);
  
  try {
    await page.waitForSelector('#adm-sidebar-nav', { timeout: 6000 });
  } catch (err) {
    console.log(`[Warning] Sidebar nav not loaded: ${err.message}`);
  }
  await page.waitForTimeout(500);

  // View: Overview (Panou Principal)
  results.views['Panou Principal'] = await page.evaluate(contrastEvaluator);

  // View: Membri
  const navMembers = page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Membri")');
  if (await navMembers.isVisible()) {
    await navMembers.click();
    await page.waitForTimeout(800);
    results.views['Membri'] = await page.evaluate(contrastEvaluator);
  }

  // View: Evenimente / Calendar
  const navEvents = page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Calendar")');
  if (await navEvents.isVisible()) {
    await navEvents.click();
    await page.waitForTimeout(800);
    results.views['Evenimente'] = await page.evaluate(contrastEvaluator);
  }

  // View: Prezență
  const navAttendance = page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Prezență")');
  if (await navAttendance.isVisible()) {
    await navAttendance.click();
    await page.waitForTimeout(800);
    results.views['Prezență'] = await page.evaluate(contrastEvaluator);
  }

  // View: Trezorerie / Buget (all subtabs)
  const navBudget = page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Buget")');
  if (await navBudget.isVisible()) {
    await navBudget.click();
    await page.waitForTimeout(800);
    results.views['Buget - Dashboard'] = await page.evaluate(contrastEvaluator);

    const subtabs = ['Buget General', 'Buget pe Proiecte', 'Registru Tranzacții', 'Urmărire Cotizații', 'Audit Log'];
    for (const sub of subtabs) {
      const btn = page.locator(`button[role="tab"]:has-text("${sub}")`);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
        results.views[`Buget - ${sub}`] = await page.evaluate(contrastEvaluator);
      }
    }
  }

  // View: Sondaje / Sugestii / Idei
  const navSondaje = page.locator('#adm-sidebar-nav button.adm-nav-item:has-text("Sondaje")');
  if (await navSondaje.isVisible()) {
    await navSondaje.click();
    await page.waitForTimeout(800);
    results.views['Sugestii / Comunitate'] = await page.evaluate(contrastEvaluator);
  }

  await dashContext.close();
  return results;
}

async function main() {
  console.log('====================================================');
  console.log('  WCAG 2.1 AA COLOR CONTRAST AUDIT (Light & Dark)   ');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  console.log('[1/2] Scanning Light Mode (html[data-theme="light"])...');
  const lightResults = await auditTheme(browser, 'light');

  console.log('[2/2] Scanning Dark Mode (html[data-theme="dark"])...');
  const darkResults = await auditTheme(browser, 'dark');

  await browser.close();

  let totalViolations = 0;
  for (const [theme, data] of Object.entries({ LIGHT: lightResults, DARK: darkResults })) {
    console.log(`\n----------------------------------------------------`);
    console.log(`  REZULTATE TEMA: ${theme}`);
    console.log(`----------------------------------------------------`);
    for (const [view, vList] of Object.entries(data.views)) {
      if (vList.length > 0) {
        console.log(`\n[${view}] - ${vList.length} elemente neconforme:`);
        for (const v of vList) {
          totalViolations++;
          console.log(`  - Text: "${v.text}" | Contrast: ${v.ratio}:1 (Necesar: ${v.required}:1) | FG: ${v.fg} BG: ${v.bg} | Clasa: ${v.classes}`);
        }
      } else {
        console.log(`[${view}] - 0 erori de contrast (100% conform)`);
      }
    }
  }

  console.log(`\n====================================================`);
  console.log(`TOTAL ELEMENTE NECONFORME DETECTATE: ${totalViolations}`);
  console.log(`====================================================\n`);
}

main().catch(err => {
  console.error('Fatal error during contrast audit:', err);
  process.exit(1);
});
