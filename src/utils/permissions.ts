// ==============================================================================
// Permissions & Role Utilities (Interact Camena Piatra Neamț)
// ==============================================================================

export function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  const boardPos = (user.boardPosition || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  const isPresedinte = !boardPos.includes('vice') && (
    boardPos.includes('presedinte') ||
    boardPos.includes('președinte') ||
    boardPos.includes('president')
  );

  return (
    isPresedinte ||
    username === 'admin' ||
    username === 'stan.stefan' ||
    name.includes('stefan stan') ||
    name.includes('stan stefan')
  );
}

// Menținut pentru compatibilitate cu apelurile existente
export const isStanStefan = isSuperAdmin;

export function isBoardMember(user: any): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const committee = (user.committee || '').toLowerCase().trim();
  const boardPos = (user.boardPosition || '').toLowerCase().trim();

  return (
    role === 'admin' ||
    role === 'board' ||
    boardPos.length > 0 ||
    committee.includes('board') ||
    username === 'admin' ||
    username === 'stan.stefan'
  );
}

export function canEditMemberPassword(currentUser: any, targetMemberRole: string, targetMemberId?: string): boolean {
  if (!currentUser) return false;
  // Oricine își poate schimba PROPRIA parolă din profil
  if (targetMemberId && (currentUser.id === targetMemberId || currentUser.username === targetMemberId)) {
    return true;
  }
  if (isSuperAdmin(currentUser)) {
    return true;
  }
  // Membrii din Board / Admini pot schimba parola DOAR pentru membrii simpli (role !== 'admin')
  if (isBoardMember(currentUser)) {
    return targetMemberRole !== 'admin';
  }
  // Voluntarii simpli NU au voie să schimbe parola altor membri
  return false;
}
