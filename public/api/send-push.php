<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || !isset($data['title'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Title is required']);
    exit;
}

$title = $data['title'] ?? 'Interact Camena';
$messageBody = $data['body'] ?? 'Ai o nouă notificare în platformă!';
$url = $data['url'] ?? '/#dashboard';
$icon = $data['icon'] ?? '/logo.png';
$targetMemberId = $data['targetMemberId'] ?? null;
$targetMemberIds = $data['targetMemberIds'] ?? null;

$supabaseUrl = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

$vapidPublicKey = 'BLf7XPVupVvjuOUABab4F7PX4CLcyubHzA0yLdDJw03CtsW4yhYmJG-kog5_aEK5iyscTnGkwTho3WE_0ACBQUs';
$vapidSubject = 'mailto:interact.camena@gmail.com';
$vapidPrivateKeyPem = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgpoR6LA13GOWVjbhM\n8Z+rh0yXnPU9zwpORgVZcw3BzvyhRANCAAS3+1z1bqVb47jlAAWm+Bez1+Ai3Mrm\nx8wNMi3QycNNwrbFuMoWJiRvpKIOf2hCuYsrHE5xpME4aN1hP9AAgUFL\n-----END PRIVATE KEY-----";

// 1. Fetch subscriptions from Supabase
$queryUrl = $supabaseUrl . '/rest/v1/push_subscriptions?select=*';
if ($targetMemberId) {
    $queryUrl .= '&member_id=eq.' . urlencode($targetMemberId);
}

$ch = curl_init($queryUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseKey,
    'Authorization: Bearer ' . $supabaseKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$res = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 400 || !$res) {
    echo json_encode(['success' => false, 'error' => 'Could not fetch subscriptions', 'httpCode' => $httpCode]);
    exit;
}

$subscriptions = json_decode($res, true);
if (!is_array($subscriptions) || count($subscriptions) === 0) {
    echo json_encode(['success' => true, 'sent' => 0, 'failed' => 0, 'total' => 0, 'message' => 'No matching subscriptions']);
    exit;
}

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function createVapidJwt($audience, $vapidSubject, $vapidPrivateKeyPem) {
    $header = json_encode(['alg' => 'ES256', 'typ' => 'JWT']);
    $payload = json_encode([
        'aud' => $audience,
        'exp' => time() + 43200,
        'sub' => $vapidSubject
    ]);

    $unsignedToken = base64UrlEncode($header) . '.' . base64UrlEncode($payload);

    $signature = '';
    $pKey = openssl_pkey_get_private($vapidPrivateKeyPem);
    if (!$pKey) return null;

    if (!openssl_sign($unsignedToken, $signature, $pKey, OPENSSL_ALGO_SHA256)) {
        return null;
    }

    // Convert DER signature to IEEE P1363 (r || s)
    $derLen = strlen($signature);
    $pos = 2; // skip 0x30, len
    if ($signature[$pos] !== "\x02") return null;
    $rLen = ord($signature[$pos + 1]);
    $r = substr($signature, $pos + 2, $rLen);
    $pos += 2 + $rLen;
    if ($signature[$pos] !== "\x02") return null;
    $sLen = ord($signature[$pos + 1]);
    $s = substr($signature, $pos + 2, $sLen);

    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $rawSig = $r . $s;

    return $unsignedToken . '.' . base64UrlEncode($rawSig);
}

function encryptPayloadWebPush($p256dhBase64Url, $authBase64Url, $payloadText) {
    $clientPubKey = base64UrlDecode($p256dhBase64Url);
    $clientAuth = base64UrlDecode($authBase64Url);

    // Generate local EC P-256 key pair
    $res = openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    if (!$res) return null;

    $details = openssl_pkey_get_details($res);
    $localPubX = $details['ec']['x'];
    $localPubY = $details['ec']['y'];
    $localPubKeyRaw = "\x04" . $localPubX . $localPubY;

    // Convert client public key to PEM
    $clientPubPem = "-----BEGIN PUBLIC KEY-----\n" .
        chunk_split(base64_encode("\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" . $clientPubKey), 64, "\n") .
        "-----END PUBLIC KEY-----";

    $clientKeyRes = openssl_pkey_get_public($clientPubPem);
    if (!$clientKeyRes) return null;

    $sharedSecret = openssl_pkey_derive($clientKeyRes, $res, 256);
    if (!$sharedSecret) return null;

    $salt = random_bytes(16);
    $keyInfo = "WebPush: info\0" . $clientPubKey . $localPubKeyRaw;

    $ikmPrk = hash_hmac('sha256', $sharedSecret, $clientAuth, true);
    $ikm = hash_hkdf('sha256', $ikmPrk, 32, $keyInfo, '');
    $prk = hash_hkdf('sha256', $ikm, 32, '', $salt);

    $cek = hash_hkdf('sha256', $prk, 16, "Content-Encoding: aes128gcm\0", '');
    $nonce = hash_hkdf('sha256', $prk, 12, "Content-Encoding: nonce\0", '');

    $plaintext = $payloadText . "\x02";
    $tag = '';
    $ciphertext = openssl_encrypt($plaintext, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($ciphertext === false) return null;

    $rs = "\x00\x00\x10\x00";
    $idlen = chr(strlen($localPubKeyRaw));

    return $salt . $rs . $idlen . $localPubKeyRaw . $ciphertext . $tag;
}

$payloadJson = json_encode([
    'title' => $title,
    'body' => $messageBody,
    'icon' => $icon,
    'badge' => '/logo.png',
    'url' => $url,
    'data' => [
        'url' => $url,
        'timestamp' => round(microtime(true) * 1000)
    ]
]);

$sent = 0;
$failed = 0;

$multiHandle = curl_multi_init();
$curlHandles = [];

foreach ($subscriptions as $sub) {
    if (empty($sub['endpoint']) || empty($sub['p256dh']) || empty($sub['auth'])) {
        $failed++;
        continue;
    }

    $parsed = parse_url($sub['endpoint']);
    if (!$parsed || empty($parsed['scheme']) || empty($parsed['host'])) {
        $failed++;
        continue;
    }

    $audience = $parsed['scheme'] . '://' . $parsed['host'];
    $jwt = createVapidJwt($audience, $vapidSubject, $vapidPrivateKeyPem);
    if (!$jwt) {
        $failed++;
        continue;
    }

    $encryptedBody = encryptPayloadWebPush($sub['p256dh'], $sub['auth'], $payloadJson);
    if (!$encryptedBody) {
        $failed++;
        continue;
    }

    $ch = curl_init($sub['endpoint']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $encryptedBody,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_HTTPHEADER => [
            'TTL: 86400',
            'Urgency: high',
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Authorization: vapid t=' . $jwt . ', k=' . $vapidPublicKey
        ]
    ]);

    curl_multi_add_handle($multiHandle, $ch);
    $curlHandles[] = ['handle' => $ch, 'endpoint' => $sub['endpoint']];
}

if (count($curlHandles) > 0) {
    $running = null;
    do {
        curl_multi_exec($multiHandle, $running);
        curl_multi_select($multiHandle);
    } while ($running > 0);

    foreach ($curlHandles as $item) {
        $ch = $item['handle'];
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($code >= 200 && $code < 300) {
            $sent++;
        } else {
            $failed++;
            if ($code === 404 || $code === 410) {
                // Delete invalid subscription from Supabase
                $delCh = curl_init($supabaseUrl . '/rest/v1/push_subscriptions?endpoint=eq.' . urlencode($item['endpoint']));
                curl_setopt($delCh, CURLOPT_CUSTOMREQUEST, 'DELETE');
                curl_setopt($delCh, CURLOPT_HTTPHEADER, [
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey
                ]);
                curl_setopt($delCh, CURLOPT_TIMEOUT, 3);
                curl_setopt($delCh, CURLOPT_RETURNTRANSFER, true);
                curl_exec($delCh);
                curl_close($delCh);
            }
        }
        curl_multi_remove_handle($multiHandle, $ch);
        curl_close($ch);
    }
}
curl_multi_close($multiHandle);

echo json_encode([
    'success' => true,
    'sent' => $sent,
    'failed' => $failed,
    'total' => count($subscriptions),
    'timestamp' => time()
]);
