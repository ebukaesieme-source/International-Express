import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇦🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export const LanguageSelector: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState(languages[0]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left text-xs">
      <div className="flex items-center space-x-1.5 bg-white border border-gray-200 rounded-md px-2.5 py-1.5 shadow-xs hover:border-gray-300 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 text-gray-700 font-medium cursor-pointer"
        >
          <span className="text-sm">{selectedLang.flag}</span>
          <span className="truncate max-w-[100px]">{selectedLang.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        <div className="flex items-center space-x-1 text-gray-500 font-medium">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-gray-600 tracking-tight">Translate</span>
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-44 rounded-lg bg-white shadow-xl ring-1 ring-black/5 z-50 py-1"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 border-b border-gray-100">
            Select Language
          </div>
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setSelectedLang(lang);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-left transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
              {selectedLang.code === lang.code && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
