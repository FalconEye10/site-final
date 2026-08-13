// ==============================================================================
// Web Push Notifications Service for Interact Camena Piatra Neamț
// ==============================================================================
import { supabase } from '../supabase';

// Valid NIST P-256 ECDSA Public VAPID Key
export const VAPID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  'BLf7XPVupVvjuOUABab4F7PX4CLcyubHzA0yLdDJw03CtsW4yhYmJG-kog5_aEK5iyscTnGkwTho3WE_0ACBQUs';

/**
 * Convertește cheia VAPID Base64URL într-un Uint8Array compatibil cu PushManager
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
 * Înregistrează Service Worker-ul din /sw.js
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('⚠️ Web Push Notifications nu sunt suportate de acest browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker înregistrat cu succes:', registration.scope);
    return registration;
  } catch (error) {
    console.error('❌ Eroare la înregistrarea Service Worker:', error);
    return null;
  }
}

/**
 * Cere permisiunea și abonează utilizatorul la notificări Push, salvând detaliile în Supabase
 */
export async function subscribeUserToPush(memberId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!('Notification' in window)) {
      return { success: false, message: 'Browserul tău nu suportă notificări de sistem.' };
    }

    // 1. Solicită permisiune în browser
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message: 'Permisiunea pentru notificări a fost refuzată în browser. Activează permisiunea din setările site-ului.',
      };
    }

    // 2. Înregistrează Service Worker-ul
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: 'Nu s-a putut inițializa Service Worker-ul.' };
    }

    // 3. Abonează prin PushManager folosind cheia publică VAPID
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, message: 'Datele de abonament Push sunt incomplete de la browser.' };
    }

    // 4. Salvează în baza de date Supabase (push_subscriptions)
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
      console.error('❌ Eroare la salvarea abonamentului în Supabase:', error);
      return { success: false, message: `Eroare salvare Supabase: ${error.message}` };
    }

    console.log('🎉 Dispozitiv abonat cu succes la Web Push!');
    return { success: true, message: 'Notificările Push au fost activate cu succes!' };
  } catch (error: any) {
    console.error('❌ Eroare la abonare Push:', error);
    return { success: false, message: error.message || 'Eroare neașteptată la activare.' };
  }
}

/**
 * Dezabonează utilizatorul de la Push Manager și șterge înregistrarea din Supabase
 */
export async function unsubscribeUserFromPush(memberId?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!('serviceWorker' in navigator)) {
      return { success: false, message: 'Service Worker nu este suportat.' };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Curățare din Supabase
      if (memberId) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('member_id', memberId);
      } else {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    }

    console.log('🔕 Notificările Push au fost dezactivate.');
    return { success: true, message: 'Notificările Push au fost dezactivate cu succes.' };
  } catch (error: any) {
    console.error('❌ Eroare la dezabonare:', error);
    return { success: false, message: error.message || 'Eroare la dezactivare.' };
  }
}

/**
 * Verifică dacă notificările sunt suportate și dacă utilizatorul este activ abonat
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

/**
 * Trimite o notificare locală de test direct prin Service Worker pentru verificare imediată
 */
export async function showLocalTestNotification(title?: string, body?: string): Promise<boolean> {
  try {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    await registration.showNotification(title || '🎉 Test Notificare Interact Camena', {
      body: body || 'Sistemul de notificări push funcționează perfect pe dispozitivul tău!',
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: '/#dashboard' },
      vibrate: [200, 100, 200],
    } as any);

    return true;
  } catch (err) {
    console.error('❌ Eroare la trimiterea notificării de test:', err);
    return false;
  }
}
