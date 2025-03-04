import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { logout, isAdmin } from '../services/api';
import '../index.css';

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

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {user?.name}</h2>
          <p>You are logged in as an administrator.</p>
        </div>

        {stats && (
          <div className="stats-section">
            <h3>System Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Total Users</p>
                <p className="stat-value">{stats.total_users}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Admin Users</p>
                <p className="stat-value">{stats.admin_users}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Regular Users</p>
                <p className="stat-value">{stats.regular_users}</p>
              </div>
            </div>
          </div>
        )}

        <div className="actions-section">
          <h3>Management</h3>
          <div className="action-buttons">
            <button className="action-button">Manage Users</button>
            <button className="action-button">Manage Venues</button>
            <button className="action-button">User-Venue Links</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;