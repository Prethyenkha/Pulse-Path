// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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

export { app, db, auth }; 