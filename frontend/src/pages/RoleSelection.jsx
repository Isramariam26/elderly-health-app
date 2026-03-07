import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, ShieldCheck } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-layout">
      <div className="logo-container" style={{flexDirection: 'column', gap: '0'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <Heart size={36} className="logo-icon" />
          <h1 style={{fontSize: '3rem', fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px'}}>CareNest</h1>
        </div>
        <div style={{fontSize: '0.85rem', letterSpacing: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '8px', marginLeft: '6px'}}>
          L O V E . C A R E . S E C U R I T Y
        </div>
      </div>
      <p className="auth-subtitle" style={{marginTop: '24px'}}>Comprehensive home care management for patients, families, and caregivers</p>
      
      <div className="portal-cards-wrapper">
        <div className="portal-card patient" onClick={() => navigate('/portal-selection')}>
          <div className="icon-box">
            <Users size={32} />
          </div>
          <h2>Patient & Family Portal</h2>
          <p>View vitals, medications, medical history, and connect with your care team</p>
          <div className="portal-action">
            <Heart size={16} />
            <span>Access Patient Dashboard</span>
          </div>
        </div>

        <div className="portal-card caregiver" onClick={() => navigate('/login/caregiver')}>
          <div className="icon-box">
            <ShieldCheck size={32} />
          </div>
          <h2>Caregiver Portal</h2>
          <p>Manage patients, tasks, schedules, and respond to emergencies</p>
          <div className="portal-action">
            <ShieldCheck size={16} />
            <span>Log In as Caregiver</span>
          </div>
        </div>
      </div>
      
      <div className="auth-footer">
        © 2026 CareNest — Trusted Home Care Technology
      </div>
    </div>
  );
};

export default RoleSelection;
