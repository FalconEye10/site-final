# Specificație de Design: Permisiuni Restricționate la Schimbarea Parolelor

## 1. Scop
Restricționarea dreptului de editare/schimbare a parolelor utilizatorilor din aplicație:
- **Stan Ștefan**: Are drepturi depline să modifice parola oricărui membru din sistem (membri simpli/voluntari și administratori din Board).
- **Ceilalți Admini**: Pot schimba parolele **doar** pentru membrii simpli (`role !== 'admin'`). Pentru membrii din Board (`role === 'admin'`), opțiunea de schimbare a parolei este blocată.

## 2. Reguli de Permisiune și Identificare

### Identificare Stan Ștefan (`isStanStefan`)
Un utilizator este identificat ca fiind Stan Ștefan dacă:
- `username` (lowercase) este `'stan.stefan'` sau `'admin'` (cont master fallback).
- `name` (lowercase) conține `'stan stefan'` sau `'stefan stan'`.

### Regula de Editare Parolă (`canEditMemberPassword`)
```ts
canEditMemberPassword(currentUser, targetMemberRole)
```
- Dacă `isStanStefan(currentUser)` este `true` -> Returnează `true` (are acces la oricine).
- Dacă `targetMemberRole === 'admin'` (membru din Board) și `currentUser` nu este Stan Ștefan -> Returnează `false` (blocat).
- Altfel (membru simplu `role !== 'admin'`) -> Returnează `true`.

## 3. Modificări UI / Componente

### 1. `src/utils/permissions.ts` (Nou Utilitar)
- Exportă funcțiile `isStanStefan(user)` și `canEditMemberPassword(currentUser, targetMemberRole)`.

### 2. `MemberDrawer.tsx`
- Importă `isStanStefan` și `canEditMemberPassword`.
- Când un admin deschide modalul de editare al unui membru:
  - Se calculează `canEditPassword = canEditMemberPassword(currentUserObj, role);`
  - Dacă `canEditPassword` este `false`:
    - Input-ul pentru Parolă devine `readOnly` sau `disabled` cu stilizare de câmp blocat.
    - Se afișează o notă explicativă cu icon de lacăt 🔒: *"Doar Stan Ștefan poate edita parolele membrilor din Board"*.
  - În handler-ul `handleSaveProfile`:
    - Dacă `!canEditPassword`, câmpul `password` din `profileFields` își păstrează valoarea inițială `member.password`, prevenind suprascrierea.

### 3. `AddMemberModal.tsx`
- Dacă un admin care nu este Stan Ștefan creează un membru nou și selectează `Rol: Board`, câmpul de parolă este blocat pe valoarea implicită (`parola123`), afișând nota că doar Stan Ștefan poate seta o parolă personalizată pentru conturile de Board.

### 4. `Dashboard.tsx` (Profil Personal)
- Când un membru al Board-ului își editează profilul propriu din setări:
  - Dacă nu este Stan Ștefan, câmpul de parolă din profil este dezactivat cu mesajul că schimbarea parolei pentru conturile de Board se face doar prin Stan Ștefan.

## 4. Plan de Verificare
- Testare manuală a încercării de modificare a parolei ca Admin obișnuit vs Stan Ștefan.
- Verificarea că parola rămâne neschimbată în Supabase la salvări neautorizate.
