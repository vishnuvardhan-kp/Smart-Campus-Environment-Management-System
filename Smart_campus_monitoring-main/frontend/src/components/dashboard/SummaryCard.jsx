import React from 'react';

const SummaryCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  category,
  status,
  badgeText
}) => {
  return (
    <div className={`summary-card ${status ? `card-status-${status}` : ''}`}>
      <div className="summary-card-header">
        <div className="summary-card-meta">
          {category && <span className="summary-card-category">{category}</span>}
          <span className="summary-card-title">{title}</span>
        </div>
        {Icon && (
          <div className="summary-card-icon">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="summary-card-main">
        <div className="summary-card-value-row">
          <span className="summary-card-value">{value}</span>
          {badgeText && (
            <span className={`card-badge card-badge-${status || 'neutral'}`}>
              <span className="badge-dot" />
              <span>{badgeText}</span>
            </span>
          )}
        </div>
        {subtitle && (
          <span className="summary-card-subtitle">{subtitle}</span>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
