// js/ui.js
import { api } from './api.js';
import { pageConfig, renderManagementPage } from './ui-pages.js';
import { createModals } from './ui-modals.js';
import { uiCore } from './ui-core.js';
import { detailsRenderer } from './ui-details.js';
import { App } from './state.js';

const ui = {
    ...uiCore,
    pageConfig: pageConfig,

    renderManagementPage: function(pageId, searchTerm = '', page = 1) {
        const content = renderManagementPage(pageId, searchTerm, page);
        this.elements.mainContent.innerHTML = content;
        lucide.createIcons();
    },
    
    renderDetailPage: function(pageId, detailId) {
        let content = '';
        switch(pageId) {
            case 'customers':
                content = detailsRenderer.renderCustomerDetailPage(parseInt(detailId, 10));
                break;
            case 'agents':
                content = detailsRenderer.renderAgentDetailPage(parseInt(detailId, 10));
                break;
            case 'inventory':
                content = detailsRenderer.renderProductDetailPage(parseInt(detailId, 10));
                break;
            case 'orders':
                content = detailsRenderer.renderOrderDetailPage(parseInt(detailId, 10));
                break;
            default:
                content = `<div class="glass-panel p-8 text-white pointer-events-auto">Page not found for detail view: ${pageId}.</div>`;
                break;
        }
        this.elements.mainContent.innerHTML = content;
        lucide.createIcons();
    },

    // --- FUNCTION MOVED HERE ---
    exportToCsv: function(resource) {
        const config = this.pageConfig[resource];
        if (!config || !config.getExportData || !config.exportHeaders) {
            console.error(`Export is not configured for resource: ${resource}`);
            alert('Export is not available for this data.');
            return;
        }

        const data = api.get(resource);
        const headers = config.exportHeaders;
        
        const rows = data.map(item => config.getExportData(item));

        const sanitizeValue = (value) => {
            const stringValue = String(value ?? '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const headerString = headers.map(sanitizeValue).join(',');
        const rowsString = rows.map(row => row.map(sanitizeValue).join(',')).join('\n');
        const csvString = `${headerString}\n${rowsString}`;

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `${resource}_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    handleTableSearch: function(event, pageId) {
        this.renderManagementPage(pageId, event.target.value, 1);
    },

    toggleAppVisibility(show) {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.toggle('hidden', !show);
        }
    },
    toggleSidebars(show) {
        const leftSidebar = this.elements.leftSidebar;
        const rightSidebar = this.elements.rightSidebar;
        if (leftSidebar) leftSidebar.classList.toggle('hidden', !show);
        if (rightSidebar) rightSidebar.classList.toggle('hidden', !show);
    }
};

// Initialize modals and attach to the main ui object
ui.modals = createModals(ui);

// Export the single, consolidated ui object
export { ui };