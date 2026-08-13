// ==============================================================================
// Web Push Notifications Service for Interact Camena Piatra Neamț
// ==============================================================================
import { supabase } from '../supabase';

// VAPID Public Key - standard demo/production key
// În producție, poți seta VITE_VAPID_PUBLIC_KEY în fișierul .env
export const VAPID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa45xVb0d2d3N5eNf-J3rBv5vW7Jt_Pz_9H9n7b8A8n8B8n8B8n8B8n8B8n8B8';

/**
 * Convertește o cheie VAPID Base64 URL Safe într-un ArrayBuffer de Uint8 (cerut de PushManager)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Înregistrează Service Worker-ul public (/sw.js)
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Notificările Push nu sunt suportate pe acest browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Eroare la înregistrarea Service Worker-ului:', error);
    return null;
  }
}

/**
 * Cere permisiunea utilizatorului și îl abonează la notificările Push (salvând abonamentul în Supabase)
 */
export async function subscribeUserToPush(memberId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!('Notification' in window)) {
      return { success: false, message: 'Browserul dumneavoastră nu suportă notificări.' };
    }

    // 1. Solicită permisiunea de la utilizator
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Permisiunea pentru notificări a fost refuzată de utilizator.' };
    }

    // 2. Înregistrează Service Worker-ul
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: 'Nu s-a putut inițializa Service Worker-ul.' };
    }

    // 3. Abonează utilizatorul la Push Manager
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, message: 'Obiectul de abonament Push este incomplet.' };
    }

    // 4. Salvează obiectul de abonare în baza de date Supabase (tabela push_subscriptions)
    const subscriptionId = `sub_${memberId}_${Date.now()}`;
    const { error } = await supabase.from('push_subscriptions').upsert(
      [
        {
          id: subscriptionId,
          member_id: memberId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Eroare la salvarea abonamentului Push în Supabase:', error);
      return { success: false, message: `Eroare Supabase: ${error.message}` };
    }

    return { success: true, message: 'Notificările Push au fost activate cu succes!' };
  } catch (error: any) {
    console.error('Eroare la abonarea la notificări:', error);
    return { success: false, message: error.message || 'Eroare neașteptată la activare.' };
  }
}

/**
 * Dezabonează utilizatorul de la notificările Push și șterge înregistrarea din Supabase
 */
export async function unsubscribeUserFromPush(memberId?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!('serviceWorker' in navigator)) {
      return { success: false, message: 'Service Worker nesuportat.' };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Șterge din Supabase
      if (memberId) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      } else {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    }

    return { success: true, message: 'Notificările Push au fost dezactivate.' };
  } catch (error: any) {
    console.error('Eroare la dezabonare Push:', error);
    return { success: false, message: error.message || 'Eroare la dezabonare.' };
  }
}

/**
 * Verifică starea curentă a abonamentului Push (Permisiune & Stare activă)
 */
export async function checkPushSubscriptionStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, permission: 'denied', subscribed: false };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { supported: true, permission, subscribed: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { supported: true, permission, subscribed: !!subscription };
  } catch {
    return { supported: true, permission, subscribed: false };
  }
}
