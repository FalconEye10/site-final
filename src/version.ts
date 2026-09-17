/**
 * Version Control System
 * 
 * SemVer standard: vX.Y.Z
 * - X (Major): Schimbări majore, arhitectură, refactorizări mari de platformă sau design system nou
 * - Y (Minor): Schimbări medii, funcționalități noi adăugate, optimizări importante sau bug-fixuri medii
 * - Z (Patch): Corecții rapide, bug-fixuri mici / rușinoase, alinieri sau mici ajustări
 */

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '9.5.0';

export interface VersionLog {
  version: string;
  type: 'major' | 'minor' | 'patch';
  description: string;
  timestamp: string;
}

export const VERSION_HISTORY: VersionLog[] = [
  {
    version: '9.5.0',
    type: 'minor',
    description: 'Sincronizarea noii cohorte de 28 membri (total 73 membri activi în registru), securizarea autorizării administrative la crearea conturilor, armonizarea schemelor Supabase (tranzacții buget, cereri învoire, propuneri proiecte) și validare 100% în sandbox multi-dispozitiv (126/126 teste trecute pe Android, iOS și PC).',
    timestamp: '2026-09-18'
  },
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
    description: 'Lansare versiune stabilă panou administrativ și registrul oficial al clubului.',
    timestamp: '2026-08-15'
  },
  {
    version: '7.9.5',
    type: 'patch',
    description: 'Optimizare cache Service Worker, pre-caching asset-uri grafice și eliminare flickering la tranziția între vederi.',
    timestamp: '2026-08-13'
  },
  {
    version: '7.9.0',
    type: 'minor',
    description: 'Optimizare PWA & Offline Engine: introducere Service Worker avansat pentru stocarea în cache a resurselor statice, încărcare instantanee a platformei în zone fără acoperire GSM și sincronizare automată a prezențelor la reconectare.',
    timestamp: '2026-08-10'
  },
  {
    version: '7.8.4',
    type: 'patch',
    description: 'Scurtături globale de tastatură (Escape pentru închidere modale, navigare secvențială prin tab-uri și autofocus pe câmpurile active).',
    timestamp: '2026-08-04'
  },
  {
    version: '7.8.0',
    type: 'minor',
    description: 'Lansare Command Palette (⌘K / Ctrl+K): navigare fulger între tab-uri, căutare globală în lista de membri, acces rapid la acțiuni de trezorerie și comutare instantanee Dark / Light Mode.',
    timestamp: '2026-07-28'
  },
  {
    version: '7.7.2',
    type: 'patch',
    description: 'Rezolvare debitare duplicată în modul offline și reconciliere automată a conflictelor de timestamp la reconectarea dispozitivelor.',
    timestamp: '2026-07-22'
  },
  {
    version: '7.6.0',
    type: 'minor',
    description: 'Export rapid date financiare în format CSV/JSON structurat pentru audit intern și backup local de siguranță.',
    timestamp: '2026-07-18'
  },
  {
    version: '7.5.0',
    type: 'minor',
    description: 'Securizare avansată a datelor & Traseu de Audit: implementare audit log pentru toate acțiunile de modificare ale bazei de date (creare/editare membri, ștergere tranzacții), protecție împotriva atacurilor CSRF și criptare avansată a token-urilor de sesiune.',
    timestamp: '2026-07-12'
  },
  {
    version: '7.3.1',
    type: 'patch',
    description: 'Ajustare margini tabele pentru ecrane de laptop (1366x768) și corecție scroll orizontal pe rapoartele financiare extinse.',
    timestamp: '2026-07-05'
  },
  {
    version: '7.2.0',
    type: 'minor',
    description: 'Sistem de filtre multi-criteriale pentru tranzacții financiare (după dată, comitet, tip cheltuială și membru asociat).',
    timestamp: '2026-07-01'
  },
  {
    version: '7.1.0',
    type: 'minor',
    description: 'Suport ștampilă și semnătură digitală pe borderoul fiscal oficial de final de mandat.',
    timestamp: '2026-06-28'
  },
  {
    version: '7.0.0',
    type: 'major',
    description: 'Arhitectura Fiscală V2: motor integrat de generare a rapoartelor financiare PDF în format peisaj cu dublă semnătură digitală reală (Trezorier + Președinte), export complet în registrul Excel (.xlsx) cu formule automate de bilanț și reconciliere de sold.',
    timestamp: '2026-06-25'
  },
  {
    version: '6.8.0',
    type: 'minor',
    description: 'Modulul Repartizare Sarcini & Management Evenimente: alocare dinamică a voluntarilor pe roluri operaționale (Logistică, Foto/Media, Relații Publice, Încasări) și monitorizare în timp real a statusului task-urilor.',
    timestamp: '2026-06-02'
  },
  {
    version: '6.7.2',
    type: 'patch',
    description: 'Corecție notificări la respingerea unei propuneri și adăugare câmp obligatoriu de motivare pentru deciziile Board-ului.',
    timestamp: '2026-05-27'
  },
  {
    version: '6.6.0',
    type: 'minor',
    description: 'Sistem de vot secret pentru Board la aprobarea inițiativelor comunitare majore, cu buletin digital criptat.',
    timestamp: '2026-05-23'
  },
  {
    version: '6.5.0',
    type: 'minor',
    description: 'Portalul Comunitar & Propuneri de Proiecte: formular public extern pentru idei din comunitatea din Piatra-Neamț, flux intern de votare și avizare în cadrul Board-ului de Conducere și arhivare istorică a inițiativelor civice.',
    timestamp: '2026-05-18'
  },
  {
    version: '6.3.1',
    type: 'patch',
    description: 'Corecție praguri de ore la trecerea de la Voluntar Activ la Senior Voluntar și recalculare automată retroactivă.',
    timestamp: '2026-05-10'
  },
  {
    version: '6.2.0',
    type: 'minor',
    description: 'Generare adeverințe oficiale de voluntariat în format PDF securizat, cu semnătura președintelui și sigiliul clubului.',
    timestamp: '2026-05-05'
  },
  {
    version: '6.1.0',
    type: 'minor',
    description: 'Afișare galerie de insigne deblocate în profilul personal și partajare diplomă de merit civic.',
    timestamp: '2026-05-02'
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
    version: '5.4.1',
    type: 'patch',
    description: 'Corecție contrast pe graficele de evoluție a prezenței și optimizare încărcare pictograme vectoriale.',
    timestamp: '2026-04-03'
  },
  {
    version: '5.3.0',
    type: 'minor',
    description: 'Modul de știri interne și comunicate oficiale ale Board-ului către membrii clubului cu atașamente documentare.',
    timestamp: '2026-03-29'
  },
  {
    version: '5.2.1',
    type: 'patch',
    description: 'Rafinare micro-animații Framer Motion pe barele laterale și eliminare jitter la navigarea rapidă.',
    timestamp: '2026-03-25'
  },
  {
    version: '5.1.0',
    type: 'minor',
    description: 'Panou de setări cont membru, preferințe temă (Auto / Dark / Light) și schimbare parolă securizată.',
    timestamp: '2026-03-22'
  },
  {
    version: '5.0.0',
    type: 'major',
    description: 'REVOLUȚIA DE DESIGN ȘI FUNCȚIONALITATE (The Rotary Civic Overhaul): Schimbarea totală a aspectului vizual și a modului de lucru al întregii platforme. Trecere de la vechiul prototip minimalist la noul sistem vizual de înaltă clasă inspirat de Rotary International și District 2241 (paletă profundă Obsidian, borduri de precizie, reflexii metalice Rotary Gold și fonturi nobile). Rescrierea completă a arhitecturii funcționale: introducerea Centrului de Comandă Digital (Command Center) cu panou de control executiv integrat, tab-uri reactive fără reîncărcare, modularizare completă pe componente și sincronizare în timp real a datelor.',
    timestamp: '2026-03-20'
  },
  {
    version: '4.8.2',
    type: 'patch',
    description: 'Corecție afișare insigne expirate și optimizare re-render la filtrarea rapidă a membrilor.',
    timestamp: '2026-03-12'
  },
  {
    version: '4.6.0',
    type: 'minor',
    description: 'Integrare sistem de alerte și convocare pentru ședințele extraordinare ale clubului.',
    timestamp: '2026-03-06'
  },
  {
    version: '4.5.0',
    type: 'minor',
    description: 'Sistem de Notificări Push & Alerte Web: alerte automate pentru ședințele săptămânale, notificări de reamintire a cotizațiilor scadente și confirmări instantanee de primire a cererilor de învoire.',
    timestamp: '2026-03-01'
  },
  {
    version: '4.3.1',
    type: 'patch',
    description: 'Rezolvare artefacte grafice la exportul canvasului de semnătură în fișiere PDF pe dispozitive iOS.',
    timestamp: '2026-02-24'
  },
  {
    version: '4.2.0',
    type: 'minor',
    description: 'Re-trimitere chitanță pe email și generare link securizat de descărcare pentru plătitor.',
    timestamp: '2026-02-19'
  },
  {
    version: '4.1.0',
    type: 'minor',
    description: 'Numerotare automată secvențială pentru chitanțe și registru antifraudă cu cheie de control.',
    timestamp: '2026-02-16'
  },
  {
    version: '4.0.0',
    type: 'major',
    description: 'Chitanțierul Digital Securizat (CHIT-YYYY-MM): generare vectorială chitanțe oficiale de cotizație, pânză tactilă pentru semnătura digitală olografă a trezorierului și a plătitorului și arhivare imutabilă în cloud.',
    timestamp: '2026-02-14'
  },
  {
    version: '3.8.2',
    type: 'patch',
    description: 'Corecție rotunjire zecimale la calculul cotizațiilor restante și afișare avertisment restanță în profil.',
    timestamp: '2026-02-05'
  },
  {
    version: '3.5.0',
    type: 'minor',
    description: 'Catalogul Inteligent de Prezențe: marcare rapidă (Prezent / Învoit / Absent), calcul automat al procentajului de implicare civică pe mandate și raportare periodică automată către Rotary Club Piatra-Neamț.',
    timestamp: '2026-01-25'
  },
  {
    version: '3.3.0',
    type: 'minor',
    description: 'Export borderou de prezență pentru ședințe în format PDF cu listă de semnături olografe.',
    timestamp: '2026-01-18'
  },
  {
    version: '3.1.2',
    type: 'patch',
    description: 'Corecție sumă în caseta de încasări rapide și prevenire introducere sume negative sau neconforme.',
    timestamp: '2026-01-12'
  },
  {
    version: '3.0.0',
    type: 'major',
    description: 'Modulul Financiar & Trezorerie Digitală: trecerea de la tabele clasice la un registru electronic cu evidență pe categorii (Cotizații, Sponsorizări, Cheltuieli Proiecte), calcul automatizat al balanței și avertizări de sold.',
    timestamp: '2026-01-08'
  },
  {
    version: '2.8.0',
    type: 'minor',
    description: 'Generare carnete de membru în format digital imprimabil pentru voluntarii nou înregistrați în club.',
    timestamp: '2025-12-28'
  },
  {
    version: '2.5.0',
    type: 'minor',
    description: 'Portalul Membrilor & Profil Individual: carnet digital de membru cu ID unic (M001-M047), istoric de implicare, date de contact securizate și evidența datoriilor curente.',
    timestamp: '2025-12-18'
  },
  {
    version: '2.3.4',
    type: 'patch',
    description: 'Corecție validare numere de telefon românești (+40) și domenii de email instituționale.',
    timestamp: '2025-12-10'
  },
  {
    version: '2.2.0',
    type: 'minor',
    description: 'Alocare roluri de conducere în baza de date (Președinte, Vicepreședinte, Secretar, Trezorier, Past-President).',
    timestamp: '2025-12-04'
  },
  {
    version: '2.1.0',
    type: 'minor',
    description: 'Criptare bcrypt pentru parolele membrilor și implementare sesiune securizată JWT în platformă.',
    timestamp: '2025-12-01'
  },
  {
    version: '2.0.0',
    type: 'major',
    description: 'Migrare către Supabase Cloud & PostgreSQL: tranziție de la stocarea locală la o bază de date relațională securizată cu politici Row Level Security (RLS) și proceduri stocate RPC pentru integritate completă.',
    timestamp: '2025-11-30'
  },
  {
    version: '1.8.0',
    type: 'minor',
    description: 'Formular avansat de feedback intern post-eveniment pentru membrii clubului și agregare sugestii.',
    timestamp: '2025-11-15'
  },
  {
    version: '1.5.0',
    type: 'minor',
    description: 'Registrul Inițial al Clubului: catalog de membri, calendar de bază pentru proiectele caritabile de toamnă-iarnă (Camena Christmas Tree, Rocking the Court) și pagini de prezentare a board-ului.',
    timestamp: '2025-10-20'
  },
  {
    version: '1.3.1',
    type: 'patch',
    description: 'Corecție afișare imagini din galeria de proiecte pe telefoane mobile Android și Safari iOS.',
    timestamp: '2025-10-12'
  },
  {
    version: '1.2.0',
    type: 'minor',
    description: 'Secțiune dedicată pentru parteneriatul cu Rotary Club Piatra-Neamț și comitetele districtuale.',
    timestamp: '2025-10-02'
  },
  {
    version: '1.1.3',
    type: 'patch',
    description: 'Corecție validare formular de înscriere voluntari, optimizare timp de încărcare imagini și adăugare animații discrete la derulare.',
    timestamp: '2025-09-24'
  },
  {
    version: '1.1.0',
    type: 'minor',
    description: 'Adăugare pagini legale obligatorii (Termeni și Condiții, Politica de Confidențialitate GDPR) și integrare meta tags SEO.',
    timestamp: '2025-09-18'
  },
  {
    version: '1.0.0',
    type: 'major',
    description: 'Lansarea Platformei Oficiale Interact Club Camena Piatra-Neamț: landing page editorial, prezentarea misiunii civice, integrarea valorilor Service Above Self și formularul inițial de recrutare voluntari din liceele din Piatra-Neamț.',
    timestamp: '2025-09-15'
  }
];
