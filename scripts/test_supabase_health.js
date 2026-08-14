import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsuxzfblbkqpcolujdlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU'
);

async function testAll() {
  const tables = [
    'members',
    'payments',
    'treasury_payments',
    'budget_transactions',
    'score_audit_logs',
    'activity_logs',
    'member_kudos',
    'events',
    'news',
    'proposals',
    'suggestions',
    'forum_posts',
    'repartizari',
    'push_subscriptions',
    'notifications',
  ];

  console.log('=== 1. TESTING TABLE ACCESS (SELECT, INSERT, UPDATE) ===');
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.error(`[FAIL] Table '${t}':`, error.message, '| code:', error.code);
      } else {
        console.log(`[PASS] Table '${t}': OK (${data ? data.length : 0} rows found)`);
      }
    } catch (e) {
      console.error(`[EXCEPTION] Table '${t}':`, e.message);
    }
  }

  console.log('\n=== 2. TESTING RPC: authenticate_member ===');
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('authenticate_member', {
      p_identifier: 'stan.stefan',
      p_password: 'Camena-Admin-Stefan26!',
    });
    if (rpcErr) {
      console.error('[FAIL] RPC authenticate_member:', rpcErr.message, '| code:', rpcErr.code);
    } else {
      console.log('[PASS] RPC authenticate_member Result:', JSON.stringify(rpcRes, null, 2));
    }
  } catch (e) {
    console.error('[EXCEPTION] RPC authenticate_member:', e.message);
  }

  console.log('\n=== 3. TESTING RPC: wrong password check ===');
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('authenticate_member', {
      p_identifier: 'stan.stefan',
      p_password: 'wrong_password_123',
    });
    if (rpcErr) {
      console.error('[FAIL] RPC wrong password test error:', rpcErr.message);
    } else {
      console.log('[PASS] RPC wrong password handled correctly:', rpcRes);
    }
  } catch (e) {
    console.error('[EXCEPTION] RPC wrong pass:', e.message);
  }
}

testAll();
