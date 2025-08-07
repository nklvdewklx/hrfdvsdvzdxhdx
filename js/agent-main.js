// js/agent-main.js
import { App } from './state.js';
import { api } from './api.js';
import { agentUI } from './agent-ui.js';
import { showToast } from './toast.js';
import { agentMapService } from './agent-map.js';
import { signatureHandler } from './signature-pad-handler.js';

const routingService = {
    async getRoute(coordinates) {
        // OSRM expects coordinates in lng,lat format
        const coordsString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
        
        // Using the free public OSRM server. Not for production use!
        const apiUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Routing request failed: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                 throw new Error('Could not find a route.');
            }

            const routeGeometry = data.routes[0].geometry; 
            const estimatedMinutes = Math.round(data.routes[0].duration / 60); 

            return { geometry: routeGeometry, duration: estimatedMinutes };
        } catch (error) {
            console.error("Routing Service Error:", error);
            showToast('Could not calculate the route.', 'error');
            return null; 
        }
    }
};

const currentAgentId = App.state.currentUser?.id;
let positionWatcherId = null; 

// --- REFACTORED: Form submission logic broken into smaller functions ---
function _handleCustomerFormSubmit(form) {
    const customerId = form.dataset.customerId;
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData.entries());
    
    customerData.visitSchedule = {
        day: customerData['visitSchedule.day'],
        frequency: customerData['visitSchedule.frequency']
    };
    delete customerData['visitSchedule.day'];
    delete customerData['visitSchedule.frequency']

    customerData.agentId = currentAgentId;
    customerData.lat = parseFloat(customerData.lat);
    customerData.lng = parseFloat(customerData.lng);

    if (!customerData.lat || !customerData.lng) {
        showToast('Please set a location for the customer.', 'error');
        return;
    }

    if (customerId) {
        api.update('customers', customerId, customerData);
        showToast('Customer updated successfully!', 'success');
    } else {
        customerData.notes = [];
        const newCustomer = api.add('customers', customerData);
        showToast('Customer added successfully!', 'success');
    }
    api.save();
    window.location.hash = '#customers';
}

function _handleOrderFormSubmit(form) {
    const orderId = form.dataset.orderId;
    const lineItemRows = form.querySelectorAll('.line-item-row');
    const items = Array.from(lineItemRows).map(row => ({
        productId: parseInt(row.querySelector('[name="productId"]').value, 10),
        quantity: parseInt(row.querySelector('[name="quantity"]').value, 10)
    })).filter(item => item.quantity > 0);

    if (items.length === 0) {
        showToast('Please add at least one product.', 'error');
        return;
    }

    const orderData = {
        customerId: parseInt(form.querySelector('[name="customerId"]').value, 10),
        agentId: currentAgentId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        items: items
    };

    let savedOrder;
    if (orderId) {
        savedOrder = api.update('orders', orderId, orderData);
    } else {
        savedOrder = api.add('orders', orderData);
        const customerId = savedOrder.customerId;
        if (!App.state.todaysVisits.includes(customerId)) {
            App.state.todaysVisits.push(customerId);
        }
    }
    api.save();
    // Use the dedicated signature handler
    signatureHandler.show(savedOrder.id);
}

function _handleAddNoteFormSubmit(form) {
    const customerId = form.dataset.customerId;
    const noteText = form.noteText.value;
    
    const customer = api.get('customers', customerId);
    if (customer) {
        const newNote = { date: new Date().toISOString(), text: noteText };
        if (!customer.notes) customer.notes = [];
        customer.notes.push(newNote);
        api.update('customers', customerId, customer);
        api.save();
        showToast('Note added!', 'success');
        // Re-render the page to show the new note
        agentUI.renderCustomerDetailPage(customerId);
        lucide.createIcons();
    }
}

function handleFormSubmissions(e) {
    e.preventDefault();
    const formId = e.target.id;

    if (formId === 'agent-customer-form') {
        _handleCustomerFormSubmit(e.target);
    } else if (formId === 'agent-order-form') {
        _handleOrderFormSubmit(e.target);
    } else if (formId === 'add-note-form') {
        _handleAddNoteFormSubmit(e.target);
    }
}
// --- END REFACTORED FORM SUBMISSION ---

function startLiveTracking() {
    if (positionWatcherId) {
        navigator.geolocation.clearWatch(positionWatcherId);
    }
    
    if ('geolocation' in navigator) {
        positionWatcherId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                agentMapService.updateAgentPosition(latitude, longitude);
            },
            (error) => {
                console.error("Error watching position:", error);
                showToast(`Location Error: ${error.message}`, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        showToast('Geolocation is not supported by your browser.', 'error');
    }
}

function stopLiveTracking() {
    if (positionWatcherId) {
        navigator.geolocation.clearWatch(positionWatcherId);
        positionWatcherId = null;
    }
}

// --- UPDATED: Routing logic simplified ---
function handleRouteChange() {
    const hash = window.location.hash || '#home';
    const [page, param] = hash.substring(1).split('/');

    if (page !== 'route') {
        stopLiveTracking();
    }

    document.querySelectorAll('.agent-nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href').startsWith(`#${page}`));
    });

    switch(page) {
        case 'home': agentUI.renderHomePage(); break;
        case 'route':
            agentUI.renderRoutePage();
            setTimeout(() => {
                const agent = App.state.db.agents.find(a => a.id === currentAgentId);
                const schedule = api.getTodaysSchedule(agent);
                agentMapService.init(agent, schedule);
                startLiveTracking();
            }, 0);
            break;
        case 'customers': agentUI.renderCustomersPage(); break;
        case 'customer': agentUI.renderCustomerDetailPage(param); break;
        case 'order': agentUI.renderOrderDetailPage(param); break;
        case 'products': agentUI.renderProductsPage(); break;
        case 'product': agentUI.renderProductDetailPage(param); break;
        case 'add-customer': agentUI.renderCustomerFormPage(); break;
        case 'edit-customer': agentUI.renderCustomerFormPage(param); break;
        case 'new-order': agentUI.renderOrderFormPage({ customerId: param }); break;
        case 'edit-order': agentUI.renderOrderFormPage({ orderId: param }); break;
        case 're-order': agentUI.renderOrderFormPage({ reorderFromId: param }); break;
        default: agentUI.renderHomePage();
    }
    lucide.createIcons();
}
// --- END UPDATED ROUTING ---

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            return reject(new Error('Geolocation is not supported.'));
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            }
        );
    });
}

async function recalculateRouteToRemainingDestinations() {
    console.log("Recalculating route to remaining destinations...");
    const btn = document.getElementById('calculate-route-btn');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> <span>Updating...</span>`;
        lucide.createIcons();
    }

    try {
        const agent = api.get('agents', currentAgentId);
        const fullSchedule = api.getTodaysSchedule(agent);
        const remainingSchedule = fullSchedule.filter(c => !App.state.todaysVisits.includes(c.id));

        if (remainingSchedule.length === 0) {
            showToast('All visits complete for today!', 'success');
            agentMapService.clearRoute();
            return;
        }

        const agentCurrentLocation = await getCurrentLocation();
        const coordinates = [
            agentCurrentLocation,
            ...remainingSchedule.map(c => ({ lat: c.lat, lng: c.lng }))
        ];

        const route = await routingService.getRoute(coordinates);
        if (route) {
            agentMapService.drawRoute(route.geometry);
            const etaDisplay = document.getElementById('route-eta-display');
            etaDisplay.innerHTML = `
                <p class="font-semibold text-lg">${route.duration} min</p>
                <p class="text-xs text-gray-400">To Next Stop</p>
            `;
        }
    } catch (error) {
        showToast(`Could not update route: ${error.message}`, 'error');
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="navigation" class="w-5 h-5"></i> <span>Recalculate Route</span>`;
            lucide.createIcons();
        }
    }
}

async function handleAppClicks(e) {
    if (e.target.closest('#cancel-order-btn')) {
        const orderId = e.target.closest('#cancel-order-btn').dataset.orderId;
        agentUI.renderConfirmModal('Cancel Order?', 'This action cannot be undone.', () => {
            const order = api.get('orders', orderId);
            order.status = 'cancelled';
            api.update('orders', orderId, order);
            api.save();
            showToast('Order has been cancelled.', 'success');
            agentUI.renderOrderDetailPage(orderId);
            lucide.createIcons();
        });
    }

    if (e.target.closest('.toggle-visited-btn')) {
        const customerId = parseInt(e.target.closest('.destination-item').dataset.customerId, 10);
        const visitIndex = App.state.todaysVisits.indexOf(customerId);
        let wasJustCompleted = false;

        if (visitIndex > -1) {
            App.state.todaysVisits.splice(visitIndex, 1);
        } else {
            App.state.todaysVisits.push(customerId);
            wasJustCompleted = true;
        }
        api.save();
        handleRouteChange();

        if (wasJustCompleted) {
            await recalculateRouteToRemainingDestinations();
        }
    }

    // --- NEW: AGENT WORKFLOW LOGIC ---
    if (e.target.closest('#next-customer-btn')) {
        const customerId = parseInt(e.target.closest('#next-customer-btn').dataset.customerId, 10);

        // 1. Mark current visit as complete if it's not already
        if (!App.state.todaysVisits.includes(customerId)) {
            App.state.todaysVisits.push(customerId);
            api.save();
        }

        // 2. Find the next unvisited customer
        const agent = api.get('agents', currentAgentId);
        const fullSchedule = api.getTodaysSchedule(agent);
        const remainingSchedule = fullSchedule.filter(c => !App.state.todaysVisits.includes(c.id));

        // 3. Navigate or show completion message
        if (remainingSchedule.length > 0) {
            const nextCustomer = remainingSchedule[0];
            showToast(`Next stop: ${nextCustomer.name}`, 'success');
            window.location.hash = `#customer/${nextCustomer.id}`;
        } else {
            showToast('All scheduled visits for today are complete!', 'success');
            window.location.hash = '#home';
        }
    }

    if (e.target.closest('#set-location-btn')) {
        const agent = App.state.db.agents.find(a => a.id === currentAgentId);
        const lat = agent.lat + (Math.random() - 0.5) * 0.1;
        const lng = agent.lng + (Math.random() - 0.5) * 0.1;

        document.querySelector('input[name="lat"]').value = lat;
        document.querySelector('input[name="lng"]').value = lng;
        
        const locationText = document.getElementById('set-location-text');
        locationText.textContent = `Location Set! (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
        document.getElementById('set-location-btn').classList.add('bg-green-600');
    }

    if (e.target.closest('#calculate-route-btn')) {
        const btn = e.target.closest('#calculate-route-btn');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> <span>Calculating...</span>`;
        lucide.createIcons();

        try {
            const agentCurrentLocation = await getCurrentLocation();
            const schedule = api.getTodaysSchedule(api.get('agents', currentAgentId));
            if (schedule.length === 0) {
                showToast('No customers scheduled for today.', 'info');
                throw new Error('No schedule');
            }
    
            const coordinates = [
                agentCurrentLocation,
                ...schedule.map(c => ({ lat: c.lat, lng: c.lng }))
            ];
            
            const route = await routingService.getRoute(coordinates);
            if (route) { 
                agentMapService.drawRoute(route.geometry);
                const etaDisplay = document.getElementById('route-eta-display');
                etaDisplay.innerHTML = `
                    <p class="font-semibold text-lg">${route.duration} min</p>
                    <p class="text-xs text-gray-400">Estimated Route</p>
                `;
            }
        } catch (error) {
            if (error.message !== 'No schedule') {
                showToast(`Could not get location: ${error.message}`, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="navigation" class="w-5 h-5"></i> <span>Recalculate Route</span>`;
            lucide.createIcons();
        }
    }
}

function init() {
    App.state.todaysVisits = [];

    if (!currentAgentId || (App.state.currentUser.role !== 'sales' && App.state.currentUser.role !== 'admin')) {
        window.location.href = 'index.html#login';
        return;
    }

    agentUI.initHeader(App.state.currentUser.name);
    lucide.createIcons();

    window.addEventListener('hashchange', handleRouteChange);
    document.getElementById('agent-logout-button').addEventListener('click', () => {
        stopLiveTracking();
        api.security.logout();
        window.location.href = 'index.html#login';
    });
    
    const appContainer = document.getElementById('agent-app-container');
    appContainer.addEventListener('submit', handleFormSubmissions);
    appContainer.addEventListener('click', handleAppClicks);
    
    appContainer.addEventListener('input', (e) => {
        if (e.target.id === 'product-search-input') {
            agentUI.renderProductsPage(e.target.value);
            lucide.createIcons();
        }
    });
    
    handleRouteChange();
}

document.addEventListener('DOMContentLoaded', init);