// src/components/RevenueDistribution.tsx
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import '../styles/RevenuePieChart.css';

interface DistributionDataPoint {
  name: string;
  value: number;
  color: string;
  details?: Array<{name: string, value: number}>;
}

interface RevenueDistributionProps {
  salleId: number | null;
  dateMode: 'date' | 'period';
  startDate: string | null;
  endDate: string | null;
}

// #6bb7f6 light blue
// #d2a7ff light purple
// #F15353 red

const COLORS = [
    '#6bb7f6',  // Lighter blue
    '#2196F3',  // Original blue
    '#d2a7ff',  // Lighter purple
    '#8B5CF6',  // Purple
    '#F87171',  // Lighter red
    '#F15353'   // Red
  ];

const RevenueDistribution: React.FC<RevenueDistributionProps> = ({ 
  salleId, 
  dateMode, 
  startDate, 
  endDate 
}) => {
  const [distributionData, setDistributionData] = useState<DistributionDataPoint[]>([]);
  const [distributionTotal, setDistributionTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [category, setCategory] = useState<'payment_method' | 'subscription' | 'agent'>('payment_method');

  //Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      // Check if this is the "Others" segment and if it has details
      const isOthers = data.name === 'Others' && data.details;
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-name">{data.name}</p>
          <p className="tooltip-value">{formatNumber(data.value)} MAD</p>
          
          {isOthers && data.details && (
            <div className="tooltip-details">
              <p className="details-header">Details:</p>
              <ul className="details-list">
                {data.details.map((item: any, index: number) => (
                  <li key={index}>
                    <span className="detail-name">{item.name}</span>
                    <span className="detail-value">{formatNumber(item.value)} MAD</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Format number to include thousand separators
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-MA').format(num);
  };
  
  // Calculate percentage
  const calculatePercentage = (value: number): number => {
    if (distributionTotal === 0) return 0;
    return parseFloat(((value / distributionTotal) * 100).toFixed(2));
  };

  // Fetch distribution data when props change
  useEffect(() => {
    if (!salleId || !startDate) return;
    
    const fetchDistributionData = async () => {
      try {
        setIsLoading(true);
        
        let dateParam = '';
        let dateTypeParam = 'day';
        
        if (startDate) {
          if (dateMode === 'date') {
            dateParam = startDate;
          } else if (endDate) {
            dateParam = `${startDate} to ${endDate}`;
            dateTypeParam = 'custom';
          }
        }
        
        const response = await api.get('/user-dashboard/distribution/', {
          params: {
            salle_id: salleId,
            category: category,
            date_type: dateTypeParam,
            date: dateParam
          }
        });
        
        // Assign colors to data points
        const coloredData = response.data.distribution_data.map((item: any, index: number) => ({
          ...item,
          color: COLORS[index % COLORS.length]
        }));
        
        setDistributionData(coloredData);
        setDistributionTotal(response.data.total);
      } catch (error) {
        console.error('Error fetching distribution data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDistributionData();
  }, [salleId, startDate, endDate, dateMode, category]);

  const handleCategoryChange = (newCategory: 'payment_method' | 'subscription' | 'agent') => {
    setCategory(newCategory);
  };

  if (!salleId) {
    return null;
  }

  return (
    <div className="distribution-container">
      <div className="distribution-header">
        <h3>Revenue By</h3>
        <div className="category-buttons">
          <button 
            className={category === 'payment_method' ? 'active' : ''} 
            onClick={() => handleCategoryChange('payment_method')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="button-icon">
              <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
              <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
            </svg>
            Payment Method
          </button>
          <button 
            className={category === 'subscription' ? 'active' : ''} 
            onClick={() => handleCategoryChange('subscription')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="button-icon">
              <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zM6 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V12zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
            Subscription Category
          </button>
          <button 
            className={category === 'agent' ? 'active' : ''} 
            onClick={() => handleCategoryChange('agent')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="button-icon">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            Agent
          </button>
        </div>
      </div>

      <div className="distribution-content">
        {isLoading ? (
          <div className="distribution-loading">
            <p>Loading distribution data...</p>
          </div>
        ) : distributionData.length === 0 ? (
          <div className="distribution-empty">
            <p>No distribution data available for the selected period</p>
          </div>
        ) : (
          <>
            <div className="distribution-chart">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={150}
                    fill="#8884d8"
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="distribution-table">
            <table>
                <thead>
                <tr>
                    <th>
                    {category === 'payment_method' ? 'Payment Method' : 
                    category === 'subscription' ? 'Subscription Category' : 
                    'Agent'}
                    </th>
                    <th className="amount-header">Total Earnings</th>
                    <th className="percent-header">%</th>
                </tr>
                </thead>
                <tbody>
                {distributionData.map((item, index) => (
                    <React.Fragment key={`row-${index}`}>
                    <tr>
                        <td className="method-cell">
                        <span 
                            className="color-indicator" 
                            style={{ backgroundColor: item.color }}
                        ></span>
                        {item.name}
                        </td>
                        <td className="amount-cell">{formatNumber(item.value)}</td>
                        <td className="percent-cell">{calculatePercentage(item.value)}</td>
                    </tr>
                    
                    {/* Add nested rows for "Others" details */}
                    {item.name === 'Others' && item.details && (
                        <tr>
                        <td colSpan={3} className="others-details-container">
                            <div className="others-details">
                            <h4>Details:</h4>
                            <table className="others-details-table">
                                <tbody>
                                {item.details.map((detail: any, detailIndex: number) => (
                                    <tr key={`detail-${detailIndex}`}>
                                    <td>{detail.name}</td>
                                    <td className="amount-cell">{formatNumber(detail.value)}</td>
                                    <td className="percent-cell">{calculatePercentage(detail.value)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            </div>
                        </td>
                        </tr>
                    )}
                    </React.Fragment>
                ))}
                </tbody>
                <tfoot>
                <tr>
                    <td>Total</td>
                    <td className="amount-cell">{formatNumber(distributionTotal)}</td>
                    <td className="percent-cell">100</td>
                </tr>
                </tfoot>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RevenueDistribution;