import React, { useState, useRef } from 'react';
import { HeartPulse, Activity, AlertTriangle, User, PhoneCall, Plus, CheckCircle2, Circle, Clock, Info, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';

// ─── MODULE-LEVEL SINGLETON FOR PATIENT ALARM ────────────────────────────────
let _patientAlarmCtx = null;
let _patientAlarmStopped = true;
let _patientAlarmTimeoutId = null;
let _patientManualSilence = false; // Prevents auto-restart if user clicked stop

const getPatientAudioCtx = () => {

  if (!_patientAlarmCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) _patientAlarmCtx = new AudioCtx();
  }
  return _patientAlarmCtx;
};

const stopPatientAlarm = () => {
  _patientAlarmStopped = true;
  _patientManualSilence = true; 
  if (_patientAlarmTimeoutId !== null) {
    clearTimeout(_patientAlarmTimeoutId);
    _patientAlarmTimeoutId = null;
  }
};




const PatientDashboard = ({ 
  globalState, 
  getHrStatus, 
  getSpo2Status, 
  connectionStatus, 
  sendCommand,
  role 
}) => {
  const navigate = useNavigate();
  const [newMedName, setNewMedName] = useState('');
  const [showCareTeam, setShowCareTeam] = useState(false);
  
  // Location and Permission state
  const [userCoords, setUserCoords] = useState(null);
  const [userAddress, setUserAddress] = useState('Locating...');
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'unsupported'

  // Alarm audio - driven by useEffect so it auto-stops when server clears emergency
  const alarmStopRef = useRef(null);


  // Reverse Geocode Helper
  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await resp.json();
      return data.display_name || 'Unknown Location';
    } catch (e) {
      console.warn("Geocoding failed:", e);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // For demo purposes, we log in as patient 'GF-001' (Ramesh Patil)
  const patient = globalState.patients?.find(p => p.id === 'GF-001');
  const caretakers = globalState.caretakers || [];

  React.useEffect(() => {
    if (!patient || role !== 'patient') return;

    // Register as a patient to clear any previous caregiver sessions on this WebSocket
    sendCommand({ action: 'register_client', caregiverId: null, role: 'patient' });

    let watchId;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          setLocationStatus('granted');

          const address = await reverseGeocode(latitude, longitude);
          setUserAddress(address);

          sendCommand({
            action: 'update_location',
            patientId: patient.id,
            lat: latitude,
            lng: longitude,
            locationName: address
          });
        },
        (error) => {
          console.warn("Location error:", error.message);
          setLocationStatus(error.code === 1 ? 'denied' : 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('unsupported');
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [patient?.id, role]);

  const [audioState, setAudioState] = useState('unknown');

  // Auto-start / auto-stop alarm based on emergencyTriggered from server state
  React.useEffect(() => {
    if (role !== 'patient' || !patient) return;

    if (patient.emergencyTriggered) {
      if (_patientAlarmStopped && !_patientManualSilence) {
        _patientAlarmStopped = false;

        const ctx = getPatientAudioCtx();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => console.warn("Patient Autoplay blocked."));
        }

        let iter = 0;
        const scheduleBeep = () => {
          if (_patientAlarmStopped || !ctx) return;
          if (ctx.state === 'running') {
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.7, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
            gain.connect(ctx.destination);
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(iter % 2 === 0 ? 960 : 720, ctx.currentTime);
            osc.connect(gain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
            iter++;
          }
          _patientAlarmTimeoutId = setTimeout(scheduleBeep, 340);
        };

        if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
        scheduleBeep();

        const unlockPatient = () => { if (ctx.state === 'suspended') ctx.resume(); };
        window.addEventListener('click', unlockPatient, { once: true });
        window.addEventListener('click', unlockPatient, { once: true });
        window.addEventListener('keydown', unlockPatient, { once: true });
      }
    } else {
      _patientManualSilence = false; // Reset for next emergency
      stopPatientAlarm();
    }

    const checkAudio = setInterval(() => {
      const ctx = getPatientAudioCtx();
      setAudioState(ctx ? ctx.state : 'unsupported');
    }, 500);

    return () => {
      stopPatientAlarm();
      clearInterval(checkAudio);
    };
  }, [patient?.emergencyTriggered, role]);

  const unlockPatientAudioManual = () => {
    const ctx = getPatientAudioCtx();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => setAudioState('running'));
      } else {
        _patientManualSilence = false; // Allow re-trigger if they want to hear it again
        _patientAlarmStopped = true; // Force a restart of the effect logic next tick
      }
    }
  };


  if (!patient) return <div style={{padding: '40px', textAlign: 'center'}}>Loading Patient Data...</div>;

  // ─── Alarm helpers (patient side) ────────────────────────────────────
  const triggerEmergency = () => {
    sendCommand({ action: 'trigger_emergency', patientId: patient.id, severity: 'high' });
    // Alarm auto-starts via useEffect watching patient.emergencyTriggered
  };

  const clearEmergency = () => {
    stopPatientAlarm(); // STOP LOCALLY IMMEDIATELY
    sendCommand({ action: 'clear_emergency', patientId: patient.id });
  };

  const addMedication = (e) => {
    e.preventDefault();
    if (newMedName.trim()) {
      sendCommand({ action: 'add_medication', patientId: patient.id, name: newMedName.trim() });
      setNewMedName('');
    }
  };

  const toggleMedication = (medId) => {
    console.log('toggleMedication clicked for:', medId, 'Sending check_medication for patient:', patient.id);
    sendCommand({ action: 'check_medication', patientId: patient.id, medId });
  };

  return (
    <div className="dashboard-content-wrapper">
      <style>{`
        @keyframes alarmPulse { 0%, 100% { background-color: #dc2626; } 50% { background-color: #7f1d1d; } }
        @keyframes btnPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.7); } 70% { box-shadow: 0 0 0 10px rgba(220,38,38,0); } }
      `}</style>
      <header className="dashboard-header">
        <div className="header-brand">
          <button className="icon-btn" onClick={() => navigate('/')} style={{marginRight: '8px'}}>&larr;</button>
          <HeartPulse size={28} color="var(--accent-purple)" />
          <div>
            <h2 style={{marginBottom: 0}}>CareNest</h2>
            <div className="view-label">{role === 'patient' ? 'Patient View' : 'Family View'}</div>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
          {/* INTERACTIVE EMERGENCY BUTTON - ONLY FOR PATIENT ROLE */}
          {role === 'patient' && (
            <button
              className="btn-primary"
              style={{
                backgroundColor: patient.emergencyTriggered ? '#7f1d1d' : 'var(--accent-red)',
                padding: '10px 24px',
                display: 'flex',
                gap: '8px',
                animation: patient.emergencyTriggered ? 'btnPulse 1.5s ease-in-out infinite' : 'none'
              }}
              onClick={patient.emergencyTriggered ? clearEmergency : triggerEmergency}
            >
              <AlertTriangle size={20} />
              {patient.emergencyTriggered ? '🛑 Stop Emergency & Alarm' : '🚨 Emergency Alert'}
            </button>
          )}
        </div>
      </header>

      {/* EMERGENCY NOTIFICATION BANNER */}
      {patient.emergencyTriggered && (
        <div style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          animation: 'alarmPulse 1.5s ease-in-out infinite'
        }}>
          <div style={{fontSize: '1.4rem', textAlign: 'center'}}>🚨 EMERGENCY ALERT SENT</div>
          
          <div 
            onClick={unlockPatientAudioManual}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem',
              background: audioState === 'running' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)',
              border: `1px solid ${audioState === 'running' ? '#4ade80' : '#fde047'}`,
              color: 'white', cursor: 'pointer'
            }}>
            {audioState === 'running' ? '🔊 Alarm is ringing' : '🔇 Browser muted sound — Click to activate'}
          </div>


          <p style={{margin: 0, fontWeight: 400, fontSize: '0.95rem', textAlign: 'center'}}>Nearest caretaker has been notified. Help is on the way.</p>

          <button
            onClick={clearEmergency}
            style={{
              backgroundColor: 'white',
              color: '#dc2626',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 32px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            🛑 Stop Alarm
          </button>
        </div>
      )}

      {/* Pinned Patient Name & Location */}
      <div style={{display: 'flex', justifyContent: 'center', margin: '20px 0 40px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <h1 style={{fontSize: '2.5rem', color: 'var(--text-main)', margin: 0}}>{patient.name}</h1>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '10px 24px', borderRadius: '9999px', fontSize: '1.1rem', fontWeight: 600, border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}}>
            <MapPin size={22} color="var(--accent-blue)" />
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <span style={{color: 'var(--text-main)'}}>{patient.location.name}</span>
              {locationStatus === 'granted' && (
                <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400}}>
                  Live: {userAddress}
                </span>
              )}
              {locationStatus === 'denied' && (
                <span style={{fontSize: '0.75rem', color: 'var(--status-critical)', fontWeight: 400}}>
                  Location Denied
                </span>
              )}
            </div>
            <div style={{marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: connectionStatus === 'connected' ? 'var(--status-normal)' : 'var(--status-critical)'}}>
              <span style={{display: 'inline-block', width: '10px', height: '10px', backgroundColor: connectionStatus === 'connected' ? 'var(--status-normal)' : 'var(--status-critical)', borderRadius: '50%'}}></span>
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content" style={{gridTemplateColumns: 'minmax(300px, 1fr) 350px'}}>
        
        {/* Left Column: Stats & Vitals */}
        <div className="dashboard-col">
          <section className="info-section">
            <div className="section-title">
              <div><Activity size={20} className="icon" style={{color: 'var(--accent-purple)'}} /> Live Vitals</div>
            </div>
            {/* Vitals Grid with Sleep Tracker included */}
            <div className="metric-grid">
              <MetricCard 
                title="Heart Rate" 
                value={patient.hr} 
                unit="bpm" 
                type="hr"
                status={getHrStatus(patient.hr)} 
              />
              <MetricCard 
                title="Blood Pressure" 
                value={`${patient.systolic || '--'}/${patient.diastolic || '--'}`} 
                unit="mmHg" 
                type="bp"
                status={patient.systolic > 140 ? 'warning' : 'normal'} 
              />
              <MetricCard 
                title="Oxygen (SpO2)" 
                value={patient.spO2} 
                unit="%" 
                type="spo2"
                status={getSpo2Status(patient.spO2)} 
              />
              {/* Sleep Tracker Widget */}
              <MetricCard 
                title="Sleep Score" 
                value={patient.sleepScore} 
                unit="/100" 
                type="hr"
                status={patient.sleepScore < 60 ? 'warning' : 'normal'} 
              />
              {/* Temperature Widget */}
              <MetricCard 
                title="Body Temp" 
                value={patient.temp?.toFixed(1) || '--'} 
                unit="°C" 
                type="temp"
                status={patient.temp > 37.5 ? 'warning' : 'normal'} 
              />
            </div>
          </section>

          {/* Past Health Conditions */}
          <section className="info-section">
            <div className="section-title">
              <div><Clock size={20} className="icon" style={{color: 'var(--accent-purple)'}} /> Active & Past Conditions</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {patient.history.map((cond, i) => (
                 <div key={i} className="list-item" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                   <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)'}}></div>
                   {cond}
                 </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Medications */}
        <div className="dashboard-col">
          <section className="info-section">
            <div className="section-title" style={{marginBottom: '16px'}}>
              <div><Info size={20} className="icon" style={{color: 'var(--accent-purple)'}} /> Current Medications</div>
            </div>
            
            {/* Interactive Checklist */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px'}}>
              {patient.medications.map(med => (
                <div 
                  key={med.id} 
                  className={`list-item ${role !== 'family' ? 'medication-item' : ''} ${med.taken ? 'taken' : ''}`} 
                  onClick={() => role !== 'family' && toggleMedication(med.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '32px 24px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    backgroundColor: med.taken ? '#f9fafb' : '#ffffff',
                    gap: '12px',
                    cursor: role === 'family' ? 'default' : 'pointer'
                  }}
                >
                  <h4 style={{
                    fontSize: '1.25rem', 
                    fontWeight: '600',
                    margin: 0, 
                    color: med.taken ? '#9ca3af' : '#111827', 
                    transition: 'color 0.2s ease'
                  }}>
                    {med.name}
                  </h4>
                  
                  <p style={{
                    fontSize: '1.05rem', 
                    color: '#6b7280', 
                    margin: 0
                  }}>
                    {med.taken && med.takenAt 
                      ? `Taken at ${new Date(med.takenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                      : 'Prescribed Daily'}
                  </p>

                  {med.history && med.history.length > 0 && med.taken && (
                     <div style={{
                       margin: '4px 0', 
                       display: 'flex', 
                       justifyContent: 'center'
                     }}>
                       {med.history.map((t, idx) => (
                         <span key={idx} style={{
                            backgroundColor: '#ecfdf5', 
                            padding: '6px 16px', 
                            borderRadius: '8px', 
                            border: '1px solid #a7f3d0', 
                            color: '#10b981',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                         }}>
                            {new Date(t).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </span>
                       ))}
                     </div>
                  )}

                  <div style={{
                    color: med.taken ? '#10b981' : '#111827', 
                    marginTop: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {med.taken ? <CheckCircle2 size={40} strokeWidth={1.5} /> : <Circle size={40} strokeWidth={2} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Form to add medicine (Hidden for Family Role) */}
            {role !== 'family' && (
              <form onSubmit={addMedication} style={{display: 'flex', gap: '8px', marginBottom: '32px'}}>
                <input 
                  type="text" 
                  value={newMedName}
                  onChange={e => setNewMedName(e.target.value)}
                  placeholder="Add new medication..."
                  style={{flexGrow: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)'}}
                />
                <button type="submit" className="btn-secondary" style={{padding: '10px'}}><Plus size={20}/></button>
              </form>
            )}

            <div className="section-title" style={{marginBottom: '16px'}}>
              <div style={{fontSize: '1rem', color: 'var(--text-muted)'}}>Past Medications (Stopped)</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.7}}>
              {patient.pastMedications && patient.pastMedications.map((med, i) => (
                 <div key={i} className="list-item" style={{padding: '12px'}}>
                   {med}
                 </div>
              ))}
              {!patient.pastMedications && <div className="list-item" style={{padding: '12px', fontSize: '0.85rem', color: 'var(--text-muted)'}}>No past medication records.</div>}
            </div>
            
          </section>
        </div>
      </div>

      {/* Careteam Directory Dropdown Footer */}
      <section className="info-section" style={{marginTop: '24px', backgroundColor: 'var(--bg-card-blue)'}}>
        <div 
          className="section-title" 
          style={{marginBottom: showCareTeam ? '24px' : 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}}
          onClick={() => setShowCareTeam(!showCareTeam)}
        >
          <div style={{display: 'flex', alignItems: 'center'}}><User size={20} className="icon" style={{color: 'var(--accent-blue)'}} /> My Careteam Directory</div>
          <button style={{background: 'none', border: 'none', cursor: 'pointer'}}>
             {showCareTeam ? <ChevronDown size={24} color="var(--accent-blue)" /> : <ChevronRight size={24} color="var(--accent-blue)" />}
          </button>
        </div>
        
        {showCareTeam && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px'}}>
             {caretakers.map(ct => (
               <div key={ct.id} className="contact-item" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px'}}>
                 <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px'}}>
                   <div>
                     <h4 style={{fontSize: '1.1rem', margin: 0}}>{ct.name}</h4>
                     <p style={{fontSize: '0.9rem', color: 'var(--accent-blue)', margin: 0, fontWeight: 500}}>{ct.role}</p>
                   </div>
                   <div style={{backgroundColor: '#e6f0ff', padding: '8px', borderRadius: '50%', color: 'var(--accent-blue)'}}>
                      <PhoneCall size={20} />
                   </div>
                 </div>
                 
                 <p style={{fontSize: '0.9rem', fontWeight: 'bold'}}>{ct.contact}</p>
                 
                 <div style={{marginTop: '12px'}}>
                   <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px'}}><strong>Experience:</strong> {ct.experience}</p>
                   <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}><strong>Skills:</strong> {ct.skills.join(', ')}</p>
                 </div>
               </div>
             ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default PatientDashboard;
