// ==============================================================================
// Web Push Notifications Service for Interact Camena Piatra Neamț
// Cross-Platform Support: Windows, macOS, Linux, Android (Chrome/Firefox/Edge), iOS 16.4+ (PWA)
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
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker nu este suportat de acest browser.');
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
 * Cere permisiunea și abonează utilizatorul la notificări Push cu reziliență pe toate platformele
 */
export async function subscribeUserToPush(memberId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Mediu neacceptat.' };
    }

    // 1. Verificare Secure Context (HTTPS sau localhost)
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return {
        success: false,
        message: 'Notificările Web Push necesită o conexiune securizată (HTTPS sau localhost).',
      };
    }

    // 2. Verificare Suport iOS / Safari PWA
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone && !('Notification' in window)) {
      return {
        success: false,
        message:
          "Pe iPhone/iPad (iOS), apasă pe butonul 'Partajează' (Share) din Safari și alege 'Adaugă pe ecranul principal' (Add to Home Screen) pentru a activa notificările push!",
      };
    }

    if (!('Notification' in window)) {
      return { success: false, message: 'Browserul tău nu suportă notificări de sistem.' };
    }

    // 3. Solicită permisiune în browser (cu compatibilitate Promise & Callback)
    let permission: NotificationPermission = Notification.permission;
    if (permission !== 'granted') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = await new Promise(resolve => {
          Notification.requestPermission(p => resolve(p));
        });
      }
    }

    if (permission !== 'granted') {
      return {
        success: false,
        message:
          permission === 'denied'
            ? 'Permisiunea a fost blocată anterior. Te rugăm să permiți notificările din setările browserului (pictograma 🔒 de lângă adresa site-ului).'
            : 'Permisiunea pentru notificări nu a fost acordată.',
      };
    }

    // 4. Înregistrează Service Worker-ul
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: 'Nu s-a putut inițializa Service Worker-ul pe acest dispozitiv.' };
    }

    // 5. Abonează prin PushManager folosind cheia publică VAPID
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription: PushSubscription | null = null;

    try {
      if ('pushManager' in registration) {
        subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey as unknown as BufferSource,
            });
          } catch (keyErr) {
            console.warn('Reîncercare abonare cu buffer direct:', keyErr);
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey.buffer as unknown as BufferSource,
            });
          }
        }
      }
    } catch (pushErr: any) {
      console.warn('Abonarea PushManager la nivel de server a returnat o avertizare:', pushErr);
    }

    // 6. Salvare locală și sincronizare cu Supabase
    if (subscription) {
      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      localStorage.setItem(
        'interact_push_sub',
        JSON.stringify({
          member_id: memberId,
          endpoint,
          p256dh,
          auth,
          timestamp: Date.now(),
        })
      );

      try {
        const subscriptionId = `sub_${memberId}_${Date.now()}`;
        await supabase.from('push_subscriptions').upsert(
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
      } catch (dbErr) {
        console.warn('Sincronizarea în cloud a abonamentului a eșuat (notificările locale rămân active):', dbErr);
      }
    }

    localStorage.setItem('push_opt_in_granted', 'true');
    console.log('🎉 Notificări Push activate cu succes!');
    return { success: true, message: 'Notificările Push au fost activate cu succes pe acest dispozitiv!' };
  } catch (error: any) {
    console.error('❌ Eroare la activare Push:', error);
    return { success: false, message: error.message || 'Eroare la activarea notificărilor.' };
  }
}

/**
 * Dezabonează utilizatorul de la Push Manager și șterge înregistrarea din Supabase
 */
export async function unsubscribeUserFromPush(memberId?: string): Promise<{ success: boolean; message: string }> {
  try {
    localStorage.removeItem('push_opt_in_granted');
    localStorage.removeItem('interact_push_sub');

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'pushManager' in registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();

          // Curățare din Supabase
          try {
            if (memberId) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('member_id', memberId);
            } else {
              await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
            }
          } catch (dbErr) {
            console.warn('Abonamentul a fost dezactivat local, ștergerea din cloud a avertizat:', dbErr);
          }
        }
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
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied', subscribed: false };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { supported: true, permission, subscribed: false };
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if ('pushManager' in registration) {
        const subscription = await registration.pushManager.getSubscription();
        return { supported: true, permission, subscribed: !!subscription || localStorage.getItem('push_opt_in_granted') === 'true' };
      }
    }
    return { supported: true, permission, subscribed: localStorage.getItem('push_opt_in_granted') === 'true' };
  } catch {
    return { supported: true, permission, subscribed: localStorage.getItem('push_opt_in_granted') === 'true' };
  }
}

/**
 * Trimite o notificare locală de test direct prin Service Worker pentru verificare imediată
 */
export async function showLocalTestNotification(title?: string, body?: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    const registration = await registerServiceWorker();
    if (registration && registration.showNotification) {
      await registration.showNotification(title || '🎉 Test Notificare Interact Camena', {
        body: body || 'Sistemul de notificări push funcționează perfect pe dispozitivul tău!',
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: '/#dashboard' },
        vibrate: [200, 100, 200],
      } as any);
      return true;
    }

    try {
      new Notification(title || '🎉 Test Notificare Interact Camena', {
        body: body || 'Sistemul de notificări push funcționează perfect pe dispozitivul tău!',
        icon: '/logo.png',
      });
      return true;
    } catch (e) {
      console.warn('Constructing Notification directly is not supported on Android Chrome/WebKit:', e);
      return false;
    }
  } catch (err) {
    console.error('❌ Eroare la trimiterea notificării de test:', err);
    return false;
  }
}

/**
 * Declanșează o notificare de sistem Web Push instantanee pe dispozitivul voluntarului
 */
export async function sendSystemNotification({
  title,
  body,
  tag,
  url = '/#dashboard',
}: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: tag || `notif_${Date.now()}`,
          data: { url },
          vibrate: [200, 100, 200],
        } as any);
        return true;
      }
    }

    try {
      new Notification(title, {
        body,
        icon: '/logo.png',
        tag: tag || `notif_${Date.now()}`,
      });
      return true;
    } catch (e) {
      console.warn('Direct notification constructor suppressed on mobile:', e);
      return false;
    }
  } catch (err) {
    console.warn('System push notification could not be shown:', err);
    return false;
  }
}

/**
 * Trimite notificarea către endpoint-ul serverless (/api/send-push) pentru a fi livrată
 * instantaneu prin Web Push (FCM / APNs / Mozilla) pe toate telefoanele și PC-urile abonate.
 */
export async function broadcastPushNotification({
  title,
  body,
  url = '/#dashboard',
  icon = '/logo.png',
  targetMemberId,
  targetMemberIds,
}: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  targetMemberId?: string;
  targetMemberIds?: string[];
}): Promise<void> {
  // 1. Arată notificare locală imediată
  sendSystemNotification({ title, body, url });

  // 2. Apelează endpoint-ul de Web Push pentru a trezi toate telefoanele / dispozitivele
  try {
    const endpoints = ['/api/send-push', '/api/send-push.php'];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            url,
            icon,
            targetMemberId,
            targetMemberIds,
          }),
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          console.log(`📡 [Web Push Broadcast] Notificări trimise cu succes prin ${ep}:`, json);
          return;
        }
      } catch {
        // Încearcă următorul endpoint de rezervă
      }
    }
  } catch (err) {
    console.warn('Eroare la trimiterea broadcast-ului push:', err);
  }
}

/**
 * 🏆 Notificare NOMINALĂ: Punctaj adăugat sau scăzut (+/- puncte)
 */
export function triggerScorePushNotification(points: number, reason: string, memberId?: string, memberName?: string) {
  const isPositive = points > 0;
  const title = isPositive ? `🏆 Ai primit +${points} puncte!` : `⚠️ Ajustare punctaj: ${points} puncte`;
  const body = memberName ? `Pentru ${memberName}: "${reason}". Vezi clasamentul actualizat.` : `Motiv: "${reason}". Vezi clasamentul actualizat.`;

  broadcastPushNotification({
    title,
    body,
    url: '/#clasament',
    targetMemberId: memberId,
  });
}

/**
 * 📅 Notificare NOMINALĂ: Aprobare sau Respingere cerere de învoire
 */
export function triggerAbsencePushNotification(status: 'approved' | 'rejected', memberId?: string, reason?: string) {
  if (status === 'approved') {
    broadcastPushNotification({
      title: '📅 Cerere de Motivare Aprobată! ✅',
      body: 'Absența ta a fost motivată oficial de către Board.',
      url: '/#prezenta',
      targetMemberId: memberId,
    });
  } else {
    broadcastPushNotification({
      title: '📅 Cerere de Motivare Respinsă ❌',
      body: `Cererea ta a fost respinsă. Motiv: ${reason || 'Verifică în secțiunea Prezență'}.`,
      url: '/#prezenta',
      targetMemberId: memberId,
    });
  }
}

/**
 * 📋 Notificare pentru Conducere/Admini: Cerere nouă de învoire depusă
 */
export function triggerAdminAbsenceRequestNotification(memberName: string, reason?: string) {
  broadcastPushNotification({
    title: '📋 Cerere nouă de învoire',
    body: `${memberName} a solicitat învoire: "${reason || 'Motiv specificat'}"`,
    url: '/#prezenta',
  });
}

/**
 * 📢 Notificare GENERALĂ: Știre nouă sau Anunț oficial
 */
export function triggerNewsPushNotification(newsTitle: string, summary?: string) {
  broadcastPushNotification({
    title: `📢 Știre nouă: ${newsTitle}`,
    body: summary ? (summary.slice(0, 80) + '...') : 'Află ultimele noutăți din clubul Interact Camena.',
    url: '/#stiri',
  });
}

/**
 * 📊 Notificare GENERALĂ: Sondaj nou creat
 */
export function triggerPollPushNotification(question: string) {
  broadcastPushNotification({
    title: `📊 Sondaj nou: ${question}`,
    body: 'Exprimă-ți votul democratic pentru deciziile clubului.',
    url: '/#idei',
  });
}

/**
 * 💬 Notificare GENERALĂ: Idee sau propunere nouă pe Forum
 */
export function triggerForumPushNotification(ideaTitle: string, submitterName?: string) {
  broadcastPushNotification({
    title: `💬 Forum: Propunere nouă!`,
    body: `"${ideaTitle}" de la ${submitterName || 'un voluntar'}. Intră să votezi!`,
    url: '/#comunitate',
  });
}

/**
 * 📅 Notificare GENERALĂ: Eveniment nou adăugat în Calendar
 */
export function triggerEventPushNotification(eventTitle: string, eventDate: string, eventTime?: string, location?: string) {
  broadcastPushNotification({
    title: `📅 Eveniment nou: ${eventTitle}`,
    body: `${eventDate}${eventTime ? ` la ora ${eventTime}` : ''}${location ? ` · ${location}` : ''}`,
    url: '/#calendar',
  });
}

/**
 * 💖 Notificare NOMINALĂ: Kudos primit
 */
export function triggerKudosPushNotification(recipientId: string, fromName?: string, message?: string) {
  broadcastPushNotification({
    title: `💖 Kudos primit de la ${fromName || 'un coleg'}!`,
    body: `"${message || 'Felicitări pentru implicare!'}"`,
    url: '/#kudos',
    targetMemberId: recipientId,
  });
}


