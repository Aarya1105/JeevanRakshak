// ============== GLOBAL STATE ==============
let currentUser = null;
let userType = null; // 'driver' or 'hospital'
let currentRecommendation = null;
let currentSubmission = null;
let hospitalDataCache = [];
let notificationCheckInterval = null;

const API_BASE = '';

// ============== UTILITY FUNCTIONS ==============
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showNotification(content, type = 'info') {
    const modal = document.getElementById('notificationModal');
    const contentDiv = document.getElementById('notificationContent');
    
    let icon = '📢';
    let color = 'text-blue-600';
    
    if (type === 'success') { icon = '✅'; color = 'text-green-600'; }
    if (type === 'error') { icon = '❌'; color = 'text-red-600'; }
    if (type === 'warning') { icon = '⚠️'; color = 'text-yellow-600'; }
    
    contentDiv.innerHTML = `
        <div class="text-center">
            <div class="text-5xl mb-4">${icon}</div>
            <div class="${color} text-lg">${content}</div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeNotificationModal() {
    document.getElementById('notificationModal').classList.add('hidden');
}

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(API_BASE + endpoint, options);
    return response.json();
}

// ============== NAVIGATION ==============
function hideAllPages() {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('driverAuthPage').classList.add('hidden');
    document.getElementById('hospitalAuthPage').classList.add('hidden');
    document.getElementById('driverDashboard').classList.add('hidden');
    document.getElementById('hospitalDashboard').classList.add('hidden');
}

function goHome() {
    hideAllPages();
    document.getElementById('homePage').classList.remove('hidden');
}

function showLoginForm(type) {
    hideAllPages();
    if (type === 'driver') {
        document.getElementById('driverAuthPage').classList.remove('hidden');
    } else {
        document.getElementById('hospitalAuthPage').classList.remove('hidden');
    }
}

// ============== AUTH TAB SWITCHING ==============
function switchDriverTab(tab) {
    const loginTab = document.getElementById('driverLoginTab');
    const registerTab = document.getElementById('driverRegisterTab');
    const loginForm = document.getElementById('driverLoginForm');
    const registerForm = document.getElementById('driverRegisterForm');
    
    if (tab === 'login') {
        loginTab.classList.add('bg-white', 'shadow', 'text-purple-700');
        loginTab.classList.remove('text-gray-500');
        registerTab.classList.remove('bg-white', 'shadow', 'text-purple-700');
        registerTab.classList.add('text-gray-500');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerTab.classList.add('bg-white', 'shadow', 'text-purple-700');
        registerTab.classList.remove('text-gray-500');
        loginTab.classList.remove('bg-white', 'shadow', 'text-purple-700');
        loginTab.classList.add('text-gray-500');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function switchHospitalTab(tab) {
    const loginTab = document.getElementById('hospitalLoginTab');
    const registerTab = document.getElementById('hospitalRegisterTab');
    const loginForm = document.getElementById('hospitalLoginForm');
    const registerForm = document.getElementById('hospitalRegisterForm');
    
    if (tab === 'login') {
        loginTab.classList.add('bg-white', 'shadow', 'text-purple-700');
        loginTab.classList.remove('text-gray-500');
        registerTab.classList.remove('bg-white', 'shadow', 'text-purple-700');
        registerTab.classList.add('text-gray-500');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerTab.classList.add('bg-white', 'shadow', 'text-purple-700');
        registerTab.classList.remove('text-gray-500');
        loginTab.classList.remove('bg-white', 'shadow', 'text-purple-700');
        loginTab.classList.add('text-gray-500');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// ============== AUTHENTICATION ==============
async function handleDriverRegister(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        const result = await apiCall('/api/driver/register', 'POST', data);
        hideLoading();
        
        if (result.success) {
            showNotification('Registration successful! Please login.', 'success');
            switchDriverTab('login');
            event.target.reset();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Registration failed. Please try again.', 'error');
    }
}

async function handleDriverLogin(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        const result = await apiCall('/api/driver/login', 'POST', data);
        hideLoading();
        
        if (result.success) {
            currentUser = result.driver;
            userType = 'driver';
            hideAllPages();
            document.getElementById('driverDashboard').classList.remove('hidden');
            loadDriverProfile();
            startNotificationPolling();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleHospitalRegister(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        const result = await apiCall('/api/hospital/register', 'POST', data);
        hideLoading();
        
        if (result.success) {
            showNotification('Registration successful! Please login.', 'success');
            switchHospitalTab('login');
            event.target.reset();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Registration failed. Please try again.', 'error');
    }
}

async function handleHospitalLogin(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        const result = await apiCall('/api/hospital/login', 'POST', data);
        hideLoading();
        
        if (result.success) {
            currentUser = result.hospital;
            userType = 'hospital';
            hideAllPages();
            document.getElementById('hospitalDashboard').classList.remove('hidden');
            document.getElementById('hospitalNameHeader').textContent = currentUser.name;
            loadHospitalResources();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Login failed. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    userType = null;
    currentRecommendation = null;
    currentSubmission = null;
    
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    goHome();
}

// ============== DRIVER DASHBOARD ==============
function showDriverMenu() {
    document.getElementById('driverMainMenu').classList.remove('hidden');
    document.getElementById('patientFormSection').classList.add('hidden');
    document.getElementById('recommendationSection').classList.add('hidden');
    document.getElementById('hospitalInfoSection').classList.add('hidden');
    document.getElementById('liveRouteSection').classList.add('hidden');
    document.getElementById('driverProfileSection').classList.add('hidden');
    document.getElementById('firstAidSection').classList.add('hidden');
    document.getElementById('myRequestsSection').classList.add('hidden');
}

function showDriverSection(section) {
    document.getElementById('driverMainMenu').classList.add('hidden');
    document.getElementById('patientFormSection').classList.add('hidden');
    document.getElementById('recommendationSection').classList.add('hidden');
    document.getElementById('hospitalInfoSection').classList.add('hidden');
    document.getElementById('liveRouteSection').classList.add('hidden');
    document.getElementById('driverProfileSection').classList.add('hidden');
    document.getElementById('firstAidSection').classList.add('hidden');
    document.getElementById('myRequestsSection').classList.add('hidden');
    
    switch(section) {
        case 'patientForm':
            document.getElementById('patientFormSection').classList.remove('hidden');
            break;
        case 'hospitalInfo':
            document.getElementById('hospitalInfoSection').classList.remove('hidden');
            loadHospitalsList();
            break;
        case 'liveRoute':
            document.getElementById('liveRouteSection').classList.remove('hidden');
            break;
        case 'driverProfile':
            document.getElementById('driverProfileSection').classList.remove('hidden');
            loadDriverProfile();
            break;
        case 'firstAid':
            document.getElementById('firstAidSection').classList.remove('hidden');
            break;
        case 'myRequests':
            document.getElementById('myRequestsSection').classList.remove('hidden');
            loadMyRequests();
            break;
        case 'recommendation':
            document.getElementById('recommendationSection').classList.remove('hidden');
            break;
    }
}

// ============== PATIENT FORM ==============
function handleEmergencyTypeChange(type) {
    const imageUpload = document.getElementById('accidentImageUpload');
    if (type === 'accident') {
        imageUpload.classList.remove('hidden');
    } else {
        imageUpload.classList.add('hidden');
    }
}

function analyzeInjuryImage(input) {
    const analysisDiv = document.getElementById('injuryAnalysis');
    
    if (input.files && input.files[0]) {
        // Mock injury analysis
        const severities = ['Minor injuries detected', 'Moderate injuries detected', 'Severe trauma detected - prioritize treatment'];
        const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
        analysisDiv.innerHTML = `<span class="text-purple-600 font-medium">📷 Image Analysis: ${randomSeverity}</span>`;
    }
}

async function submitPatientForm(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const patientData = {
        heartRate: parseInt(formData.get('heartRate')),
        bloodPressure: formData.get('bloodPressure'),
        oxygenLevel: parseInt(formData.get('oxygenLevel')),
        age: parseInt(formData.get('age')),
        temperature: parseFloat(formData.get('temperature')),
        consciousness: formData.get('consciousness'),
        severity: formData.get('severity'),
        emergencyType: formData.get('emergencyType'),
        notes: formData.get('notes'),
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhone: currentUser.phone,
        timestamp: new Date().toISOString()
    };
    
    try {
        const result = await apiCall('/api/patient/submit', 'POST', patientData);
        hideLoading();
        
        if (result.success) {
            currentRecommendation = result.recommendation;
            currentSubmission = result.submission;
            displayRecommendation(result);
            showDriverSection('recommendation');
        } else {
            showNotification('Failed to process patient data', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Error submitting patient data', 'error');
    }
}

function displayRecommendation(result) {
    const { triageLevel, recommendation, submission } = result;
    const contentDiv = document.getElementById('recommendationContent');
    
    let triageClass = 'triage-low';
    let triageIcon = '🟢';
    if (triageLevel === 'CRITICAL') { triageClass = 'triage-critical'; triageIcon = '🔴'; }
    if (triageLevel === 'MODERATE') { triageClass = 'triage-moderate'; triageIcon = '🟡'; }
    
    const emergencyLabels = {
        'cardiac_arrest': 'Cardiac Arrest',
        'pregnancy': 'Pregnancy Emergency',
        'accident': 'Accident/Trauma',
        'paralysis_stroke': 'Paralysis/Stroke',
        'fever': 'High Fever',
        'snake_bite': 'Snake Bite',
        'difficulty_breathing': 'Difficulty Breathing',
        'abdominal_pain': 'Abdominal Pain',
        'loss_of_consciousness': 'Loss of Consciousness',
        'allergic_reaction': 'Allergic Reaction'
    };
    
    contentDiv.innerHTML = `
        <!-- Triage Level Card -->
        <div class="${triageClass} text-white p-6 rounded-2xl mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm opacity-90">Triage Assessment</p>
                    <h2 class="text-3xl font-bold">${triageIcon} ${triageLevel}</h2>
                </div>
                <div class="text-right">
                    <p class="text-sm opacity-90">Emergency Type</p>
                    <p class="font-semibold">${emergencyLabels[submission.emergencyType]}</p>
                </div>
            </div>
        </div>
        
        <!-- AI Analysis -->
        <div class="bg-white rounded-2xl card-shadow p-6 mb-6">
            <h3 class="font-bold text-lg text-gray-800 mb-3">🤖 AI Analysis</h3>
            <p class="text-gray-600">${recommendation.reason}</p>
            <p class="mt-2 text-purple-600 font-medium">Required Specialist: ${recommendation.specialist}</p>
        </div>
        
        <!-- Recommended Hospital -->
        <div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl p-6 mb-6">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm opacity-90">Recommended Hospital</p>
                    <h3 class="text-2xl font-bold mt-1">${recommendation.primary.name}</h3>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <span class="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">📍 ${recommendation.primary.distance} km</span>
                        <span class="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">🛏️ ${recommendation.primary.availableBeds} beds</span>
                        ${recommendation.primary.icu ? '<span class="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">🏥 ICU</span>' : ''}
                        ${recommendation.primary.ventilator ? '<span class="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">💨 Ventilator</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="mt-4 flex gap-3">
                <button onclick="sendHospitalRequest(${recommendation.primary.id})" class="flex-1 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-100 transition-all">
                    📨 Send Request
                </button>
                <button onclick="navigateToHospital(${recommendation.primary.id})" class="flex-1 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition-all">
                    🗺️ Navigate
                </button>
            </div>
        </div>
        
        <!-- Available Doctors -->
        <div class="bg-white rounded-2xl card-shadow p-6 mb-6">
            <h3 class="font-bold text-lg text-gray-800 mb-4">👨‍⚕️ Available Doctors</h3>
            <div class="space-y-3">
                ${recommendation.primary.doctors.map(doc => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                            <p class="font-medium text-gray-800">${doc.name}</p>
                            <p class="text-sm text-gray-500">${doc.specialization}</p>
                        </div>
                        <a href="tel:${doc.phone}" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-all">
                            📞 Call
                        </a>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Alternative Hospitals -->
        ${recommendation.alternatives.length > 0 ? `
            <div class="bg-white rounded-2xl card-shadow p-6">
                <h3 class="font-bold text-lg text-gray-800 mb-4">🏥 Alternative Hospitals</h3>
                <div class="space-y-3">
                    ${recommendation.alternatives.map(hospital => `
                        <div class="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-all">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-semibold text-gray-800">${hospital.name}</h4>
                                    <div class="flex gap-2 mt-2 text-sm text-gray-500">
                                        <span>📍 ${hospital.distance} km</span>
                                        <span>🛏️ ${hospital.availableBeds} beds</span>
                                    </div>
                                </div>
                                <button onclick="sendHospitalRequest(${hospital.id})" class="px-4 py-2 border border-purple-500 text-purple-600 rounded-lg text-sm hover:bg-purple-50 transition-all">
                                    Send Request
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

async function sendHospitalRequest(hospitalId) {
    if (!currentSubmission) {
        showNotification('Please submit patient form first', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const result = await apiCall('/api/requests/send', 'POST', {
            patientData: currentSubmission,
            driverInfo: currentUser,
            hospitalId: hospitalId,
            submissionId: currentSubmission.id
        });
        
        hideLoading();
        
        if (result.success) {
            showNotification('Request sent successfully! You will be notified when the hospital responds.', 'success');
        } else {
            showNotification('Failed to send request', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Error sending request', 'error');
    }
}

function navigateToHospital(hospitalId) {
    const hospital = hospitalDataCache.find(h => h.id === hospitalId) || currentRecommendation?.primary;
    
    if (hospital) {
        // Update route info
        document.getElementById('routeInfo').innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-3xl">🏥</div>
                <div>
                    <p class="font-semibold text-gray-800">${hospital.name}</p>
                    <p class="text-sm text-gray-500">Navigate to destination</p>
                </div>
            </div>
        `;
        
        // Update distance and time
        document.getElementById('routeDistance').textContent = `${hospital.distance} km`;
        const estimatedTime = Math.ceil(hospital.distance * 3); // Rough estimate: 3 min per km
        document.getElementById('routeTime').textContent = `${estimatedTime} mins`;
        
        // Update map with destination
        const mapFrame = document.getElementById('mapFrame');
       mapFrame.src =
`https://maps.google.com/maps?q=${encodeURIComponent(hospital.name)}&output=embed`;
        
        showDriverSection('liveRoute');
    }
}

// ============== HOSPITALS LIST ==============
async function loadHospitalsList() {
    showLoading();
    
    try {
        const result = await apiCall('/api/hospitals');
        hideLoading();
        
        if (result.success) {
            hospitalDataCache = result.hospitals;
            displayHospitalsList(result.hospitals);
        }
    } catch (error) {
        hideLoading();
        showNotification('Error loading hospitals', 'error');
    }
}

function displayHospitalsList(hospitals) {
    const container = document.getElementById('hospitalsList');
    
    container.innerHTML = hospitals.map(hospital => `
        <div class="bg-white rounded-2xl card-shadow p-6 hospital-card transition-all">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">${hospital.name}</h3>
                    <p class="text-sm text-gray-500">📍 ${hospital.distance} km away</p>
                </div>
                <div class="flex gap-2">
                    ${hospital.icu ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">ICU</span>' : ''}
                    ${hospital.ventilator ? '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Ventilator</span>' : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="text-center p-3 bg-gray-50 rounded-xl">
                    <p class="text-2xl font-bold text-purple-600">${hospital.availableBeds}</p>
                    <p class="text-xs text-gray-500">Beds</p>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded-xl">
                    <p class="text-2xl font-bold text-blue-600">${hospital.oxygenCylinders}</p>
                    <p class="text-xs text-gray-500">O₂ Cylinders</p>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded-xl">
                    <p class="text-2xl font-bold text-green-600">${hospital.doctors.length}</p>
                    <p class="text-xs text-gray-500">Doctors</p>
                </div>
            </div>
            
            <div class="border-t pt-4">
                <p class="text-sm font-medium text-gray-700 mb-2">Doctors:</p>
                <div class="space-y-2">
                    ${hospital.doctors.slice(0, 2).map(doc => `
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-600">${doc.name} (${doc.specialization})</span>
                            <a href="tel:${doc.phone}" class="text-purple-600 hover:text-purple-800">📞</a>
                        </div>
                    `).join('')}
                    ${hospital.doctors.length > 2 ? `<p class="text-xs text-gray-400">+${hospital.doctors.length - 2} more doctors</p>` : ''}
                </div>
            </div>
            
            <button onclick="navigateToHospital(${hospital.id})" class="mt-4 w-full py-2 border border-purple-500 text-purple-600 rounded-xl hover:bg-purple-50 transition-all">
                🗺️ Navigate
            </button>
        </div>
    `).join('');
}

// ============== DRIVER PROFILE ==============
function loadDriverProfile() {
    if (currentUser) {
        document.getElementById('profileName').value = currentUser.name || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        document.getElementById('profilePhone').value = currentUser.phone || '';
        document.getElementById('profileAddress').value = currentUser.address || '';
    }
}

async function updateDriverProfile(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        const result = await apiCall(`/api/driver/${currentUser.id}`, 'PUT', data);
        hideLoading();
        
        if (result.success) {
            currentUser = result.driver;
            showNotification('Profile updated successfully!', 'success');
        } else {
            showNotification('Failed to update profile', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Error updating profile', 'error');
    }
}

// ============== FIRST AID GUIDE ==============
async function showFirstAidGuide(type) {
    if (!type) {
        document.getElementById('firstAidContent').innerHTML = '';
        return;
    }
    
    try {
        const result = await apiCall(`/api/firstaid/${type}`);
        
        if (result.success) {
            const guide = result.guide;
            document.getElementById('firstAidContent').innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h3 class="text-xl font-bold text-red-700 mb-4">🩹 ${guide.title}</h3>
                    <ol class="space-y-3">
                        ${guide.steps.map((step, i) => `
                            <li class="flex gap-3">
                                <span class="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">${i + 1}</span>
                                <span class="text-gray-700 pt-1">${step}</span>
                            </li>
                        `).join('')}
                    </ol>
                    <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p class="text-yellow-700 font-medium">⚠️ Always call emergency services for serious conditions!</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        showNotification('Error loading first aid guide', 'error');
    }
}

// ============== MY REQUESTS ==============
async function loadMyRequests() {
    showLoading();
    
    try {
        const result = await apiCall(`/api/requests/driver/${currentUser.id}`);
        hideLoading();
        
        if (result.success) {
            displayMyRequests(result.requests);
        }
    } catch (error) {
        hideLoading();
        document.getElementById('myRequestsList').innerHTML = '<p class="text-gray-500 text-center py-8">Error loading requests</p>';
    }
}

function displayMyRequests(requests) {
    const container = document.getElementById('myRequestsList');
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No requests sent yet</p>';
        return;
    }
    
    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'accepted': 'bg-green-100 text-green-700',
        'rejected': 'bg-red-100 text-red-700'
    };
    
    const statusIcons = {
        'pending': '⏳',
        'accepted': '✅',
        'rejected': '❌'
    };
    
    container.innerHTML = requests.map(request => {
        const hospital = hospitalDataCache.find(h => h.id === request.hospitalId) || { name: 'Unknown Hospital' };
        return `
            <div class="p-4 border border-gray-200 rounded-xl mb-3">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-800">${hospital.name}</h4>
                        <p class="text-sm text-gray-500">${new Date(request.timestamp).toLocaleString()}</p>
                    </div>
                    <span class="px-3 py-1 ${statusColors[request.status]} rounded-full text-sm font-medium">
                        ${statusIcons[request.status]} ${request.status.toUpperCase()}
                    </span>
                </div>
                ${request.status === 'accepted' ? `
                    <button onclick="navigateToHospital(${request.hospitalId})" class="mt-3 w-full py-2 btn-primary text-white rounded-xl">
                        🗺️ Navigate to Hospital
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ============== NOTIFICATIONS ==============
function startNotificationPolling() {
    checkNotifications();
    notificationCheckInterval = setInterval(checkNotifications, 5000); // Check every 5 seconds
}

async function checkNotifications() {
    if (!currentUser || userType !== 'driver') return;
    
    try {
        const result = await apiCall(`/api/notifications/driver/${currentUser.id}`);
        
        if (result.success) {
            const unread = result.notifications.filter(n => !n.read);
            const badge = document.getElementById('notificationBadge');
            
            if (unread.length > 0) {
                badge.textContent = unread.length;
                badge.classList.remove('hidden');
                
                // Show popup for new notifications
                unread.forEach(notification => {
                    if (notification.type === 'accepted') {
                        showNotification(notification.message, 'success');
                    } else if (notification.type === 'rejected') {
                        showNotification(notification.message, 'warning');
                    }
                    // Mark as read
                    apiCall(`/api/notifications/${notification.id}/read`, 'PUT');
                });
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// ============== CHATBOT ==============
function toggleChatbot() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.classList.toggle('hidden');
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatMessages = document.getElementById('chatMessages');
    
    // Add user message
    chatMessages.innerHTML += `
        <div class="flex justify-end">
            <div class="bg-purple-600 text-white p-3 rounded-xl rounded-tr-none max-w-[80%]">
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;
    
    input.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const result = await apiCall('/api/chatbot', 'POST', { message });
        
        if (result.success) {
            // Add bot response
            chatMessages.innerHTML += `
                <div class="bg-purple-100 p-3 rounded-xl rounded-tl-none max-w-[80%]">
                    <p class="text-sm text-gray-700 whitespace-pre-line">${result.response}</p>
                </div>
            `;
            
            // Text-to-speech
            speakResponse(result.response);
        }
    } catch (error) {
        chatMessages.innerHTML += `
            <div class="bg-red-100 p-3 rounded-xl rounded-tl-none max-w-[80%]">
                <p class="text-sm text-red-700">Sorry, I encountered an error. Please try again.</p>
            </div>
        `;
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Voice input is not supported in your browser', 'warning');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        showNotification('🎤 Listening... Speak now', 'info');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chatInput').value = transcript;
        sendChatMessage();
    };
    
    recognition.onerror = (event) => {
        showNotification('Voice recognition error. Please try again.', 'error');
    };
    
    recognition.start();
}

function speakResponse(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
    }
}

// ============== HOSPITAL DASHBOARD ==============
function showHospitalMenu() {
    document.getElementById('hospitalMainMenu').classList.remove('hidden');
    document.getElementById('incomingPatientsSection').classList.add('hidden');
    document.getElementById('incomingRequestsSection').classList.add('hidden');
    document.getElementById('updateResourcesSection').classList.add('hidden');
    document.getElementById('liveAmbulanceSection').classList.add('hidden');
}

function showHospitalSection(section) {
    document.getElementById('hospitalMainMenu').classList.add('hidden');
    document.getElementById('incomingPatientsSection').classList.add('hidden');
    document.getElementById('incomingRequestsSection').classList.add('hidden');
    document.getElementById('updateResourcesSection').classList.add('hidden');
    document.getElementById('liveAmbulanceSection').classList.add('hidden');
    
    switch(section) {
        case 'incomingPatients':
            document.getElementById('incomingPatientsSection').classList.remove('hidden');
            loadIncomingPatients();
            break;
        case 'incomingRequests':
            document.getElementById('incomingRequestsSection').classList.remove('hidden');
            loadIncomingRequests();
            break;
        case 'updateResources':
            document.getElementById('updateResourcesSection').classList.remove('hidden');
            loadHospitalResources();
            break;
        case 'liveAmbulance':
            document.getElementById('liveAmbulanceSection').classList.remove('hidden');
            break;
    }
}

async function loadIncomingPatients() {
    showLoading();
    
    try {
        const result = await apiCall('/api/patients');
        hideLoading();
        
        if (result.success) {
            displayIncomingPatients(result.patients);
        }
    } catch (error) {
        hideLoading();
        document.getElementById('patientsList').innerHTML = '<p class="text-gray-500 text-center py-8">Error loading patients</p>';
    }
}

function displayIncomingPatients(patients) {
    const container = document.getElementById('patientsList');
    
    if (patients.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No incoming patients</p>';
        return;
    }
    
    const emergencyLabels = {
        'cardiac_arrest': 'Cardiac Arrest',
        'pregnancy': 'Pregnancy Emergency',
        'accident': 'Accident/Trauma',
        'paralysis_stroke': 'Paralysis/Stroke',
        'fever': 'High Fever',
        'snake_bite': 'Snake Bite',
        'difficulty_breathing': 'Difficulty Breathing',
        'abdominal_pain': 'Abdominal Pain',
        'loss_of_consciousness': 'Loss of Consciousness',
        'allergic_reaction': 'Allergic Reaction'
    };
    
    const triageColors = {
        'CRITICAL': 'bg-red-500',
        'MODERATE': 'bg-yellow-500',
        'LOW': 'bg-green-500'
    };
    
    container.innerHTML = patients.slice().reverse().map(patient => `
        <div class="p-4 border border-gray-200 rounded-xl mb-3 hover:border-purple-300 transition-all">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <span class="px-3 py-1 ${triageColors[patient.triageLevel]} text-white rounded-full text-sm font-medium">
                        ${patient.triageLevel}
                    </span>
                    <span class="ml-2 text-gray-600">${emergencyLabels[patient.emergencyType]}</span>
                </div>
                <span class="text-sm text-gray-400">${new Date(patient.timestamp).toLocaleString()}</span>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div class="p-2 bg-gray-50 rounded-lg">
                    <p class="text-gray-500">Heart Rate</p>
                    <p class="font-semibold">${patient.heartRate} BPM</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                    <p class="text-gray-500">Blood Pressure</p>
                    <p class="font-semibold">${patient.bloodPressure}</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                    <p class="text-gray-500">Oxygen Level</p>
                    <p class="font-semibold">${patient.oxygenLevel}%</p>
                </div>
                <div class="p-2 bg-gray-50 rounded-lg">
                    <p class="text-gray-500">Temperature</p>
                    <p class="font-semibold">${patient.temperature}°F</p>
                </div>
            </div>
            
            <div class="mt-3 flex justify-between items-center text-sm">
                <div>
                    <span class="text-gray-500">Driver:</span>
                    <span class="font-medium">${patient.driverName || 'N/A'}</span>
                    ${patient.driverPhone ? `<a href="tel:${patient.driverPhone}" class="ml-2 text-purple-600">📞 ${patient.driverPhone}</a>` : ''}
                </div>
                <span class="text-gray-400">Age: ${patient.age} | ${patient.consciousness}</span>
            </div>
        </div>
    `).join('');
}

async function loadIncomingRequests() {
    showLoading();
    
    try {
        const hospitalId = currentUser.hospitalDataId || 1;
        const result = await apiCall(`/api/requests/hospital/${hospitalId}`);
        hideLoading();
        
        if (result.success) {
            displayIncomingRequests(result.requests);
            
            // Update badge
            const pending = result.requests.filter(r => r.status === 'pending').length;
            const badge = document.getElementById('requestBadge');
            if (pending > 0) {
                badge.textContent = pending;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        hideLoading();
        document.getElementById('requestsList').innerHTML = '<p class="text-gray-500 text-center py-8">Error loading requests</p>';
    }
}

function displayIncomingRequests(requests) {
    const container = document.getElementById('requestsList');
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No incoming requests</p>';
        return;
    }
    
    const emergencyLabels = {
        'cardiac_arrest': 'Cardiac Arrest',
        'pregnancy': 'Pregnancy Emergency',
        'accident': 'Accident/Trauma',
        'paralysis_stroke': 'Paralysis/Stroke',
        'fever': 'High Fever',
        'snake_bite': 'Snake Bite',
        'difficulty_breathing': 'Difficulty Breathing',
        'abdominal_pain': 'Abdominal Pain',
        'loss_of_consciousness': 'Loss of Consciousness',
        'allergic_reaction': 'Allergic Reaction'
    };
    
    const triageColors = {
        'CRITICAL': 'bg-red-500',
        'MODERATE': 'bg-yellow-500',
        'LOW': 'bg-green-500'
    };
    
    container.innerHTML = requests.slice().reverse().map(request => {
        const patient = request.patientData;
        const driver = request.driverInfo;
        
        return `
            <div class="p-4 border-2 ${request.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'} rounded-xl mb-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span class="px-3 py-1 ${triageColors[patient.triageLevel]} text-white rounded-full text-sm font-medium">
                            ${patient.triageLevel}
                        </span>
                        <span class="ml-2 text-gray-600">${emergencyLabels[patient.emergencyType]}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-sm px-2 py-1 rounded-full ${request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : request.status === 'accepted' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">
                            ${request.status.toUpperCase()}
                        </span>
                        <p class="text-xs text-gray-400 mt-1">${new Date(request.timestamp).toLocaleString()}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div class="p-2 bg-white rounded-lg">
                        <p class="text-gray-500">Heart Rate</p>
                        <p class="font-semibold">${patient.heartRate} BPM</p>
                    </div>
                    <div class="p-2 bg-white rounded-lg">
                        <p class="text-gray-500">Blood Pressure</p>
                        <p class="font-semibold">${patient.bloodPressure}</p>
                    </div>
                    <div class="p-2 bg-white rounded-lg">
                        <p class="text-gray-500">Oxygen Level</p>
                        <p class="font-semibold">${patient.oxygenLevel}%</p>
                    </div>
                    <div class="p-2 bg-white rounded-lg">
                        <p class="text-gray-500">Age</p>
                        <p class="font-semibold">${patient.age} years</p>
                    </div>
                </div>
                
                <div class="p-3 bg-white rounded-lg mb-3">
                    <p class="text-sm text-gray-500">Driver Information</p>
                    <div class="flex justify-between items-center mt-1">
                        <p class="font-semibold">${driver.name}</p>
                        <a href="tel:${driver.phone}" class="px-3 py-1 bg-green-500 text-white rounded-lg text-sm">📞 ${driver.phone}</a>
                    </div>
                </div>
                
                ${request.status === 'pending' ? `
                    <div class="flex gap-3">
                        <button onclick="respondToRequest(${request.id}, 'accepted')" class="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all">
                            ✅ Accept
                        </button>
                        <button onclick="respondToRequest(${request.id}, 'rejected')" class="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all">
                            ❌ Reject
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function respondToRequest(requestId, status) {
    showLoading();
    
    try {
        const result = await apiCall(`/api/requests/${requestId}/respond`, 'PUT', { status });
        hideLoading();
        
        if (result.success) {
            showNotification(
                status === 'accepted' 
                    ? '✅ Request accepted! SMS notification sent to driver.' 
                    : '❌ Request rejected. Driver has been notified.',
                status === 'accepted' ? 'success' : 'warning'
            );
            loadIncomingRequests();
        } else {
            showNotification('Failed to respond to request', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Error responding to request', 'error');
    }
}

async function loadHospitalResources() {
    try {
        const hospitalId = currentUser.hospitalDataId || 1;
        const result = await apiCall(`/api/hospitals/${hospitalId}`);
        
        if (result.success) {
            const hospital = result.hospital;
            document.getElementById('resBeds').value = hospital.availableBeds;
            document.getElementById('resOxygen').value = hospital.oxygenCylinders;
            document.getElementById('resIcu').value = hospital.icu.toString();
            document.getElementById('resVentilator').value = hospital.ventilator.toString();
            document.getElementById('resDistance').value = hospital.distance;
            
            displayDoctorsList(hospital.doctors);
        }
    } catch (error) {
        console.error('Error loading hospital resources:', error);
    }
}

function displayDoctorsList(doctors) {
    const container = document.getElementById('doctorsList');
    
    container.innerHTML = doctors.map((doc, index) => `
        <div class="grid grid-cols-3 gap-2 items-center" data-doctor-index="${index}">
            <input type="text" value="${doc.name}" placeholder="Name" class="px-3 py-2 border border-gray-200 rounded-lg input-focus outline-none text-sm" data-field="name">
            <input type="text" value="${doc.specialization}" placeholder="Specialization" class="px-3 py-2 border border-gray-200 rounded-lg input-focus outline-none text-sm" data-field="specialization">
            <div class="flex gap-2">
                <input type="text" value="${doc.phone}" placeholder="Phone" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg input-focus outline-none text-sm" data-field="phone">
                <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 text-red-500 hover:bg-red-50 rounded">✕</button>
            </div>
        </div>
    `).join('');
}

function addDoctorField() {
    const container = document.getElementById('doctorsList');
    const index = container.children.length;
    
    container.innerHTML += `
        <div class="grid grid-cols-3 gap-2 items-center" data-doctor-index="${index}">
            <input type="text" placeholder="Name" class="px-3 py-2 border border-gray-200 rounded-lg input-focus outline-none text-sm" data-field="name">
            <input type="text" placeholder="Specialization" class="px-3 py-2 border border-gray-200 rounded-lg input-focus outline-none text-sm" data-field="specialization">
            <div class="flex gap-2">
                <input type="text" placeholder="Phone" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg input-focus outline-none text-sm" data-field="phone">
                <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-2 py-1 text-red-500 hover:bg-red-50 rounded">✕</button>
            </div>
        </div>
    `;
}

async function updateHospitalResources(event) {
    event.preventDefault();
    showLoading();
    
    // Gather doctors data
    const doctorRows = document.querySelectorAll('#doctorsList > div');
    const doctors = [];
    
    doctorRows.forEach(row => {
        const name = row.querySelector('[data-field="name"]').value;
        const specialization = row.querySelector('[data-field="specialization"]').value;
        const phone = row.querySelector('[data-field="phone"]').value;
        
        if (name && specialization && phone) {
            doctors.push({ name, specialization, phone });
        }
    });
    
    const data = {
        availableBeds: parseInt(document.getElementById('resBeds').value),
        oxygenCylinders: parseInt(document.getElementById('resOxygen').value),
        icu: document.getElementById('resIcu').value === 'true',
        ventilator: document.getElementById('resVentilator').value === 'true',
        distance: parseFloat(document.getElementById('resDistance').value),
        doctors
    };
    
    try {
        const hospitalId = currentUser.hospitalDataId || 1;
        const result = await apiCall(`/api/hospitals/${hospitalId}`, 'PUT', data);
        hideLoading();
        
        if (result.success) {
            showNotification('Hospital resources updated successfully!', 'success');
        } else {
            showNotification('Failed to update resources', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Error updating resources', 'error');
    }
}

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
    // Get user's location for better hospital routing
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Location obtained:', position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.log('Location access denied or unavailable');
            }
        );
    }
});