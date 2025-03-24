import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { logout, isAdmin } from '../services/api';
import '../styles/AdminDashboard.css';
import UserOverviewTable from '../components/OverviewTable';
import AllUsersTable from '../components/AllUsersTable';
import AllGymsTable from '../components/AllGymsTable';
import AllLinksTable from '../components/AllLinksTable';

interface AdminStats {
  total_gyms: number;
  admin_users: number;
  regular_users: number;
}

interface AdminUser {
  id_user: number;
  name: string;
  email: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      navigate('/login');
      return;
    }

    // Fetch dashboard data
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/admin-dashboard/');
        setStats(response.data.stats);
        setUser(response.data.user);
      } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        // If API call fails, redirect to login
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (menuItem: string) => {
    setActiveMenuItem(menuItem);
    /*The handleMenuClick function updates the activeMenuItem 
    state variable when a sidebar menu item is clicked. */
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-header">
        <div className="logo-container">
          <img src="/src/assets/LOGIFIT.png" alt="LogiFit" className="logo-image" />
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

      <div className="admin-content">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li 
                className={activeMenuItem === 'dashboard' ? 'active' : ''}
                onClick={() => handleMenuClick('dashboard')}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="menu-icon">
                    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                  </svg>
                  Dashboard
                </div>
              </li>
              <li 
                className={activeMenuItem === 'users' ? 'active' : ''}
                onClick={() => handleMenuClick('users')}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="menu-icon">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                  All Users
                </div>
              </li>
              <li 
                className={activeMenuItem === 'gyms' ? 'active' : ''}
                onClick={() => handleMenuClick('gyms')}
              >
                <div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="menu-icon">
                  <path d="M0.385 11.092h23.229V13.044H0.385z"/>
                  <path d="M8.948 11.092h6.103v1.952H8.948z"/>
                  <path d="M15.186 11.092a0.26 0.26 0 0 0 0.26 0.26 0.26 0.26 0 0 0 0.26-0.26H15.186zM15.932 11.092c0 0.143 0.116 0.26 0.26 0.26s0.26-0.117 0.26-0.26h-0.52zM16.687 11.092a0.26 0.26 0 0 0 0.26 0.26 0.26 0.26 0 0 0 0.26-0.26H16.687z"/>
                  <circle cx="15.812" cy="11.524" r="0.26"/>
                  <circle cx="16.558" cy="11.524" r="0.26"/>
                  <circle cx="15.812" cy="12.507" r="0.26"/>
                  <path d="M15.066 11.352a0.26 0.26 0 0 1 0 0.52v-0.52zM15.066 12.767a0.26 0.26 0 0 0 0-0.52v0.52z"/>
                  <circle cx="16.558" cy="12.507" r="0.26"/>
                  <circle cx="17.303" cy="11.524" r="0.26"/>
                  <circle cx="17.303" cy="12.507" r="0.26"/>
                  <circle cx="15.444" cy="12.016" r="0.26"/>
                  <circle cx="16.185" cy="12.016" r="0.26"/>
                  <circle cx="16.93" cy="12.016" r="0.26"/>
                  <path d="M15.7 12.986c0-0.143-0.116-0.26-0.26-0.26s-0.26 0.117-0.26 0.26h0.52zM16.445 12.986c0-0.143-0.116-0.26-0.26-0.26s-0.26 0.117-0.26 0.26h0.52zM17.19 12.986a0.26 0.26 0 0 0-0.26-0.26 0.26 0.26 0 0 0-0.26 0.26h0.52zM8.826 11.092c0 0.143-0.116 0.26-0.26 0.26s-0.26-0.117-0.26-0.26h0.52zM8.081 11.092c0 0.143-0.116 0.26-0.26 0.26s-0.26-0.117-0.26-0.26h0.52zM7.335 11.092c0 0.143-0.116 0.26-0.26 0.26s-0.26-0.117-0.26-0.26h0.52z"/>
                  <circle cx="8.201" cy="11.524" r="0.26"/>
                  <circle cx="7.456" cy="11.524" r="0.26"/>
                  <circle cx="8.201" cy="12.507" r="0.26"/>
                  <path d="M8.948 11.352a0.26 0.26 0 0 0 0 0.52v-0.52zM8.948 12.767a0.26 0.26 0 0 1 0-0.52v0.52z"/>
                  <circle cx="7.456" cy="12.507" r="0.26"/>
                  <circle cx="6.71" cy="11.524" r="0.26"/>
                  <circle cx="6.71" cy="12.507" r="0.26"/>
                  <circle cx="8.569" cy="12.016" r="0.26"/>
                  <circle cx="7.824" cy="12.016" r="0.26"/>
                  <circle cx="7.079" cy="12.016" r="0.26"/>
                  <path d="M8.313 12.986c0-0.143 0.116-0.26 0.26-0.26s0.26 0.117 0.26 0.26h-0.52zM7.568 12.986c0-0.143 0.116-0.26 0.26-0.26s0.26 0.117 0.26 0.26h-0.52zM6.822 12.986c0-0.143 0.116-0.26 0.26-0.26s0.26 0.117 0.26 0.26h-0.52zM19.658 15.174c0 0.537 0.439 0.976 0.975 0.976h1.429c0.537 0 0.976-0.439 0.976-0.976V8.871c0-0.537-0.439-0.976-0.976-0.976h-1.429c-0.537 0-0.976 0.439-0.976 0.976l0 6.303z"/>
                  <path d="M20.633 7.895c-0.537 0-0.976 0.439-0.976 0.976v6.303c0 0.537 0.439 0.976 0.976 0.976h0.715V7.895h-0.715z"/>
                  <path d="M17.502 17.288c0 0.537 0.439 0.976 0.976 0.976h1.461c0.537 0 0.976-0.439 0.976-0.976V6.751c0-0.537-0.439-0.976-0.976-0.976h-1.461c-0.537 0-0.976 0.439-0.976 0.976v10.537zM4.343 15.174c0 0.537-0.439 0.976-0.976 0.976H1.938c-0.537 0-0.976-0.439-0.976-0.976V8.871c0-0.537 0.439-0.976 0.976-0.976h1.429c0.537 0 0.976 0.439 0.976 0.976v6.303z"/>
                  <path d="M3.367 7.895c0.537 0 0.976 0.439 0.976 0.976v6.303c0 0.537-0.439 0.976-0.976 0.976h-0.715V7.895h0.715z"/>
                  <path d="M6.499 17.288c0 0.537-0.439 0.976-0.976 0.976H4.062c-0.537 0-0.976-0.439-0.976-0.976V6.751c0-0.537 0.439-0.976 0.976-0.976h1.461c0.537 0 0.976 0.439 0.976 0.976v10.537z"/>
                  <path d="M23.647 10.654h-0.204v-1.788c0-0.752-0.612-1.363-1.363-1.363h-0.76v-0.758c0-0.752-0.611-1.364-1.363-1.364h-1.461c-0.752 0-1.363 0.612-1.363 1.364v3.909H6.905V6.746c0-0.752-0.612-1.364-1.363-1.364H4.081c-0.752 0-1.363 0.612-1.363 1.364v0.758h-0.76c-0.752 0-1.363 0.611-1.363 1.363v1.788H0.387A0.387 0.387 0 0 0 0 11.041v1.953a0.387 0.387 0 0 0 0.387 0.387h0.204v1.787c0 0.752 0.612 1.363 1.363 1.363h0.76v0.759c0 0.752 0.612 1.364 1.363 1.364h1.461c0.752 0 1.363-0.612 1.363-1.364v-3.909h10.222v3.909c0 0.752 0.612 1.364 1.363 1.364h1.461c0.752 0 1.363-0.612 1.363-1.364v-0.758h0.76c0.752 0 1.364-0.611 1.364-1.363v-1.788h0.204a0.387 0.387 0 0 0 0.387-0.387v-1.953a0.387 0.387 0 0 0-0.387-0.387zM2.716 15.755H1.958c-0.325 0-0.588-0.264-0.588-0.588V8.865c0-0.325 0.264-0.589 0.588-0.589h0.758v7.479zm3.412 1.531c0 0.325-0.264 0.589-0.588 0.589H4.08c-0.325 0-0.588-0.264-0.588-0.589V6.746c0-0.325 0.264-0.589 0.588-0.589h1.461c0.325 0 0.588 0.264 0.588 0.589v10.54zm2.442-4.683H7.329v-1.178h1.668v1.178zm6.111 0H8.954v-1.178h5.735v1.178zm2.442 0h-1.667v-1.178h1.667v1.178zm3.412 4.683c0 0.325-0.264 0.589-0.588 0.589h-1.461c-0.325 0-0.588-0.264-0.588-0.589V6.746c0-0.325 0.264-0.589 0.588-0.589h1.461c0.325 0 0.588 0.264 0.588 0.589v10.54zm2.121-2.12c0 0.325-0.264 0.588-0.588 0.588h-0.758V8.276h0.758c0.325 0 0.588 0.264 0.588 0.589v6.301z"/>
                </svg>
                  All Gyms
                </div>
              </li>
              <li 
                className={activeMenuItem === 'links' ? 'active' : ''}
                onClick={() => handleMenuClick('links')}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="menu-icon">
                    <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z" clipRule="evenodd" />
                  </svg>
                  All Links
                </div>
              </li>
            </ul>
          </nav>
          <button onClick={handleLogout} className="logout-button sidebar-logout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="logout-icon">
              <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </aside>
        
        {/* Main Content */}
          <main className="main-content">

            {/* Welcome message - Only show on dashboard */}
            {activeMenuItem === 'dashboard' && (
              <div className="page-title">
                <h2><span className="welcome-text">Welcome, </span>{user?.name || 'admin'}</h2>
              </div>
            )}

            {/* Stats Cards - Only show on dashboard */}
            {activeMenuItem === 'dashboard' && (
              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-title">Total Users</p>
                      <p className="stat-value">{stats ? stats.regular_users : 0}</p>
                    </div>
                    <div className="stat-icon user-icon">
                      <img src="/src/assets/user.png" alt="Users" className="stat-icon-image" />
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-title">Total Gyms</p>
                      <p className="stat-value">{stats ? stats.total_gyms : 0}</p>
                    </div>
                    <div className="stat-icon gym-icon">
                      <img src="/src/assets/gym3.png" alt="Gyms" className="stat-icon-image" />
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-title">Total Admins</p>
                      <p className="stat-value">{stats ? stats.admin_users : 0}</p>
                    </div>
                    <div className="stat-icon admin-icon">
                      <img src="/src/assets/eye.png" alt="Admins" className="stat-icon-image" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conditional content based on active menu item */}
            {activeMenuItem === 'dashboard' && (
              <UserOverviewTable />
            )}
            
            {activeMenuItem === 'users' && (
              <AllUsersTable />
            )}
            
            {activeMenuItem === 'gyms' && (
              <AllGymsTable />
            )}
            
            {activeMenuItem === 'links' && (
              <AllLinksTable />
            )}
          </main>
      </div>
    </div>
  );
};

export default AdminDashboard;