require("dotenv").config();


const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============== IN-MEMORY DATA STORAGE ==============

// Users storage
let drivers = [];
let hospitals = [];

// Patient submissions
let patientSubmissions = [];

// Request system
let requests = [];

// Notifications for drivers
let driverNotifications = [];

// Mock Hospital Data
let hospitalData = [
    {
        id: 1,
        name: "City General Hospital",
        distance: 2.5,
        availableBeds: 45,
        icu: true,
        ventilator: true,
        oxygenCylinders: 30,
        specialization: ["cardiac", "trauma", "general"],
        doctors: [
            { name: "Dr. Sarah Johnson", specialization: "Cardiologist", phone: "+1-555-0101" },
            { name: "Dr. Mike Chen", specialization: "Trauma Surgeon", phone: "+1-555-0102" },
            { name: "Dr. Emily Davis", specialization: "Emergency Medicine", phone: "+1-555-0103" }
        ],
        location: { lat: 28.6139, lng: 77.2090 }
    },
    {
        id: 2,
        name: "Metro Heart Institute",
        distance: 4.2,
        availableBeds: 30,
        icu: true,
        ventilator: true,
        oxygenCylinders: 25,
        specialization: ["cardiac", "neurology"],
        doctors: [
            { name: "Dr. Robert Wilson", specialization: "Cardiologist", phone: "+1-555-0201" },
            { name: "Dr. Lisa Park", specialization: "Neurologist", phone: "+1-555-0202" }
        ],
        location: { lat: 28.6229, lng: 77.2195 }
    },
    {
        id: 3,
        name: "Community Care Hospital",
        distance: 1.8,
        availableBeds: 60,
        icu: false,
        ventilator: false,
        oxygenCylinders: 40,
        specialization: ["general", "pediatrics", "obstetrics"],
        doctors: [
            { name: "Dr. James Brown", specialization: "General Physician", phone: "+1-555-0301" },
            { name: "Dr. Maria Garcia", specialization: "Obstetrician", phone: "+1-555-0302" },
            { name: "Dr. Kevin Lee", specialization: "Pediatrician", phone: "+1-555-0303" }
        ],
        location: { lat: 28.6089, lng: 77.2010 }
    },
    {
        id: 4,
        name: "Trauma & Emergency Center",
        distance: 3.1,
        availableBeds: 25,
        icu: true,
        ventilator: true,
        oxygenCylinders: 35,
        specialization: ["trauma", "orthopedics", "burns"],
        doctors: [
            { name: "Dr. Amanda White", specialization: "Trauma Surgeon", phone: "+1-555-0401" },
            { name: "Dr. David Kim", specialization: "Orthopedic Surgeon", phone: "+1-555-0402" }
        ],
        location: { lat: 28.6200, lng: 77.2150 }
    },
    {
        id: 5,
        name: "LifeCare Multi-Specialty",
        distance: 5.5,
        availableBeds: 80,
        icu: true,
        ventilator: true,
        oxygenCylinders: 50,
        specialization: ["cardiac", "neurology", "trauma", "general", "toxicology"],
        doctors: [
            { name: "Dr. Jennifer Adams", specialization: "Cardiologist", phone: "+1-555-0501" },
            { name: "Dr. Thomas Moore", specialization: "Neurologist", phone: "+1-555-0502" },
            { name: "Dr. Rachel Green", specialization: "Toxicologist", phone: "+1-555-0503" },
            { name: "Dr. Chris Evans", specialization: "General Surgeon", phone: "+1-555-0504" }
        ],
        location: { lat: 28.6300, lng: 77.2250 }
    }
];

// First Aid Data
const firstAidGuide = {
    "cardiac_arrest": {
        title: "Cardiac Arrest",
        steps: [
            "Call emergency services immediately",
            "Check if the person is responsive - tap shoulders and ask loudly",
            "If unresponsive, begin CPR: Place heel of hand on center of chest",
            "Push hard and fast - 100-120 compressions per minute",
            "After 30 compressions, give 2 rescue breaths",
            "Continue until help arrives or person shows signs of life",
            "If AED is available, follow its voice instructions"
        ]
    },
    "pregnancy": {
        title: "Pregnancy Emergency",
        steps: [
            "Keep the mother calm and comfortable",
            "Have her lie on her left side to improve blood flow",
            "If water breaks, note the time and fluid color",
            "Time contractions - note duration and intervals",
            "Do NOT give food or water if delivery seems imminent",
            "Keep the area clean and prepare clean towels",
            "If delivery begins, support the baby's head gently"
        ]
    },
    "accident": {
        title: "Accident/Trauma",
        steps: [
            "Ensure scene safety before approaching",
            "Do not move the victim unless absolutely necessary",
            "Control bleeding by applying direct pressure with clean cloth",
            "If spinal injury suspected, keep head and neck still",
            "Cover wounds with sterile bandages",
            "Keep the victim warm with blankets",
            "Monitor breathing and consciousness continuously"
        ]
    },
    "paralysis_stroke": {
        title: "Paralysis/Stroke",
        steps: [
            "Use FAST: Face drooping, Arm weakness, Speech difficulty, Time to call",
            "Note the exact time symptoms started",
            "Do NOT give food, water, or medication",
            "Keep the person lying with head slightly elevated",
            "Loosen any tight clothing",
            "If vomiting occurs, turn head to side",
            "Stay with them and keep them calm until help arrives"
        ]
    },
    "fever": {
        title: "High Fever",
        steps: [
            "Remove excess clothing and blankets",
            "Apply cool, damp cloths to forehead and wrists",
            "Give plenty of fluids to prevent dehydration",
            "Administer fever-reducing medication if appropriate",
            "Keep room temperature comfortable",
            "Monitor temperature every 30 minutes",
            "Seek emergency care if fever exceeds 104°F (40°C)"
        ]
    },
    "snake_bite": {
        title: "Snake Bite",
        steps: [
            "Keep the victim calm and still - movement spreads venom",
            "Remove any jewelry near the bite site",
            "Keep bitten area below heart level",
            "Do NOT cut the wound or try to suck out venom",
            "Do NOT apply ice or tourniquet",
            "Mark the edge of swelling with pen and time",
            "Try to remember snake's appearance for identification"
        ]
    },
    "difficulty_breathing": {
        title: "Difficulty Breathing",
        steps: [
            "Help person sit upright - do not lay them down",
            "Loosen any tight clothing around chest and neck",
            "If they have prescribed inhaler, help them use it",
            "Open windows for fresh air",
            "Stay calm and encourage slow, deep breaths",
            "If choking, perform Heimlich maneuver",
            "Begin CPR if breathing stops completely"
        ]
    },
    "abdominal_pain": {
        title: "Severe Abdominal Pain",
        steps: [
            "Have person lie in comfortable position",
            "Do NOT give food, water, or pain medication",
            "Apply gentle heat if it provides comfort",
            "Do NOT press hard on the abdomen",
            "Note when pain started and its characteristics",
            "Watch for signs of shock (pale, sweaty, rapid pulse)",
            "Keep them warm and monitor vital signs"
        ]
    },
    "loss_of_consciousness": {
        title: "Loss of Consciousness",
        steps: [
            "Check for responsiveness - tap and call loudly",
            "Call emergency services immediately",
            "Check for breathing - look, listen, feel",
            "If breathing, place in recovery position (on side)",
            "If not breathing, begin CPR immediately",
            "Do NOT put anything in their mouth",
            "Monitor and be ready to start CPR if breathing stops"
        ]
    },
    "allergic_reaction": {
        title: "Severe Allergic Reaction",
        steps: [
            "If person has EpiPen, help them use it immediately",
            "Call emergency services - anaphylaxis can be fatal",
            "Have person lie down with legs elevated",
            "If difficulty breathing, let them sit up",
            "Loosen tight clothing",
            "Monitor airway - be prepared for CPR",
            "A second dose of epinephrine may be needed after 5-15 mins"
        ]
    }
};

// Chatbot responses
const chatbotResponses = {
    greetings: ["hello", "hi", "hey", "good morning", "good evening"],
    greetingResponse: "Hello! I'm your emergency first-aid assistant. How can I help you today? You can ask about any emergency situation or first-aid procedures.",
    
    keywords: {
        "chest pain": "For chest pain: 1) Have the person sit or lie down comfortably. 2) Loosen tight clothing. 3) If they have prescribed nitroglycerin, help them take it. 4) Chew an aspirin if not allergic. 5) Call emergency services immediately if pain persists.",
        "bleeding": "For bleeding: 1) Apply direct pressure with a clean cloth. 2) Keep pressure for at least 10 minutes. 3) If blood soaks through, add more layers without removing first cloth. 4) Elevate the wound above heart level if possible. 5) Apply a bandage once bleeding slows.",
        "burn": "For burns: 1) Cool the burn under cool (not cold) running water for 10-20 minutes. 2) Remove jewelry/tight items near the burn. 3) Cover with sterile, non-stick bandage. 4) Do NOT apply ice, butter, or ointments. 5) Seek medical help for severe burns.",
        "choking": "For choking: 1) Ask 'Are you choking?' If they can't speak, act fast. 2) Stand behind them, make a fist above their navel. 3) Give quick upward thrusts (Heimlich maneuver). 4) Repeat until object is expelled. 5) If unconscious, begin CPR.",
        "fracture": "For suspected fracture: 1) Do NOT try to straighten the limb. 2) Immobilize the area as-is using splints. 3) Apply ice wrapped in cloth to reduce swelling. 4) Keep the person still and calm. 5) Seek immediate medical attention.",
        "seizure": "During a seizure: 1) Clear the area of dangerous objects. 2) Do NOT restrain the person or put anything in their mouth. 3) Cushion their head with something soft. 4) Time the seizure. 5) After seizure stops, place in recovery position. 6) Call for help if seizure lasts more than 5 minutes.",
        "heart attack": "For heart attack: 1) Call emergency services immediately. 2) Have the person sit or lie down. 3) Give aspirin if not allergic (chew, don't swallow). 4) Loosen tight clothing. 5) Be prepared to perform CPR if they become unresponsive.",
        "cpr": "CPR steps: 1) Check responsiveness. 2) Call for help. 3) Place person on firm surface. 4) Put heel of hand on center of chest. 5) Push hard and fast - 2 inches deep, 100-120/min. 6) After 30 compressions, give 2 breaths. 7) Continue until help arrives.",
        "poison": "For poisoning: 1) Call poison control immediately. 2) Do NOT induce vomiting unless instructed. 3) If on skin, remove contaminated clothing and rinse. 4) If in eyes, rinse with water for 15-20 minutes. 5) Save the poison container for identification.",
        "drowning": "For drowning: 1) Get the person out of water safely. 2) Check for breathing. 3) If not breathing, start CPR immediately. 4) If breathing, place in recovery position. 5) Keep them warm. 6) Seek medical attention even if they seem fine.",
        "heat stroke": "For heat stroke: 1) Move to cool, shaded area. 2) Remove excess clothing. 3) Cool rapidly with cold water or ice packs on neck, armpits, groin. 4) Fan them. 5) Give cool water if conscious. 6) This is a medical emergency - call for help immediately."
    },
    
    defaultResponse: "I understand you need help. For specific first-aid guidance, please tell me about the emergency situation (e.g., 'chest pain', 'bleeding', 'choking', 'burn', 'fracture'). For immediate emergencies, always call your local emergency number first."
};

// ============== HELPER FUNCTIONS ==============

// Triage Assessment
function assessTriage(patientData) {
    const { heartRate, bloodPressure, oxygenLevel, consciousness, severity, emergencyType, temperature, age } = patientData;
    
    // Parse blood pressure
    const systolic = parseInt(bloodPressure.split('/')[0]);
    
    // Critical conditions
    const criticalConditions = [
        oxygenLevel < 90,
        heartRate > 120 || heartRate < 40,
        consciousness === 'unconscious',
        emergencyType === 'cardiac_arrest',
        emergencyType === 'paralysis_stroke',
        systolic > 180 || systolic < 90,
        temperature > 104 || temperature < 95,
        severity === 'high'
    ];
    
    const criticalCount = criticalConditions.filter(Boolean).length;
    
    if (criticalCount >= 2 || emergencyType === 'cardiac_arrest' || consciousness === 'unconscious') {
        return 'CRITICAL';
    } else if (criticalCount === 1 || severity === 'medium') {
        return 'MODERATE';
    }
    return 'LOW';
}

// Get required specialist based on emergency type
function getRequiredSpecialist(emergencyType) {
    const specialistMap = {
        'cardiac_arrest': { specialist: 'Cardiologist', specialization: 'cardiac' },
        'pregnancy': { specialist: 'Obstetrician', specialization: 'obstetrics' },
        'accident': { specialist: 'Trauma Surgeon', specialization: 'trauma' },
        'paralysis_stroke': { specialist: 'Neurologist', specialization: 'neurology' },
        'fever': { specialist: 'General Physician', specialization: 'general' },
        'snake_bite': { specialist: 'Toxicologist', specialization: 'toxicology' },
        'difficulty_breathing': { specialist: 'Pulmonologist', specialization: 'general' },
        'abdominal_pain': { specialist: 'General Surgeon', specialization: 'general' },
        'loss_of_consciousness': { specialist: 'Emergency Medicine', specialization: 'general' },
        'allergic_reaction': { specialist: 'Emergency Medicine', specialization: 'general' }
    };
    return specialistMap[emergencyType] || { specialist: 'General Physician', specialization: 'general' };
}

// AI Hospital Recommendation
function recommendHospital(patientData, triageLevel) {
    const { emergencyType } = patientData;
    const { specialist, specialization } = getRequiredSpecialist(emergencyType);
    
    let recommendedHospitals = [];
    let reason = '';
    
    if (triageLevel === 'CRITICAL') {
        // Filter hospitals with ICU and ventilator
        recommendedHospitals = hospitalData
            .filter(h => h.icu && h.ventilator && h.availableBeds > 0)
            .sort((a, b) => a.distance - b.distance);
        reason = `Critical condition requires immediate ICU care with ventilator support. Selected nearest hospital with ICU facilities and ${specialist} available.`;
    } else if (triageLevel === 'MODERATE') {
        // Filter by specialization and beds
        recommendedHospitals = hospitalData
            .filter(h => h.availableBeds > 0 && h.specialization.includes(specialization))
            .sort((a, b) => a.distance - b.distance);
        
        if (recommendedHospitals.length === 0) {
            recommendedHospitals = hospitalData
                .filter(h => h.availableBeds > 0)
                .sort((a, b) => a.distance - b.distance);
        }
        reason = `Moderate condition requires ${specialist}. Selected hospital with appropriate specialization and available beds.`;
    } else {
        // LOW - nearest with beds
        recommendedHospitals = hospitalData
            .filter(h => h.availableBeds > 0)
            .sort((a, b) => a.distance - b.distance);
        reason = `Stable condition. Selected nearest available hospital for timely care.`;
    }
    
    if (recommendedHospitals.length === 0) {
        recommendedHospitals = [...hospitalData].sort((a, b) => a.distance - b.distance);
        reason = `Limited availability. Routing to nearest hospital. Please call ahead to confirm capacity.`;
    }
    
    return {
        primary: recommendedHospitals[0],
        alternatives: recommendedHospitals.slice(1, 3),
        specialist,
        reason,
        triageLevel
    };
}

// Chatbot response generator
function getChatbotResponse(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for greetings
    if (chatbotResponses.greetings.some(g => lowerMessage.includes(g))) {
        return chatbotResponses.greetingResponse;
    }
    
    // Check for keywords
    for (const [keyword, response] of Object.entries(chatbotResponses.keywords)) {
        if (lowerMessage.includes(keyword)) {
            return response;
        }
    }
    
    // Check for emergency types
    for (const [type, guide] of Object.entries(firstAidGuide)) {
        if (lowerMessage.includes(type.replace('_', ' '))) {
            return `${guide.title} First Aid:\n${guide.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        }
    }
    
    return chatbotResponses.defaultResponse;
}

// ============== API ROUTES ==============

// Driver Registration
app.post('/api/driver/register', (req, res) => {
    const { name, email, password, phone, address } = req.body;
    
    if (drivers.find(d => d.email === email)) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    const newDriver = {
        id: Date.now(),
        name,
        email,
        password,
        phone,
        address,
        createdAt: new Date()
    };
    
    drivers.push(newDriver);
    res.json({ success: true, message: 'Registration successful', driver: { ...newDriver, password: undefined } });
});

// Driver Login
app.post('/api/driver/login', (req, res) => {
    const { email, password } = req.body;
    const driver = drivers.find(d => d.email === email && d.password === password);
    
    if (!driver) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    res.json({ success: true, driver: { ...driver, password: undefined } });
});

// Hospital Registration
app.post('/api/hospital/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (hospitals.find(h => h.email === email)) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    // Link to mock hospital data or create new
    const mockHospital = hospitalData.find(h => h.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
    
    const newHospital = {
        id: Date.now(),
        name,
        email,
        password,
        hospitalDataId: mockHospital ? mockHospital.id : 1,
        createdAt: new Date()
    };
    
    hospitals.push(newHospital);
    res.json({ success: true, message: 'Registration successful', hospital: { ...newHospital, password: undefined } });
});

// Hospital Login
app.post('/api/hospital/login', (req, res) => {
    const { email, password } = req.body;
    const hospital = hospitals.find(h => h.email === email && h.password === password);
    
    if (!hospital) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    res.json({ success: true, hospital: { ...hospital, password: undefined } });
});

// Get all hospitals data
app.get('/api/hospitals', (req, res) => {
    res.json({ success: true, hospitals: hospitalData });
});

// Get specific hospital
app.get('/api/hospitals/:id', (req, res) => {
    const hospital = hospitalData.find(h => h.id === parseInt(req.params.id));
    if (!hospital) {
        return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    res.json({ success: true, hospital });
});

// Update hospital data
app.put('/api/hospitals/:id', (req, res) => {
    const hospitalIndex = hospitalData.findIndex(h => h.id === parseInt(req.params.id));
    if (hospitalIndex === -1) {
        return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    
    hospitalData[hospitalIndex] = { ...hospitalData[hospitalIndex], ...req.body };
    res.json({ success: true, hospital: hospitalData[hospitalIndex] });
});

// Submit patient data and get recommendation
app.post('/api/patient/submit', (req, res) => {
    const patientData = req.body;
    
    // Assess triage level
    const triageLevel = assessTriage(patientData);
    
    // Get hospital recommendation
    const recommendation = recommendHospital(patientData, triageLevel);
    
    // Store submission
    const submission = {
        id: Date.now(),
        ...patientData,
        triageLevel,
        recommendation,
        timestamp: new Date(),
        status: 'pending'
    };
    
    patientSubmissions.push(submission);
    
    res.json({
        success: true,
        submission,
        triageLevel,
        recommendation
    });
});

// Get all patient submissions (for hospital)
app.get('/api/patients', (req, res) => {
    res.json({ success: true, patients: patientSubmissions });
});

// Send request to hospital
app.post('/api/requests/send', (req, res) => {
    const { patientData, driverInfo, hospitalId, submissionId } = req.body;
    
    const request = {
        id: Date.now(),
        patientData,
        driverInfo,
        hospitalId,
        submissionId,
        status: 'pending',
        timestamp: new Date()
    };
    
    requests.push(request);
    
    // Update submission status
    const submission = patientSubmissions.find(s => s.id === submissionId);
    if (submission) {
        submission.requestId = request.id;
        submission.requestStatus = 'pending';
    }
    
    res.json({ success: true, request });
});

// Get requests for a hospital
app.get('/api/requests/hospital/:hospitalId', (req, res) => {
    const hospitalRequests = requests.filter(r => r.hospitalId === parseInt(req.params.hospitalId));
    res.json({ success: true, requests: hospitalRequests });
});

// Get requests by driver
app.get('/api/requests/driver/:driverId', (req, res) => {
    const driverRequests = requests.filter(r => r.driverInfo && r.driverInfo.id === parseInt(req.params.driverId));
    res.json({ success: true, requests: driverRequests });
});

// Accept/Reject request
app.put('/api/requests/:id/respond', (req, res) => {
    const { status } = req.body; // 'accepted' or 'rejected'
    const requestIndex = requests.findIndex(r => r.id === parseInt(req.params.id));
    
    if (requestIndex === -1) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    requests[requestIndex].status = status;
    requests[requestIndex].respondedAt = new Date();
    
    // Get hospital name
    const hospital = hospitalData.find(h => h.id === requests[requestIndex].hospitalId);
    
    // Create notification for driver
    if (status === 'accepted') {
        const notification = {
            id: Date.now(),
            driverId: requests[requestIndex].driverInfo.id,
            requestId: requests[requestIndex].id,
            message: `✅ ${hospital.name} has accepted your request. You can proceed.`,
            hospitalName: hospital.name,
            type: 'accepted',
            read: false,
            timestamp: new Date()
        };
        driverNotifications.push(notification);
        
        // Simulate SMS
        console.log(`📱 SMS SENT to ${requests[requestIndex].driverInfo.phone}: "${hospital.name} has accepted your emergency request. Please proceed immediately."`);
    } else {
        const notification = {
            id: Date.now(),
            driverId: requests[requestIndex].driverInfo.id,
            requestId: requests[requestIndex].id,
            message: `❌ ${hospital.name} has declined your request. Please try an alternative hospital.`,
            hospitalName: hospital.name,
            type: 'rejected',
            read: false,
            timestamp: new Date()
        };
        driverNotifications.push(notification);
    }
    
    res.json({ success: true, request: requests[requestIndex] });
});

// Get notifications for driver
app.get('/api/notifications/driver/:driverId', (req, res) => {
    const notifications = driverNotifications.filter(n => n.driverId === parseInt(req.params.driverId));
    res.json({ success: true, notifications });
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    const notification = driverNotifications.find(n => n.id === parseInt(req.params.id));
    if (notification) {
        notification.read = true;
    }
    res.json({ success: true });
});

// Get first aid guide
app.get('/api/firstaid', (req, res) => {
    res.json({ success: true, guide: firstAidGuide });
});

// Get specific first aid
app.get('/api/firstaid/:type', (req, res) => {
    const guide = firstAidGuide[req.params.type];
    if (!guide) {
        return res.status(404).json({ success: false, message: 'Guide not found' });
    }
    res.json({ success: true, guide });
});

// Chatbot endpoint
app.post('/api/chatbot', (req, res) => {
    const { message } = req.body;
    const response = getChatbotResponse(message);
    res.json({ success: true, response });
});

// Get driver profile
app.get('/api/driver/:id', (req, res) => {
    const driver = drivers.find(d => d.id === parseInt(req.params.id));
    if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, driver: { ...driver, password: undefined } });
});

// Update driver profile
app.put('/api/driver/:id', (req, res) => {
    const driverIndex = drivers.findIndex(d => d.id === parseInt(req.params.id));
    if (driverIndex === -1) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    
    const { name, phone, address } = req.body;
    drivers[driverIndex] = { ...drivers[driverIndex], name, phone, address };
    res.json({ success: true, driver: { ...drivers[driverIndex], password: undefined } });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚑 Golden Hour Emergency System running on http://localhost:${PORT}`);
    console.log('━'.repeat(50));
    console.log('Ready to save lives!');
});