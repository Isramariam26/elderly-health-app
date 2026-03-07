import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, ShieldCheck, Users } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { role } = useParams(); // 'patient', 'family', or 'caregiver'
  
  const [patientId, setPatientId] = useState('');
  const [password, setPassword] = useState('');

  const CAREGIVERS = [
    { loginId: 'c1', password: 'p1', id: 'CT-001', name: 'Anjali Deshmukh', role: 'caregiver' },
    { loginId: 'c2', password: 'p2', id: 'CT-002', name: 'Ramakrishna Pillai', role: 'caregiver' },
    { loginId: 'c3', password: 'p3', id: 'CT-003', name: 'Sunita Waghmare', role: 'caregiver' },
    { loginId: 'c4', password: 'p4', id: 'CT-004', name: 'Prakash Joshi', role: 'caregiver' },
    { loginId: 'c5', password: 'p5', id: 'CT-005', name: 'Kavitha Nair', role: 'caregiver' }
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === 'caregiver') {
      const user = CAREGIVERS.find(c => c.loginId === patientId.toLowerCase() && c.password === password);
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify({ id: user.id, name: user.name, role: user.role }));
        navigate('/caregiver');
      } else {
        alert('Invalid Caregiver ID or Password');
      }
    } else {
      // For Patient/Family, just allow them through for now
      localStorage.setItem('currentUser', JSON.stringify({ id: patientId, role }));
      navigate(role === 'family' ? '/family' : '/patient');
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
          <div className="form-group">
            <label>ID</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder='e.g. "p1" or "demo"'
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder='Enter password (try "demo")'
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
          {role === 'caregiver' ? 
            'Try ID "c1", Password "p1" (up to c5/p5)' : 
            'Demo credentials: ID "demo" / Password "demo"'
          }
        </p>
      </div>
    </div>
  );
};

export default Login;
