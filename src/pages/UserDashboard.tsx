import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { logout, isAuthenticated, isAdmin } from '../services/api';
import '../index.css';

interface UserData {
  id_user: number;
  name: string;
  email: string;
  phone: string;
}

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Check if user is authenticated but not admin
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (isAdmin()) {
      navigate('/admin-dashboard');
      return;
    }

    // Fetch user data
    const fetchUserData = async () => {
      try {
        const response = await api.get('/user-dashboard/');
        setUserData(response.data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
        // If API call fails, redirect to login
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
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
        <h1>User Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {userData?.name}</h2>
          <p>You are logged in as a user.</p>
        </div>

        <div className="user-info-section">
          <h3>Your Information</h3>
          <div className="user-info-card">
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{userData?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone:</span>
              <span className="info-value">{userData?.phone || 'Not provided'}</span>
            </div>
          </div>
        </div>

        <div className="venues-section">
          <h3>Your Venues</h3>
          <p className="placeholder-text">
            You have no venues assigned yet. Contact an administrator to get access to venues.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;