import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Sparkles, 
  Search, 
  Music, 
  Languages, 
  UserCheck, 
  ArrowRight, 
  ArrowLeft, 
  Flame, 
  X,
  MapPin,
  Heart,
  Zap,
  Radio,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { useToastStore } from '../store/useToastStore';
import { 
  LANGUAGES, 
  POPULAR_SINGERS, 
  USER_INTERESTS, 
  REGIONS_LIST, 
  SingerOption 
} from '../data/musicPreferences';
import { cn } from '../lib/utils';

export function OnboardingModal() {
  const { 
    isOnboardingOpen, 
    setIsOnboardingOpen, 
    selectedLanguages: savedLanguages, 
    selectedSingers: savedSingers,
    selectedInterests: savedInterests,
    selectedRegion: savedRegion,
    setFullPreferences,
    hasCompletedOnboarding,
    user
  } = useUserStore();

  const { showToast } = useToastStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    savedLanguages.length > 0 ? savedLanguages : ['Hindi', 'Bhojpuri', 'Punjabi']
  );
  const [selectedSingers, setSelectedSingers] = useState<string[]>(
    savedSingers.length > 0 ? savedSingers : ['Arijit Singh', 'Pawan Singh', 'Khesari Lal Yadav', 'Diljit Dosanjh', 'Shreya Ghoshal']
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    savedInterests && savedInterests.length > 0 ? savedInterests : ['romantic', 'party', 'lofi']
  );
  const [selectedRegion, setSelectedRegion] = useState<string>(
    savedRegion || 'auto'
  );

  const [singerSearch, setSingerSearch] = useState('');
  const [activeLanguageFilter, setActiveLanguageFilter] = useState<string>('all');
  const [dynamicSingers, setDynamicSingers] = useState<SingerOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic Singer Search Effect
  React.useEffect(() => {
    if (!singerSearch || singerSearch.trim().length < 2) {
      setDynamicSingers([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(singerSearch.trim())}&entity=song&limit=25`);
        const data = await res.json();
        
        if (data && data.results) {
          const artistsMap = new Map<string, SingerOption>();
          data.results.forEach((song: any) => {
            const name = song.artistName;
            if (!artistsMap.has(name)) {
              artistsMap.set(name, {
                id: song.artistId?.toString() || name,
                name: name,
                languages: ['Global'],
                imageUrl: song.artworkUrl100?.replace('100x100bb.jpg', '400x400bb.jpg') || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
                category: 'Searched Artist',
              });
            }
          });
          
          const fetchedSingers = Array.from(artistsMap.values()).slice(0, 10);
          
          const newSingers = fetchedSingers.filter(
            fs => !POPULAR_SINGERS.some(ps => ps.name.toLowerCase() === fs.name.toLowerCase())
          );
          
          setDynamicSingers(newSingers);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic singers", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [singerSearch]);

  const toggleLanguage = (langName: string) => {
    setSelectedLanguages((prev) => 
      prev.includes(langName) ? prev.filter((l) => l !== langName) : [...prev, langName]
    );
  };

  const handleSelectAllLanguages = () => {
    if (selectedLanguages.length === LANGUAGES.length) {
      setSelectedLanguages(['Hindi']);
    } else {
      setSelectedLanguages(LANGUAGES.map((l) => l.name));
    }
  };

  const toggleSinger = (singerName: string) => {
    setSelectedSingers((prev) => 
      prev.includes(singerName) ? prev.filter((s) => s !== singerName) : [...prev, singerName]
    );
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((i) => i !== interestId) : [...prev, interestId]
    );
  };

  const filteredSingers = useMemo(() => {
    const localMatches = POPULAR_SINGERS.filter((singer) => {
      const matchesChosenLanguages = selectedLanguages.length === 0 || 
        singer.languages.some((lang) => selectedLanguages.includes(lang));

      const matchesTab = activeLanguageFilter === 'all' || 
        singer.languages.includes(activeLanguageFilter);

      const matchesSearch = !singerSearch.trim() || 
        singer.name.toLowerCase().includes(singerSearch.toLowerCase()) ||
        singer.languages.some((l) => l.toLowerCase().includes(singerSearch.toLowerCase())) ||
        (singer.category && singer.category.toLowerCase().includes(singerSearch.toLowerCase()));

      return matchesChosenLanguages && matchesTab && matchesSearch;
    });

    if (singerSearch.trim().length >= 2) {
      return [...dynamicSingers, ...localMatches];
    }

    return localMatches;
  }, [selectedLanguages, activeLanguageFilter, singerSearch, dynamicSingers]);

  const handleSelectTopSingers = () => {
    const topNames = filteredSingers.slice(0, 8).map((s) => s.name);
    setSelectedSingers((prev) => Array.from(new Set([...prev, ...topNames])));
  };

  if (!isOnboardingOpen) return null;

  const handleFinish = async () => {
    if (selectedLanguages.length === 0) {
      showToast('Please select at least 1 language');
      setStep(1);
      return;
    }

    const finalSingers = selectedSingers.length > 0 ? selectedSingers : ['Arijit Singh', 'Pawan Singh'];
    const finalInterests = selectedInterests.length > 0 ? selectedInterests : ['romantic', 'party'];
    const finalRegion = selectedRegion || 'auto';

    await setFullPreferences(selectedLanguages, finalSingers, finalInterests, finalRegion);
    showToast(`Preferences tuned for IP ${user?.ipAddress || 'session'}!`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] my-auto"
        >
          {/* Top Progress & Step Bar */}
          <div className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0 bg-neutral-900/90 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-400">
                    Step {step} of 3 • Recommendation Engine Calibration
                  </h3>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {step === 1 && 'Which languages do you listen to?'}
                    {step === 2 && 'Which singers & artists do you love?'}
                    {step === 3 && 'Choose your interests & regional culture'}
                  </h2>
                </div>
              </div>

              {hasCompletedOnboarding && (
                <button
                  onClick={() => setIsOnboardingOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/80 hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress indicators */}
            <div className="flex items-center gap-2">
              <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", step >= 1 ? "bg-green-500" : "bg-neutral-800")} />
              <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", step >= 2 ? "bg-green-500" : "bg-neutral-800")} />
              <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", step === 3 ? "bg-green-500" : "bg-neutral-800")} />
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
            {/* STEP 1: LANGUAGE SELECTION */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-400">
                    Select your languages to customize your Daily Mixes, Radio, and Home recommendations.
                  </p>
                  <button
                    onClick={handleSelectAllLanguages}
                    className="text-xs font-bold text-green-400 hover:text-green-300 underline shrink-0 ml-3"
                  >
                    {selectedLanguages.length === LANGUAGES.length ? 'Reset Selection' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang.name);
                    return (
                      <motion.button
                        key={lang.id}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleLanguage(lang.name)}
                        className={cn(
                          "relative p-4 rounded-2xl border text-left transition-all overflow-hidden flex flex-col justify-between h-28 group",
                          isSelected
                            ? "border-green-500 bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-lg shadow-green-500/10 ring-2 ring-green-500/40"
                            : "border-white/10 bg-neutral-800/40 hover:bg-neutral-800/80 hover:border-white/20"
                        )}
                      >
                        <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-25 bg-gradient-to-tr", lang.color)} />

                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-2xl font-black opacity-85 group-hover:scale-105 transition-transform text-white/90">
                            {lang.nativeName}
                          </span>
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                            isSelected 
                              ? "bg-green-500 border-green-500 text-black shadow-md" 
                              : "border-white/20 text-transparent"
                          )}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>

                        <div className="relative z-10">
                          <h4 className={cn("font-bold text-base transition-colors", isSelected ? "text-green-400" : "text-white")}>
                            {lang.name}
                          </h4>
                          <span className="text-[11px] text-neutral-400">
                            {isSelected ? 'Selected' : 'Tap to add'}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/60 border border-white/5 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-green-400" />
                    <span>
                      <strong className="text-white">{selectedLanguages.length}</strong> {selectedLanguages.length === 1 ? 'language' : 'languages'} chosen
                    </span>
                  </div>
                  {selectedLanguages.length === 0 && (
                    <span className="text-amber-400 font-semibold">Please select at least 1</span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: SINGER / ARTIST SELECTION */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search any singer globally (e.g. Cheema Y, Pawan Singh)..."
                      value={singerSearch}
                      onChange={(e) => setSingerSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-full bg-neutral-800 border border-white/10 text-white placeholder-neutral-400 focus:outline-none focus:border-green-500 text-sm font-medium"
                    />
                    {isSearching ? (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-neutral-400 border-t-green-500 animate-spin" />
                    ) : singerSearch ? (
                      <button
                        onClick={() => setSingerSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>

                  <button
                    onClick={handleSelectTopSingers}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-white/10 transition-colors shrink-0"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Select Top {selectedLanguages.join('/')}
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setActiveLanguageFilter('all')}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                      activeLanguageFilter === 'all'
                        ? "bg-green-500 text-black border-green-500 shadow-md"
                        : "bg-neutral-800/80 text-neutral-300 border-white/10 hover:border-white/20"
                    )}
                  >
                    All ({selectedLanguages.join(', ')})
                  </button>
                  {selectedLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLanguageFilter(lang)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                        activeLanguageFilter === lang
                          ? "bg-green-500 text-black border-green-500 shadow-md"
                          : "bg-neutral-800/80 text-neutral-300 border-white/10 hover:border-white/20"
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                {filteredSingers.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {filteredSingers.map((singer) => {
                      const isSelected = selectedSingers.includes(singer.name);
                      return (
                        <motion.button
                          key={singer.id}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleSinger(singer.name)}
                          className={cn(
                            "relative p-3.5 rounded-2xl border text-left transition-all flex flex-col items-center text-center group",
                            isSelected
                              ? "border-green-500 bg-neutral-800 shadow-lg shadow-green-500/10 ring-2 ring-green-500/40"
                              : "border-white/10 bg-neutral-800/40 hover:bg-neutral-800/80 hover:border-white/20"
                          )}
                        >
                          <div className="relative w-20 h-20 rounded-full overflow-hidden mb-2.5 shadow-md border-2 border-neutral-700 group-hover:border-green-500/50 transition-colors">
                            <img
                              src={singer.imageUrl}
                              alt={singer.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className={cn(
                              "absolute inset-0 flex items-center justify-center transition-opacity bg-black/40",
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                            )}>
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all",
                                isSelected ? "bg-green-500 text-black scale-100" : "bg-white/30 text-white scale-90"
                              )}>
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            </div>
                          </div>

                          <h4 className={cn("font-bold text-sm leading-tight transition-colors line-clamp-1", isSelected ? "text-green-400" : "text-white")}>
                            {singer.name}
                          </h4>

                          <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                            <span className="text-[10px] bg-neutral-700/80 text-neutral-300 px-1.5 py-0.5 rounded font-medium">
                              {singer.languages.join('/')}
                            </span>
                            {singer.category && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                • {singer.category}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 rounded-2xl bg-neutral-800/30 border border-dashed border-neutral-700">
                    <Music className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-neutral-300">
                      {isSearching ? `Searching globally for "${singerSearch}"...` : `No singers matching "${singerSearch}"`}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {isSearching ? "Please wait..." : "Try searching with another name or select more languages in Step 1."}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/60 border border-white/5 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-400" />
                    <span>
                      <strong className="text-white">{selectedSingers.length}</strong> {selectedSingers.length === 1 ? 'singer' : 'singers'} selected
                    </span>
                  </div>
                  <span className="text-neutral-400">
                    {selectedSingers.slice(0, 3).join(', ')}{selectedSingers.length > 3 ? ` +${selectedSingers.length - 3} more` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: INTERESTS & REGION */}
            {step === 3 && (
              <div className="space-y-7">
                {/* SECTION A: MUSIC INTERESTS / VIBES */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Favorite Music Vibes & Genres
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {selectedInterests.length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {USER_INTERESTS.map((interest) => {
                      const isSelected = selectedInterests.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
                          className={cn(
                            "relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 group overflow-hidden",
                            isSelected
                              ? "border-green-500 bg-neutral-800 shadow-md ring-2 ring-green-500/30"
                              : "border-white/10 bg-neutral-800/40 hover:bg-neutral-800/80 hover:border-white/20"
                          )}
                        >
                          <div className={cn("absolute -bottom-6 -right-6 w-16 h-16 rounded-full blur-xl opacity-20 bg-gradient-to-tr", interest.gradient)} />
                          
                          <div className="flex items-center justify-between relative z-10">
                            <span className="text-2xl">{interest.emoji}</span>
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center border transition-all",
                              isSelected 
                                ? "bg-green-500 border-green-500 text-black shadow-sm" 
                                : "border-white/20 text-transparent"
                            )}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </div>

                          <div className="relative z-10">
                            <h4 className={cn("font-bold text-sm leading-tight transition-colors", isSelected ? "text-green-400" : "text-white")}>
                              {interest.name}
                            </h4>
                            <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                              {interest.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION B: REGIONAL TARGETING */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Regional Music Chart & Cultural Zone
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {REGIONS_LIST.map((reg) => {
                      const isSelected = selectedRegion === reg.id;
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => setSelectedRegion(reg.id)}
                          className={cn(
                            "relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between group",
                            isSelected
                              ? "border-green-500 bg-neutral-800 shadow-md ring-2 ring-green-500/30"
                              : "border-white/10 bg-neutral-800/40 hover:bg-neutral-800/80 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{reg.flagEmoji}</span>
                              <div>
                                <h4 className={cn("font-bold text-sm leading-tight", isSelected ? "text-green-400" : "text-white")}>
                                  {reg.name}
                                </h4>
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  {reg.nativeScript}
                                </span>
                              </div>
                            </div>

                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 mt-0.5",
                              isSelected 
                                ? "bg-green-500 border-green-500 text-black shadow-sm" 
                                : "border-white/20 text-transparent"
                            )}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </div>

                          <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {reg.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-white/10 bg-neutral-950 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white px-4 py-2.5 rounded-full hover:bg-neutral-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div className="text-xs text-neutral-500 hidden sm:block">
                Step 1 of 3: Language Setup
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              {step < 3 ? (
                <button
                  type="button"
                  disabled={step === 1 && selectedLanguages.length === 0}
                  onClick={() => setStep((s) => (s + 1) as any)}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-extrabold text-sm px-6 py-3 rounded-full transition-all shadow-lg shadow-green-500/20 active:scale-95"
                >
                  <span>{step === 1 ? 'Continue to Singers' : 'Continue to Interests & Region'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black text-sm px-8 py-3 rounded-full transition-all shadow-xl shadow-green-500/25 hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Personalized Music Experience</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
