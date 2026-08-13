/**
 * ==============================================================================
 * SCRIPT BACKEND: TRIMITERE NOTIFICĂRI PUSH (WEB-PUSH & SUPABASE)
 * ==============================================================================
 * Instructiuni de rulare:
 * 1. Instaleaza libraria: npm install web-push @supabase/supabase-js dotenv
 * 2. Genereaza chei VAPID (daca nu le ai deja): npx web-push generate-vapid-keys
 * 3. Ruleaza scriptul: node scripts/send_push_notification.js
 * ==============================================================================
 */

import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configuration - Configurează cu URL-ul Supabase și Cheia Service Role / Anon Key
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vnoegytosymjnhmclgvb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'CHEIE_SUPABASE_SERVICE_ROLE';

// VAPID Keys - Trebuie sa se potriveasca cu VAPID_PUBLIC_KEY din frontend!
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa45xVb0d2d3N5eNf-J3rBv5vW7Jt_Pz_9H9n7b8A8n8B8n8B8n8B8n8B8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'CHEIE_PRIVATA_VAPID_GENERATA';
const VAPID_SUBJECT = 'mailto:interact.camena@gmail.com';

// Initializare Web-Push
webPush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Initializare Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Trimite o notificare Push catre toti membrii abonati sau catre un membru specific
 * @param {Object} payloadData - { title, body, icon, url }
 * @param {string} [targetMemberId] - (Optional) ID-ul membrului tinta
 */
async function sendPushNotification(payloadData, targetMemberId = null) {
  try {
    console.log('🔄 Extragere abonamente din Supabase...');
    
    let query = supabase.from('push_subscriptions').select('*');
    if (targetMemberId) {
      query = query.eq('member_id', targetMemberId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Eroare la citirea abonamentelor din Supabase:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ Nu exista abonamente Push active de trimis.');
      return;
    }

    console.log(`📡 Trimitere notificare catre ${subscriptions.length} dispozitiv(e)...`);

    const notificationPayload = JSON.stringify({
      title: payloadData.title || 'Interact Camena',
      body: payloadData.body || 'Notificare noua!',
      icon: payloadData.icon || '/logo.png',
      badge: payloadData.badge || '/logo.png',
      data: {
        url: payloadData.url || '/#dashboard',
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscriptionObject = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webPush.sendNotification(pushSubscriptionObject, notificationPayload);
          console.log(`✅ Notificare trimisa cu succes catre endpoint: ${sub.endpoint.slice(0, 40)}...`);
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Abonamentul a expirat sau a fost revocat pe browser -> stergem din baza de date
            console.log(`🧹 Curatare abonament expirat: ${sub.endpoint.slice(0, 40)}...`);
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          } else {
            console.error(`❌ Eroare trimitere notificare (${err.statusCode}):`, err.message);
          }
        }
      })
    );

    console.log('🎉 Proces de trimitere notificari Push finalizat!');
  } catch (err) {
    console.error('❌ Eroare neasteptata:', err);
  }
}

// Exemplu de utilizare direct din linia de comanda:
sendPushNotification({
  title: '🎉 Proiect Nou Aprobati!',
  body: 'O noua sedinta de voluntariat a fost adaugata in calendar.',
  url: '/#dashboard',
});
