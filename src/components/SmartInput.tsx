import { useState, useRef, useEffect } from 'react';

const MOCK_CITIES = [
  "București", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", 
  "Craiova", "Brașov", "Galați", "Ploiești", "Oradea", 
  "Piatra Neamț", "Paris", "Londra", "Berlin", "Roma", "Madrid"
];

const MOCK_TAGS = [
  "#urgent", "#important", "Raport final", "Sedință", "Proiect de lege", "Buget 2026", "Aprobare"
];

export default function SmartInput() {
  const [city, setCity] = useState('');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const [text, setText] = useState('');
  const [showTags, setShowTags] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Filter cities when typing
  useEffect(() => {
    if (city.length > 0) {
      const filtered = MOCK_CITIES.filter(c => c.toLowerCase().includes(city.toLowerCase()));
      setFilteredCities(filtered);
    } else {
      setFilteredCities(MOCK_CITIES);
    }
  }, [city]);

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityDropdown(false);
  };

  const handleTagSelect = (tag: string) => {
    const newText = text ? `${text} ${tag} ` : `${tag} `;
    setText(newText);
    setShowTags(false);
    textInputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 p-8 glass-panel rounded-2xl relative mt-8">
      {/* Decorative Glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[rgba(40,250,252,0.3)] rounded-full blur-[80px] pointer-events-none" />

      <h2 className="text-2xl font-headings font-bold text-text-executive_dark">
        Formular Inteligent
      </h2>
      
      {/* City Smart Input */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-sm font-semibold text-text-executive_dark/80 ml-1">Selectează Orașul</label>
        <div className="relative">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onFocus={() => setShowCityDropdown(true)}
            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
            className="w-full px-4 py-3 rounded-xl border border-[rgba(0,31,38,0.1)] bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#89cff0] focus:border-transparent transition-all font-data text-sm placeholder:text-text-executive_dark/30 shadow-sm"
            placeholder="Tastează pentru a căuta un oraș..."
          />
          
          {showCityDropdown && filteredCities.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-md border border-[rgba(0,31,38,0.08)] rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto transform origin-top spring-transition animate-in fade-in slide-in-from-top-2">
              {filteredCities.map((c, i) => (
                <div 
                  key={i} 
                  onClick={() => handleCitySelect(c)}
                  className="px-4 py-2.5 hover:bg-brand_signature-baby_blue/10 cursor-pointer font-data text-sm text-text-executive_dark/80 transition-colors border-b border-[rgba(0,31,38,0.03)] last:border-0"
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contextual Textarea */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-sm font-semibold text-text-executive_dark/80 ml-1">Descriere (cu sugestii)</label>
        <div className="relative flex flex-col gap-2">
          <textarea
            ref={textInputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setShowTags(true)}
            onBlur={() => setTimeout(() => setShowTags(false), 200)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-[rgba(0,31,38,0.1)] bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#89cff0] focus:border-transparent transition-all font-data text-sm placeholder:text-text-executive_dark/30 shadow-sm resize-none"
            placeholder="Scrie detaliile aici..."
          />
          
          {/* Quick Tags / Context Menu */}
          <div className={`flex flex-wrap gap-2 transition-all duration-300 ${showTags || text.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            {MOCK_TAGS.map((tag, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); handleTagSelect(tag); }}
                className="px-3 py-1.5 rounded-lg bg-[rgba(40,250,252,0.15)] text-text-executive_dark font-data text-xs border border-[rgba(40,250,252,0.3)] hover:bg-[#89cff0] hover:text-white transition-all active:scale-[0.95]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
