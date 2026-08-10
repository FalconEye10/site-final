import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Check, ChevronRight } from "lucide-react";

const CITIES_MOCK = [
  "Piatra Neamț",
  "București",
  "Cluj-Napoca",
  "Timișoara",
  "Iași",
  "Brașov",
  "Constanța",
  "Craiova",
  "Galați",
  "Oradea",
];

const BIO_SUGGESTIONS = [
  "Sunt aici să explorez 🔍",
  "Caut colaboratori 🤝",
  "Pasionat de voluntariat ❤️",
  "Lider de proiect 🎯",
  "Design & Creativitate 🎨",
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [bio, setBio] = useState("");
  const cityInputRef = useRef<HTMLInputElement>(null);

  const filteredCities = CITIES_MOCK.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setCitySearch(selectedCity);
    setShowCityDropdown(false);
  };

  const handleBioSuggestionClick = (suggestion: string) => {
    setBio((prev) => (prev ? `${prev} ${suggestion}` : suggestion));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF9F5] relative overflow-hidden">
      {/* Decorative blurred background blob */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-brand-muted/5 p-10">
          <div className="mb-10 text-center">
            <h1 className="font-['Hanken_Grotesk'] text-3xl font-bold text-brand-accent mb-3">
              Configurează-ți Profilul
            </h1>
            <p className="font-['Manrope'] text-brand-accent/60">
              Personalizează-ți experiența în comunitate.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2 relative" ref={cityInputRef}>
                  <label className="text-sm font-semibold text-brand-accent/80 uppercase tracking-wider font-['Manrope']">
                    Orașul tău
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent/40" size={20} />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setCity(""); // Reset valid city if they type
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-brand-muted/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all font-['Manrope'] text-lg"
                      placeholder="Caută orașul..."
                    />
                  </div>

                  <AnimatePresence>
                    {showCityDropdown && citySearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-2 bg-white border border-brand-muted/10 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {filteredCities.length > 0 ? (
                          filteredCities.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleCitySelect(c)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between font-['Manrope'] transition-colors"
                            >
                              {c}
                              {city === c && <Check size={16} className="text-brand-primary" />}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-brand-accent/40 font-['Manrope'] text-sm">
                            Nu am găsit orașul.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!city}
                  className="w-full py-4 bg-brand-accent text-white rounded-2xl font-['Hanken_Grotesk'] font-medium hover:bg-brand-accent/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-8 shadow-lg shadow-[#001f26]/20"
                >
                  Continuă <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-brand-accent/80 uppercase tracking-wider font-['Manrope']">
                    Scurtă descriere (Bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-4 bg-white border border-brand-muted/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all font-['Manrope'] resize-none h-32 text-lg"
                    placeholder="Spune-ne câteva cuvinte despre tine..."
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {BIO_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleBioSuggestionClick(suggestion)}
                        className="px-3 py-1.5 bg-brand-primary/10 text-brand-accent/80 rounded-full text-sm font-['Manrope'] hover:bg-brand-primary/20 transition-colors active:scale-95 border border-brand-primary/30"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-4 bg-white border border-brand-muted/10 text-brand-accent rounded-2xl font-['Hanken_Grotesk'] font-medium hover:bg-gray-50 transition-all active:scale-[0.98]"
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex-1 py-4 bg-brand-primary text-brand-accent rounded-2xl font-['Hanken_Grotesk'] font-bold hover:bg-[#7bbce0] transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(40,250,252,0.39)] flex items-center justify-center gap-2"
                  >
                    Finalizare <Check size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stepper indicators */}
          <div className="flex justify-center gap-2 mt-10">
            <div className={`w-12 h-1.5 rounded-full transition-colors ${step === 1 ? 'bg-brand-accent' : 'bg-brand-accent/10'}`} />
            <div className={`w-12 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-brand-accent' : 'bg-brand-accent/10'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
