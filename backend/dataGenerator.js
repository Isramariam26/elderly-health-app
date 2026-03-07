const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generateId = () => Math.random().toString(36).substr(2, 9);

// Set shifts based on current time to ensure realism
const now = new Date();
const morningShiftStart = new Date(now); morningShiftStart.setHours(7, 0, 0, 0);
const morningShiftEnd = new Date(now); morningShiftEnd.setHours(15, 0, 0, 0);

const afternoonShiftStart = new Date(now); afternoonShiftStart.setHours(14, 0, 0, 0); // 2pm
const afternoonShiftEnd = new Date(now); afternoonShiftEnd.setHours(22, 0, 0, 0); // 10pm

const nightShiftStart = new Date(now); nightShiftStart.setHours(21, 0, 0, 0); // 9pm
const nightShiftEnd = new Date(now); nightShiftEnd.setDate(now.getDate() + 1); nightShiftEnd.setHours(7, 0, 0, 0); // 7am

const state = {
  patients: [
    {
      id: 'p1',
      name: 'Arthur Dent',
      location: { name: 'Main Lobby', lat: 34.0754, lng: -118.3811 },
      hr: 75,
      systolic: 120,
      diastolic: 80,
      spO2: 98,
      sleepScore: 85,
      temp: 36.8,
      fallDetected: false,
      emergencyTriggered: false,
      medications: [
        { id: 'm1', name: 'Lisinopril - 10mg', taken: false, takenAt: null, history: [] },
        { id: 'm2', name: 'Atorvastatin - 20mg', taken: true, takenAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), history: [new Date(new Date().setHours(8, 0, 0, 0)).toISOString()] }
      ],
      pastMedications: ['Metformin - 500mg'],
      history: ['Hypertension', 'Mild Cognitive Impairment'],
    },
    {
       id: 'p2',
       name: 'Robert Chen',
       location: { name: 'Room 207 (East Wing)', lat: 34.0758, lng: -118.3805 },
       hr: 87,
       systolic: 145,
       diastolic: 93,
       spO2: 94,
       sleepScore: 72,
       temp: 37.2,
       fallDetected: false,
       emergencyTriggered: false,
       medications: [{ id: 'm3', name: 'Amlodipine - 5mg', taken: false, takenAt: null, history: [] }],
       pastMedications: [],
       history: ['Type 2 Diabetes'],
    },
    {
       id: 'p3',
       name: 'Eleanor Davis',
       location: { name: 'Room 112 (West Wing)', lat: 34.0750, lng: -118.3820 },
       hr: 68,
       systolic: 116,
       diastolic: 75,
       spO2: 98,
       sleepScore: 90,
       temp: 36.6,
       fallDetected: false,
       emergencyTriggered: false,
       medications: [{ id: 'm4', name: 'Levothyroxine - 50mcg', taken: false, takenAt: null, history: [] }],
       pastMedications: ['Ibuprofen'],
       history: ['Arthritis'],
    }
  ],
  caretakers: [
    {
      id: 'CT-001',
      name: 'Anjali Deshmukh',
      role: 'Registered Nurse',
      contact: '9823001122',
      location: { lat: 34.0755, lng: -118.3815 },
      skills: ['B.Sc Nursing', 'Geriatric Care', 'Diabetes & Heart Care'],
      experience: '10 Years experience.',
      shiftStart: morningShiftStart.toISOString(),
      shiftEnd: morningShiftEnd.toISOString(),
      tasks: [
        { id: generateId(), text: 'Monitor blood sugar, BP, insulin, feet, and fluid intake daily.', patientId: 'p1', priority: 'high', interruptible: false, completed: false }
      ]
    },
    {
      id: 'CT-002',
      name: 'Ramakrishna Pillai',
      role: 'GNM Nurse',
      contact: '9823003344',
      location: { lat: 34.0760, lng: -118.3810 },
      skills: ['GNM Nursing', 'Physiotherapy', 'Mobility Care'],
      experience: '15 Years experience.',
      shiftStart: morningShiftStart.toISOString(),
      shiftEnd: morningShiftEnd.toISOString(),
      tasks: [
        { id: generateId(), text: 'Conduct breathing exercises, physiotherapy, prevent falls.', patientId: 'p2', priority: 'normal', interruptible: true, completed: false }
      ]
    },
    {
      id: 'CT-003',
      name: 'Sunita Waghmare',
      role: 'Psychology Caretaker',
      contact: '9823005566',
      location: { lat: 34.0752, lng: -118.3818 },
      skills: ['B.Sc Psychology', 'Dementia Care', 'Memory & Mental Health'],
      experience: '6 Years experience.',
      shiftStart: afternoonShiftStart.toISOString(),
      shiftEnd: afternoonShiftEnd.toISOString(),
      tasks: [
        { id: generateId(), text: 'Run memory routines, prevent wandering, monitor mood.', patientId: 'p3', priority: 'high', interruptible: false, completed: false }
      ]
    },
    {
      id: 'CT-004',
      name: 'Prakash Joshi',
      role: 'ANM Nurse',
      contact: '9823007788',
      location: { lat: 34.0758, lng: -118.3802 },
      skills: ['ANM', 'Kidney & Diabetes Care', 'Chronic Disease Management'],
      experience: '12 Years experience.',
      shiftStart: nightShiftStart.toISOString(),
      shiftEnd: nightShiftEnd.toISOString(),
      tasks: [
        { id: generateId(), text: 'Track urine, fluid, BP, diet, and prepare for dialysis.', patientId: 'p1', priority: 'high', interruptible: false, completed: false }
      ]
    },
    {
      id: 'CT-005',
      name: 'Kavitha Nair',
      role: 'Registered Nurse',
      contact: '9823009900',
      location: { lat: 34.0762, lng: -118.3814 },
      skills: ['B.Sc Nursing', 'Thyroid & Hormonal Care', 'General & Preventive Care'],
      experience: '8 Years experience.',
      shiftStart: afternoonShiftStart.toISOString(),
      shiftEnd: afternoonShiftEnd.toISOString(),
      tasks: [
        { id: generateId(), text: 'Manage thyroid medication, TSH tests, nutrition charts.', patientId: 'p2', priority: 'normal', interruptible: true, completed: true }
      ]
    }
  ],
  activeEmergency: null // Stores the current routed emergency details
};

// Simulate gradual changes in health metrics and subtle movement
const tick = () => {
  // Move caretakers slightly (random walk)
  state.caretakers.forEach(c => {
    c.location.lat += (Math.random() - 0.5) * 0.0001; // ~10 meters
    c.location.lng += (Math.random() - 0.5) * 0.0001;
  });

  // Fluctuate patient vitals
  state.patients.forEach(p => {
    p.hr = Math.max(50, Math.min(150, p.hr + randomInt(-2, 2)));
    p.systolic = Math.max(90, Math.min(180, p.systolic + randomInt(-2, 2)));
    p.diastolic = Math.max(60, Math.min(110, p.diastolic + randomInt(-1, 1)));
    p.spO2 = Math.max(85, Math.min(100, p.spO2 + randomInt(-1, 1)));
    p.sleepScore = Math.max(0, Math.min(100, p.sleepScore + randomInt(-1, 1)));
    p.temp = Math.max(36.1, Math.min(37.5, p.temp + (Math.random() - 0.5) * 0.2));
  });
};

const startDataGeneration = (onDataUpdate) => {
  setInterval(() => {
    tick();
    onDataUpdate(state);
  }, 2000);
};

module.exports = {
  state,
  startDataGeneration,
  generateId
};
