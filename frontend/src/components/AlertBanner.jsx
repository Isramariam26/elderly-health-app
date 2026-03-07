import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const AlertBanner = ({ message, onClear }) => {
  if (!message) return null;

  return (
    <div className="alert-banner" role="alert" aria-live="assertive">
      <AlertTriangle className="alert-icon" color="#000000" />
      <h2>{message}</h2>
      {onClear && (
        <button className="control-btn" onClick={onClear}>
          <CheckCircle size={24} />
          Acknowledge & Clear
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
