import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

const VAPID_PUBLIC_KEY = 'BLf7XPVupVvjuOUABab4F7PX4CLcyubHzA0yLdDJw03CtsW4yhYmJG-kog5_aEK5iyscTnGkwTho3WE_0ACBQUs';
const VAPID_PRIVATE_KEY = 'poR6LA13GOWVjbhM8Z-rh0yXnPU9zwpORgVZcw3Bzvw';
const VAPID_SUBJECT = 'mailto:interact.camena@gmail.com';

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function uint8ArrayToBase64Url(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getJwkFromRawKeys(publicKeyBase64Url, privateKeyBase64Url) {
  const rawPub = base64UrlToUint8Array(publicKeyBase64Url);
  const x = uint8ArrayToBase64Url(rawPub.slice(1, 33));
  const y = uint8ArrayToBase64Url(rawPub.slice(33, 65));

  return {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d: privateKeyBase64Url,
  };
}

async function createVapidJwt(audience) {
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

  const jwk = getJwkFromRawKeys(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
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

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}

async function hkdfExpand(prk, info, length) {
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info, 0);
  infoWithCounter[info.length] = 1;
  const hmac = await hmacSha256(prk, infoWithCounter);
  return hmac.slice(0, length);
}

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function encryptPayload(subscription, payloadText) {
  const clientPublicKeyRaw = base64UrlToUint8Array(subscription.p256dh);
  const clientAuthSecret = base64UrlToUint8Array(subscription.auth);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  );

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      localKeyPair.privateKey,
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

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
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

async function sendWebPush(subscription, payload) {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  const jwt = await createVapidJwt(audience);
  const encryptedBody = await encryptPayload(subscription, JSON.stringify(payload));

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Urgency': 'high',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body: encryptedBody,
  });
}

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

    const notificationPayload = {
      title: title || 'Interact Camena',
      body: messageBody || 'Ai o nouă notificare în platformă!',
      icon: icon || '/logo.png',
      badge: '/logo.png',
      url: url || '/#dashboard',
      data: {
        url: url || '/#dashboard',
        timestamp: Date.now(),
      },
    };

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const res = await sendWebPush(sub, notificationPayload);
          if (res.ok) {
            sent++;
          } else {
            failed++;
            if (res.status === 410 || res.status === 404) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        } catch (err) {
          failed++;
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
