import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, ShieldCheck, Users } from 'lucide-react';

const Login = ({ setLoggedInId }) => {
  const navigate = useNavigate();
  const { role } = useParams(); // 'patient', 'family', or 'caregiver'
  
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (role === 'caregiver') {
      // For now, keep caregiver simple or map CT-001
      if (userId === 'n1' && password === 'demn1') {
        sessionStorage.setItem('care_nest_id', 'CT-001');
        setLoggedInId('CT-001');
        navigate('/caregiver');
      } else {
        setError('Invalid caregiver credentials. Use n1 / demn1');
      }
    } else {
      // Patient/Family Login logic: -c1/-demc1
      const idMatch = userId.match(/^-c(\d+)$/);
      const passMatch = password.match(/^-demc(\d+)$/);

      let targetId = null;

      if (idMatch && passMatch && idMatch[1] === passMatch[1]) {
        const num = parseInt(idMatch[1]);
        if (num >= 1 && num <= 10) {
          targetId = `GF-0${num < 10 ? '0' : ''}${num}`;
        }
      } else if (userId === 'demo' && password === 'demo') {
        targetId = 'GF-001';
      }

      if (targetId) {
        sessionStorage.setItem('care_nest_id', targetId);
        setLoggedInId(targetId);
        navigate(role === 'family' ? '/family' : '/patient');
      } else {
        setError('Invalid ID or Password. Pattern: -c1 / -demc1');
      }
    }
  };

  const renderIcon = () => {
    if (role === 'caregiver') return <ShieldCheck size={32} />;
    if (role === 'family') return <Users size={32} />;
    return <User size={32} />;
  };

  const renderTitle = () => {
    if (role === 'caregiver') return 'Caregiver Login';
    if (role === 'family') return 'Family Login';
    return 'Patient Login';
  };

  const renderSubtitle = () => {
    if (role === 'caregiver') return 'Manage your assigned patients';
    if (role === 'family') return "View your loved one's care details";
    return 'Access your care dashboard';
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="icon-box" style={{backgroundColor: role === 'caregiver' ? 'var(--bg-card-blue)' : 'var(--bg-card-purple)', color: role === 'caregiver' ? 'var(--accent-blue)' : 'var(--accent-purple)'}}>
          {renderIcon()}
        </div>
        <h2>{renderTitle()}</h2>
        <p>{renderSubtitle()}</p>
        
        <a href="/" className="back-link">← Change login type</a>

        <form onSubmit={handleLogin}>
          {error && <div style={{color: 'var(--status-critical)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 600}}>{error}</div>}
          <div className="form-group">
            <label>ID</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={role === 'caregiver' ? 'e.g. "n1"' : 'e.g. "-c1"'}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder={role === 'caregiver' ? 'e.g. "demn1"' : 'e.g. "-demc1"'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{backgroundColor: role === 'caregiver' ? 'var(--accent-blue)' : 'var(--accent-purple)'}}>
            Sign In
          </button>
        </form>

        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '32px'}}>
          {role === 'caregiver' ? 'Demo Caregiver: n1 / demn1' : 'Demo Patient 1: -c1 / -demc1 (use -c2 for Patient 2, etc.)'}
        </p>

      </div>
    </div>
  );
};

export default Login;
