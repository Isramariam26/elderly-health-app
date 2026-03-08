import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection';
import PortalSelection from './pages/PortalSelection';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import { fallbackData } from './utils/mockData';
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
    let fallbackTimer;

    const connectWS = () => {
      // Start a fallback timer. If no live data arrives in 1.5 seconds, use mock data
      fallbackTimer = setTimeout(() => {
        setGlobalState(prev => prev.caretakers.length === 0 ? fallbackData : prev);
      }, 1500);

      try {
        // Connect to websocket if running locally. On HTTPS pages (GitHub Pages), this synchronously throws a SecurityError.
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
              clearTimeout(fallbackTimer); // We have live data, clear fallback
              setGlobalState(newState);

              // AUTO-SYNC: If we have an active targeted alarm, check if it's still active in globalState
              setActiveAlarm(prev => {
                if (!prev) return null;
                const patient = newState.patients?.find(p => p.id === prev.patientId);
                if (!patient || !patient.emergencyTriggered) return null;
                return prev;
              });
            } else if (data.type === 'connection_status') {
              console.log(data.payload.message);
            } else if (data.type === 'emergency_alarm') {
              setActiveAlarm(data.payload);
            } else if (data.type === 'emergency_dispatched') {
              setActiveAlarm(data.payload);
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message", error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected. Reconnecting in 3s...');
          setGlobalState(prev => prev.caretakers.length === 0 ? fallbackData : prev);
          setConnectionStatus('disconnected');
          wsRef.current = null;
          reconnectTimeout = setTimeout(connectWS, 3000);
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          ws.close();
        };
      } catch (err) {
        console.warn('WebSocket could not be initialized (likely HTTPS mixed content blocking). Falling back to mock data.', err);
        setGlobalState(prev => prev.caretakers.length === 0 ? fallbackData : prev);
        setConnectionStatus('disconnected');
      }
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // --- OFFLINE VITALS SIMULATOR ---
  React.useEffect(() => {
    if (connectionStatus === 'connected') return;
    
    // If offline, simulate live vital fluctuations every 2.5 seconds
    const interval = setInterval(() => {
      setGlobalState(prev => {
        if (!prev.patients || prev.patients.length === 0) return prev;
        
        const next = JSON.parse(JSON.stringify(prev));
        next.patients.forEach(p => {
          // Fluctuate HR (-2 to +2)
          const hrChange = Math.floor(Math.random() * 5) - 2;
          p.hr = Math.max(50, Math.min(150, p.hr + hrChange));
          
          // Fluctuate SpO2 occasionally (-1 to +1)
          if (Math.random() > 0.7) {
             const o2Change = Math.floor(Math.random() * 3) - 1;
             p.spO2 = Math.max(88, Math.min(100, p.spO2 + o2Change));
          }
          
          // Fluctuate BP slightly occasionally
          if (Math.random() > 0.8) {
             const sysChange = Math.floor(Math.random() * 5) - 2;
             const diaChange = Math.floor(Math.random() * 3) - 1;
             p.systolic = Math.max(90, Math.min(180, p.systolic + sysChange));
             p.diastolic = Math.max(60, Math.min(120, p.diastolic + diaChange));
          }
        });
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  const sendCommand = (cmdObj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmdObj));
    } else {
      // OFFLINE FALLBACK: Simulate backend logic locally purely for UI interactivity on GitHub Pages
      setGlobalState(prev => {
        const next = JSON.parse(JSON.stringify(prev)); // Deep copy to mutate
        
        switch (cmdObj.action) {
          case 'check_medication': {
            const p = next.patients?.find(p => p.id === cmdObj.patientId);
            if (p) {
              const med = p.medications?.find(m => m.id === cmdObj.medId);
              if (med) {
                med.taken = !med.taken;
                if (med.taken) med.takenAt = new Date().toISOString();
                else med.takenAt = null;
              }
            }
            break;
          }
          case 'update_location': {
            if (cmdObj.patientId) {
              const p = next.patients?.find(p => p.id === cmdObj.patientId);
              if (p) {
                if (!p.location) p.location = {};
                p.location.lat = cmdObj.lat;
                p.location.lng = cmdObj.lng;
                if (cmdObj.locationName) p.location.name = cmdObj.locationName;
              }
            } else if (cmdObj.caretakerId) {
               const c = next.caretakers?.find(c => c.id === cmdObj.caretakerId);
               if (c && c.location) {
                 c.location.lat = cmdObj.lat;
                 c.location.lng = cmdObj.lng;
               }
            }
            break;
          }
          case 'trigger_emergency': {
             const p = next.patients?.find(p => p.id === cmdObj.patientId);
             if (p) p.emergencyTriggered = true;
             
             // --- OFFLINE ROUTING ALGORITHM ---
             let bestCaretaker = null;
             let highestScore = -Infinity;
             const now = new Date();
             
             const getDistance = (loc1, loc2) => {
               if (!loc1 || !loc2) return 0;
               const dx = loc1.lat - loc2.lat;
               const dy = loc1.lng - loc2.lng;
               return Math.sqrt(dx*dx + dy*dy);
             };

             const severity = cmdObj.severity || 'high';

             next.caretakers.forEach(caretaker => {
               let score = 100;

               // Proximity
               const dist = getDistance(p?.location, caretaker.location);
               score -= (dist * 100000); // Scale distance impact

               // Skill Match
               const isAdvanced = caretaker.skills.some(s => 
                 s.includes('Advanced') || s.includes('Critical') || s.includes('RN') || s.includes('Registered Nurse')
               );
               if (severity === 'high') {
                 if (isAdvanced) score += 50;
                 else score -= 80;
               }

               // Task Interruptibility
               const hasNonInterruptible = caretaker.tasks?.some(t => !t.completed && !t.interruptible);
               if (hasNonInterruptible) {
                 score -= 100;
               }

               // Shift Timing
               const shiftEnd = new Date(caretaker.shiftEnd);
               const minsLeft = (shiftEnd - now) / (1000 * 60);
               if (minsLeft < 0) score -= 500;
               else if (minsLeft < 30) score -= 60;

               if (score > highestScore) {
                 highestScore = score;
                 bestCaretaker = caretaker;
               }
             });

             const dist = getDistance(p?.location, bestCaretaker?.location);
             const distMeters = dist ? Math.round(dist * 111000) : 0;
             const assignmentReason = [
               `Nearest available (~${distMeters}m)`,
               bestCaretaker?.skills?.[0] ? `Skill Match: ${bestCaretaker.skills[0]}` : null,
               highestScore < 0 ? `Selected despite shift constraints` : null
             ].filter(Boolean).join(' • ');

             // Simulate server broadcast
             setTimeout(() => {
               setActiveAlarm({ 
                 patientId: cmdObj.patientId, 
                 patientName: p?.name || 'Unknown Patient', 
                 locationName: p?.location?.name || 'Unknown Location', 
                 severity: severity,
                 status: {
                   hr: p?.hr,
                   bp: `${p?.systolic}/${p?.diastolic}`,
                   spO2: p?.spO2,
                   temp: p?.temp?.toFixed(1)
                 },
                 assignedCaretakerId: bestCaretaker?.id,
                 assignedCaretakerName: bestCaretaker?.name,
                 assignmentReason: assignmentReason
               });
             }, 100);
             break;
          }
          case 'clear_emergency': {
             const p = next.patients?.find(p => p.id === cmdObj.patientId);
             if (p) p.emergencyTriggered = false;
             setTimeout(() => setActiveAlarm(null), 100);
             break;
          }
          case 'toggle_task': {
             const c = next.caretakers?.find(c => c.id === cmdObj.caretakerId);
             if (c) {
               const t = c.tasks?.find(t => t.id === cmdObj.taskId);
               if (t) t.completed = !t.completed;
             }
             break;
          }
        }
        return next;
      });
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
