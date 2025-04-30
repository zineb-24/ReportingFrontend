// src/components/RevenueChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../styles/RevenueChart.css';

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
        <h3 className="section-title">Total Revenue</h3>
        <div className="chart-loading">
          <p>Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="revenue-chart-container">
        <h3 className="section-title">Total Revenue</h3>
        <div className="chart-empty">
          <p>No revenue data available for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="revenue-chart-container">
      <h3 className="section-title">Total Revenue</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300} key={`revenue-chart-${selectedDate}-${dateMode}-${data.length}`}>
          <BarChart data={coloredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            // Custom ticks to show only 8 dates max, including start and end
            ticks={(() => {
                if (data.length <= 8) {
                // If we have 8 or fewer dates, show all of them
                return data.map(item => item.label);
                } else {
                // Otherwise, calculate which dates to show
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
            })()}
            // Use the labels directly without modification
            tickFormatter={(value) => value}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tickCount={5}
              tickFormatter={(value) => value === 0 ? '0' : `${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="amount" 
              radius={[4, 4, 0, 0]}
              fill="#63B3ED" // Default color
              // Use the built-in way to determine colors
              fillOpacity={1}
              // Use this safer approach
              stroke="#63B3ED"
              strokeWidth={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;