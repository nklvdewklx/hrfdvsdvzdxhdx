// js/dashboard.js
import { App } from './state.js';
import { api } from './api.js';

function updateSalesChart() {
    if (App.charts.salesTrend) {
        const salesData = api.reports.getDailySalesForLastXDays(7);
        App.charts.salesTrend.updateOptions({
            xaxis: {
                categories: salesData.labels
            }
        });
        App.charts.salesTrend.updateSeries([{
            name: 'Sales ($)',
            data: salesData.data
        }]);
    }
}

export function renderDashboard() {
    // --- FIX: Get the current default currency for display ---
    const defaultCurrency = api.get('currencies').find(c => c.isDefault) || { code: 'EUR', symbol: '€' };

    // --- FIX: Pass the default currency code to the report functions ---
    const salesSummary = api.reports.getSalesSummary(null, null, defaultCurrency.code) || { totalRevenue: 0, totalProfit: 0, completedOrders: 0 };
    const invSummary = api.reports.getInventorySummary() || { totalProducts: 0, itemsInStock: 0, lowStock: 0, outOfStock: 0 };
    const topAgents = api.reports.getTopAgentsByRevenue(4, defaultCurrency.code) || [];
    const recentOrders = api.reports.getRecentOrders(3) || [];
    
    // NEW: Get data for new widgets
    const nearingExpiryBatches = api.reports.getBatchesNearingExpiry(30);
    const lowStockComponents = api.reports.getLowStockComponents(50);

    // 1. Sales Summary - Use the default currency symbol and values
    document.getElementById('dashboard-total-revenue').textContent = `${defaultCurrency.symbol}${(salesSummary.totalRevenue / 1000).toFixed(1)}k`;
    document.getElementById('dashboard-total-profit').textContent = `${defaultCurrency.symbol}${(salesSummary.totalProfit / 1000).toFixed(1)}k Profit`;
    document.getElementById('dashboard-completed-orders').textContent = salesSummary.completedOrders;
    
    const profitMargin = salesSummary.totalRevenue > 0 ? (salesSummary.totalProfit / salesSummary.totalRevenue) : 0;
    const ring = document.getElementById('dashboard-profit-ring');
    if (ring) {
        const circumference = 2 * Math.PI * 42;
        const offset = circumference - (profitMargin * circumference);
        setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
    }

    // 2. Customer Count
    document.getElementById('dashboard-total-customers').textContent = api.get('customers').length;

    // 3. Inventory Summary
    document.getElementById('dashboard-total-products').textContent = invSummary.totalProducts;
    document.getElementById('dashboard-items-in-stock').textContent = invSummary.itemsInStock.toLocaleString();
    document.getElementById('dashboard-low-stock-items').textContent = invSummary.lowStock;
    document.getElementById('dashboard-out-of-stock-items').textContent = invSummary.outOfStock;

        // NEW: Render Batches Nearing Expiry
    const nearingExpiryContainer = document.getElementById('dashboard-nearing-expiry-list');
    if (nearingExpiryBatches.length > 0) {
        nearingExpiryContainer.innerHTML = nearingExpiryBatches.map(batch => `
            <div>
                <p class="text-white">${batch.productName}</p>
                <p class="text-xs text-yellow-400">Lot: ${batch.lotNumber} | Expires: ${batch.expiryDate}</p>
            </div>
        `).join('');
    } else {
        nearingExpiryContainer.innerHTML = `<p class="text-custom-grey text-xs">No batches expiring soon.</p>`;
    }

    // NEW: Render Low Stock Components
    const lowComponentsContainer = document.getElementById('dashboard-low-components-list');
    if (lowStockComponents.length > 0) {
        lowComponentsContainer.innerHTML = lowStockComponents.map(component => `
            <div class="flex justify-between items-center">
                <p class="text-white">${component.name}</p>
                <span class="font-bold text-orange-400">${api.getComponentTotalStock(component.id)}</span>
            </div>
        `).join('');
    } else {
        lowComponentsContainer.innerHTML = `<p class="text-custom-grey text-xs">All component stock levels are healthy.</p>`;
    }
    
    // 4. Top Selling Agents - Use the default currency symbol
    const topAgentsContainer = document.getElementById('dashboard-top-agents-list');
    topAgentsContainer.innerHTML = topAgents.map(agent => `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <img src="https://placehold.co/32x32/1e3a5f/a2d2ff?text=${agent.name.charAt(0)}" class="rounded-full mr-3" alt="avatar">
                <div>
                    <p>${agent.name}</p>
                    <p class="text-xs text-custom-grey">Total Sales</p>
                </div>
            </div>
            <span class="font-bold text-green-400">${defaultCurrency.symbol}${agent.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
    `).join('');

    // 5. Recent Orders - Use currency from the order itself
    const recentOrdersContainer = document.getElementById('dashboard-recent-orders-list');
    recentOrdersContainer.innerHTML = recentOrders.map(order => {
        const customer = api.get('customers', order.customerId);
        // Get totals in the order's specific currency
        const totals = api.getOrderTotals(order);
        const icon = {
            // ... (icon logic remains the same)
        }[order.status];
        
        return `
        <div class="flex items-start">
            ${icon || ''}
            <div>
                <p>Order #${order.id} from <span class="text-white">"${customer ? customer.company : 'N/A'}"</span></p>
                <p class="text-xs text-custom-grey mt-1">${order.date} - ${totals.currency.symbol}${totals.total.toFixed(2)}</p>
            </div>
        </div>
        `
    }).join('');
    
    updateSalesChart();

    lucide.createIcons();
}