// js/ui-modals.js
import { App } from './state.js';
import { api } from './api.js';
import { router } from './router.js';
import { renderDashboard } from './dashboard.js';
import { renderAuthModal } from './auth-modal.js';
import { formTemplates } from './ui-form-templates.js';


export const createModals = (ui) => ({

        openShipmentModal(orderId) {
        const order = api.get('orders', orderId);
        if (!order) return;

        const modalHtml = `
        <div id="shipmentModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-md transform transition-all duration-300">
                <form id="shipmentForm">
                    <div class="p-4 border-b border-white/10 flex justify-between items-center">
                        <h2 class="text-xl font-bold text-white">Add Shipping Details for Order #${order.id}</h2>
                        <button type="button" class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block mb-1 text-sm text-custom-grey">Shipping Carrier</label>
                            <input type="text" name="shippingCarrier" class="form-input" placeholder="e.g., DHL, FedEx" required>
                        </div>
                        <div>
                            <label class="block mb-1 text-sm text-custom-grey">Tracking Number</label>
                            <input type="text" name="trackingNumber" class="form-input" placeholder="Enter tracking number" required>
                        </div>
                    </div>
                    <div class="p-4 bg-black/20 flex justify-end space-x-4">
                        <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Cancel</button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Mark as Shipped</button>
                    </div>
                </form>
            </div>
        </div>`;
        
        ui.elements.modalContainer.innerHTML = modalHtml;
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));

        document.getElementById('shipmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const carrier = e.target.shippingCarrier.value;
            const tracking = e.target.trackingNumber.value;
            
            order.shippingCarrier = carrier;
            order.trackingNumber = tracking;
            order.status = 'shipped';

            api.update('orders', orderId, order);
            api.save();
            showToast(`Order #${orderId} marked as shipped.`, 'success');
            this.closeAllModals();
            router.renderCurrentPage();
        });
    },

    openCrudModal(id = null, resource = App.state.currentPage, options = {}) {
        const config = ui.pageConfig[resource];
        // Use the imported formTemplates
        if (!config || !formTemplates[resource]) { return; }

        let item = id ? api.get(resource, id) : {};
        
        // For new contracts, we need to pass the customerId
        if (resource === 'customerContracts' && options.customerId) {
            item.customerId = options.customerId;
        }

        let title;
        const resourceName = resource.endsWith('s') ? resource.slice(0, -1) : resource;
        if (id) {
            const noun = (config.addBtnText || `Item`).replace('New ', '');
            title = `Edit ${noun}`;
        } else {
            title = config.addBtnText || `New ${resourceName}`;
        }
        const formHtml = formTemplates[resource](item);
        ui.elements.modalContainer.innerHTML = `
        <div id="crudModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-lg transform transition-all duration-300">
                <div class="p-4 border-b border-white/10 flex justify-between items-center"><h2 class="text-xl font-bold text-white">${title}</h2><button class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button></div>
                <div class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar"><form id="modalForm" class="space-y-4" data-resource="${resource}">${formHtml}</form></div>
                <div class="p-4 bg-black/20 flex justify-end space-x-4"><button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Cancel</button><button type="submit" form="modalForm" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save</button></div>
            </div>
        </div>`;
        document.getElementById('modalForm').dataset.resource = resource;

        if (resource === 'orders' || resource === 'purchaseOrders') {
            const container = document.getElementById('line-items-container');
            document.getElementById('add-line-item-btn').addEventListener('click', () => {
                const newRow = document.createElement('div');
                let template;
                if (resource === 'orders') {
                   template = this.formTemplates.orders().match(/<div class="flex items-center space-x-2 line-item-row">[\s\S]*?<\/div>/)[0];
                } else {
                   template = this.formTemplates.purchaseOrders().match(/<div class="flex items-center space-x-2 line-item-row">[\s\S]*?<\/div>/)[0];
                }
                newRow.innerHTML = template;
                container.appendChild(newRow.firstElementChild);
                lucide.createIcons();
            });
            container.addEventListener('click', (e) => {
                if (e.target.closest('.remove-line-item-btn')) { e.target.closest('.line-item-row').remove(); }
            });
        } else if (resource === 'inventory') {
            const pricingContainer = document.getElementById('pricing-tiers-container');
            document.getElementById('add-pricing-tier-btn').addEventListener('click', () => {
                const newRow = document.createElement('div');
                const tierRowHtml = `
                    <div class="flex items-center space-x-2 pricing-tier-row">
                        <input type="number" name="tier_minQty" class="form-input w-32" placeholder="Min Qty" value="1" min="1" required>
                        <input type="number" name="tier_price" step="0.01" class="form-input flex-grow" placeholder="Price" value="0.00" required>
                        <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-pricing-tier-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>`;
                newRow.innerHTML = tierRowHtml;
                pricingContainer.appendChild(newRow.firstElementChild);
                lucide.createIcons();
            });
            pricingContainer.addEventListener('click', (e) => {
                if (e.target.closest('.remove-pricing-tier-btn')) { e.target.closest('.pricing-tier-row').remove(); }
            });

            const bomContainer = document.getElementById('bom-container');
            document.getElementById('add-bom-item-btn').addEventListener('click', () => {
                const newRow = document.createElement('div');
                const bomRowHtml = `
                    <div class="flex items-center space-x-2 bom-row">
                        <select name="bom_componentId" class="form-select flex-grow">
                            ${api.get('components').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                        <input type="number" name="bom_quantity" class="form-input w-24" placeholder="Qty" value="1" min="1">
                        <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-bom-row-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>`;
                newRow.innerHTML = bomRowHtml;
                bomContainer.appendChild(newRow.firstElementChild);
                lucide.createIcons();
            });
            bomContainer.addEventListener('click', (e) => {
                if (e.target.closest('.remove-bom-row-btn')) { e.target.closest('.bom-row').remove(); }
            });
        }
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
    },

    openProductionModal(productId) {
        const product = api.get('inventory', productId);
        ui.elements.modalContainer.innerHTML = `
        <div id="productionModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-sm transform transition-all duration-300">
                <div class="p-6 text-center">
                    <h2 class="text-xl font-bold text-white mb-2">Produce: ${product.name}</h2>
                    <p class="text-custom-grey mb-6">Enter the quantity to produce.</p>
                    <form id="productionForm">
                        <input type="number" id="production-quantity" class="form-input text-center" value="1" min="1" required>
                        <div class="flex justify-center space-x-4 mt-6">
                            <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg close-modal-btn">Cancel</button>
                            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">Produce</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
        document.getElementById('productionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const quantity = parseInt(document.getElementById('production-quantity').value, 10);
            if (quantity > 0) {
                api.executeProductionOrder(productId, quantity);
                this.closeAllModals();
                router.renderCurrentPage();
                renderDashboard();
            }
        });
    },

    openReceiveStockModal(poId) {
        const po = api.get('purchaseOrders', poId);
        const itemRows = po.items.map(item => {
            const component = api.get('components', item.componentId);
            return `
            <div class="grid grid-cols-3 gap-4 items-center receive-stock-row" data-component-id="${item.componentId}" data-quantity="${item.quantity}">
                <div class="col-span-2">
                    <p class="font-semibold text-white">${component.name}</p>
                    <p class="text-sm text-custom-grey">Quantity: ${item.quantity}</p>
                </div>
                <div>
                    <label class="block mb-1 text-xs text-custom-grey">Supplier Lot #</label>
                    <input type="text" name="supplierLotNumber" class="form-input" required>
                </div>
            </div>
            `
        }).join('');

        const modalHtml = `
        <div id="receiveStockModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-lg transform transition-all duration-300">
                <form id="receiveStockForm">
                    <div class="p-4 border-b border-white/10 flex justify-between items-center">
                        <h2 class="text-xl font-bold text-white">Receive Stock for P.O. #${po.poNumber}</h2>
                        <button type="button" class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-4">${itemRows}</div>
                     <div class="p-4 bg-black/20 flex justify-end space-x-4">
                        <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Cancel</button>
                        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Confirm Receipt</button>
                    </div>
                </form>
            </div>
        </div>`;

        ui.elements.modalContainer.innerHTML = modalHtml;
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
        
        document.getElementById('receiveStockForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const rows = document.querySelectorAll('.receive-stock-row');
            const itemsWithLots = Array.from(rows).map(row => ({
                componentId: parseInt(row.dataset.componentId, 10),
                quantity: parseInt(row.dataset.quantity, 10),
                supplierLotNumber: row.querySelector('[name="supplierLotNumber"]').value
            }));

            api.receivePurchaseOrderStock(poId, itemsWithLots);
            this.closeAllModals();
            router.renderCurrentPage();
            renderDashboard();
        });
    },

    openProductionOrderDetailsModal(poId) {
        const order = api.get('productionOrders', poId);
        const product = api.get('inventory', order.productId);
        
        const componentRows = order.componentsUsed.map(c => {
            const component = api.get('components', c.componentId);
            return `
            <tr class="border-b border-white/10">
                <td class="py-2">${component.name}</td>
                <td class="py-2">${c.supplierLotNumber}</td>
                <td class="py-2 text-right">${c.quantityUsed}</td>
            </tr>`;
        }).join('');

        const modalHtml = `
        <div id="poDetailModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-xl transform transition-all duration-300">
                <div class="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white">Production Details for ${order.lotNumber}</h2>
                    <button class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-4">
                    <p><span class="font-semibold text-custom-grey">Product:</span> ${product.name}</p>
                    <p><span class="font-semibold text-custom-grey">Quantity Produced:</span> ${order.quantityProduced}</p>
                    <p><span class="font-semibold text-custom-grey">Date:</span> ${order.date}</p>
                    <h3 class="text-lg font-semibold text-custom-light-blue pt-4 border-t border-white/10">Components Used</h3>
                    <table class="w-full">
                        <thead><tr class="border-b-2 border-white/20">
                            <th class="text-left font-semibold py-2">Component</th>
                            <th class="text-left font-semibold py-2">Supplier Lot #</th>
                            <th class="text-right font-semibold py-2">Quantity Used</th>
                        </tr></thead>
                        <tbody>${componentRows}</tbody>
                    </table>
                </div>
                 <div class="p-4 bg-black/20 flex justify-end">
                    <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Close</button>
                </div>
            </div>
        </div>`;
        ui.elements.modalContainer.innerHTML = modalHtml;
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
    },

    openBatchDetailModal(itemId, type) {
        const item = api.get(type, itemId);
        const isInventory = type === 'inventory';
        const headers = isInventory
            ? ['Lot Number', 'Quantity', 'Expiry Date']
            : ['Supplier Lot #', 'Quantity', 'Received Date'];

        const batchRows = item.stockBatches.map(batch => `
            <tr class="border-b border-white/10">
                <td class="py-2">${isInventory ? batch.lotNumber : batch.supplierLotNumber}</td>
                <td class="py-2 text-right">${batch.quantity}</td>
                <td class="py-2 text-right">${isInventory ? batch.expiryDate : batch.receivedDate}</td>
            </tr>
        `).join('');

        const modalHtml = `
        <div id="batchDetailModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-lg transform transition-all duration-300">
                <div class="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white">Stock Batches: ${item.name}</h2>
                    <button class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <table class="w-full">
                        <thead><tr class="border-b-2 border-white/20">
                            <th class="text-left font-semibold py-2">${headers[0]}</th>
                            <th class="text-right font-semibold py-2">${headers[1]}</th>
                            <th class="text-right font-semibold py-2">${headers[2]}</th>
                        </tr></thead>
                        <tbody>${batchRows.length ? batchRows : `<tr><td colspan="3" class="text-center py-4 text-custom-grey">No batches in stock.</td></tr>`}</tbody>
                    </table>
                </div>
                 <div class="p-4 bg-black/20 flex justify-end space-x-4">
                    <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Close</button>
                </div>
            </div>
        </div>`;
        ui.elements.modalContainer.innerHTML = modalHtml;
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
    },

    openConfirmModal(message, callback) {
        ui.elements.modalContainer.innerHTML = `
        <div id="confirmModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"><div class="glass-panel rounded-lg w-full max-w-sm transform transition-all duration-300"><div class="p-6 text-center"><h2 class="text-xl font-bold text-white mb-2">Are you sure?</h2><p class="text-custom-grey mb-6">${message}</p><div class="flex justify-center space-x-4"><button id="cancelConfirmBtn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button><button id="confirmDeleteBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Delete</button></div></div></div></div>`;
        document.getElementById('cancelConfirmBtn').addEventListener('click', this.closeAllModals);
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => { callback(); this.closeAllModals(); });
    },

    openInvoiceDetailModal(invoiceId) {
        const invoice = api.get('invoices', invoiceId);
        const customer = api.get('customers', invoice.customerId);
        const order = api.get('orders', invoice.orderId);
        if (!invoice || !customer || !order) { alert('Error: Could not find invoice details.'); return; }

        const lineItemsHtml = order.items.map(item => {
            const product = api.get('inventory', item.productId);
            if (!product) return '';
            const price = api.getProductPriceForQuantity(product, item.quantity, order.customerId);
            return `<tr class="border-b border-white/10"><td class="py-2">${product.name}</td><td class="py-2 text-right">${item.quantity}</td><td class="py-2 text-right">$${price.toFixed(2)}</td><td class="py-2 text-right">$${(price * item.quantity).toFixed(2)}</td></tr>`;
        }).join('');
        
        // --- UPDATED: USE NEW getOrderTotals to show breakdown ---
        const totals = api.getOrderTotals(order);

        const modalHtml = `
        <div id="invoiceDetailModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-2xl transform transition-all duration-300">
                <div class="p-4 border-b border-white/10 flex justify-between items-center"><h2 class="text-xl font-bold text-white">Invoice Details</h2><button class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button></div>
                <div class="p-8 text-white max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div class="flex justify-between items-start mb-8"><div><h3 class="text-3xl font-bold">INVOICE</h3><p class="text-custom-grey">${invoice.invoiceNumber}</p></div><div class="text-right"><h4 class="text-2xl font-bold">ROCTEC Inc.</h4><p class="text-custom-grey">Naaldwijk, South Holland</p></div></div>
                    <div class="flex justify-between mb-8"><div><p class="text-custom-grey mb-1">BILL TO</p><p class="font-bold">${customer.name}</p><p>${customer.company}</p></div><div class="text-right"><p class="text-custom-grey mb-1">Issue Date: <span class="font-semibold text-white">${invoice.issueDate}</span></p><p class="text-custom-grey mb-1">Due Date: <span class="font-semibold text-white">${invoice.dueDate}</span></p><p class="text-custom-grey mb-1">Status: <span class="font-semibold text-white capitalize">${invoice.status}</span></p></div></div>
                    <table class="w-full mb-8"><thead><tr class="border-b-2 border-white/20"><th class="text-left font-semibold py-2">Description</th><th class="text-right font-semibold py-2">Quantity</th><th class="text-right font-semibold py-2">Unit Price</th><th class="text-right font-semibold py-2">Amount</th></tr></thead><tbody>${lineItemsHtml}</tbody></table>
                    <div class="flex justify-end">
                        <div class="w-full md:w-1/2">
                            <div class="flex justify-between py-2"><span class="text-custom-grey">Subtotal</span><span>$${totals.subtotal.toFixed(2)}</span></div>
                            <div class="flex justify-between py-2"><span class="text-custom-grey">Tax (${totals.taxRate.name} @ ${(totals.taxRate.rate * 100).toFixed(0)}%)</span><span>$${totals.taxAmount.toFixed(2)}</span></div>
                            <div class="flex justify-between py-2 border-t-2 border-white/20 mt-2"><span class="text-xl font-bold">Total Due</span><span class="text-xl font-bold">$${totals.total.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-black/20 flex justify-end space-x-4"><button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Close</button></div>
            </div>
        </div>`;
        ui.elements.modalContainer.innerHTML = modalHtml;
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
    },

    openInvoicePaymentModal(invoiceId) {
        const paymentMethodOptions = api.get('paymentMethods')
            .filter(pm => pm.enabled)
            .map(pm => `<option value="${pm.id}">${pm.name}</option>`)
            .join('');

        const modalHtml = `
        <div id="confirmModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-sm transform transition-all duration-300">
                <div class="p-6 text-center">
                    <h2 class="text-xl font-bold text-white mb-2">Confirm Payment</h2>
                    <p class="text-custom-grey mb-6">Select the payment method used for this invoice.</p>
                    <div class="mb-4">
                        <label class="block mb-1 text-sm text-custom-grey text-left">Payment Method</label>
                        <select id="paymentMethodSelect" class="form-select">${paymentMethodOptions}</select>
                    </div>
                    <div class="flex justify-center space-x-4">
                        <button id="cancelConfirmBtn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button id="confirmPaymentBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">Mark as Paid</button>
                    </div>
                </div>
            </div>
        </div>`;

        ui.elements.modalContainer.innerHTML = modalHtml;
        document.getElementById('cancelConfirmBtn').addEventListener('click', this.closeAllModals);
        document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
            const paymentMethodId = document.getElementById('paymentMethodSelect').value;
            api.markInvoiceAsPaid(invoiceId, paymentMethodId);
            this.closeAllModals();
            router.renderCurrentPage();
        });
    },

    openAuthModal() {
        ui.elements.modalContainer.innerHTML = renderAuthModal();
        lucide.createIcons(); 
        
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = e.target.username.value;
            const password = e.target.password.value;
            if (api.security.login(username, password)) {
                this.closeAllModals();
            }
        });
    },

    openReturnModal(orderId) {
        const order = api.get('orders', orderId);
        if (!order) return;

        const itemRows = order.items.map(item => {
            const product = api.get('inventory', item.productId);
            return `
            <div class="grid grid-cols-3 gap-4 items-center return-item-row" data-product-id="${item.productId}">
                <div class="col-span-2">
                    <p class="font-semibold text-white">${product.name}</p>
                    <p class="text-sm text-custom-grey">Ordered: ${item.quantity}</p>
                </div>
                <div>
                    <label class="block mb-1 text-xs text-custom-grey">Return Qty</label>
                    <input type="number" name="returnQuantity" class="form-input" value="0" min="0" max="${item.quantity}" required>
                </div>
            </div>
            `;
        }).join('');

        const modalHtml = `
        <div id="returnModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div class="glass-panel rounded-lg w-full max-w-lg transform transition-all duration-300">
                <form id="returnForm">
                    <div class="p-4 border-b border-white/10 flex justify-between items-center">
                        <h2 class="text-xl font-bold text-white">Process Return for Order #${order.id}</h2>
                        <button type="button" class="text-custom-grey hover:text-white close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-4">
                        <div>
                            <label class="block mb-1 text-sm text-custom-grey">Reason for Return</label>
                            <input type="text" name="reason" class="form-input" placeholder="e.g., Damaged goods, incorrect item" required>
                        </div>
                        <h3 class="text-md font-semibold text-custom-light-blue pt-4 border-t border-white/10">Items to Return</h3>
                        ${itemRows}
                    </div>
                    <div class="p-4 bg-black/20 flex justify-end space-x-4">
                        <button type="button" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg close-modal-btn">Cancel</button>
                        <button type="submit" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">Create Credit Note</button>
                    </div>
                </form>
            </div>
        </div>`;

        ui.elements.modalContainer.innerHTML = modalHtml;
        lucide.createIcons();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', this.closeAllModals));
    },

    closeAllModals() {
        ui.elements.modalContainer.innerHTML = '';
        App.state.currentEditId = null;
    },
});