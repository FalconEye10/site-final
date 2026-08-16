/**
 * ==============================================================================
 * SCRIPT BACKEND: TRIMITERE NOTIFICĂRI PUSH (WEB-PUSH & SUPABASE)
 * ==============================================================================
 * Acest script poate fi rulat:
 * 1. Din linia de comandă: `node scripts/send_push_notification.js`
 * 2. Integrat într-un endpoint Express / Node.js
 * 3. Sau într-o funcție Serverless / Supabase Edge Function
 * ==============================================================================
 */

import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase Project Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

// 2. VAPID Keys Oficiale (P-256 Curve)
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BLf7XPVupVvjuOUABab4F7PX4CLcyubHzA0yLdDJw03CtsW4yhYmJG-kog5_aEK5iyscTnGkwTho3WE_0ACBQUs';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'poR6LA13GOWVjbhM8Z-rh0yXnPU9zwpORgVZcw3Bzvw';

const VAPID_SUBJECT = 'mailto:interact.camena@gmail.com';

// Configurare detalii VAPID
webPush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Trimite o notificare Web Push către toți membrii abonați sau către un membru specific
 * @param {Object} payload - Datele notificării: { title, body, icon, url, badge }
 * @param {string} [targetMemberId] - (Opțional) ID-ul membrului țintă
 */
export async function sendPushNotification(payload, targetMemberId = null) {
  try {
    console.log('🔄 Se interoghează baza de date Supabase pentru dispozitive abonate...');

    let query = supabase.from('push_subscriptions').select('*');
    if (targetMemberId) {
      query = query.eq('member_id', targetMemberId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Eroare la citirea tabelei push_subscriptions:', error.message);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ Nu există dispozitive abonate în baza de date.');
      return { success: true, count: 0, message: 'Niciun abonat activ.' };
    }

    console.log(`📡 Se trimite notificarea către ${subscriptions.length} dispozitive...`);

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Interact Camena',
      body: payload.body || 'Ai o nouă notificare!',
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      url: payload.url || '/#dashboard',
      data: {
        url: payload.url || '/#dashboard',
        timestamp: Date.now(),
      },
    });

    let successCount = 0;
    let failureCount = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webPush.sendNotification(pushConfig, notificationPayload);
          successCount++;
          console.log(`✅ [OK] Notificare livrată la: ${sub.endpoint.slice(0, 35)}...`);
        } catch (err) {
          failureCount++;
          // Dacă statusul este 410 (Gone) sau 404 (Not Found), utilizatorul s-a dezabonat sau a resetat browserul
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`🧹 [Curățare] Ștergere abonament expirat: ${sub.endpoint.slice(0, 35)}...`);
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          } else {
            console.error(`❌ [Eroare ${err.statusCode}]`, err.message);
          }
        }
      })
    );

    console.log(`🎉 Trimitere finalizată: ${successCount} reușite, ${failureCount} eșuate.`);
    return { success: true, sent: successCount, failed: failureCount };
  } catch (err) {
    console.error('❌ Eroare generală la trimiterea notificărilor:', err);
    return { success: false, error: err.message };
  }
}

// Dacă scriptul este executat direct din terminal (`node scripts/send_push_notification.js`)
if (process.argv[1]?.includes('send_push_notification.js')) {
  sendPushNotification({
    title: '📢 Anunț Nou — Interact Camena',
    body: 'O nouă ședință de voluntariat a fost adăugată în calendarul oficial.',
    url: '/#dashboard',
  });
}
