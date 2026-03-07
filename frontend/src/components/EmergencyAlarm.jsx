import React, { useEffect, useState } from 'react';

// ─── MODULE-LEVEL SINGLETON ALARM ─────────────────────────────────────────────
// Only ONE alarm can play at a time. Any call to stopAlarm() kills it instantly.
let _alarmCtx = null;
let _alarmStopped = true;
let _alarmTimeoutId = null;

const stopAlarm = () => {
  _alarmStopped = true;
  if (_alarmTimeoutId !== null) {
    clearTimeout(_alarmTimeoutId);
    _alarmTimeoutId = null;
  }
  if (_alarmCtx) {
    try { _alarmCtx.close(); } catch (_) {}
    _alarmCtx = null;
  }
};

const startAlarm = () => {
  // Kill any existing alarm first — guaranteed clean slate
  stopAlarm();

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  _alarmCtx = new AudioCtx();
  _alarmStopped = false;
  let iter = 0;

  const beep = () => {
    if (_alarmStopped || !_alarmCtx) return;

    const gain = _alarmCtx.createGain();
    gain.gain.setValueAtTime(0.8, _alarmCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, _alarmCtx.currentTime + 0.22);
    gain.connect(_alarmCtx.destination);

    const osc = _alarmCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(iter % 2 === 0 ? 960 : 720, _alarmCtx.currentTime);
    osc.connect(gain);
    osc.start(_alarmCtx.currentTime);
    osc.stop(_alarmCtx.currentTime + 0.25);
    iter++;

    _alarmTimeoutId = setTimeout(beep, 340);
  };

  if (_alarmCtx.state === 'suspended') {
    _alarmCtx.resume().then(beep);
  } else {
    beep();
  }

  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
};

// ─── Component ────────────────────────────────────────────────────────────────
const EmergencyAlarm = ({ alarm, onDismiss, sendCommand }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!alarm) return;

    startAlarm();

    const timer = setInterval(() => setElapsed(s => s + 1), 1000);

    // Cleanup: stop alarm if component unmounts without dismiss
    return () => {
      stopAlarm();
      clearInterval(timer);
    };
  }, [alarm?.patientId]);

  const handleDismiss = () => {
    // Stop alarm immediately — no exceptions
    stopAlarm();
    // Clear server-side emergency so all banners disappear
    if (sendCommand && alarm?.patientId) {
      sendCommand({ action: 'clear_emergency', patientId: alarm.patientId });
    }
    onDismiss();
  };

  if (!alarm) return null;

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s ago` : `${sec}s ago`;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
      animation: 'alarmPulse 1s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes alarmPulse {
          0%, 100% { background-color: rgba(0,0,0,0.88); }
          50% { background-color: rgba(180,0,0,0.88); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, #1a0000 0%, #3d0000 100%)',
        border: '3px solid #ef4444',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '520px',
        width: '90%',
        boxShadow: '0 0 60px rgba(239,68,68,0.6), 0 0 120px rgba(239,68,68,0.3)',
        animation: 'shake 0.5s ease-in-out 0.3s 2',
        color: 'white',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '4rem', lineHeight: 1 }}>🚨</div>
          <div style={{
            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '4px',
            color: '#ef4444', textTransform: 'uppercase', marginTop: '8px'
          }}>EMERGENCY — DISPATCHED TO YOU</div>
        </div>

        {/* Patient */}
        <h1 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', margin: '0 0 4px 0' }}>
          {alarm.patientName}
        </h1>
        <p style={{ textAlign: 'center', color: '#fca5a5', margin: '0 0 24px 0' }}>
          📍 {alarm.locationName}
        </p>

        {/* Vitals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Heart Rate',     value: `${alarm.status?.hr || '--'} BPM`, icon: '💓' },
            { label: 'Blood Pressure', value: alarm.status?.bp || '--',           icon: '🩸' },
            { label: 'SpO₂',           value: `${alarm.status?.spO2 || '--'}%`,   icon: '🫁' },
            { label: 'Temperature',    value: `${alarm.status?.temp || '--'}°C`,  icon: '🌡️' },
          ].map(v => (
            <div key={v.label} style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '12px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem' }}>{v.icon}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{v.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '2px' }}>{v.label}</div>
            </div>
          ))}
        </div>

        {/* Why you */}
        {alarm.assignmentReason && (
          <div style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
            padding: '14px', marginBottom: '20px', fontSize: '0.88rem',
            color: '#fde68a', textAlign: 'center'
          }}>
            <strong>Why you?</strong><br />{alarm.assignmentReason}
          </div>
        )}

        {/* Elapsed */}
        <div style={{ textAlign: 'center', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '20px' }}>
          Alert triggered {formatElapsed(elapsed)}
        </div>

        {/* THE BUTTON */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '20px',
            background: '#16a34a',
            color: 'white', border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '14px', fontSize: '1.15rem', fontWeight: 800,
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}
        >
          ✅ Acknowledged and Cleared — Stop Alarm
        </button>
      </div>
    </div>
  );
};

export default EmergencyAlarm;
