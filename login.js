import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    // Real-time validation
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();

        if (isEmailValid && isPasswordValid) {
            try {
                const email = emailInput.value;
                const password = passwordInput.value;

                // Handle demo account
                if (email === 'demo@example.com' && password === 'password123') {
                    // Create demo account in Firebase if it doesn't exist
                    try {
                        await signInWithEmailAndPassword(auth, email, password);
                    } catch (error) {
                        if (error.code === 'auth/user-not-found') {
                            // Demo account doesn't exist yet, show error
                            showNotification('Demo account is not set up. Please register first.', 'error');
                            return;
                        }
                    }
                }

                // Sign in with Firebase
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Store remember me preference
                if (document.getElementById('remember').checked) {
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('rememberMe');
                }

                console.log('Successfully logged in:', user.email);
                showNotification('Login successful!', 'success');

                // Redirect to main application
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Invalid email or password';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed attempts. Please try again later';
                        break;
                }
                
                showNotification(errorMessage, 'error');
            }
        }
    });
});

// Notification function
function showNotification(message, type) {
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