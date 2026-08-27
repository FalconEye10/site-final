// ==============================================================================
// Web Push Notifications Service for Interact Camena Piatra Neamț
// Cross-Platform Support: Windows, macOS, Linux, Android (Chrome/Firefox/Edge), iOS 16.4+ (PWA)
// ==============================================================================
import { supabase } from '../supabase';
import { formatRomaniaDate } from './romaniaTime';

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

const VAPID_PRIVATE_KEY = 'poR6LA13GOWVjbhM8Z-rh0yXnPU9zwpORgVZcw3Bzvw';
const VAPID_SUBJECT = 'mailto:interact.camena@gmail.com';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function createVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encHeader}.${encPayload}`;

  const rawPub = base64UrlToUint8Array(VAPID_PUBLIC_KEY);
  const x = uint8ArrayToBase64Url(rawPub.slice(1, 33));
  const y = uint8ArrayToBase64Url(rawPub.slice(33, 65));

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d: VAPID_PRIVATE_KEY,
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${encSignature}`;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data as unknown as BufferSource));
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt, ikm);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info, 0);
  infoWithCounter[info.length] = 1;
  const hmac = await hmacSha256(prk, infoWithCounter);
  return hmac.slice(0, length);
}

async function encryptPayload(subscription: { p256dh: string; auth: string }, payloadText: string): Promise<Uint8Array> {
  const clientPublicKeyRaw = base64UrlToUint8Array(subscription.p256dh);
  const clientAuthSecret = base64UrlToUint8Array(subscription.auth);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', (localKeyPair as CryptoKeyPair).publicKey)
  );

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyRaw as unknown as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey } as any,
      (localKeyPair as CryptoKeyPair).privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = concatUint8Arrays([
    new TextEncoder().encode('WebPush: info\0'),
    clientPublicKeyRaw,
    localPublicKeyRaw,
  ]);

  const ikmPrk = await hkdfExtract(clientAuthSecret, sharedSecret);
  const ikm = await hkdfExpand(ikmPrk, keyInfo, 32);
  const prk = await hkdfExtract(salt, ikm);

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const cek = await hkdfExpand(prk, cekInfo, 16);
  const nonce = await hkdfExpand(prk, nonceInfo, 12);

  const plaintext = concatUint8Arrays([
    new TextEncoder().encode(payloadText),
    new Uint8Array([2]),
  ]);

  const aesKey = await crypto.subtle.importKey('raw', cek as unknown as BufferSource, 'AES-GCM', false, ['encrypt']);
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as unknown as BufferSource } as any, aesKey, plaintext as unknown as BufferSource)
  );

  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
  const idlen = new Uint8Array([localPublicKeyRaw.length]);

  return concatUint8Arrays([
    salt,
    rs,
    idlen,
    localPublicKeyRaw,
    ciphertextWithTag,
  ]);
}

async function sendWebPushToEndpoint(subscription: any, payload: any): Promise<boolean> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await createVapidJwt(audience);
    const encryptedBody = await encryptPayload(subscription, JSON.stringify(payload));

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '86400',
        'Urgency': 'high',
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: encryptedBody as unknown as BodyInit,
      mode: 'cors',
    });

    if (res.status === 410 || res.status === 404) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      return false;
    }
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Trimite notificarea către toate dispozitivele vizate (sau către toți abonații).
 * Implementează livrare Web Push directă (RFC 8291 / 8292) + apel către backend API.
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
  // 1. Identifică utilizatorul local pentru a nu afișa notificări nominale străine pe ecranul expeditorului
  let currentLocalMemberId: string | null = null;
  try {
    const sessionStr = typeof localStorage !== 'undefined' ? localStorage.getItem('active_member_session') : null;
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      currentLocalMemberId = parsed.id || parsed.username || null;
    }
    if (!currentLocalMemberId && typeof localStorage !== 'undefined') {
      const subStr = localStorage.getItem('interact_push_sub');
      if (subStr) {
        const parsedSub = JSON.parse(subStr);
        currentLocalMemberId = parsedSub.member_id || null;
      }
    }
  } catch (err) {
    console.debug('Failed to parse cached member session for push notification target filter:', err);
  }

  // Afișează notificare locală DOAR dacă este generală sau dacă este nominală pentru utilizatorul curent
  const isTargetedToSomeoneElse = Boolean(
    (targetMemberId && currentLocalMemberId && targetMemberId !== currentLocalMemberId) ||
    (targetMemberIds && targetMemberIds.length > 0 && currentLocalMemberId && !targetMemberIds.includes(currentLocalMemberId))
  );

  if (!isTargetedToSomeoneElse) {
    sendSystemNotification({ title, body, url });
  }

  const notificationPayload = {
    title: title || 'Interact Camena',
    body: body || 'Ai o nouă notificare în platformă!',
    icon: icon || '/logo.png',
    badge: '/logo.png',
    url: url || '/#dashboard',
    data: {
      url: url || '/#dashboard',
      timestamp: Date.now(),
    },
  };

  // 2. Livrare Directă Web Push către dispozitivele din Supabase
  try {
    let query = supabase.from('push_subscriptions').select('*');
    if (targetMemberId) {
      query = query.or(`member_id.eq.${targetMemberId},member_id.ilike.%${targetMemberId}%`);
    } else if (Array.isArray(targetMemberIds) && targetMemberIds.length > 0) {
      query = query.in('member_id', targetMemberIds);
    }
    const { data: subs } = await query;
    if (subs && subs.length > 0) {
      await Promise.allSettled(
        subs.map(sub => sendWebPushToEndpoint(sub, notificationPayload))
      );
    }
  } catch (directErr) {
    console.warn('Eroare la livrarea directă Web Push:', directErr);
  }

  // 3. Apel redundanță server backend (/api/send-push și /api/send-push.php)
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

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json().catch(() => ({}));
        if (json.success) {
          console.log(`📡 [Web Push Broadcast] Notificări trimise cu succes prin ${ep} (${json.sent}/${json.total} dispozitive):`, json);
          return;
        }
      }
    } catch (err) {
      console.warn(`Tentativă de trimitere push prin ${ep} eșuată:`, err);
    }
  }
}

/**
 * 🏆 Notificare NOMINALĂ: Punctaj adăugat sau scăzut (+/- puncte)
 */
export function triggerScorePushNotification(points: number, reason: string, memberId?: string, memberName?: string) {
  const isPositive = points > 0;
  const namePrefix = memberName ? `${memberName}, ` : '';
  const title = isPositive ? `🏆 Felicitări! Ai primit +${points} puncte de activitate!` : `⚠️ Actualizare Punctaj: ${points} puncte`;
  const body = isPositive
    ? `${namePrefix}Board-ul a apreciat implicarea ta! 🌟 Motiv: "${reason}". Punctele au fost adăugate în clasamentul oficial Interact Camena.`
    : `${namePrefix}A fost înregistrată o ajustare de ${points} puncte. Motiv: "${reason}". Consultă situația ta actualizată în clasament.`;

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
      title: '✅ Motivare Aprobată! (Interact Camena)',
      body: 'Cererea ta de învoire a fost aprobată oficial de către Board. Te așteptăm cu drag și multă energie la următoarea întâlnire!',
      url: '/#prezenta',
      targetMemberId: memberId,
    });
  } else {
    broadcastPushNotification({
      title: '❌ Răspuns Învoire: Cerere Respinsă',
      body: `Cererea ta de motivare a fost respinsă de Board. Motiv specificat: "${reason || 'Verifică detaliile în secțiunea Prezență'}".`,
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
    title: `📋 Cerere Nouă de Învoire: ${memberName}`,
    body: `Voluntarul ${memberName} a solicitat motivarea absenței. 📝 Motiv: "${reason || 'Nespecificat'}". Intră în modulul de prezență pentru revizuire.`,
    url: '/#prezenta',
  });
}

/**
 * 📢 Notificare GENERALĂ: Știre nouă sau Anunț oficial
 */
export function triggerNewsPushNotification(newsTitle: string, content?: string) {
  const summary = content ? (content.length > 110 ? content.slice(0, 107) + '...' : content) : 'Află ultimele noutăți din viața clubului.';
  broadcastPushNotification({
    title: `📢 Anunț Oficial: ${newsTitle}`,
    body: `Avem vești importante din club! 📰 ${summary} · Deschide pentru a citi comunicatul complet.`,
    url: '/#stiri',
  });
}

/**
 * 📊 Notificare GENERALĂ: Sondaj nou creat
 */
export function triggerPollPushNotification(question: string) {
  broadcastPushNotification({
    title: `📊 Părerea ta contează: Sondaj Nou!`,
    body: `"${question}" · Votul tău este esențial pentru deciziile Interact Camena. Intră pe platformă și exprimă-ți opțiunea!`,
    url: '/#idei',
  });
}

/**
 * 💬 Notificare GENERALĂ: Idee sau propunere nouă pe Forum
 */
export function triggerForumPushNotification(ideaTitle: string, submitterName?: string, content?: string) {
  const desc = content ? ` (${content.length > 70 ? content.slice(0, 67) + '...' : content})` : '';
  broadcastPushNotification({
    title: `💡 Propunere Nouă pe Forum: ${ideaTitle}`,
    body: `${submitterName || 'Un coleg'} a deschis o discuție nouă: "${ideaTitle}"${desc}. Intră să votezi și să-ți spui părerea!`,
    url: '/#comunitate',
  });
}

/**
 * 📅 Notificare GENERALĂ: Eveniment / Ședință / Proiect nou adăugat în Calendar
 */
export function triggerEventPushNotification(
  eventDataOrTitle:
    | {
        title: string;
        date: string;
        time?: string;
        endDate?: string;
        endTime?: string;
        location?: string;
        type?: 'meeting' | 'project' | 'social' | 'other';
        description?: string;
      }
    | string,
  eventDate?: string,
  eventTime?: string,
  location?: string,
  description?: string,
  type?: string
) {
  let title = '';
  let date = '';
  let time = '';
  let loc = '';
  let desc = '';
  let evType = 'meeting';

  if (typeof eventDataOrTitle === 'object' && eventDataOrTitle !== null) {
    title = eventDataOrTitle.title || 'Întâlnire Interact';
    date = eventDataOrTitle.date || '';
    time = eventDataOrTitle.time || '';
    loc = eventDataOrTitle.location || '';
    desc = eventDataOrTitle.description || '';
    evType = eventDataOrTitle.type || 'meeting';
  } else {
    title = eventDataOrTitle || 'Întâlnire Interact';
    date = eventDate || '';
    time = eventTime || '';
    loc = location || '';
    desc = description || '';
    evType = type || 'meeting';
  }

  // Titlu prietenos și specific pe categorii
  let pushTitle = `📅 Întâlnire Nouă: ${title}`;
  if (evType === 'project') pushTitle = `🚀 Proiect Nou: ${title}`;
  else if (evType === 'social') pushTitle = `🎉 Social & Teambuilding: ${title}`;
  else if (evType === 'meeting') pushTitle = `🏛️ Ședință Nouă: ${title}`;

  // Formatare prietenoasă a datei în limba română (ex: Vineri, 20 august)
  let dateDisplay = date;
  try {
    if (date) {
      dateDisplay = formatRomaniaDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
    }
  } catch {
    dateDisplay = date;
  }

  // Corp bogat în detalii: Ce, Când, Unde, Detalii
  const detailsParts: string[] = [];
  detailsParts.push('Te așteptăm cu drag!');
  if (dateDisplay) detailsParts.push(`🗓️ Data: ${dateDisplay}`);
  if (time) detailsParts.push(`⏰ Ora: ${time}`);
  if (loc) detailsParts.push(`📍 Locație: ${loc}`);
  if (desc) detailsParts.push(`📝 Detalii: ${desc.length > 90 ? desc.slice(0, 87) + '...' : desc}`);

  broadcastPushNotification({
    title: pushTitle,
    body: detailsParts.join(' · '),
    url: '/#calendar',
  });
}

/**
 * 🔄 Notificare GENERALĂ: Modificare / Schimbare Program Eveniment existent în Calendar
 */
export function triggerEventUpdatePushNotification(
  eventDataOrTitle:
    | {
        title: string;
        date: string;
        time?: string;
        endDate?: string;
        endTime?: string;
        location?: string;
        type?: 'meeting' | 'project' | 'social' | 'other';
        description?: string;
      }
    | string,
  eventDate?: string,
  eventTime?: string,
  location?: string,
  description?: string,
  type?: string
) {
  let title = '';
  let date = '';
  let time = '';
  let loc = '';
  let desc = '';
  let evType = 'meeting';

  if (typeof eventDataOrTitle === 'object' && eventDataOrTitle !== null) {
    title = eventDataOrTitle.title || 'Eveniment Interact';
    date = eventDataOrTitle.date || '';
    time = eventDataOrTitle.time || '';
    loc = eventDataOrTitle.location || '';
    desc = eventDataOrTitle.description || '';
    evType = eventDataOrTitle.type || 'meeting';
  } else {
    title = eventDataOrTitle || 'Eveniment Interact';
    date = eventDate || '';
    time = eventTime || '';
    loc = location || '';
    desc = description || '';
    evType = type || 'meeting';
  }

  let pushTitle = `🔄 SCHIMBARE EVENIMENT: ${title}`;
  if (evType === 'project') pushTitle = `🔄 SCHIMBARE PROIECT: ${title}`;
  else if (evType === 'meeting') pushTitle = `🔄 SCHIMBARE PROGRAM ȘEDINȚĂ: ${title}`;

  let dateDisplay = date;
  try {
    if (date) {
      dateDisplay = formatRomaniaDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
    }
  } catch {
    dateDisplay = date;
  }

  const detailsParts: string[] = [];
  detailsParts.push('Au intervenit modificări în program!');
  if (dateDisplay) detailsParts.push(`🗓️ Noua Dată: ${dateDisplay}`);
  if (time) detailsParts.push(`⏰ Noua Oră: ${time}`);
  if (loc) detailsParts.push(`📍 Locație: ${loc}`);
  if (desc) detailsParts.push(`📝 Detalii: ${desc.length > 90 ? desc.slice(0, 87) + '...' : desc}`);

  broadcastPushNotification({
    title: pushTitle,
    body: detailsParts.join(' · '),
    url: '/#calendar',
  });
}

/**
 * 💖 Notificare NOMINALĂ: Kudos primit
 */
export function triggerKudosPushNotification(recipientId: string, fromName?: string, message?: string) {
  broadcastPushNotification({
    title: `💖 Ai primit o apreciere de la ${fromName || 'un coleg'}!`,
    body: `"${message || 'Felicitări pentru implicare și spiritul de echipă!'}" · Continuă tot așa!`,
    url: '/#kudos',
    targetMemberId: recipientId,
  });
}




