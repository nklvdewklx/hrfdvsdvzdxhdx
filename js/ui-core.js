// js/ui-core.js
import { App } from './state.js';
import { api } from './api.js';

export const uiCore = {
    elements: {
        mainContent: document.getElementById('main-content-area'),
        modalContainer: document.getElementById('modal-container'),
        leftSidebar: document.getElementById('left-sidebar'),
        rightSidebar: document.getElementById('right-sidebar'),
    },

    renderFinancialReports(data) {
        const container = document.getElementById('financial-summary-section');
        if (!container) return;

        const pnlHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="lg:col-span-2 space-y-4 glass-panel p-6 rounded-lg bg-black/20">
                    <div class="flex justify-between items-baseline"><span class="text-custom-grey">Total Revenue</span><span class="text-2xl font-bold text-white">$${data.pnl.totalRevenue.toFixed(2)}</span></div>
                    <div class="flex justify-between items-baseline"><span class="text-lg font-semibold text-red-400">-$${data.pnl.cogs.toFixed(2)}</span></div>
                    <div class="flex justify-between items-baseline border-t border-white/10 pt-4 mt-4"><span class="text-lg font-semibold text-custom-light-blue">Gross Profit</span><span class="text-3xl font-bold text-green-400">$${data.pnl.grossProfit.toFixed(2)}</span></div>
                </div>
                <div class="glass-panel p-6 rounded-lg text-center bg-black/20"><h3 class="text-custom-grey text-sm font-semibold mb-2">Total Revenue</h3><p class="text-3xl font-bold text-white">$${data.summary.totalRevenue.toFixed(2)}</p></div>
                <div class="glass-panel p-6 rounded-lg text-center bg-black/20"><h3 class="text-custom-grey text-sm font-semibold mb-2">Orders Fulfilled</h3><p class="text-3xl font-bold text-white">${data.summary.completedOrders}</p></div>
            </div>
        `;
        container.innerHTML = pnlHtml;

        const topProductsContainer = document.getElementById('top-products-card');
        topProductsContainer.innerHTML = `
            <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Top Selling Products</h3>
            <ul>${data.topProducts.map(p => `<li class="flex justify-between items-center py-2 border-b border-white/10"><span class="text-white">${p.productName}</span><span class="font-bold text-custom-light-blue">$${(p.totalRevenue||0).toFixed(2)}</span></li>`).join('') || `<li class="text-custom-grey text-sm">No sales in this period.</li>`}</ul>`;

        const topCustomersContainer = document.getElementById('top-customers-card');
        topCustomersContainer.innerHTML = `
            <h3 class="text-lg font-semibold text-custom-light-blue mb-4">Top Customers</h3>
            <ul>${data.topCustomers.map(c => `<li class="flex justify-between items-center py-2 border-b border-white/10"><span class="text-white">${c.name||'Unknown'}</span><span class="font-bold text-custom-light-blue">$${(c.totalRevenue||0).toFixed(2)}</span></li>`).join('') || `<li class="text-custom-grey text-sm">No sales in this period.</li>`}</ul>`;
    },
    renderTraceabilityReportResults(report) {
        const container = document.getElementById('traceability-results');
        if (!container) return;

        let html = '';
        switch(report.type) {
            case 'backward':
                html = `
                    <div class="border border-green-500/30 bg-green-500/10 p-4 rounded-lg">
                        <p class="text-sm text-custom-grey">Showing components used in your production lot:</p>
                        <p class="text-xl font-bold text-white">${report.searchedLot}</p>
                        <p class="font-semibold text-custom-light-blue mt-2">${report.product.name} (${report.product.quantity} units)</p>
                        <table class="w-full text-sm mt-2">
                            <thead><tr class="border-b border-white/20"><th class="text-left py-1">Component</th><th class="text-left py-1">Supplier Lot #</th><th class="text-right py-1">Qty Used</th></tr></thead>
                            <tbody>${report.components.map(c => `<tr><td>${c.name}</td><td>${c.supplierLotNumber}</td><td class="text-right">${c.quantityUsed}</td></tr>`).join('')}</tbody>
                        </table>
                    </div>`;
                break;
            case 'forward':
                html = `
                     <div class="border border-purple-500/30 bg-purple-500/10 p-4 rounded-lg">
                        <p class="text-sm text-custom-grey">Showing finished products containing supplier lot:</p>
                        <p class="text-xl font-bold text-white">${report.searchedLot}</p>
                        <p class="font-semibold text-custom-light-blue mt-2">${report.componentName} (from P.O. #${report.sourcePurchaseOrder})</p>
                        <table class="w-full text-sm mt-2">
                            <thead><tr class="border-b border-white/20"><th class="text-left py-1">Finished Product</th><th class="text-left py-1">Your Production Lot #</th></tr></thead>
                            <tbody>${report.products.map(p => `<tr><td>${p.productName}</td><td>${p.productLotNumber}</td></tr>`).join('')}</tbody>
                        </table>
                    </div>`;
                break;
            case 'notFound':
                html = `<div class="border border-yellow-500/30 bg-yellow-500/10 p-4 rounded-lg text-center text-yellow-300">Lot number "${report.searchedLot}" not found.</div>`;
                break;
            case 'empty':
                html = `<div class="border border-gray-500/30 bg-gray-500/10 p-4 rounded-lg text-center text-custom-grey">Please enter a lot number to trace.</div>`;
                break;
        }
        container.innerHTML = html;
    },
    initCharts() {
        const salesTrendChart = new ApexCharts(document.querySelector("#salesTrendChart"), {
            series: [{ name: "Sales ($)", data: [] }],
            chart: { height: '100%', type: 'area', toolbar: { show: false }, sparkline: { enabled: false } },
            dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2 },
            grid: { show: true, borderColor: 'rgba(255, 255, 255, 0.1)', strokeDashArray: 4, position: 'back' },
            xaxis: { categories: [], labels: { style: { colors: '#8a9cb1', fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { labels: { style: { colors: '#8a9cb1', fontSize: '12px' }, formatter: (value) => `$${value / 1000}k` } },
            tooltip: { theme: 'dark', x: { format: 'ddd' } },
            fill: { type: 'gradient', gradient: { shade: 'dark', type: "vertical", shadeIntensity: 0.5, gradientToColors: ['#0d1a2e'], inverseColors: true, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] } },
            colors: ["#34d399"],
        });
        salesTrendChart.render();
        App.charts.salesTrend = salesTrendChart;
    }
};