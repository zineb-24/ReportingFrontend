import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactCountryFlag from 'react-country-flag';
import { setLanguage } from '../services/api';
import '../styles/LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = async (lng: string) => {
    // Update frontend language
    await i18n.changeLanguage(lng);
    
    // Update backend language
    await setLanguage(lng);
    
    // Close dropdown
    setIsOpen(false);
  };

  // Language data with flags
  const languages = [
    { code: 'en', name: t('language.english'), flag: 'US' },
    { code: 'fr', name: t('language.french'), flag: 'FR' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="language-switcher" ref={dropdownRef}>
      {/* Custom Select Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="language-switcher-button"
      >
        {/* Flag and Text */}
        <div className="language-switcher-content">
          <ReactCountryFlag 
            countryCode={currentLanguage.flag}
            svg
            className="language-switcher-flag"
          />
          <span>{currentLanguage.name}</span>
        </div>
        
        {/* Dropdown Arrow */}
        <svg 
          className={`language-switcher-arrow ${isOpen ? 'open' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="language-switcher-dropdown">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={`language-switcher-option ${
                currentLanguage.code === language.code ? 'active' : ''
              }`}
            >
              <ReactCountryFlag 
                countryCode={language.flag}
                svg
                className="language-switcher-flag"
              />
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;