const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { state, startDataGeneration, generateId } = require('./dataGenerator');

// Override patient locations with real GPS seed coordinates (Cedars-Sinai Medical Center, LA)
// This ensures the correct coords are used regardless of any module cache
const GPS_SEED = [
  { id: 'p1', lat: 34.0754, lng: -118.3811, name: 'Main Lobby' },
  { id: 'p2', lat: 34.0758, lng: -118.3805, name: 'Room 207 (East Wing)' },
  { id: 'p3', lat: 34.0750, lng: -118.3820, name: 'Room 112 (West Wing)' },
];
GPS_SEED.forEach(seed => {
  const p = state.patients.find(p => p.id === seed.id);
  if (p) { p.location = { name: seed.name, lat: seed.lat, lng: seed.lng }; }
});

// Same for caretakers
state.caretakers[0] && (state.caretakers[0].location = { lat: 34.0755, lng: -118.3815 });
state.caretakers[1] && (state.caretakers[1].location = { lat: 34.0760, lng: -118.3810 });

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/api/status', (req, res) => {
  res.json({ status: 'Backend is running correctly.' });
});

// Simple distance calculation
function getDistance(loc1, loc2) {
  const dx = loc1.lat - loc2.lat;
  const dy = loc1.lng - loc2.lng;
  return Math.sqrt(dx*dx + dy*dy);
}

// Emergency Routing Algorithm
function routeEmergency(patientId, severity) {
  const patient = state.patients.find(p => p.id === patientId);
  if (!patient) return null;

  let bestCaretaker = null;
  let highestScore = -Infinity;
  const now = new Date();

  state.caretakers.forEach(caretaker => {
    let score = 100;

    // 1. Proximity
    const dist = getDistance(patient.location, caretaker.location);
    score -= (dist * 100000); // Scale distance impact

    // 2. Skill Match
    const isAdvanced = caretaker.skills.some(s => 
      s.includes('Advanced') || s.includes('Critical') || s.includes('RN') || s.includes('Registered Nurse')
    );
    if (severity === 'high') {
      if (isAdvanced) score += 50;
      else score -= 80; // High penalty for low skill in high severity
    }

    // 3. Task Interruptibility
    const hasNonInterruptible = caretaker.tasks.some(t => !t.completed && !t.interruptible);
    if (hasNonInterruptible) {
      score -= 100; // Critical penalty 
    }

    // 4. Shift Timing (Avoid burnout)
    const shiftEnd = new Date(caretaker.shiftEnd);
    const minsLeft = (shiftEnd - now) / (1000 * 60);
    if (minsLeft < 0) {
      score -= 500; // Shift is over
    } else if (minsLeft < 30) {
      score -= 60; // Shift ending soon
    }

    if (score > highestScore) {
      highestScore = score;
      bestCaretaker = caretaker;
    }
  });

  return bestCaretaker;
}

wss.on('connection', (ws) => {
  console.log('New client connected to WebSocket.');
  ws.caregiverId = null; // Will be set when client registers

  ws.send(JSON.stringify({
    type: 'connection_status',
    payload: { status: 'connected', message: 'Successfully connected to Health Monitoring System' }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WS Message:', data);

      // Client Registration (so we can target alerts to specific caregivers)
      if (data.action === 'register_client') {
        ws.caregiverId = data.caregiverId || null;
        ws.role = data.role || 'patient';
        console.log(`Client registered as ${data.role}: ${data.caregiverId || 'anonymous'}`);
      }
      
      // Medication Management
      if (data.action === 'check_medication') {
        const p = state.patients.find(p => p.id === data.patientId);
        if (p) {
          const m = p.medications.find(m => m.id === data.medId);
          if (m) {
            m.taken = !m.taken;
            if (m.taken) {
              m.takenAt = new Date().toISOString();
              if (!m.history) m.history = [];
              m.history.push(m.takenAt);
            } else {
              m.takenAt = null;
              // We do not remove from history, to keep a log of toggles if desired, or we could.
            }
          }
        }
      }
      
      if (data.action === 'add_medication') {
        const p = state.patients.find(p => p.id === data.patientId);
        if (p) {
          p.medications.push({ id: generateId(), name: data.name, taken: false, takenAt: null, history: [] });
        }
      }

      // Task Management
      if (data.action === 'add_task') {
         const c = state.caretakers.find(c => c.id === data.caretakerId);
         if (c) {
           c.tasks.push({
             id: generateId(),
             text: data.text,
             patientId: data.patientId,
             priority: data.priority,
             interruptible: data.interruptible,
             completed: false
           });
         }
      }

      if (data.action === 'toggle_task') {
        const c = state.caretakers.find(c => c.id === data.caretakerId);
        if (c) {
          const t = c.tasks.find(t => t.id === data.taskId);
          if (t) t.completed = !t.completed;
        }
      }

      // Shift Management
      if (data.action === 'alter_shift') {
         const c = state.caretakers.find(c => c.id === data.caretakerId);
         if (c && data.newEndISO) {
           c.shiftEnd = data.newEndISO;
         }
      }

      // Location Management
      if (data.action === 'update_location') {
        const p = state.patients.find(p => p.id === data.patientId);
        if (p && data.lat && data.lng) {
          p.location.lat = data.lat;
          p.location.lng = data.lng;
          if (data.locationName) p.location.name = data.locationName;
        }
      }

      // Emergency Routing
      if (data.action === 'trigger_emergency') {
        const p = state.patients.find(p => p.id === data.patientId);
        if (p) p.emergencyTriggered = true;

        const assignedCaretaker = routeEmergency(data.patientId, data.severity);
        state.activeEmergency = {
          patientId: data.patientId,
          patientName: p.name,
          severity: data.severity,
          locationName: p.location.name,
          status: {
            hr: p.hr,
            bp: `${p.systolic}/${p.diastolic}`,
            spO2: p.spO2,
            temp: p.temp.toFixed(1)
          },
          assignedCaretakerId: assignedCaretaker ? assignedCaretaker.id : null,
          timestamp: new Date().toISOString()
        };

        // Compute reason for assignment
        const dist = getDistance(state.patients.find(p => p.id === data.patientId)?.location, assignedCaretaker?.location);
        const distMeters = dist ? Math.round(dist * 111000) : 0;
        const alarmPayload = {
          ...state.activeEmergency,
          assignedCaretakerId: assignedCaretaker?.id,
          assignedCaretakerName: assignedCaretaker?.name,
          assignmentReason: [
            `Nearest caregiver (~${distMeters}m away)`,
            assignedCaretaker?.skills?.[0] ? `Has: ${assignedCaretaker.skills[0]}` : null,
          ].filter(Boolean).join(' • ')
        };

        // Broadcast to ALL clients (for dashboard banner)
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'emergency_dispatched',
              payload: state.activeEmergency
            }));
          }
        });

        // Send targeted ALARM to the assigned caregiver's session
        if (assignedCaretaker) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.caregiverId === assignedCaretaker.id) {
              client.send(JSON.stringify({
                type: 'emergency_alarm',
                payload: alarmPayload
              }));
            }
          });
        }
      } // end trigger_emergency

      if (data.action === 'clear_emergency') {
        const p = state.patients.find(p => p.id === data.patientId);
        if (p) p.emergencyTriggered = false;
        state.activeEmergency = null;
      }

      // Force immediate broadcast of state change
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'health_update', payload: state }));
        }
      });

    } catch (e) {
      console.error('Failed to parse client message', e);
    }
  });

  // Send initial state
  ws.send(JSON.stringify({ type: 'health_update', payload: state }));

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket.');
  });
});

startDataGeneration((unifiedState) => {
  const message = JSON.stringify({
    type: 'health_update',
    payload: unifiedState
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
