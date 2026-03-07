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
      // Caregiver Login mapping: -n1 to -n5
      let targetId = null;
      if (userId === '-n1' && password === '-demn1') targetId = 'CT-001';
      else if (userId === '-n2' && password === '-demn2') targetId = 'CT-002';
      else if (userId === '-n3' && password === '-demn3') targetId = 'CT-003';
      else if (userId === '-n4' && password === '-demn4') targetId = 'CT-004';
      else if (userId === '-n5' && password === '-demn5') targetId = 'CT-005';
      // demo fallback
      else if (userId === 'n1' && password === 'demn1') targetId = 'CT-001';

      if (targetId) {
        sessionStorage.setItem('care_nest_id', targetId);
        setLoggedInId(targetId);
        navigate('/caregiver');
      } else {
        setError('Invalid caregiver credentials. Pattern: -n1 / -demn1');
      }
    } else {
      // Patient/Family Login logic: Exact user request mapping
      let targetId = null;

      // c1 - c3: Standard patterns
      if (userId === '-c1' && password === '-demc1') targetId = 'GF-001';
      else if (userId === '-c2' && password === '-demc2') targetId = 'GF-002';
      else if (userId === '-c3' && password === '-demc3') targetId = 'GF-003';
      // c4: Gopal Rao again
      else if (userId === '-c4' && password === '-demc4') targetId = 'GF-003';
      // c5 - c10: Shifted due to c4 Gopal Rao
      else if (userId === '-c5' && password === '-demc5') targetId = 'GF-004';
      else if (userId === '-c6' && password === '-demc6') targetId = 'GF-005';
      else if (userId === '-c7' && password === '-demc7') targetId = 'GF-006';
      else if (userId === '-c8' && password === '-demc8') targetId = 'GF-007';
      else if (userId === '-c9' && password === '-demc9') targetId = 'GF-008';
      else if (userId === '-c10' && password === '-demc10') targetId = 'GF-009';
      // c11: Laxmibai Pawar with unique password
      else if (userId === '-c11' && password === '-c11') targetId = 'GF-010';
      // demo fallback
      else if (userId === 'demo' && password === 'demo') targetId = 'GF-001';

      if (targetId) {
        sessionStorage.setItem('care_nest_id', targetId);
        setLoggedInId(targetId);
        navigate(role === 'family' ? '/family' : '/patient');
      } else {
        setError('Invalid ID or Password for this portal.');
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
