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
    lead: 'Dintre lucrurile pe care le gândim, le spunem sau le întreprindem în comunitate:',
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
    lead: 'A servi mai presus de sine — tinerii voluntari din Piatra-Neamț dedicați comunității nemțene.',
    details: [
      { label: 'Voluntari', value: '72 de membri activi din colegiile și liceele din Piatra-Neamț' },
      { label: 'Inițiative', value: 'Peste 18 proiecte și acțiuni sociale, culturale și educative' },
      { label: 'District', value: 'District 2241 România & Republica Moldova' },
      { label: 'Club Naș', value: 'Rotary Club Piatra-Neamț (fondat 1998)' },
    ],
  },
  {
    id: 'transparency',
    category: 'Responsabilitate Financiară',
    headline: 'Transparență & Integritate',
    lead: 'Fiecare contribuție este asumată public, cu borderouri de cotizații, chitanțe și audit intern.',
    details: [
      { label: 'Cotizație', value: '20 RON / lună (politică financiară aprobată 2026–2027)' },
      { label: 'Chitanțe', value: 'Format securizat CHIT-YYYY-MM cu semnătură trezorier' },
      { label: 'Registru', value: 'Evidență transparentă și auditabilă în timp real de toți membrii' },
      { label: 'Gestiune', value: 'Trasabilitate financiară completă, zero erori și sold verificat' },
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
    <div className="relative w-full h-full bg-[#0D1117] text-slate-100 flex flex-col justify-between p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 2xl:p-12 overflow-hidden select-none border-b md:border-b-0 md:border-r border-slate-800 font-headings">
      
      {/* 1. Linii geometrice discrete de fundal (Blueprint subtle grid) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="story-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#story-grid)" />
        </svg>
      </div>

      {/* 2. Antet Panou: Logo Oficial Interact Camena cu etichetă curată */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4 md:pb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-[2px] border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Interact Logo"
              className="h-7 sm:h-8 md:h-8 lg:h-9 w-auto object-contain block"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-title tracking-wider uppercase text-sky-400 font-bold">
                Rotary International
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-[10px] sm:text-[11px] font-title tracking-wide uppercase text-slate-400 font-medium hidden sm:inline">
                District 2241
              </span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold font-anthropicSerif tracking-tight text-white mt-0.5">
              Interact Club Camena
            </h2>
          </div>
        </div>

        {/* Badge Oraș */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-[2px] border border-slate-800 bg-[#161B22] text-slate-300 text-[10px] sm:text-xs font-title font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Piatra-Neamț</span>
        </div>
      </div>

      {/* 3. Centru: Roata de Aur Rotary International & Storytelling */}
      <div className="relative z-10 my-auto py-4 sm:py-6 flex flex-col items-center justify-center">
        
        {/* Container Roată de Aur cu iluminare discretă */}
        <div className="relative w-full max-w-[240px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[400px] xl:max-w-[460px] aspect-[1024/576] flex items-center justify-center mb-4 sm:mb-6 shrink-0">
          <div className="absolute inset-0 m-auto w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full bg-sky-500/[0.04] blur-3xl pointer-events-none" />

          <motion.img
            src="/rotary-gear-gold.png"
            alt="Rotary International Gold Gear"
            className="w-full h-full object-contain filter drop-shadow-[0_14px_32px_rgba(0,0,0,0.8)] relative z-10"
            style={{ transformOrigin: '52.3% 50.2%' }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 75,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Caseta de Storytelling */}
        <div className="w-full max-w-sm sm:max-w-md md:max-w-md lg:max-w-lg xl:max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-3 sm:space-y-4"
            >
              {/* Categorie */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-slate-800/80 border border-slate-700/60 text-sky-400 text-[10px] sm:text-xs font-title uppercase tracking-wider font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>{slide.category}</span>
              </div>

              {/* Titlu și descriere */}
              <div>
                <h3 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold font-anthropicSerif text-white tracking-tight leading-tight">
                  {slide.headline}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 sm:mt-1.5 leading-relaxed font-anthropic font-normal">
                  {slide.lead}
                </p>
              </div>

              {/* Detalii autentice - Grilă 2 coloane */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1">
                {slide.details.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-[2px] border border-slate-800 bg-[#161B22]/70 hover:bg-[#161B22] hover:border-slate-700/80 transition-colors"
                  >
                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-title">
                      {item.label}
                    </div>
                    <div className="text-xs sm:text-[13px] text-slate-200 mt-0.5 leading-snug font-anthropic font-medium">
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
      <div className="relative z-10 pt-3 sm:pt-4 border-t border-slate-800/80 shrink-0">
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
                <div className="w-full h-1 bg-slate-800 rounded-[1px] overflow-hidden relative">
                  {isCurrent && (
                    <motion.div
                      key={'prog-' + currentIndex}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: CYCLE_INTERVAL / 1000, ease: 'linear' }}
                      className="h-full bg-sky-400"
                    />
                  )}
                  {isPast && <div className="w-full h-full bg-sky-400/80" />}
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={'text-[10px] sm:text-[11px] tracking-wide transition-colors truncate ' + (
                      isCurrent ? 'text-sky-400 font-bold font-title' : 'text-slate-400 group-hover:text-slate-200 font-medium font-title'
                    )}
                  >
                    <span className="font-data mr-0.5">0{idx + 1}.</span> {s.category.split(' ')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/60 font-data">
          <span>Interact Club Camena • Piatra-Neamț</span>
          <span>Mandat 2026–2027</span>
        </div>
      </div>

    </div>
  );
}
