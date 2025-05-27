import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import '../styles/Reports.css';

interface ReglementData {
  ID_reglement: number;
  CONTRAT: string;
  CLIENT: string;
  DATE_CONTRAT: string;
  DATE_DEBUT: string;
  DATE_FIN: string;
  USERC: string;
  FAMILLE: string;
  SOUSFAMILLE: string;
  LIBELLE: string;
  DATE_ASSURANCE: string;
  MONTANT: number;
  MODE: string;
  TARIFAIRE: string;
  DATE_REGLEMENT: string;
  id_salle: number;
  salle_name?: string;
}

interface Salle {
  id_salle: number;
  name: string;
  phone: string;
}

interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

type DateFilterType = 'date' | 'period' | 'month' | 'year' | 'day' | 'custom';

interface ReportsTableProps {
  selectedSalle: Salle | null;
  initialDateFilterType?: DateFilterType;
  initialDateRange?: DateRange;
  initialSelectedMonth?: string;
  initialSelectedYear?: string;
}

const ReportsTable: React.FC<ReportsTableProps> = ({ 
  selectedSalle,
  initialDateFilterType = 'date',
  initialDateRange,
  initialSelectedMonth,
  initialSelectedYear
}) => {
  const [reglements, setReglements] = useState<ReglementData[]>([]);
  const [filteredReglements, setFilteredReglements] = useState<ReglementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>(initialDateFilterType);
  const [dateRange, setDateRange] = useState<DateRange>(
    initialDateRange || { startDate: null, endDate: null }
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(initialSelectedMonth || '');
  const [selectedYear, setSelectedYear] = useState<string>(initialSelectedYear || '');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

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

  // Initialize dates - only if no initial values provided
  useEffect(() => {
    // Skip initialization if initial values were provided
    if (initialDateRange || initialSelectedMonth || initialSelectedYear) {
      return;
    }

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
  }, [dateFilterType, initialDateRange, initialSelectedMonth, initialSelectedYear]);

  // Update state when initial props change (when coming from dashboard)
  useEffect(() => {
    if (initialDateFilterType) {
      setDateFilterType(initialDateFilterType);
    }
    if (initialDateRange) {
      setDateRange(initialDateRange);
    }
    if (initialSelectedMonth) {
      setSelectedMonth(initialSelectedMonth);
    }
    if (initialSelectedYear) {
      setSelectedYear(initialSelectedYear);
    }
  }, [initialDateFilterType, initialDateRange, initialSelectedMonth, initialSelectedYear]);

  // Fetch reglements when selectedSalle or date changes
  useEffect(() => {
    if (!selectedSalle) return;

    const fetchReglements = async () => {
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

        const response = await api.get('/user-dashboard/reports/', {
          params: {
            salle_id: selectedSalle.id_salle,
            date_type: dateTypeParam,
            date: dateParam
          }
        });
        
        // Add salle name to each reglement
        const reglementsWithSalle = response.data.reglements.map((reglement: ReglementData) => ({
          ...reglement,
          salle_name: selectedSalle.name
        }));
        
        setReglements(reglementsWithSalle);
        setFilteredReglements(reglementsWithSalle);
      } catch (error) {
        console.error('Error fetching reglements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReglements();
  }, [selectedSalle, dateRange, dateFilterType, selectedMonth, selectedYear]);

  // Apply search filter
  useEffect(() => {
    let result = [...reglements];
    
    if (searchTerm) {
      result = result.filter(reglement => 
        Object.values(reglement).some(value => 
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    setFilteredReglements(result);
    setCurrentPage(1);
  }, [reglements, searchTerm]);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' MAD';
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
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

  const getDateFilterLabel = () => {
    switch (dateFilterType) {
      case 'date': return 'Date';
      case 'period': return 'Period';
      case 'month': return 'Month';
      case 'year': return 'Year';
      default: return 'Date';
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReglements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReglements.length / itemsPerPage);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading && !reglements.length) {
    return <div className="reports-loading-indicator">Loading reports data...</div>;
  }

  if (!selectedSalle) {
    return (
      <div className="reports-container">
        <div className="reports-header">
          <h3>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-icon">
              <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
              <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
            </svg>
            Reports - All Data
          </h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          <p>Please select a gym to view reports data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-icon">
            <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
            <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
          </svg>
          Reports - All Data ({selectedSalle.name})
        </h3>

        <div className="reports-controls">
          {/* Date Selector */}
          <div className="reports-date-selector">
            {/* Date inputs based on selected filter type */}
            {dateFilterType === 'date' && (
              <div className="reports-date-input-container">
                <input
                  type="date"
                  id="single-date"
                  value={dateRange.startDate || ''}
                  onChange={handleDateChange}
                  className="reports-date-input"
                />
              </div>
            )}

            {dateFilterType === 'period' && (
              <div className="reports-date-range-container">
                <input
                  type="date"
                  id="start-date"
                  value={dateRange.startDate || ''}
                  onChange={handleDateChange}
                  className="reports-date-input"
                />
                
                <span className="reports-date-separator">To</span>
                
                <input
                  type="date"
                  id="end-date"
                  value={dateRange.endDate || ''}
                  onChange={handleDateChange}
                  className="reports-date-input"
                />
              </div>
            )}

            {dateFilterType === 'month' && (
              <div className="reports-month-year-container">
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="reports-month-select"
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
                  className="reports-year-input"
                  placeholder="Year"
                />
              </div>
            )}

            {dateFilterType === 'year' && (
              <div className="reports-year-container">
                <input
                  type="number"
                  value={selectedYear}
                  onChange={handleYearChange}
                  min="2020"
                  max="2030"
                  className="reports-year-input"
                  placeholder="Year"
                />
              </div>
            )}

            {/* Dropdown container */}
            <div className="reports-date-dropdown-container" ref={dropdownRef}>
              <button 
                className="reports-date-filter-button"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
              >
                {getDateFilterLabel()}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-dropdown-arrow">
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                </svg>
              </button>
              
              {showDateDropdown && (
                <div className="reports-date-dropdown">
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'date' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('date')}
                  >
                    Date
                  </div>
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'period' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('period')}
                  >
                    Period
                  </div>
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'month' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('month')}
                  >
                    Month
                  </div>
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'year' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('year')}
                  >
                    Year
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="reports-search-container">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reports-search-input"
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-search-icon">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="reports-table-responsive">
        <table className="reports-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Contract</th>
              <th>Client</th>
              <th>Contract Date</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>User</th>
              <th>Family</th>
              <th>Sub-Family</th>
              <th>Description</th>
              <th>Insurance Date</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Rate</th>
              <th>Payment Date</th>
              <th>Gym</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((reglement) => (
              <tr key={reglement.ID_reglement}>
                <td>{reglement.ID_reglement}</td>
                <td>{reglement.CONTRAT || '-'}</td>
                <td>{reglement.CLIENT || '-'}</td>
                <td>{formatDateTime(reglement.DATE_CONTRAT)}</td>
                <td>{formatDateTime(reglement.DATE_DEBUT)}</td>
                <td>{formatDateTime(reglement.DATE_FIN)}</td>
                <td>{reglement.USERC || '-'}</td>
                <td>{reglement.FAMILLE || '-'}</td>
                <td>{reglement.SOUSFAMILLE || '-'}</td>
                <td>{reglement.LIBELLE || '-'}</td>
                <td>{formatDateTime(reglement.DATE_ASSURANCE)}</td>
                <td className="reports-amount-cell">{formatCurrency(reglement.MONTANT)}</td>
                <td>{reglement.MODE || '-'}</td>
                <td>{reglement.TARIFAIRE || '-'}</td>
                <td>{formatDateTime(reglement.DATE_REGLEMENT)}</td>
                <td>{reglement.salle_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="reports-pagination">
        <span>
          {filteredReglements.length > 0 
            ? `${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredReglements.length)} of ${filteredReglements.length}` 
            : 'No results'}
        </span>
        <div className="reports-pagination-buttons">
          <button 
            onClick={goToPreviousPage} 
            disabled={currentPage === 1} 
            className="reports-pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-pagination-icon">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={goToNextPage} 
            disabled={currentPage >= totalPages} 
            className="reports-pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-pagination-icon">
              <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsTable;