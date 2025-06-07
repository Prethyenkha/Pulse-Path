// Healthcare App JavaScript

// Data storage objects
let healthProfile = {};
let emergencyContacts = [];
let doctors = [];
let prescriptions = [];
let medicationTracking = {
    doses: [],
    missedDoses: [],
    adherenceRate: 100
};

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const notification = document.getElementById('notification');

// Add SOS functionality
let isEmergencyActive = false;
let locationUpdateInterval;
let lastLocation = null;

// Add these variables at the top with other variables
let sosTimer;
let sosCountdown = 30; // 30 seconds countdown
let caregiverResponses = new Set();

// Check login status
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') || sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    setupHeader();
    loadData();
    setupEventListeners();
    displayData();
    checkReminders(); // Check for any pending reminders
    loadTrackingData(); // Load medication tracking data
    setupSOSButton(); // Add SOS button setup
});

function setupHeader() {
    const header = document.querySelector('header');
    
    // Create logo container
    const logoContainer = document.createElement('div');
    logoContainer.className = 'logo-container';
    
    // Add logo
    const logo = document.createElement('div');
    logo.className = 'logo';
    
    // Add brand name
    const brandName = document.createElement('h1');
    brandName.className = 'brand-name';
    brandName.textContent = 'Pulse Path';
    
    logoContainer.appendChild(logo);
    logoContainer.appendChild(brandName);
    
    // Add to header
    header.insertBefore(logoContainer, header.firstChild);

    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    header.appendChild(loadingIndicator);
}

// Event Listeners Setup
function setupEventListeners() {
    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Form submissions
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
    document.getElementById('doctorForm').addEventListener('submit', handleDoctorSubmit);
    document.getElementById('prescriptionForm').addEventListener('submit', handlePrescriptionSubmit);
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Profile form handler
function handleProfileSubmit(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add('loading');
    
    const formData = {
        name: document.getElementById('patientName').value,
        age: document.getElementById('patientAge').value,
        condition: document.getElementById('patientCondition').value,
        allergies: document.getElementById('patientAllergies').value,
        medications: document.getElementById('patientMedications').value
    };
    
    // Validate required fields
    if (!formData.name || !formData.age || !formData.condition) {
        showNotification('Please fill in all required fields', 'error');
        form.classList.remove('loading');
        return;
    }
    
    healthProfile = formData;
    saveData();
    showNotification('Health profile saved successfully!', 'success');
    form.classList.remove('loading');
}

// Emergency contact form handler
function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add('loading');
    
    const contact = {
        id: Date.now(),
        name: document.getElementById('contactName').value,
        relation: document.getElementById('contactRelation').value,
        phone: document.getElementById('contactPhone').value,
        email: document.getElementById('contactEmail').value
    };
    
    // Validate required fields
    if (!contact.name || !contact.relation || !contact.phone) {
        showNotification('Please fill in all required fields', 'error');
        form.classList.remove('loading');
        return;
    }
    
    emergencyContacts.push(contact);
    saveData();
    displayContacts();
    document.getElementById('contactForm').reset();
    showNotification('Emergency contact added successfully!', 'success');
    form.classList.remove('loading');
}

// Doctor form handler
function handleDoctorSubmit(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add('loading');
    
    const doctor = {
        id: Date.now(),
        name: document.getElementById('doctorName').value,
        specialty: document.getElementById('doctorSpecialty').value,
        phone: document.getElementById('doctorPhone').value,
        email: document.getElementById('doctorEmail').value,
        address: document.getElementById('doctorAddress').value
    };
    
    // Validate required fields
    if (!doctor.name || !doctor.specialty || !doctor.phone) {
        showNotification('Please fill in all required fields', 'error');
        form.classList.remove('loading');
        return;
    }
    
    doctors.push(doctor);
    saveData();
    displayDoctors();
    document.getElementById('doctorForm').reset();
    showNotification('Doctor details added successfully!', 'success');
    form.classList.remove('loading');
}

// Prescription form handler with notifications
function handlePrescriptionSubmit(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add('loading');
    
    const prescription = {
        id: Date.now(),
        medicineName: document.getElementById('prescriptionTitle').value,
        doctor: document.getElementById('prescriptionDoctor').value,
        startDate: document.getElementById('prescriptionDate').value,
        duration: document.getElementById('prescriptionDuration').value,
        reminderTimes: {
            morning: document.getElementById('morning').checked ? document.getElementById('morningTime').value : null,
            afternoon: document.getElementById('afternoon').checked ? document.getElementById('afternoonTime').value : null,
            evening: document.getElementById('evening').checked ? document.getElementById('eveningTime').value : null
        },
        notes: document.getElementById('prescriptionNotes').value,
        file: document.getElementById('prescriptionFile').files[0] ? {
            name: document.getElementById('prescriptionFile').files[0].name,
            data: null
        } : null
    };
    
    // Validate required fields
    if (!prescription.medicineName || !prescription.doctor || !prescription.startDate || !prescription.duration) {
        showNotification('Please fill in all required fields', 'error');
        form.classList.remove('loading');
        return;
    }

    // Validate at least one reminder time is selected
    if (!prescription.reminderTimes.morning && !prescription.reminderTimes.afternoon && !prescription.reminderTimes.evening) {
        showNotification('Please select at least one reminder time', 'error');
        form.classList.remove('loading');
        return;
    }
    
    // Handle file upload if present
    if (prescription.file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            prescription.file.data = e.target.result;
            savePrescriptionAndSetReminders(prescription);
        };
        reader.readAsDataURL(document.getElementById('prescriptionFile').files[0]);
    } else {
        savePrescriptionAndSetReminders(prescription);
    }
    form.classList.remove('loading');
}

function savePrescriptionAndSetReminders(prescription) {
    prescriptions.push(prescription);
    saveData();
    displayPrescriptions();
    document.getElementById('prescriptionForm').reset();
    showNotification('Prescription saved successfully!', 'success');
    setupPrescriptionReminders(prescription);
}

function setupPrescriptionReminders(prescription) {
    const endDate = new Date(prescription.startDate);
    endDate.setDate(endDate.getDate() + parseInt(prescription.duration));
    
    // Store reminder settings
    const reminders = JSON.parse(localStorage.getItem('prescriptionReminders') || '[]');
    reminders.push({
        id: prescription.id,
        medicineName: prescription.medicineName,
        startDate: prescription.startDate,
        endDate: endDate.toISOString().split('T')[0],
        reminderTimes: prescription.reminderTimes
    });
    localStorage.setItem('prescriptionReminders', JSON.stringify(reminders));
    
    // Start checking for reminders
    checkReminders();
}

// Check for reminders every minute
setInterval(checkReminders, 60000);

function checkReminders() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const reminders = JSON.parse(localStorage.getItem('prescriptionReminders') || '[]');
    
    reminders.forEach(reminder => {
        if (currentDate >= reminder.startDate && currentDate <= reminder.endDate) {
            Object.entries(reminder.reminderTimes).forEach(([time, value]) => {
                if (value === currentTime) {
                    showMedicineReminder(reminder.medicineName, time, reminder.id);
                }
            });
        }
    });
}

function showMedicineReminder(medicineName, time, reminderId) {
    const timeLabels = {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening'
    };

    const timestamp = new Date().toISOString();
    const doseId = `${reminderId}-${timestamp}`;

    // Create notification badge
    const badge = document.createElement('div');
    badge.className = 'notification-badge';
    badge.innerHTML = `
        <div class="icon">💊</div>
        <div class="content">
            <h3>Take your Medicines</h3>
            <p>${medicineName} - ${timeLabels[time]} dose</p>
            <div class="notification-actions">
                <button class="btn-taken" onclick="confirmDose('${doseId}', '${medicineName}', '${time}', true)">Taken</button>
                <button class="btn-missed" onclick="confirmDose('${doseId}', '${medicineName}', '${time}', false)">Missed</button>
            </div>
        </div>
        <button class="close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    document.body.appendChild(badge);
    requestNotificationPermission(medicineName, timeLabels[time]);
    
    // If user doesn't respond within 30 minutes, mark as missed
    setTimeout(() => {
        const dose = medicationTracking.doses.find(d => d.id === doseId);
        if (!dose) {
            confirmDose(doseId, medicineName, time, false);
        }
    }, 30 * 60 * 1000);

    // Remove the notification badge after 30 seconds
    setTimeout(() => {
        if (badge.parentElement) {
            badge.remove();
        }
    }, 30000);

    playNotificationSound();
}

function requestNotificationPermission(medicineName, timeLabel) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Take your Medicines', {
                    body: `${medicineName} - ${timeLabel} dose`,
                    icon: '/favicon.ico'
                });
            }
        });
    }
}

function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRQ0PVqzn77BdGAg+ltrzxnMpBSl+zPDckz4LF2S57OihUBELTKXh8bllHgU2jdXzzn0uBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z1YU2Bhxqvu7mnEgODlOq5O+zYBoGPJPY88p2KwUme8rx35ZADBVgtuvqpVITC0mi4PK8aB8GM4nU8tGAMQYeb8Lv45xGDg1Qp+PwtmMcBjiR1/PMeSwFJHfH8N2RQAoUXrTp66hVFApGnt/yvmwhBTGG0fPTgjQGHm7A7+OZRQ0PVqzn77BdGAg+ltrzxnUoBSh+zPDckz4LGGS57OihUBELTKXh8bllHgU1jdXzzn0uBSF0xe/glEILElyx6OyrWBUIQ5zd8sFuJAUug8/z1YU2Bhxqvu7mnEgODlOq5O+zYRoGPJPY88p3KgUme8rx35ZADBVgtuvqpVITC0mi4PK8aB8GM4nU8tGAMQYeb8Lv45xGDg1Qp+PwtmMcBjiR1/PMeSwFJHfH8N2RQAoUXrTp66hVFApGnt/yvmwhBTGG0fPTgjQGHm7A7+OZRg0PVqzn77BdGAg+ltvyxnUoBSh+zPDckz4LF2S57OihUBELTKXh8bllHgU1jdT0zn0uBSF0xe/glUILElyx6OyrWBUIQ5zd8sFuJAUug8/z1YU2Bhxqvu7mnEgODlOq5O+zYRoGPJPY88p3KgUme8rx35ZADBVgtuvqpVMSC0mi4PK8aB8GM4nU8tGAMQYeb8Lv45xGDg0=');
    audio.play();
}

// Display functions
function displayContacts() {
    const contactsList = document.getElementById('contactsList');
    contactsList.classList.add('loading');
    
    if (emergencyContacts.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state card-hover">
                <p>No emergency contacts added yet</p>
                <small>Add your first emergency contact using the form above</small>
            </div>
        `;
        contactsList.classList.remove('loading');
        return;
    }
    
    contactsList.innerHTML = emergencyContacts.map(contact => `
        <div class="contact-item card-hover">
            <div class="item-header">
                <h4 class="item-title">${contact.name}</h4>
                <button class="btn-danger delete-btn" onclick="deleteContact(${contact.id})">Delete</button>
            </div>
            <p><strong>Relationship:</strong> ${contact.relation}</p>
            <p><strong>Phone:</strong> ${contact.phone}</p>
            ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
        </div>
    `).join('');
    
    contactsList.classList.remove('loading');
}

function displayDoctors() {
    const doctorsList = document.getElementById('doctorsList');
    doctorsList.classList.add('loading');
    
    if (doctors.length === 0) {
        doctorsList.innerHTML = `
            <div class="empty-state card-hover">
                <p>No doctors added yet</p>
                <small>Add your healthcare providers using the form above</small>
            </div>
        `;
        doctorsList.classList.remove('loading');
        return;
    }
    
    doctorsList.innerHTML = doctors.map(doctor => `
        <div class="doctor-item card-hover">
            <div class="item-header">
                <h4 class="item-title">Dr. ${doctor.name}</h4>
                <button class="btn-danger delete-btn" onclick="deleteDoctor(${doctor.id})">Delete</button>
            </div>
            <p><strong>Specialty:</strong> ${doctor.specialty}</p>
            <p><strong>Phone:</strong> ${doctor.phone}</p>
            ${doctor.email ? `<p><strong>Email:</strong> ${doctor.email}</p>` : ''}
            ${doctor.address ? `<p><strong>Address:</strong> ${doctor.address}</p>` : ''}
        </div>
    `).join('');
    
    doctorsList.classList.remove('loading');
}

function displayPrescriptions() {
    const prescriptionsList = document.getElementById('prescriptionsList');
    prescriptionsList.classList.add('loading');
    
    // Add adherence summary at the top
    const adherenceSummary = `
        <div class="adherence-summary card-hover">
            <h3>Medication Adherence</h3>
            <div class="adherence-stats">
                <div class="adherence-rate ${getAdherenceClass(medicationTracking.adherenceRate)}">
                    <span class="rate-number">${medicationTracking.adherenceRate}%</span>
                    <span class="rate-label">Adherence Rate</span>
                </div>
                <div class="adherence-details">
                    <p>Total Doses: ${medicationTracking.doses.length}</p>
                    <p>Doses Taken: ${medicationTracking.doses.filter(d => d.taken).length}</p>
                    <p>Doses Missed: ${medicationTracking.missedDoses.length}</p>
                </div>
            </div>
        </div>
    `;
    
    if (prescriptions.length === 0) {
        prescriptionsList.innerHTML = adherenceSummary + `
            <div class="empty-state card-hover">
                <p>No prescriptions uploaded yet</p>
                <small>Upload your prescription documents using the form above</small>
            </div>
        `;
        prescriptionsList.classList.remove('loading');
        return;
    }
    
    prescriptionsList.innerHTML = adherenceSummary + prescriptions.map(prescription => `
        <div class="prescription-item card-hover">
            <div class="item-header">
                <h4 class="item-title">${prescription.medicineName}</h4>
                <button class="btn-danger delete-btn" onclick="deletePrescription(${prescription.id})">Delete</button>
            </div>
            <p><strong>Prescribed by:</strong> ${prescription.doctor}</p>
            <p><strong>Start Date:</strong> ${formatDate(prescription.startDate)}</p>
            <p><strong>Duration:</strong> ${prescription.duration} days</p>
            ${prescription.notes ? `<p><strong>Notes:</strong> ${prescription.notes}</p>` : ''}
            ${prescription.file ? `
                <div class="prescription-file">
                    <p><strong>File:</strong> 
                        <a href="${prescription.file.data}" target="_blank" download="${prescription.file.name}">
                            ${prescription.file.name}
                        </a>
                    </p>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    prescriptionsList.classList.remove('loading');
}

// Delete functions
function deleteContact(id) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
        emergencyContacts = emergencyContacts.filter(contact => contact.id !== id);
        saveData();
        displayContacts();
        showNotification('Emergency contact deleted successfully!', 'success');
    }
}

function deleteDoctor(id) {
    if (confirm('Are you sure you want to delete this doctor?')) {
        doctors = doctors.filter(doctor => doctor.id !== id);
        saveData();
        displayDoctors();
        showNotification('Doctor deleted successfully!', 'success');
    }
}

function deletePrescription(id) {
    if (confirm('Are you sure you want to delete this prescription?')) {
        prescriptions = prescriptions.filter(prescription => prescription.id !== id);
        saveData();
        displayPrescriptions();
        showNotification('Prescription deleted successfully!', 'success');
    }
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Data persistence (using memory storage as localStorage is not available)
function saveData() {
    // In a real application, this would save to localStorage or a database
    // For this demo, data persists only during the session
    console.log('Data saved:', {
        profile: healthProfile,
        contacts: emergencyContacts,
        doctors: doctors,
        prescriptions: prescriptions
    });
}

function loadData() {
    // In a real application, this would load from localStorage or a database
    // For this demo, we'll populate with some sample data for demonstration
    if (emergencyContacts.length === 0) {
        // Add some sample data for demonstration
        populateSampleData();
    }
    
    // Load profile data into form if it exists
    if (healthProfile.name) {
        document.getElementById('patientName').value = healthProfile.name || '';
        document.getElementById('patientAge').value = healthProfile.age || '';
        document.getElementById('patientCondition').value = healthProfile.condition || '';
        document.getElementById('patientAllergies').value = healthProfile.allergies || '';
        document.getElementById('patientMedications').value = healthProfile.medications || '';
    }
}

function displayData() {
    displayContacts();
    displayDoctors();
    displayPrescriptions();
}

// Sample data for demonstration
function populateSampleData() {
    // Sample health profile
    healthProfile = {
        name: 'John Doe',
        age: '45',
        condition: 'Type 2 Diabetes',
        allergies: 'Penicillin, Shellfish',
        medications: 'Metformin 500mg twice daily, Lisinopril 10mg once daily'
    };
    
    // Sample emergency contact
    emergencyContacts.push({
        id: 1,
        name: 'Jane Doe',
        relation: 'Spouse',
        phone: '+1 (555) 123-4567',
        email: 'jane.doe@email.com'
    });
    
    // Sample doctor
    doctors.push({
        id: 1,
        name: 'Sarah Johnson',
        specialty: 'Endocrinologist',
        phone: '+1 (555) 987-6543',
        email: 'dr.johnson@medicenter.com',
        address: '123 Medical Plaza, Suite 200, Health City, HC 12345'
    });
    
    // Sample prescription
    prescriptions.push({
        id: 1,
        medicineName: 'Quarterly Diabetes Management',
        doctor: 'Dr. Sarah Johnson',
        startDate: '2024-11-15',
        duration: '3',
        reminderTimes: {
            morning: null,
            afternoon: null,
            evening: null
        },
        notes: 'Continue current medication regimen. Schedule follow-up in 3 months.',
        file: null
    });
}

// Enhanced file validation
function validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
        showNotification('Please upload only JPG, PNG, or PDF files', 'error');
        return false;
    }
    
    if (file.size > maxSize) {
        showNotification('File size must be less than 5MB', 'error');
        return false;
    }
    
    return true;
}

// Enhanced prescription form handler with file validation
function handlePrescriptionSubmitEnhanced(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('prescriptionFile');
    const file = fileInput.files[0];
    
    // Validate file if present
    if (file && !validateFile(file)) {
        return;
    }
    
    const prescription = {
        id: Date.now(),
        medicineName: document.getElementById('prescriptionTitle').value,
        doctor: document.getElementById('prescriptionDoctor').value,
        startDate: document.getElementById('prescriptionDate').value,
        duration: document.getElementById('prescriptionDuration').value,
        reminderTimes: {
            morning: document.getElementById('morning').checked ? document.getElementById('morningTime').value : null,
            afternoon: document.getElementById('afternoon').checked ? document.getElementById('afternoonTime').value : null,
            evening: document.getElementById('evening').checked ? document.getElementById('eveningTime').value : null
        },
        notes: document.getElementById('prescriptionNotes').value,
        file: file ? {
            name: file.name,
            data: null
        } : null
    };
    
    // Validate required fields
    if (!prescription.medicineName || !prescription.doctor || !prescription.startDate || !prescription.duration) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate at least one reminder time is selected
    if (!prescription.reminderTimes.morning && !prescription.reminderTimes.afternoon && !prescription.reminderTimes.evening) {
        showNotification('Please select at least one reminder time', 'error');
        return;
    }
    
    // Handle file upload
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            prescription.file.data = e.target.result;
            savePrescriptionAndSetReminders(prescription);
        };
        reader.onerror = function() {
            showNotification('Error reading file. Please try again.', 'error');
        };
        reader.readAsDataURL(file);
    } else {
        savePrescriptionAndSetReminders(prescription);
    }
}

// Search functionality
function setupSearchFunctionality() {
    // Add search input to each section
    const searchHTML = `
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search...">
        </div>
    `;
    
    // This would be added to each list section in a real implementation
}

// Export data functionality
function exportData() {
    const data = {
        profile: healthProfile,
        contacts: emergencyContacts,
        doctors: doctors,
        prescriptions: prescriptions.map(p => ({
            ...p,
            file: p.file ? '[File Data Excluded]' : null
        }))
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'healthcare_data.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
}

// Print functionality for emergency contacts
function printEmergencyContacts() {
    const printWindow = window.open('', '_blank');
    const contactsHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Emergency Contacts</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .contact { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
                .contact h3 { margin: 0 0 10px 0; color: #555; }
                .contact p { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1>Emergency Contacts</h1>
            ${emergencyContacts.map(contact => `
                <div class="contact">
                    <h3>${contact.name}</h3>
                    <p><strong>Relationship:</strong> ${contact.relation}</p>
                    <p><strong>Phone:</strong> ${contact.phone}</p>
                    ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
                </div>
            `).join('')}
        </body>
        </html>
    `;
    
    printWindow.document.write(contactsHTML);
    printWindow.document.close();
    printWindow.print();
}

// Enhanced notification system with different types
function showAdvancedNotification(message, type, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="hideNotification()">&times;</button>
        </div>
    `;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        if (notification.classList.contains('show')) {
            notification.classList.remove('show');
        }
    }, duration);
}

function hideNotification() {
    document.getElementById('notification').classList.remove('show');
}

// Add logout functionality
function logout() {
    localStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

function loadTrackingData() {
    const savedTracking = localStorage.getItem('medicationTracking');
    if (savedTracking) {
        medicationTracking = JSON.parse(savedTracking);
    }
    updateAdherenceDisplay();
}

function saveTrackingData() {
    localStorage.setItem('medicationTracking', JSON.stringify(medicationTracking));
    updateAdherenceDisplay();
}

function getAdherenceClass(rate) {
    if (rate >= 90) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 70) return 'fair';
    return 'poor';
}

function updateAdherenceDisplay() {
    displayPrescriptions(); // Refresh the display to show updated adherence
}

function confirmDose(doseId, medicineName, time, taken) {
    const timestamp = new Date().toISOString();
    const dose = {
        id: doseId,
        medicineName,
        time,
        timestamp,
        taken
    };

    medicationTracking.doses.push(dose);
    
    if (!taken) {
        medicationTracking.missedDoses.push(dose);
    }

    // Calculate adherence rate
    const totalDoses = medicationTracking.doses.length;
    const takenDoses = medicationTracking.doses.filter(d => d.taken).length;
    medicationTracking.adherenceRate = Math.round((takenDoses / totalDoses) * 100);

    saveTrackingData();
    showNotification(
        taken ? 'Medicine taken - Great job!' : 'Dose marked as missed',
        taken ? 'success' : 'error'
    );
}

function setupSOSButton() {
    // Create container for SOS elements
    const sosContainer = document.createElement('div');
    sosContainer.className = 'sos-container';
    document.body.appendChild(sosContainer);

    // Add SOS button
    const sosButton = document.createElement('button');
    sosButton.className = 'sos-button';
    sosButton.innerHTML = `
        <div class="sos-icon">🆘</div>
        <div class="sos-text">SOS</div>
    `;
    sosButton.addEventListener('click', handleSOS);
    sosContainer.appendChild(sosButton);

    // Add timer backdrop
    const timerBackdrop = document.createElement('div');
    timerBackdrop.className = 'timer-backdrop';
    document.body.appendChild(timerBackdrop);

    // Add SOS timer
    const timerElement = document.createElement('div');
    timerElement.className = 'sos-timer';
    timerElement.innerHTML = `
        <div class="timer-label">Emergency Alert Countdown</div>
        <div class="timer-count">30</div>
        <div class="timer-label">seconds remaining</div>
        <button class="timer-cancel">Cancel Emergency</button>
    `;
    document.body.appendChild(timerElement);

    // Add emergency status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'emergency-status';
    statusIndicator.style.display = 'none';
    statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">Emergency Active</span>
        <button class="cancel-emergency">Cancel</button>
    `;
    sosContainer.appendChild(statusIndicator);

    // Add caregiver notification element
    const caregiverNotification = document.createElement('div');
    caregiverNotification.className = 'caregiver-notification';
    document.body.appendChild(caregiverNotification);

    // Add event listeners
    timerElement.querySelector('.timer-cancel').addEventListener('click', cancelSOSTimer);
    statusIndicator.querySelector('.cancel-emergency').addEventListener('click', cancelEmergency);
}

async function handleSOS() {
    if (isEmergencyActive) return;

    const timerElement = document.querySelector('.sos-timer');
    if (!timerElement) {
        console.error('Timer element not found');
        return;
    }

    try {
        // Request location permission
        const permission = await requestLocationPermission();
        if (!permission) {
            showNotification('Location access is required for emergency services', 'error');
            return;
        }

        // Start the countdown timer
        startSOSTimer();

    } catch (error) {
        console.error('Error in SOS:', error);
        showNotification('Failed to activate emergency services', 'error');
    }
}

function startSOSTimer() {
    const timerElement = document.querySelector('.sos-timer');
    const timerBackdrop = document.querySelector('.timer-backdrop');
    const countElement = timerElement.querySelector('.timer-count');
    
    if (!timerElement || !countElement || !timerBackdrop) {
        console.error('Timer elements not found');
        return;
    }

    sosCountdown = 30;
    countElement.textContent = sosCountdown;
    
    // Show timer and backdrop with animation
    timerBackdrop.classList.add('show');
    timerElement.classList.add('show');
    
    // Clear any existing timer
    if (sosTimer) {
        clearInterval(sosTimer);
    }
    
    sosTimer = setInterval(() => {
        sosCountdown--;
        countElement.textContent = sosCountdown;
        
        // Add visual urgency when time is running low
        if (sosCountdown <= 10) {
            countElement.style.color = '#ff0000';
            countElement.style.transform = 'scale(1.1)';
        }
        
        if (sosCountdown <= 0) {
            clearInterval(sosTimer);
            timerElement.classList.remove('show');
            timerBackdrop.classList.remove('show');
            activateEmergency();
        }
    }, 1000);
}

function cancelSOSTimer() {
    const timerElement = document.querySelector('.sos-timer');
    const timerBackdrop = document.querySelector('.timer-backdrop');
    
    if (!timerElement || !timerBackdrop) {
        console.error('Timer elements not found');
        return;
    }

    clearInterval(sosTimer);
    timerElement.classList.remove('show');
    timerBackdrop.classList.remove('show');
    
    // Reset countdown and styles
    sosCountdown = 30;
    const countElement = timerElement.querySelector('.timer-count');
    if (countElement) {
        countElement.style.color = '#ff5252';
        countElement.style.transform = 'none';
    }
    
    showNotification('Emergency alert cancelled', 'success');
}

async function activateEmergency() {
    isEmergencyActive = true;
    updateEmergencyUI(true);
    caregiverResponses.clear();

    // Get initial location
    const location = await getCurrentLocation();
    if (location) {
        lastLocation = location;
        await sendEmergencyAlert(location);
    }

    // Start tracking location
    locationUpdateInterval = setInterval(async () => {
        const newLocation = await getCurrentLocation();
        if (newLocation && (!lastLocation || isSignificantMove(lastLocation, newLocation))) {
            lastLocation = newLocation;
            updateEmergencyContacts(newLocation);
        }
    }, 30000); // Update every 30 seconds
}

function updateEmergencyUI(isActive) {
    const sosButton = document.querySelector('.sos-button');
    const statusIndicator = document.querySelector('.emergency-status');
    
    if (isActive) {
        sosButton.classList.add('active');
        statusIndicator.style.display = 'flex';
    } else {
        sosButton.classList.remove('active');
        statusIndicator.style.display = 'none';
    }
}

async function requestLocationPermission() {
    try {
        if (!navigator.geolocation) {
            showNotification('Geolocation is not supported by your browser', 'error');
            return false;
        }

        const permission = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                () => resolve(false)
            );
        });

        return permission;
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
}

async function getCurrentLocation() {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
}

function isSignificantMove(oldLocation, newLocation) {
    // Calculate distance between points (using Haversine formula)
    const R = 6371e3; // Earth's radius in meters
    const φ1 = oldLocation.latitude * Math.PI/180;
    const φ2 = newLocation.latitude * Math.PI/180;
    const Δφ = (newLocation.latitude - oldLocation.latitude) * Math.PI/180;
    const Δλ = (newLocation.longitude - oldLocation.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Return true if moved more than 10 meters
    return distance > 10;
}

async function sendEmergencyAlert(location) {
    if (!emergencyContacts.length) {
        showNotification('No emergency contacts found. Please add contacts first.', 'error');
        return;
    }

    const mapLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    
    // Show emergency status to user
    showNotification('Emergency alert sent to all caregivers', 'success');
    
    // In a real application, these would be actual API calls to notification services
    emergencyContacts.forEach(async (contact) => {
        // Simulate sending SMS
        console.log(`[SMS to ${contact.phone}] EMERGENCY ALERT: ${healthProfile.name} needs immediate assistance!`);
        
        // Simulate sending Email
        console.log(`[Email to ${contact.email}] 
            Subject: URGENT: Emergency Alert for ${healthProfile.name}
            Body: Emergency assistance required!
            Patient: ${healthProfile.name}
            Location: ${mapLink}
            Medical Info:
            - Condition: ${healthProfile.condition}
            - Allergies: ${healthProfile.allergies}
            - Current Medications: ${healthProfile.medications}
        `);

        // Show notification preview to user
        showCaregiverNotificationPreview(contact);
        
        // Simulate caregiver responses after random delays
        simulateCaregiverResponse(contact);
    });
}

function showCaregiverNotificationPreview(contact) {
    // Create container for notification
    const previewContainer = document.createElement('div');
    previewContainer.className = 'notification-preview';
    previewContainer.innerHTML = `
        <div class="notification-preview-content">
            <div class="preview-header">
                <i class="fas fa-bell"></i>
                <span>Emergency Alert Sent</span>
            </div>
            <div class="preview-body">
                <p><strong>Contact:</strong> ${contact.name}</p>
                <p><strong>Via SMS:</strong> ${contact.phone}</p>
                ${contact.email ? `<p><strong>Via Email:</strong> ${contact.email}</p>` : ''}
            </div>
        </div>
    `;

    // Add to document
    document.body.appendChild(previewContainer);
    
    // Remove existing notifications after a delay
    setTimeout(() => {
        if (previewContainer && previewContainer.parentElement) {
            previewContainer.style.transform = 'translateX(100%)';
            previewContainer.style.opacity = '0';
            setTimeout(() => {
                if (previewContainer.parentElement) {
                    previewContainer.remove();
                }
            }, 300);
        }
    }, 5000);

    // Reposition existing notifications if any
    const existingNotifications = document.querySelectorAll('.notification-preview');
    existingNotifications.forEach((notification, index) => {
        if (index > 0) {
            notification.style.top = `${(index * 80) + 20}px`;
        }
    });
}

function simulateCaregiverResponse(contact) {
    // Simulate different response times between 5-15 seconds
    const responseTime = Math.random() * 10000 + 5000;
    
    setTimeout(() => {
        if (!isEmergencyActive) return; // Don't show if emergency was cancelled
        
        const responses = [
            'acknowledged and is on their way',
            'received the alert and called emergency services',
            'is coordinating with other caregivers'
        ];
        
        const responseType = responses[Math.floor(Math.random() * responses.length)];
        showCaregiverResponse(contact, responseType);
    }, responseTime);
}

function showCaregiverResponse(contact, responseType) {
    const notification = document.querySelector('.caregiver-notification');
    if (!notification) return;

    notification.innerHTML = `
        <div class="notification-preview-content">
            <div class="preview-header">
                <i class="fas fa-check-circle"></i>
                <span>Caregiver Response</span>
            </div>
            <div class="preview-body">
                <p><strong>${contact.name}</strong> has ${responseType}</p>
                <small class="response-time">Just now</small>
            </div>
            <div class="notification-actions">
                <button class="btn-acknowledge" onclick="acknowledgeCaregiverResponse('${contact.id}')">
                    Acknowledge
                </button>
            </div>
        </div>
    `;

    // Show notification with animation
    notification.style.display = 'block';
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Update emergency status
    caregiverResponses.add(contact.id);
    updateEmergencyStatus();
}

function updateEmergencyStatus() {
    const statusIndicator = document.querySelector('.emergency-status');
    const respondedCount = caregiverResponses.size;
    const totalContacts = emergencyContacts.length;
    
    if (statusIndicator) {
        const statusText = statusIndicator.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = `Emergency Active - ${respondedCount}/${totalContacts} Caregivers Responded`;
        }
    }
}

function cancelEmergency() {
    if (!isEmergencyActive) return;

    isEmergencyActive = false;
    clearInterval(locationUpdateInterval);
    updateEmergencyUI(false);
    notifyEmergencyCancellation();
    caregiverResponses.clear();
    
    showNotification('Emergency cancelled - Notifying caregivers', 'success');
}

function notifyEmergencyCancellation() {
    emergencyContacts.forEach(contact => {
        // In a real application, these would be actual API calls
        console.log(`[SMS to ${contact.phone}] Emergency alert cancelled by ${healthProfile.name}. No further action needed.`);
        
        if (contact.email) {
            console.log(`[Email to ${contact.email}] 
                Subject: Emergency Alert Cancelled - ${healthProfile.name}
                Body: The emergency alert has been cancelled. No further action is needed.
            `);
        }
    });
}

function updateEmergencyContacts(location) {
    if (!emergencyContacts.length) return;

    const mapLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `Location Update: ${healthProfile.name}'s current location: ${mapLink}`;

    // Send location updates to all emergency contacts
    emergencyContacts.forEach(contact => {
        // In a real application, you would integrate with SMS/Email API services here
        console.log(`Location update sent to ${contact.name}:`, message);
    });
}