// js/ui-pages.js
import { api } from './api.js';
import { App } from './state.js';
import { ui } from './ui.js';

function calculateOrderProfit(order) {
    if (order.status !== 'completed' && order.status !== 'shipped' && order.status !== 'delivered') {
        return null;
    }
    return order.items.reduce((totalProfit, item) => {
        const product = api.get('inventory', item.productId);
        if (product) {
            const price = api.getProductPriceForQuantity(product, item.quantity, order.customerId);
            const itemProfit = (price - product.cost) * item.quantity;
            return totalProfit + itemProfit;
        }
        return totalProfit;
    }, 0);
}

export const pageConfig = {
    quotes: {
        title: 'Manage Quotes',
        addBtnText: 'New Quote',
        headers: ['Quote #', 'Recipient', 'Date', 'Total', 'Status', 'Actions'],
        exportHeaders: ['Quote #', 'Recipient Type', 'Recipient ID', 'Recipient Name', 'Date', 'Expiry Date', 'Total', 'Status'],
        getExportData: (quote) => {
            const recipient = quote.customerId ? api.get('customers', quote.customerId) : api.get('leads', quote.leadId);
            const total = api.calculateOrderTotal(quote);
            return [
                quote.quoteNumber,
                quote.customerId ? 'Customer' : 'Lead',
                recipient.id,
                recipient.name,
                quote.date,
                quote.expiryDate,
                total.toFixed(2),
                quote.status
            ];
        },
        renderRow: (quote) => {
            const recipient = quote.customerId ? api.get('customers', quote.customerId) : api.get('leads', quote.leadId);
            const recipientType = quote.customerId ? 'customers' : 'leads';
            const total = api.calculateOrderTotal(quote); 
            const statusColors = {
                draft: 'bg-gray-500 text-white',
                sent: 'text-white bg-blue-500',
                accepted: 'status-completed',
                rejected: 'status-cancelled',
                converted: 'text-white bg-purple-600'
            };
            const createOrderBtn = quote.status === 'accepted' ? `<i data-lucide="file-plus-2" class="w-4 h-4 cursor-pointer hover:text-green-400 create-order-from-quote-btn" title="Create Order" data-id="${quote.id}"></i>` : '';

            return `<tr>
                <td>${quote.quoteNumber}</td>
                <td>${recipient?.name || 'N/A'} <span class="text-xs text-custom-grey">(${recipientType.slice(0, -1)})</span></td>
                <td>${quote.date}</td>
                <td>$${total.toFixed(2)}</td>
                <td><span class="status-pill ${statusColors[quote.status] || ''}">${quote.status}</span></td>
                <td>
                    <div class="flex space-x-2">
                        ${createOrderBtn}
                        <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${quote.id}" data-resource="quotes"></i>
                        <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${quote.id}" data-resource="quotes"></i>
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['quoteNumber', 'status']
    },
    leads: {
        title: 'Manage Leads',
        addBtnText: 'New Lead',
        headers: ['Name', 'Company', 'Email', 'Phone', 'Assigned Agent', 'Status', 'Actions'],
        exportHeaders: ['Lead ID', 'Name', 'Company', 'Email', 'Phone', 'Agent ID', 'Agent Name', 'Status'],
        getExportData: (lead) => {
            const agent = api.get('agents', lead.agentId);
            return [lead.id, lead.name, lead.company, lead.email, lead.phone, lead.agentId, agent?.name || 'N/A', lead.status];
        },
        renderRow: (lead) => {
            const agent = api.get('agents', lead.agentId);
            const statusColors = {
                new: 'status-pending',
                contacted: 'text-white bg-blue-500',
                qualified: 'status-completed',
                lost: 'status-cancelled'
            };
            const convertBtn = lead.status === 'qualified' ? `<i data-lucide="user-check" class="w-4 h-4 cursor-pointer hover:text-green-400 convert-lead-btn" title="Convert to Customer" data-id="${lead.id}"></i>` : '';

            return `<tr>
                <td>${lead.name}</td>
                <td>${lead.company}</td>
                <td>${lead.email}</td>
                <td>${lead.phone}</td>
                <td>${agent?.name || 'N/A'}</td>
                <td><span class="status-pill ${statusColors[lead.status] || ''}">${lead.status}</span></td>
                <td>
                    <div class="flex space-x-2">
                        ${convertBtn}
                        <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${lead.id}" data-resource="leads"></i>
                        <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${lead.id}" data-resource="leads"></i>
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['name', 'company', 'status']
    },
    taxRates: {
        title: 'Manage Tax Rates',
        addBtnText: 'New Tax Rate',
        headers: ['Name', 'Rate', 'Default', 'Actions'],
        exportHeaders: ['Tax Rate ID', 'Name', 'Rate', 'Is Default'],
        getExportData: (rate) => [rate.id, rate.name, rate.rate, rate.isDefault],
        renderRow: (rate) => {
            const defaultPill = rate.isDefault ? `<span class="status-pill status-completed">Yes</span>` : `<span class="text-custom-grey">No</span>`;
            return `<tr>
                <td>${rate.name}</td>
                <td>${(rate.rate * 100).toFixed(2)}%</td>
                <td>${defaultPill}</td>
                <td>
                    <div class="flex space-x-2">
                        <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${rate.id}" data-resource="taxRates"></i>
                        <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${rate.id}" data-resource="taxRates"></i>
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['name']
    },
    customerContracts: {
        title: 'Manage Customer Contracts',
        addBtnText: 'New Contract',
        headers: ['Customer', 'Product', 'Contract Price', 'Start Date', 'End Date', 'Actions'],
        exportHeaders: ['Contract ID', 'Customer Name', 'Product Name', 'Contract Price', 'Start Date', 'End Date'],
        getExportData: (contract) => {
            const customer = api.get('customers', contract.customerId);
            const product = api.get('inventory', contract.productId);
            return [
                contract.id,
                customer?.name || 'N/A',
                product?.name || 'N/A',
                contract.contractPrice.toFixed(2),
                contract.startDate,
                contract.endDate
            ];
        },
        renderRow: (contract) => {
            const customer = api.get('customers', contract.customerId);
            const product = api.get('inventory', contract.productId);
            return `<tr>
                <td>${customer?.name || 'N/A'}</td>
                <td>${product?.name || 'N/A'}</td>
                <td class="font-semibold text-green-400">$${contract.contractPrice.toFixed(2)}</td>
                <td>${contract.startDate}</td>
                <td>${contract.endDate}</td>
                <td>
                    <div class="flex space-x-2">
                        <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${contract.id}" data-resource="customerContracts"></i>
                        <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${contract.id}" data-resource="customerContracts"></i>
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['customerId', 'productId']
    },
    users: {
        title: 'User Management',
        addBtnText: 'New User',
        headers: ['Name', 'Username', 'Role', 'Actions'],
        exportHeaders: ['User ID', 'Name', 'Username', 'Role'],
        getExportData: (user) => [user.id, user.name, user.username, user.role],
        renderRow: (user) => {
            const isCurrentUser = App.state.currentUser.id === user.id;
            const deleteBtn = !isCurrentUser ? `<i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${user.id}" data-resource="users"></i>` : '';

            return `<tr>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td><span class="status-pill status-completed">${user.role}</span></td>
                <td>
                    <div class="flex space-x-2">
                        <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${user.id}" data-resource="users"></i>
                        ${deleteBtn}
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['name', 'username', 'role']
    },
    creditNotes: {
        title: 'Manage Credit Notes',
        addBtnText: null,
        headers: ['Credit Note #', 'Original Order #', 'Customer', 'Issue Date', 'Total', 'Status'],
        exportHeaders: ['Credit Note #', 'Original Order #', 'Customer ID', 'Customer Name', 'Issue Date', 'Total', 'Status', 'Reason'],
        getExportData: (cn) => {
            const customer = api.get('customers', cn.customerId);
            return [
                cn.creditNoteNumber,
                cn.orderId,
                cn.customerId,
                customer?.name || 'N/A',
                cn.issueDate,
                cn.total.toFixed(2),
                cn.status,
                cn.reason
            ];
        },
        renderRow: (cn) => {
            const customer = api.get('customers', cn.customerId);
            return `<tr>
                <td>${cn.creditNoteNumber}</td>
                <td><a href="#orders/${cn.orderId}" class="text-custom-light-blue hover:underline">#${cn.orderId}</a></td>
                <td><a href="#customers/${cn.customerId}" class="text-custom-light-blue hover:underline">${customer?.name || 'N/A'}</a></td>
                <td>${cn.issueDate}</td>
                <td class="font-semibold text-red-400">-$${cn.total.toFixed(2)}</td>
                <td><span class="status-pill status-completed">${cn.status}</span></td>
            </tr>`;
        },
        searchFields: ['creditNoteNumber', 'orderId']
    },
    orders: {
        title: 'Manage Orders',
        addBtnText: 'New Order',
        headers: ['Order ID', 'Customer', 'Date', 'Total', 'Profit', 'Status', 'Actions'],
        exportHeaders: ['Order ID', 'Customer ID', 'Customer Name', 'Agent ID', 'Agent Name', 'Date', 'Total', 'Profit', 'Status'],
        getExportData: (order) => {
            const customer = api.get('customers', order.customerId);
            const agent = api.get('agents', order.agentId);
            const totals = api.getOrderTotals(order);
            const profit = calculateOrderProfit(order);
            return [
                order.id,
                order.customerId,
                customer?.name || 'N/A',
                order.agentId,
                agent?.name || 'N/A',
                order.date,
                totals.total.toFixed(2),
                profit !== null ? profit.toFixed(2) : 'N/A',
                order.status
            ];
        },
        renderRow: (order) => {
            const total = api.calculateOrderTotal(order);
            const profit = calculateOrderProfit(order);
            const profitText = profit !== null ? `$${profit.toFixed(2)}` : `<span class="text-custom-grey">-</span>`;
            const profitColor = profit === null ? '' : profit > 0 ? 'text-green-400' : 'text-red-400';
            const customer = api.get('customers', order.customerId);
            const statusColors = { 
                pending: 'status-pending', 
                completed: 'status-completed', 
                shipped: 'text-white bg-blue-500', 
                delivered: 'text-white bg-purple-600', 
                cancelled: 'status-cancelled' 
            };
            
            const generateInvoiceBtn = order.status === 'completed' ? `<i data-lucide="file-text" class="w-4 h-4 cursor-pointer hover:text-yellow-400 generate-invoice-btn" title="Generate Invoice" data-id="${order.id}"></i>` : '';
            const shipOrderBtn = order.status === 'completed' ? `<i data-lucide="send" class="w-4 h-4 cursor-pointer hover:text-blue-400 ship-order-btn" title="Ship Order" data-id="${order.id}"></i>` : '';

            return `<tr>
                <td><a href="#orders/${order.id}" class="text-custom-light-blue hover:underline">#${order.id}</a></td>
                <td><a href="#customers/${order.customerId}" class="text-custom-light-blue hover:underline">${customer?.name || 'N/A'}</a></td>
                <td>${order.date}</td>
                <td>$${total.toFixed(2)}</td>
                <td class="font-semibold ${profitColor}">${profitText}</td>
                <td><span class="status-pill ${statusColors[order.status]}">${order.status}</span></td>
                <td>
                    <div class="flex space-x-2">
                        ${shipOrderBtn}
                        <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${order.id}" data-resource="orders"></i>
                        ${generateInvoiceBtn}
                        <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${order.id}" data-resource="orders"></i>
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['id', 'status']
    },
    invoices: {
        title: 'Manage Invoices',
        addBtnText: null,
        headers: ['Invoice #', 'Customer', 'Order ID', 'Issue Date', 'Due Date', 'Total', 'Status', 'Actions'],
        exportHeaders: ['Invoice #', 'Customer ID', 'Customer Name', 'Order ID', 'Issue Date', 'Due Date', 'Total', 'Status'],
        getExportData: (invoice) => {
            const customer = api.get('customers', invoice.customerId);
            const originalOrder = api.get('orders', invoice.orderId);
            const total = api.calculateOrderTotal(originalOrder);
            return [
                invoice.invoiceNumber,
                invoice.customerId,
                customer?.name || 'N/A',
                invoice.orderId,
                invoice.issueDate,
                invoice.dueDate,
                total.toFixed(2),
                invoice.status
            ];
        },
        renderRow: (invoice) => {
            const statusColors = { paid: 'status-completed', sent: 'status-pending', draft: 'status-in-stock', overdue: 'status-cancelled' };
            const originalOrder = api.get('orders', invoice.orderId);
            const customer = api.get('customers', invoice.customerId);
            const total = api.calculateOrderTotal(originalOrder); 

            const markAsPaidBtn = invoice.status !== 'paid' ? `<i data-lucide="file-check-2" class="w-4 h-4 cursor-pointer hover:text-green-400 mark-paid-btn" title="Mark as Paid" data-id="${invoice.id}"></i>` : '';
            
            return `<tr>
                <td>${invoice.invoiceNumber}</td>
                <td><a href="#customers/${invoice.customerId}" class="text-custom-light-blue hover:underline">${customer?.name || 'N/A'}</a></td>
                <td><a href="#orders/${invoice.orderId}" class="text-custom-light-blue hover:underline">#${invoice.orderId}</a></td>
                <td>${invoice.issueDate}</td>
                <td>${invoice.dueDate}</td>
                <td>$${total.toFixed(2)}</td>
                <td><span class="status-pill ${statusColors[invoice.status] || ''}">${invoice.status}</span></td>
                <td>
                    <div class="flex space-x-2">
                        ${markAsPaidBtn}
                        <i data-lucide="eye" class="w-4 h-4 cursor-pointer hover:text-blue-400 view-invoice-btn" title="View Invoice" data-id="${invoice.id}"></i>
                        <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${invoice.id}" data-resource="invoices"></i>
                    </div>
                </td>
            </tr>`;
        },
        searchFields: ['invoiceNumber', 'status']
    },
    customers: {
        title: 'Manage Customers',
        addBtnText: 'New Customer',
        headers: ['Name', 'Company', 'Email', 'Phone', 'Agent', 'Actions'],
        exportHeaders: ['Customer ID', 'Name', 'Company', 'Email', 'Phone', 'Agent ID', 'Agent Name'],
        getExportData: (customer) => {
            const agent = api.get('agents', customer.agentId);
            return [
                customer.id,
                customer.name,
                customer.company,
                customer.email,
                customer.phone,
                customer.agentId,
                agent?.name || 'N/A'
            ];
        },
        renderRow: (customer) => {
            let agentCellHtml = '';
            const agent = api.get('agents', customer.agentId);
            if (api.security.hasRole('admin')) {
                const agentOptions = api.get('agents').map(agent =>
                    `<option value="${agent.id}" ${customer.agentId == agent.id ? 'selected' : ''}>${agent.name}</option>`
                ).join('');
                agentCellHtml = `
                    <select data-customer-id="${customer.id}" class="form-select bg-black/20 text-sm p-2 w-full table-agent-select">
                        ${agentOptions}
                    </select>
                `;
            } else {
                agentCellHtml = `<a href="#agents/${customer.agentId}" class="text-custom-light-blue hover:underline">${agent?.name || 'N/A'}</a>`;
            }

            return `<tr>
                <td><a href="#customers/${customer.id}" class="text-custom-light-blue hover:underline">${customer.name}</a></td>
                <td>${customer.company}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${agentCellHtml}</td>
                <td><div class="flex space-x-2"><i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${customer.id}" data-resource="customers"></i><i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${customer.id}" data-resource="customers"></i></div></td>
            </tr>`;
        },
        searchFields: ['name', 'company', 'email']
    },
    suppliers: {
        title: 'Manage Suppliers',
        addBtnText: 'New Supplier',
        headers: ['Company Name', 'Contact Person', 'Email', 'Phone', 'Actions'],
        exportHeaders: ['Supplier ID', 'Company Name', 'Contact Person', 'Email', 'Phone'],
        getExportData: (supplier) => [supplier.id, supplier.name, supplier.contactPerson, supplier.email, supplier.phone],
        renderRow: (supplier) => `<tr><td>${supplier.name}</td><td>${supplier.contactPerson}</td><td>${supplier.email}</td><td>${supplier.phone}</td><td><div class="flex space-x-2"><i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${supplier.id}" data-resource="suppliers"></i><i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${supplier.id}" data-resource="suppliers"></i></div></td></tr>`,
        searchFields: ['name', 'contactPerson', 'email']
    },
    purchaseOrders: {
        title: 'Manage Purchase Orders',
        addBtnText: 'New P.O.',
        headers: ['P.O. #', 'Supplier', 'Issue Date', 'Status', 'Actions'],
        exportHeaders: ['P.O. #', 'Supplier ID', 'Supplier Name', 'Issue Date', 'Status'],
        getExportData: (po) => {
            const supplier = api.get('suppliers', po.supplierId);
            return [po.poNumber, po.supplierId, supplier?.name || 'N/A', po.issueDate, po.status];
        },
        renderRow: (po) => {
            const statusColors = { fulfilled: 'status-completed', sent: 'status-pending', draft: 'status-in-stock'};
            const supplier = api.get('suppliers', po.supplierId);
            const receiveStockBtn = po.status !== 'fulfilled' 
                ? `<i data-lucide="package-check" class="w-4 h-4 cursor-pointer hover:text-green-400 receive-stock-btn" title="Receive Stock" data-id="${po.id}"></i>`
                : '';

            return `<tr>
                <td>${po.poNumber}</td>
                <td>${supplier?.name || 'N/A'}</td>
                <td>${po.issueDate}</td>
                <td><span class="status-pill ${statusColors[po.status] || ''}">${po.status}</span></td>
                <td><div class="flex space-x-2">
                    ${receiveStockBtn}
                    <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${po.id}" data-resource="purchaseOrders"></i>
                    <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${po.id}" data-resource="purchaseOrders"></i>
                </div></td>
            </tr>`;
        },
        searchFields: ['poNumber', 'status']
    },
    inventory: {
        title: 'Manage Inventory',
        addBtnText: 'New Product',
        headers: ['Product Name', 'SKU', 'Total Stock', 'Status', 'Actions'],
        exportHeaders: ['Product ID', 'Product Name', 'SKU', 'Total Stock', 'Cost', 'Shelf Life (Days)'],
        getExportData: (item) => {
            const totalStock = api.getTotalStock(item.id);
            return [item.id, item.name, item.sku, totalStock, item.cost.toFixed(2), item.shelfLifeDays];
        },
        renderRow: (item) => {
            const totalStock = api.getTotalStock(item.id);
            const status = totalStock === 0 ? 'out-of-stock' : totalStock < 10 ? 'low-stock' : 'in-stock';
            const produceBtn = (item.bom && item.bom.length > 0)
                ? `<i data-lucide="factory" class="w-4 h-4 cursor-pointer hover:text-green-400 produce-btn" title="Produce Item" data-id="${item.id}"></i>`
                : '';
            const viewBatchesBtn = (item.stockBatches && item.stockBatches.length > 0)
                ? `<i data-lucide="box-select" class="w-4 h-4 cursor-pointer hover:text-purple-400 view-batches-btn" title="View Stock Batches" data-id="${item.id}" data-type="inventory"></i>`
                : '';
            return `<tr>
                <td><a href="#inventory/${item.id}" class="text-custom-light-blue hover:underline">${item.name}</a></td>
                <td>${item.sku}</td>
                <td>${totalStock}</td>
                <td><span class="status-pill status-${status}">${status.replace('-', ' ')}</span></td>
                <td><div class="flex space-x-2">
                    ${produceBtn}
                    ${viewBatchesBtn}
                    <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${item.id}" data-resource="inventory"></i>
                    <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${item.id}" data-resource="inventory"></i>
                </div></td>
            </tr>`;
        },
        searchFields: ['name', 'sku']
    },
    components: {
        title: 'Manage Components',
        addBtnText: 'New Component',
        headers: ['Component Name', 'Total Stock', 'Cost', 'Actions'],
        exportHeaders: ['Component ID', 'Component Name', 'Total Stock', 'Cost'],
        getExportData: (item) => {
            const totalStock = api.getComponentTotalStock(item.id);
            return [item.id, item.name, totalStock, item.cost.toFixed(2)];
        },
        renderRow: (item) => {
            const totalStock = api.getComponentTotalStock(item.id);
            const viewBatchesBtn = (item.stockBatches && item.stockBatches.length > 0)
                ? `<i data-lucide="box-select" class="w-4 h-4 cursor-pointer hover:text-purple-400 view-batches-btn" title="View Stock Batches" data-id="${item.id}" data-type="components"></i>`
                : '';
            return `<tr>
                <td>${item.name}</td>
                <td>${totalStock}</td>
                <td>$${item.cost.toFixed(2)}</td>
                <td><div class="flex space-x-2">
                    ${viewBatchesBtn}
                    <i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${item.id}" data-resource="components"></i>
                    <i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${item.id}" data-resource="components"></i>
                </div></td>
            </tr>`;
        },
        searchFields: ['name']
    },
    productionOrders: {
        title: 'Production Order History',
        addBtnText: null,
        headers: ['P.O. ID', 'Lot Number', 'Date', 'Product Produced', 'Quantity', 'Actions'],
        exportHeaders: ['Production ID', 'Lot Number', 'Date', 'Product ID', 'Product Name', 'Quantity Produced'],
        getExportData: (order) => {
            const product = api.get('inventory', order.productId);
            return [order.id, order.lotNumber, order.date, order.productId, product?.name || 'N/A', order.quantityProduced];
        },
        renderRow: (order) => {
            const product = api.get('inventory', order.productId);
            return `<tr>
                <td>#${order.id}</td>
                <td>${order.lotNumber}</td>
                <td>${order.date}</td>
                <td><a href="#inventory/${order.productId}" class="text-custom-light-blue hover:underline">${product ? product.name : 'N/A'}</a></td>
                <td>${order.quantityProduced}</td>
                <td><div class="flex space-x-2">
                    <i data-lucide="info" class="w-4 h-4 cursor-pointer hover:text-blue-400 production-order-details-btn" title="View Details" data-id="${order.id}"></i>
                </div></td>
            </tr>`;
        },
        searchFields: ['id', 'date', 'lotNumber']
    },
    agents: {
        title: 'Manage Agents',
        addBtnText: 'New Agent',
        headers: ['Name', 'Email', 'Phone', 'Role', 'Actions'],
        exportHeaders: ['Agent ID', 'Name', 'Email', 'Phone', 'Role'],
        getExportData: (agent) => [agent.id, agent.name, agent.email, agent.phone, agent.role],
        renderRow: (agent) => `<tr>
            <td><a href="#agents/${agent.id}" class="text-custom-light-blue hover:underline">${agent.name}</a></td>
            <td>${agent.email}</td>
            <td>${agent.phone}</td>
            <td>${agent.role}</td>
            <td><div class="flex space-x-2"><i data-lucide="edit" class="w-4 h-4 cursor-pointer hover:text-blue-400 edit-btn" data-id="${agent.id}" data-resource="agents"></i><i data-lucide="trash-2" class="w-4 h-4 cursor-pointer hover:text-red-400 delete-btn" data-id="${agent.id}" data-resource="agents"></i></div></td></tr>`,
        searchFields: ['name', 'email', 'role']
    },
    events: {
        title: 'Audit Trail',
        addBtnText: null,
        headers: ['Timestamp', 'User', 'Action', 'Details'],
        exportHeaders: ['Timestamp', 'User', 'Action', 'Details'],
        getExportData: (event) => [event.timestamp, event.user, event.action, event.details],
        renderRow: (event) => {
            const formattedDate = new Date(event.timestamp).toLocaleString();
            return `<tr>
                <td class="text-xs">${formattedDate}</td>
                <td>${event.user}</td>
                <td><span class="status-pill status-pending">${event.action}</span></td>
                <td>${event.details}</td>
            </tr>`;
        },
        searchFields: ['user', 'action', 'details']
    },
    reports: {
        title: 'Reports',
        addBtnText: null,
        renderContent: () => {
            const arAging = api.reports.getAccountsReceivableAging() || { current: 0, '31-60': 0, '61-90': 0, '90+': 0 };

            return `
                <div class="w-full max-w-7xl mx-auto pointer-events-auto h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
                    <h1 class="text-3xl font-bold text-white">Business Reports</h1>
                    <div class="glass-panel p-6 rounded-lg">
                        <div class="md:flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-custom-light-blue mb-4 md:mb-0">Financial Overview</h3>
                            <form id="reports-filter-form" class="flex items-center space-x-2">
                                <input type="date" id="start-date" name="startDate" class="form-input bg-black/20 text-sm" required>
                                <span class="text-custom-grey">to</span>
                                <input type="date" id="end-date" name="endDate" class="form-input bg-black/20 text-sm" required>
                                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Generate</button>
                            </form>
                        </div>
                        <div id="financial-summary-section" class="text-center text-custom-grey py-8">
                            Select a date range to generate a financial summary.
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div id="top-products-card" class="glass-panel p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Top Selling Products</h3>
                            <div class="text-custom-grey text-sm">Select a date range to view.</div>
                        </div>
                        <div id="top-customers-card" class="glass-panel p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Top Customers</h3>
                            <div class="text-custom-grey text-sm">Select a date range to view.</div>
                        </div>
                        <div class="glass-panel p-6 rounded-lg">
                           <h3 class="text-lg font-semibold text-custom-light-blue mb-4">A/R Aging Summary</h3>
                           <ul>
                               <li class="flex justify-between items-center py-2 border-b border-white/10"><span class="text-white">Current (0-30 Days)</span><span class="font-bold text-custom-light-blue">$${arAging.current.toFixed(2)}</span></li>
                               <li class="flex justify-between items-center py-2 border-b border-white/10"><span class="text-white">31-60 Days</span><span class="font-bold text-yellow-400">$${arAging['31-60'].toFixed(2)}</span></li>
                               <li class="flex justify-between items-center py-2 border-b border-white/10"><span class="text-white">61-90 Days</span><span class="font-bold text-orange-500">$${arAging['61-90'].toFixed(2)}</span></li>
                               <li class="flex justify-between items-center py-2"><span class="text-white">90+ Days</span><span class="font-bold text-red-500">$${arAging['90+'].toFixed(2)}</span></li>
                           </ul>
                       </div>
                    </div>
                    <div class="glass-panel p-6 rounded-lg">
                        <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Traceability Report</h3>
                        <form id="traceability-form" class="flex items-center space-x-2">
                            <input type="text" id="traceability-search" class="form-input flex-grow" placeholder="Enter Lot Number..." required>
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center">
                                <i data-lucide="search" class="w-4 h-4 mr-2"></i><span>Trace</span>
                            </button>
                        </form>
                        <div id="traceability-results" class="mt-4"></div>
                    </div>
                </div>
            `;
        }
    }
};

export function renderManagementPage(pageId, searchTerm = '', page = 1) {
    let authorized = false;

    switch (pageId) {
        case 'dashboard': authorized = true; break;
        case 'leads':
        case 'quotes':
        case 'customers':
        case 'orders':
        case 'invoices':
        case 'customerContracts':
            authorized = api.security.hasRole(['admin', 'sales', 'finance']);
            break;
        case 'suppliers':
        case 'purchaseOrders':
        case 'inventory':
        case 'components':
        case 'creditNotes':
        case 'productionOrders':
            authorized = api.security.hasRole(['admin', 'inventory']);
            break;
        case 'agents':
            authorized = api.security.hasRole(['admin', 'sales']);
            break;
        case 'users':
        case 'events':
        case 'taxRates':
            authorized = api.security.hasRole('admin');
            break;
        case 'reports':
            authorized = api.security.hasRole(['admin', 'finance', 'sales']);
            break;
        default:
            authorized = false;
    }

    if (!authorized) {
        return `<div class="glass-panel p-8 text-white pointer-events-auto text-center">You are not authorized to view this page.</div>`;
    }

    const config = pageConfig[pageId];
    if (!config) return `<div>Page configuration for "${pageId}" not found.</div>`;
    if (config.renderContent) {
        return config.renderContent();
    }
    let data = api.get(pageId);
    if (pageId === 'events' || pageId === 'quotes') {
        data = [...data].sort((a,b) => b.id - a.id);
    }
    if (searchTerm && config.searchFields) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        data = data.filter(item => config.searchFields.some(field => {
            const fieldValue = field.split('.').reduce((o, i) => o ? o[i] : undefined, item);
            return String(fieldValue).toLowerCase().includes(lowerCaseSearchTerm)
        }));
    }
    
    const perPage = 10;
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const paginatedData = data.slice((page - 1) * perPage, page * perPage);

    const tableHeaders = config.headers.map(h => `<th>${h}</th>`).join('');
    const tableRows = paginatedData.map(config.renderRow).join('');

    const paginationHtml = totalPages > 1 ? `
        <div class="flex justify-between items-center">
            <span class="text-sm text-custom-grey">Showing ${paginatedData.length > 0 ? ((page - 1) * perPage) + 1 : 0} to ${Math.min(page * perPage, totalItems)} of ${totalItems} results</span>
            <div class="flex space-x-2">
                <button class="p-2 bg-gray-700 rounded-md ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'}" ${page === 1 ? 'disabled' : `onclick="ui.renderManagementPage('${pageId}', '${searchTerm}', ${page - 1})"`}><i data-lucide="chevron-left" class="w-4 h-4 pointer-events-none"></i></button>
                <button class="p-2 bg-gray-700 rounded-md ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'}" ${page >= totalPages ? 'disabled' : `onclick="ui.renderManagementPage('${pageId}', '${searchTerm}', ${page + 1})"`}><i data-lucide="chevron-right" class="w-4 h-4 pointer-events-none"></i></button>
            </div>
        </div>
    ` : `<span class="text-sm text-custom-grey">${totalItems > 0 ? `${totalItems} results` : ''}</span>`;

    const exportButtonHtml = config.exportHeaders ? `
        <button class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm export-btn" data-resource="${pageId}">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>Export CSV</span>
        </button>
    ` : '';
    
    const canAdd = api.security.hasRole('admin') || ['orders', 'leads', 'quotes'].includes(pageId);

    return `
    <div class="glass-panel rounded-lg h-full flex flex-col w-full max-w-7xl pointer-events-auto">
        <div class="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0 gap-4">
            <h2 class="text-xl font-bold text-white">${config.title}</h2>
            <div class="flex-grow flex justify-end items-center gap-4">
                ${config.searchFields ? `<div class="relative max-w-xs">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-grey"></i>
                    <input type="text" id="table-search" class="form-input pl-10" placeholder="Search..." value="${searchTerm}" oninput="ui.handleTableSearch(event, '${pageId}')">
                </div>` : ''}
                ${exportButtonHtml}
                ${config.addBtnText && canAdd ? `<button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 add-btn" data-resource="${pageId}"><i data-lucide="plus" class="w-4 h-4"></i><span>${config.addBtnText}</span></button>` : ''}
            </div>
        </div>
        <div class="overflow-y-auto custom-scrollbar flex-grow p-4">
             <div class="overflow-x-auto">
                <table class="data-table">
                    <thead><tr>${tableHeaders}</tr></thead>
                    <tbody>${tableRows.length ? tableRows : `<tr><td colspan="${config.headers.length}" class="text-center py-8 text-custom-grey">No results found.</td></tr>`}</tbody>
                </table>
            </div>
        </div>
         <div class="p-4 bg-black/20 border-t border-white/10 flex-shrink-0">
            ${paginationHtml}
        </div>
    </div>`;
}
