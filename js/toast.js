// js/toast.js

const toastContainer = document.getElementById('toast-container');

export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: `<i data-lucide="check-circle" class="text-green-400"></i>`,
        error: `<i data-lucide="alert-circle" class="text-red-400"></i>`,
    }[type];

    toast.innerHTML = `${icon} <p>${message}</p>`;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Animate out and remove after a few seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 4000);
}