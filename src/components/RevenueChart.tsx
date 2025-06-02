import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../styles/RevenueChart.css';
import { useTranslation } from 'react-i18next';

interface RevenueDataPoint {
  date: string;
  amount: number;
  label: string;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  selectedDate?: string;
  dateMode: 'date' | 'period';
  isLoading: boolean;
}

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

// Helper function for responsive currency formatting
const formatCurrency = (amount: number, isMobile: boolean = false): string => {
  if (isMobile && amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M MAD';
  } else if (isMobile && amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K MAD';
  }
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' MAD';
};

// Custom responsive tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  const { isMobile } = useResponsive();
  
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p className="chart-tooltip-value">
          {formatCurrency(payload[0].value, isMobile)}
        </p>
      </div>
    );
  }
  return null;
};

const RevenueChart: React.FC<RevenueChartProps> = ({ data, selectedDate, dateMode, isLoading }) => {
  const { t } = useTranslation();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // This will completely unmount and remount the component
  const [shouldRender, setShouldRender] = useState(true);
  const [chartKey, setChartKey] = useState(`chart-${Date.now()}`);
  
  // Force re-render when props change
  useEffect(() => {
    // First unmount the chart
    setShouldRender(false);
    
    // Update the key
    setChartKey(`chart-${Date.now()}-${dateMode}-${data.length}`);
    
    // Then remount after a short delay
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [data, dateMode, selectedDate]);
  
  // Generate data with color property
  const coloredData = data.map(item => {
    let color = '#63B3ED'; // Default blue
    
    // Highlight selected date
    if (dateMode === 'date' && item.date === selectedDate) {
      color = '#4FD1C5'; // Teal color for selected date
    } else {
      // Highlight highest value
      const maxValue = Math.max(...data.map(dataItem => dataItem.amount));
      if (item.amount === maxValue && maxValue > 0) {
        color = '#4FD1C5'; // Teal color for highest value
      }
    }
    
    return { ...item, color };
  });

  // Responsive chart dimensions and settings
  const getChartConfig = () => {
    if (isMobile) {
      return {
        height: 250,
        margin: { top: 10, right: 15, left: 10, bottom: 15 },
        barCategoryGap: 8,
        tickCount: 4,
        fontSize: 12
      };
    }
    if (isTablet) {
      return {
        height: 350,
        margin: { top: 15, right: 20, left: 15, bottom: 20 },
        barCategoryGap: 10,
        tickCount: 5,
        fontSize: 14
      };
    }
    return {
      height: 400,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
      barCategoryGap: 10,
      tickCount: 5,
      fontSize: 16
    };
  };

  const chartConfig = getChartConfig();

  if (isLoading) {
    return (
      <div className="revenue-chart-container">
        <h3 className="revenue-title">{t('revenue.totalRevenue')}</h3>
        <div className="chart-loading">
          <p>{t('revenue.loadingData')}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="revenue-chart-container">
        <h3 className="revenue-title">{t('revenue.totalRevenue')}</h3>
        <div className="chart-empty">
          <p>{t('revenue.noData')}</p>
        </div>
      </div>
    );
  }

  // Calculate responsive ticks for X axis
  const calculateTicks = () => {
    // For yearly data (12 months), show all month labels on desktop/tablet
    if (data.length === 12) {
      if (isMobile) {
        // Show every 2nd month on mobile
        return data.filter((_, index) => index % 2 === 0).map(item => item.label);
      }
      return data.map(item => item.label);
    }
    
    // Responsive tick limits based on screen size
    const maxTicks = isMobile ? 4 : isTablet ? 6 : 8;
    
    // For data with few points, show all labels
    if (data.length <= maxTicks) {
      return data.map(item => item.label);
    } else {
      // For more points, limit to evenly spaced ticks
      const tickIndices = [];
      // Always include first and last dates
      tickIndices.push(0);
      tickIndices.push(data.length - 1);
      
      // Calculate how many more ticks to show
      const remainingTicks = maxTicks - 2;
      const step = Math.max(1, Math.floor((data.length - 2) / remainingTicks));
      
      // Add evenly spaced ticks between start and end
      for (let i = step; i < data.length - 1; i += step) {
        if (tickIndices.length < maxTicks) {
          tickIndices.push(i);
        }
      }
      
      // Sort indices to ensure they're in order
      tickIndices.sort((a, b) => a - b);
      
      // Get the actual labels for those indices
      return tickIndices.map(index => data[index].label);
    }
  };

  // Responsive Y-axis formatter
  const formatYAxisTick = (value: number) => {
    if (value === 0) return '0';
    
    if (isMobile) {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
      }
      return value.toString();
    }
    
    return value >= 1000 ? `${value / 1000}k` : value.toString();
  };

  return (
    <div className="revenue-chart-container">
      <h3 className="revenue-title">{t('revenue.totalRevenue')}</h3>
      <div className="chart-container">
        {shouldRender && (
          <div key={chartKey} style={{ width: '100%', height: `${chartConfig.height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={coloredData} 
                margin={chartConfig.margin}
                barCategoryGap={chartConfig.barCategoryGap}
                barGap={0}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  ticks={isMobile ? [] : calculateTicks()}
                  tickFormatter={(value) => value}
                  fontSize={chartConfig.fontSize}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 20 : 30}
                  interval={0}
                  tick={!isMobile} 
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickCount={chartConfig.tickCount}
                  tickFormatter={formatYAxisTick}
                  fontSize={chartConfig.fontSize}
                  width={isMobile ? 40 : 60}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(99, 179, 237, 0.2)' }} 
                />
                <Bar 
                  dataKey="amount" 
                  radius={[4, 4, 0, 0]}
                  fill="#63B3ED"
                  fillOpacity={1}
                  stroke="#63B3ED"
                  strokeWidth={0}
                  maxBarSize={isMobile ? 40 : isTablet ? 50 : 60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!shouldRender && (
          <div className="chart-loading" style={{ height: `${chartConfig.height}px` }}>
            <p>{t('revenue.updatingChart')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueChart;