// js/ui-details.js
import { api } from './api.js';
import { pageConfig } from './ui-pages.js';

export const detailsRenderer = {

    renderOrderDetailPage(orderId) {
        if (!api.security.hasRole(['admin', 'sales', 'finance'])) {
            return `<div class="glass-panel p-8 text-white pointer-events-auto text-center">You are not authorized to view order details.</div>`;
        }
        const order = api.get('orders', orderId);
        if (!order) {
            return `<div class="glass-panel p-8 text-white pointer-events-auto">Order not found.</div>`;
        }

        const customer = api.get('customers', order.customerId);
        const agent = api.get('agents', order.agentId);
        const statusColors = { pending: 'text-yellow-400', completed: 'text-green-400', cancelled: 'text-red-400' };
        
        // --- UPDATED: USE NEW getOrderTotals to get full breakdown ---
        const totals = api.getOrderTotals(order);

        const itemsHtml = order.items.map(item => {
            const product = api.get('inventory', item.productId);
            const price = api.getProductPriceForQuantity(product, item.quantity, order.customerId);
            const lineTotal = price * item.quantity;
            return `
                <tr class="border-b border-white/10">
                    <td class="py-3 px-4">${product.name}</td>
                    <td class="py-3 px-4 text-right">${item.quantity}</td>
                    <td class="py-3 px-4 text-right">$${price.toFixed(2)}</td>
                    <td class="py-3 px-4 text-right font-semibold">$${lineTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const processReturnBtn = order.status === 'completed' || order.status === 'shipped' || order.status === 'delivered'
            ? `<div class="mt-6">
                 <button class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-center process-return-btn" data-id="${order.id}">
                    <i data-lucide="undo-2" class="w-5 h-5"></i>
                    <span>Process a Return</span>
                </button>
               </div>`
            : '';

        const shippingDetailsHtml = order.shippingCarrier ? `
            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Shipping Details</h3>
                <div class="space-y-2 text-sm">
                    <p><span class="text-custom-grey">Carrier:</span> <span class="font-semibold text-white">${order.shippingCarrier}</span></p>
                    <p><span class="text-custom-grey">Tracking #:</span> <a href="#" class="font-semibold text-blue-400 hover:underline">${order.trackingNumber}</a></p>
                </div>
            </div>
        ` : '';


        return `
        <div class="w-full max-w-4xl mx-auto pointer-events-auto h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            <a href="#orders" class="text-sm text-custom-light-blue hover:underline"><i data-lucide="arrow-left" class="inline-block w-4 h-4 mr-1"></i>Back to Orders</a>
            <div class="glass-panel p-6 rounded-lg">
                 <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-white">Order #${order.id}</h1>
                        <p class="text-custom-grey">For: <a href="#customers/${customer.id}" class="hover:underline">${customer.name}</a></p>
                        <p class="text-custom-grey text-sm">Handled by: ${agent ? agent.name : 'N/A'}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-lg capitalize ${statusColors[order.status]}">${order.status}</p>
                        <p class="text-sm text-custom-grey">${order.date}</p>
                    </div>
                </div>
            </div>
            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Order Items</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr><th>Product</th><th class="text-right">Quantity</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                        <tfoot>
                            <tr class="border-t-2 border-white/10">
                                <td colspan="2"></td>
                                <td class="text-right text-custom-grey py-2 px-4">Subtotal</td>
                                <td class="text-right py-2 px-4">$${totals.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colspan="2"></td>
                                <td class="text-right text-custom-grey py-2 px-4">Tax (${(totals.taxRate.rate * 100).toFixed(0)}%)</td>
                                <td class="text-right py-2 px-4">$${totals.taxAmount.toFixed(2)}</td>
                            </tr>
                            <tr class="border-t border-white/10">
                                <td colspan="2"></td>
                                <td class="text-right font-bold text-lg py-3 px-4">GRAND TOTAL</td>
                                <td class="text-right font-bold text-xl py-3 px-4">$${totals.total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            ${shippingDetailsHtml}

            ${order.signature ? `
            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Signature Confirmation</h3>
                <div class="bg-white p-2 rounded-md">
                    <img src="${order.signature}" class="mx-auto">
                </div>
            </div>` : ''}

            ${processReturnBtn}
        </div>`;

    },
    
    renderCustomerDetailPage(customerId) {
        if (!api.security.hasRole(['admin', 'sales', 'finance'])) {
            return `<div class="glass-panel p-8 text-white pointer-events-auto text-center">You are not authorized to view customer details.</div>`;
        }

        const data = api.reports.getCustomerDetails(customerId);
        if (!data) {
            return `<div class="glass-panel p-8 text-white pointer-events-auto">Customer not found.</div>`;
        }

        const { customer, stats, history } = data;
        const ordersHtml = history.orders.map(order => pageConfig.orders.renderRow(order)).join('');
        
        // --- NEW: Render contracts for this customer ---
        const contracts = api.get('customerContracts').filter(c => c.customerId == customerId);
        const contractsHtml = contracts.map(contract => {
            const product = api.get('inventory', contract.productId);
            return `
                <tr class="border-b border-white/10">
                    <td class="py-2">${product.name}</td>
                    <td class="py-2 text-right font-semibold text-green-400">$${contract.contractPrice.toFixed(2)}</td>
                    <td class="py-2 text-center">${contract.startDate}</td>
                    <td class="py-2 text-center">${contract.endDate}</td>
                    <td class="py-2 text-right">
                        <div class="flex space-x-2 justify-end">
                            <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${contract.id}" data-resource="customerContracts"></i>
                            <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${contract.id}" data-resource="customerContracts"></i>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const html = `
        <div class="w-full max-w-7xl mx-auto pointer-events-auto h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div>
                <a href="#customers" class="text-sm text-custom-light-blue hover:underline"><i data-lucide="arrow-left" class="inline-block w-4 h-4 mr-1"></i>Back to Customers</a>
                <h1 class="text-4xl font-bold text-white mt-2">${customer.name}</h1>
                <p class="text-custom-grey">${customer.company}</p>
                <p class="text-custom-grey">${customer.email} | ${customer.phone}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Lifetime Revenue</h3><p class="text-2xl font-bold text-white">$${stats.lifetimeRevenue.toFixed(2)}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Total Orders</h3><p class="text-2xl font-bold text-white">${stats.totalOrders}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Avg. Order Value</h3><p class="text-2xl font-bold text-white">$${stats.avgOrderValue.toFixed(2)}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Last Order</h3><p class="text-2xl font-bold text-white">${stats.lastOrderDate}</p></div>
            </div>
            
            <div class="glass-panel p-6 rounded-lg">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-custom-light-blue">Pricing Contracts</h3>
                    <button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 add-contract-btn" data-customer-id="${customer.id}">
                        <i data-lucide="plus" class="w-4 h-4"></i><span>New Contract</span>
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr><th>Product</th><th class="text-right">Contract Price</th><th class="text-center">Start Date</th><th class="text-center">End Date</th><th class="text-right">Actions</th></tr></thead>
                        <tbody>${contractsHtml || `<tr><td colspan="5" class="text-center py-4 text-custom-grey">No contracts for this customer.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Order History</h3>
                <div class="overflow-x-auto"><table class="data-table"><thead><tr>${pageConfig.orders.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${ordersHtml || `<tr><td colspan="${pageConfig.orders.headers.length}" class="text-center py-4 text-custom-grey">No orders found.</td></tr>`}</tbody></table></div>
            </div>
        </div>`;
        return html;
    },

    renderAgentDetailPage(agentId) {
        if (!api.security.hasRole(['admin', 'sales'])) {
            this.elements.mainContent.innerHTML = `<div class="glass-panel p-8 text-white pointer-events-auto text-center">You are not authorized to view agent details.</div>`;
            return;
        }

        const data = api.reports.getAgentDetails(agentId);
        if (!data) {
            this.elements.mainContent.innerHTML = `<div class="glass-panel p-8 text-white pointer-events-auto">Agent not found.</div>`;
            return;
        }
        
        const { agent, stats, history } = data;
        const ordersHtml = history.orders.map(order => pageConfig.orders.renderRow(order)).join('');
        const customersHtml = history.customers.map(customer => pageConfig.customers.renderRow(customer)).join('');

        const html = `
        <div class="w-full max-w-7xl mx-auto pointer-events-auto h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div>
                <a href="#agents" class="text-sm text-custom-light-blue hover:underline"><i data-lucide="arrow-left" class="inline-block w-4 h-4 mr-1"></i>Back to Agents</a>
                <h1 class="text-4xl font-bold text-white mt-2">${agent.name}</h1>
                <p class="text-custom-grey">${agent.role}</p>
                <p class="text-custom-grey">${agent.email} | ${agent.phone}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Total Revenue Generated</h3><p class="text-2xl font-bold text-white">$${stats.totalRevenue.toFixed(2)}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Managed Customers</h3><p class="text-2xl font-bold text-white">${stats.managedCustomers}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Completed Orders</h3><p class="text-2xl font-bold text-white">${stats.completedOrders}</p></div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Assigned Orders</h3>
                <div class="overflow-x-auto"><table class="data-table"><thead><tr>${pageConfig.orders.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${ordersHtml || `<tr><td colspan="${pageConfig.orders.headers.length}" class="text-center py-4">No orders found.</td></tr>`}</tbody></table></div>
            </div>
            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Assigned Customers</h3>
                <div class="overflow-x-auto"><table class="data-table"><thead><tr>${pageConfig.customers.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${customersHtml || `<tr><td colspan="="${pageConfig.customers.headers.length}" class="text-center py-4">No customers found.</td></tr>`}</tbody></table></div>
            </div>
        </div>`;
        this.elements.mainContent.innerHTML = html;
        lucide.createIcons();
    },

    renderProductDetailPage(productId) {
        if (!api.security.hasRole(['admin', 'inventory', 'sales'])) {
            this.elements.mainContent.innerHTML = `<div class="glass-panel p-8 text-white pointer-events-auto text-center">You are not authorized to view product details.</div>`;
            return;
        }

        const data = api.reports.getProductDetails(productId);
        if (!data) {
            this.elements.mainContent.innerHTML = `<div class="glass-panel p-8 text-white pointer-events-auto">Product not found.</div>`;
            return;
        }

        const { product, stats, history } = data;
        
        const productionOrdersHtml = history.productionOrders.map(order => pageConfig.productionOrders.renderRow(order)).join('');
        const salesOrdersHtml = history.salesOrders.map(order => page.Config.orders.renderRow(order)).join('');


        const html = `
        <div class="w-full max-w-7xl mx-auto pointer-events-auto h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div>
                <a href="#inventory" class="text-sm text-custom-light-blue hover:underline"><i data-lucide="arrow-left" class="inline-block w-4 h-4 mr-1"></i>Back to Inventory</a>
                <h1 class="text-4xl font-bold text-white mt-2">${product.name}</h1>
                <p class="text-custom-grey">SKU: ${product.sku}</p>
                <p class="text-custom-grey">Cost: $${product.cost.toFixed(2)} | Shelf Life: ${product.shelfLifeDays} days</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Total Stock</h3><p class="text-2xl font-bold text-white">${stats.totalStock}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Total Produced</h3><p class="text-2xl font-bold text-white">${stats.totalProduced}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Total Sold</h3><p class="text-2xl font-bold text-white">${stats.totalSold}</p></div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Pricing Tiers</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr><th>Min Quantity</th><th class="text-right">Price per Unit</th></tr></thead>
                        <tbody>
                            ${product.pricingTiers && product.pricingTiers.length > 0
                                ? product.pricingTiers.map(tier => `
                                    <tr>
                                        <td>${tier.minQty}</td>
                                        <td class="text-right">$${tier.price.toFixed(2)}</td>
                                    </tr>
                                `).join('')
                                : `<tr><td colspan="2" class="text-center py-4">No pricing tiers defined.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Bill of Materials (BOM)</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr><th>Component</th><th class="text-right">Quantity Required</th></tr></thead>
                        <tbody>
                            ${product.bom && product.bom.length > 0
                                ? product.bom.map(bomItem => `
                                    <tr>
                                        <td>${api.get('components', bomItem.componentId)?.name || 'N/A'}</td>
                                        <td class="text-right">${bomItem.quantity}</td>
                                    </tr>
                                `).join('')
                                : `<tr><td colspan="2" class="text-center py-4">No Bill of Materials defined.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Stock Batches</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr><th>Lot Number</th><th>Quantity</th><th class="text-right">Expiry Date</th></tr></thead>
                        <tbody>
                            ${product.stockBatches && product.stockBatches.length > 0
                                ? product.stockBatches.map(batch => `
                                    <tr>
                                        <td>${batch.lotNumber}</td>
                                        <td>${batch.quantity}</td>
                                        <td class="text-right">${batch.expiryDate}</td>
                                    </tr>
                                `).join('')
                                : `<tr><td colspan="3" class="text-center py-4">No stock batches for this product.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Production History</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr>${pageConfig.productionOrders.headers.slice(0, -1).map(h => `<th>${h}</th>`).join('')}</tr></thead>
                        <tbody>${productionOrdersHtml || `<tr><td colspan="${pageConfig.productionOrders.headers.length -1}" class="text-center py-4">No production history for this product.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Sales History</h3>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr>${pageConfig.orders.headers.slice(0, -1).map(h => `<th>${h}</th>`).join('')}</tr></thead>
                        <tbody>${salesOrdersHtml || `<tr><td colspan="${pageConfig.orders.headers.length -1}" class="text-center py-4">No sales history for this product.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
        this.elements.mainContent.innerHTML = html;
        lucide.createIcons();
    },
    
    renderAgentDetailPage(agentId) {
        if (!api.security.hasRole(['admin', 'sales'])) {
            return `<div class="glass-panel p-8 text-white pointer-events-auto text-center">You are not authorized to view agent details.</div>`;
        }

        const data = api.reports.getAgentDetails(agentId);
        if (!data) {
            return `<div class="glass-panel p-8 text-white pointer-events-auto">Agent not found.</div>`;
        }
        
        const { agent, stats, history } = data;
        const ordersHtml = history.orders.map(order => pageConfig.orders.renderRow(order)).join('');
        const customersHtml = history.customers.map(customer => pageConfig.customers.renderRow(customer)).join('');

        return `
        <div class="w-full max-w-7xl mx-auto pointer-events-auto h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div>
                <a href="#agents" class="text-sm text-custom-light-blue hover:underline"><i data-lucide="arrow-left" class="inline-block w-4 h-4 mr-1"></i>Back to Agents</a>
                <h1 class="text-4xl font-bold text-white mt-2">${agent.name}</h1>
                <p class="text-custom-grey">${agent.role}</p>
                <p class="text-custom-grey">${agent.email} | ${agent.phone}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Total Revenue Generated</h3><p class="text-2xl font-bold text-white">$${stats.totalRevenue.toFixed(2)}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Managed Customers</h3><p class="text-2xl font-bold text-white">${stats.managedCustomers}</p></div>
                <div class="glass-panel p-4 rounded-lg text-center"><h3 class="text-custom-grey text-sm font-semibold mb-1">Completed Orders</h3><p class="text-2xl font-bold text-white">${stats.completedOrders}</p></div>
            </div>

            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Assigned Orders</h3>
                <div class="overflow-x-auto"><table class="data-table"><thead><tr>${pageConfig.orders.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${ordersHtml || `<tr><td colspan="${pageConfig.orders.headers.length}" class="text-center py-4">No orders found.</td></tr>`}</tbody></table></div>
            </div>
            <div class="glass-panel p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Assigned Customers</h3>
                <div class="overflow-x-auto"><table class="data-table"><thead><tr>${pageConfig.customers.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${customersHtml || `<tr><td colspan="="${pageConfig.customers.headers.length}" class="text-center py-4">No customers found.</td></tr>`}</tbody></table></div>
            </div>
        </div>`;
    },

};

// Add functions to the exports if they don't exist
detailsRenderer.renderAgentDetailPage = detailsRenderer.renderAgentDetailPage || function(agentId) { return `Agent detail page for ${agentId} coming soon.`; };
detailsRenderer.renderProductDetailPage = detailsRenderer.renderProductDetailPage || function(productId) { return `Product detail page for ${productId} coming soon.`; };