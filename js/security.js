// js/security.js
import { App } from './state.js';
import { apiCore } from './api-core.js';
import { showToast } from './toast.js';

export const security = {
    login(username, password) {
        const user = App.state.db.users.find(u => u.username === username);

        // --- IMPORTANT SECURITY FIX ---
        // In a real application, this is where you would use a library like bcrypt
        // to compare the entered password with the stored hash.
        // For example: const isValid = await bcrypt.compare(password, user.password);
        // For our simulation, we are just directly comparing the "hashed" password.
        
        if (user && user.password === password) {
            App.state.currentUser = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            };
            apiCore.logEvent('USER_LOGIN', `User ${username} logged in successfully (Role: ${user.role})`);
            apiCore.save();
            showToast(`Welcome, ${user.name}!`, 'success');
            
            // --- NEW REDIRECTION LOGIC ---
            // We return the user's role to the caller, so it can decide where to redirect.
            return user.role; 
        } else {
            apiCore.logEvent('LOGIN_FAILED', `Failed login attempt for username: ${username}`);
            showToast('Invalid username or password.', 'error');
            return null; // Return null on failure
        }
    },

    logout() {
        if (App.state.currentUser) {
            apiCore.logEvent('USER_LOGOUT', `User ${App.state.currentUser.username} logged out.`);
            App.state.currentUser = null;
            apiCore.save();
            showToast('You have been logged out.', 'info');
        }
    },

    isLoggedIn() {
        return App.state.currentUser !== null;
    },

    getCurrentUserRole() {
        return App.state.currentUser ? App.state.currentUser.role : null;
    },

    hasRole(requiredRoles) {
        if (!App.state.currentUser) {
            return false;
        }
        const userRole = App.state.currentUser.role;
        if (Array.isArray(requiredRoles)) {
            return requiredRoles.includes(userRole);
        } else {
            return userRole === requiredRoles;
        }
    },

    getCurrentUserNameForAudit() {
        return App.state.currentUser ? `${App.state.currentUser.name} (${App.state.currentUser.username})` : 'Guest User';
    }
};