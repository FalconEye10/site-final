import { useState } from 'react';
import { Sparkles, Search, Check, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export interface ScoringPreset {
  category: 
    | 'Muncă Grea & Logistică'
    | 'Scenă & Public Speaking'
    | 'PR & Social Media'
    | 'Finanțe & Sponsorizări'
    | 'Management & Proiecte'
    | 'Ședințe & Guvernanță'
    | 'Comunitate & Mentoring'
    | 'Inovație & Merite'
    | 'Penalizări & Conduită'
    | 'Evenimente Speciale';
  action: string;
  points: number;
  description: string;
  badge?: string;
}

export const SCORING_PRESETS: ScoringPreset[] = [
  // ── 1. MUNCĂ GREA, LOGISTICĂ, FORȚĂ & TEHNIC (SALAHORI & MEȘTERI) ──
  { category: 'Muncă Grea & Logistică', action: 'Salahor Desăvârșit (Cărat Echipamente Grele, Boxe, Mese, Scaune, Garduri)', points: 12, description: 'Efort fizic intens la încărcare/descărcare și manipulare greutăți pe teren', badge: '🏗️ Salahor Desăvârșit' },
  { category: 'Muncă Grea & Logistică', action: 'Inginer Constructor & Meșterul Clubului (Montat Standuri, Structuri, Decor)', points: 10, description: 'Asamblare mecanică, șuruburi, bormașină, decoruri complexe și meșterit', badge: '🔨 Inginer Constructor' },
  { category: 'Muncă Grea & Logistică', action: 'Master Cabluri & Curent (Prelungitoare, Mufe, Generatoare, Lumini)', points: 8, description: 'Conectare și securizare trasee electrice și echipamente sub tensiune', badge: '⚡ Master Cabluri' },
  { category: 'Muncă Grea & Logistică', action: 'Cărăușul Oficial (Transport Auto Personal / Marfă Voluminoasă)', points: 10, description: 'Pus mașina personală la dispoziție pentru transport marfă și materiale', badge: '🚐 Cărăuș Oficial' },
  { category: 'Muncă Grea & Logistică', action: 'Echipa de Salubrizare & Curățenie Lună Post-Eveniment', points: 7, description: 'Rămas până la final pentru strângerea gunoiului și debarasarea totală a spațiului', badge: '🧹 Curățenie Lună' },
  { category: 'Muncă Grea & Logistică', action: 'Paznicul & Magazionerul Inventarului (Depozitare & Pază)', points: 6, description: 'Păstrarea în siguranță a inventarului și numărarea exactă a stocurilor', badge: '📦 Arhivar Inventar' },
  { category: 'Muncă Grea & Logistică', action: 'Alergătorul de Serviciu (Alergat după Baterii, Bandă Adezivă, Markere)', points: 5, description: 'Rezolvarea cumpărăturilor urgente și a lipsurilor de ultim moment în oraș', badge: '🏃 Alergător Rapid' },
  { category: 'Muncă Grea & Logistică', action: 'Operator Sunet / DJ & Mixer Eveniment', points: 8, description: 'Montaj stație audio, microfoane wireless și gestionare playlist pe parcursul acțiunii', badge: '🎧 Sound Master' },
  { category: 'Muncă Grea & Logistică', action: 'Montare & Demontare Corturi / Pavilioane Eveniment', points: 7, description: 'Ancorare, montat prelate și strâns pavilioane în condiții de vânt sau ploaie', badge: '⛺ Corturi & Teren' },
  { category: 'Muncă Grea & Logistică', action: 'Deplasare pe Teren în Condiții Meteo Dificile (Frig/Ploaie/Caniculă)', points: 8, description: 'Dedicare excepțională pe teren când vremea a fost nefavorabilă', badge: '🌧️ Voluntar de Fier' },
  { category: 'Muncă Grea & Logistică', action: 'Load-in & Load-out Crew (Descărcare & Încărcare Camioane)', points: 9, description: 'Descărcare și încărcare camioane cu echipamente de volum mare', badge: '🚚 Load Crew' },
  { category: 'Muncă Grea & Logistică', action: 'Tehnician Lumini & Efecte Speciale', points: 9, description: 'Montat și programat lumini, spoturi și efecte speciale de scenă', badge: '💡 Light Master' },
  { category: 'Muncă Grea & Logistică', action: 'Setup Standuri & Booth-uri Sponsori', points: 7, description: 'Aranjat și decorat standuri pentru sponsori și activități interactive', badge: '🪑 Setup Master' },
  { category: 'Muncă Grea & Logistică', action: 'Rigging & Siguranță Structurală', points: 11, description: 'Verificat și asigurat structuri suspendate și elemente de scenă', badge: '🔒 Rigging Pro' },
  { category: 'Muncă Grea & Logistică', action: 'Voluntar de Noapte / Tura Târzie', points: 10, description: 'Muncă în tura de noapte sau dimineața devreme pentru pregătirea terenului', badge: '🌙 Night Owl' },

  // ── 2. SCENĂ, VOCE, PUBLIC SPEAKING & RELAȚII CU OAMENII ──
  { category: 'Scenă & Public Speaking', action: 'Maestru de Ceremonii / MC Oficial (Prezentare Scenă, Baluri, Gale)', points: 15, description: 'Susținere discursuri în fața a sute de oameni, carismă și control scenă', badge: '🎤 Vocea Clubului' },
  { category: 'Scenă & Public Speaking', action: 'Orator & Ambasador în Școli (Prezentări Recrutare în Licee)', points: 8, description: 'Prezentarea valorilor Interact Camena în fața claselor de elevi', badge: '🗣️ Orator de Elită' },
  { category: 'Scenă & Public Speaking', action: 'Răspânditor de Vibe & Energizere (Jocuri, Teambuilding, Public)', points: 7, description: 'Menținerea atmosferei pozitive și energizarea voluntarilor și a publicului', badge: '🎭 Răspânditor de Vibe' },
  { category: 'Scenă & Public Speaking', action: 'Scutul Clubului / Control Acces & Stewarding (Verificare Bilete & Brățări)', points: 6, description: 'Păstrarea ordinii, verificarea ecusoanelor și gestionarea fluxului de intrare', badge: '🛡️ Scutul Clubului' },
  { category: 'Scenă & Public Speaking', action: 'Protocol & Primire Oaspeți Speciali (Rotary, Presă, Autorități)', points: 6, description: 'Wording impecabil, înmânare mape și ghidare invitați de onoare', badge: '🤝 Protocol de Onoare' },
  { category: 'Scenă & Public Speaking', action: 'Pitch Proiect în Fața Sponsorilor / Juriului', points: 10, description: 'Prezentare convingătoare a nevoilor clubului către finanțatori', badge: '🎯 Pitch Master' },
  { category: 'Scenă & Public Speaking', action: 'Interviu Live / Apariție Presă Locală (TV / Radio / Ziare)', points: 10, description: 'Reprezentarea oficială a imaginii clubului în mass-media', badge: '📺 Star Media' },
  { category: 'Scenă & Public Speaking', action: 'Host Ateliere & Workshop-uri Interactive', points: 9, description: 'Facilitare și moderare sesiuni interactive de învățare', badge: '🧑‍🏫 Workshop Host' },
  { category: 'Scenă & Public Speaking', action: 'Speaker la Conferințe Districtuale', points: 12, description: 'Prezentare oficială în fața altor cluburi Interact / Rotaract', badge: '🎙️ Speaker District' },
  { category: 'Scenă & Public Speaking', action: 'Moderator Panel & Discuții de Grup', points: 8, description: 'Coordonat discuții structurate cu mai mulți vorbitori', badge: '💬 Panel Moderator' },
  { category: 'Scenă & Public Speaking', action: 'Animator Copii & Activități Family', points: 6, description: 'Jocuri, concursuri și activități antrenante pentru copii', badge: '🎈 Animator Pro' },
  { category: 'Scenă & Public Speaking', action: 'Usher & Ghidare Participanți', points: 5, description: 'Ghidare participanți la locuri și furnizare informații utile', badge: '🧭 Usher' },
  { category: 'Scenă & Public Speaking', action: 'Voice-over & Narator Video', points: 7, description: 'Narațiune vocală pentru aftermovie-uri, reel-uri sau spoturi promo', badge: '🎬 Voice Talent' },

  // ── 3. PR, VIZUAL, CREATOR DE CONȚINUT & SOCIAL MEDIA ──
  { category: 'PR & Social Media', action: 'Paparazzo Oficial / Fotograf de Eveniment (Album Editat în 24h)', points: 8, description: 'Sute de fotografii profesionale clare, selectate și editate rapid', badge: '📸 Paparazzo Oficial' },
  { category: 'PR & Social Media', action: 'Regizor / Videograf & Creator de Aftermovie (Montaj Cinemagrafic HD)', points: 12, description: 'Filmări dinamice, sunet impecabil și montaj video de impact', badge: '🎬 Wizard Video' },
  { category: 'PR & Social Media', action: 'TikToker & Reels Specialist (Trend-uri Virale & Interviuri Live)', points: 7, description: 'Conținut video dinamic pe ritmuri în tendințe cu sute de vizualizări', badge: '📱 Viral Master' },
  { category: 'PR & Social Media', action: 'Designer Grafic de Geniu (Afișe, Roll-up, Bannere Brandbook)', points: 8, description: 'Grafică Canva / Photoshop conform standardelor Rotary International', badge: '🎨 Pixel Wizard' },
  { category: 'PR & Social Media', action: 'Pana de Aur / Copywriter (Articole Presă, Comunicat Oficial, Blog)', points: 6, description: 'Texte persuasive, gramatică impecabilă și storytelling captivant', badge: '✍️ Pana de Aur' },
  { category: 'PR & Social Media', action: 'Creator Diplome, Ecusoane, Legitimații & Stickere', points: 5, description: 'Personalizare și trimitere la print a tuturor materialelor de identificare', badge: '🖨️ Master Tipar' },
  { category: 'PR & Social Media', action: 'Live Coverage Non-Stop (Instagram Stories & Actualizări în Timp Real)', points: 5, description: 'Postat stories din 15 în 15 minute pe toată durata acțiunii', badge: '📡 Live Master' },
  { category: 'PR & Social Media', action: 'Moderare & Răspuns Prompt DMs / Comentarii pe Social Media', points: 4, description: 'Reactivitate imediată la mesajele primite de la tineri și susținători', badge: '💬 Community Rep' },
  { category: 'PR & Social Media', action: 'Canva Designer / Postări Story & Afișe', points: 6, description: 'Creat postări, story-uri și vizualuri rapide în Canva', badge: '🎨 Canva Pro' },
  { category: 'PR & Social Media', action: 'Content Creator Behind-the-Scenes (BTS)', points: 7, description: 'Conținut autentic din spatele scenei și imagini necenzurate', badge: '🎥 BTS Master' },
  { category: 'PR & Social Media', action: 'Grafician Merch, Hanorace & Tricouri', points: 9, description: 'Design vectorizat pentru tricouri, hanorace și accesorii', badge: '👕 Merch Designer' },
  { category: 'PR & Social Media', action: 'Operator Foto / Video Live Event', points: 10, description: 'Filmări și fotografii în timp real pe tot parcursul evenimentului', badge: '📹 Live Operator' },
  { category: 'PR & Social Media', action: 'Social Media Scheduler Pro', points: 5, description: 'Programat postări în avans pe toate rețelele sociale ale clubului', badge: '⏰ Scheduler Pro' },
  { category: 'PR & Social Media', action: 'Influencer Collaboration Manager', points: 8, description: 'Coordonat colaborări și parteneriate cu influenceri locali', badge: '🤳 Influencer Liaison' },
  { category: 'PR & Social Media', action: 'Newsletter & Email Marketing Master', points: 6, description: 'Redactat și trimis newslettere către membri, sponsori și parteneri', badge: '📧 Email Master' },
  { category: 'PR & Social Media', action: 'Podcast / Audio Content Creator', points: 8, description: 'Înregistrat, moderat și editat episoade de podcast ale clubului', badge: '🎧 Podcast Producer' },

  // ── 4. FINANȚE, SPONSORIZĂRI, NEGOCIERI & VÂNZĂRI ──
  { category: 'Finanțe & Sponsorizări', action: 'Rechin Financiar (>2000 RON Cash / Sponsorizare Strategică)', points: 35, description: 'Contract major de sponsorizare atras prin negociere directă', badge: '💰 Rechin Financiar' },
  { category: 'Finanțe & Sponsorizări', action: 'Negociator de Elită (500 - 2000 RON Fonduri Asecurizate)', points: 20, description: 'Fonduri directe atrase în contul sau casa clubului', badge: '💼 Negociator de Elită' },
  { category: 'Finanțe & Sponsorizări', action: 'Sponsor Mic Atras (<500 RON sau Barter Echipamente)', points: 10, description: 'Atrase produse necesare bunei desfășurări a acțiunii', badge: '🤝 Parteneriat Local' },
  { category: 'Finanțe & Sponsorizări', action: 'Provizii & Mâncare (Sponsorizare Pizza, Cafea, Dulciuri Voluntari)', points: 10, description: 'Asigurat masa și răcoritoarele pentru toată echipa pe teren', badge: '🍕 Provizii & Mâncare' },
  { category: 'Finanțe & Sponsorizări', action: 'Top Seller (Cele mai multe Bilete de Bal / Tombolă / Prăjituri Vândute)', points: 12, description: 'Record de vânzări directe în public pentru cauza caritabilă', badge: '🎟️ Top Seller' },
  { category: 'Finanțe & Sponsorizări', action: 'Gardianul Bugetului (Deconturi Fără Nicio Greșeală, Chitanțe la Timp)', points: 8, description: 'Organizare contabilă curată a cheltuielilor și plăți la zi', badge: '📊 Gardianul Bugetului' },
  { category: 'Finanțe & Sponsorizări', action: 'Urnă Mobilă / Strângere Fonduri Stradală Activă', points: 7, description: 'Abordare politicoasă a trecătorilor și strângere donații la stand', badge: '🪙 Fundraiser Stradal' },
  { category: 'Finanțe & Sponsorizări', action: 'Plată Cotizație Semestrială Integrală în Avans', points: 4, description: 'Exemplu de responsabilitate financiară față de club', badge: '💎 Membru Exemplar' },
  { category: 'Finanțe & Sponsorizări', action: 'Vânzător Bilete Online & QR Codes', points: 8, description: 'Vânzare activă de bilete prin link-uri digitale și coduri QR', badge: '🎫 Ticket Seller' },
  { category: 'Finanțe & Sponsorizări', action: 'Sponsorizare In-Kind (Produse / Servicii / Discount-uri)', points: 9, description: 'Atrase servicii gratuite sau discount-uri masive la furnizori', badge: '🎁 Sponsor In-Kind' },
  { category: 'Finanțe & Sponsorizări', action: 'Grant Writer / Cereri Finanțare Nerambursabilă', points: 15, description: 'Redactat și depus proiecte de finanțare nerambursabilă', badge: '📝 Grant Master' },
  { category: 'Finanțe & Sponsorizări', action: 'Parteneriat Strategic pe Termen Lung', points: 18, description: 'Negociat acorduri de colaborare pe durată de 1 an+', badge: '🤝 Partener Strategic' },
  { category: 'Finanțe & Sponsorizări', action: 'Merchandise Sales Manager', points: 10, description: 'Gestionat stocul și vânzările de merch al clubului', badge: '👕 Merch Manager' },
  { category: 'Finanțe & Sponsorizări', action: 'Crowdfunding Campaign Lead', points: 14, description: 'Lansat și gestionat o campanie online de strângere de fonduri', badge: '🌐 Crowdfunding Lead' },
  { category: 'Finanțe & Sponsorizări', action: 'Raportare Financiară & Transparență Totală', points: 7, description: 'Publicat rapoarte financiare transparente după proiect', badge: '📈 Transparency Pro' },

  // ── 5. MANAGEMENT, CONDUCERE PROIECTE & COORDONARE ──
  { category: 'Management & Proiecte', action: 'General de Proiect / Project Manager Suprem (Cap-Coadă + Raport)', points: 25, description: 'Concepere, bugetare, coordonare echipă, derulare și raportare finală', badge: '👑 General de Proiect' },
  { category: 'Management & Proiecte', action: 'Locotenent Operativ / Vice-Lider Proiect (Mâna Dreaptă)', points: 15, description: 'Preluat atribuții cheie și menținut ritmul de lucru al echipei', badge: '🎖️ Locotenent Operativ' },
  { category: 'Management & Proiecte', action: 'Șef de Comitet Activ (PR, Logistică, HR, Finanțe pe Proiect)', points: 12, description: 'Coordonat departamentul și validat fiecare sarcină a membrilor', badge: '⭐ Șef de Comitet' },
  { category: 'Management & Proiecte', action: 'Salvator de Criză (Rezolvat o Problemă Critică Apărută Imprevizibil)', points: 12, description: 'Găsit soluție salvatoare când ceva a picat pe ultima sută de metri', badge: '🚒 Salvator de Criză' },
  { category: 'Management & Proiecte', action: 'Coordonare Tură Voluntari pe Schimburi', points: 8, description: 'Verificare prezențe, pauze de masă și rotația posturilor', badge: '📋 Shift Manager' },
  { category: 'Management & Proiecte', action: 'Preluare Task Dificil Refuzat de Alții', points: 6, description: 'Asumare responsabilitate atunci când nimeni altcineva nu a vrut', badge: '💪 Curaj & Asumare' },
  { category: 'Management & Proiecte', action: 'Risk Manager & Plan B (Identificare Riscuri & Contingency)', points: 10, description: 'Identificat riscuri posibile și pregătit soluții de rezervă', badge: '⚠️ Risk Manager' },
  { category: 'Management & Proiecte', action: 'Timeline & Deadline Master', points: 7, description: 'Monitorizat și impus respectarea deadline-urilor pe proiect', badge: '⏳ Timeline Master' },
  { category: 'Management & Proiecte', action: 'Stakeholder Communication Lead', points: 9, description: 'Legătură constantă cu partenerii, locațiile și factorii de decizie', badge: '📞 Stakeholder Lead' },
  { category: 'Management & Proiecte', action: 'Post-Event Review & Lessons Learned Lead', points: 8, description: 'Coordonat analiza debriefing post-eveniment', badge: '📊 Review Leader' },
  { category: 'Management & Proiecte', action: 'Resource Allocation Manager', points: 9, description: 'Optimizat alocarea resurselor umane și materiale', badge: '📦 Resource Manager' },
  { category: 'Management & Proiecte', action: 'Conflict Resolution Mediator', points: 8, description: 'Aplanat cu succes neînțelegerile din echipă', badge: '🕊️ Mediator' },

  // ── 6. ȘEDINȚE & GUVERNANȚĂ ──
  { category: 'Ședințe & Guvernanță', action: 'Prezență Ședință Ordinară / Activitate', points: 1, description: 'Participare confirmată (+1 punct per prezență conform regulamentului)', badge: '✅ Prezență (+1 pct)' },
  { category: 'Ședințe & Guvernanță', action: 'Absență Motivată (Cerere / WhatsApp)', points: 0, description: 'Absență justificată aprobată (0 puncte conform regulamentului)', badge: '⚪ Motivată (0 pct)' },
  { category: 'Ședințe & Guvernanță', action: 'Prezență Ședință Extraordinară / Strategică de Board', points: 3, description: 'Participare la decizii urgente și planificări mari' },
  { category: 'Ședințe & Guvernanță', action: 'Ceas Elvețian (Punctualitate Perfectă & Ordine de Zi Pregătită)', points: 2, description: 'Sosire cu 10 minute înainte, agendă notată și focus total', badge: '⏰ Ceas Elvețian' },
  { category: 'Ședințe & Guvernanță', action: 'Scrib de Aur (Redactare & Trimitere Proces-Verbal în 24h)', points: 4, description: 'Minute de ședință redactate curat cu deciziile și taskurile alocate', badge: '📜 Scrib de Aur' },
  { category: 'Ședințe & Guvernanță', action: 'Găzduire Spațiu Ședință / Protocol Cafea & Ceai', points: 4, description: 'Asigurare locație primitoare și protocol pentru întâlnire', badge: '☕ Gazdă Club' },
  { category: 'Ședințe & Guvernanță', action: 'Agenda Setter & Timekeeper Ședință', points: 3, description: 'Pregătit ordinea de zi și gestionat timpul alocat fiecărui subiect', badge: '📅 Agenda Master' },
  { category: 'Ședințe & Guvernanță', action: 'Decision & Voting Tracker', points: 3, description: 'Monitorizat și înregistrat voturile exprimate de membri', badge: '✅ Decision Tracker' },
  { category: 'Ședințe & Guvernanță', action: 'Onboarding Pro pentru Membri Noi', points: 5, description: 'Instruit membrii proaspăt primiți în procedurile interne', badge: '🎓 Onboarding Pro' },
  { category: 'Ședințe & Guvernanță', action: 'Redactare Regulamente & Proceduri Intern', points: 6, description: 'Scris proceduri de lucru clare pentru departamente', badge: '📖 Policy Writer' },

  // ── 7. COMUNITATE, SPIRIT DE ECHIPĂ & MENTORING ──
  { category: 'Comunitate & Mentoring', action: 'Inima Echipei (A adus prăjituri, ceai cald, grijă de colegi pe frig)', points: 8, description: 'Grijă caldă pentru colegi, susținere morală și atmosferă prietenoasă', badge: '❤️ Inima Echipei' },
  { category: 'Comunitate & Mentoring', action: 'Mentor Suprem (Instruit și integrat 2+ membri noi cu răbdare)', points: 8, description: 'Ghidat bobocii pas cu pas și explicat cum funcționează clubul', badge: '🧑‍🏫 Mentor Suprem' },
  { category: 'Comunitate & Mentoring', action: 'Recrutare Membru Nou Dedicat și Activ', points: 6, description: 'Aducerea unui tânăr valoros în marea familie Camena', badge: '🌱 Recrutare' },
  { category: 'Comunitate & Mentoring', action: 'Organizare Seară Socială / Teambuilding Reușit', points: 6, description: 'Planificare activități recreative pentru sudarea prieteniilor', badge: '🎉 Teambuilding' },
  { category: 'Comunitate & Mentoring', action: 'Reprezentare Oficială Club la Conferințe Rotary / District', points: 8, description: 'Participare activă ca delegat Camena la nivel districtual', badge: '🌐 Ambasador Rotary' },
  { category: 'Comunitate & Mentoring', action: 'Colaborare cu alt Club Interact / Rotaract din Țară', points: 8, description: 'Creare punți de legătură și proiecte comune inter-cluburi' },
  { category: 'Comunitate & Mentoring', action: 'Wellness & Mental Health Advocate', points: 7, description: 'Promovat echilibru, odihnă și climat sănătos în echipă', badge: '🧠 Wellness Advocate' },
  { category: 'Comunitate & Mentoring', action: 'Diversity & Inclusion Champion', points: 7, description: 'Asigurat un mediu deschis, primitor și inclusiv pentru toți', badge: '🌈 Inclusion Champion' },
  { category: 'Comunitate & Mentoring', action: 'Alumni Network Connection Manager', points: 6, description: 'Menținut legătura și colaborarea cu foștii membri ai clubului', badge: '🎓 Alumni Liaison' },
  { category: 'Comunitate & Mentoring', action: 'Community Outreach Coordinator', points: 8, description: 'Inițiat acțiuni directe de sprijin în comunitatea locală', badge: '🤲 Outreach Pro' },
  { category: 'Comunitate & Mentoring', action: 'Peer Support & Care Check-in', points: 5, description: 'Verificat starea de spirit a colegilor și oferit suport emoțional', badge: '💬 Peer Support' },

  // ── 8. INOVAȚIE & MERITE SPECIALE ──
  { category: 'Inovație & Merite', action: 'Fabrica de Idei (Proiect Nou Inovator Votat & Aprobat de Board)', points: 10, description: 'Concept original care a devenit proiect de succes al clubului', badge: '💡 Fabrica de Idei' },
  { category: 'Inovație & Merite', action: 'Jack of All Trades (A făcut de toate într-o zi: cărat, poze, vorbit, vândut)', points: 15, description: 'Polivalență extremă pe teren — voluntarul complet', badge: '🏆 Jack of All Trades' },
  { category: 'Inovație & Merite', action: 'Voluntar de Fier (Prezență 100% Ședințe & Acțiuni pe o perioadă bimensuală)', points: 15, description: 'Nicio absență și disponibilitate totală timp de 2 luni', badge: '🏛️ Voluntar de Fier' },
  { category: 'Inovație & Merite', action: 'Dezvoltare IT Platformă / Website & Baze de Date', points: 12, description: 'Mentenanță cod, funcții noi și automatizări pentru club', badge: '💻 Dev Master' },
  { category: 'Inovație & Merite', action: 'Inițiativă Benevolă Proprie Necesară dar Necereută de Nimeni', points: 8, description: 'Proactivitate pură care a adus un beneficiu clar clubului', badge: '✨ Proactiv' },
  { category: 'Inovație & Merite', action: 'AI & Automation Pioneer', points: 11, description: 'Implementat soluții AI sau automatizări utile în fluxul clubului', badge: '🤖 AI Pioneer' },
  { category: 'Inovație & Merite', action: 'Sustainability & Green Champion', points: 9, description: 'Inițiative ecologice, colectare selectivă și sustenabilitate', badge: '🌱 Green Champion' },
  { category: 'Inovație & Merite', action: 'Data Analytics & Insights Master', points: 10, description: 'Analizat date de prezență/satisfacție și extras concluzii utile', badge: '📊 Data Wizard' },
  { category: 'Inovație & Merite', action: 'Innovation Lab Lead', points: 12, description: 'Coordonat sesiuni creative de brainstorming și inovație', badge: '🔬 Innovation Lead' },
  { category: 'Inovație & Merite', action: 'Cross-Platform Integration Specialist', points: 10, description: 'Conectat și sincronizat unelte software folosite de echimpă', badge: '🔗 Integration Pro' },
  { category: 'Inovație & Merite', action: 'Propuneri Reale de Îmbunătățire UX/UI Platformă', points: 7, description: 'Propuneri valoroase de simplificare a aplicației clubului', badge: '🎨 UX Suggester' },

  // ── 9. PENALIZĂRI & CONDUITĂ ──
  { category: 'Penalizări & Conduită', action: 'Ghosting / Abandonat Post pe Teren Fără Înlocuitor', points: -10, description: 'Plecare prematură sau dispariție din tură fără anunțare prealabilă', badge: '❌ Ghosting' },
  { category: 'Penalizări & Conduită', action: 'Lăsat Echipa la Greu (Task Critic Asumat Nefăcut)', points: -6, description: 'Nerealizarea unui angajament promis fără justificare sau delegare' },
  { category: 'Penalizări & Conduită', action: 'Deteriorat sau Pierdut Materiale / Inventar Club', points: -6, description: 'Neglijență în manipularea echipamentelor sau bunurilor clubului' },
  { category: 'Penalizări & Conduită', action: 'Absență Nemotivată la Ședință sau Activitate', points: -2, description: 'Neprezentare nemotivată fără cerere de învoire transmisă la timp (-2 puncte)', badge: '❌ Nemotivată (-2 pct)' },
  { category: 'Penalizări & Conduită', action: 'Adormit / Întârziat Masiv la Acțiune de Dimineață (>30 min)', points: -2, description: 'Sosire tardivă care a întârziat debutul acțiunii' },
  { category: 'Penalizări & Conduită', action: 'Întârziere Predare Decont / Chitanțe Financiare (>7 zile)', points: -2, description: 'Blocarea evidenței contabile a trezorierului' },
  { category: 'Penalizări & Conduită', action: 'Comunicare Agresivă sau Inadecvată în Echipă', points: -8, description: 'Limbaj agresiv, disrespect sau tensiuni provocate gratuit', badge: '😠 Conductă Inadecvată' },
  { category: 'Penalizări & Conduită', action: 'Răspândire de Negativitate & Bârfe', points: -5, description: 'Afectat climatul colegial prin zvonuri și energie negativă', badge: '💬 Negativitate' },
  { category: 'Penalizări & Conduită', action: 'Depășit Deadline Fără Anunțare Prealabilă', points: -4, description: 'Nerespectat termenul limită stabilit fără comunicare', badge: '⏰ Deadline Depășit' },
  { category: 'Penalizări & Conduită', action: 'Comportament Neadecvat în Spațiul Public / Online', points: -7, description: 'Afectarea imaginii publice a Interact Camena', badge: '🚫 Conduită Publică' },
  { category: 'Penalizări & Conduită', action: 'Încălcare Confidențialitate Date Club / Membri', points: -10, description: 'Partajare neautorizată de date personale sau documente interne', badge: '🔒 Încălcare Date' },

  // ── 10. EVENIMENTE SPECIALE & URGENȚE ──
  { category: 'Evenimente Speciale', action: 'Intervenție Urgență (Emergency Response Team)', points: 13, description: 'Reacție rapidă și rezolvare pe loc a unei situații critice de ultim moment', badge: '🚨 Emergency Response' },
  { category: 'Evenimente Speciale', action: 'VIP Guest Handler', points: 9, description: 'Întâmpinat și asistat exclusiv invitați de înalt rang', badge: '👑 VIP Handler' },
  { category: 'Evenimente Speciale', action: 'Traducător & Ghid Multilingv Live', points: 8, description: 'Traducere live și asistență pentru oaspeți străini', badge: '🌍 Translator Pro' },
  { category: 'Evenimente Speciale', action: 'Accessibility & Inclusion Coordinator', points: 8, description: 'Asigurat condiții optime și accesibilitate persoanelor cu dizabilități', badge: '♿ Accessibility Pro' },
  { category: 'Evenimente Speciale', action: 'Crisis Communication Lead', points: 11, description: 'Gestionat comunicarea oficială în caz de urgență sau incidente', badge: '📢 Crisis Comms' },
  { category: 'Evenimente Speciale', action: 'Weather Contingency Executor', points: 10, description: 'Activat și executat planul B din cauza schimbarilor meteo', badge: '⛈️ Weather Pro' },
  { category: 'Evenimente Speciale', action: 'Coordonare Securitate & Pază Extinsă', points: 9, description: 'Legătură directă cu paznicii și agenții de securitate externi', badge: '🛡️ Security Lead' },
  { category: 'Evenimente Speciale', action: 'Primul Intervenient Medical / Prim Ajutor', points: 12, description: 'Acordat primul ajutor la incidente ușoare de sănătate pe teren', badge: '🏥 First Responder' },
  { category: 'Evenimente Speciale', action: 'Lost & Found Manager', points: 5, description: 'Gestionat registrul obiectelor pierdute și înapoiat bunurile proprietarilor', badge: '🎒 Lost & Found' },
  { category: 'Evenimente Speciale', action: 'Coordonator Transport & Logistică Rutieră', points: 8, description: 'Organizat rutele de microbuz și mașini pentru echipă și invitați', badge: '🚌 Transport Lead' },
];

interface ScoringReferenceGuideProps {
  onSelectPreset?: (preset: ScoringPreset) => void;
  selectedAction?: string;
}

export function ScoringReferenceGuide({ onSelectPreset, selectedAction }: ScoringReferenceGuideProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toate');
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    'Toate',
    'Muncă Grea & Logistică',
    'Scenă & Public Speaking',
    'PR & Social Media',
    'Finanțe & Sponsorizări',
    'Management & Proiecte',
    'Ședințe & Guvernanță',
    'Comunitate & Mentoring',
    'Inovație & Merite',
    'Penalizări & Conduită',
    'Evenimente Speciale'
  ];

  const filteredPresets = SCORING_PRESETS.filter(p => {
    const matchesSearch = p.action.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase()) ||
                          (p.badge && p.badge.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'Toate' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="rounded-[2px] border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/15 overflow-hidden font-anthropic">
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="w-full px-4 py-3.5 bg-amber-100/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors flex items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Trophy size={18} className="text-amber-600 dark:text-amber-400" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 font-title">
            📖 Master Ghid Punctaj & Roluri Voluntariat ({SCORING_PRESETS.length} Criterii & Badge-uri)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 font-title">
          <span>{isExpanded ? 'Restrânge Ghidul' : 'Deschide Ghidul (Autofill cu 1 Click)'}</span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-3.5">
          {/* Search & Category Pills */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Caută orice rol sau activitate (ex: salahor, constructor, afiș, sponsor, mc, cabluri)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400 font-anthropic"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full font-title">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-[2px] text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Table / List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredPresets.length === 0 ? (
              <div className="p-4 text-center text-xs sm:text-sm text-slate-400 italic font-anthropic">Nicio activitate găsită pentru căutarea ta.</div>
            ) : (
              filteredPresets.map((preset, idx) => {
                const isSelected = selectedAction === preset.action;
                const isPositive = preset.points > 0;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectPreset?.(preset)}
                    className={`p-3 rounded-[2px] border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-white/90 dark:bg-slate-900/80 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-anthropic">{preset.action}</span>
                        {preset.badge && (
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-title">
                            {preset.badge}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium font-data">({preset.category})</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5 font-anthropic">{preset.description}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-black font-data px-2.5 py-1 rounded-[2px] tabular-nums ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isPositive ? `+${preset.points}` : preset.points} pct
                      </span>
                      {onSelectPreset && (
                        <span className="text-xs font-bold font-title text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-[2px] hidden sm:inline-block">
                          {isSelected ? <Check size={14} className="inline mr-1" /> : null} Alege
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium pt-2 border-t border-amber-500/15">
            <span>💡 Click pe oricare rând completează automat punctajul și justificarea pentru orice voluntar.</span>
            <span className="flex items-center gap-1"><Sparkles size={13} className="text-amber-500" /> Poți oricând introduce și punctaje custom manual</span>
          </div>
        </div>
      )}
    </div>
  );
}
