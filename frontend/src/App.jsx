import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection';
import PortalSelection from './pages/PortalSelection';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import './index.css';

function App() {
  const [globalState, setGlobalState] = useState({ patients: [], caretakers: [], activeEmergency: null });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [activeAlarm, setActiveAlarm] = useState(null); 
  const [loggedInId, setLoggedInId] = useState(sessionStorage.getItem('care_nest_id') || null);
  const wsRef = useRef(null);

  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connectWS = () => {
      ws = new WebSocket('ws://localhost:5000');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to health monitoring server');
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'health_update') {
            const newState = data.payload;
            setGlobalState(newState);

            // AUTO-SYNC: If we have an active targeted alarm, check if it's still active in globalState
            setActiveAlarm(prev => {
              if (!prev) return null;
              const patient = newState.patients?.find(p => p.id === prev.patientId);
              // If patient not found or emergency cleared, close the popup
              if (!patient || !patient.emergencyTriggered) return null;
              return prev;
            });
          } else if (data.type === 'connection_status') {
            console.log(data.payload.message);
          } else if (data.type === 'emergency_alarm') {
            // Targeted alarm for the assigned caregiver
            setActiveAlarm(data.payload);
          } else if (data.type === 'emergency_dispatched') {
            // Broadcast to ALL clients — trigger alarm sound on every caregiver session
            setActiveAlarm(data.payload);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message", error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 3s...');
        setConnectionStatus('disconnected');
        wsRef.current = null;
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const sendCommand = (cmdObj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmdObj));
    }
  };

  const getHrStatus = (hr) => {
    if (hr === '--') return 'normal';
    if (hr < 60 || hr > 100) return 'warning';
    if (hr > 120) return 'critical';
    return 'normal';
  };

  const getSpo2Status = (o2) => {
    if (o2 === '--') return 'normal';
    if (o2 < 90) return 'critical';
    if (o2 < 95) return 'warning';
    return 'normal';
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/portal-selection" element={<PortalSelection />} />
          <Route path="/login/:role" element={<Login setLoggedInId={setLoggedInId} />} />
          
          <Route path="/patient" element={
            <PatientDashboard 
              globalState={globalState} 
              getHrStatus={getHrStatus} 
              getSpo2Status={getSpo2Status} 
              connectionStatus={connectionStatus}
              sendCommand={sendCommand}
              role="patient"
              loggedInId={loggedInId}
            />
          } />

          <Route path="/family" element={
            <PatientDashboard 
              globalState={globalState} 
              getHrStatus={getHrStatus} 
              getSpo2Status={getSpo2Status} 
              connectionStatus={connectionStatus}
              sendCommand={sendCommand}
              role="family"
              loggedInId={loggedInId}
            />
          } />
          
          <Route path="/caregiver" element={
            <CaregiverDashboard 
              globalState={globalState} 
              getHrStatus={getHrStatus} 
              getSpo2Status={getSpo2Status} 
              connectionStatus={connectionStatus}
              sendCommand={sendCommand}
              activeAlarm={activeAlarm}
              setActiveAlarm={setActiveAlarm}
              loggedInId={loggedInId}
            />
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
