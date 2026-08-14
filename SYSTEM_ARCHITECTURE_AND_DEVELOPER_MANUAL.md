# 🏛️ INTERACT CAMENA — MASTER SYSTEM ARCHITECTURE & DEVELOPER MANUAL
> **Versiune Sistem:** `v7.7.0` | **Data:** August 2026  
> **Destinație:** Documentație Tehnică de Nivel Enterprise pentru Dezvoltatori & Agenți AI (SSOT - Single Source of Truth)  
> **Mediu Tehnologic:** React 19, TypeScript, Vite 6, Supabase (PostgreSQL 15), TailwindCSS, Framer Motion, jsPDF

---

## 📑 CUPRINSUL DOSARULUI
1. [Viziunea & Scopul Platformei](#1-viziunea--scopul-platformei)
2. [Configurații de Mediu & Variabile Globale](#2-configurații-de-mediu--variabile-globale)
3. [Arhitectura Bazei de Date PostgreSQL (Schemele `public` și `private`)](#3-arhitectura-bazei-de-date-postgresql-schemele-public-și-private)
4. [Mecanismul de Securitate, Seiful Criptografic & Procedurile Stocate (RPC)](#4-mecanismul-de-securitate-seiful-criptografic--procedurile-stocate-rpc)
5. [Fluxul Complet de Autentificare, Gestiunea Sesiunii & Token-uri](#5-fluxul-complet-de-autentificare-gestiunea-sesiunii--token-uri)
6. [Matricea de Roluri, Permisiuni & Drepturi de Acces (RBAC)](#6-matricea-de-roluri-permisiuni--drepturi-de-acces-rbac)
7. [Algoritmi Nucleu & Logici de Business (Finanțe, Gamificare, Prezențe)](#7-algoritmi-nucleu--logici-de-business-finanțe-gamificare-prezențe)
8. [Arborescența Fișierelor, Componentelor & Serviciilor](#8-arborescența-fișierelor-componentelor--serviciilor)
9. [Ghid Operațional: Mentenanță, Rulare Locală & Deploy Vercel](#9-ghid-operațional-mentenanță-rulare-locală--deploy-vercel)
10. [Registrul Oficial de Credențiale (Cele 57 de Conturi Configurate)](#10-registrul-oficial-de-credențiale-cele-57-de-conturi-configurate)

---

## 1. VIZIUNEA & SCOPUL PLATFORMEI

Platforma **Interact Club Camena Piatra Neamț** este un sistem organizațional integrat (ERP & Gamified Community Portal) conceput pentru a digitaliza și securiza întreaga activitate a clubului compus din **57 de membri activi** (10 membri în Board-ul de Conducere și 47 de voluntari).

### Obiective Majore:
* **Trezorerie & Chitanțier Digital Oficial:** Calcul automatizat al cotizațiilor (15 RON/lună), emiterea de chitanțe PDF securizate cu dublă semnătură olografă digitală (Trezorier + Membru), evidența soldului și a tranzacțiilor de venituri/cheltuieli.
* **Catalog de Prezențe & Activitate:** Monitorizarea participării la ședințe și proiecte, calculul ratei de prezență și al orelor cumulate de voluntariat.
* **Gamificare & Meritocrație:** Clasament live (Leaderboard), categorii de experiență (*Recrut Nou*, *Voluntar Activ*, *Senior Voluntar*, *Ambasador Camena*), deblocare automată de insigne (Milestones) și registru de audit imutabil pentru orice ajustare de punctaj.
* **Comunitate & Inițiativă:** Forum intern, depunere formală a propunerilor de proiecte, trimitere de aprecieri între colegi (*Kudos*) și cutie digitală de sugestii.
* **Securitate de Nivel Enterprise:** Izolarea credențialelor într-o schemă privată (`private.member_credentials`), criptare asimetrică prin **bcrypt** (`pgcrypto`), zero dependență de servicii SMTP externe vulnerabile la rate-limiting.

---

## 2. CONFIGURAȚII DE MEDIU & VARIABILE GLOBALE

### 2.1. Conexiunea Supabase (`src/supabase.ts`)
* **`SUPABASE_URL`**: `https://lsuxzfblbkqpcolujdlo.supabase.co`
* **`SUPABASE_ANON_KEY`**: Cheia publică JWT pentru acces anonim restricționat prin RLS.
* **Clientul Supabase:**
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  ```

### 2.2. Configurația de Mentenanță (`src/config/maintenance.ts`)
* **`MAINTENANCE_MODE`** (`boolean`):
  * `false` $\rightarrow$ Aplicația este deschisă și funcționează normal.
  * `true` $\rightarrow$ Aplicația montează `MaintenanceOverlay.tsx`, blocând accesul publicului larg.
* **`MAINTENANCE_INFO`** (`object`): Conține `title`, `subtitle`, `message` și `notice` afișate în ecranul de mentenanță.

### 2.3. Constante Financiare & Parametri de Business (`src/utils/finance.ts`)
* **`COTIZATIE_LUNARA`**: `15` (RON / lună)
* **`INITIAL_COLLECTION_START`**: `"2026-08-01"` (Data de start a mandatului curent pe platformă)

---

## 3. ARHITECTURA BAZEI DE DATE POSTGRESQL (SCHEMELE `PUBLIC` ȘI `PRIVATE`)

### 3.1. Schema `private` (Seiful Criptografic)
Tabelă protejată prin permisiuni PostgreSQL și RLS:
```sql
CREATE TABLE private.member_credentials (
  member_id TEXT PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  temp_password TEXT,
  must_change_password BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE private.member_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_direct_client_access" ON private.member_credentials FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);
REVOKE ALL ON private.member_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.member_credentials TO postgres, service_role;
```

### 3.2. Schema `public` (Tabelele Aplicației)

#### 1. `public.members` (Catalogul Membrilor)
* `id` (`TEXT`, PK): Ex: `M001`, `M061`, `SYS_AUDIT_LOGS`
* `name` (`TEXT`): Nume și prenume complet
* `username` (`TEXT`, UNIQUE): Ex: `stan.stefan`, `andras.andreea`
* `email` (`TEXT`): Ex: `stan.stefan@interact-camena.internal` sau `andras.andreea@club.ro`
* `phone` (`TEXT`): Număr de telefon
* `role` (`TEXT`): `'admin'` sau `'member'`
* `boardPosition` (`TEXT` | NULL): Ex: `'Trezorier'`, `'Presedinte'`, `'Secretar'`, `'Agent PR'`
* `status` (`TEXT`): `'active'` sau `'passive'`
* `joinDate` (`TIMESTAMPTZ`): Data înscrierii în club
* `totalPaid` (`NUMERIC`): Total cotizații achitate în RON
* `totalDebt` (`NUMERIC`): Datorie calculată
* `score` (`INTEGER`): Punctaj acumulat în gamificare
* `presences` (`INTEGER`): Număr de prezențe validate
* `excusedAbsences` (`INTEGER`): Învoiri motivate
* `unexcusedAbsences` (`INTEGER`): Absențe nemotivate
* `hours` (`NUMERIC`): Ore de voluntariat pe teren
* `attendanceRate` (`TEXT`): Ex: `'100%'`
* `qualification` (`TEXT`): `'Excelent'`, `'Activ'`, `'Pasiv'`
* `avatar` (`TEXT`): URL avatar
* `nickname` (`TEXT`): Poreclă / Prenume scurt
* `stats` (`JSONB`): Obiect pentru metadate extinse, insigne și loguri de audit sistem
* `scoreAdjustments` (`JSONB`): Array cu istoricul ajustărilor de punctaj
* `customFields` (`JSONB`): Câmpuri adiționale
* `has_seen_tutorial` (`BOOLEAN`): Stare parcurgere tutorial introductiv
* `login_count` (`INTEGER`): Contor autentificări

#### 2. `public.payments` (Chitanțier & Trezorerie)
* `id` (`TEXT`, PK): Format `CHIT-YYYY-MM-XXX` (ex: `CHIT-2026-02-005`)
* `memberId` (`TEXT`, FK): ID-ul membrului plătitor
* `memberName` (`TEXT`): Numele membrului
* `amount` (`NUMERIC`): Suma încasată (RON)
* `month` (`TEXT`): Lunile stinse (ex: `"August 2026"`, `"Ianuarie, Februarie 2026"`)
* `date` (`TIMESTAMPTZ`): Data și ora încasării
* `collector` (`TEXT`): Numele trezorierului care a încasat
* `status` (`TEXT`): `'Emis'` sau `'Anulat'`
* `memberSignature` (`TEXT`): Semnătura grafică olografă a voluntarului (Base64 JPEG)
* `treasurerSignature` (`TEXT`): Semnătura grafică a trezorierului (Base64 JPEG)
* `createdAt` (`TIMESTAMPTZ`): Data creării înregistrării

#### 3. `public.events` (Calendar Evenimente & Ședințe)
* `id` (`TEXT`, PK): ID unic sau slug
* `title` (`TEXT`): Titlul evenimentului
* `description` (`TEXT`): Descrierea activității
* `date` (`TEXT`): Data desfășurării (`YYYY-MM-DD`)
* `time` (`TEXT`): Ora de start (`HH:mm`)
* `location` (`TEXT`): Locația fizică sau link online
* `type` (`TEXT`): `'meeting'`, `'project'`, `'social'`, `'other'`
* `rsvps` (`JSONB`): Harta prezențelor `{ [memberId]: 'present' | 'excused' | 'unexcused' }`
* `attendanceClosed` (`BOOLEAN`): Blocare catalog după încheierea ședinței
* `committees` (`JSONB`): Echipe de lucru și repartizări pe sarcini

#### 4. `public.budget_transactions` (Registrul de Venituri & Cheltuieli)
* `id` (`TEXT`, PK): UUID
* `type` (`TEXT`): `'income'` (Venit) sau `'expense'` (Cheltuială)
* `amount` (`NUMERIC`): Valoare în RON
* `category` (`TEXT`): `'Cotizatii'`, `'Sponsorizari'`, `'Materiale'`, `'Logistica'`, etc.
* `description` (`TEXT`): Justificarea tranzacției
* `date` (`TIMESTAMPTZ`): Data tranzacției
* `receiptId` (`TEXT` | NULL): Referință chitanță dacă este asociată unei plăți

#### 5. `public.score_audit_logs` (Jurnal Imutabil de Audit Punctaj)
* `id` (`TEXT`, PK): Format `audit_timestamp_random`
* `adminId` (`TEXT`): ID-ul administratorului care a efectuat modificarea
* `adminName` (`TEXT`): Numele administratorului
* `adminUsername` (`TEXT`): Username admin
* `targetMemberId` (`TEXT`): Membrul modificat
* `targetMemberName` (`TEXT`): Numele membrului
* `action` (`TEXT`): `'ADDED'`, `'SUBTRACTED'`, `'REVERTED'`, `'MEMBER_CREATE'`, `'MEMBER_DELETE'`, `'PASSWORD_CHANGE'`
* `points` (`INTEGER`): Numărul de puncte acordate/retrase
* `reason` (`TEXT`): Justificare obligatorie
* `createdAt` (`TIMESTAMPTZ`): Timestamp ireversibil

#### 6. `public.news` (Comunicate Oficiale & Știri)
* `id` (`TEXT`, PK): UUID
* `title` (`TEXT`): Titlul comunicatului
* `content` (`TEXT`): Textul complet / Markdown
* `author` (`TEXT`): Numele autorului
* `authorRole` (`TEXT`): Funcția autorului (ex: `'Director PR'`)
* `priority` (`TEXT`): `'normal'` sau `'urgent'`
* `tags` (`TEXT[]`): Array etichete
* `createdAt` (`TIMESTAMPTZ`): Data publicării

#### 7. `public.forum_posts` (Forumul Comunității)
* `id` (`TEXT`, PK): UUID
* `title` (`TEXT`): Titlul discuției
* `content` (`TEXT`): Conținutul postării
* `category` (`TEXT`): Categorie forum
* `authorId` (`TEXT`), `authorName` (`TEXT`), `authorAvatar` (`TEXT`)
* `likesCount` (`INTEGER`): Număr aprecieri
* `comments` (`JSONB`): Array comentarii `{ id, authorName, authorAvatar, content, date }`
* `createdAt` (`TIMESTAMPTZ`)

#### 8. `public.proposals` (Propuneri de Proiecte)
* `id` (`TEXT`, PK): UUID
* `memberId` (`TEXT`), `memberName` (`TEXT`)
* `title` (`TEXT`): Numele proiectului propus
* `description` (`TEXT`): Descrierea și obiectivele
* `budgetRequired` (`NUMERIC`): Buget estimat
* `status` (`TEXT`): `'În revizuire'`, `'Aprobat'`, `'Respins'`
* `createdAt` (`TIMESTAMPTZ`)

#### 9. `public.kudos` (Aprecieri între Colegi)
* `id` (`TEXT`, PK): UUID
* `fromId` (`TEXT`), `fromName` (`TEXT`): Expeditor
* `toId` (`TEXT`), `toName` (`TEXT`): Destinatar
* `message` (`TEXT`): Mesajul de felicitare
* `category` (`TEXT`): Categoria aprecierii (ex: `'Leadership'`, `'Implicare'`, `'Creativitate'`)
* `createdAt` (`TIMESTAMPTZ`)

#### 10. `public.suggestions` (Cutia Digitală de Sugestii)
* `id` (`TEXT`, PK): UUID
* `memberId` (`TEXT` | NULL): ID membru dacă nu e anonim
* `isAnonymous` (`BOOLEAN`): Indicator anonimat
* `content` (`TEXT`): Textul sugestiei
* `status` (`TEXT`): `'Nou'`, `'În analiză'`, `'Rezolvat'`
* `createdAt` (`TIMESTAMPTZ`)

#### 11. `public.push_subscriptions` (Notificări Web Push)
* `id` (`TEXT`, PK): UUID
* `memberId` (`TEXT`): ID membru abonat
* `subscription` (`JSONB`): Obiect PushSubscription din browser
* `updatedAt` (`TIMESTAMPTZ`)

---

## 4. MECANISMUL DE SECURITATE, SEIFUL CRIPTOGRAFIC & PROCEDURILE STOCATE (RPC)

Sistemul elimină complet dependența de endpoint-urile interne GoTrue (`auth.users`), utilizând proceduri stocate native PostgreSQL securizate prin `SECURITY DEFINER` și protejate împotriva injectărilor prin `search_path`:

```sql
-- 1. AUTENTIFICARE SECURIZATĂ (Apelabilă de anon și authenticated)
CREATE OR REPLACE FUNCTION public.authenticate_member(
  p_identifier TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
  v_cred private.member_credentials%ROWTYPE;
  v_clean_ident TEXT;
  v_norm_ident TEXT;
BEGIN
  IF p_identifier IS NULL OR length(trim(p_identifier)) = 0 OR p_password IS NULL OR length(trim(p_password)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Te rugăm să introduci numele de utilizator și parola.');
  END IF;

  v_clean_ident := lower(trim(p_identifier));
  v_norm_ident := lower(regexp_replace(v_clean_ident, '[^a-z0-9]', '', 'g'));

  SELECT * INTO v_member
  FROM public.members
  WHERE lower(username) = v_clean_ident
     OR lower(email) = v_clean_ident
     OR lower(id) = v_clean_ident
     OR lower(regexp_replace(coalesce(username, ''), '[^a-z0-9]', '', 'g')) = v_norm_ident
     OR lower(regexp_replace(coalesce(name, ''), '[^a-z0-9]', '', 'g')) = v_norm_ident
  ORDER BY (CASE WHEN lower(username) = v_clean_ident THEN 1 WHEN lower(id) = v_clean_ident THEN 2 ELSE 3 END)
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nume de utilizator sau email incorect.');
  END IF;

  SELECT * INTO v_cred FROM private.member_credentials WHERE member_id = v_member.id;

  IF v_cred.member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contul nu are parola inițializată. Contactează administratorul.');
  END IF;

  IF v_cred.password_hash != crypt(p_password, v_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola introdusă este incorectă.');
  END IF;

  UPDATE private.member_credentials SET last_login = NOW() WHERE member_id = v_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'member', to_jsonb(v_member),
    'must_change_password', v_cred.must_change_password
  );
END;
$$;

-- 2. SCHIMBARE PAROLĂ PROPRIE (Doar utilizatori autentificați)
CREATE OR REPLACE FUNCTION public.change_member_password(
  p_member_id TEXT,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  v_cred private.member_credentials%ROWTYPE;
BEGIN
  IF length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Noua parolă trebuie să aibă cel puțin 6 caractere.');
  END IF;

  SELECT * INTO v_cred FROM private.member_credentials WHERE member_id = p_member_id;

  IF v_cred.member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Membrul nu a fost găsit.');
  END IF;

  IF v_cred.password_hash != crypt(p_old_password, v_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola actuală este incorectă.');
  END IF;

  UPDATE private.member_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      must_change_password = false,
      updated_at = NOW()
  WHERE member_id = p_member_id;

  RETURN jsonb_build_object('success', true, 'message', 'Parola a fost modificată cu succes!');
END;
$$;

-- 3. RESETARE PAROLĂ DE CĂTRE ADMIN (Doar utilizatori autentificați cu rol de admin)
CREATE OR REPLACE FUNCTION public.admin_set_member_password(
  p_admin_member_id TEXT,
  p_target_member_id TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  v_admin public.members%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.members WHERE id = p_admin_member_id;
  IF v_admin.id IS NULL OR lower(v_admin.role) != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Neautorizat: Doar administratorii pot reseta parole.');
  END IF;

  IF length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola trebuie să aibă cel puțin 6 caractere.');
  END IF;

  INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
  VALUES (p_target_member_id, crypt(p_new_password, gen_salt('bf', 10)), true, NOW())
  ON CONFLICT (member_id) DO UPDATE SET
    password_hash = crypt(p_new_password, gen_salt('bf', 10)),
    must_change_password = true,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Parola a fost setată cu succes!');
END;
$$;
```

---

## 5. FLUXUL COMPLET DE AUTENTIFICARE, GESTIUNEA SESIUNII & TOKEN-URI

1. **Inițiere Autentificare:**
   * Utilizatorul completează `WelcomeLogin.tsx`.
   * Formularul apelează `login(identifier, password)` din `AuthContext.tsx`.
2. **Execuție Remote Procedure Call:**
   * `const { data, error } = await supabase.rpc('authenticate_member', { p_identifier, p_password });`
   * Baza de date verifică hash-ul **bcrypt**. Dacă parola nu este exactă, returnează eroare fără a genera sesiune.
3. **Stabilirea Sesiunii Locale:**
   * Pe succes, profilul este stocat: `localStorage.setItem('active_member_session', JSON.stringify(member))`.
   * Stările `session`, `user` și `memberProfile` din `AuthContext` sunt populate.
4. **Reîmprospătare & Sincronizare la Refresh (`F5`):**
   * La montare, `AuthContext` citește `active_member_session`, re-validează datele în timp real prin `supabase.from('members').select('*').eq('id', parsed.id).single()` și actualizează starea locală.
5. **Deconectare (`logout()`):**
   * `localStorage.removeItem('active_member_session')`
   * Resetare stări `setSession(null)`, `setUser(null)`, `setMemberProfile(null)`.

---

## 6. MATRICEA DE ROLURI, PERMISIUNI & DREPTURI DE ACCES (RBAC)

Verificarea drepturilor este centralizată în `src/utils/permissions.ts`:

```typescript
export function isBoardMember(member: any): boolean {
  if (!member) return false;
  const role = (member.role || '').toLowerCase();
  const boardPos = (member.boardPosition || '').trim();
  return role === 'admin' || boardPos.length > 0;
}

export function canEditMemberPassword(currentUser: any, targetMemberRole: string): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return isBoardMember(currentUser);
}
```

### Matricea Drepturilor de Acces:

| Modul & Funcționalitate | Voluntar (`member`) | Membru Board (`admin`) | Trezorier / SuperAdmin (`M061` Stan Ștefan) |
| :--- | :---: | :---: | :---: |
| **Vizualizare Dashboard & Profil Propriu** | ✅ | ✅ | ✅ |
| **Schimbare Parolă Proprie din Profil** | ✅ | ✅ | ✅ |
| **Descărcare Chitanțe PDF Personale** | ✅ | ✅ | ✅ |
| **Trimitere Aprecieri (Kudos) & Sugestii** | ✅ | ✅ | ✅ |
| **Postare & Comentarii pe Forum** | ✅ | ✅ | ✅ |
| **Depunere Propuneri de Proiecte Noi** | ✅ | ✅ | ✅ |
| **Adăugare Membru Nou + Generare Parolă** | ❌ | ✅ | ✅ |
| **Editare Prezențe, Ore și Date Membri** | ❌ | ✅ | ✅ |
| **Ajustare Punctaje de Gamificare (Scoring)**| ❌ | ✅ | ✅ |
| **Resetare Parolă pentru Oricare Alt Membru**| ❌ | ✅ | ✅ |
| **Publicare Știri & Comunicate Oficiale** | ❌ | ✅ | ✅ |
| **Aprobare / Respingere Propuneri Proiecte** | ❌ | ✅ | ✅ |
| **Încasare Cotizație & Dublă Semnătură Digitală**| ❌ | ❌ | ✅ **(Exclusiv Trezorier)** |
| **Anulare Chitanță / Revert Plată** | ❌ | ❌ | ✅ **(Exclusiv Trezorier)** |
| **Gestiune Registru Buget Trezorerie** | ❌ | ❌ | ✅ **(Exclusiv Trezorier)** |
| **Ștergere Definitivă Membru din Baza de Date** | ❌ | ❌ | ✅ **(Exclusiv Trezorier)** |

---

## 7. ALGORITMI NUCLEU & LOGICI DE BUSINESS (FINANȚE, GAMIFICARE, PREZENȚE)

### 7.1. Algoritmul Financiar (`src/utils/finance.ts`)
* **Cotizație:** 15 RON / lună.
* **Start Colectare:** 1 August 2026 (`INITIAL_COLLECTION_START = "2026-08-01"`).
* **Formula Datoriei:**
  $$\text{Luni Datorate} = \max(0, (\text{An Curent} - \text{An Start}) \times 12 + (\text{Luna Curentă} - \text{Luna Start}) + 1)$$
  $$\text{Total Datorat} = \text{Luni Datorate} \times 15\text{ RON}$$
  $$\text{Datorie Dinamică} = \max(0, \text{Total Datorat} - \text{totalPaid})$$

### 7.2. Algoritmul de Calificare și Prezență
$$\text{Procentaj} = \frac{\text{Prezențe} + \text{Învoiri Motivate}}{\text{Prezențe} + \text{Învoiri Motivate} + \text{Absențe Nemotivate}} \times 100\%$$
* $\ge 85\% \rightarrow$ **Excelent** (Badge Verde)
* $65\% - 84\% \rightarrow$ **Activ** (Badge Albastru)
* $< 65\% \rightarrow$ **Pasiv / Risc** (Badge Roșu)

### 7.3. Sanitizarea Payload-urilor (`src/utils/supabaseService.ts`)
Pentru a preveni erorile de tip `PGRST204: Could not find the column of 'members'`, toate operațiunile de `update` și `upsert` trec prin funcția `sanitizeMemberPayload`:
```typescript
const VALID_MEMBER_COLUMNS = new Set([
  'id', 'name', 'email', 'phone', 'role', 'committee', 'status', 'joinDate',
  'totalPaid', 'score', 'avatar', 'stats', 'scoreAdjustments', 'customFields',
  'createdAt', 'boardPosition', 'address', 'payments', 'attendanceRate',
  'qualification', 'totalDebt', 'nickname', 'presences', 'excusedAbsences',
  'unexcusedAbsences', 'username', 'login_count', 'has_seen_tutorial',
  'user_id', 'hours'
]);
```

---

## 8. ARBORESCENȚA FIȘIERELOR, COMPONENTELOR & SERVICIILOR

```
github-source/
│
├── package.json                         # Configurare versiune (7.7.0) si dependinte
├── vite.config.ts                       # Configurare bundler Vite
├── tailwind.config.js                   # Tema vizuala si culorile oficiale
├── tsconfig.json                        # Reguli TypeScript
├── vercel.json                          # Routing SPA Vercel
├── index.html                           # Entry-point HTML cu fonturi Google
├── FIX_SUPABASE_SECURITY_AND_PASSWORDS.sql # Script SQL complet de securitate si RLS
├── MIGRATE_ALL_MEMBERS_TO_AUTH.sql      # Script populare credentiale
│
├── scripts/
│   ├── generate_credentials.js          # Generator parole distincte
│   ├── generate_security_fix_sql.js     # Generator script SQL securizat
│   ├── simulate_full_platform_test.js   # Suita de teste si simulari automate
│   ├── test_supabase_health.js          # Diagnoza live tabele si functii RPC
│   └── output/
│       └── credentials.json             # Fisiere JSON cu toate datele conturilor
│
└── src/
    ├── main.tsx                         # Bootstrap React si context providers
    ├── App.tsx                          # Router principal si verificare mentenanta
    ├── index.css                        # Directive CSS si clase utilitare
    ├── supabase.ts                      # Instanta Supabase Client
    │
    ├── config/
    │   └── maintenance.ts               # MAINTENANCE_MODE (true/false)
    │
    ├── context/
    │   ├── AuthContext.tsx              # Autentificare, sesiune, login/logout, refreshProfile
    │   └── LanguageContext.tsx          # Localizare / limba
    │
    ├── utils/
    │   ├── finance.ts                   # Calcul datorie, registru calendaristic lunar
    │   ├── permissions.ts               # Evaluare drepturi Board si permisiuni
    │   ├── supabaseService.ts           # Serviciu CRUD pentru toate tabelele
    │   ├── milestones.ts                # Calcul insigne si niveluri de gamificare
    │   ├── pdfGenerator.ts              # Generare chitanțe PDF cu 2 semnături
    │   ├── pushNotifications.ts         # Notificări Web Push
    │   └── xlsx.ts                      # Export rapoarte Excel
    │
    └── components/
        ├── auth/
        │   └── WelcomeLogin.tsx         # Ecran principal de conectare
        ├── common/
        │   └── MaintenanceOverlay.tsx   # Ecran de blocare in mentenanță
        ├── layout/
        │   ├── Header.tsx               # Bara de antet cu profil si notificari
        │   └── Sidebar.tsx              # Meniu navigare module
        ├── dashboard/
        │   ├── Dashboard.tsx            # Nucleul platformei si managementul taburilor
        │   ├── CommandPalette.tsx       # Căutare rapidă Spotlight (Cmd+K)
        │   ├── NotificationsDropdown.tsx# Panou alerte live
        │   ├── PlatformTutorialModal.tsx# Ghid introductiv pentru membri noi
        │   ├── VolunteerSpotlightCard.tsx # Evidențierea voluntarului lunii
        │   ├── finance/
        │   │   └── SignaturePad.tsx     # Canvas tactil preluare semnătură
        │   └── views/
        │       ├── MembersView.tsx      # Roster membri (Carduri / Tabel)
        │       ├── AttendanceView.tsx   # Catalog prezențe
        │       ├── EventsView.tsx       # Calendar evenimente și RSVP
        │       ├── LeaderboardView.tsx  # Clasament gamificare
        │       ├── BudgetView.tsx       # Trezorerie și balanță financiară
        │       ├── MasterAuditView.tsx  # Jurnal complet de audit
        │       ├── NewsView.tsx         # Flux știri
        │       ├── NewsAdminForm.tsx    # Editor publicare știri PR
        │       ├── ForumView.tsx        # Forum comunitate
        │       ├── IdeasView.tsx        # Panou de idei
        │       ├── ProjectProposalsView.tsx # Proiecte oficiale depuse
        │       ├── ProjectProposalForm.tsx # Formular depunere proiect
        │       ├── KudosView.tsx        # Panou aprecieri
        │       ├── RepartizareView.tsx  # Distribuire sarcini proiecte
        │       ├── SuggestionsView.tsx  # Cutie sugestii
        │       ├── ScoreAuditLogModal.tsx # Istoric ajustări puncte per membru
        │       └── ScoringReferenceGuide.tsx # Ghid oficial de acordare puncte
        ├── finance/
        │   └── PaymentModal.tsx         # Dialog încasare cotizație cu 2 semnături
        ├── members/
        │   ├── AddMemberModal.tsx       # Înregistrare membru nou + generare parolă
        │   └── MemberDrawer.tsx         # Sertar detalii membru + resetare parolă
        └── receipts/
            └── ReceiptModal.tsx         # Modal vizualizare chitanță PDF
```

---

## 9. GHID OPERAȚIONAL: MENTENANȚĂ, RULARE LOCALĂ & DEPLOY VERCEL

### 9.1. Rularea pe Localhost:
1. Asigură-te că în `src/config/maintenance.ts`:
   ```typescript
   export const MAINTENANCE_MODE = false;
   ```
2. Pornește serverul Vite:
   ```powershell
   npm run dev
   ```
3. Accesează: `http://localhost:5173/`

### 9.2. Activarea Mentenanței pe Producție (Vercel):
1. În `src/config/maintenance.ts`, setează:
   ```typescript
   export const MAINTENANCE_MODE = true;
   ```
2. Comite și trimite modificarea pe GitHub:
   ```powershell
   git add .
   git commit -m "chore: activate maintenance mode"
   git push origin main
   ```

---

## 10. REGISTRUL OFICIAL DE CREDENȚIALE (CELE 57 DE CONTURI CONFIGURATE)

### 👑 A. Membrii Board-ului de Conducere (Administratori)

| ID | Nume & Prenume | Utilizator (Login) | Funcție Oficială | Parolă Temporară Distinctă |
| :--- | :--- | :--- | :--- | :--- |
| **M061** | **Stan Ștefan** | `stan.stefan` | Trezorier / SuperAdmin | `Camena-Admin-Stefan26!` |
| **M051** | **Timofte Teodora** | `timofte.teodora` | Președinte | `Camena-Admin-8F5Q!` |
| **M028** | **Pascaru Rareș** | `pascaru.rares` | Vicepreședinte | `Camena-Admin-6H3Y!` |
| **M002** | **Popa Ioana** | `popa.ioana` | Past-President | `Camena-Admin-7K9P!` |
| **M012** | **Cacciola Anastasia** | `cacciola.anastasia` | Secretar | `Camena-Admin-3M8W!` |
| **M013** | **Căruntu Ruxandra** | `caruntu.ruxandra` | Agent PR | `Camena-Admin-9B2X!` |
| **M057** | **Popa Matei** | `popa.matei` | Director PR | `Camena-Admin-2N6V!` |
| **M023** | **Măzare Sofia** | `mazare.sofia` | Project Manager | `Camena-Admin-4R7L!` |
| **M058** | **Admin Tehnic** | `admin` | Administrator IT | `Camena-Admin-5J8D!` |
| **SYS** | **System Audit Logs** | `sys_audit_logs` | Audit Imutabil | `Camena-Sys-0000!` |

---

### 🤝 B. Voluntarii Clubului (Membri Activi)

| ID | Nume & Prenume | Utilizator (Login) | Parolă Temporară Distinctă |
| :--- | :--- | :--- | :--- |
| **M001** | Andraș Andreea | `andras.andreea` | `Camena-Vol-2427!` |
| **M003** | Abiculesei Alessia | `abiculesei.alessia` | `Camena-Vol-9909!` |
| **M004** | Paisa Anastasia | `paisa.anastasia` | `Camena-Vol-7774!` |
| **M005** | Dorneanu Mădălina | `dorneanu.madalina` | `Camena-Vol-9770!` |
| **M007** | Alungulesei Ianis | `alungulesei.ianis` | `Camena-Vol-2631!` |
| **M008** | Amătioaiei Ioana | `amatioaiei.ioana` | `Camena-Vol-8458!` |
| **M009** | Apetrei Sofia | `apetrei.sofia` | `Camena-Vol-8081!` |
| **M010** | Beșu Ioana | `besu.ioana` | `Camena-Vol-3131!` |
| **M011** | Buftea Leonardo | `buftea.leonardo` | `Camena-Vol-8960!` |
| **M014** | Ciobanu Ilinca | `ciobanu.ilinca` | `Camena-Vol-8657!` |
| **M015** | Ciurea Alex | `ciurea.alex` | `Camena-Vol-6445!` |
| **M016** | Covasan Marian | `covasan.marian` | `Camena-Vol-5592!` |
| **M017** | Crușitu Mihnea | `crusitu.mihnea` | `Camena-Vol-1028!` |
| **M018** | Enache Diana | `enache.diana` | `Camena-Vol-3141!` |
| **M019** | Filimon Teodora | `filimon.teodora` | `Camena-Vol-9330!` |
| **M020** | Ifrim Luca | `ifrim.luca` | `Camena-Vol-4349!` |
| **M021** | Ioniță Daria | `ionita.daria` | `Camena-Vol-9031!` |
| **M022** | Marunțelu Alex | `maruntelu.alex` | `Camena-Vol-2285!` |
| **M024** | Miron Maya | `miron.maya` | `Camena-Vol-4655!` |
| **M025** | Onțanu Vanessa | `ontanu.vanessa` | `Camena-Vol-2355!` |
| **M026** | Orcheanu Maria | `orcheanu.maria` | `Camena-Vol-7245!` |
| **M027** | Panainte Silviu | `panainte.silviu` | `Camena-Vol-8195!` |
| **M029** | Popa Medeea | `popa.medeea` | `Camena-Vol-7349!` |
| **M030** | Radu Sabin | `radu.sabin` | `Camena-Vol-3044!` |
| **M031** | Radu Teodora | `radu.teodora` | `Camena-Vol-5741!` |
| **M032** | Răducanu Maya | `raducanu.maya` | `Camena-Vol-6541!` |
| **M033** | Șerban Cătălin | `serban.catalin` | `Camena-Vol-9144!` |
| **M034** | Tănasă Teodora | `tanasa.teodora` | `Camena-Vol-6466!` |
| **M035** | Zugravu Rareș | `zugravu.rares` | `Camena-Vol-6369!` |
| **M036** | Alungulesei Darius | `alungulesei.darius` | `Camena-Vol-2780!` |
| **M037** | Ariton Bogdan | `ariton.bogdan` | `Camena-Vol-4972!` |
| **M038** | Corbu Patrick | `corbu.patrick` | `Camena-Vol-5085!` |
| **M039** | Huhulea Miruna | `huhulea.miruna` | `Camena-Vol-9266!` |
| **M040** | Lăpușneanu David | `lapusneanu.david` | `Camena-Vol-1981!` |
| **M041** | Lupu Miruna | `lupu.miruna` | `Camena-Vol-2406!` |
| **M042** | Manole Iustin | `manole.iustin` | `Camena-Vol-9132!` |
| **M043** | Micu Ingrid | `micu.ingrid` | `Camena-Vol-6022!` |
| **M044** | Mihuț Alexandra | `mihut.alexandra` | `Camena-Vol-7939!` |
| **M045** | Negru Maia | `negru.maia` | `Camena-Vol-6876!` |
| **M046** | Poenaru Cristiana | `poenaru.cristiana` | `Camena-Vol-3541!` |
| **M047** | Stîngaciu Mario | `stingaciu.mario` | `Camena-Vol-6132!` |
| **M048** | Timofte Tudor | `timofte.tudor` | `Camena-Vol-3010!` |
| **M049** | Ifrim Tudor | `ifrim.tudor` | `Camena-Vol-4483!` |
| **M053** | Timoscov Roxana | `timoscov.roxana` | `Camena-Vol-4990!` |
| **M054** | Ursache Stefania | `ursache.stefania` | `Camena-Vol-5751!` |
| **M055** | Mihalache Mara | `mihalache.mara` | `Camena-Vol-6911!` |
| **M056** | Corfă Tudor | `corfa.tudor` | `Camena-Vol-4836!` |
| **M059** | Glodeanu Tudor | `glodeanu.tudor` | `Camena-Vol-3642!` |
| **M060** | Mancaș Ilinca | `mancas.ilinca` | `Camena-Vol-5129!` |
