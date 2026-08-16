import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

const VAPID_PUBLIC_KEY = 'BLf7XPVupVvjuOUABab4F7PX4CLcyubHzA0yLdDJw03CtsW4yhYmJG-kog5_aEK5iyscTnGkwTho3WE_0ACBQUs';
const VAPID_PRIVATE_KEY = 'poR6LA13GOWVjbhM8Z-rh0yXnPU9zwpORgVZcw3Bzvw';
const VAPID_SUBJECT = 'mailto:interact.camena@gmail.com';

webPush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json().catch(() => ({}));
    const { title, body: messageBody, icon, url, targetMemberId, targetMemberIds } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let query = supabase.from('push_subscriptions').select('*');

    if (targetMemberId) {
      query = query.eq('member_id', targetMemberId);
    } else if (Array.isArray(targetMemberIds) && targetMemberIds.length > 0) {
      query = query.in('member_id', targetMemberIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: 'No subscriptions found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const notificationPayload = JSON.stringify({
      title: title || 'Interact Camena',
      body: messageBody || 'Ai o nouă notificare în platformă!',
      icon: icon || '/logo.png',
      badge: '/logo.png',
      url: url || '/#dashboard',
      data: {
        url: url || '/#dashboard',
        timestamp: Date.now(),
      },
    });

    let sent = 0;
    let failed = 0;

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
          sent++;
        } catch (err) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      })
    );

    return new Response(JSON.stringify({ success: true, sent, failed, total: subscriptions.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
