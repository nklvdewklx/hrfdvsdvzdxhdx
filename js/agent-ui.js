// js/agent-ui.js
import { App } from './state.js';
import { api } from './api.js';

const mainContent = document.getElementById('agent-main-content');
const currentAgentId = App.state.currentUser?.id;

function getMyCustomers() {
    return App.state.db.customers.filter(c => c.agentId === currentAgentId);
}

export const agentUI = {
    initHeader(agentName) {
        document.getElementById('agent-name').textContent = agentName;
    },

    renderHomePage() {
        const agent = App.state.db.agents.find(a => a.id === currentAgentId);
        const stats = api.reports.getAgentDailySummary(currentAgentId);
        
        const scheduledVisits = api.getTodaysSchedule(agent);
        const unvisitedSchedule = scheduledVisits.filter(c => !App.state.todaysVisits.includes(c.id));
        const nextCustomer = unvisitedSchedule.length > 0 ? unvisitedSchedule[0] : null;

        let visitContext = { type: 'no_scheduled_visits' };
        if (nextCustomer) {
            const customerOrders = api.get('orders').filter(o => o.customerId === nextCustomer.id);
            const pendingOrder = customerOrders.find(o => o.status === 'pending');
            
            if (pendingOrder) {
                visitContext = { type: 'pending_order', order: pendingOrder };
            } else {
                const completedOrders = customerOrders
                    .filter(o => o.status === 'completed')
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                
                if (completedOrders.length > 0) {
                    visitContext = { type: 'follow_up', order: completedOrders[0] };
                } else {
                    visitContext = { type: 'new_sale' };
                }
            }
        }
        
        const renderNextVisitCard = () => {
            if (!nextCustomer) {
                return `
                <div class="bg-gray-800 p-4 rounded-lg text-center">
                    <h3 class="text-lg font-semibold text-green-400">All scheduled visits for today are complete!</h3>
                    <p class="text-sm text-gray-400">You can still add a new order or customer.</p>
                </div>`;
            }

            let title, details, link;
            switch (visitContext.type) {
                case 'pending_order':
                    title = 'Action Required: Pending Order';
                    details = `Finalize Order #${visitContext.order.id} for <span class="font-bold text-white">${nextCustomer.name}</span>.`;
                    link = `#order/${visitContext.order.id}`;
                    break;
                case 'follow_up':
                    title = 'Follow-up on Recent Order';
                    details = `Discuss Order #${visitContext.order.id} with <span class="font-bold text-white">${nextCustomer.name}</span>.`;
                    link = `#order/${visitContext.order.id}`;
                    break;
                case 'new_sale':
                default:
                    title = 'Scheduled Visit: New Opportunity';
                    details = `Visit <span class="font-bold text-white">${nextCustomer.name}</span> to discuss their needs.`;
                    link = `#customer/${nextCustomer.id}`;
                    break;
            }

            return `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-2">${title}</h3>
                <a href="${link}" class="block bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors">
                    <div class="flex justify-between items-center">
                        <p class="text-sm text-gray-300">${details}</p>
                        <i data-lucide="arrow-right-circle" class="w-6 h-6 text-gray-400 flex-shrink-0 ml-2"></i>
                    </div>
                </a>
            </div>`;
        };

        mainContent.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h2 class="text-3xl font-bold">Today's Goals</h2>
                    <p class="text-gray-400">Here's your progress for ${new Date().toLocaleDateString('en-GB')}.</p>
                </div>
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <p class="text-3xl font-bold">${App.state.todaysVisits.length} / ${scheduledVisits.length}</p>
                        <p class="text-xs text-gray-400">Visits Done</p>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <p class="text-3xl font-bold">${stats.ordersTodayCount}</p>
                        <p class="text-xs text-gray-400">New Orders</p>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <p class="text-3xl font-bold">$${stats.salesToday.toFixed(2)}</p>
                        <p class="text-xs text-gray-400">Sales</p>
                    </div>
                </div>
                
                ${renderNextVisitCard()}

                <div class="grid grid-cols-2 gap-4">
                    <a href="#new-order" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                        <i data-lucide="plus-circle" class="w-5 h-5"></i>
                        <span>New Order</span>
                    </a>
                    <a href="#add-customer" class="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                        <i data-lucide="user-plus" class="w-5 h-5"></i>
                        <span>Add Customer</span>
                    </a>
                </div>
            </div>
        `;
    },

    renderRoutePage() {
        const agent = App.state.db.agents.find(a => a.id === currentAgentId);
        const route = api.getTodaysSchedule(agent);

        const destinationListHtml = route.length > 0
            ? route.map(customer => {
                const isVisited = App.state.todaysVisits.includes(customer.id);
                return `
                <div class="bg-gray-800 p-3 rounded-lg flex justify-between items-center destination-item ${isVisited ? 'visited' : ''}" data-customer-id="${customer.id}">
                    <div>
                        <h3 class="font-semibold text-white">${customer.name}</h3>
                        <p class="text-sm text-gray-400">${customer.company}</p>
                    </div>
                    <button class="bg-green-600 text-white p-2 rounded-full toggle-visited-btn" title="${isVisited ? 'Mark as Not Visited' : 'Mark as Visited'}">
                        <i data-lucide="${isVisited ? 'undo-2' : 'check'}" class="w-5 h-5"></i>
                    </button>
                </div>
            `}).join('')
            : '<p class="text-gray-400 text-center col-span-1">No customers scheduled for today!</p>';

        mainContent.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold">Today's Schedule</h2>
                    <div id="route-eta-display" class="text-right"></div>
                </div>
                <div id="agent-map" class="h-64 bg-gray-900 rounded-lg"></div>
                <div class="mt-4">
                    <button id="calculate-route-btn" class="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
                        <i data-lucide="navigation" class="w-5 h-5"></i>
                        <span>Calculate Route</span>
                    </button>
                </div>
                <div class="space-y-3 mt-4">
                    ${destinationListHtml}
                </div>
            </div>
        `;
    },
    
    renderCustomersPage() {
        const myCustomers = getMyCustomers();
        const customerListHtml = myCustomers.length ? myCustomers.map(customer => `
            <a href="#customer/${customer.id}" class="block bg-gray-800 p-4 rounded-lg shadow-md mb-3 hover:bg-gray-700 transition-colors">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold text-lg text-white">${customer.name}</h3>
                        <p class="text-sm text-gray-400">${customer.company}</p>
                    </div>
                    <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500"></i>
                </div>
            </a>
        `).join('') : '<p class="text-gray-400 text-center">You have no customers assigned.</p>';

        mainContent.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-semibold">My Customers</h2>
                <a href="#add-customer" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                    <i data-lucide="user-plus" class="w-4 h-4"></i>
                    <span>Add</span>
                </a>
            </div>
            <div>
                ${customerListHtml}
            </div>
        `;
    },

    renderCustomerDetailPage(customerId) {
        const data = api.reports.getCustomerDetails(customerId);
        if (!data) {
            mainContent.innerHTML = `<p class="text-center text-red-400">Customer not found.</p>`;
            return;
        }
        const { customer, history } = data;

        const ordersHtml = history.orders.length > 0 ? history.orders.sort((a,b) => b.id - a.id).map(order => {
            const statusColors = { pending: 'text-yellow-400', completed: 'text-green-400', cancelled: 'text-red-400' };
            const total = api.calculateOrderTotal(order);
            return `<a href="#order/${order.id}" class="block hover:bg-gray-700 rounded-lg transition-colors -mx-2">
                        <li class="flex justify-between items-center py-3 px-2">
                            <div>
                                <span class="font-semibold">Order #${order.id}</span>
                                <span class="text-sm text-gray-400 ml-2">(${order.date})</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="font-semibold ${statusColors[order.status]}">$${total.toFixed(2)}</span>
                                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
                            </div>
                        </li>
                    </a>`;
        }).join('') : `<p class="text-sm text-gray-400 py-4 text-center">No orders found.</p>`;

        const notesHtml = customer.notes && customer.notes.length > 0 ? [...customer.notes].reverse().map(note => `
            <div class="bg-gray-900 p-3 rounded-md">
                <p class="text-sm text-gray-300">${note.text}</p>
                <p class="text-xs text-gray-500 text-right mt-1">${new Date(note.date).toLocaleString()}</p>
            </div>
        `).join('') : `<p class="text-sm text-gray-400 py-4 text-center">No notes yet.</p>`;

        mainContent.innerHTML = `
            <div class="space-y-6">
                <div>
                    <a href="#customers" class="text-sm text-blue-400 hover:underline mb-2 inline-block"><i data-lucide="arrow-left" class="inline w-4 h-4"></i> Back to Customers</a>
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-3xl font-bold">${customer.name}</h2>
                            <p class="text-gray-400">${customer.company}</p>
                        </div>
                         <a href="#edit-customer/${customer.id}" class="bg-gray-700 hover:bg-gray-600 text-white font-bold p-2 rounded-lg">
                            <i data-lucide="edit" class="w-5 h-5"></i>
                        </a>
                    </div>
                </div>

                <a href="#new-order/${customer.id}" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                    <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    <span>New Order for ${customer.name}</span>
                </a>

                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-custom-light-blue mb-2">Contact Info</h3>
                    <div class="text-sm space-y-2 text-gray-300">
                        <p><i data-lucide="mail" class="inline w-4 h-4 mr-2"></i> ${customer.email || 'N/A'}</p>
                        <p><i data-lucide="phone" class="inline w-4 h-4 mr-2"></i> ${customer.phone || 'N/A'}</p>
                    </div>
                </div>

                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-custom-light-blue mb-2">Recent Orders</h3>
                    <ul class="divide-y divide-gray-700">${ordersHtml}</ul>
                </div>

                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-custom-light-blue mb-2">Notes</h3>
                    <div id="notes-list" class="space-y-2 mb-4">${notesHtml}</div>
                    <form id="add-note-form" data-customer-id="${customer.id}">
                        <textarea name="noteText" class="agent-form-input" placeholder="Add a new note..." required></textarea>
                        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg mt-2">Add Note</button>
                    </form>
                </div>
            </div>
        `;
    },

    renderOrderDetailPage(orderId) {
        const order = api.get('orders', orderId);
        if (!order) {
            mainContent.innerHTML = `<p class="text-center text-red-400">Order not found.</p>`;
            return;
        }

        const customer = api.get('customers', order.customerId);
        const statusColors = { pending: 'text-yellow-400', completed: 'text-green-400', cancelled: 'text-red-400' };
        const total = api.calculateOrderTotal(order);

        const itemsHtml = order.items.map(item => {
            const product = api.get('inventory', item.productId);
            const price = api.getProductPriceForQuantity(product, item.quantity);
            const lineTotal = price * item.quantity;
            return `
                <div class="flex justify-between items-center py-3 border-b border-gray-700">
                    <div>
                        <p class="font-semibold text-white">${product.name}</p>
                        <p class="text-sm text-gray-400">${item.quantity} x $${price.toFixed(2)}</p>
                    </div>
                    <p class="font-semibold text-lg text-white">$${lineTotal.toFixed(2)}</p>
                </div>
            `;
        }).join('');
        
        const actionButtons = order.status === 'pending' ? `
            <div class="grid grid-cols-2 gap-4 mt-6">
                <a href="#edit-order/${order.id}" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                    <i data-lucide="edit" class="w-5 h-5"></i>
                    <span>Edit Order</span>
                </a>
                <button id="cancel-order-btn" data-order-id="${order.id}" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                    <i data-lucide="x-circle" class="w-5 h-5"></i>
                    <span>Cancel Order</span>
                </button>
            </div>
        ` : '';

        // --- NEW: WORKFLOW BUTTONS FOR COMPLETED ORDERS ---
        const workflowButtons = order.status === 'completed' ? `
            <div class="mt-6 space-y-3">
                 <button id="next-customer-btn" data-customer-id="${order.customerId}" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                    <i data-lucide="arrow-right" class="w-5 h-5"></i>
                    <span>Complete & Go to Next</span>
                </button>
                <a href="#re-order/${order.id}" class="block bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-center">
                    <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                    <span>Re-order These Items</span>
                </a>
                 <a href="#route" id="back-to-route-btn" class="block text-center text-sm text-blue-400 hover:underline mt-4">Back to Route</a>
            </div>
        ` : '';

        mainContent.innerHTML = `
            <div class="space-y-6">
                <div>
                    <a href="#customer/${order.customerId}" class="text-sm text-blue-400 hover:underline mb-2 inline-block"><i data-lucide="arrow-left" class="inline w-4 h-4"></i> Back to Customer</a>
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-3xl font-bold">Order #${order.id}</h2>
                            <p class="text-gray-400">For: ${customer.name}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold capitalize ${statusColors[order.status]}">${order.status}</p>
                            <p class="text-sm text-gray-500">${order.date}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-custom-light-blue mb-2">Items</h3>
                    <div class="space-y-2">${itemsHtml}</div>
                    <div class="flex justify-between items-center pt-4 mt-2">
                        <p class="text-xl font-bold">Total</p>
                        <p class="text-2xl font-bold text-green-400">$${total.toFixed(2)}</p>
                    </div>
                </div>
                ${order.signature ? `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-custom-light-blue mb-2">Signature</h3>
                    <img src="${order.signature}" class="bg-white rounded-md">
                </div>
                ` : ''}
                ${workflowButtons}
                ${actionButtons}
            </div>
        `;
    },

    renderProductsPage(searchTerm = '') {
        let products = App.state.db.inventory;
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            products = products.filter(p => 
                p.name.toLowerCase().includes(lowerCaseSearchTerm) || 
                p.sku.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        const productListHtml = products.length ? products.map(product => {
            const stock = api.getTotalStock(product.id);
            const stockColor = stock > 10 ? 'text-green-400' : 'text-yellow-400';
            return `
            <a href="#product/${product.id}" class="block bg-gray-800 p-4 rounded-lg shadow-md mb-3 hover:bg-gray-700 transition-colors">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold text-lg text-white">${product.name}</h3>
                        <p class="text-sm text-gray-400">SKU: ${product.sku}</p>
                    </div>
                    <div class="text-right">
                         <p class="font-semibold ${stockColor}">${stock}</p>
                         <p class="text-xs text-gray-500">In Stock</p>
                    </div>
                </div>
            </a>
        `}).join('') : '<p class="text-gray-400 text-center">No products found.</p>';

        mainContent.innerHTML = `
            <div>
                <h2 class="text-2xl font-semibold mb-4">Product Catalog</h2>
                <div class="relative mb-4">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
                    <input type="text" id="product-search-input" class="agent-form-input pl-10" placeholder="Search by name or SKU..." value="${searchTerm}">
                </div>
                <div>
                    ${productListHtml}
                </div>
            </div>
        `;
    },

    renderProductDetailPage(productId) {
        const product = api.get('inventory', productId);
        if (!product) {
            mainContent.innerHTML = `<p class="text-center text-red-400">Product not found.</p>`;
            return;
        }

        const stock = api.getTotalStock(product.id);
        const stockColor = stock > 10 ? 'text-green-400' : 'text-yellow-400';

        const pricingTiersHtml = product.pricingTiers.map(tier => `
            <li class="flex justify-between items-center py-2 border-b border-gray-700">
                <span>Qty: ${tier.minQty}+</span>
                <span class="font-semibold">$${tier.price.toFixed(2)} / unit</span>
            </li>
        `).join('');

        mainContent.innerHTML = `
            <div class="space-y-6">
                <div>
                    <a href="#products" class="text-sm text-blue-400 hover:underline mb-2 inline-block"><i data-lucide="arrow-left" class="inline w-4 h-4"></i> Back to Products</a>
                    <h2 class="text-3xl font-bold">${product.name}</h2>
                    <p class="text-gray-400">SKU: ${product.sku}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg text-center">
                    <p class="text-sm text-gray-400 mb-1">Current Stock</p>
                    <p class="text-4xl font-bold ${stockColor}">${stock}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-custom-light-blue mb-3">Pricing Tiers</h3>
                    <ul class="space-y-2">${pricingTiersHtml}</ul>
                </div>
            </div>
        `;
    },

    renderCustomerFormPage(customerId = null) {
        const customer = customerId ? api.get('customers', customerId) : {};
        const isEditing = !!customerId;

        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const dayOptions = days.map(day => `<option value="${day}" ${customer.visitSchedule?.day === day ? 'selected' : ''}>${day}</option>`).join('');

        mainContent.innerHTML = `
            <h2 class="text-2xl font-semibold mb-4">${isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
            <form id="agent-customer-form" data-customer-id="${customerId || ''}" class="space-y-4">
                <input type="hidden" name="lat" value="${customer.lat || ''}">
                <input type="hidden" name="lng" value="${customer.lng || ''}">
                <div>
                    <label class="block mb-1 text-sm text-gray-300">Name</label>
                    <input type="text" name="name" class="agent-form-input" value="${customer.name || ''}" required>
                </div>
                <div>
                    <label class="block mb-1 text-sm text-gray-300">Company</label>
                    <input type="text" name="company" class="agent-form-input" value="${customer.company || ''}">
                </div>
                 <div>
                    <label class="block mb-1 text-sm text-gray-300">Email</label>
                    <input type="email" name="email" class="agent-form-input" value="${customer.email || ''}">
                </div>
                 <div>
                    <label class="block mb-1 text-sm text-gray-300">Phone</label>
                    <input type="tel" name="phone" class="agent-form-input" value="${customer.phone || ''}">
                </div>
                <div class="border-t border-gray-700 pt-4">
                    <label class="block mb-2 text-sm text-gray-300">Customer Location</label>
                    <button type="button" id="set-location-btn" class="w-full flex items-center justify-center space-x-2 text-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600">
                        <i data-lucide="map-pin" class="w-5 h-5 text-blue-400"></i>
                        <span id="set-location-text">${isEditing && customer.lat ? `Location Set! (${customer.lat.toFixed(2)}, ${customer.lng.toFixed(2)})` : 'Set Location on Map'}</span>
                    </button>
                </div>

                <div class="border-t border-gray-700 pt-4 mt-4">
                    <h3 class="text-md font-semibold text-custom-light-blue mb-2">Visit Schedule</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block mb-1 text-sm text-gray-300">Visit Day</label>
                            <select name="visitSchedule.day" class="agent-form-select">${dayOptions}</select>
                        </div>
                        <div>
                            <label class="block mb-1 text-sm text-gray-300">Frequency</label>
                            <select name="visitSchedule.frequency" class="agent-form-select">
                                <option value="weekly" ${customer.visitSchedule?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="bi-weekly" ${customer.visitSchedule?.frequency === 'bi-weekly' ? 'selected' : ''}>Bi-Weekly</option>
                                <option value="monthly" ${customer.visitSchedule?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mt-4">
                    ${isEditing ? 'Update Customer' : 'Save Customer'}
                </button>
            </form>
        `;
    },

    renderOrderFormPage(options = {}) {
        const { orderId, customerId, reorderFromId } = options;
        
        const isEditing = !!orderId;
        const isReorder = !!reorderFromId;

        let order = {};
        let pageTitle = 'Create New Order';

        if (isEditing) {
            order = api.get('orders', orderId);
            pageTitle = `Edit Order #${order.id}`;
        } else if (isReorder) {
            order = api.get('orders', reorderFromId);
            pageTitle = `Re-order from Order #${order.id}`;
        } else if (customerId) {
            order.customerId = customerId;
        }

        const myCustomers = getMyCustomers();
        const customerOptions = myCustomers.map(c => 
            `<option value="${c.id}" ${c.id == order.customerId ? 'selected' : ''}>${c.name} - ${c.company}</option>`
        ).join('');

        const lineItemRowHtml = (item = { quantity: 1 }) => `
            <div class="flex items-center space-x-2 p-2 bg-gray-700 rounded-md line-item-row">
                <select name="productId" class="agent-form-input flex-grow">
                    ${App.state.db.inventory.map(p => `<option value="${p.id}" ${p.id == item.productId ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
                <input type="number" name="quantity" class="agent-form-input w-20" placeholder="Qty" value="${item.quantity || 1}" min="1">
                <button type="button" class="p-2 text-red-400 remove-line-item-btn"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
        `;

        const lineItems = (order.items && order.items.length > 0) ? order.items : [{}];
        const existingLineItemsHtml = lineItems.map(item => lineItemRowHtml(item)).join('');
        
        mainContent.innerHTML = `
            <h2 class="text-2xl font-semibold mb-4">${pageTitle}</h2>
            <form id="agent-order-form" data-order-id="${isEditing ? orderId : ''}" class="space-y-6">
                <div>
                    <label class="block mb-1 text-sm text-gray-300">Customer</label>
                    <select name="customerId" class="agent-form-input" required ${isEditing || isReorder ? 'disabled' : ''}>${customerOptions}</select>
                </div>
                <div class="space-y-3">
                    <label class="block text-sm text-gray-300">Products</label>
                    <div id="line-items-container" class="space-y-2">${existingLineItemsHtml}</div>
                    <button type="button" id="add-line-item-btn" class="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Add Product</span>
                    </button>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mt-4">
                    ${isEditing ? 'Update Order' : 'Proceed to Signature'}
                </button>
            </form>
        `;

        document.getElementById('add-line-item-btn').addEventListener('click', () => {
            const container = document.getElementById('line-items-container');
            container.insertAdjacentHTML('beforeend', lineItemRowHtml());
            lucide.createIcons();
        });

        mainContent.addEventListener('click', e => {
            if (e.target.closest('.remove-line-item-btn')) {
                e.target.closest('.line-item-row').remove();
            }
        });
    },

    renderSignatureModal(orderId) {
        const modalHtml = `
            <div id="signature-modal-overlay" class="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-40 flex items-center justify-center">
                <div id="signature-modal" class="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col max-h-[90vh]">
                    <div class="text-center p-4 border-b border-gray-700">
                        <h2 class="text-xl font-bold">Confirm Order #${orderId}</h2>
                        <p class="text-gray-400 text-sm">Please have the customer sign below.</p>
                    </div>
                    <div class="p-4 flex-grow">
                        <canvas id="signature-pad" class="w-full h-full bg-white rounded-md"></canvas>
                    </div>
                    <div class="grid grid-cols-2 gap-4 p-4 border-t border-gray-700">
                        <button id="clear-signature-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg">Clear</button>
                        <button id="save-signature-btn" data-order-id="${orderId}" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">Save Signature</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },
    
    renderConfirmModal(title, message, onConfirm) {
        const modalHtml = `
            <div id="agent-confirm-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div class="bg-gray-800 rounded-lg w-full max-w-sm p-6 text-center">
                    <h2 class="text-xl font-bold text-white mb-2">${title}</h2>
                    <p class="text-gray-400 mb-6">${message}</p>
                    <div class="flex justify-center space-x-4">
                        <button id="cancel-confirm-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button id="confirm-action-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const closeModal = () => document.getElementById('agent-confirm-modal')?.remove();
        
        document.getElementById('cancel-confirm-btn').addEventListener('click', closeModal);
        document.getElementById('confirm-action-btn').addEventListener('click', () => {
            onConfirm();
            closeModal();
        });
    },
};