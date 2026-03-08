import React, { useEffect, useState } from 'react';
import { getAudioCtx } from '../utils/audioService';

// ─── MODULE-LEVEL CONTROL ─────────────────────────────────────────────────────
let _alarmStopped = true;
let _alarmTimeoutId = null;
let _alarmIter = 0;

const stopAlarm = () => {
  _alarmStopped = true;
  if (_alarmTimeoutId !== null) {
    clearTimeout(_alarmTimeoutId);
    _alarmTimeoutId = null;
  }
};

const playBeep = (ctx) => {
  if (!ctx || ctx.state !== 'running') return;
  const duration = 0.4;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(_alarmIter % 2 === 0 ? 1000 : 700, ctx.currentTime);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
  _alarmIter++;
};

const scheduleNext = () => {
  _alarmTimeoutId = setTimeout(() => {
    if (_alarmStopped) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      // Try to resume, then play once resumed
      ctx.resume().then(() => {
        playBeep(ctx);
        scheduleNext();
      }).catch(() => scheduleNext());
    } else {
      playBeep(ctx);
      scheduleNext();
    }
  }, 450);
};

const startAlarm = () => {
  if (!_alarmStopped) return; // already running
  _alarmStopped = false;
  _alarmIter = 0;

  const ctx = getAudioCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    // Resume first, then start the loop
    ctx.resume().then(() => {
      playBeep(ctx);
      scheduleNext();
    }).catch(() => scheduleNext()); // still schedule even if resume fails (user may click later)
  } else {
    playBeep(ctx);
    scheduleNext();
  }

  // Register unlock on any interaction anywhere on the page
  const unlock = () => {
    const c = getAudioCtx();
    if (c && c.state === 'suspended') c.resume();
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
};

// ─── Component ────────────────────────────────────────────────────────────────
const EmergencyAlarm = ({ alarm, onDismiss, sendCommand }) => {
  const [elapsed, setElapsed] = useState(0);
  const [audioState, setAudioState] = useState('unknown');

  useEffect(() => {
    if (!alarm) return;
    startAlarm();

    const checkAudio = setInterval(() => {
      const ctx = getAudioCtx();
      setAudioState(ctx ? ctx.state : 'unsupported');
    }, 500);

    const timer = setInterval(() => setElapsed(s => s + 1), 1000);

    return () => {
      stopAlarm();
      clearInterval(timer);
      clearInterval(checkAudio);
    };
  }, [alarm?.patientId]);

  const handleDismiss = () => {
    stopAlarm();
    if (sendCommand && alarm?.patientId) {
      sendCommand({ action: 'clear_emergency', patientId: alarm.patientId });
    }
    onDismiss();
  };

  // Called when user clicks the muted-sound pill — activates audio via user gesture
  const unlockAudioManually = async () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        setAudioState('running');
        // Restart the beep loop now that context is running
        stopAlarm();
        startAlarm();
      } catch (e) {
        console.error('Manual resume failed:', e);
      }
    } else if (_alarmStopped) {
      startAlarm();
    }
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
          0%, 100% { background-color: rgba(0,0,0,0.9); }
          50% { background-color: rgba(150,0,0,0.9); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>

      <div style={{
        background: '#1a0000',
        border: '4px solid #ef4444',
        borderRadius: '28px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 0 50px rgba(239,68,68,0.5)',
        animation: 'shake 0.8s cubic-bezier(.36,.07,.19,.97) both',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🚨</div>
        <div style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '3px', marginBottom: '20px' }}>
          CRITICAL EMERGENCY
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0' }}>{alarm.patientName}</h1>
        <p style={{ color: '#fca5a5', fontSize: '1.1rem', marginBottom: '24px' }}>📍 {alarm.locationName}</p>

        {/* Audio Status — click to unmute */}
        <div
          onClick={unlockAudioManually}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem',
            background: audioState === 'running' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
            border: `1px solid ${audioState === 'running' ? '#22c55e' : '#eab308'}`,
            color: audioState === 'running' ? '#4ade80' : '#fde047',
            marginBottom: '30px', cursor: 'pointer', userSelect: 'none'
          }}>
          {audioState === 'running' ? '🔊 Alarm is ringing' : '🔇 Browser blocked sound — Tap here to activate'}
        </div>

        {/* Vitals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Heart Rate', value: `${alarm.status?.hr || '--'}`, unit: 'BPM' },
            { label: 'SpO2', value: `${alarm.status?.spO2 || '--'}`, unit: '%' },
          ].map(v => (
            <div key={v.label} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{v.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>{v.label} ({v.unit})</div>
            </div>
          ))}
        </div>

        {/* Smart Routing Assignment Result */}
        {alarm.assignedCaretakerName && (
          <div style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#93c5fd' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Auto-Routed</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
              {alarm.assignedCaretakerName}
            </div>
            {alarm.assignmentReason && (
              <div style={{ fontSize: '0.85rem', color: '#bfdbfe', lineHeight: 1.4 }}>
                {alarm.assignmentReason}
              </div>
            )}
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '22px',
            background: '#ef4444', color: 'white',
            border: 'none', borderRadius: '16px',
            fontSize: '1.2rem', fontWeight: 800,
            cursor: 'pointer', transition: 'transform 0.2s',
            boxShadow: '0 8px 20px rgba(239,68,68,0.4)'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          ACKNOWLEDGE &amp; CLEAR
        </button>

        <div style={{ marginTop: '20px', color: '#fca5a5', fontSize: '0.8rem' }}>
          Alert triggered {formatElapsed(elapsed)}
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlarm;
