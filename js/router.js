// js/router.js
import { App } from './state.js';
import { ui } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { renderLoginPage } from './ui-login.js';
import { api } from './api.js';

export const router = {
    init() {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link-contracts')) {
                e.preventDefault();
                window.location.hash = e.target.getAttribute('href');
            }
        });

        document.getElementById('main-nav').addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
                e.preventDefault();
                window.location.hash = e.target.getAttribute('href');
            }
        });

        window.addEventListener('hashchange', () => this.handleRouteChange());
        this.handleRouteChange(); // Initial load
    },

    handleRouteChange(forceHash = window.location.hash) {
        const hash = forceHash || '#dashboard';
        const parts = hash.replace('#', '').split('/');
        App.state.currentPage = parts[0];
        const detailId = parts[1];

        if (App.state.currentPage !== 'login' && !api.security.isLoggedIn()) {
            window.location.hash = '#login';
            return;
        }

        if (App.state.currentPage === 'login' && api.security.isLoggedIn()) {
            window.location.hash = '#dashboard';
            return;
        }

        this.renderCurrentPage(detailId);
        this.updateNavLinks();
    },
    
    renderCurrentPage(detailId = null) {
        const pageId = App.state.currentPage;
        const mainContent = ui.elements.mainContent;

        const headerElement = document.getElementById('header');
        if (headerElement) {
            headerElement.classList.toggle('hidden', pageId === 'login');
        }
        ui.toggleSidebars(pageId === 'dashboard');

        if (pageId === 'dashboard' || pageId === '') {
            mainContent.classList.add('pointer-events-none');
            mainContent.classList.remove('pointer-events-auto');
        } else {
            mainContent.classList.remove('pointer-events-none');
            mainContent.classList.add('pointer-events-auto');
        }

        if (pageId === 'login') {
            renderLoginPage();
            return;
        }

        ui.toggleAppVisibility(true);

        if (detailId) {
            ui.renderDetailPage(pageId, detailId);
        } else if (pageId === 'dashboard' || pageId === '') {
            mainContent.innerHTML = ''; 
            renderDashboard();
        } else {
            ui.renderManagementPage(pageId);
        }
    },

    updateNavLinks() {
        const currentPage = App.state.currentPage || 'dashboard';
        const userRole = api.security.getCurrentUserRole();
        const isLoggedIn = api.security.isLoggedIn();

        document.querySelectorAll('.nav-link').forEach(link => {
            const linkHref = link.getAttribute('href').replace('#', '');
            const isActive = linkHref === currentPage || (currentPage.startsWith(linkHref) && linkHref !== 'dashboard' && linkHref !== '');

            link.classList.toggle('text-white', isActive);
            link.classList.toggle('font-semibold', isActive);
            link.classList.toggle('text-custom-grey', !isActive);

            let shouldBeVisible = false;
            if (!isLoggedIn) {
                shouldBeVisible = false;
            } 
            
            else if (userRole === 'admin') {
                shouldBeVisible = true;
            } 
            
            else if (userRole === 'sales') {
                // --- UPDATED: Sales role can now see quotes ---
                shouldBeVisible = ['dashboard', 'leads', 'quotes', 'orders', 'invoices', 'customers', 'agents', 'reports', 'customerContracts'].includes(linkHref);
            } 
            
            else if (userRole === 'inventory') {
                shouldBeVisible = ['dashboard', 'inventory', 'components', 'productionOrders', 'purchaseOrders', 'suppliers', 'reports'].includes(linkHref);
            } 
            
            else if (userRole === 'finance') {
                shouldBeVisible = ['dashboard', 'orders', 'invoices', 'creditNotes', 'customers', 'reports', 'events', 'customerContracts'].includes(linkHref);
            }
            
            console.debug(userRole);
            if ((App.state.currentPage === 'users' || App.state.currentPage === 'taxRates' || App.state.currentPage === 'currencies') && userRole !== 'admin') {
                shouldBeVisible = false;
            }
    

            link.style.display = shouldBeVisible ? 'block' : 'none';
        });

        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            const dropdownLinks = Array.from(dropdown.querySelectorAll('.nav-dropdown-menu .nav-link'));
            const anyChildLinkVisible = dropdownLinks.some(link => link.style.display === 'block');
            dropdown.style.display = anyChildLinkVisible ? 'block' : 'none';
        });

        const mainNavContainer = document.getElementById('main-nav');
        if (mainNavContainer) {
            mainNavContainer.style.display = isLoggedIn ? 'flex' : 'none';
        }
    }
};