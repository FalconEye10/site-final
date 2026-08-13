// ==============================================================================
// Permissions & Role Utilities (Interact Camena Piatra Neamț)
// ==============================================================================

export function isStanStefan(user: any): boolean {
  if (!user) return false;
  const username = (user.username || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  return (
    username === 'stan.stefan' ||
    username === 'admin' ||
    name.includes('stefan stan') ||
    name.includes('stan stefan')
  );
}

export function isBoardMember(user: any): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  const committee = (user.committee || '').toLowerCase().trim();
  const boardPos = (user.boardPosition || '').toLowerCase().trim();

  return (
    role === 'admin' ||
    boardPos.length > 0 ||
    committee.includes('board') ||
    username === 'admin' ||
    username === 'stan.stefan' ||
    name.includes('stefan stan') ||
    name.includes('stan stefan')
  );
}

export function canEditMemberPassword(currentUser: any, targetMemberRole: string): boolean {
  if (isStanStefan(currentUser)) {
    return true;
  }
  // Alți admini pot schimba parola DOAR pentru membrii simpli (role !== 'admin')
  return targetMemberRole !== 'admin';
}
