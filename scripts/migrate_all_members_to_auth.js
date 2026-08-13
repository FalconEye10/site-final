/**
 * ==============================================================================
 * BULK AUTH MIGRATION SCRIPT: ALL MEMBERS -> SUPABASE AUTH
 * ==============================================================================
 * Migrează toți membrii din `public.members` care nu au `user_id` asociat,
 * creându-le conturi în `auth.users` și legând UUID-ul generat.
 *
 * Utilizare:
 *   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" node scripts/migrate_all_members_to_auth.js
 *   sau
 *   node scripts/migrate_all_members_to_auth.js your_service_role_key
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';

// 1. CONFIGURATION & CLIENT
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.argv[2] ||
  '';

const INITIAL_DEFAULT_PASSWORD = process.env.INITIAL_PASSWORD || 'Camena2026!';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ [EROARE] SUPABASE_SERVICE_ROLE_KEY este necesar pentru administrarea auth.users!');
  console.error('👉 Rulează cu:\n   node scripts/migrate_all_members_to_auth.js <CHEIE_SERVICE_ROLE>\n');
  console.error('sau setează variabila de mediu:\n   $env:SUPABASE_SERVICE_ROLE_KEY="<CHEIE_SERVICE_ROLE>" (PowerShell)\n   node scripts/migrate_all_members_to_auth.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrateMembers() {
  console.log('🚀 Inițiere migrare în masă a membrilor în Supabase Auth...');
  console.log(`🔗 Conectare la instanța: ${SUPABASE_URL}`);

  try {
    // 2. FETCH ALL MEMBERS WHERE user_id IS NULL
    const { data: members, error: fetchErr } = await supabase
      .from('members')
      .select('id, name, username, email, role, user_id')
      .is('user_id', null);

    if (fetchErr) {
      throw new Error(`Eroare la citirea membrilor: ${fetchErr.message}`);
    }

    if (!members || members.length === 0) {
      console.log('✅ Toți membrii au deja un cont Supabase Auth asociat (user_id este completat).');
      return;
    }

    console.log(`📋 S-au găsit ${members.length} membri fără cont Supabase Auth conectat.`);
    console.log('------------------------------------------------------------');

    let migratedCount = 0;
    let failedCount = 0;

    // Cache pre-existent users if needed
    let existingAuthUsers = [];
    try {
      const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      existingAuthUsers = userList?.users || [];
    } catch {
      // ignore
    }

    for (const member of members) {
      const username = (member.username || member.name || member.id)
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

      // a. Determine email: use email column if present and valid, else synthetic email
      const targetEmail =
        member.email && member.email.includes('@')
          ? member.email.trim().toLowerCase()
          : `${username}@interact-camena.internal`;

      let authUserId = null;

      try {
        // c. Call supabase.auth.admin.createUser
        const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
          email: targetEmail,
          password: INITIAL_DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: member.name,
            username: member.username || username,
            role: member.role || 'member',
            member_id: member.id,
          },
        });

        if (createErr) {
          // d. If user already exists in auth.users, find their existing ID
          if (
            createErr.message?.includes('already registered') ||
            createErr.message?.includes('already exists') ||
            createErr.status === 422
          ) {
            const foundUser = existingAuthUsers.find(
              (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
            );

            if (foundUser) {
              authUserId = foundUser.id;
            } else {
              // Try searching directly
              const { data: searchList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
              const matched = searchList?.users?.find(
                (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
              );
              if (matched) authUserId = matched.id;
            }
          }

          if (!authUserId) {
            console.error(`❌ [FAIL] Eroare la crearea Auth pentru [${username}] (${targetEmail}): ${createErr.message}`);
            failedCount++;
            continue;
          }
        } else {
          authUserId = createData.user?.id;
        }

        if (!authUserId) {
          console.error(`❌ [FAIL] Nu s-a putut obține UUID-ul pentru [${username}].`);
          failedCount++;
          continue;
        }

        // e. Update the public.members table: UPDATE members SET user_id = [AUTH_ID] WHERE id = [MEMBER_ID]
        const updatePayload = { user_id: authUserId };
        if (!member.email && targetEmail) {
          updatePayload.email = targetEmail;
        }

        const { error: updateErr } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', member.id);

        if (updateErr) {
          console.error(`⚠️ [UPDATE ERROR] Membrul ${member.id} nu a putut fi actualizat cu user_id: ${updateErr.message}`);
          failedCount++;
        } else {
          migratedCount++;
          console.log(`[OK] Created Auth account for [${username}] -> ${authUserId}`);
        }
      } catch (innerErr) {
        console.error(`❌ [EXCEPTION] Membru [${username}]:`, innerErr.message);
        failedCount++;
      }
    }

    console.log('------------------------------------------------------------');
    console.log(`🎉 Successfully migrated ${migratedCount} members to Supabase Auth.`);
    if (failedCount > 0) {
      console.log(`⚠️ ${failedCount} conturi au întâmpinat erori.`);
    }
  } catch (err) {
    console.error('❌ Eroare generală la migrare:', err);
  }
}

migrateMembers();
