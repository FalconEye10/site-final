import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StorySlide {
  id: string;
  category: string;
  headline: string;
  lead: string;
  details: { label: string; value: string }[];
}

const STORY_SLIDES: StorySlide[] = [
  {
    id: 'four-way-test',
    category: 'Principiul Etic Rotary',
    headline: 'Testul celor 4 Întrebări',
    lead: 'Dintre lucrurile pe care le gândim, le spunem sau le facem:',
    details: [
      { label: 'I', value: 'Este oare adevărat?' },
      { label: 'II', value: 'Este loial și corect pentru toți?' },
      { label: 'III', value: 'Va consolida prietenia și buna înțelegere?' },
      { label: 'IV', value: 'Va fi în folosul tuturor celor interesați?' },
    ],
  },
  {
    id: 'service-above-self',
    category: 'Misiune & Comunitate',
    headline: 'Service Above Self',
    lead: 'A servi mai presus de sine — tinerii voluntari din Piatra-Neamț dedicați comunității.',
    details: [
      { label: 'Voluntari', value: '47 de membri activi din liceele din Piatra-Neamț' },
      { label: 'Inițiative', value: 'Peste 12 proiecte sociale, culturale și educaționale' },
      { label: 'Apartenență', value: 'District 2241 România & Republica Moldova' },
      { label: 'Sponsor', value: 'Rotary Club Piatra-Neamț' },
    ],
  },
  {
    id: 'transparency',
    category: 'Responsabilitate Financiară',
    headline: 'Transparență & Integritate',
    lead: 'Fiecare contribuție este asumată public, cu chitanțe digitale și semnături reale.',
    details: [
      { label: 'Cotizație', value: '15 RON / lună, investită exclusiv în proiecte' },
      { label: 'Chitanțe', value: 'Format securizat CHIT-YYYY-MM cu semnătură trezorier' },
      { label: 'Registru', value: 'Evidență transparentă și auditabilă de toți membrii' },
      { label: 'Standard', value: 'Trasabilitate financiară completă, zero erori' },
    ],
  },
];

const CYCLE_INTERVAL = 8500;

export function LoginStoryPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % STORY_SLIDES.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const slide = STORY_SLIDES[currentIndex];

  return (
    <div className="relative w-full h-full bg-[#070D18] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-6 lg:p-8 xl:p-10 2xl:p-12 overflow-hidden select-none border-b md:border-b-0 md:border-r border-slate-800/80 font-headings">
      
      {/* 1. Linii geometrice discrete de fundal (Blueprint subtle grid) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="story-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#story-grid)" />
        </svg>
      </div>

      {/* 2. Antet Panou: Logo Oficial Interact Camena într-un container curat alb (100% vizibil) */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/60 pb-3 md:pb-4 lg:pb-5 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Interact Logo"
              className="h-6 sm:h-8 md:h-8 lg:h-9 w-auto object-contain block"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-title tracking-wider uppercase text-amber-400 font-bold">
                Rotary International
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-[10px] sm:text-[11px] font-title tracking-wide uppercase text-slate-400 font-medium hidden sm:inline">
                District 2241
              </span>
            </div>
            {/* Titlu Club: font-display (Playfair Display / Newsreader) */}
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold font-display tracking-tight text-white mt-0.5">
              Interact Club Camena
            </h2>
          </div>
        </div>

        {/* Badge Oraș: font-title (Google Sans) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 text-[10px] sm:text-xs font-title font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Piatra-Neamț</span>
        </div>
      </div>

      {/* 3. Centru: Roata de Aur Rotary International 3D Autentică & Storytelling Adaptiv */}
      <div className="relative z-10 my-auto py-3 sm:py-4 md:py-4 lg:py-6 flex flex-col items-center justify-center">
        
        {/* Container Roată de Aur - Scalare mărită pe PC pentru a profita la maximum de spațiu */}
        <div className="relative w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[480px] xl:max-w-[560px] 2xl:max-w-[640px] aspect-[1024/576] flex items-center justify-center mb-3 sm:mb-4 md:mb-4 lg:mb-6 shrink-0">
          {/* Halo auriu discret în spatele roții pentru profunzime pe ecrane mari */}
          <div className="absolute inset-0 m-auto w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-60 lg:h-60 xl:w-72 xl:h-72 rounded-full bg-amber-500/[0.08] blur-2xl pointer-events-none" />

          <motion.img
            src="/rotary-gear-gold.png"
            alt="Rotary International Gold Gear"
            className="w-full h-full object-contain filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.85)] relative z-10"
            style={{ transformOrigin: '52.3% 50.2%' }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 75,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Caseta de Storytelling cu lățime echilibrată - profită de spațiu fără goluri */}
        <div className="w-full max-w-sm sm:max-w-md md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-2.5 sm:space-y-3.5 md:space-y-3 lg:space-y-4"
            >
              {/* Categorie cu indicator auriu: font-title (Google Sans) */}
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-[1.5px] bg-amber-400" />
                <span className="text-[10px] sm:text-xs font-title uppercase tracking-wider text-amber-400 font-bold">
                  {slide.category}
                </span>
              </div>

              {/* Titlu și descriere: font-display (Playfair Display / Newsreader) & font-headings (Inter) */}
              <div>
                <h3 className="text-lg sm:text-xl md:text-xl lg:text-2xl xl:text-3xl font-bold font-display text-white tracking-tight leading-tight">
                  {slide.headline}
                </h3>
                <p className="text-xs sm:text-xs md:text-xs lg:text-sm text-slate-300 mt-1 sm:mt-1.5 leading-relaxed font-headings font-normal">
                  {slide.lead}
                </p>
              </div>

              {/* Detalii autentice - Grilă 2 coloane pe tabletă și PC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 md:gap-2 lg:gap-2.5 pt-0.5 sm:pt-1">
                {slide.details.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 sm:p-2.5 md:p-2 lg:p-2.5 xl:p-3 rounded-lg border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
                  >
                    {/* Etichetă / Cifră romană: font-title (Google Sans) */}
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-title">
                      {item.label}
                    </div>
                    {/* Valoare detaliu: font-headings (Inter) */}
                    <div className="text-[11px] sm:text-xs md:text-xs lg:text-[13px] text-slate-200 mt-0.5 leading-snug font-headings font-medium">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* 4. Subsol: Bare de Progres Interactive & Copyright */}
      <div className="relative z-10 pt-2.5 sm:pt-3 md:pt-3 lg:pt-4 border-t border-slate-800/60 shrink-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {STORY_SLIDES.map((s, idx) => {
            const isCurrent = idx === currentIndex;
            const isPast = idx < currentIndex;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className="group text-left focus:outline-none cursor-pointer pt-0.5"
                title={s.headline}
              >
                {/* Bara de progres */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
                  {isCurrent && (
                    <motion.div
                      key={'prog-' + currentIndex}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: CYCLE_INTERVAL / 1000, ease: 'linear' }}
                      className="h-full bg-amber-400"
                    />
                  )}
                  {isPast && <div className="w-full h-full bg-amber-400/80" />}
                </div>

                <div className="mt-1 sm:mt-1.5 flex items-center justify-between">
                  {/* Pas: font-data (01, 02, 03) & Nume: font-title */}
                  <span
                    className={'text-[9px] sm:text-[10px] md:text-[10px] lg:text-[11px] tracking-wide transition-colors truncate ' + (
                      isCurrent ? 'text-amber-400 font-bold font-title' : 'text-slate-500 group-hover:text-slate-400 font-medium font-title'
                    )}
                  >
                    <span className="font-data mr-0.5">0{idx + 1}.</span> {s.category.split(' ')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Meta: font-data */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mt-2 sm:mt-2.5 pt-1.5 border-t border-slate-900/80 font-data">
          <span>Interact Club Camena • Piatra-Neamț</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>

    </div>
  );
}
