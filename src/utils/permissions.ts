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

export function canEditMemberPassword(currentUser: any, targetMemberRole: string): boolean {
  if (isStanStefan(currentUser)) {
    return true;
  }
  // Alți admini pot schimba parola DOAR pentru membrii simpli (role !== 'admin')
  return targetMemberRole !== 'admin';
}
