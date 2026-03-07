import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User, Users } from 'lucide-react';

const PortalSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="icon-box">
          <Heart size={32} />
        </div>
        <h2>Patient Portal</h2>
        <p>Select how you'd like to log in</p>

        <div className="selection-list">
          <div className="selection-item" onClick={() => navigate('/login/patient')}>
            <div className="item-icon">
              <User size={24} />
            </div>
            <div>
              <h3 style={{fontSize: '1.1rem', marginBottom: '4px'}}>I am the Patient</h3>
              <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Full access including medication tracking & emergency alerts</p>
            </div>
          </div>

          <div className="selection-item" onClick={() => navigate('/login/family')}>
            <div className="item-icon" style={{backgroundColor: 'var(--bg-card-blue)', color: 'var(--accent-blue)'}}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{fontSize: '1.1rem', marginBottom: '4px'}}>I am a Family Member</h3>
              <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>View-only access to vitals, medications & care team</p>
            </div>
          </div>
        </div>

        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '24px'}}>
          Demo credentials: ID "demo" / Password "demo"
        </p>
      </div>
    </div>
  );
};

export default PortalSelection;
