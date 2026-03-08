// Auto-generated mock data fallback for when the backend is unreachable (e.g. on GitHub Pages)
const generateId = () => Math.random().toString(36).substr(2, 9);
const now = new Date();
const morningShiftStart = new Date(now); morningShiftStart.setHours(7, 0, 0, 0);
const morningShiftEnd = new Date(now); morningShiftEnd.setHours(15, 0, 0, 0);
const afternoonShiftStart = new Date(now); afternoonShiftStart.setHours(14, 0, 0, 0);
const afternoonShiftEnd = new Date(now); afternoonShiftEnd.setHours(22, 0, 0, 0);
const nightShiftStart = new Date(now); nightShiftStart.setHours(21, 0, 0, 0);
const nightShiftEnd = new Date(now); nightShiftEnd.setDate(now.getDate() + 1); nightShiftEnd.setHours(7, 0, 0, 0);

export const fallbackData = {
  patients: [
    {
      id: 'GF-001', name: 'Ramesh Patil', age: 76, condition: 'Type 2 Diabetes',
      location: { name: 'Room 101', lat: 34.0754, lng: -118.3811 },
      hr: 72, systolic: 125, diastolic: 82, spO2: 97, sleepScore: 78, temp: 36.7,
      history: ['Diagnosed 2008', 'Retired farmer'],
      medications: [{ id: 'm1', name: 'Metformin 500mg', taken: false }, { id: 'm2', name: 'Glipizide 5mg', taken: true }]
    },
    {
      id: 'GF-002', name: 'Savitribai Shin', age: 72, condition: 'Hypertension',
      location: { name: 'Room 102', lat: 34.0758, lng: -118.3805 },
      hr: 80, systolic: 155, diastolic: 95, spO2: 96, sleepScore: 65, temp: 36.9,
      history: ['High BP since 2010', 'Retired school cook'],
      medications: [{ id: 'm4', name: 'Amlodipine 5mg', taken: false }]
    },
    {
      id: 'GF-003', name: 'Gopal Rao', age: 80, condition: 'Heart Disease (Weak Heart)',
      location: { name: 'Room 103', lat: 34.0750, lng: -118.3820 },
      hr: 88, systolic: 110, diastolic: 70, spO2: 93, sleepScore: 55, temp: 36.5,
      history: ['Heart attack 2019', 'Pacemaker 2022'],
      medications: [{ id: 'm7', name: 'Furosemide 40mg', taken: true }]
    },
    {
      id: 'GF-004', name: 'Kausalya Menon', age: 68, condition: 'Underactive Thyroid',
      location: { name: 'Room 104', lat: 34.0762, lng: -118.3812 },
      hr: 65, systolic: 118, diastolic: 78, spO2: 98, sleepScore: 82, temp: 36.2,
      history: ['Hypothyroidism 2014', 'Retired tailor'],
      medications: [{ id: 'm11', name: 'Levothyroxine 75mcg', taken: true }]
    },
    {
      id: 'GF-005', name: 'Vitthal Kulkarni', age: 84, condition: 'Asthma & Breathing Difficulty',
      location: { name: 'Room 105', lat: 34.0755, lng: -118.3825 },
      hr: 92, systolic: 135, diastolic: 85, spO2: 90, sleepScore: 60, temp: 37.1,
      history: ['Asthma since childhood', 'Retired weaver'],
      medications: [{ id: 'm14', name: 'Budesonide Inhaler', taken: true }]
    },
    {
      id: 'GF-006', name: 'Saroja Naidu', age: 73, condition: 'Arthritis (Knee Pain)',
      location: { name: 'Room 106', lat: 34.0748, lng: -118.3815 },
      hr: 74, systolic: 128, diastolic: 84, spO2: 98, sleepScore: 70, temp: 36.6,
      history: ['Osteoarthritis 2016', 'Homemaker'],
      medications: [{ id: 'm17', name: 'Paracetamol 500mg', taken: false }]
    },
    {
      id: 'GF-007', name: 'Balkrishna Iyer', age: 79, condition: 'Diabetes + Hypertension',
      location: { name: 'Room 107', lat: 34.0765, lng: -118.3820 },
      hr: 85, systolic: 170, diastolic: 100, spO2: 92, sleepScore: 50, temp: 36.8,
      history: ['Diabetes 2001', 'Retired teacher'],
      medications: [{ id: 'm21', name: 'Metformin 1000mg', taken: false }]
    },
    {
      id: 'GF-008', name: 'Meenakshi Desai', age: 71, condition: 'Early Dementia',
      location: { name: 'Room 108', lat: 34.0752, lng: -118.3830 },
      hr: 70, systolic: 120, diastolic: 80, spO2: 99, sleepScore: 75, temp: 36.7,
      history: ['Alzheimers 2022', 'Retired bank teller'],
      medications: [{ id: 'm25', name: 'Donepezil 5mg', taken: true }]
    },
    {
      id: 'GF-009', name: 'Shriram Joshi', age: 82, condition: 'Chronic Kidney Disease',
      location: { name: 'Room 109', lat: 34.0768, lng: -118.3808 },
      hr: 78, systolic: 140, diastolic: 90, spO2: 94, sleepScore: 68, temp: 36.9,
      history: ['Kidney weakness 2018', 'Retired postman'],
      medications: [{ id: 'm28', name: 'Furosemide 40mg', taken: true }]
    },
    {
      id: 'GF-010', name: 'Laxmibai Pawar', age: 67, condition: 'Clinical Depression',
      location: { name: 'Room 110', lat: 34.0745, lng: -118.3810 },
      hr: 72, systolic: 122, diastolic: 82, spO2: 98, sleepScore: 85, temp: 36.6,
      history: ['Lost family 2021', 'Retired nurse'],
      medications: [{ id: 'm31', name: 'Sertraline 50mg', taken: true }]
    }
  ],
  caretakers: [
    {
      id: 'CT-001', name: 'Anjali Deshmukh', role: 'Registered Nurse', contact: '9823001122',
      location: { lat: 34.0755, lng: -118.3815 }, skills: ['B.Sc Nursing', 'Geriatric Care'], experience: '10 Years experience.',
      shiftStart: morningShiftStart.toISOString(), shiftEnd: morningShiftEnd.toISOString(),
      tasks: [{ id: generateId(), text: 'Monitor blood sugar, BP, insulin, feet.', patientId: 'GF-001', priority: 'high', interruptible: false, completed: false }]
    },
    {
      id: 'CT-002', name: 'Ramakrishna Pillai', role: 'GNM Nurse', contact: '9823003344',
      location: { lat: 34.0760, lng: -118.3810 }, skills: ['GNM Nursing', 'Physiotherapy'], experience: '15 Years experience.',
      shiftStart: morningShiftStart.toISOString(), shiftEnd: morningShiftEnd.toISOString(),
      tasks: [{ id: generateId(), text: 'Conduct breathing exercises.', patientId: 'GF-002', priority: 'normal', interruptible: true, completed: false }]
    },
    {
      id: 'CT-003', name: 'Sunita Waghmare', role: 'Psychology Caretaker', contact: '9823005566',
      location: { lat: 34.0752, lng: -118.3818 }, skills: ['B.Sc Psychology', 'Dementia Care'], experience: '6 Years experience.',
      shiftStart: afternoonShiftStart.toISOString(), shiftEnd: afternoonShiftEnd.toISOString(),
      tasks: [{ id: generateId(), text: 'Run memory routines.', patientId: 'GF-003', priority: 'high', interruptible: false, completed: false }]
    },
    {
      id: 'CT-004', name: 'Prakash Joshi', role: 'ANM Nurse', contact: '9823007788',
      location: { lat: 34.0758, lng: -118.3802 }, skills: ['ANM', 'Kidney & Diabetes Care'], experience: '12 Years experience.',
      shiftStart: nightShiftStart.toISOString(), shiftEnd: nightShiftEnd.toISOString(),
      tasks: [{ id: generateId(), text: 'Track urine, fluid, BP.', patientId: 'GF-001', priority: 'high', interruptible: false, completed: false }]
    },
    {
      id: 'CT-005', name: 'Kavitha Nair', role: 'Registered Nurse', contact: '9823009900',
      location: { lat: 34.0762, lng: -118.3814 }, skills: ['B.Sc Nursing', 'Thyroid Care'], experience: '8 Years experience.',
      shiftStart: afternoonShiftStart.toISOString(), shiftEnd: afternoonShiftEnd.toISOString(),
      tasks: [{ id: generateId(), text: 'Manage thyroid medication.', patientId: 'GF-002', priority: 'normal', interruptible: true, completed: true }]
    }
  ],
  activeEmergency: null
};
