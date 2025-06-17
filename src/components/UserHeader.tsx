import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

// Import the logo asset
import logifitLogo from '../assets/LOGIFIT.png';

interface UserHeaderProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

const UserHeader: React.FC<UserHeaderProps> = ({ onMobileMenuToggle, isMobile = false }) => {
  const { t } = useTranslation();

  return (
    <header className="customer-header">
      <div className="customer-logo-container">
        {/* Mobile Menu Button - Only visible on mobile */}
        {isMobile && onMobileMenuToggle && (
          <button 
            className="mobile-menu-button"
            onClick={onMobileMenuToggle}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        <img src={logifitLogo} alt="LogiFit" className="customer-logo-image" />
      </div>
      
      <h1 className="customer-header-title">{t('header.userDashboard')}</h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default UserHeader;