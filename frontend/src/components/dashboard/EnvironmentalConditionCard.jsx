import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  Thermometer, 
  Droplets, 
  Fan 
} from 'lucide-react';
import { formatTemp, formatHumidity } from '../../utils/formatters';

const getStatusConfig = (status) => {
  switch (status) {
    case 'NORMAL':
      return {
        label: 'NORMAL',
        icon: CheckCircle2,
        cardClass: 'env-card-normal',
        badgeClass: 'env-badge-normal',
      };
    case 'ATTENTION':
      return {
        label: 'ATTENTION',
        icon: AlertTriangle,
        cardClass: 'env-card-attention',
        badgeClass: 'env-badge-attention',
      };
    case 'CRITICAL':
      return {
        label: 'CRITICAL',
        icon: AlertOctagon,
        cardClass: 'env-card-critical',
        badgeClass: 'env-badge-critical',
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'UNKNOWN',
        icon: HelpCircle,
        cardClass: 'env-card-unknown',
        badgeClass: 'env-badge-unknown',
      };
  }
};

const EnvironmentalConditionCard = ({ assessment, temperature, humidity, fan, room = 'LAB101' }) => {
  const status = assessment?.status || 'UNKNOWN';
  const reason = assessment?.reason || 'Environmental data is incomplete.';
  const recommendation = assessment?.recommendation || 'Wait for the next sensor update.';
  
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;
  const isFanOn = fan === 'ON' || fan === true || String(fan).toUpperCase() === 'ON';

  return (
    <div className={`env-condition-card ${config.cardClass}`}>
      <div className="env-condition-header">
        <div className="env-condition-title-group">
          <span className="env-condition-tag">ENVIRONMENTAL CONDITION</span>
          <span className="env-condition-room">{room}</span>
        </div>
        
        <div className={`env-status-badge ${config.badgeClass}`} role="status" aria-label={`Condition status: ${config.label}`}>
          <StatusIcon size={14} className="env-status-icon" />
          <span className="env-status-text">{config.label}</span>
        </div>
      </div>

      <div className="env-condition-body">
        <div className="env-assessment-section">
          <div className="env-reason-block">
            <span className="env-block-label">Assessment</span>
            <p className="env-reason-text">{reason}</p>
          </div>

          <div className="env-recommendation-block">
            <span className="env-block-label">Recommendation</span>
            <p className="env-recommendation-text">{recommendation}</p>
          </div>
        </div>

        <div className="env-context-pills">
          <div className="env-context-pill">
            <Thermometer size={13} className="env-context-icon" />
            <span className="env-context-val">{formatTemp(temperature)}</span>
            <span className="env-context-label">Temp</span>
          </div>

          <div className="env-context-pill">
            <Droplets size={13} className="env-context-icon" />
            <span className="env-context-val">{formatHumidity(humidity)}</span>
            <span className="env-context-label">Humidity</span>
          </div>

          <div className="env-context-pill">
            <Fan size={13} className="env-context-icon" />
            <span className="env-context-val">{isFanOn ? 'Active' : 'Off'}</span>
            <span className="env-context-label">Cooling</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalConditionCard;
