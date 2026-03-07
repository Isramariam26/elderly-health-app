import React, { useState, useEffect, useRef } from 'react';
import { Activity, User, MapPin, HeartPulse, FileText, CheckCircle2, Circle, X, Calendar, AlertTriangle, Clock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import EmergencyAlarm from '../components/EmergencyAlarm';

// Normalize coordinates to percentage for SVG Map
const normalizeCoord = (val, min, max) => ((val - min) / (max - min)) * 100;

const CaregiverDashboard = ({ 
  globalState, 
  getHrStatus, 
  getSpo2Status, 
  connectionStatus, 
  sendCommand,
  activeAlarm,
  setActiveAlarm
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedCaretaker, setSelectedCaretaker] = useState(null);
  
  // Real-time clock for shift tracking
  const [now, setNow] = useState(new Date());
  // Location and Permission state
  const [userCoords, setUserCoords] = useState(null);
  const [userAddress, setUserAddress] = useState('Locating...');
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'unsupported'

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({}); // { id: L.Marker }

  // Tasks state for forms
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPatientId, setNewTaskPatientId] = useState('p1');
  const [newTaskIsInterruptible, setNewTaskIsInterruptible] = useState(true);
  
  // Shift state
  // Shift expansion was removed by user request

  // We log in as caretaker 'CT-001' (Anjali Deshmukh)
  const caretakerId = 'CT-001';
  const caretaker = globalState.caretakers?.find(c => c.id === caretakerId) || null;
  const allCaretakers = globalState.caretakers || [];
  const allPatients = globalState.patients || [];
  const activeEmergency = globalState.activeEmergency;

  // Register this caregiver session with the server so targeted alarms can reach us
  useEffect(() => {
    sendCommand({ action: 'register_client', caregiverId: caretakerId, role: 'caregiver' });
  }, [caretakerId]);

  // STAFF GEOLOCATION REPORTING
  useEffect(() => {
    if (!caretaker) return;
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocationStatus('granted');
        
        const address = await reverseGeocode(latitude, longitude);
        setUserAddress(address);
        
        sendCommand({
          action: 'update_location',
          caretakerId: caretaker.id,
          lat: latitude,
          lng: longitude,
          locationName: address
        });
      },
      (err) => {
        console.warn("Staff Geolocation error:", err);
        setLocationStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [caretaker?.id]);

  if (!caretaker) return <div style={{padding: '40px', textAlign: 'center'}}>Loading Caregiver Data...</div>;

  const activeTasks = caretaker.tasks.filter(t => !t.completed);
  const completedTasks = caretaker.tasks.filter(t => t.completed);

  // Time calculations
  const shiftStart = new Date(caretaker.shiftStart);
  const shiftEnd = new Date(caretaker.shiftEnd);
  const shiftRemainingMins = Math.max(0, Math.floor((shiftEnd - now) / (1000 * 60)));

  const handleToggleTask = (taskId) => {
    sendCommand({ action: 'toggle_task', caretakerId, taskId });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTaskText) {
      sendCommand({ 
        action: 'add_task', 
        caretakerId, 
        text: newTaskText, 
        patientId: newTaskPatientId, 
        priority: 'normal',
        interruptible: newTaskIsInterruptible 
      });
      setNewTaskText('');
    }
  };


  const clearFallGlobal = () => {
    sendCommand({ action: 'clear_emergency', patientId: activeEmergency.patientId });
  };

  // Condition coloring
  const getCardColor = (p) => {
    if (activeEmergency?.patientId === p.id) return '#ffe6e6'; // Critical Red
    const hrStat = getHrStatus(p.hr);
    const o2Stat = getSpo2Status(p.spO2);
    if (hrStat === 'critical' || o2Stat === 'critical' || p.systolic > 160) return '#ffe6e6';
    if (hrStat === 'warning' || o2Stat === 'warning' || p.systolic > 140) return '#fff5e6'; // Warning Orange
    return 'var(--bg-card)';
  };

  useEffect(() => {
    if (activeTab !== 'patients' || !mapRef.current || !window.L) return;

    const L = window.L;

    // Initialize Map
    if (!mapInstance.current) {
      const center = [34.0754, -118.3811]; // Cedars-Sinai
      mapInstance.current = L.map(mapRef.current).setView(center, 17);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }

    // Helper for custom icons with labels
    const createMarkerHTML = (color, name, role) => `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid ${color}; margin-bottom: 2px;">
          ${name}
        </div>
        <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
    `;

    const createIcon = (color, name) => L.divIcon({
      className: 'custom-map-marker',
      html: createMarkerHTML(color, name),
      iconSize: [0, 0], // Anchor at center
      iconAnchor: [0, 0]
    });

    // Helper for smooth marker animation
    const smoothMove = (marker, newLat, newLng) => {
      const startLatLng = marker.getLatLng();
      const endLatLng = L.latLng(newLat, newLng);
      if (startLatLng.equals(endLatLng)) return;

      let start = null;
      const duration = 2000; // Match synchronization interval

      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * progress;
        const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * progress;
        
        marker.setLatLng([lat, lng]);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    };

    // Sync Markers
    const currentIds = new Set();

    // Patients (Red)
    allPatients.forEach(p => {
      currentIds.add(p.id);
      const color = activeEmergency?.patientId === p.id ? 'var(--accent-red)' : '#f43f5e';
      if (!markersRef.current[p.id]) {
        markersRef.current[p.id] = L.marker([p.location.lat, p.location.lng], { 
          icon: createIcon(color, p.name, 'Patient'),
          zIndexOffset: 1000 // Ensure patients are on top
        }).addTo(mapInstance.current)
          .bindTooltip(`<b>Patient:</b> ${p.name}`, { direction: 'top', offset: [0, -25] })
          .bindPopup(`<b>${p.name}</b><br>${p.location.name}<br>Status: ${activeEmergency?.patientId === p.id ? 'EMERGENCY' : 'Normal'}`);
      } else {
        smoothMove(markersRef.current[p.id], p.location.lat, p.location.lng);
        markersRef.current[p.id].setIcon(createIcon(color, p.name, 'Patient'));
      }
    });

    // Caretakers (Blue/Purple)
    allCaretakers.forEach(c => {
      currentIds.add(c.id);
      const isMe = c.id === caretakerId;
      const color = isMe ? 'var(--accent-purple)' : 'var(--accent-blue)';
      const displayName = isMe ? 'You' : c.name.split(' ').pop(); // Just last name for brevity
      if (!markersRef.current[c.id]) {
        markersRef.current[c.id] = L.marker([c.location.lat, c.location.lng], { 
          icon: createIcon(color, displayName, 'Caregiver'),
          zIndexOffset: 500
        }).addTo(mapInstance.current)
          .bindTooltip(`<b>Caregiver:</b> ${c.name}`, { direction: 'top', offset: [0, -25] })
          .bindPopup(`<b>${c.name}</b><br>${c.role}`);
      } else {
        smoothMove(markersRef.current[c.id], c.location.lat, c.location.lng);
        markersRef.current[c.id].setIcon(createIcon(color, displayName, 'Caregiver'));
      }
    });

    // Remove old markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

  }, [activeTab, allPatients, allCaretakers]);

  return (
    <div className="dashboard-content-wrapper" style={{maxWidth: '1200px', margin: '0 auto'}}>
      
      {/* Targeted Emergency Alarm Popup */}
      {activeAlarm && (
        <EmergencyAlarm
          alarm={activeAlarm}
          onDismiss={() => setActiveAlarm(null)}
          sendCommand={sendCommand}
        />
      )}

      {/* Top Header */}
      <header className="nurse-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
            <button className="icon-btn" onClick={() => navigate('/')}>&larr;</button>
            <div className="nurse-profile">
              <div style={{backgroundColor: 'var(--bg-card-purple)', color: 'var(--accent-purple)', padding: '12px', borderRadius: '50%'}}>
                <User size={24} />
              </div>
            <div className="nurse-info">
              <h3>{caretaker.name} <HeartPulse size={16} color="var(--accent-purple)" /></h3>
              <p>{caretaker.role} • Shift: {shiftStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {shiftEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              
              {/* LOCATION STATUS AND SOUND SENTINEL DISPLAY */}
              <div style={{marginTop: '4px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <div style={{
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: locationStatus === 'granted' ? 'var(--status-normal)' : (locationStatus === 'denied' ? 'var(--status-critical)' : '#ccc')
                  }}></div>
                  <span style={{color: 'var(--text-muted)', fontWeight: 600}}>
                    {locationStatus === 'granted' ? `Location: ${userAddress}` : 
                     (locationStatus === 'denied' ? 'Location Access Denied' : 'Checking Location Access...')}
                  </span>
                </div>

                {/* SOUND SENTINEL */}
                <button 
                  onClick={() => {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    ctx.resume().then(() => {
                      alert("🔊 Sound Alerts Enabled! You will now hear emergency sirens.");
                      ctx.close(); // Just used for authorization
                    });
                  }}
                  style={{
                    backgroundColor: 'var(--bg-card-blue)',
                    color: 'var(--accent-blue)',
                    border: '1px solid var(--accent-blue)',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🔊 Enable Sound Alerts
                </button>
              </div>
            </div>
            </div>
        </div>
      </header>

      {/* PERSISTENT ACTIVE EMERGENCY BANNER — visible to any logged-in caretaker */}
      {activeEmergency && (
        <div style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '16px 28px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          animation: 'alarmPulse 1.5s ease-in-out infinite',
          zIndex: 100,
          position: 'relative'
        }}>
          <style>{`@keyframes alarmPulse { 0%, 100% { background-color: #dc2626; } 50% { background-color: #7f1d1d; } }`}</style>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <AlertTriangle size={28} />
            <div>
              <div style={{fontWeight: 800, fontSize: '1.1rem'}}>🚨 ACTIVE EMERGENCY — {activeEmergency.patientName}</div>
              <div style={{fontSize: '0.9rem', opacity: 0.9}}>
                📍 {activeEmergency.locationName} &nbsp;|&nbsp;
                HR: {activeEmergency.status?.hr} BPM &nbsp;|&nbsp;
                SpO₂: {activeEmergency.status?.spO2}% &nbsp;|&nbsp;
                Assigned to: {activeEmergency.assignedCaretakerId === caretakerId ? 'You' : activeEmergency.assignedCaretakerId}
              </div>
            </div>
          </div>
          <button
            onClick={() => sendCommand({ action: 'clear_emergency', patientId: activeEmergency.patientId })}
            style={{
              backgroundColor: 'white',
              color: '#dc2626',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 24px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.95rem',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            🛑 Stop Alarm & Clear
          </button>
        </div>
      )}

      {/* TARGETED EMERGENCY ALERT (legacy detailed dispatch) */}
      {activeEmergency && activeEmergency.assignedCaretakerId === caretakerId && (
        <div style={{backgroundColor: 'var(--status-critical)', color: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
             <AlertTriangle size={32} />
             <div>
               <h2 style={{margin: 0, fontSize: '1.5rem'}}>SYSTEM ROUTED EMERGENCY DISPATCH</h2>
               <p style={{margin: '4px 0', fontSize: '1.2rem', fontWeight: 700}}>
                 {activeEmergency.patientName} • {activeEmergency.locationName}
               </p>
               <p style={{margin: 0, fontSize: '1rem', opacity: 0.9}}> 
                 Vital Signs Trigger: Pulse {activeEmergency.status?.hr} BPM | BP {activeEmergency.status?.bp} | SpO2 {activeEmergency.status?.spO2}% | Temp {activeEmergency.status?.temp}°C
               </p>
               <p style={{margin: '8px 0 0 0', fontSize: '0.85rem', opacity: 0.8}}> 
                 Caretaker routing based on proximity and Registered Nurse level skills.
               </p>
             </div>
          </div>
          <button className="btn-secondary" style={{backgroundColor: 'white', color: 'var(--status-critical)', border: 'none'}} onClick={clearFallGlobal}>Acknowledge &amp; Clear</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{padding: '0 24px'}}>
        <div className="tab-row" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '32px'}}>
          <button className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            <User size={18} /> All Patients <ChevronDown className="chevron"/>
          </button>
          <button className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
            <Calendar size={18} /> Shift Schedule <ChevronDown className="chevron"/>
          </button>
          <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            <FileText size={18} /> My Tasks <ChevronDown className="chevron" />
          </button>
        </div>

        {/* TAB 1: PATIENTS & MAP */}
        {activeTab === 'patients' && (
          <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '32px'}}>
            <section className="info-section" style={{marginBottom: 0}}>
              <div className="section-title">
                <div><Activity size={20} className="icon" style={{color: 'var(--accent-purple)'}} /> Patients at a Glance</div>
                {connectionStatus === 'connected' && <div className="status-badge connected" style={{fontSize: '0.8rem'}}>Live Data Active</div>}
              </div>
              
              <div className="patients-grid">
                {allPatients.map(p => (
                  <div key={p.id} className="patient-card-small" style={{backgroundColor: getCardColor(p)}} onClick={() => setSelectedPatient(p)}>
                    <div className="patient-avatar">👱</div>
                    <div className="patient-details">
                      <h4 style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        {p.name}
                        {p.id === 'p1' && <HeartPulse size={16} color="var(--status-normal)" className="pulse" />}
                      </h4>
                      <p>{p.location.name}</p>
                      <div className="mini-vitals">
                        <span style={{color: getHrStatus(p.hr) !== 'normal' ? 'var(--status-critical)' : 'inherit'}}>
                          BP: {p.systolic || '--'}/{p.diastolic || '--'}
                        </span>
                        <span style={{color: getHrStatus(p.hr) !== 'normal' ? 'var(--status-critical)' : 'inherit'}}>
                          Pulse: {p.hr || '--'}
                        </span>
                        <span>O₂: {p.spO2 || '--'}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* LIVE MAP SECTION */}
            <section className="info-section">
               <div className="section-title">
                 <div><MapPin size={20} className="icon" style={{color: 'var(--accent-blue)'}} /> Live Facility Map</div>
                 <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Real-time Tracking</div>
               </div>
               
               <div ref={mapRef} style={{width: '100%', height: '450px', backgroundColor: '#eef2f5', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', zIndex: 1}}>
                 {/* Leaflet Map Container */}
               </div>
            </section>
          </div>
        )}

        {/* TAB 2: SHIFT SCHEDULE */}
        {activeTab === 'schedule' && (
          <div style={{display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '32px'}}>
            <section className="task-list">
               <h3 style={{marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'}}><Clock size={20} color="var(--accent-purple)"/> My Shift Tracker</h3>
               
               <div style={{backgroundColor: '#f8f9fa', padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '32px'}}>
                  <h1 style={{fontSize: '3rem', color: shiftRemainingMins < 60 ? 'var(--accent-red)' : 'var(--accent-blue)', margin: '0 0 12px 0'}}>{Math.floor(shiftRemainingMins/60)}h {shiftRemainingMins%60}m</h1>
                  <p style={{color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0}}>Remaining in shift</p>
               </div>

               <p><strong>Started:</strong> {shiftStart.toLocaleTimeString()}</p>
               <p style={{marginBottom: '24px'}}><strong>Ending:</strong> {shiftEnd.toLocaleTimeString()}</p>
            </section>



            <section className="task-list">
               <h3 style={{marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'}}><User size={20} color="var(--accent-blue)"/> Other Caretakers</h3>
               <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                 {allCaretakers.filter(c => c.id !== caretakerId).map(c => {
                   const cEnd = new Date(c.shiftEnd);
                   const isOver = cEnd < now;
                   return (
                     <div key={c.id} className="list-item" onClick={() => setSelectedCaretaker(c)} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', cursor: 'pointer', backgroundColor: 'var(--bg-card)', transition: 'background-color 0.2s'}}>
                        <div>
                          <h4 style={{margin: '0 0 4px 0'}}>{c.name}</h4>
                          <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)'}}>{c.role}</p>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          {isOver ? (
                            <span className="status-badge" style={{backgroundColor: '#f0f0f0', color: 'var(--text-muted)'}}>Shift Ended</span>
                          ) : (
                            <>
                              <span className="status-badge connected">On Shift until {cEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px'}}>
                                Time Elapsed: {Math.max(0, Math.floor((now - new Date(c.shiftStart)) / (1000 * 60 * 60)))}h {Math.max(0, Math.floor((now - new Date(c.shiftStart)) / (1000 * 60))) % 60}m {Math.max(0, Math.floor((now - new Date(c.shiftStart)) / 1000)) % 60}s
                              </div>
                            </>
                          )}
                        </div>
                     </div>
                   )
                 })}
               </div>
            </section>
          </div>
        )}

        {/* TAB 3: TASKS */}
        {activeTab === 'tasks' && (
          <section className="task-list" style={{maxWidth: '800px'}}>
             <div className="task-header" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '24px'}}>
                <div style={{width: '100%'}}>
                  <h3 style={{marginBottom: '16px'}}>Add New Task</h3>
                  <form onSubmit={handleAddTask} style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <input type="text" placeholder="Task description..." value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} style={{flexGrow: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)'}} required/>
                    <select value={newTaskPatientId} onChange={e => setNewTaskPatientId(e.target.value)} style={{padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                      {allPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'}}>
                      <input type="checkbox" checked={newTaskIsInterruptible} onChange={e => setNewTaskIsInterruptible(e.target.checked)}/>
                      Interruptible?
                    </label>
                    <button type="submit" className="btn-secondary">+ Add</button>
                  </form>
                </div>
             </div>

             <h4 style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: '24px 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px'}}>Active Tasks</h4>
             
             <div className="task-list">
               {activeTasks.length > 0 ? activeTasks.map(task => {
                  const pat = allPatients.find(p => p.id === task.patientId);
                  return (
                    <div key={task.id} className="task-item" style={{backgroundColor: '#fff'}}>
                      <div className="task-icon"><Clock size={20} color="var(--accent-blue)" /></div>
                      <div className="task-content">
                        <h4>{task.text}</h4>
                        <p style={{margin: '4px 0 8px 0'}}>{pat?.name}</p>
                        <div className="task-tags">
                          {task.priority === 'high' && <span className="tag high">high</span>}
                          <span className="tag duration">~15min</span>
                          {!task.interruptible && <span className="tag non-interrupt">Non-interruptible</span>}
                        </div>
                      </div>
                      <button className="task-btn" onClick={() => handleToggleTask(task.id)}>Done</button>
                    </div>
                  )
               }) : <p style={{color: 'var(--text-muted)'}}>No active tasks.</p>}
             </div>

             <h4 style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: '32px 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px'}}>Completed</h4>
             <div className="task-list">
               {completedTasks.length > 0 ? completedTasks.map(task => {
                  const pat = allPatients.find(p => p.id === task.patientId);
                  return (
                    <div key={task.id} className="task-item completed">
                      <div className="task-icon" style={{color: 'var(--status-normal)'}}><CheckCircle2 size={20} /></div>
                      <div className="task-content">
                        <h4>{task.text}</h4>
                      </div>
                    </div>
                  )
               }) : <p style={{color: 'var(--text-muted)'}}>No completed tasks.</p>}
             </div>
          </section>
        )}
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                 <div className="patient-avatar" style={{fontSize: '3rem'}}>👱</div>
                 <div>
                   <h2 style={{fontSize: '1.75rem', marginBottom: '4px', fontWeight: 700}}>
                     {selectedPatient.name} 
                     {activeEmergency?.patientId === selectedPatient.id && <AlertTriangle color="var(--accent-red)" style={{marginLeft: '8px'}}/>}
                   </h2>
                   <p style={{color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem'}}>Location: {selectedPatient.location.name}</p>
                 </div>
               </div>
               <button className="close-btn" onClick={() => setSelectedPatient(null)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: 'var(--accent-teal-dark)', fontSize: '0.9rem'}}>
                 <MapPin size={16}/> {selectedPatient.location?.name || 'Unknown'} 
                 <span style={{padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#065f46', fontSize: '0.75rem', fontWeight: 600}}>• Live</span>
              </div>

              {/* Comprehensive Grid for Modal */}
              <div className="metric-grid" style={{marginBottom: '32px'}}>
                <MetricCard title="BP" value={`${selectedPatient.systolic || '--'}/${selectedPatient.diastolic || '--'}`} type="bp" status={selectedPatient.systolic > 140 ? 'warning' : 'normal'} />
                <MetricCard title="O₂" value={selectedPatient.spO2 || '--'} unit="%" type="spo2" status={getSpo2Status(selectedPatient.spO2)} />
                <MetricCard title="PULSE" value={selectedPatient.hr || '--'} unit="BPM" type="hr" status={getHrStatus(selectedPatient.hr)} />
                <MetricCard title="TEMP" value={selectedPatient.temp?.toFixed(1) || '--'} unit="°C" type="temp" status={'normal'} />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                <div>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}><FileText size={18} color="var(--accent-purple)" /> Current Medications</h3>
                  <div className="task-list" style={{boxShadow: 'none', padding: 0}}>
                    {(selectedPatient.medications || []).map((med, idx) => (
                      <div key={med.id} className="task-item" style={{marginBottom: 0, borderBottom: idx !== (selectedPatient.medications?.length || 0) -1 ? '1px solid var(--border-color)' : 'none', borderRadius: 0}}>
                          <div className="task-content">
                            <h4 style={{fontSize: '1.05rem'}}>{med.name}</h4>
                            <p style={{margin: 0}}>{med.taken ? 'Taken' : 'Pending'}</p>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}><Activity size={18} color="var(--accent-red)" /> Anomalies & History</h3>
                  <div className="task-list" style={{boxShadow: 'none', padding: '16px'}}>
                     {(selectedPatient.history || []).map((h, i) => (
                       <li key={i} style={{marginBottom: '8px', color: 'var(--text-main)'}}>{h}</li>
                     ))}
                     <li style={{color: 'var(--text-muted)'}}>{selectedPatient.pastMedications?.length || 0} resolved past medications.</li>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caretaker Details Modal */}
      {selectedCaretaker && (
        <div className="modal-overlay" onClick={() => setSelectedCaretaker(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                 <div className="patient-avatar" style={{fontSize: '3rem', backgroundColor: 'var(--bg-card-blue)'}}>👩‍⚕️</div>
                 <div>
                   <h2 style={{fontSize: '1.75rem', marginBottom: '4px', fontWeight: 700}}>
                     {selectedCaretaker.name} 
                   </h2>
                   <p style={{color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem'}}>{selectedCaretaker.role}</p>
                 </div>
               </div>
               <button className="close-btn" onClick={() => setSelectedCaretaker(null)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: 'var(--accent-blue)', fontSize: '0.9rem'}}>
                 <MapPin size={16}/> {selectedCaretaker.location?.name || 'Live Location'} 
                 <span style={{padding: '2px 8px', borderRadius: '12px', backgroundColor: '#eef2f5', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600}}>• Contact: {selectedCaretaker.contact}</span>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                <div>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}><FileText size={18} color="var(--accent-purple)" /> Skills & Qualifications</h3>
                  <div className="task-list" style={{boxShadow: 'none', padding: '16px'}}>
                    {(selectedCaretaker.skills || []).map((skill, i) => (
                      <li key={i} style={{marginBottom: '8px', color: 'var(--text-main)'}}>{skill}</li>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}><Clock size={18} color="var(--accent-blue)" /> Experience & Shift</h3>
                  <div style={{backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px'}}>
                     <p style={{marginTop: 0}}><strong>Experience:</strong><br/>{selectedCaretaker.experience}</p>
                     <p style={{marginBottom: 0}}><strong>Shift Timing:</strong><br/>{new Date(selectedCaretaker.shiftStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedCaretaker.shiftEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CaregiverDashboard;
