/**
 * Version Control System
 * 
 * SemVer standard: vX.Y.Z
 * - X (Major): Schimbări majore, arhitectură, refactorizări mari de platformă sau design system nou
 * - Y (Minor): Schimbări medii, funcționalități noi adăugate, optimizări importante sau bug-fixuri medii
 * - Z (Patch): Corecții rapide, bug-fixuri mici / rușinoase, alinieri sau mici ajustări
 */

export const APP_VERSION = '8.5.5';

export interface VersionLog {
  version: string;
  type: 'major' | 'minor' | 'patch';
  description: string;
  timestamp: string;
}

export const VERSION_HISTORY: VersionLog[] = [
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
  }
];
