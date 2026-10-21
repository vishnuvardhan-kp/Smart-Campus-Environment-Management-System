import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { formatChartTime } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E6E1',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(32, 41, 37, 0.08)',
        fontSize: '12px'
      }}>
        <div style={{ color: '#6B746E', marginBottom: '4px', fontWeight: 500 }}>
          Time: {formatChartTime(dataPoint.timestamp)}
        </div>
        <div style={{ color: '#202925', fontWeight: '700' }}>
          Humidity: <span style={{ color: '#C77B45' }}>{dataPoint.humidity}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const HumidityChart = ({ data = [], loading = false }) => {
  if (loading) {
    return (
      <div className="state-container" style={{ height: '300px' }}>
        <div className="skeleton skeleton-text" style={{ width: '150px', height: '20px' }} />
        <span className="state-desc">Loading humidity history...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="state-container" style={{ height: '260px' }}>
        <span className="state-title">Not enough historical data yet.</span>
        <span className="state-desc">Humidity records will appear here as sensor telemetry is stored.</span>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    formattedTime: formatChartTime(item.timestamp)
  }));

  const hums = chartData.map(d => d.humidity).filter(h => typeof h === 'number');
  const minHum = hums.length > 0 ? Math.max(0, Math.floor(Math.min(...hums) - 5)) : 20;
  const maxHum = hums.length > 0 ? Math.min(100, Math.ceil(Math.max(...hums) + 5)) : 100;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7EAE6" vertical={false} />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fontSize: 11, fill: '#6B746E', fontWeight: 500 }}
            stroke="#E2E6E1"
            tickLine={false}
          />
          <YAxis 
            domain={[minHum, maxHum]} 
            tick={{ fontSize: 11, fill: '#6B746E', fontWeight: 500 }}
            stroke="#E2E6E1"
            tickLine={false}
            unit="%"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="humidity" 
            stroke="#C77B45" 
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#C77B45', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#C77B45', stroke: '#7A9474', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HumidityChart;
