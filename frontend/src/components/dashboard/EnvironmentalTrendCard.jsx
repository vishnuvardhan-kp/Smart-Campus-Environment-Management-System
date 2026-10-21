import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  HelpCircle, 
  Thermometer, 
  Droplets, 
  Clock, 
  Activity 
} from 'lucide-react';
import { formatTemp, formatHumidity } from '../../utils/formatters';

const getTrendConfig = (trendState) => {
  switch (trendState) {
    case 'RISING':
      return {
        label: 'RISING',
        icon: TrendingUp,
        badgeClass: 'env-trend-badge-rising',
        symbol: '↑'
      };
    case 'FALLING':
      return {
        label: 'FALLING',
        icon: TrendingDown,
        badgeClass: 'env-trend-badge-falling',
        symbol: '↓'
      };
    case 'STABLE':
      return {
        label: 'STABLE',
        icon: Minus,
        badgeClass: 'env-trend-badge-stable',
        symbol: '→'
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'UNKNOWN',
        icon: HelpCircle,
        badgeClass: 'env-trend-badge-unknown',
        symbol: '?'
      };
  }
};

const EnvironmentalTrendCard = ({ trend, temperature, humidity, room = 'LAB101' }) => {
  const windowMinutes = trend?.windowMinutes || 20;

  const tempTrendData = trend?.temperature || {
    trend: 'UNKNOWN',
    change: null,
    unit: '°C',
    observation: 'Not enough historical data to determine a trend.'
  };

  const humTrendData = trend?.humidity || {
    trend: 'UNKNOWN',
    change: null,
    unit: 'percentage points',
    observation: 'Not enough historical data to determine a trend.'
  };

  const tempConfig = getTrendConfig(tempTrendData.trend);
  const humConfig = getTrendConfig(humTrendData.trend);

  const TempIcon = tempConfig.icon;
  const HumIcon = humConfig.icon;

  const formatChangeText = (change, unit, windowMin, trendState) => {
    if (change === null || change === undefined || trendState === 'UNKNOWN') {
      return `Insufficient history over ${windowMin}m`;
    }
    const sign = change > 0 ? '+' : '';
    const unitLabel = unit === '°C' ? '°C' : Math.abs(change) === 1 ? 'percentage point' : 'percentage points';
    return `${sign}${change} ${unitLabel} over ${windowMin} min`;
  };

  return (
    <div className="env-trend-card">
      <div className="env-trend-header">
        <div className="env-trend-title-group">
          <Activity size={15} style={{ color: 'var(--sage-icon)' }} />
          <span className="env-trend-tag">ENVIRONMENTAL TREND</span>
          <span className="env-trend-room">{room}</span>
        </div>

        <div className="env-trend-window-badge">
          <Clock size={12} />
          <span>{windowMinutes}-Min Lookback</span>
        </div>
      </div>

      <div className="env-trend-grid">
        {/* Temperature Trend Block */}
        <div className="env-trend-item">
          <div className="env-trend-item-header">
            <div className="env-trend-metric-title">
              <Thermometer size={14} style={{ color: 'var(--accent-terracotta)' }} />
              <span>Temperature Trend</span>
            </div>
            <div className={`env-trend-badge ${tempConfig.badgeClass}`} role="status">
              <TempIcon size={13} />
              <span>{tempConfig.label}</span>
            </div>
          </div>

          <div className="env-trend-item-values">
            <span className="env-trend-curr-val">{formatTemp(temperature)}</span>
            <span className="env-trend-change-val">
              {formatChangeText(tempTrendData.change, '°C', windowMinutes, tempTrendData.trend)}
            </span>
          </div>

          <p className="env-trend-desc">
            {tempTrendData.observation || 'Evaluating historical trajectory.'}
          </p>
        </div>

        {/* Humidity Trend Block */}
        <div className="env-trend-item">
          <div className="env-trend-item-header">
            <div className="env-trend-metric-title">
              <Droplets size={14} style={{ color: '#2B6CB0' }} />
              <span>Humidity Trend</span>
            </div>
            <div className={`env-trend-badge ${humConfig.badgeClass}`} role="status">
              <HumIcon size={13} />
              <span>{humConfig.label}</span>
            </div>
          </div>

          <div className="env-trend-item-values">
            <span className="env-trend-curr-val">{formatHumidity(humidity)}</span>
            <span className="env-trend-change-val">
              {formatChangeText(humTrendData.change, 'percentage points', windowMinutes, humTrendData.trend)}
            </span>
          </div>

          <p className="env-trend-desc">
            {humTrendData.observation || 'Evaluating historical trajectory.'}
          </p>
        </div>
      </div>

      {trend?.summary && (
        <div className="env-trend-summary-bar">
          <span className="env-trend-summary-label">Observation:</span>
          <span className="env-trend-summary-text">{trend.summary}</span>
        </div>
      )}
    </div>
  );
};

export default EnvironmentalTrendCard;
