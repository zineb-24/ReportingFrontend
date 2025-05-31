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

// Helper function for currency formatting
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' MAD';
  };

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p className="chart-tooltip-value">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const RevenueChart: React.FC<RevenueChartProps> = ({ data, selectedDate, dateMode, isLoading }) => {
  const { t } = useTranslation();
  
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

  // Calculate custom ticks for X axis
  const calculateTicks = () => {
    // For yearly data (12 months), show all month labels
    if (data.length === 12) {
      return data.map(item => item.label);
    }
    
    // For data with 8 or fewer points, show all labels
    if (data.length <= 8) {
      return data.map(item => item.label);
    } else {
      // For more than 8 points (like daily data), limit to 8 evenly spaced ticks
      const tickIndices = [];
      // Always include first and last dates
      tickIndices.push(0);
      tickIndices.push(data.length - 1);
      
      // Calculate how many more ticks to show (max 6 more to reach 8 total)
      const remainingTicks = 6;
      const step = Math.max(1, Math.floor((data.length - 2) / remainingTicks));
      
      // Add evenly spaced ticks between start and end
      for (let i = step; i < data.length - 1; i += step) {
        if (tickIndices.length < 8) {
          tickIndices.push(i);
        }
      }
      
      // Sort indices to ensure they're in order
      tickIndices.sort((a, b) => a - b);
      
      // Get the actual labels for those indices
      return tickIndices.map(index => data[index].label);
    }
  };

  return (
    <div className="revenue-chart-container">
      <h3 className="revenue-title">{t('revenue.totalRevenue')}</h3>
      <div className="chart-container">
        {shouldRender && (
          <div key={chartKey} style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={coloredData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                barCategoryGap={10}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  ticks={calculateTicks()}
                  tickFormatter={(value) => value}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickCount={5}
                  tickFormatter={(value) => value === 0 ? '0' : `${value / 1000}k`}
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
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!shouldRender && (
          <div className="chart-loading" style={{ height: '300px' }}>
            <p>{t('revenue.updatingChart')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueChart;