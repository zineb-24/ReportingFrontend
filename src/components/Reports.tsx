import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import '../styles/Reports.css';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { t } = useTranslation();
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
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isColumnsInitialized, setIsColumnsInitialized] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  // Define all available columns
  const availableColumns = [
    { key: 'contract', label: t('reports.table.contract'), field: 'CONTRAT' },
    { key: 'client', label: t('reports.table.client'), field: 'CLIENT' },
    { key: 'contractDate', label: t('reports.table.contractDate'), field: 'DATE_CONTRAT' },
    { key: 'startDate', label: t('reports.table.startDate'), field: 'DATE_DEBUT' },
    { key: 'endDate', label: t('reports.table.endDate'), field: 'DATE_FIN' },
    { key: 'user', label: t('reports.table.user'), field: 'USERC' },
    { key: 'family', label: t('reports.table.family'), field: 'FAMILLE' },
    { key: 'subFamily', label: t('reports.table.subFamily'), field: 'SOUSFAMILLE' },
    { key: 'description', label: t('reports.table.description'), field: 'LIBELLE' },
    { key: 'insuranceDate', label: t('reports.table.insuranceDate'), field: 'DATE_ASSURANCE' },
    { key: 'amount', label: t('reports.table.amount'), field: 'MONTANT' },
    { key: 'paymentMethod', label: t('reports.table.paymentMethod'), field: 'MODE' },
    { key: 'rate', label: t('reports.table.rate'), field: 'TARIFAIRE' },
    { key: 'paymentDate', label: t('reports.table.paymentDate'), field: 'DATE_REGLEMENT' },
    { key: 'gym', label: t('reports.table.gym'), field: 'salle_name' }
  ];

  // Initialize with default essential columns only once
  useEffect(() => {
    if (!isColumnsInitialized) {
      setSelectedColumns([
        'contract', 'client', 'contractDate', 'startDate', 
        'endDate', 'amount', 'paymentMethod', 'paymentDate', 'gym'
      ]);
      setIsColumnsInitialized(true);
    }
  }, [isColumnsInitialized]);

  // Handle column selection
  const handleColumnToggle = useCallback((columnKey: string) => {
    const currentScroll = modalBodyRef.current?.scrollTop || 0;
    
    setSelectedColumns(prev => {
      const isCurrentlySelected = prev.includes(columnKey);
      let newColumns;
      
      if (isCurrentlySelected) {
        // Remove the column
        newColumns = prev.filter(key => key !== columnKey);
      } else {
        // Add the column (no limit restriction)
        newColumns = [...prev, columnKey];
      }
      
      // Immediate restoration
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = currentScroll;
      }
      
      // Backup after React re-render
      requestAnimationFrame(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop = currentScroll;
        }
      });
      
      return newColumns;
    });
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false);
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

  // Get formatted date range for PDF header
  const getDateRangeText = (): string => {
    if (dateFilterType === 'date' && dateRange.startDate) {
      return formatDateTime(dateRange.startDate);
    } else if (dateFilterType === 'period' && dateRange.startDate && dateRange.endDate) {
      return `${formatDateTime(dateRange.startDate)} - ${formatDateTime(dateRange.endDate)}`;
    } else if (dateFilterType === 'month' && selectedMonth && selectedYear) {
      const monthNames = [
        t('dateFilter.january'), t('dateFilter.february'), t('dateFilter.march'),
        t('dateFilter.april'), t('dateFilter.may'), t('dateFilter.june'),
        t('dateFilter.july'), t('dateFilter.august'), t('dateFilter.september'),
        t('dateFilter.october'), t('dateFilter.november'), t('dateFilter.december')
      ];
      return `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;
    } else if (dateFilterType === 'year' && selectedYear) {
      return selectedYear;
    }
    return '';
  };

  // Updated PDF export function
  const exportToPDF = async () => {
    if (!selectedSalle || filteredReglements.length === 0) {
      alert(t('reports.pdf.noData'));
      return;
    }

    if (selectedColumns.length === 0) {
      alert(t('reports.pdf.noColumnsSelected'));
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add title and info
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t('reports.pdf.title'), 20, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${t('reports.pdf.gym')}: ${selectedSalle.name}`, 20, 30);
      
      const dateRangeText = getDateRangeText();
      if (dateRangeText) {
        doc.text(`${t('reports.pdf.period')}: ${dateRangeText}`, 20, 40);
      }

      doc.text(`${t('reports.pdf.total')}: ${filteredReglements.length} ${t('reports.pdf.records')}`, 20, 50);

      // Prepare selected columns data
      const selectedColumnDefs = availableColumns.filter(col => selectedColumns.includes(col.key));
      const tableHeaders = selectedColumnDefs.map(col => col.label);

      const tableData = filteredReglements.map(reglement => {
        return selectedColumnDefs.map(col => {
          const value = reglement[col.field as keyof ReglementData];
          
          // Format specific fields
          if (col.field === 'MONTANT') {
            return formatCurrency(value as number);
          } else if (col.field.includes('DATE_')) {
            return formatDateTime(value as string);
          } else {
            return value?.toString() || '-';
          }
        });
      });

      // Calculate dynamic column widths based on number of selected columns
      const availableWidth = 277; // A4 landscape width minus margins
      const baseWidth = Math.floor(availableWidth / selectedColumns.length);
      
      // Create column styles with dynamic widths
      const columnStyles: { [key: number]: { cellWidth: number } } = {};
      selectedColumns.forEach((_, index) => {
        columnStyles[index] = { cellWidth: baseWidth };
      });

      // Add table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 60,
        theme: 'grid',
        styles: {
          fontSize: selectedColumns.length > 10 ? 8 : 9, // Smaller font for more columns
          cellPadding: selectedColumns.length > 10 ? 1 : 1.5,
          overflow: 'linebreak',
          halign: 'left'
        },
        headStyles: {
          fillColor: [66, 165, 245],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: selectedColumns.length > 10 ? 8 : 9
        },
        columnStyles,
        margin: { left: 10, right: 10 },
        tableWidth: 'auto'
      });

      // Calculate total amount if amount column is selected
      if (selectedColumns.includes('amount')) {
        const totalAmount = filteredReglements.reduce((sum, reglement) => sum + reglement.MONTANT, 0);
        const finalY = (doc as any).lastAutoTable.finalY || 60;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${t('reports.pdf.totalAmount')}: ${formatCurrency(totalAmount)}`, 20, finalY + 15);
      }

      // Add generation timestamp
      const finalY = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const timestamp = new Date().toLocaleString('fr-FR');
      doc.text(`${t('reports.pdf.generatedOn')}: ${timestamp}`, 20, finalY + 25);

      // Generate filename
      const filename = `${t('reports.pdf.filename')}_${selectedSalle.name}_${dateRangeText.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(filename);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('reports.pdf.error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Column Selector Modal Component
  const ColumnSelectorModal = () => {
    if (!showColumnSelector) return null;

    return (
      <div className="reports-modal-overlay">
        <div className="reports-modal">
          <div className="reports-modal-header">
            <h3>{t('reports.pdf.selectColumns')}</h3>
            <button 
              onClick={() => setShowColumnSelector(false)}
              className="reports-modal-close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="reports-modal-body" ref={modalBodyRef}>
            <p className="reports-column-info">
              {t('reports.pdf.selectColumns')} 
              ({selectedColumns.length}/{availableColumns.length} {t('reports.pdf.selected')})
            </p>
            
            <div className="reports-column-grid">
              {availableColumns.map(column => (
                <label key={column.key} className="reports-column-option">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                  />
                  <span className={selectedColumns.includes(column.key) ? 'selected' : ''}>
                    {column.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="reports-modal-footer">
            <button 
              onClick={() => setShowColumnSelector(false)}
              className="reports-modal-cancel"
            >
              {t('reports.pdf.cancel')}
            </button>
            <button 
              onClick={() => {
                setShowColumnSelector(false);
                exportToPDF();
              }}
              disabled={selectedColumns.length === 0}
              className="reports-modal-export"
            >
              {t('reports.pdf.exportSelected')}
            </button>
          </div>
        </div>
      </div>
    );
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
      case 'date': return t('dateFilter.date');
      case 'period': return t('dateFilter.period');
      case 'month': return t('dateFilter.month');
      case 'year': return t('dateFilter.year');
      default: return t('dateFilter.date');
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
    return <div className="reports-loading-indicator">{t('reports.loading')}</div>;
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
            {t('reports.title')}
          </h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          <p>{t('reports.selectGym')}</p>
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
          {t('reports.titleWithGym', { gymName: selectedSalle.name })}
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
                
                <span className="reports-date-separator">{t('dateFilter.to')}</span>
                
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
                {/* Custom Month Dropdown */}
                <div className="reports-month-dropdown-container" ref={monthDropdownRef}>
                  <button 
                    className="reports-month-filter-button"
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    aria-expanded={showMonthDropdown}
                    aria-haspopup="true"
                  >
                    {getMonthName(selectedMonth)}
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className={`reports-dropdown-arrow ${showMonthDropdown ? 'open' : ''}`}
                    >
                      <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {showMonthDropdown && (
                    <div className="reports-month-dropdown">
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
                          className={`reports-month-option ${selectedMonth === month.value ? 'active' : ''}`}
                          onClick={() => handleMonthSelection(month.value)}
                        >
                          {month.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <input
                  type="number"
                  value={selectedYear}
                  onChange={handleYearChange}
                  min="2020"
                  max="2030"
                  className="reports-year-input"
                  placeholder={t('dateFilter.year')}
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
                  placeholder={t('dateFilter.year')}
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
                    {t('dateFilter.date')}
                  </div>
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'period' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('period')}
                  >
                    {t('dateFilter.period')}
                  </div>
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'month' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('month')}
                  >
                    {t('dateFilter.month')}
                  </div>
                  <div 
                    className={`reports-dropdown-option ${dateFilterType === 'year' ? 'reports-active' : ''}`}
                    onClick={() => handleDateFilterTypeChange('year')}
                  >
                    {t('dateFilter.year')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search and Export */}
          <div className="reports-actions">
            {/* Search */}
            <div className="reports-search-container">
              <input 
                type="text" 
                placeholder={t('reports.search')} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="reports-search-input"
              />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-search-icon">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Export PDF Button */}
            <button 
              onClick={() => setShowColumnSelector(true)}
              disabled={isExporting || filteredReglements.length === 0}
              className="reports-export-button"
            >
              {isExporting ? (
                <>
                  <svg className="reports-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('reports.pdf.exporting')}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="reports-export-icon">
                    <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
                    <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                  </svg>
                  {t('reports.pdf.export')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="reports-table-responsive">
        <table className="reports-table">
          <thead>
            <tr>
              <th>{t('reports.table.contract')}</th>
              <th>{t('reports.table.client')}</th>
              <th>{t('reports.table.contractDate')}</th>
              <th>{t('reports.table.startDate')}</th>
              <th>{t('reports.table.endDate')}</th>
              <th>{t('reports.table.user')}</th>
              <th>{t('reports.table.family')}</th>
              <th>{t('reports.table.subFamily')}</th>
              <th>{t('reports.table.description')}</th>
              <th>{t('reports.table.insuranceDate')}</th>
              <th>{t('reports.table.amount')}</th>
              <th>{t('reports.table.paymentMethod')}</th>
              <th>{t('reports.table.rate')}</th>
              <th>{t('reports.table.paymentDate')}</th>
              <th>{t('reports.table.gym')}</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((reglement) => (
              <tr key={reglement.ID_reglement}>
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
            ? t('reports.pagination.showing', {
                start: indexOfFirstItem + 1,
                end: Math.min(indexOfLastItem, filteredReglements.length),
                total: filteredReglements.length
              })
            : t('reports.noResults')}
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

      {/* Column Selector Modal */}
      <ColumnSelectorModal />
    </div>
  );
};

export default ReportsTable;