/**
 * Version Control System
 * 
 * SemVer standard: vX.Y.Z
 * - X (Major): Schimbări majore, arhitectură, refactorizări mari de platformă sau design system nou
 * - Y (Minor): Schimbări medii, funcționalități noi adăugate, optimizări importante sau bug-fixuri medii
 * - Z (Patch): Corecții rapide, bug-fixuri mici / rușinoase, alinieri sau mici ajustări
 */

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '9.4.0';

export interface VersionLog {
  version: string;
  type: 'major' | 'minor' | 'patch';
  description: string;
  timestamp: string;
}

export const VERSION_HISTORY: VersionLog[] = [
  {
    version: '9.4.0',
    type: 'minor',
    description: 'Arhitectură nouă și redesign complet al paginii de autentificare: panou de storytelling mecanic continuu cu principiile etice Rotary (The 4-Way Test), integrarea emblemei 3D a Roții de Aur Rotary International cu rotație mecanică centrată la ax, ierarhie tipografică strictă pe 4 niveluri bazată pe fonturile native ale platformei (Playfair Display, Google Sans, Inter, Satoshi), optimizare responsivă avansată pentru Telefon, Tabletă (ecran divizat) și PC (anvergură mărită, fără spațiu mort), corectare ortografică universală cu cratimă („Piatra-Neamț”) și audit complet de sistem trecut cu 0 erori (47/47 conturi autentificate, rapoarte financiare PDF/Excel și validare completă Supabase CRUD).',
    timestamp: '2026-09-17'
  },
  {
    version: '9.3.0',
    type: 'minor',
    description: 'Optimizare cod, rezoluție completă a avertizărilor din Supabase Database Linter (fără warning-uri rls_policy_always_true sau permisiuni neintenționate), restaurare acces complet de scriere pentru Evenimente, Învoiri și Sondaje în Dashboard, eliminare junk și validare 100% în sandbox (37/37 teste trecute)',
    timestamp: '2026-09-16'
  },
  {
    version: '9.2.0',
    type: 'minor',
    description: 'Sistem inteligent de notificare la primul login după fiecare update („Ce este nou”), modal dedicat pentru explorarea jurnalului complet de actualizări (toate versiunile de la v8.0 până la prezent), buton de acces rapid în bara laterală și meniul de utilizator, plus căutare dedicată în Command Palette (⌘K)',
    timestamp: '2026-09-14'
  },
  {
    version: '9.1.1',
    type: 'patch',
    description: 'Eliminare notificare de sistem eronată la încheierea/salvarea unei sesiuni de eveniment în NotificationsDropdown (sincronizare silențioasă a actualizărilor de evenimente în timp real) și aliniere texte de confirmare a prezenței exclusiv pe ore de voluntariat',
    timestamp: '2026-09-14'
  },
  {
    version: '9.1.0',
    type: 'minor',
    description: 'Securizare avansată și rezoluție avertizări Supabase Linter (search_path imutabil pe toate procedurile, revocare acces RPC extern la trigger-ul protect_critical_member_data, întărire criptografică admin_set_member_password), sincronizare automată și rezilientă în cloud pentru tranzacțiile de buget și jurnalul de audit între toate dispozitivele (Android, iOS, PC), eliminare cod vechi și optimizare completă validată 100% (63/63 teste) în sandbox izolat fără leak-uri de notificări',
    timestamp: '2026-09-14'
  },
  {
    version: '9.0.0',
    type: 'major',
    description: 'Eliminare completă a sistemului de punctaje și clasament (Leaderboard): tranziție către un model bazat exclusiv pe meritocrație civică, ore reale de voluntariat, prezențe și proiecte comunitare. Curățare totală la nivel de bază de date (eliminare tabelă score_audit_logs, drop coloane score și scoreAdjustments), refactorizare UI (panou principal cu 3 coloane perfect echilibrate, profil simplificat pe ore și proiecte), ghid introductiv actualizat și script de migrare SQL automată',
    timestamp: '2026-09-14'
  },
  {
    version: '8.6.1',
    type: 'patch',
    description: 'Sincronizare universală a versiunii platformei: actualizare automată a versiunii în meniul de căutare rapidă (CommandPalette) și dialogul de noutăți, aliniere completă a documentației de arhitectură cu registrul SemVer și recompilare build oficial de producție',
    timestamp: '2026-09-14'
  },
  {
    version: '8.6.0',
    type: 'minor',
    description: 'Securizare avansată a operațiunilor administrative: autorizare obligatorie prin verificarea parolei de administrator la crearea conturilor de membri și resetarea parolelor prin RPC dedicat (admin_set_member_password), protecție împotriva acțiunilor neautorizate, eliminare completă a credențialelor din documentație și validare completă (77/77 teste trecute) în simularea pe 9 dispozitive',
    timestamp: '2026-09-14'
  },
  {
    version: '8.5.5',
    type: 'patch',
    description: 'Consolidare ierarhie SuperAdmin & delimitare strictă permisiuni: SuperAdmin atribuit exclusiv președinției (Stan Ștefan / admin), eliminare potrivire fals-pozitivă pentru Vicepreședinte și validare 100% (72/72 teste trecute) în simularea sandbox pe 9 dispozitive (Android, iOS, PC)',
    timestamp: '2026-09-09'
  },
  {
    version: '8.5.4',
    type: 'patch',
    description: 'Afișare inteligentă update log & what\'s new condiționată strict la primul login per versiune (vX.Y.Z) pentru evitarea deranjării utilizatorilor la conectări de rutină, integrare istoric dinamic versiuni în modal și acces direct la update log prin badge-ul de versiune din sidebar',
    timestamp: '2026-09-09'
  },
  {
    version: '8.5.3',
    type: 'patch',
    description: 'Corecție critică de securitate la permisiunile de editare/resetare parolă (izolare strictă pentru utilizatori simpli vs Board/SuperAdmin) și validare completă prin simulare sandbox pe 9 dispozitive (Android, iOS, PC)',
    timestamp: '2026-09-09'
  },
  {
    version: '8.5.2',
    type: 'patch',
    description: 'Normalizare universală diacritice în căutare (Membri, Repartizare, Prezențe, Plăți, Buget, Audit), securizare matematică împotriva împărțirii la zero (milestones, rate prezență & retenție) și optimizare completă viteză/memoizare fără coliziuni de layout',
    timestamp: '2026-09-09'
  },
  {
    version: '8.5.1',
    type: 'patch',
    description: 'Optimizare globală algoritmi: selecție inteligentă în 2 etape pentru Spotlight Voluntar (fără umbrire all-time în ciclurile active), unificare calcule clasament bimensual și evoluție O(N), plafonare defensivă durată ședințe la finalizare, pre-calculare memorie datorii și aliniere strictă la fusul orar al României',
    timestamp: '2026-09-09'
  },
  {
    version: '8.5.0',
    type: 'minor',
    description: 'Corecție critică motor de punctaje & clasament: prevenire duplicate la refinalizare prezențe (AttendanceView & EventsView), departajare secundară automată All-Time în clasamentul bimensual la debut de ciclu și curățare completă istoric puncte duplicate din baza de date',
    timestamp: '2026-09-09'
  },
  {
    version: '8.4.4',
    type: 'patch',
    description: 'Eliminare completă secțiune Forum: curățare tab-uri comunitate (membru și admin), integrare propuneri proiecte în caseta de sugestii, deconectare listener Realtime forum_posts și optimizare trasee de navigare',
    timestamp: '2026-09-07'
  },
  {
    version: '8.4.3',
    type: 'patch',
    description: 'Filtrare inteligentă notificări & afișare unică update log: condiționare comunicat la update-uri majore (SemVer), adăugare butoane de ștergere individuală și golire totală notificări cu persistență locală și marcare rapidă ca citit direct din listă',
    timestamp: '2026-09-07'
  },
  {
    version: '8.4.2',
    type: 'patch',
    description: 'Consolidare securitate & audit complet: eliminare cheie VAPID privată din bundle-ul client, autorizare strictă API push backend, alertă automată conducere la cereri de învoire din Prezență, dinamizare roluri superuser și sincronizare cache PWA',
    timestamp: '2026-09-07'
  },
  {
    version: '8.4.1',
    type: 'patch',
    description: 'Curățare UI panou Dashboard: eliminare butoane RSVP (Particip / Învoire) și referințe acțiuni redundante',
    timestamp: '2026-09-07'
  },
  {
    version: '8.4.0',
    type: 'minor',
    description: 'Modernizare completă modul Buget & Registru Financiar: sincronizare live 0ms, calcul automat Sold Curent din tranzacții și cotizații, chitanțe digitale cu print/export și rezolvare atenționări linting',
    timestamp: '2026-08-28'
  },
  {
    version: '8.3.0',
    type: 'minor',
    description: 'Sincronizare completă schema Supabase payments, Pointer Events pe canvasul de semnături, contrast sporit butoane prezență și evidențiere verde balanță zero/prezență',
    timestamp: '2026-08-27'
  },
  {
    version: '8.2.9',
    type: 'patch',
    description: 'Optimizare dimensiuni butoane, eliminare redundanțe text și sortare alfabetică a membrilor la prezență',
    timestamp: '2026-08-27'
  },
  {
    version: '8.2.8',
    type: 'patch',
    description: 'Refactorizare completă LeaderboardView cu layout pe 2 niveluri și piloni podium flexibili fără coliziuni',
    timestamp: '2026-08-26'
  },
  {
    version: '8.2.7',
    type: 'patch',
    description: 'Refactorizare VolunteerSpotlightCard la layout curat pe 2 niveluri pentru eliminarea coliziunilor pe ecrane mici',
    timestamp: '2026-08-26'
  },
  {
    version: '8.2.6',
    type: 'patch',
    description: 'Audit complet de contrast UI, scroll lock și prevenire coliziuni în toate vederile',
    timestamp: '2026-08-26'
  },
  {
    version: '8.2.5',
    type: 'patch',
    description: 'Rezolvare suprapunere statistici pe spotlight card și adăugare reguli de prevenire a coliziunilor',
    timestamp: '2026-08-26'
  },
  {
    version: '8.2.4',
    type: 'patch',
    description: 'Rezolvare contrast pe pagina de autentificare în modurile Dark și Light',
    timestamp: '2026-08-26'
  },
  {
    version: '8.2.3',
    type: 'patch',
    description: 'Uniformizare estetică și geometrică a butoanelor pentru Locul 1 (Clasament): înălțime, padding, spațiere, iconuri și text aliniate simetric',
    timestamp: '2026-08-16'
  },
  {
    version: '8.2.2',
    type: 'patch',
    description: 'Corecție contrast universal Calendar: modale, configurare ture de voluntariat (shifts), comitete și formulare adaptate perfect pentru Light & Dark Mode fără text alb pe fundal alb',
    timestamp: '2026-08-16'
  },
  {
    version: '8.2.1',
    type: 'patch',
    description: 'Revert & corecție estetică Clasament: vizibilitate completă a pozei de profil pentru Locul 1 & Podium, eliminare suprapunere insignă trofeu și eliminare efecte shimmer invazive',
    timestamp: '2026-08-16'
  },
  {
    version: '8.2.0',
    type: 'minor',
    description: 'Audit complet Supabase & Butoane: înlocuire alertele native cu toast-uri, acțiuni admin pentru propuneri/sondaje/forum/știri, eliminare erori PostgREST și protecție conturi de sistem',
    timestamp: '2026-08-16'
  },
  {
    version: '8.1.0',
    type: 'minor',
    description: 'Corecție filtrare Membri Activi (ne-pasivi) vs Balanță Datorii & Păstrare integritate status profil în Supabase',
    timestamp: '2026-08-16'
  },
  {
    version: '8.0.5',
    type: 'patch',
    description: 'Adăugare Skeleton Loaders, Empty States personalizate, Animated Counters (Count-up) pe KPI-uri și efecte Shimmer Gold pe podium & insigne',
    timestamp: '2026-08-16'
  },
  {
    version: '8.0.1',
    type: 'patch',
    description: 'Corecție interacțiune touch pe mobil & click-outside backdrop pentru meniul de notificări / Push notifications',
    timestamp: '2026-08-16'
  },
  {
    version: '8.0.0',
    type: 'major',
    description: 'Overhaul complet de contrast universal Dark / Light Mode pentru toate câmpurile, butoanele, dropdown-urile și modalele',
    timestamp: '2026-08-15'
  },
  {
    version: '7.9.9',
    type: 'major',
    description: 'Lansare versiune stabilă panou administrativ și registrul oficial al clubului',
    timestamp: '2026-08-15'
  },
  {
    version: '7.9.0',
    type: 'minor',
    description: 'Optimizare PWA & Offline Engine: introducere Service Worker avansat pentru stocarea în cache a resurselor statice, încărcare instantanee a platformei în zone fără acoperire GSM și sincronizare automată a prezențelor la reconectare.',
    timestamp: '2026-08-10'
  },
  {
    version: '7.8.0',
    type: 'minor',
    description: 'Lansare Command Palette (⌘K / Ctrl+K): navigare fulger între tab-uri, căutare globală în lista de membri, acces rapid la acțiuni de trezorerie și comutare instantanee Dark / Light Mode.',
    timestamp: '2026-07-28'
  },
  {
    version: '7.5.0',
    type: 'minor',
    description: 'Securizare avansată a datelor & Traseu de Audit: implementare audit log pentru toate acțiunile de modificare ale bazei de date (creare/editare membri, ștergere tranzacții), protecție împotriva atacurilor CSRF și criptare avansată a token-urilor de sesiune.',
    timestamp: '2026-07-12'
  },
  {
    version: '7.0.0',
    type: 'major',
    description: 'Arhitectura Fiscală V2: motor integrat de generare a rapoartelor financiare PDF în format peisaj cu semnături digitale reale, export complet în registrul Excel (.xlsx) cu formule de bilanț și reconciliere automată a soldului.',
    timestamp: '2026-06-25'
  },
  {
    version: '6.8.0',
    type: 'minor',
    description: 'Modulul Repartizare Sarcini & Management Evenimente: alocare dinamică a voluntarilor pe roluri operaționale (Logistică, Foto/Media, Relații Publice, Încasări) și monitorizare în timp real a statusului task-urilor.',
    timestamp: '2026-06-02'
  },
  {
    version: '6.5.0',
    type: 'minor',
    description: 'Portalul Comunitar & Propuneri de Proiecte: formular public extern pentru idei din comunitatea din Piatra-Neamț, flux intern de votare și avizare în cadrul Board-ului de Conducere și arhivare istorică a inițiativelor civice.',
    timestamp: '2026-05-18'
  },
  {
    version: '6.0.0',
    type: 'major',
    description: 'Sistemul Național de Recunoaștere & Pașaport de Voluntariat: introducere ranguri de experiență (Recrut Nou, Voluntar Activ, Senior Voluntar, Ambasador Camena), insigne automate de merit pentru 25h, 50h, 100h de voluntariat și adeverințe oficiale de practică descărcabile.',
    timestamp: '2026-04-30'
  },
  {
    version: '5.5.0',
    type: 'minor',
    description: 'Registrul Electronic al Orelor de Voluntariat: calcul automatizat al orelor per proiect, diferențiere între activități de organizare și participare directă, prevenire suprapuneri orare și aprobare formală prin semnătura coordonatorului.',
    timestamp: '2026-04-10'
  },
  {
    version: '5.0.0',
    type: 'major',
    description: 'Redesign Identitar Rotary International: integrarea design system-ului oficial, culori reglementate (Royal Navy & Rotary Gold), suport nativ Dark Mode/Obsidian Civic Monolith și aliniere cu standardele Districtului 2241 România & Republica Moldova.',
    timestamp: '2026-03-20'
  },
  {
    version: '4.5.0',
    type: 'minor',
    description: 'Sistem de Notificări Push & Alerte Web: alerte automate pentru ședințele săptămânale, notificări de reamintire a cotizațiilor scadente și confirmări instantanee de primire a cererilor de învoire.',
    timestamp: '2026-03-01'
  },
  {
    version: '4.0.0',
    type: 'major',
    description: 'Chitanțierul Digital Securizat (CHIT-YYYY-MM): generare vectorială chitanțe oficiale de cotizație, pânză tactilă pentru semnătura digitală olografă a trezorierului și a plătitorului și arhivare imutabilă în cloud.',
    timestamp: '2026-02-14'
  },
  {
    version: '3.5.0',
    type: 'minor',
    description: 'Catalogul Inteligent de Prezențe: marcare rapidă (Prezent / Învoit / Absent), calcul automat al procentajului de implicare civică pe mandate și raportare periodică automată către Rotary Club Piatra-Neamț.',
    timestamp: '2026-01-25'
  },
  {
    version: '3.0.0',
    type: 'major',
    description: 'Modulul Financiar & Trezorerie Digitală: trecerea de la tabele clasice la un registru electronic cu evidență pe categorii (Cotizații, Sponsorizări, Cheltuieli Proiecte), calcul automatizat al balanței și avertizări de sold.',
    timestamp: '2026-01-08'
  },
  {
    version: '2.5.0',
    type: 'minor',
    description: 'Portalul Membrilor & Profil Individual: carnet digital de membru cu ID unic (M001-M047), istoric de implicare, date de contact securizate și evidența datoriilor curente.',
    timestamp: '2025-12-18'
  },
  {
    version: '2.0.0',
    type: 'major',
    description: 'Migrare către Supabase Cloud & PostgreSQL: tranziție de la stocarea locală la o bază de date relațională securizată cu politici Row Level Security (RLS) și proceduri stocate RPC pentru integritate completă.',
    timestamp: '2025-11-30'
  },
  {
    version: '1.5.0',
    type: 'minor',
    description: 'Registrul Inițial al Clubului: catalog de membri, calendar de bază pentru proiectele caritabile de toamnă-iarnă (Camena Christmas Tree, Rocking the Court) și pagini de prezentare a board-ului.',
    timestamp: '2025-10-20'
  },
  {
    version: '1.0.0',
    type: 'major',
    description: 'Lansarea Platformei Oficiale Interact Club Camena Piatra-Neamț: landing page editorial, prezentarea misiunii civice, integrarea valorilor Service Above Self și formularul inițial de recrutare voluntari din liceele din Piatra-Neamț.',
    timestamp: '2025-09-15'
  }
];
