'use client';
import { useLanguage } from './LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 shadow-2xl border border-slate-700/50">
      <button
        onClick={() => setLanguage('en')}
        className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('eve')}
        className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${language === 'eve' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
      >
        EVE
      </button>
    </div>
  );
}
