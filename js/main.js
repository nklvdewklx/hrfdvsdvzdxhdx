// js/main.js
import { App } from './state.js';
import { api } from './api.js';
import { ui } from './ui.js';
import { mapService } from './map.js';
import { router } from './router.js';
import { renderDashboard } from './dashboard.js';
import { showToast } from './toast.js';

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const resource = form.dataset.resource || App.state.currentPage;

    let authorized = false;
    const currentUserRole = api.security.getCurrentUserRole();

    switch (resource) {
        case 'users':
        case 'agents':
        case 'customers':
        case 'suppliers':
        case 'components':
        case 'inventory':
            authorized = api.security.hasRole(['admin', 'inventory']);
            break;
        case 'leads':
        case 'quotes':
        case 'orders':
        case 'creditNotes':
        case 'customerContracts':
            authorized = api.security.hasRole(['admin', 'sales', 'finance']);
            break;
        case 'purchaseOrders':
            authorized = api.security.hasRole(['admin', 'inventory']);
            break;
        case 'invoices':
        case 'taxRates':
            authorized = api.security.hasRole('admin');
            break;
        default:
            authorized = api.security.hasRole('admin');
            break;
    }

    if (!authorized) {
        showToast('You are not authorized to perform this action.', 'error');
        return;
    }

    let data;

    if (resource === 'orders' || resource === 'purchaseOrders' || resource === 'quotes') {
        const lineItemRows = form.querySelectorAll('.line-item-row');
        let items;
        if (resource === 'orders' || resource === 'quotes') {
            items = Array.from(lineItemRows).map(row => ({
                productId: parseInt(row.querySelector('[name="productId"]').value, 10),
                quantity: parseInt(row.querySelector('[name="quantity"]').value, 10)
            }));
        } else { // purchaseOrders
            items = Array.from(lineItemRows).map(row => ({
                componentId: parseInt(row.querySelector('[name="componentId"]').value, 10),
                quantity: parseInt(row.querySelector('[name="quantity"]').value, 10)
            }));
        }
        
        const formData = new FormData(form);
        data = Object.fromEntries(formData.entries());
        data.items = items.filter(item => item.quantity > 0);

        if (resource === 'quotes') {
            data.leadId = data.leadId ? parseInt(data.leadId, 10) : null;
            data.customerId = data.customerId ? parseInt(data.customerId, 10) : null;
            if (!data.leadId && !data.customerId) {
                showToast('A quote must be linked to either a Lead or a Customer.', 'error');
                return;
            }
            if (data.leadId && data.customerId) {
                showToast('A quote can only be linked to one recipient (Lead or Customer).', 'error');
                return;
            }
        }

    } else if (resource === 'inventory') {
        const formData = new FormData(form);
        data = Object.fromEntries(formData.entries());
        const tierRows = form.querySelectorAll('.pricing-tier-row');
        data.pricingTiers = Array.from(tierRows).map(row => ({
            minQty: parseInt(row.querySelector('[name="tier_minQty"]').value, 10),
            price: parseFloat(row.querySelector('[name="tier_price"]').value)
        })).sort((a, b) => a.minQty - b.minQty);
        delete data.tier_minQty;
        delete data.tier_price;
        const bomRows = form.querySelectorAll('.bom-row');
        data.bom = Array.from(bomRows).map(row => ({
            componentId: parseInt(row.querySelector('[name="bom_componentId"]').value, 10),
            quantity: parseInt(row.querySelector('[name="bom_quantity"]').value, 10)
        }));
        delete data.bom_componentId;
        delete data.bom_quantity;
        data.cost = parseFloat(data.cost);
        data.shelfLifeDays = parseInt(data.shelfLifeDays, 10);
    } else {
        const formData = new FormData(form);
        data = Object.fromEntries(formData.entries());
        if (resource === 'customers') {
            const selectedDays = Array.from(form.querySelectorAll('input[name="visitDay"]:checked')).map(cb => cb.value);
            data.visitSchedule = { days: selectedDays, frequency: data['visitSchedule.frequency'] };
            delete data['visitSchedule.frequency'];
            delete data['visitDay'];
        }
        
        if (resource === 'users' && data.password && data.password.length > 0) {
            data.password = `$2a$12$NEW${Date.now().toString(36).toUpperCase()}`;
            showToast('Password has been securely stored (simulated).', 'success');
        } else if (resource === 'users') {
            delete data.password;
        }

        if (resource === 'customerContracts') {
            data.customerId = parseInt(data.customerId, 10);
            data.productId = parseInt(data.productId, 10);
            data.contractPrice = parseFloat(data.contractPrice);
        }
        if (resource === 'taxRates') {
            data.rate = parseFloat(data.rate);
            data.isDefault = form.querySelector('[name="isDefault"]').checked;
            if (data.isDefault) {
                App.state.db.taxRates.forEach(rate => {
                    if (rate.id != App.state.currentEditId) {
                        rate.isDefault = false;
                    }
                });
            }
        }
        Object.keys(data).forEach(key => {
            if (['price', 'cost', 'stock', 'agentId', 'customerId', 'shelfLifeDays', 'leadId'].includes(key)) {
                const num = parseFloat(data[key]);
                if (!isNaN(num)) data[key] = num;
            }
        });
    }

    if (App.state.currentEditId) {
        api.update(resource, App.state.currentEditId, data);
    } else {
        if (resource === 'agents' || resource === 'customers' || resource === 'leads') {
            data.lat = 52.21; data.lng = 5.29;
        }
        if (resource === 'orders') {
            if (api.security.getCurrentUserRole() === 'sales' && (!data.agentId || data.agentId === 1)) {
                data.agentId = App.state.currentUser?.id || 1;
            }
            data.date = new Date().toISOString().split('T')[0];
        }
        if (resource === 'purchaseOrders') {
            const poCount = App.state.db.purchaseOrders.length + 1;
            data.poNumber = `PO-2025-${String(poCount).padStart(3, '0')}`;
            data.issueDate = new Date().toISOString().split('T')[0];
        }
        if (resource === 'quotes') {
            const quoteCount = App.state.db.quotes.length + 1;
            data.quoteNumber = `Q-2025-${String(quoteCount).padStart(3, '0')}`;
        }
        api.add(resource, data);
    }

    api.save();
    
    if (resource === 'customerContracts') {
        const customerId = data.customerId;
        window.location.hash = `#customers/${customerId}`;
    } else {
        router.renderCurrentPage();
    }

    if (['agents', 'customers'].includes(resource)) {
        mapService.renderMarkers();
    }
    ui.modals.closeAllModals();
    renderDashboard();
    api.notifications.checkAndGenerateProactiveNotifications();
}

function updateNotificationCount() {
    const unreadCount = api.notifications.getNotifications(true).length;
    const notificationBadge = document.getElementById('notification-count-badge');
    if (notificationBadge) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.classList.toggle('hidden', unreadCount === 0);
    }
}

function renderNotificationsDropdown() {
    const notifications = api.notifications.getNotifications();
    const dropdownContent = document.getElementById('notification-dropdown-content');
    if (!dropdownContent) return;

    if (notifications.length === 0) {
        dropdownContent.innerHTML = '<p class="text-custom-grey p-4 text-center">No notifications.</p>';
        return;
    }
    dropdownContent.innerHTML = notifications.map(n => `
        <div class="notification-item p-3 border-b border-white/10 last:border-b-0 ${n.read ? 'opacity-60' : 'font-semibold'}" data-id="${n.id}">
            <p class="text-sm text-white flex items-center gap-2">
                ${n.type === 'warning' ? '<i data-lucide="alert-triangle" class="w-4 h-4 text-yellow-400"></i>' :
                   n.type === 'error' ? '<i data-lucide="x-circle" class="w-4 h-4 text-red-400"></i>' :
                   n.type === 'success' ? '<i data-lucide="check-circle" class="w-4 h-4 text-green-400"></i>' :
                   '<i data-lucide="info" class="w-4 h-4 text-blue-400"></i>'}
                ${n.message}
            </p>
            <p class="text-xs text-custom-grey mt-1 ml-6">${new Date(n.timestamp).toLocaleString()}</p>
        </div>
    `).join('');
    lucide.createIcons();
}

function updateHeaderLoginStatus() {
    const isLoggedIn = api.security.isLoggedIn();
    const userNameElement = document.getElementById('logged-in-username');
    const loginLogoutButton = document.getElementById('login-logout-button');
    const mainNav = document.getElementById('main-nav');
    const notificationBellWrapper = document.getElementById('notification-bell-wrapper');
    const searchIcon = document.getElementById('search-icon');
    const userCircleIcon = document.getElementById('user-circle-icon');

    if (isLoggedIn) {
        userNameElement.textContent = `Hello, ${App.state.currentUser.name}`;
        loginLogoutButton.innerHTML = `<i data-lucide="log-out" class="w-4 h-4 mr-2"></i>Logout`;
        loginLogoutButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        loginLogoutButton.classList.add('bg-red-600', 'hover:bg-red-700');
        mainNav.classList.remove('hidden');
        if (notificationBellWrapper) notificationBellWrapper.classList.remove('hidden');
        if (searchIcon) searchIcon.classList.remove('hidden');
        if (userCircleIcon) userCircleIcon.classList.remove('hidden');
        router.updateNavLinks();
    } else {
        userNameElement.textContent = `Guest`;
        loginLogoutButton.innerHTML = `<i data-lucide="log-in" class="w-4 h-4 mr-2"></i>Login`;
        loginLogoutButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        loginLogoutButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        mainNav.classList.add('hidden');
        if (notificationBellWrapper) notificationBellWrapper.classList.add('hidden');
        if (searchIcon) searchIcon.classList.add('hidden');
        if (userCircleIcon) userCircleIcon.classList.add('hidden');
        ui.elements.mainContent.innerHTML = '';
        ui.toggleSidebars(false);
    }
    lucide.createIcons();
}

function initEventListeners() {
    ui.elements.modalContainer.addEventListener('submit', (e) => {
        if (e.target.id === 'modalForm' || e.target.id === 'productionForm') {
            handleFormSubmit(e);
        }
        if (e.target.id === 'returnForm') {
            e.preventDefault();
            const orderId = ui.modals.openReturnModal.orderId;
            const reason = e.target.reason.value;
            const itemRows = e.target.querySelectorAll('.return-item-row');
            const returnedItems = Array.from(itemRows).map(row => ({
                productId: parseInt(row.dataset.productId, 10),
                quantity: parseInt(row.querySelector('[name="returnQuantity"]').value, 10)
            })).filter(item => item.quantity > 0);
            if (returnedItems.length === 0) {
                showToast('Please enter a quantity for at least one item to return.', 'error');
                return;
            }
            const creditNote = api.createCreditNoteForReturn(orderId, reason, returnedItems);
            if (creditNote) {
                ui.modals.closeAllModals();
                window.location.hash = '#creditNotes';
                renderDashboard();
            }
        }
    });

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'traceability-form') {
            e.preventDefault();
            if (!api.security.isLoggedIn() || !api.security.hasRole(['admin', 'inventory', 'finance'])) {
                showToast('You are not authorized to view traceability reports.', 'error'); return;
            }
            const lotNumber = e.target.querySelector('#traceability-search').value;
            const report = api.reports.getTraceabilityReport(lotNumber);
            ui.renderTraceabilityReportResults(report);
            lucide.createIcons();
        }
        if (e.target.id === 'reports-filter-form') {
            e.preventDefault();
            if (!api.security.isLoggedIn() || !api.security.hasRole(['admin', 'sales', 'finance'])) {
                showToast('You are not authorized to view financial reports.', 'error'); return;
            }
            const startDate = e.target.querySelector('#start-date').value;
            const endDate = e.target.querySelector('#end-date').value;
            if (startDate && endDate && endDate >= startDate) {
                const reportData = {
                    pnl: api.reports.getProfitAndLoss(startDate, endDate),
                    summary: api.reports.getSalesSummary(startDate, endDate),
                    topProducts: api.reports.getTopProductsByRevenue(3, startDate, endDate),
                    topCustomers: api.reports.getTopCustomersByRevenue(3, startDate, endDate)
                };
                ui.renderFinancialReports(reportData);
            } else {
                showToast('Please select a valid date range.', 'error');
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.create-order-from-quote-btn')) {
            if (!api.security.hasRole(['admin', 'sales'])) { showToast('Not authorized.', 'error'); return; }
            const quoteId = e.target.closest('.create-order-from-quote-btn').dataset.id;
            ui.modals.openConfirmModal(`Create a new order from this quote? The quote will be marked as 'Converted'.`, () => {
                const newOrder = api.createOrderFromQuote(quoteId);
                if (newOrder) {
                    showToast('Order created successfully!', 'success');
                    window.location.hash = `#orders/${newOrder.id}`;
                }
            });
        }
        else if (e.target.closest('.convert-lead-btn')) {
             if (!api.security.hasRole(['admin', 'sales'])) { showToast('Not authorized.', 'error'); return; }
            const leadId = e.target.closest('.convert-lead-btn').dataset.id;
            const lead = api.get('leads', leadId);
            ui.modals.openConfirmModal(`Convert "${lead.name}" to a new customer? The original lead will be deleted.`, () => {
                const newCustomer = api.convertLeadToCustomer(leadId);
                if (newCustomer) {
                    showToast('Lead converted successfully!', 'success');
                    window.location.hash = `#customers/${newCustomer.id}`;
                }
            });
        }
        else if (e.target.closest('.add-contract-btn')) {
            if (!api.security.hasRole(['admin', 'sales'])) { showToast('Not authorized.', 'error'); return; }
            const customerId = e.target.closest('.add-contract-btn').dataset.customerId;
            ui.modals.openCrudModal(null, 'customerContracts', { customerId });
        }
        else if (e.target.closest('.export-btn')) {
            const resource = e.target.closest('.export-btn').dataset.resource;
            ui.exportToCsv(resource);
        }
        else if (e.target.closest('#login-logout-button')) {
            if (api.security.isLoggedIn()) {
                api.security.logout();
                router.handleRouteChange('#login');
            } else {
                window.location.hash = '#login';
            }
            return;
        }
        else if (e.target.closest('.process-return-btn')) {
            if (!api.security.isLoggedIn()) { showToast('Please log in.', 'error'); return; }
            if (!api.security.hasRole(['admin', 'sales', 'finance'])) {
                showToast('You are not authorized to process returns.', 'error'); return;
            }
            const orderId = e.target.closest('.process-return-btn').dataset.id;
            ui.modals.openReturnModal.orderId = orderId; 
            ui.modals.openReturnModal(orderId);
        }
        else if (e.target.closest('.edit-btn')) {
            if (!api.security.isLoggedIn()) { showToast('Please log in.', 'error'); return; }
            const id = e.target.closest('.edit-btn').dataset.id;
            const resource = e.target.closest('.edit-btn').dataset.resource;
            App.state.currentEditId = id;
            ui.modals.openCrudModal(id, resource);
        }
        else if (e.target.closest('.add-btn')) {
            if (!api.security.isLoggedIn()) { showToast('Please log in.', 'error'); return; }
            const resource = e.target.closest('.add-btn').dataset.resource;
            ui.modals.openCrudModal(null, resource);
        }
        else if (e.target.closest('.delete-btn')) {
            if (!api.security.isLoggedIn()) { showToast('Please log in.', 'error'); return; }
            const resource = e.target.closest('.delete-btn').dataset.resource;
            if (resource !== 'customerContracts' && !api.security.hasRole('admin')) {
                showToast('You are not authorized to delete items.', 'error'); return;
            }
            const id = e.target.closest('.delete-btn').dataset.id;
            ui.modals.openConfirmModal(`You are about to delete this item. This action cannot be undone.`, () => {
                api.delete(resource, id);
                api.save();
                if (resource === 'customerContracts') {
                    const customerId = api.get('customerContracts', id)?.customerId;
                    if(customerId) router.handleRouteChange(`#customers/${customerId}`);
                } else {
                    router.renderCurrentPage();
                }
                if (['agents', 'customers'].includes(resource)) { mapService.renderMarkers(); }
                renderDashboard();
                api.notifications.checkAndGenerateProactiveNotifications();
            });
        }
        else if (e.target.closest('.generate-invoice-btn')) {
            if (!api.security.hasRole(['admin', 'finance', 'sales'])) { showToast('Not authorized.', 'error'); return; }
            const orderId = e.target.closest('.generate-invoice-btn').dataset.id;
            const newInvoice = api.generateInvoice(orderId);
            if (newInvoice) { window.location.hash = '#invoices'; }
        }
        else if (e.target.closest('.mark-paid-btn')) {
            if (!api.security.hasRole(['admin', 'finance'])) { showToast('Not authorized.', 'error'); return; }
            const invoiceId = e.target.closest('.mark-paid-btn').dataset.id;
            api.markInvoiceAsPaid(invoiceId);
            router.renderCurrentPage();
        }
        else if (e.target.closest('.view-invoice-btn')) {
            if (!api.security.hasRole(['admin', 'sales', 'finance'])) { showToast('Not authorized.', 'error'); return; }
            const invoiceId = e.target.closest('.view-invoice-btn').dataset.id;
            ui.modals.openInvoiceDetailModal(invoiceId);
        }
        else if (e.target.closest('.receive-stock-btn')) {
            if (!api.security.hasRole(['admin', 'inventory'])) { showToast('Not authorized.', 'error'); return; }
            const poId = e.target.closest('.receive-stock-btn').dataset.id;
            ui.modals.openReceiveStockModal(poId);
        }
        else if (e.target.closest('.produce-btn') || e.target.closest('.produce-btn-from-dashboard')) {
            if (!api.security.hasRole(['admin', 'inventory'])) { showToast('Not authorized.', 'error'); return; }
            const productId = e.target.closest('.produce-btn')?.dataset.id || e.target.closest('.produce-btn-from-dashboard')?.dataset.id;
            ui.modals.openProductionModal(productId);
        }
        else if (e.target.closest('.view-batches-btn')) {
            if (!api.security.hasRole(['admin', 'inventory', 'sales'])) { showToast('Not authorized.', 'error'); return; }
            const itemId = e.target.closest('.view-batches-btn').dataset.id;
            const type = e.target.closest('.view-batches-btn').dataset.type;
            ui.modals.openBatchDetailModal(itemId, type);
        }
        else if (e.target.closest('.production-order-details-btn')) {
            if (!api.security.hasRole(['admin', 'inventory'])) { showToast('Not authorized.', 'error'); return; }
            const poId = e.target.closest('.production-order-details-btn').dataset.id;
            ui.modals.openProductionOrderDetailsModal(poId);
        }
        else if (e.target.closest('#dashboard-new-order-btn')) {
            if (!api.security.hasRole(['admin', 'sales'])) { showToast('Not authorized.', 'error'); return; }
            ui.modals.openCrudModal(null, 'orders');
        }
        else if (e.target.closest('#dashboard-create-po-btn')) {
            if (!api.security.hasRole(['admin', 'inventory'])) { showToast('Not authorized.', 'error'); return; }
            ui.modals.openCrudModal(null, 'purchaseOrders');
        }
        else if (e.target.closest('#search-icon')) {
            if (!api.security.isLoggedIn()) { showToast('Please log in to use search.', 'error'); return; }
            ui.modals.openGlobalSearchModal();
        }
        else if (e.target.closest('#notification-bell')) {
            if (!api.security.isLoggedIn()) { showToast('Please log in to view notifications.', 'error'); return; }
            const dropdown = document.getElementById('notification-dropdown');
            
            dropdown.classList.toggle('active');

            if (!dropdown.classList.contains('active')) {
                renderNotificationsDropdown();
                setTimeout(() => { 
                    api.notifications.markNotificationAsRead();
                    updateNotificationCount();
                }, 1500);
            }
        }
        else if (e.target.closest('.notification-item')) {
            const notificationId = e.target.closest('.notification-item').dataset.id;
            api.notifications.markNotificationAsRead(notificationId);
            const notification = api.get('notifications').find(n => n.id == notificationId);
            if (notification && notification.details) {
                if (notification.details.orderId) { window.location.hash = `#orders/${notification.details.orderId}`; }
                else if (notification.details.productId) { window.location.hash = `#inventory/${notification.details.productId}`; }
                else if (notification.details.componentId) { window.location.hash = `#components`; }
                else if (notification.details.invoiceId) {
                    window.location.hash = `#invoices`;
                    ui.modals.openInvoiceDetailModal(notification.details.invoiceId);
                } else if (notification.details.poId) { window.location.hash = `#purchaseOrders`; }
            }
            document.getElementById('notification-dropdown').classList.add('hidden');
        }
        else if (e.target.closest('#assign-agent-btn')) {
            if (!api.security.hasRole('admin')) { showToast('You are not authorized to reassign customers.', 'error'); return; }
            const customerId = e.target.closest('#assign-agent-btn').dataset.customerId;
            const newAgentId = document.getElementById('assign-agent-select').value;
            api.update('customers', customerId, { agentId: parseInt(newAgentId, 10) });
            api.save();
            showToast('Agent has been updated successfully.', 'success');
            const hashParts = window.location.hash.substring(1).split('/');
            if (hashParts[0] === 'customers' && hashParts[1]) {
                ui.renderDetailPage('customers', hashParts[1]);
            }
        }
        else {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown && dropdown.classList.contains('active') && !e.target.closest('#notification-bell-wrapper')) {
                dropdown.classList.remove('active');
            }
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.matches('.table-agent-select')) {
            if (!api.security.hasRole('admin')) {
                showToast('You are not authorized to reassign customers.', 'error'); return;
            }
            const customerId = e.target.dataset.customerId;
            const newAgentId = e.target.value;
            api.update('customers', customerId, { agentId: parseInt(newAgentId, 10) });
            api.save();
            showToast('Agent updated successfully.', 'success');
            
            const row = e.target.closest('tr');
            if (row) {
                row.classList.add('flash');
                setTimeout(() => row.classList.remove('flash'), 1200);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('header').classList.add('hidden');
    document.getElementById('left-sidebar').classList.add('hidden');
    document.getElementById('right-sidebar').classList.add('hidden');

    lucide.createIcons();
    ui.initCharts();
    mapService.init();

    updateHeaderLoginStatus();

    initEventListeners();
    router.init(); 

    setInterval(() => {
        if (api.security.isLoggedIn()) {
            api.notifications.checkAndGenerateProactiveNotifications();
            updateNotificationCount();
        }
    }, 30000);
});
