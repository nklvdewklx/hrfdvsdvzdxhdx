// js/auth-modal.js
import { api } from './api.js'; // To call api.security.login
import { ui } from './ui.js';   // To close modal

export function renderAuthModal() {
    return `
    <div id="authModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="glass-panel rounded-lg w-full max-w-sm transform transition-all duration-300">
            <div class="p-6 text-center">
                <h2 class="text-3xl font-bold text-white mb-4">Welcome to ROCTEC</h2>
                <p class="text-custom-grey mb-6">Please log in to continue.</p>
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label for="username" class="block mb-1 text-sm text-custom-grey text-left">Username</label>
                        <input type="text" id="username" name="username" class="form-input" placeholder="Enter username" required>
                    </div>
                    <div>
                        <label for="password" class="block mb-1 text-sm text-custom-grey text-left">Password</label>
                        <input type="password" id="password" name="password" class="form-input" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mt-4">
                        Login
                    </button>
                </form>
            </div>
        </div>
    </div>
    `;
}