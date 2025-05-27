import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { logout, isAdmin } from '../services/api';
import '../styles/UserDashboard.css';
import UserHeader from '../components/UserHeader';
import RevenueChart from '../components/RevenueChart';
import RevenueDistribution from '../components/RevenuePieChart';
import ReportsTable from '../components/Reports';

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

type DateFilterType = 'date' | 'period' | 'month' | 'year' | 'day' | 'custom';

const UserDashboard: React.FC = () => {
  const [showRangeLimitMessage, setShowRangeLimitMessage] = useState(false);
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
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('date');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const statsScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format date for API requests
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Initialize dates on component mount
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    
    if (dateFilterType === 'date') {
      setDateRange({
        startDate: formatDate(today),
        endDate: formatDate(today)
      });
    } else if (dateFilterType === 'period') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setDateRange({
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth)
      });
    }
  }, [dateFilterType]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    if (isAdmin()) {
      navigate('/admin-dashboard');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const response = await api.get('/user-dashboard/');
        setUser(response.data.user);
        setSalles(response.data.salles);
        
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

  // Fetch stats whenever selected salle or date changes (only for dashboard)
  useEffect(() => {
    if (!selectedSalle || activeMenuItem !== 'dashboard') return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        let dateParam = '';
        let dateTypeParam: string = 'day';

        if (dateFilterType === 'date' && dateRange.startDate) {
          dateParam = dateRange.startDate;
          dateTypeParam = 'day';
        } else if (dateFilterType === 'period' && dateRange.startDate && dateRange.endDate) {
          dateParam = `${dateRange.startDate} to ${dateRange.endDate}`;
          dateTypeParam = 'custom';
        } else if (dateFilterType === 'month' && selectedMonth && selectedYear) {
          dateParam = `${selectedYear}-${selectedMonth}`;
          dateTypeParam = 'month';
        } else if (dateFilterType === 'year' && selectedYear) {
          dateParam = selectedYear;
          dateTypeParam = 'year';
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
  }, [selectedSalle, dateRange, dateFilterType, selectedMonth, selectedYear, activeMenuItem]);

  // Effect for checking if tabs are scrollable
  useEffect(() => {
    checkTabsScrollable();
    window.addEventListener('resize', checkTabsScrollable);
    
    return () => {
      window.removeEventListener('resize', checkTabsScrollable);
    };
  }, [salles]);

  const handleSalleChange = (salle: Salle) => {
    setSelectedSalle(salle);
  };

  // Effect for fetching revenue data for the Bar Chart (only for dashboard)
  useEffect(() => {
    if (!selectedSalle || activeMenuItem !== 'dashboard') return;
    
    const fetchRevenueData = async () => {
      try {
        setIsRevenueLoading(true);
        
        let dateParam = '';
        let dateTypeParam: string = 'day';

        if (dateFilterType === 'date' && dateRange.startDate) {
          dateParam = dateRange.startDate;
          dateTypeParam = 'day';
        } else if (dateFilterType === 'period' && dateRange.startDate && dateRange.endDate) {
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff > 30) {
            setShowRangeLimitMessage(true);
          } else {
            setShowRangeLimitMessage(false);
          }
          
          dateParam = `${dateRange.startDate} to ${dateRange.endDate}`;
          dateTypeParam = 'custom';
        } else if (dateFilterType === 'month' && selectedMonth && selectedYear) {
          dateParam = `${selectedYear}-${selectedMonth}`;
          dateTypeParam = 'month';
        } else if (dateFilterType === 'year' && selectedYear) {
          dateParam = selectedYear;
          dateTypeParam = 'year';
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
  }, [selectedSalle, dateRange, dateFilterType, selectedMonth, selectedYear, activeMenuItem]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    
    if (dateFilterType === 'date') {
      setDateRange({
        startDate: newDate,
        endDate: newDate
      });
    } else {
      if (event.target.id === 'start-date') {
        setDateRange({
          ...dateRange,
          startDate: newDate
        });
      } else {
        setDateRange({
          ...dateRange,
          endDate: newDate
        });
      }
    }
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(event.target.value);
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedYear(event.target.value);
  };

  const handleDateFilterTypeChange = (type: DateFilterType) => {
    setDateFilterType(type);
    setShowDateDropdown(false);
    
    const today = new Date();
    if (type === 'date') {
      setDateRange({
        startDate: formatDate(today),
        endDate: formatDate(today)
      });
    } else if (type === 'period') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateRange({
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth)
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (menuItem: string) => {
    setActiveMenuItem(menuItem);
    
    if (menuItem === 'dashboard') {
      navigate('/user-dashboard');
    } else {
      navigate(`/user-dashboard/${menuItem}`);
    }
  };

  /*const handleGoToReports = () => {
    // Navigate to reports page with current filters
    handleMenuClick('reports');
  };*/

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' MAD';
  };

  const checkTabsScrollable = () => {
    const tabsContainer = document.querySelector('.customer-gym-tabs');
    if (tabsContainer) {
      const isScrollable = tabsContainer.scrollWidth > tabsContainer.clientWidth;
      setShowArrows(isScrollable);
    }
  };

  const toggleSidebar = () => {
  setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getDateFilterLabel = () => {
    switch (dateFilterType) {
      case 'date': return 'Date';
      case 'period': return 'Period';
      case 'month': return 'Month';
      case 'year': return 'Year';
      default: return 'Date';
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
      <aside className={`customer-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Collapse/Expand Button */}
        <button 
          className="customer-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            className={`toggle-icon ${isSidebarCollapsed ? 'collapsed' : ''}`}
          >
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        <nav className="customer-sidebar-nav">
          <ul>
            <li 
              className={activeMenuItem === 'dashboard' ? 'active' : ''}
              onClick={() => handleMenuClick('dashboard')}
              title={isSidebarCollapsed ? 'Dashboard' : ''}
            >
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                  <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                  <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                </svg>
                <span className="menu-text">Dashboard</span>
              </div>
            </li>

            <li 
              className={activeMenuItem === 'reports' ? 'active' : ''}
              onClick={() => handleMenuClick('reports')}
              title={isSidebarCollapsed ? 'Reports' : ''}
            >
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                  <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
                  <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                </svg>
                <span className="menu-text">Reports</span>
              </div>
            </li>
          </ul>
        </nav>
        
        <button onClick={handleLogout} className="customer-sidebar-logout">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-logout-icon">
            <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          <span className="menu-text">Logout</span>
        </button>
      </aside>
      
      {/* Gym Selector */}
      <div className={`customer-gym-selector ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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

      {/* Main Content */}
      <main className={`customer-main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {activeMenuItem === 'dashboard' && (
          <>
            {/* Welcome message */}
            <div className="customer-welcome-section">
              <h2><span className="customer-welcome-text">Welcome, </span>{user?.name || 'user'}</h2>
              
              {/*Date Selector with Dropdown */}
              <div className="customer-date-selector">
                {/* Date inputs based on selected filter type - NOW FIRST */}
                {dateFilterType === 'date' && (
                  <div className="customer-date-input-container">
                    <div className="customer-date-input-wrapper">
                      <input
                        type="date"
                        id="single-date"
                        value={dateRange.startDate || ''}
                        onChange={handleDateChange}
                        className="customer-date-input"
                      />
                    </div>
                  </div>
                )}

                {dateFilterType === 'period' && (
                  <div className="customer-date-range-container">
                    <div className="customer-date-input-wrapper">
                      <input
                        type="date"
                        id="start-date"
                        value={dateRange.startDate || ''}
                        onChange={handleDateChange}
                        className="customer-date-input"
                      />
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
                    </div>
                  </div>
                )}

                {dateFilterType === 'month' && (
                  <div className="customer-month-year-container">
                    <select
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="customer-month-select"
                    >
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={handleYearChange}
                      min="2020"
                      max="2030"
                      className="customer-year-input"
                      placeholder="Year"
                    />
                  </div>
                )}

                {dateFilterType === 'year' && (
                  <div className="customer-year-container">
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={handleYearChange}
                      min="2020"
                      max="2030"
                      className="customer-year-input"
                      placeholder="Year"
                    />
                  </div>
                )}

                {/* Dropdown container - NOW SECOND */}
                <div className="customer-date-dropdown-container" ref={dropdownRef}>
                  <button 
                    className="customer-date-filter-button"
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                  >
                    {getDateFilterLabel()}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="dropdown-arrow">
                      <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {showDateDropdown && (
                    <div className="customer-date-dropdown">
                      <div 
                        className={`dropdown-option ${dateFilterType === 'date' ? 'active' : ''}`}
                        onClick={() => handleDateFilterTypeChange('date')}
                      >
                        Date
                      </div>
                      <div 
                        className={`dropdown-option ${dateFilterType === 'period' ? 'active' : ''}`}
                        onClick={() => handleDateFilterTypeChange('period')}
                      >
                        Period
                      </div>
                      <div 
                        className={`dropdown-option ${dateFilterType === 'month' ? 'active' : ''}`}
                        onClick={() => handleDateFilterTypeChange('month')}
                      >
                        Month
                      </div>
                      <div 
                        className={`dropdown-option ${dateFilterType === 'year' ? 'active' : ''}`}
                        onClick={() => handleDateFilterTypeChange('year')}
                      >
                        Year
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="customer-stats-carousel">
              <div className="customer-stats-container">
                <button 
                  className="customer-stats-nav-arrow customer-stats-prev"
                  onClick={() => {
                    if (statsScrollRef.current) {
                      const scrollAmount = 250;
                      statsScrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <div className="customer-stats-scroll-area" ref={statsScrollRef}>
                  {/* Total Revenue Card */}
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
                      const scrollAmount = 250;
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
              {/* Chart and table components */}

              {selectedSalle && (
                <RevenueDistribution
                  salleId={selectedSalle.id_salle}
                  dateMode={dateFilterType === 'date' ? 'date' : 'period'}
                  startDate={
                    dateFilterType === 'month' 
                      ? `${selectedYear}-${selectedMonth}-01` 
                      : dateFilterType === 'year' 
                      ? `${selectedYear}-01-01` 
                      : dateRange.startDate || null
                  }
                  endDate={
                    dateFilterType === 'month' 
                      ? `${selectedYear}-${selectedMonth}-${new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate().toString().padStart(2, '0')}` 
                      : dateFilterType === 'year' 
                      ? `${selectedYear}-12-31` 
                      : dateRange.endDate || null
                  }
                />
              )}
            
              {/* Message if the time period selected exceeds 30 days */}
              {showRangeLimitMessage && dateFilterType === 'period' && (
                <div className="customer-range-limit-message">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="info-icon">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  <p>Your selected range exceeds 30 days. Only showing the first 30 days of data.</p>
                </div>
              )}

              {selectedSalle && (
                <RevenueChart
                  data={revenueData}
                  selectedDate={dateFilterType === 'date' ? (dateRange.startDate || undefined) : undefined}
                  dateMode={dateFilterType === 'date' ? 'date' : 'period'}
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

        {/* Reports Tab Content */}
        {activeMenuItem === 'reports' && (
          <ReportsTable 
            selectedSalle={selectedSalle}
            initialDateFilterType={dateFilterType}
            initialDateRange={dateRange}
            initialSelectedMonth={selectedMonth}
            initialSelectedYear={selectedYear}
          />
        )}
      </main>
    </div>
  </div>
);
};

export default UserDashboard;