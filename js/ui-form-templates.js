// js/ui-form-templates.js
import { api } from './api.js';

export const formTemplates = {
    quotes: (quote = {}) => {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];
        const statuses = ['draft', 'sent', 'accepted', 'rejected'];
        const statusOptions = statuses.map(s => `<option value="${s}" ${quote.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');
        
        const lineItemRow = (item = {}) => {
            const optionsHtml = api.get('inventory').map(p => {
                const isSelected = item.productId && p.id == item.productId;
                return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.name}</option>`;
            }).join('');
            return `
            <div class="flex items-center space-x-2 line-item-row">
                <select name="productId" class="form-select flex-grow">${optionsHtml}</select>
                <input type="number" name="quantity" class="form-input w-24" placeholder="Qty" value="${item.quantity || 1}" min="1">
                <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-line-item-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>`;
        };
        const existingLineItems = quote.items && quote.items.length ? quote.items.map(lineItemRow).join('') : lineItemRow();

        const leadOptions = api.get('leads').map(l => `<option value="${l.id}" ${quote.leadId == l.id ? 'selected' : ''}>${l.name} - ${l.company}</option>`).join('');
        const customerOptions = api.get('customers').map(c => `<option value="${c.id}" ${quote.customerId == c.id ? 'selected' : ''}>${c.name} - ${c.company}</option>`).join('');

        return `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block mb-1 text-sm text-custom-grey">Quote Date</label><input type="date" name="date" class="form-input" value="${quote.date || today}" required></div>
                <div><label class="block mb-1 text-sm text-custom-grey">Expiry Date</label><input type="date" name="expiryDate" class="form-input" value="${quote.expiryDate || nextMonth}" required></div>
            </div>
            <div><label class="block mb-1 text-sm text-custom-grey">Status</label><select name="status" class="form-select">${statusOptions}</select></div>

            <div class="border-t border-white/10 pt-4 mt-4">
                <label class="block mb-2 text-sm font-semibold text-custom-light-blue">Recipient</label>
                <div><label class="block mb-1 text-sm text-custom-grey">Link to Lead</label><select name="leadId" class="form-select"><option value="">None</option>${leadOptions}</select></div>
                <div class="mt-2"><label class="block mb-1 text-sm text-custom-grey">Link to Customer</label><select name="customerId" class="form-select"><option value="">None</option>${customerOptions}</select></div>
                <p class="text-xs text-custom-grey mt-1">Please select either a Lead or a Customer.</p>
            </div>

            <div class="border-t border-white/10 pt-4"><label class="block mb-2 text-sm font-semibold text-custom-light-blue">Products</label><div id="line-items-container" class="space-y-2">${existingLineItems}</div><button type="button" id="add-line-item-btn" class="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Add Product</span></button></div>
            `;
    },
    leads: (lead = {}) => {
        const statuses = ['new', 'contacted', 'qualified', 'lost'];
        const statusOptions = statuses.map(s => `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');
        const agentOptions = api.get('agents').map(a => `<option value="${a.id}" ${lead.agentId == a.id ? 'selected' : ''}>${a.name}</option>`).join('');

        return `
            <div><label class="block mb-1 text-sm text-custom-grey">Name</label><input type="text" name="name" class="form-input" value="${lead.name || ''}" required></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Company</label><input type="text" name="company" class="form-input" value="${lead.company || ''}"></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Email</label><input type="email" name="email" class="form-input" value="${lead.email || ''}"></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Phone</label><input type="tel" name="phone" class="form-input" value="${lead.phone || ''}"></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Assigned Agent</label><select name="agentId" class="form-select">${agentOptions}</select></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Status</label><select name="status" class="form-select">${statusOptions}</select></div>
        `;
    },
    taxRates: (rate = {}) => {
        return `
            <div>
                <label class="block mb-1 text-sm text-custom-grey">Rate Name</label>
                <input type="text" name="name" class="form-input" value="${rate.name || ''}" placeholder="e.g., TVA Standard" required>
            </div>
            <div>
                <label class="block mb-1 text-sm text-custom-grey">Rate (as a decimal)</label>
                <input type="number" name="rate" step="0.01" class="form-input" value="${rate.rate || '0.19'}" placeholder="e.g., 0.19 for 19%" required>
            </div>
            <div class="flex items-center space-x-2">
                <input type="checkbox" id="isDefault" name="isDefault" class="h-4 w-4 rounded bg-black/20 border-white/20 text-blue-500 focus:ring-blue-500" ${rate.isDefault ? 'checked' : ''}>
                <label for="isDefault" class="text-sm text-custom-grey">Set as default tax rate</label>
            </div>
        `;
    },
    customerContracts: (contract = {}) => {
        const productOptions = api.get('inventory').map(p => `<option value="${p.id}" ${contract.productId == p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

        return `
            <input type="hidden" name="customerId" value="${contract.customerId || ''}">
            <div>
                <label class="block mb-1 text-sm text-custom-grey">Product</label>
                <select name="productId" class="form-select">${productOptions}</select>
            </div>
            <div>
                <label class="block mb-1 text-sm text-custom-grey">Contract Price</label>
                <input type="number" name="contractPrice" step="0.01" class="form-input" value="${contract.contractPrice || '0.00'}" required>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block mb-1 text-sm text-custom-grey">Start Date</label>
                    <input type="date" name="startDate" class="form-input" value="${contract.startDate || today}" required>
                </div>
                <div>
                    <label class="block mb-1 text-sm text-custom-grey">End Date</label>
                    <input type="date" name="endDate" class="form-input" value="${contract.endDate || nextYear}" required>
                </div>
            </div>
        `;
    },
    users: (user = {}) => {
        const isEditing = !!user.id;
        const passwordField = `
            <div>
                <label class="block mb-1 text-sm text-custom-grey">Password</label>
                <input type="password" name="password" class="form-input" placeholder="${isEditing ? 'Leave blank to keep current' : 'Enter password'}" ${isEditing ? '' : 'required'}>
            </div>`;
        
        const roles = ['admin', 'sales', 'inventory', 'finance'];
        const roleOptions = roles.map(role => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`).join('');

        return `
            <div><label class="block mb-1 text-sm text-custom-grey">Full Name</label><input type="text" name="name" class="form-input" value="${user.name || ''}" required></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Username</label><input type="text" name="username" class="form-input" value="${user.username || ''}" required></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Role</label><select name="role" class="form-select">${roleOptions}</select></div>
            ${passwordField}
        `;
    },
    agents: (agent = {}) => `<div><label class="block mb-1 text-sm text-custom-grey">Name</label><input type="text" name="name" class="form-input" value="${agent.name || ''}" required></div><div><label class="block mb-1 text-sm text-custom-grey">Email</label><input type="email" name="email" class="form-input" value="${agent.email || ''}" required></div><div><label class="block mb-1 text-sm text-custom-grey">Phone</label><input type="tel" name="phone" class="form-input" value="${agent.phone || ''}"></div><div><label class="block mb-1 text-sm text-custom-grey">Role</label><select name="role" class="form-select"><option value="Agent" ${agent.role === 'Agent' ? 'selected' : ''}>Agent</option><option value="Administrator" ${agent.role === 'Administrator' ? 'selected' : ''}>Administrator</option></select></div>`,
    customers: (customer = {}) => {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dayCheckboxes = days.map(day => {
            const isChecked = customer.visitSchedule?.days?.includes(day);
            return `
            <div>
                <input type="checkbox" name="visitDay" value="${day}" id="day-admin-${day}" class="hidden peer" ${isChecked ? 'checked' : ''}>
                <label for="day-admin-${day}" class="inline-block text-center w-14 py-2 border border-white/20 rounded-md cursor-pointer text-sm peer-checked:bg-blue-600 peer-checked:border-blue-500 peer-checked:text-white transition-colors">
                    ${day}
                </label>
            </div>`;
        }).join('');

        return `
            <div><label class="block mb-1 text-sm text-custom-grey">Name</label><input type="text" name="name" class="form-input" value="${customer.name || ''}" required></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Company</label><input type="text" name="company" class="form-input" value="${customer.company || ''}"></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Email</label><input type="email" name="email" class="form-input" value="${customer.email || ''}"></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Phone</label><input type="tel" name="phone" class="form-input" value="${customer.phone || ''}"></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Assigned Agent</label><select name="agentId" class="form-select">${api.get('agents').map(a => `<option value="${a.id}" ${customer.agentId == a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select></div>
            
            <div class="border-t border-white/10 pt-4 mt-4">
                <h3 class="text-md font-semibold text-custom-light-blue mb-2">Visit Schedule</h3>
                <div class="grid grid-cols-1 gap-4">
                     <div>
                        <label class="block mb-2 text-sm text-custom-grey">Visit Days</label>
                        <div class="flex flex-wrap gap-2">${dayCheckboxes}</div>
                    </div>
                    <div>
                        <label class="block mb-1 text-sm text-custom-grey">Frequency</label>
                        <select name="visitSchedule.frequency" class="form-select">
                            <option value="weekly" ${customer.visitSchedule?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="bi-weekly" ${customer.visitSchedule?.frequency === 'bi-weekly' ? 'selected' : ''}>Bi-Weekly</option>
                            <option value="monthly" ${customer.visitSchedule?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },
    suppliers: (supplier = {}) => `<div><label class="block mb-1 text-sm text-custom-grey">Company Name</label><input type="text" name="name" class="form-input" value="${supplier.name || ''}" required></div><div><label class="block mb-1 text-sm text-custom-grey">Contact Person</label><input type="text" name="contactPerson" class="form-input" value="${supplier.contactPerson || ''}"></div><div><label class="block mb-1 text-sm text-custom-grey">Email</label><input type="email" name="email" class="form-input" value="${supplier.email || ''}"></div><div><label class="block mb-1 text-sm text-custom-grey">Phone</label><input type="tel" name="phone" class="form-input" value="${supplier.phone || ''}"></div>`,
    components: (item = {}) => `
        <div><label class="block mb-1 text-sm text-custom-grey">Component Name</label><input type="text" name="name" class="form-input" value="${item.name || ''}" required></div>
        <div><label class="block mb-1 text-sm text-custom-grey">Cost</label><input type="number" name="cost" step="0.01" class="form-input" value="${item.cost || 0}" required></div>
    `,
    inventory: (item = {}) => {
        const tierRow = (tier = { minQty: 1, price: 0 }) => `
            <div class="flex items-center space-x-2 pricing-tier-row">
                <input type="number" name="tier_minQty" class="form-input w-32" placeholder="Min Qty" value="${tier.minQty}" min="1" required>
                <input type="number" name="tier_price" step="0.01" class="form-input flex-grow" placeholder="Price" value="${tier.price.toFixed(2)}" required>
                <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-pricing-tier-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>`;
        const existingTiers = (item.pricingTiers && item.pricingTiers.length ? item.pricingTiers.map(tierRow).join('') : tierRow());
        
        const bomRow = (bomItem = {}) => `
            <div class="flex items-center space-x-2 bom-row">
                <select name="bom_componentId" class="form-select flex-grow">
                    ${api.get('components').map(c => `<option value="${c.id}" ${bomItem.componentId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                <input type="number" name="bom_quantity" class="form-input w-24" placeholder="Qty" value="${bomItem.quantity || 1}" min="1">
                <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-bom-row-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>`;
        const existingBomItems = item.bom && item.bom.length ? item.bom.map(bomRow).join('') : '';

        return `
            <div><label class="block mb-1 text-sm text-custom-grey">Product Name</label><input type="text" name="name" class="form-input" value="${item.name || ''}" required></div>
            <div><label class="block mb-1 text-sm text-custom-grey">SKU</label><input type="text" name="sku" class="form-input" value="${item.sku || ''}" required></div>
            <div class="border-t border-white/10 pt-4"><label class="block mb-2 text-sm font-semibold text-custom-light-blue">Pricing Tiers</label><div id="pricing-tiers-container" class="space-y-2">${existingTiers}</div><button type="button" id="add-pricing-tier-btn" class="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Add Tier</span></button></div>
            <div class="border-t border-white/10 pt-4"><label class="block mb-2 text-sm font-semibold text-custom-light-blue">Bill of Materials (BOM)</label><div id="bom-container" class="space-y-2">${existingBomItems}</div><button type="button" id="add-bom-item-btn" class="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Add Component</span></button></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Cost</label><input type="number" name="cost" step="0.01" class="form-input" value="${item.cost || ''}" required></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Shelf Life (Days)</label><input type="number" name="shelfLifeDays" class="form-input" value="${item.shelfLifeDays || 90}" required></div>`;
    },
    purchaseOrders: (po = {}) => {
        const supplierOptions = api.get('suppliers').map(s => `<option value="${s.id}" ${po.supplierId == s.id ? 'selected' : ''}>${s.name}</option>`).join('');
        const lineItemRow = (item = {}) => `
            <div class="flex items-center space-x-2 line-item-row">
                <select name="componentId" class="form-select flex-grow">
                    ${api.get('components').map(p => `<option value="${p.id}" ${item.componentId == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
                <input type="number" name="quantity" class="form-input w-24" placeholder="Qty" value="${item.quantity || 1}" min="1">
                <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-line-item-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>`;
        const existingLineItems = po.items && po.items.length ? po.items.map(lineItemRow).join('') : lineItemRow();
        return `
            <div><label class="block mb-1 text-sm text-custom-grey">Supplier</label><select name="supplierId" class="form-select">${supplierOptions}</select></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Status</label><select name="status" class="form-select"><option value="draft" ${po.status === 'draft' ? 'selected' : ''}>Draft</option><option value="sent" ${po.status === 'sent' ? 'selected' : ''}>Sent</option></select></div>
            <div class="border-t border-white/10 pt-4"><label class="block mb-2 text-sm font-semibold text-custom-light-blue">Components to Order</label><div id="line-items-container" class="space-y-2">${existingLineItems}</div><button type="button" id="add-line-item-btn" class="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Add Component</span></button></div>`;
    },
    orders: (order = {}) => {
        const productOptions = api.get('inventory').map(p => {
            const basePrice = p.pricingTiers[0]?.price || 0;
            return `<option value="${p.id}">${p.name} - $${basePrice.toFixed(2)}</option>`;
        }).join('');
        const lineItemRow = (item = {}) => {
            const selectedProduct = api.get('inventory', item.productId);
            const optionsHtml = api.get('inventory').map(p => {
                const basePrice = p.pricingTiers[0]?.price || 0;
                const isSelected = selectedProduct && p.id == selectedProduct.id;
                return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.name} - $${basePrice.toFixed(2)}</option>`;
            }).join('');
            return `
            <div class="flex items-center space-x-2 line-item-row">
                <select name="productId" class="form-select flex-grow">${optionsHtml}</select>
                <input type="number" name="quantity" class="form-input w-24" placeholder="Qty" value="${item.quantity || 1}" min="1">
                <button type="button" class="p-2 text-red-500 hover:text-red-400 remove-line-item-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>`;
        };
        const existingLineItems = order.items && order.items.length ? order.items.map(lineItemRow).join('') : lineItemRow();
        return `
            <div><label class="block mb-1 text-sm text-custom-grey">Customer</label><select name="customerId" class="form-select">${api.get('customers').map(c => `<option value="${c.id}" ${order.customerId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
            <div><label class="block mb-1 text-sm text-custom-grey">Status</label><select name="status" class="form-select"><option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option><option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option><option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option></select></div>
            <div class="border-t border-white/10 pt-4"><label class="block mb-2 text-sm font-semibold text-custom-light-blue">Products</label><div id="line-items-container" class="space-y-2">${existingLineItems}</div><button type="button" id="add-line-item-btn" class="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Add Product</span></button></div>`;
    },
};
