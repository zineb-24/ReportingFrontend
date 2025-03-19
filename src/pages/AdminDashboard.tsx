import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { logout, isAdmin } from '../services/api';
import '../styles/AdminDashboard.css';

interface AdminStats {
  total_users: number;
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
    // In a real app, you would navigate to different routes
    // For now, we're just changing the active menu item
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
                  <path fillRule="evenodd" d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 18.375V5.625zM21 9.375A.375.375 0 0020.625 9h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zM10.875 18.75a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5zM3.375 15h7.5a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375zm0-3.75h7.5a.375.375 0 00.375-.375v-1.5A.375.375 0 0010.875 9h-7.5A.375.375 0 003 9.375v1.5c0 .207.168.375.375.375z" clipRule="evenodd" />
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
          <div className="page-title">
            <h2>Welcome, {user?.name || 'admin'}</h2>
          </div>

          {/* Stats Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-title">Total Users</p>
                  <p className="stat-value">{stats ? stats.total_users : 12}</p>
                </div>
                <div className="stat-icon user-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-title">Total Gyms</p>
                  <p className="stat-value">18</p>
                </div>
                <div className="stat-icon gym-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-title">Total Admins</p>
                  <p className="stat-value">{stats ? stats.admin_users : 3}</p>
                </div>
                <div className="stat-icon admin-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Placeholder for future content */}
          <div className="dashboard-placeholder">
            {activeMenuItem === 'dashboard' && (
              <div>
                <h3>Dashboard Content</h3>
                <p>This is where additional dashboard content will go.</p>
              </div>
            )}
            {activeMenuItem === 'users' && (
              <div>
                <h3>Users Management</h3>
                <p>Here you will be able to manage all users.</p>
              </div>
            )}
            {activeMenuItem === 'gyms' && (
              <div>
                <h3>Gyms Management</h3>
                <p>Here you will be able to manage all gyms.</p>
              </div>
            )}
            {activeMenuItem === 'links' && (
              <div>
                <h3>User-Gym Links</h3>
                <p>Here you will be able to manage all user-gym relationships.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;