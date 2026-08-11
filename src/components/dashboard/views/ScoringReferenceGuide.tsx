import { useState } from 'react';
import { Sparkles, Search, Check, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export interface ScoringPreset {
  category: 'Ședințe & Prezență' | 'Proiecte & Teren' | 'PR & Media' | 'Finanțe & Fonduri' | 'Logistică & Niche' | 'Comunitate' | 'Penalizări';
  action: string;
  points: number;
  description: string;
  badge?: string;
}

export const SCORING_PRESETS: ScoringPreset[] = [
  // ── Ședințe & Prezență ──
  { category: 'Ședințe & Prezență', action: 'Prezență Ședință Ordinară', points: 2, description: 'Participare activă la ședința săptămânală', badge: 'Standard' },
  { category: 'Ședințe & Prezență', action: 'Prezență Ședință Extraordinară / Board', points: 3, description: 'Participare la decizii strategice și voturi cheie' },
  { category: 'Ședințe & Prezență', action: 'Punctualitate & Pregătire Ordine de Zi', points: 1, description: 'Sosit la timp cu agenda pregătită', badge: 'Bonus' },
  { category: 'Ședințe & Prezență', action: 'Găzduire Spațiu Ședință / Sală', points: 4, description: 'Asigurare locație sau protocol pentru întâlnire' },
  { category: 'Ședințe & Prezență', action: 'Întârziere Nemotivată (>15 min)', points: -1, description: 'Sosire tardivă fără anunț prealabil' },
  { category: 'Ședințe & Prezență', action: 'Absență Nemotivată Ședință', points: -3, description: 'Neprezentare fără cerere de învoire' },

  // ── Proiecte & Teren ──
  { category: 'Proiecte & Teren', action: 'Voluntar Activ în Teren (1-3 ore)', points: 5, description: 'Implicare directă în derularea acțiunii locale', badge: 'Teren' },
  { category: 'Proiecte & Teren', action: 'Voluntar de Bază (Zi Întreagă / >4 ore)', points: 10, description: 'Dedicare completă pe durata întregului proiect', badge: 'Impact' },
  { category: 'Proiecte & Teren', action: 'Coordonator de Echipă / Ziua Proiectului', points: 15, description: 'Coordonare voluntari și sarcini pe teren' },
  { category: 'Proiecte & Teren', action: 'Project Manager (Cap-Coadă)', points: 25, description: 'Concepere, bugetare, coordonare și raportare finală', badge: 'Lider' },
  { category: 'Proiecte & Teren', action: 'Gestionare Stand / Vânzare Bilete / Donații', points: 6, description: 'Reprezentare directă în public la standul clubului' },

  // ── PR & Media (Niche) ──
  { category: 'PR & Media', action: 'Design Afiș / Banner / Material Grafic Oficial', points: 5, description: 'Grafică Canva / Photoshop conform identității vizuale', badge: 'Design' },
  { category: 'PR & Media', action: 'Editare Video / Reel / TikTok Proiect', points: 7, description: 'Montaj dinamic și livrare material video în 48h', badge: 'Media' },
  { category: 'PR & Media', action: 'Fotograf / Cameraman Oficial Proiect', points: 6, description: 'Capturare foto-video și selecție album editat', badge: 'Foto' },
  { category: 'PR & Media', action: 'Redactare Comunicat Presă / Articol Blog', points: 5, description: 'Text publicitar trimis către mass-media sau publicat' },
  { category: 'PR & Media', action: 'Live Streaming & Stories în Timp Real', points: 4, description: 'Transmisie live și interviuri cu participanții' },
  { category: 'PR & Media', action: 'Atragere Partener Media Local', points: 10, description: 'Apariție TV / ziar / radio locală pentru club' },

  // ── Finanțe & Fonduri ──
  { category: 'Finanțe & Fonduri', action: 'Atragere Sponsor Mic (<500 RON / Servicii)', points: 10, description: 'Contract sponsorizare sau bunuri necesare proiectului', badge: 'Sponsor' },
  { category: 'Finanțe & Fonduri', action: 'Atragere Sponsor Mediu (500 - 2000 RON)', points: 20, description: 'Fonduri directe strânse pentru bugetul clubului', badge: 'Fonduri' },
  { category: 'Finanțe & Fonduri', action: 'Atragere Sponsor Strategic (>2000 RON)', points: 35, description: 'Parteneriat major de impact pentru acțiuni mari', badge: 'Major' },
  { category: 'Finanțe & Fonduri', action: 'Redactare Dosar & Contract Sponsorizare', points: 8, description: 'Pregătire ofertă oficială și documente fiscale' },
  { category: 'Finanțe & Fonduri', action: 'Plată Cotizație la Timp (Fără Restanțe)', points: 2, description: 'Disciplină financiară demonstrată semestrial' },

  // ── Logistică & Niche ──
  { category: 'Logistică & Niche', action: 'Transport Logistic / Auto Personal', points: 8, description: 'Transport materiale voluminoase / echipamente cu mașina', badge: 'Logistică' },
  { category: 'Logistică & Niche', action: 'Curățenie & Strângere Materiale Post-Eveniment', points: 4, description: 'Rămânere după final pentru debarasare completă', badge: 'Niche' },
  { category: 'Logistică & Niche', action: 'Achiziție Materiale & Cumpărături Echipamente', points: 5, description: 'Alergătură magazine și deconturi impecabile' },
  { category: 'Logistică & Niche', action: 'Depozitare & Păstrare Inventar Club', points: 6, description: 'Găzduire echipamente sau materiale în siguranță' },
  { category: 'Logistică & Niche', action: 'Asigurare Tehnică (Sonorizare / Lumini / IT)', points: 7, description: 'Montaj și operare mixere / boxe / laptopuri' },

  // ── Comunitate & Mentoring ──
  { category: 'Comunitate', action: 'Recrutare & Onboarding Membru Nou Activ', points: 6, description: 'Aducere și integrare unui nou coleg în club', badge: 'Recrutare' },
  { category: 'Comunitate', action: 'Propunere de Proiect Aprobată de Board', points: 5, description: 'Inițiativă propusă și validată în programul clubului' },
  { category: 'Comunitate', action: 'Sugestie Publică Implementată', points: 4, description: 'Idee trimisă cu nume în casetă care a fost pusă în practică' },
  { category: 'Comunitate', action: 'Reprezentare Club la Conferință District / Rotary', points: 8, description: 'Participare activă ca delegat oficial Camena', badge: 'District' },
  { category: 'Comunitate', action: 'Mentoring & Sprijin Coleg la Primul Proiect', points: 4, description: 'Ghidare pas cu pas a unui boboc / nou venit' },

  // ── Penalizări ──
  { category: 'Penalizări', action: 'Neîndeplinire Task Asumat în Echipă', points: -5, description: 'Nerealizare angajament promis echipei fără justificare' },
  { category: 'Penalizări', action: 'Nerespectare Deadline Critic de Comunicare', points: -3, description: 'Întârziere livrare materiale grafice sau texte aprobate' },
  { category: 'Penalizări', action: 'Comportament Neadecvat / Încălcare Regulament', points: -10, description: 'Abatere de la valorile Rotary / Interact Camena' },
];

interface ScoringReferenceGuideProps {
  onSelectPreset?: (preset: ScoringPreset) => void;
  selectedAction?: string;
}

export function ScoringReferenceGuide({ onSelectPreset, selectedAction }: ScoringReferenceGuideProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toate');
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = ['Toate', 'Ședințe & Prezență', 'Proiecte & Teren', 'PR & Media', 'Finanțe & Fonduri', 'Logistică & Niche', 'Comunitate', 'Penalizări'];

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
            📖 Ghid & Clasament de Referință Punctaj ({SCORING_PRESETS.length} Criterii & Activități Nișate)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
          <span>{isExpanded ? 'Restrânge Ghidul' : 'Deschide Ghidul (Click pentru autofill)'}</span>
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
                placeholder="Caută activitate (ex: afiș, sponsor, curățenie, logistică)..."
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
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
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
