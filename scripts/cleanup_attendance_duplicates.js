import fs from 'fs';

const SUPABASE_URL = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

async function main() {
  console.log('1. Fetching current members data from Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/members?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch members: ${res.status} ${res.statusText}`);
  }

  const members = await res.json();
  console.log(`Fetched ${members.length} members.`);

  // 2. Save full pre-dedup backup
  const backupPath = './scripts/backup_members_pre_dedup.json';
  fs.writeFileSync(backupPath, JSON.stringify(members, null, 2), 'utf-8');
  console.log(`✅ Complete backup saved to: ${backupPath}`);

  // 3. Identify adjustments to remove
  // Duplicate timestamps were on 2026-08-18 between 20:18:00 and 20:20:00:
  // - "Prezență (4h): Facut lampioane summers last wish" at ~20:19:30 (orig was 2026-08-17T13:58:...)
  // - "Prezență (2h): Pregătiri Summer’26 Last Wish" at ~20:18:44
  // - "Prezență (4h): Pregătiri Summer’26 Last Wish" at ~20:18:56 (orig was 2026-08-18T13:29:...)
  
  const updates = [];

  for (const m of members) {
    const adjustments = Array.isArray(m.scoreAdjustments) ? m.scoreAdjustments : [];
    if (adjustments.length === 0) continue;

    const keptAdjustments = [];
    const removedAdjustments = [];
    let removedHours = 0;

    for (const adj of adjustments) {
      const dateStr = adj.date || '';
      const reason = adj.reason || '';

      const isSpuriousBurst = dateStr.startsWith('2026-08-18T20:18:') || dateStr.startsWith('2026-08-18T20:19:');
      const isLampioaneDuplicate = isSpuriousBurst && reason.includes('Facut lampioane summers last wish');
      const isPregatiriDuplicate = isSpuriousBurst && reason.includes('Pregătiri Summer’26 Last Wish');

      if (isLampioaneDuplicate || isPregatiriDuplicate) {
        removedAdjustments.push(adj);
        // Deduce hours from reason, e.g. "Prezență (4h): ..."
        const hoursMatch = reason.match(/\((\d+(?:\.\d+)?)h\)/);
        if (hoursMatch) {
          removedHours += parseFloat(hoursMatch[1]);
        }
      } else {
        keptAdjustments.push(adj);
      }
    }

    if (removedAdjustments.length > 0) {
      const newScore = keptAdjustments.reduce((sum, a) => sum + (Number(a.points) || 0), 0);
      const oldScore = typeof m.score === 'number' ? m.score : adjustments.reduce((sum, a) => sum + (Number(a.points) || 0), 0);
      const stats = { ...(m.stats || {}) };
      const oldHours = Number(stats.hours) || 0;
      stats.hours = Math.max(0, oldHours - removedHours);

      updates.push({
        id: m.id,
        name: m.name,
        oldScore,
        newScore,
        removedPoints: oldScore - newScore,
        oldHours,
        newHours: stats.hours,
        removedAdjustmentsCount: removedAdjustments.length,
        removedAdjustments,
        keptAdjustments,
        updatedStats: stats
      });
    }
  }

  console.log(`\nFound ${updates.length} members with duplicate adjustments.`);
  console.log('------------------------------------------------------------');

  for (const u of updates) {
    console.log(`[${u.id}] ${u.name}: Score ${u.oldScore} -> ${u.newScore} (-${u.removedPoints} pts) | Hours ${u.oldHours} -> ${u.newHours} | Removed ${u.removedAdjustmentsCount} items`);
    for (const r of u.removedAdjustments) {
      console.log(`   x Removed [${r.date}] ${r.points} pct | "${r.reason}"`);
    }
  }

  // 4. Perform updates in Supabase
  console.log('\nApplying updates to Supabase...');
  for (const u of updates) {
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${u.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        score: u.newScore,
        scoreAdjustments: u.keptAdjustments,
        stats: u.updatedStats
      })
    });

    if (!patchRes.ok) {
      console.error(`❌ Failed to update ${u.id}: ${patchRes.status} ${patchRes.statusText}`);
    } else {
      console.log(`✅ Successfully updated [${u.id}] ${u.name}`);
    }
  }

  console.log('\nAll updates completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
