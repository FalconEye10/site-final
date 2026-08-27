/**
 * Version Control System
 * 
 * SemVer standard: vX.Y.Z
 * - X (Major): Schimbări majore, arhitectură, refactorizări mari de platformă sau design system nou
 * - Y (Minor): Schimbări medii, funcționalități noi adăugate, optimizări importante sau bug-fixuri medii
 * - Z (Patch): Corecții rapide, bug-fixuri mici / rușinoase, alinieri sau mici ajustări
 */

export const APP_VERSION = '8.2.9';

export interface VersionLog {
  version: string;
  type: 'major' | 'minor' | 'patch';
  description: string;
  timestamp: string;
}

export const VERSION_HISTORY: VersionLog[] = [
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
