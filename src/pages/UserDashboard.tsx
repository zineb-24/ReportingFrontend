import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { logout, isAdmin } from '../services/api';
import '../styles/UserDashboard.css';
import UserHeader from '../components/UserHeader';
import RevenueChart from '../components/RevenueChart';

interface UserStats {
  total_amount: number;
  reglements_count: number;
  new_clients_count: number;
  new_subscriptions_count: number;
  expired_contracts_count: number;
  active_clients_count: number;
}

interface Salle {
  id_salle: number;
  name: string;
  phone: string;
}

interface User {
  id_user: number;
  name: string;
  email: string;
}

interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

const UserDashboard: React.FC = () => {
  const [revenueData, setRevenueData] = useState<Array<{date: string, amount: number, label: string}>>([]);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);
  const gymTabsRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [selectedSalle, setSelectedSalle] = useState<Salle | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dateMode, setDateMode] = useState<'date' | 'period'>('date');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const statsScrollRef = useRef<HTMLDivElement>(null);

  // Set active menu item based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/users')) {
      setActiveMenuItem('users');
    } else if (path.includes('/gyms')) {
      setActiveMenuItem('gyms');
    } else if (path.includes('/links')) {
      setActiveMenuItem('links');
    } else if (path.includes('/reports')) {
      setActiveMenuItem('reports');
    } else {
      setActiveMenuItem('dashboard');
    }
  }, [location]);

  // Format date for API requests
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Initialize dates on component mount
  useEffect(() => {
    const today = new Date();
    
    if (dateMode === 'date') {
      setDateRange({
        startDate: formatDate(today),
        endDate: formatDate(today)
      });
    } else {
      // For period, default to current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setDateRange({
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth)
      });
    }
  }, [dateMode]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    // Check if user is not admin
    if (isAdmin()) {
      navigate('/admin-dashboard');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const response = await api.get('/user-dashboard/');
        setUser(response.data.user);
        setSalles(response.data.salles);
        
        // Set first salle as selected if available
        if (response.data.salles.length > 0) {
          setSelectedSalle(response.data.salles[0]);
        }
      } catch (error) {
        console.error('Error fetching user dashboard:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  // Fetch stats whenever selected salle or date range changes
  useEffect(() => {
    if (!selectedSalle || !dateRange.startDate) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        let dateParam = '';
        let dateTypeParam = 'day';

        if (dateRange.startDate) {
          if (dateMode === 'date') {
            dateParam = dateRange.startDate;
          } else if (dateRange.endDate) {
            dateParam = `${dateRange.startDate} to ${dateRange.endDate}`;
            dateTypeParam = 'custom';
          }
        }
                
        const response = await api.get('/user-dashboard/stats/', {
          params: {
            salle_id: selectedSalle.id_salle,
            date_type: dateTypeParam,
            date: dateParam
          }
        });
        
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedSalle, dateRange, dateMode]);


  // Effect for checking if tabs are scrollable
  useEffect(() => {
    // Run once when salles are loaded
    checkTabsScrollable();
    
    // Also run on window resize
    window.addEventListener('resize', checkTabsScrollable);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkTabsScrollable);
    };
  }, [salles]);


  const handleSalleChange = (salle: Salle) => {
    setSelectedSalle(salle);
  };


  // Effect for fetching revenue data for the Bar Chart
  useEffect(() => {
    if (!selectedSalle || !dateRange.startDate) return;
    
    const fetchRevenueData = async () => {
      try {
        setIsRevenueLoading(true);
        
        let dateParam = '';
        let dateTypeParam = 'day';
        
        if (dateRange.startDate) {
          if (dateMode === 'date') {
            dateParam = dateRange.startDate;
          } else if (dateRange.endDate) {
            // Check if selected range is more than 30 days
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 30) {
              // You can show a notification to the user here
              console.log('Selected range exceeds 30 days. Only showing the first 30 days.');
              // Optional: You could use a toast notification library or add a small message
            }
            
            dateParam = `${dateRange.startDate} to ${dateRange.endDate}`;
            dateTypeParam = 'custom';
          }
        }
        
        const response = await api.get('/user-dashboard/revenue/', {
          params: {
            salle_id: selectedSalle.id_salle,
            date_type: dateTypeParam,
            date: dateParam
          }
        });
        
        setRevenueData(response.data.revenue_data);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setIsRevenueLoading(false);
      }
    };
    
    fetchRevenueData();
  }, [selectedSalle, dateRange, dateMode]);


  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    
    if (dateMode === 'date') {
      setDateRange({
        startDate: newDate,
        endDate: newDate
      });
    } else {
      // If it's the start date
      if (event.target.id === 'start-date') {
        setDateRange({
          ...dateRange,
          startDate: newDate
        });
      } else {
        // It's the end date
        setDateRange({
          ...dateRange,
          endDate: newDate
        });
      }
    }
  };


  const toggleDateMode = () => {
    setDateMode(dateMode === 'date' ? 'period' : 'date');
  };


  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  const handleMenuClick = (menuItem: string) => {
    setActiveMenuItem(menuItem);
    
    // Update URL based on menu selection
    if (menuItem === 'dashboard') {
      navigate('/user-dashboard');
    } else {
      navigate(`/user-dashboard/${menuItem}`);
    }
  };

  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' MAD';
  };


  /*{const handleStatsScroll = (direction: 'left' | 'right') => {
    if (!statsScrollRef.current) return;
    
    const scrollAmount = 250; // Adjust based on card width + gap
    const currentScroll = statsScrollRef.current.scrollLeft;
    
    if (direction === 'left') {
      statsScrollRef.current.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: 'smooth'
      });
    } else {
      statsScrollRef.current.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  };}*/

  
  const checkTabsScrollable = () => {
    const tabsContainer = document.querySelector('.customer-gym-tabs');
    if (tabsContainer) {
      const isScrollable = tabsContainer.scrollWidth > tabsContainer.clientWidth;
      setShowArrows(isScrollable);
    }
  };

  if (loading && !user) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="customer-layout">
      {/* Header */}
      <UserHeader />
  
      <div className="customer-content">
        {/* Sidebar */}
        <aside className="customer-sidebar">
          <nav className="customer-sidebar-nav">
            <ul>
              <li 
                className={activeMenuItem === 'dashboard' ? 'active' : ''}
                onClick={() => handleMenuClick('dashboard')}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                  All Users
                </div>
              </li>
              <li 
                className={activeMenuItem === 'links' ? 'active' : ''}
                onClick={() => handleMenuClick('links')}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                    <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z" clipRule="evenodd" />
                  </svg>
                  All Links
                </div>
              </li>
              <li 
                className={activeMenuItem === 'reports' ? 'active' : ''}
                onClick={() => handleMenuClick('reports')}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                    <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
                    <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                  </svg>
                  Reports
                </div>
              </li>
            </ul>
          </nav>
          <button onClick={handleLogout} className="customer-sidebar-logout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-logout-icon">
              <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </aside>
        
        {/* Main Content */}
        <main className="customer-main-content">
          {activeMenuItem === 'dashboard' && (
            <>
              {/* Gym Selector */}
              <div className="customer-gym-selector">
                {showArrows && (
                  <button className="customer-nav-arrow prev-arrow" onClick={() => {
                    const tabs = document.querySelector('.customer-gym-tabs');
                    if (tabs) tabs.scrollBy({ left: -200, behavior: 'smooth' });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                
                <div className="customer-gym-tabs" ref={gymTabsRef}>
                  {salles.map((salle) => (
                    <div 
                      key={salle.id_salle} 
                      className={`customer-gym-tab ${selectedSalle && selectedSalle.id_salle === salle.id_salle ? 'active' : ''}`}
                      onClick={() => handleSalleChange(salle)}
                    >
                      {salle.name}
                    </div>
                  ))}
                </div>
                
                {showArrows && (
                  <button className="customer-nav-arrow next-arrow" onClick={() => {
                    const tabs = document.querySelector('.customer-gym-tabs');
                    if (tabs) tabs.scrollBy({ left: 200, behavior: 'smooth' });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
  
              {/* Welcome message */}
              <div className="customer-welcome-section">
                <h2><span className="customer-welcome-text">Welcome, </span>{user?.name || 'user'}</h2>
                
                <div className="customer-date-selector">
                  {dateMode === 'date' ? (
                    <div className="customer-date-input-container">
                      <div className="customer-date-input-wrapper">
                        <input
                          type="date"
                          id="single-date"
                          value={dateRange.startDate || ''}
                          onChange={handleDateChange}
                          className="customer-date-input"
                        />
                        {/*<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-date-icon">
                          <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                        </svg>*/}
                      </div>
                    </div>
                  ) : (
                    <div className="customer-date-range-container">
                      <div className="customer-date-input-wrapper">
                        <input
                          type="date"
                          id="start-date"
                          value={dateRange.startDate || ''}
                          onChange={handleDateChange}
                          className="customer-date-input"
                        />
                        {/*<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-date-icon">
                          <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                        </svg>*/}
                      </div>
                      
                      <span className="customer-date-separator">To</span>
                      
                      <div className="customer-date-input-wrapper">
                        <input
                          type="date"
                          id="end-date"
                          value={dateRange.endDate || ''}
                          onChange={handleDateChange}
                          className="customer-date-input"
                        />
                        {/*<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-date-icon">
                          <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                        </svg>*/}
                      </div>
                    </div>
                  )}
                  
                  <button onClick={toggleDateMode} className="customer-date-toggle-button">
                    {dateMode === 'date' ? 'Date' : 'Period'}
                  </button>
                </div>
              </div>
  

                  {/* Stats Cards */}
                  <div className="customer-stats-carousel">
                    <div className="customer-stats-container">
                      <button 
                        className="customer-stats-nav-arrow customer-stats-prev"
                        onClick={() => {
                          if (statsScrollRef.current) {
                            const scrollAmount = 250; // Adjust based on card width + gap
                            statsScrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      <div className="customer-stats-scroll-area" ref={statsScrollRef}>
                        {/* New Card: Total Revenue */}
                        <div className="customer-stat-card customer-revenue-card">
                          <div className="customer-stat-content">
                            <div className="customer-stat-info">
                              <p className="customer-stat-title">Total Revenue</p>
                              <p className="customer-stat-value">
                                {stats?.total_amount ? formatCurrency(stats.total_amount) : formatCurrency(0)}
                              </p>
                            </div>
                            <div className="customer-stat-icon customer-revenue-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-stat-icon-svg">
                                <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                                <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
                                <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Card 1: Payments Count */}
                        <div className="customer-stat-card">
                          <div className="customer-stat-content">
                            <div className="customer-stat-info">
                              <p className="customer-stat-title">Total Payments</p>
                              <p className="customer-stat-value">{stats?.reglements_count || 0}</p>
                            </div>
                            <div className="customer-stat-icon customer-payment-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-stat-icon-svg">
                                <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                                <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: New Clients */}
                        <div className="customer-stat-card">
                          <div className="customer-stat-content">
                            <div className="customer-stat-info">
                              <p className="customer-stat-title">New Clients</p>
                              <p className="customer-stat-value">{stats?.new_clients_count || 0}</p>
                            </div>
                            <div className="customer-stat-icon customer-client-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-stat-icon-svg">
                                <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 3: New Subscriptions */}
                        <div className="customer-stat-card">
                          <div className="customer-stat-content">
                            <div className="customer-stat-info">
                              <p className="customer-stat-title">New Subscriptions</p>
                              <p className="customer-stat-value">{stats?.new_subscriptions_count || 0}</p>
                            </div>
                            <div className="customer-stat-icon customer-subscription-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-stat-icon-svg">
                                <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zM6 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V12zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V15zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 18a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V18zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Card 4: Expired Contracts */}
                        <div className="customer-stat-card">
                          <div className="customer-stat-content">
                            <div className="customer-stat-info">
                              <p className="customer-stat-title">Expired Contracts</p>
                              <p className="customer-stat-value">{stats?.expired_contracts_count || 0}</p>
                            </div>
                            <div className="customer-stat-icon customer-expired-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-stat-icon-svg">
                                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Card 5: Active Clients */}
                        <div className="customer-stat-card">
                          <div className="customer-stat-content">
                            <div className="customer-stat-info">
                              <p className="customer-stat-title">Active Clients</p>
                              <p className="customer-stat-value">{stats?.active_clients_count || 0}</p>
                            </div>
                            <div className="customer-stat-icon customer-active-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-stat-icon-svg">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className="customer-stats-nav-arrow customer-stats-next"
                        onClick={() => {
                          if (statsScrollRef.current) {
                            const scrollAmount = 250; // Adjust based on card width + gap
                            statsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Dashboard content area */}
                  <div className="customer-dashboard-content">
                    {/* Chart or table components will go here */}
                    {selectedSalle && (
                      <RevenueChart
                        data={revenueData}
                        selectedDate={dateRange.startDate || undefined}
                        dateMode={dateMode}
                        isLoading={isRevenueLoading}
                      />
                    )}

                    {!selectedSalle && (
                      <div className="customer-select-gym-message">
                        <p>Please select a gym to view detailed statistics</p>
                      </div>
                    )}
                    
                    {selectedSalle && loading && (
                      <div className="customer-loading-data">
                        <p>Loading data...</p>
                      </div>
                    )}
                    
                  </div>
                  </>
                  )}

                  {/* Users Tab Content */}
                  {activeMenuItem === 'users' && (
                    <div className="customer-tab-content">
                      <h2>All Users</h2>
                      <p>This section will display user information.</p>
                      {/* You will add your users component here */}
                    </div>
                  )}

                  {/* Links Tab Content */}
                  {activeMenuItem === 'links' && (
                    <div className="customer-tab-content">
                      <h2>All Links</h2>
                      <p>This section will display user-gym links.</p>
                      {/* You will add your links component here */}
                    </div>
                  )}

                  {/* Reports Tab Content */}
                  {activeMenuItem === 'reports' && (
                    <div className="customer-tab-content">
                      <h2>Reports</h2>
                      <p>This section will display reports and analytics.</p>
                      {/* You will add your reports component here */}
                    </div>
                  )}
                  </main>
                  </div>
                  </div>
                  );
};

export default UserDashboard;