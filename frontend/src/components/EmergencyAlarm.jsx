import React, { useEffect, useRef, useState } from 'react';

// ─── Module-level AudioContext (persists across renders) ──────────────────────
// We create and warm it up on the FIRST user gesture anywhere, so it's
// already in 'running' state by the time a WebSocket alarm arrives.
let _audioCtx = null;

const getAudioCtx = () => {
  if (!_audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    _audioCtx = new AudioCtx();
  }
  return _audioCtx;
};

// Call this once on any user gesture to unlock audio
const unlockAudio = () => {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      // Play a silent buffer to truly unlock on some browsers
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    });
  }
};

// Attach unlock to the first click/keydown globally
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

// ─── Alarm oscillator loop ────────────────────────────────────────────────────
const startAlarm = () => {
  const ctx = getAudioCtx();
  if (!ctx) return () => {};

  let running = true;
  let iter = 0;

  const scheduleBeep = () => {
    if (!running) return;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    // Alternate between two tones like a siren
    osc.frequency.setValueAtTime(iter % 2 === 0 ? 960 : 720, ctx.currentTime);
    osc.connect(gainNode);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);

    iter++;
    setTimeout(scheduleBeep, 340);
  };

  // If AudioContext was already suspended (should be unlocked by now), resume first
  if (ctx.state === 'suspended') {
    ctx.resume().then(scheduleBeep);
  } else {
    scheduleBeep();
  }

  return () => { running = false; };
};

// ─── Component ────────────────────────────────────────────────────────────────
const EmergencyAlarm = ({ alarm, onDismiss, sendCommand }) => {
  const stopAlarmRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    if (!alarm) return;

    // Vibrate device (mobile)
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Start alarm
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') setAudioBlocked(true);
    stopAlarmRef.current = startAlarm();

    // Elapsed timer
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);

    return () => {
      if (stopAlarmRef.current) stopAlarmRef.current();
      clearInterval(timer);
    };
  }, [alarm?.patientId]);

  const handleDismiss = () => {
    if (stopAlarmRef.current) stopAlarmRef.current();
    // Also clear the emergency on the server so patient banner and all caretaker banners clear
    if (sendCommand && alarm?.patientId) {
      sendCommand({ action: 'clear_emergency', patientId: alarm.patientId });
    }
    onDismiss();
  };

  const handleEnableSound = () => {
    unlockAudio();
    setAudioBlocked(false);
    stopAlarmRef.current = startAlarm();
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
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
      animation: 'alarmPulse 1s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes alarmPulse {
          0%, 100% { background-color: rgba(0,0,0,0.85); }
          50% { background-color: rgba(180,0,0,0.85); }
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

        {/* Sound blocked banner */}
        {audioBlocked && (
          <button
            onClick={handleEnableSound}
            style={{
              display: 'block', width: '100%', marginBottom: '16px',
              padding: '12px', background: '#f59e0b', color: 'black',
              border: 'none', borderRadius: '10px', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            🔇 Browser blocked sound — Tap here to enable alarm audio
          </button>
        )}

        {/* Vitals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Heart Rate',       value: `${alarm.status?.hr || '--'} BPM`, icon: '💓' },
            { label: 'Blood Pressure',   value: alarm.status?.bp || '--',           icon: '🩸' },
            { label: 'SpO₂',             value: `${alarm.status?.spO2 || '--'}%`,   icon: '🫁' },
            { label: 'Temperature',      value: `${alarm.status?.temp || '--'}°C`,  icon: '🌡️' },
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1, padding: '18px', background: '#ef4444',
              color: 'white', border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '12px', fontSize: '1.05rem', fontWeight: 800,
              cursor: 'pointer', letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
          >
            ✅ Acknowledged and Cleared
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlarm;
