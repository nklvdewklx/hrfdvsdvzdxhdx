// js/ui-login.js
import { api } from './api.js';
import { ui } from './ui.js';

export function renderLoginPage() {
    ui.elements.mainContent.innerHTML = `
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="glass-panel rounded-lg w-full max-w-sm transform transition-all duration-300">
            <div class="p-6 text-center">
                <h2 class="text-3xl font-bold text-white mb-4">Welcome to ROCTEC</h2>
                <p class="text-custom-grey mb-6">Please log in to continue.</p>
                <form id="loginPageForm" class="space-y-4">
                    <div>
                        <label for="username" class="block mb-1 text-sm text-custom-grey text-left">Username</label>
                        <input type="text" id="username" name="username" class="form-input" placeholder="Enter username" value="john.doe" required>
                    </div>
                    <div>
                        <label for="password" class="block mb-1 text-sm text-custom-grey text-left">Password</label>
                        <input type="password" id="password" name="password" class="form-input" placeholder="Enter password" value="$2a$12$eI.g8c.FxU38Y6R..1234uR5D0n6oACDRV3b2s.2s.3b4s.5s.6b7" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mt-4">
                        Login
                    </button>
                </form>
            </div>
        </div>
    </div>
    `;
    lucide.createIcons();

    document.getElementById('loginPageForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        
        // --- UPDATED REDIRECTION LOGIC ---
        const userRole = api.security.login(username, password);
        
        if (userRole) {
            if (userRole === 'sales') {
                // If user is an agent, go to the new agent dashboard
                window.location.href = 'agent.html';
            } else {
                // Otherwise, go to the main admin dashboard
                window.location.hash = '#dashboard';
            }
        }
    });
}