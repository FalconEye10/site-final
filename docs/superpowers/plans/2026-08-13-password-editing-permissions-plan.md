# Implementation Plan: Restricționare Permisiuni Schimbare Parolă (Stan Ștefan Only pentru Board)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restricționarea dreptului de modificare a parolei pentru membrii din Board (`role === 'admin'`) exclusiv utilizatorului Stan Ștefan. Ceilalți admini pot modifica doar parolele membrilor simpli (`role !== 'admin'`).

**Architecture:** Se creează un utilitar centralizat de permisiuni (`src/utils/permissions.ts`) cu `isStanStefan` și `canEditMemberPassword`. Componentele `MemberDrawer.tsx`, `AddMemberModal.tsx` și `Dashboard.tsx` vor folosi aceste permisiuni pentru a bloca vizual și la nivel de handler editarea parolelor neautorizate.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide Icons.

---

### Task 1: Creare utilitar permisiuni `src/utils/permissions.ts`

**Files:**
- Create: `src/utils/permissions.ts`

- [ ] **Step 1: Creare fișier utilitar cu logica de permisiuni**

```ts
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
  // Alți admini pot schimba parola DOAR pentru membrii simpli (nu și pentru Board/admin)
  return targetMemberRole !== 'admin';
}
```

- [ ] **Step 2: Commit utilitar permisiuni**

```bash
git add src/utils/permissions.ts
git commit -m "feat: add permissions utility for password editing restrictions"
```

---

### Task 2: Aplicare restricții în `MemberDrawer.tsx`

**Files:**
- Modify: `src/components/members/MemberDrawer.tsx`

- [ ] **Step 1: Importare `canEditMemberPassword` și `isStanStefan`**

În `src/components/members/MemberDrawer.tsx`:
```ts
import { isStanStefan, canEditMemberPassword } from '../../utils/permissions';
```

- [ ] **Step 2: Protejare câmp parolă în UI și handler de salvare**

În `MemberDrawer.tsx`, calculăm permisiunea:
`const canEditPassword = canEditMemberPassword(currentUserObj, role);`

În câmpul de parolă (lângă linia 505):
Dacă `!canEditPassword`:
- Inputul primește `disabled` sau `readOnly`.
- Se afișează un badge cu lacăt 🔒: *"Doar Stan Ștefan poate modifica parola membrilor din Board"*.

În `handleSaveProfile`:
Dacă `!canEditPassword`, `profileFields.password = member.password;` pentru a preveni modificarea.

- [ ] **Step 3: Commit modificări `MemberDrawer.tsx`**

```bash
git add src/components/members/MemberDrawer.tsx
git commit -m "feat: restrict password editing in MemberDrawer to Stan Stefan for Board members"
```

---

### Task 3: Aplicare restricții în `AddMemberModal.tsx` și `Dashboard.tsx`

**Files:**
- Modify: `src/components/members/AddMemberModal.tsx`
- Modify: `src/components/dashboard/Dashboard.tsx`

- [ ] **Step 1: Restricționare parolă la creare profil nou în Board (`AddMemberModal.tsx`)**
Dacă `role === 'admin'` și `!isStanStefan(currentUserObj)`:
- Câmpul de parolă devine `readOnly` pe valoarea `'parola123'` cu mesajul că parola conturilor din Board este gestionată de Stan Ștefan.

- [ ] **Step 2: Restricționare schimbare parolă profil propriu Board în `Dashboard.tsx`**
În secțiunea de setări profil din `Dashboard.tsx`:
Dacă `effectiveUser.role === 'admin'` și `!isStanStefan(effectiveUser)`:
- Câmpul de parolă este dezactivat cu o notă explicativă.

- [ ] **Step 3: Commit `AddMemberModal.tsx` și `Dashboard.tsx`**

```bash
git add src/components/members/AddMemberModal.tsx src/components/dashboard/Dashboard.tsx
git commit -m "feat: restrict password editing for board accounts across AddMemberModal and Dashboard"
```

---

### Task 4: Verificare, Build și Git Commit / Push

**Files:**
- Run build script: `npm run build`
- Git push / update repository

- [ ] **Step 1: Rulare build pentru confirmare TypeScript fără erori**
- [ ] **Step 2: Git commit & push pe repo**
