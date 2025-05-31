import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const UserHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className="customer-header">
      <div className="customer-logo-container">
        <img src="/src/assets/LOGIFIT.png" alt="LogiFit" className="customer-logo-image" />
      </div>
      <h1 className="customer-header-title">{t('header.userDashboard')}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default UserHeader;