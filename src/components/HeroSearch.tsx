import React from 'react';
import { Search, Sparkles, Filter, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TherapeuticCategory } from '../types';

interface HeroSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  emergencyOnly: boolean;
  setEmergencyOnly: (val: boolean) => void;
  categories: TherapeuticCategory[];
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  emergencyOnly,
  setEmergencyOnly,
  categories,
}) => {
  const quickSearches = [
    'Augmentin 625mg',
    'Ventolin Inhaler',
    'Lantus Insulin',
    'Rabies Vaccine',
    'Ceftriaxone Injection',
  ];

  return (
    <section className="pt-10 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Connected to 24/7 Verified Community Pharmacies in Ghana</span>
      </div>

      {/* Hero Headline inspired by Image 1 */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 font-display leading-[1.1]">
        Find Emergency Medications <br className="hidden sm:inline" />
        <span className="text-slate-950">In Stock Near You</span>
      </h1>

      <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
        Eliminate the dangerous late-night pharmacy search. Search brand or generic names, verify active stock levels, and place an immediate <strong className="text-slate-900 font-semibold">2-hour hold</strong>.
      </p>

      {/* Search Input Container - Inspired by Image 1's pill container */}
      <div className="mt-8 max-w-2xl mx-auto">
        <div className="relative flex items-center p-1.5 rounded-md bg-white border border-slate-300 shadow-lg shadow-slate-900/5 hover:border-slate-400 focus-within:border-slate-950 focus-within:ring-4 focus-within:ring-slate-950/5 transition-all">
          <div className="pl-4 pr-2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            id="hero-medicine-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by brand or generic name (e.g. Augmentin, Ventolin, Insulin...)"
            className="w-full py-2.5 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mr-2 text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1"
            >
              Clear
            </button>
          )}

          <button
            id="hero-search-submit"
            type="button"
            className="shrink-0 px-6 sm:px-8 py-3 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors shadow-xs flex items-center gap-2"
          >
            <span>Search Now</span>
          </button>
        </div>

        {/* Quick Search Chips */}
        <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 font-medium text-[11px] mr-1">Popular searches:</span>
          {quickSearches.map(term => (
            <button
              key={term}
              onClick={() => setSearchQuery(term)}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="mt-8 flex items-center justify-center gap-2 flex-wrap max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>

        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}

        {/* Emergency Critical Toggle */}
        <button
          id="emergency-filter-toggle"
          onClick={() => setEmergencyOnly(!emergencyOnly)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            emergencyOnly
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Emergency Critical Only</span>
        </button>
      </div>
    </section>
  );
};
