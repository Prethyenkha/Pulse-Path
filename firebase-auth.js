// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCx15WpXHMblJfhqP_nSDcR61NhhwZs1iY",
    authDomain: "autoimmune-tracker.firebaseapp.com",
    projectId: "autoimmune-tracker",
    storageBucket: "autoimmune-tracker.firebasestorage.app",
    messagingSenderId: "141163406671",
    appId: "1:141163406671:web:42160dfbcb44638239513a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to LOCAL
try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Persistence set to LOCAL');
} catch (error) {
    console.error('Error setting persistence:', error);
}

// Function to check if user is authenticated
export function initializeAuth(onUserSignedIn = null) {
    console.log('Initializing Firebase Auth...');
    return new Promise((resolve, reject) => {
        // Keep track of initial auth check
        let initialAuthCheckDone = false;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', user ? `User ${user.email}` : 'No user');
            
            if (!initialAuthCheckDone) {
                initialAuthCheckDone = true;
                if (user) {
                    if (onUserSignedIn) onUserSignedIn(user);
                    resolve(user);
                } else {
                    console.log('No user signed in, redirecting to login...');
                    window.location.href = 'login.html';
                    reject('No user signed in');
                }
            } else if (!user) {
                // If user signs out after initial check
                console.log('User signed out, redirecting to login...');
                window.location.href = 'login.html';
            }
        });

        // Attach unsubscribe to window to prevent garbage collection
        window._authUnsubscribe = unsubscribe;
    });
}

// Function to handle logout
export async function handleLogout() {
    try {
        // Clean up auth listener if it exists
        if (window._authUnsubscribe) {
            window._authUnsubscribe();
            delete window._authUnsubscribe;
        }
        
        await signOut(auth);
        console.log('User signed out successfully');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}

// Function to show notifications
export function showNotification(message, type) {
    console.log('Showing notification:', { message, type });
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Export Firebase instances
export { auth, db }; 