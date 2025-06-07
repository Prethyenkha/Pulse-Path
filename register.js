import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Register page loaded');
    console.log('Checking Firebase initialization...');
    console.log('Auth instance:', auth);
    console.log('Firestore instance:', db);

    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateFullName() {
        if (fullNameInput.value.trim().length < 2) {
            nameError.classList.add('show');
            return false;
        }
        nameError.classList.remove('show');
        return true;
    }

    function validateEmail() {
        if (!emailRegex.test(emailInput.value)) {
            emailError.classList.add('show');
            return false;
        }
        emailError.classList.remove('show');
        return true;
    }

    function validatePassword() {
        if (passwordInput.value.length < 6) {
            passwordError.classList.add('show');
            return false;
        }
        passwordError.classList.remove('show');
        return true;
    }

    function validateConfirmPassword() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordError.classList.add('show');
            return false;
        }
        confirmPasswordError.classList.remove('show');
        return true;
    }

    // Real-time validation
    fullNameInput.addEventListener('input', validateFullName);
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');

        const isNameValid = validateFullName();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();

        console.log('Validation results:', {
            name: isNameValid,
            email: isEmailValid,
            password: isPasswordValid,
            confirmPassword: isConfirmPasswordValid
        });

        if (isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid) {
            try {
                const email = emailInput.value;
                const password = passwordInput.value;
                console.log('Attempting to create user with email:', email);

                // Create user in Firebase Authentication
                console.log('Calling createUserWithEmailAndPassword...');
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                // Get the user object
                const user = userCredential.user;
                console.log('User created successfully:', user);

                // Create user profile in Firestore
                console.log('Creating user profile in Firestore...');
                const userData = {
                    fullName: fullNameInput.value,
                    email: email,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                console.log('User data to save:', userData);

                await setDoc(doc(db, 'users', user.uid), userData);
                console.log('User profile created in Firestore');

                console.log('Successfully registered:', user.email);
                showNotification('Registration successful!', 'success');
                
                // Redirect to main application after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } catch (error) {
                console.error('Registration error:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack
                });

                let errorMessage = 'Registration failed';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Email already registered';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Email/password accounts are not enabled';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Password is too weak';
                        break;
                    default:
                        errorMessage = `Registration failed: ${error.message}`;
                }
                
                showNotification(errorMessage, 'error');
            }
        }
    });
});

// Notification function
function showNotification(message, type) {
    console.log('Showing notification:', { message, type });
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }

    // Set notification content and style
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
} 