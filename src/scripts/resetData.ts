import { supabase } from '../../supabase';

async function resetData() {
  // Reset member attendance and motivation fields
  const { error: memberError } = await supabase
    .from('members')
    .update({
      presences: 0,
      excusedAbsences: 0,
      unexcusedAbsences: 0,
      attendanceRate: '100%',
      score: 0,
      scoreAdjustments: []
    })
    .neq('id', ''); // update all rows

  if (memberError) {
    console.error('Error resetting members:', memberError);
    return;
  }

  // Clear audit log (budget_audit)
  const { error: auditError } = await supabase.from('budget_audit').delete().neq('id', '');
  if (auditError) {
    console.error('Error clearing audit log:', auditError);
    return;
  }

  // Clear leaderboard table if it exists
  const { error: leaderboardError } = await supabase.from('leaderboard').delete().neq('id', '');
  if (leaderboardError && leaderboardError.code !== 'PGRST115') {
    // PGRST115 = table not found, ignore
    console.error('Error clearing leaderboard:', leaderboardError);
    return;
  }

  console.log('Reset complete.');
}

resetData();
