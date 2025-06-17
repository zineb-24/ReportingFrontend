import React from 'react';

// Import the logo asset
import logifitLogo from '../assets/LOGIFIT.png';

const AdminHeader: React.FC = () => {
  return (
    <header className="admin-header">
      <div className="logo-container">
        <img src={logifitLogo} alt="LogiFit" className="logo-image" />
      </div>
      <h1 className="header-title">Admin Dashboard</h1>
      <div className="user-profile">
        <div className="profile-circle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="profile-icon">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="chevron-icon">
          <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
        </svg>
      </div>
    </header>
  );
};

export default AdminHeader;