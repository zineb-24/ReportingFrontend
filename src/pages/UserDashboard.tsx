import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { logout, isAdmin } from '../services/api';
import '../styles/UserDashboard.css';
import UserHeader from '../components/UserHeader';
import RevenueChart from '../components/RevenueChart';
import RevenueDistribution from '../components/RevenuePieChart';
import ReportsTable from '../components/Reports';
import { useTranslation } from 'react-i18next';

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

// Custom hook for responsive breakpoints
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width <= 1024);
      setIsDesktop(width > 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// Custom hook for gym tabs scroll detection - FIXED
const useGymTabsScroll = (salles: Salle[]) => {
  const [showArrows, setShowArrows] = useState(false);
  const gymTabsRef = useRef<HTMLDivElement | null>(null);

  const checkScrollable = useCallback(() => {
    if (gymTabsRef.current) {
      const { scrollWidth, clientWidth } = gymTabsRef.current;
      setShowArrows(scrollWidth > clientWidth);
    }
  }, []);

  useEffect(() => {
    checkScrollable();
    let resizeObserver: ResizeObserver | null = null;
    
    if (gymTabsRef.current) {
      resizeObserver = new ResizeObserver(checkScrollable);
      resizeObserver.observe(gymTabsRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [salles, checkScrollable]);

  return { showArrows, gymTabsRef };
};

// Custom hook for outside click detection - FIXED
const useOutsideClick = (
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler]);
};

// Custom hook for swipe gestures on mobile - FIXED
const useSwipeGesture = (
  ref: React.RefObject<HTMLDivElement | null>,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  
  // Responsive hooks
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // State variables
  const [showRangeLimitMessage, setShowRangeLimitMessage] = useState(false);
  const [revenueData, setRevenueData] = useState<Array<{date: string, amount: number, label: string}>>([]);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);
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
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs - FIXED TYPE DEFINITIONS
  const statsScrollRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const monthDropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Gym tabs scroll functionality - FIXED
  const { showArrows, gymTabsRef } = useGymTabsScroll(salles);
  
  // Outside click handler for dropdown - FIXED
  useOutsideClick(dropdownRef, () => setShowDateDropdown(false));
  useOutsideClick(monthDropdownRef, () => setShowMonthDropdown(false));
  
  // Swipe handlers for mobile gym tabs - FIXED
  const scrollGymTabs = useCallback((direction: 'left' | 'right') => {
    if (gymTabsRef.current) {
      const scrollAmount = Math.min(200, gymTabsRef.current.clientWidth / 2);
      gymTabsRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  }, [gymTabsRef]);
  
  // FIXED: Properly typed swipe handlers
  const swipeHandlers = useSwipeGesture(
    gymTabsRef,
    () => scrollGymTabs('left'),
    () => scrollGymTabs('right')
  );

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

  // Auto-collapse sidebar on mobile and close mobile menu on resize
  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
      setIsMobileMenuOpen(false);
    } else {
      setIsSidebarCollapsed(false);
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

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

  // Event handlers
  const handleSalleChange = (salle: Salle) => {
    setSelectedSalle(salle);
  };

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
    setIsMobileMenuOpen(false); // Close mobile menu when item is clicked
    
    if (menuItem === 'dashboard') {
      navigate('/user-dashboard');
    } else {
      navigate(`/user-dashboard/${menuItem}`);
    }
  };

  // Helper function to get month names
  const getMonthName = (monthValue: string): string => {
    const months = [
      t('dateFilter.january'),
      t('dateFilter.february'),
      t('dateFilter.march'),
      t('dateFilter.april'),
      t('dateFilter.may'),
      t('dateFilter.june'),
      t('dateFilter.july'),
      t('dateFilter.august'),
      t('dateFilter.september'),
      t('dateFilter.october'),
      t('dateFilter.november'),
      t('dateFilter.december')
    ];
    
    const monthIndex = parseInt(monthValue) - 1;
    return months[monthIndex] || monthValue;
  };

  // Month selection handler
  const handleMonthSelection = (monthValue: string) => {
    setSelectedMonth(monthValue);
    setShowMonthDropdown(false);
  };

  // Utility functions
  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat('fr-MA', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + ' MAD';
    } catch (error) {
      return amount.toFixed(2) + ' MAD';
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getDateFilterLabel = () => {
    switch (dateFilterType) {
      case 'date': return t('dateFilter.date');
      case 'period': return t('dateFilter.period');
      case 'month': return t('dateFilter.month');
      case 'year': return t('dateFilter.year');
      default: return t('dateFilter.date');
    }
  };

  // Keyboard navigation handler
  const handleKeyboardNavigation = (
    event: React.KeyboardEvent,
    items: Salle[],
    currentIndex: number
  ) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        handleSalleChange(items[prevIndex]);
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        handleSalleChange(items[nextIndex]);
        break;
      case 'Home':
        event.preventDefault();
        handleSalleChange(items[0]);
        break;
      case 'End':
        event.preventDefault();
        handleSalleChange(items[items.length - 1]);
        break;
    }
  };

  // Helper function to render date inputs based on filter type
  const renderDateInputs = () => {
    switch (dateFilterType) {
      case 'date':
        return (
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
        );

      case 'period':
        return (
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
            
            {!isMobile && <span className="customer-date-separator">{t('dateFilter.to')}</span>}
            
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
        );

      case 'month':
        return (
          <div className="customer-month-year-container">
            {/* Custom Month Dropdown */}
            <div className="customer-month-dropdown-container" ref={monthDropdownRef}>
              <button 
                className="customer-month-filter-button"
                onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                aria-expanded={showMonthDropdown}
                aria-haspopup="true"
              >
                {getMonthName(selectedMonth)}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className={`dropdown-arrow ${showMonthDropdown ? 'open' : ''}`}
                >
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                </svg>
              </button>
              
              {showMonthDropdown && (
                <div className="customer-month-dropdown">
                  {[
                    { value: '01', label: t('dateFilter.january') },
                    { value: '02', label: t('dateFilter.february') },
                    { value: '03', label: t('dateFilter.march') },
                    { value: '04', label: t('dateFilter.april') },
                    { value: '05', label: t('dateFilter.may') },
                    { value: '06', label: t('dateFilter.june') },
                    { value: '07', label: t('dateFilter.july') },
                    { value: '08', label: t('dateFilter.august') },
                    { value: '09', label: t('dateFilter.september') },
                    { value: '10', label: t('dateFilter.october') },
                    { value: '11', label: t('dateFilter.november') },
                    { value: '12', label: t('dateFilter.december') }
                  ].map((month) => (
                    <div
                      key={month.value}
                      className={`customer-month-option ${selectedMonth === month.value ? 'active' : ''}`}
                      onClick={() => handleMonthSelection(month.value)}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Year Input - remains the same */}
            <input
              type="number"
              value={selectedYear}
              onChange={handleYearChange}
              min="2020"
              max="2030"
              className="customer-year-input"
              placeholder={t('dateFilter.year')}
            />
          </div>
        );

      case 'year':
        return (
          <div className="customer-year-container">
            <input
              type="number"
              value={selectedYear}
              onChange={handleYearChange}
              min="2020"
              max="2030"
              className="customer-year-input"
              placeholder={t('dateFilter.year')}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Helper function to render dropdown options
  const renderDateDropdown = () => (
    <div className="customer-date-dropdown">
      <div 
        className={`dropdown-option ${dateFilterType === 'date' ? 'active' : ''}`}
        onClick={() => handleDateFilterTypeChange('date')}
      >
        {t('dateFilter.date')}
      </div>
      <div 
        className={`dropdown-option ${dateFilterType === 'period' ? 'active' : ''}`}
        onClick={() => handleDateFilterTypeChange('period')}
      >
        {t('dateFilter.period')}
      </div>
      <div 
        className={`dropdown-option ${dateFilterType === 'month' ? 'active' : ''}`}
        onClick={() => handleDateFilterTypeChange('month')}
      >
        {t('dateFilter.month')}
      </div>
      <div 
        className={`dropdown-option ${dateFilterType === 'year' ? 'active' : ''}`}
        onClick={() => handleDateFilterTypeChange('year')}
      >
        {t('dateFilter.year')}
      </div>
    </div>
  );

  // Responsive date selector layout
  const getDateSelectorLayout = () => {
    if (isMobile) {
      return (
        <div className="customer-date-selector">
          {renderDateInputs()}
          
          <div className="customer-date-dropdown-container" ref={dropdownRef}>
            <button 
              className="customer-date-filter-button"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              aria-expanded={showDateDropdown}
              aria-haspopup="true"
            >
              {getDateFilterLabel()}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="dropdown-arrow">
                <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showDateDropdown && renderDateDropdown()}
          </div>
        </div>
      );
    }
    
    return (
      <div className="customer-date-selector">
        {renderDateInputs()}
        
        <div className="customer-date-dropdown-container" ref={dropdownRef}>
          <button 
            className="customer-date-filter-button"
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            aria-expanded={showDateDropdown}
            aria-haspopup="true"
          >
            {getDateFilterLabel()}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="dropdown-arrow">
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
          
          {showDateDropdown && renderDateDropdown()}
        </div>
      </div>
    );
  };

  // Enhanced gym selector with responsive features - FIXED
  const renderGymSelector = () => {
    const currentSalleIndex = selectedSalle ? salles.findIndex(s => s.id_salle === selectedSalle.id_salle) : -1;
    
    return (
      <div className={`customer-gym-selector ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {showArrows && !isMobile && (
          <button 
            className="customer-nav-arrow prev-arrow" 
            onClick={() => scrollGymTabs('left')}
            aria-label="Scroll gym tabs left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        <div 
          className="customer-gym-tabs" 
          ref={gymTabsRef}
          {...(isMobile ? swipeHandlers : {})}
          onKeyDown={(e) => handleKeyboardNavigation(e, salles, currentSalleIndex)}
          role="tablist"
          aria-label="Gym selection tabs"
        >
          {salles.map((salle) => (
            <div 
              key={salle.id_salle} 
              className={`customer-gym-tab ${selectedSalle && selectedSalle.id_salle === salle.id_salle ? 'active' : ''}`}
              onClick={() => handleSalleChange(salle)}
              role="tab"
              aria-selected={selectedSalle?.id_salle === salle.id_salle}
              aria-controls={`gym-panel-${salle.id_salle}`}
              tabIndex={selectedSalle?.id_salle === salle.id_salle ? 0 : -1}
            >
              {salle.name}
            </div>
          ))}
        </div>
        
        {showArrows && !isMobile && (
          <button 
            className="customer-nav-arrow next-arrow" 
            onClick={() => scrollGymTabs('right')}
            aria-label="Scroll gym tabs right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {isMobile && showArrows && (
          <>
            <button 
              className="customer-nav-arrow prev-arrow" 
              onClick={() => scrollGymTabs('left')}
              aria-label="Scroll gym tabs left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button 
              className="customer-nav-arrow next-arrow" 
              onClick={() => scrollGymTabs('right')}
              aria-label="Scroll gym tabs right"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
          </>
        )}
      </div>
    );
  };

  if (loading && !user) {
    return <div className="loading">{t('welcome.loadingDashboard')}</div>;
  }

  return (
    <div className="customer-layout">
      {/* Enhanced Header with Mobile Menu Button */}
      <UserHeader onMobileMenuToggle={toggleMobileMenu} isMobile={isMobile} />

      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={closeMobileMenu}
        />
      )}

      <div className="customer-content">
        {/* Enhanced Sidebar with Mobile Support */}
        <aside className={`customer-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobile && isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Collapse/Expand Button - Hidden on mobile */}
          {!isMobile && (
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
          )}

          <nav className="customer-sidebar-nav">
            <ul>
              <li 
                className={activeMenuItem === 'dashboard' ? 'active' : ''}
                onClick={() => handleMenuClick('dashboard')}
                title={isSidebarCollapsed && !isMobile ? t('sidebar.dashboard') : ''}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMenuClick('dashboard');
                  }
                }}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                  </svg>
                  <span className="menu-text">{t('sidebar.dashboard')}</span>
                </div>
              </li>

              <li 
                className={activeMenuItem === 'reports' ? 'active' : ''}
                onClick={() => handleMenuClick('reports')}
                title={isSidebarCollapsed && !isMobile ? t('sidebar.reports') : ''}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMenuClick('reports');
                  }
                }}
              >
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-menu-icon">
                    <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
                    <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                  </svg>
                  <span className="menu-text">{t('sidebar.reports')}</span>
                </div>
              </li>
            </ul>
          </nav>
          
          <button 
            onClick={handleLogout} 
            className="customer-sidebar-logout"
            aria-label="Logout"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogout();
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="customer-logout-icon">
              <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
            <span className="menu-text">{t('sidebar.logout')}</span>
          </button>
        </aside>
        
        {/* Enhanced Gym Selector */}
        {renderGymSelector()}

        {/* Main Content */}
        <main className={`customer-main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {activeMenuItem === 'dashboard' && (
            <>
              {/* Welcome message with responsive date selector */}
              <div className="customer-welcome-section">
                <h2>
                  <span className="customer-welcome-text">{t('welcome.greeting')} </span>
                  {user?.name || 'user'}
                </h2>
                
                {/* Responsive Date Selector */}
                {getDateSelectorLayout()}
              </div>

              {/* Enhanced Stats Cards with improved scrolling */}
              <div className="customer-stats-carousel">
                <div className="customer-stats-container">
                  <button 
                    className="customer-stats-nav-arrow customer-stats-prev"
                    onClick={() => {
                      if (statsScrollRef.current) {
                        const scrollAmount = isMobile ? 180 : 250;
                        statsScrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                      }
                    }}
                    aria-label="Scroll stats left"
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
                          <p className="customer-stat-title">{t('stats.totalRevenue')}</p>
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
                          <p className="customer-stat-title">{t('stats.totalPayments')}</p>
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
                          <p className="customer-stat-title">{t('stats.newClients')}</p>
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
                          <p className="customer-stat-title">{t('stats.newSubscriptions')}</p>
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
                          <p className="customer-stat-title">{t('stats.expiredContracts')}</p>
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
                          <p className="customer-stat-title">{t('stats.activeClients')}</p>
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
                        const scrollAmount = isMobile ? 180 : 250;
                        statsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                      }
                    }}
                    aria-label="Scroll stats right"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Dashboard content area with responsive charts */}
              <div className="customer-dashboard-content">
                {/* Revenue Distribution Chart */}
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
                    <p>{t('revenue.rangeExceeded')}</p>
                  </div>
                )}

                {/* Revenue Chart */}
                {selectedSalle && (
                  <RevenueChart
                    data={revenueData}
                    selectedDate={dateFilterType === 'date' ? (dateRange.startDate || undefined) : undefined}
                    dateMode={dateFilterType === 'date' ? 'date' : 'period'}
                    isLoading={isRevenueLoading}
                  />
                )}

                {/* Fallback messages */}
                {!selectedSalle && (
                  <div className="customer-select-gym-message">
                    <p>{t('welcome.selectGym')}</p>
                  </div>
                )}
                
                {selectedSalle && loading && (
                  <div className="customer-loading-data">
                    <p>{t('welcome.loadingData')}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Reports Tab Content */}
          {activeMenuItem === 'reports' && (
            <div role="tabpanel" id={`gym-panel-${selectedSalle?.id_salle}`} aria-labelledby="reports-tab">
              <ReportsTable 
                selectedSalle={selectedSalle}
                initialDateFilterType={dateFilterType}
                initialDateRange={dateRange}
                initialSelectedMonth={selectedMonth}
                initialSelectedYear={selectedYear}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;