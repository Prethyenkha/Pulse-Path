import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    where,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { getToken } from 'firebase/messaging';

import { db, auth } from './firebase-config.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCx15WpXHMblJfhqP_nSDcR61NhhwZs1iY",
    authDomain: "autoimmune-tracker.firebaseapp.com",
    projectId: "autoimmune-tracker",
    storageBucket: "autoimmune-tracker.appspot.com",
    messagingSenderId: "141163406671",
    appId: "1:141163406671:web:42160dfbcb44638239513a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Save data to Firestore
export async function saveData(collectionName, data) {
    console.group(`Saving data to ${collectionName}`);
    console.log('Input data:', data);
    
    try {
        // Check authentication
        const user = auth.currentUser;
        if (!user) {
            console.error('No user logged in');
            throw new Error('Please log in to save data');
        }

        // Prepare data with metadata
        const dataWithMetadata = {
            ...data,
            userId: user.uid,
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        };

        // Save to Firestore
        const docRef = await addDoc(collection(db, collectionName), dataWithMetadata);
        console.log('Document saved:', docRef.id);
        
        return { id: docRef.id, ...dataWithMetadata };
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    } finally {
        console.groupEnd();
    }
}

// Get data from Firestore
export async function getData(collectionName) {
    console.group(`Getting data from ${collectionName}`);
    
    try {
        // Check authentication
        const user = auth.currentUser;
        if (!user) {
            console.error('No user logged in');
            throw new Error('Please log in to view data');
        }

        // Query data
        const q = query(
            collection(db, collectionName),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        console.log('Executing query for collection:', collectionName);
        const querySnapshot = await getDocs(q);
        const data = [];
        
        querySnapshot.forEach((doc) => {
            const docData = doc.data();
            console.log('Document data:', docData);
            data.push({
                id: doc.id,
                ...docData
            });
        });

        console.log(`Retrieved ${data.length} documents:`, data);
        return data;
    } catch (error) {
        console.error('Error getting data:', error);
        throw error;
    } finally {
        console.groupEnd();
    }
}

// Format data for display
export function formatData(data, type) {
    try {
        const timestamp = data.timestamp?.toDate() || new Date();
        const formattedDate = timestamp.toLocaleString();
        
        let html = '<div class="data-item">';
        
        switch (type) {
            case 'profiles':
                html += `
                    <h3>${data.name || 'Unnamed Profile'}</h3>
                    <p><strong>Age:</strong> ${data.age || 'Not specified'}</p>
                    <p><strong>Medical History:</strong> ${data.medicalHistory || 'None'}</p>
                    <p class="timestamp">Added: ${formattedDate}</p>
                `;
                break;
            
            case 'medications':
                html += `
                    <h3>${data.name || 'Unnamed Medication'}</h3>
                    <p><strong>Dosage:</strong> ${data.dosage || 'Not specified'}</p>
                    <p><strong>Schedule:</strong> ${data.schedule || 'Not specified'}</p>
                    <p class="timestamp">Added: ${formattedDate}</p>
                `;
                break;
            
            case 'appointments':
                html += `
                    <h3>Appointment with ${data.doctor || 'Unnamed Doctor'}</h3>
                    <p><strong>Date:</strong> ${data.date || 'Not specified'}</p>
                    <p><strong>Notes:</strong> ${data.notes || 'None'}</p>
                    <p class="timestamp">Added: ${formattedDate}</p>
                `;
                break;
            
            case 'caregivers':
                html += `
                    <h3>${data.name || 'Unnamed Caregiver'}</h3>
                    <p><strong>Relationship:</strong> ${data.relationship || 'Not specified'}</p>
                    <p><strong>Contact:</strong> ${data.contact || 'Not specified'}</p>
                    <p class="timestamp">Added: ${formattedDate}</p>
                `;
                break;
            
            default:
                html += '<p>Unknown data type</p>';
        }
        
        html += '</div>';
        return html;
    } catch (error) {
        console.error('Error formatting data:', error);
        return `
            <div class="data-item error">
                <p>Error displaying data</p>
                <p class="error-message">${error.message}</p>
            </div>
        `;
    }
}

// Authentication Services
export const firebaseAuth = {
    // Register new user
    async register(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                ...userData,
                email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return user;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Login user
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Logout user
    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Reset password
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

// User Profile Services
export const userService = {
    // Get user profile
    async getUserProfile(userId) {
        try {
            const docRef = doc(db, 'users', userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            }
            throw new Error('User profile not found');
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Update user profile
    async updateProfile(userId, data) {
        try {
            const docRef = doc(db, 'users', userId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

// Emergency Contact Services
export const contactService = {
    // Add emergency contact
    async addContact(userId, contactData) {
        try {
            const contactRef = doc(collection(db, 'users', userId, 'contacts'));
            await setDoc(contactRef, {
                ...contactData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return contactRef.id;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Get all contacts
    async getContacts(userId) {
        try {
            const q = query(collection(db, 'users', userId, 'contacts'));
            return new Promise((resolve, reject) => {
                onSnapshot(q, 
                    (snapshot) => {
                        const contacts = [];
                        snapshot.forEach((doc) => {
                            contacts.push({ id: doc.id, ...doc.data() });
                        });
                        resolve(contacts);
                    },
                    (error) => reject(error)
                );
            });
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Update contact
    async updateContact(userId, contactId, data) {
        try {
            const contactRef = doc(db, 'users', userId, 'contacts', contactId);
            await updateDoc(contactRef, {
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Delete contact
    async deleteContact(userId, contactId) {
        try {
            await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

// Prescription Services
export const prescriptionService = {
    // Add prescription
    async addPrescription(userId, prescriptionData) {
        try {
            const prescriptionRef = doc(collection(db, 'users', userId, 'prescriptions'));
            await setDoc(prescriptionRef, {
                ...prescriptionData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return prescriptionRef.id;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Get all prescriptions
    async getPrescriptions(userId) {
        try {
            const q = query(collection(db, 'users', userId, 'prescriptions'));
            return new Promise((resolve, reject) => {
                onSnapshot(q, 
                    (snapshot) => {
                        const prescriptions = [];
                        snapshot.forEach((doc) => {
                            prescriptions.push({ id: doc.id, ...doc.data() });
                        });
                        resolve(prescriptions);
                    },
                    (error) => reject(error)
                );
            });
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Upload prescription file
    async uploadPrescriptionFile(userId, prescriptionId, file) {
        try {
            const fileRef = ref(storage, `prescriptions/${userId}/${prescriptionId}/${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            
            // Update prescription with file URL
            const prescriptionRef = doc(db, 'users', userId, 'prescriptions', prescriptionId);
            await updateDoc(prescriptionRef, {
                fileUrl: downloadURL,
                fileName: file.name,
                updatedAt: new Date().toISOString()
            });
            
            return downloadURL;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

// Emergency Services
export const emergencyService = {
    // Create emergency alert
    async createEmergencyAlert(userId, location) {
        try {
            const alertRef = doc(collection(db, 'emergencyAlerts'));
            const userProfile = await userService.getUserProfile(userId);
            
            await setDoc(alertRef, {
                userId,
                userProfile,
                location,
                status: 'active',
                responses: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Get user's emergency contacts
            const contacts = await contactService.getContacts(userId);
            
            // Create notifications for each contact
            contacts.forEach(async (contact) => {
                await this.notifyContact(alertRef.id, contact, userProfile, location);
            });

            return alertRef.id;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Notify emergency contact
    async notifyContact(alertId, contact, userProfile, location) {
        try {
            const notificationRef = doc(collection(db, 'notifications'));
            await setDoc(notificationRef, {
                alertId,
                contactId: contact.id,
                userProfile,
                location,
                status: 'sent',
                createdAt: new Date().toISOString()
            });

            // If contact has a FCM token, send push notification
            if (contact.fcmToken) {
                // Send FCM notification (implement with Cloud Functions)
                console.log('Sending FCM notification to:', contact.fcmToken);
            }
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Update emergency alert status
    async updateAlertStatus(alertId, status) {
        try {
            const alertRef = doc(db, 'emergencyAlerts', alertId);
            await updateDoc(alertRef, {
                status,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Record caregiver response
    async recordCaregiverResponse(alertId, caregiverId, responseType) {
        try {
            const alertRef = doc(db, 'emergencyAlerts', alertId);
            const alertDoc = await getDoc(alertRef);
            
            if (alertDoc.exists()) {
                const responses = alertDoc.data().responses || [];
                responses.push({
                    caregiverId,
                    responseType,
                    timestamp: new Date().toISOString()
                });
                
                await updateDoc(alertRef, {
                    responses,
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

// Push Notification Services
export const notificationService = {
    // Request notification permission and get FCM token
    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await getToken(messaging);
                return token;
            }
            throw new Error('Notification permission denied');
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Save FCM token to user profile
    async saveFCMToken(userId, token) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                fcmToken: token,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export { db, auth }; 