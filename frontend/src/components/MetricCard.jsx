import React from 'react';
import { HeartPulse, Activity, Droplets } from 'lucide-react';

const MetricCard = ({ title, value, unit, status, type }) => {
  // Select icon based on type
  const renderIcon = () => {
    switch (type) {
      case 'hr': return <HeartPulse className="metric-icon" />;
      case 'bp': return <Activity className="metric-icon" />;
      case 'spo2': return <Droplets className="metric-icon" />;
      default: return null;
    }
  };

  return (
    <div className={`metric-card ${status}`}>
      <div className="metric-title-group">
        {renderIcon()}
        <h2>{title}</h2>
      </div>
      <div className="metric-value-container">
        <span className="metric-value">{value}</span>
        <span className="metric-unit">{unit}</span>
      </div>
    </div>
  );
};

export default MetricCard;
