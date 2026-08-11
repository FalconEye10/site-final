import { useState } from 'react';
import { Sparkles, Search, Check, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export interface ScoringPreset {
  category: 
    | 'Ședințe & Guvernanță' 
    | 'Proiecte & Teren' 
    | 'PR & Social Media' 
    | 'Finanțe & Sponsorizări' 
    | 'Logistică & Tehnologie' 
    | 'Comunitate & Mentoring' 
    | 'Inovație & Merite'
    | 'Penalizări & Conduită';
  action: string;
  points: number;
  description: string;
  badge?: string;
}

export const SCORING_PRESETS: ScoringPreset[] = [
  // ── 1. ȘEDINȚE & GUVERNANȚĂ ──
  { category: 'Ședințe & Guvernanță', action: 'Prezență Ședință Ordinară Săptămânală', points: 2, description: 'Participare activă la ședința săptămânală', badge: 'Standard' },
  { category: 'Ședințe & Guvernanță', action: 'Prezență Ședință Extraordinară / Board', points: 3, description: 'Participare la decizii strategice și voturi cheie' },
  { category: 'Ședințe & Guvernanță', action: 'Punctualitate Perfectă & Ordine de Zi Pregătită', points: 1, description: 'Sosire la timp cu agenda pregătită', badge: 'Bonus' },
  { category: 'Ședințe & Guvernanță', action: 'Găzduire Spațiu Ședință / Protocol Ceai & Cafea', points: 4, description: 'Asigurare locație sau protocol pentru întâlnire', badge: 'Protocol' },
  { category: 'Ședințe & Guvernanță', action: 'Redactare Proces-Verbal (Minute Ședință)', points: 3, description: 'Notare decizii și trimitere sinteză pe grup' },
  { category: 'Ședințe & Guvernanță', action: 'Moderare & Facilitare Discuții Ședință', points: 3, description: 'Conducere discuții și gestionare ordine de zi' },
  { category: 'Ședințe & Guvernanță', action: 'Păstrare Linie de Ședință / Timekeeper Oficial', points: 2, description: 'Monitorizare timp alocat fiecărui subiect' },
  { category: 'Ședințe & Guvernanță', action: 'Întârziere Nemotivată (>15 min)', points: -1, description: 'Sosire tardivă fără anunț prealabil' },
  { category: 'Ședințe & Guvernanță', action: 'Absență Nemotivată Ședință', points: -3, description: 'Neprezentare fără cerere de învoire' },

  // ── 2. PROIECTE & EXECUȚIE ÎN TEREN ──
  { category: 'Proiecte & Teren', action: 'Voluntar Activ pe Teren (1-3 ore)', points: 5, description: 'Implicare directă în derularea acțiunii locale', badge: 'Teren' },
  { category: 'Proiecte & Teren', action: 'Voluntar de Bază (Zi Întreagă / >4 ore)', points: 10, description: 'Dedicare completă pe durata întregului proiect', badge: 'Impact' },
  { category: 'Proiecte & Teren', action: 'Coordonator de Echipă / Sector pe Teren', points: 15, description: 'Coordonare voluntari și sarcini operative' },
  { category: 'Proiecte & Teren', action: 'Project Manager (Cap-Coadă)', points: 25, description: 'Concepere, bugetare, coordonare și raportare finală', badge: 'Lider' },
  { category: 'Proiecte & Teren', action: 'Co-Manager / Vice-Lider Proiect', points: 15, description: 'Sprijin direct în managementul proiectului' },
  { category: 'Proiecte & Teren', action: 'Gestionare Stand / Vânzare Bilete / Donații', points: 6, description: 'Reprezentare directă în public la standul clubului' },
  { category: 'Proiecte & Teren', action: 'Ghidare & Primire Oaspeți / RSVP Eveniment', points: 4, description: 'Wording, primire invitați și verificări bilete' },
  { category: 'Proiecte & Teren', action: 'Distribuire Flyere & Afișe în Oraș (Walking Team)', points: 5, description: 'Lipit afișe aprobate și împărțit materiale promo' },
  { category: 'Proiecte & Teren', action: 'Intervenție Rapidă în Ziua Evenimentului (Urgență)', points: 7, description: 'Rezolvat task-uri neprevăzute în ultimul moment', badge: 'Urgență' },
  { category: 'Proiecte & Teren', action: 'Înlocuit Coleg Indisponibil în Tura de Teren', points: 4, description: 'Preluat tura unui coleg pe teren din scurt' },

  // ── 3. PR, MARKETING & SOCIAL MEDIA ──
  { category: 'PR & Social Media', action: 'Design Afiș / Banner / Roll-Up Oficial', points: 5, description: 'Grafică Canva / Photoshop conform brandbook', badge: 'Design' },
  { category: 'PR & Social Media', action: 'Editare Video Reel / TikTok Proiect (Livrat 48h)', points: 7, description: 'Montaj dinamic cu muzică și tranziții', badge: 'Media' },
  { category: 'PR & Social Media', action: 'Fotograf Oficial Proiect (Album Editat 24h)', points: 6, description: 'Capturare foto-video și selecție album editat', badge: 'Foto' },
  { category: 'PR & Social Media', action: 'Cameraman / Montaj Aftermovie Proiect', points: 8, description: 'Filmări cadre unghiulare și montaj final HD', badge: 'Video' },
  { category: 'PR & Social Media', action: 'Redactare Comunicat Presă / Articol Ziar & Blog', points: 5, description: 'Text publicitar trimis către mass-media sau publicat' },
  { category: 'PR & Social Media', action: 'Live Streaming & Stories în Timp Real', points: 4, description: 'Transmisie live și acoperire story Instagram' },
  { category: 'PR & Social Media', action: 'Atragere Partener Media Local (TV / Radio / Presă)', points: 10, description: 'Apariție TV / ziar / radio locală pentru club', badge: 'Media' },
  { category: 'PR & Social Media', action: 'Design Badges / Diplome / Legitimații', points: 4, description: 'Pregătire grafică ecusoane și certificate' },
  { category: 'PR & Social Media', action: 'Moderare Comentarii & Răspuns DMs Social Media', points: 3, description: 'Răspunsuri la întrebări pe Instagram / Facebook' },
  { category: 'PR & Social Media', action: 'Copywriting Campanie / Slogane & Hashtag-uri', points: 4, description: 'Concepere texte persuasive pentru postări' },

  // ── 4. FINANȚE & SPONSORIZĂRI ──
  { category: 'Finanțe & Sponsorizări', action: 'Atragere Sponsor Mic (<500 RON / Produse / Catering)', points: 10, description: 'Contract sponsorizare sau bunuri necesare proiectului', badge: 'Sponsor' },
  { category: 'Finanțe & Sponsorizări', action: 'Atragere Sponsor Mediu (500 - 2000 RON)', points: 20, description: 'Fonduri directe strânse pentru bugetul clubului', badge: 'Fonduri' },
  { category: 'Finanțe & Sponsorizări', action: 'Atragere Sponsor Strategic (>2000 RON)', points: 35, description: 'Parteneriat major de impact pentru acțiuni mari', badge: 'Major' },
  { category: 'Finanțe & Sponsorizări', action: 'Negociere Discount / Gratuitate Spațiu sau Echipament', points: 8, description: 'Reducere costuri sau barter obținut pentru club' },
  { category: 'Finanțe & Sponsorizări', action: 'Redactare Dosar & Contract Sponsorizare', points: 8, description: 'Pregătire ofertă oficială și documente fiscale' },
  { category: 'Finanțe & Sponsorizări', action: 'Strângere Fonduri Directă (Pusculiță / Urnă Mobilă)', points: 7, description: 'Vânzare prăjituri / bilete tombolă în public' },
  { category: 'Finanțe & Sponsorizări', action: 'Decont Fără Erori / Chitanțe Predate la Timp', points: 3, description: 'Organizare contabilă curată a cheltuielilor' },
  { category: 'Finanțe & Sponsorizări', action: 'Plată Cotizație la Timp (Fără Restanțe)', points: 2, description: 'Disciplină financiară demonstrată semestrial' },

  // ── 5. LOGISTICĂ & TEHNOLOGIE ──
  { category: 'Logistică & Tehnologie', action: 'Transport Auto Personal / Echipamente Voluminoase', points: 8, description: 'Transport materiale voluminoase / echipamente cu mașina', badge: 'Logistică' },
  { category: 'Logistică & Tehnologie', action: 'Curățenie & Strângere Materiale Post-Eveniment', points: 5, description: 'Rămânere după final pentru debarasare completă', badge: 'Niche' },
  { category: 'Logistică & Tehnologie', action: 'Achiziție Materiale & Cumpărături Echipamente', points: 5, description: 'Alergătură magazine și deconturi impecabile' },
  { category: 'Logistică & Tehnologie', action: 'Depozitare & Găzduire Inventar Club', points: 6, description: 'Găzduire echipamente sau materiale în siguranță' },
  { category: 'Logistică & Tehnologie', action: 'Operator Sunet / DJ / Mixer & Boxe Eveniment', points: 8, description: 'Montaj și operare sistem audio / playlist-uri', badge: 'Tech' },
  { category: 'Logistică & Tehnologie', action: 'Montare & Demontare Corturi / Banners / Scenă', points: 7, description: 'Muncă fizică de montaj structuri logistică' },
  { category: 'Logistică & Tehnologie', action: 'Administrare IT Platformă / Website / Bază de Date', points: 10, description: 'Dezvoltare & mentenanță cod platformă web', badge: 'DEV' },
  { category: 'Logistică & Tehnologie', action: 'Creare Formular Înscriere / QR Code / Automatizare', points: 4, description: 'Google Forms, QR codes & răspunsuri automate' },
  { category: 'Logistică & Tehnologie', action: 'Inventariere Semestrială Materiale Club', points: 5, description: 'Numărare și verificare stocuri obiecte club' },
  { category: 'Logistică & Tehnologie', action: 'Asistență Tehnică Proiector / Microfoane / Lumini', points: 5, description: 'Setare echipamente multimedia înainte de ședință' },

  // ── 6. COMUNITATE & MENTORING ──
  { category: 'Comunitate & Mentoring', action: 'Recrutare & Onboarding Membru Nou Activ', points: 6, description: 'Aducere și integrare unui nou coleg în club', badge: 'Recrutare' },
  { category: 'Comunitate & Mentoring', action: 'Propunere de Proiect Nou Aprobată de Board', points: 5, description: 'Inițiativă propusă și validată în programul clubului' },
  { category: 'Comunitate & Mentoring', action: 'Sugestie Publică Casetă Anonimă Implementată', points: 4, description: 'Idee trimisă cu nume în casetă care a fost pusă în practică' },
  { category: 'Comunitate & Mentoring', action: 'Reprezentare Club la Conferință District / Rotary', points: 8, description: 'Participare activă ca delegat oficial Camena', badge: 'District' },
  { category: 'Comunitate & Mentoring', action: 'Mentoring & Sprijin Coleg Nou la Primul Proiect', points: 4, description: 'Ghidare pas cu pas a unui boboc / nou venit' },
  { category: 'Comunitate & Mentoring', action: 'Organizare Teambuilding / Seară Socială Club', points: 6, description: 'Planificare activitate de sudare a echipei' },
  { category: 'Comunitate & Mentoring', action: 'Colaborare cu alt Club Interact / Rotaract', points: 8, description: 'Proiect comun derulat cu un club partener' },
  { category: 'Comunitate & Mentoring', action: 'Voluntariat Internațional / Proiect Districtual', points: 12, description: 'Implicare în acțiuni de anvergură la nivel de District', badge: 'District' },
  { category: 'Comunitate & Mentoring', action: 'Trimitere Scrisoare Mulțumire / Card Cadou Parteneri', points: 3, description: 'Păstrare relații calde cu colaboratorii' },

  // ── 7. INOVAȚIE & MERITE SPECIALE ──
  { category: 'Inovație & Merite', action: 'Salvare Situație de Criză în Eveniment', points: 10, description: 'Rezolvare rapidă a unei probleme majore neprevăzute', badge: 'Criză' },
  { category: 'Inovație & Merite', action: 'Inițiativă Proprie Extraordinară Unică', points: 8, description: 'Acțiune benevolă necerută de nimeni care a ajutat clubul', badge: 'Extra' },
  { category: 'Inovație & Merite', action: 'Performanță Prezență 100% pe un Semestru', points: 15, description: 'Nicio absență la ședințe și proiecte timp de 6 luni', badge: 'Streak' },
  { category: 'Inovație & Merite', action: 'Ambasador Activ în Școli & Licee pentru Club', points: 5, description: 'Prezentare Interact Camena în clase și licee' },

  // ── 8. PENALIZĂRI & CONDUITĂ ──
  { category: 'Penalizări & Conduită', action: 'Neîndeplinire Task Asumat în Echipă', points: -5, description: 'Nerealizare angajament promis echipei fără justificare' },
  { category: 'Penalizări & Conduită', action: 'Abandonare Post pe Teren Fără Înlocuitor', points: -8, description: 'Plecare prematură dintr-un schimb fără anunț' },
  { category: 'Penalizări & Conduită', action: 'Nerespectare Deadline Critic PR / Comunicare', points: -3, description: 'Întârziere livrare materiale grafice sau texte aprobate' },
  { category: 'Penalizări & Conduită', action: 'Deteriorare / Pierdere Materiale Inventar Club', points: -6, description: 'Neatenție în manipularea echipamentelor clubului' },
  { category: 'Penalizări & Conduită', action: 'Comportament Neadecvat / Încălcare Regulament', points: -10, description: 'Abatere de la valorile Rotary / Interact Camena' },
  { category: 'Penalizări & Conduită', action: 'Întârziere Predare Decont / Chitanțe (>7 zile)', points: -2, description: 'Neglijență în predarea documentelor contabile' },
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
    'Ședințe & Guvernanță',
    'Proiecte & Teren',
    'PR & Social Media',
    'Finanțe & Sponsorizări',
    'Logistică & Tehnologie',
    'Comunitate & Mentoring',
    'Inovație & Merite',
    'Penalizări & Conduită'
  ];

  const filteredPresets = SCORING_PRESETS.filter(p => {
    const matchesSearch = p.action.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Toate' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/15 overflow-hidden font-anthropic">
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="w-full px-4 py-3 bg-amber-100/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
            📖 Master Ghid Punctaj ({SCORING_PRESETS.length} Criterii & Activități Nișate)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
          <span>{isExpanded ? 'Restrânge Ghidul' : 'Deschide Ghidul (Autofill cu 1 Click)'}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Search & Category Pills */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Caută orice activitate (ex: afiș, sponsor, curățenie, IT, decont)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
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
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {filteredPresets.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">Nicio activitate găsită pentru căutarea ta.</div>
            ) : (
              filteredPresets.map((preset, idx) => {
                const isSelected = selectedAction === preset.action;
                const isPositive = preset.points > 0;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectPreset?.(preset)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-white/90 dark:bg-slate-900/80 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{preset.action}</span>
                        {preset.badge && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            {preset.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">({preset.category})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{preset.description}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg tabular-nums ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isPositive ? `+${preset.points}` : preset.points} pct
                      </span>
                      {onSelectPreset && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md hidden sm:inline-block">
                          {isSelected ? <Check size={12} className="inline mr-1" /> : null} Alege
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-amber-500/15">
            <span>💡 Click pe oricare rând completează automat punctajul și justificarea.</span>
            <span className="flex items-center gap-1"><Sparkles size={11} className="text-amber-500" /> Poți oricând introduce și punctaje custom manual</span>
          </div>
        </div>
      )}
    </div>
  );
}
