// js/api-core.js
import { App } from './state.js';
import { storage } from './storage.js';
import { api } from './api.js';

export const apiCore = {
    logEvent(action, details, context = {}) { // Add a context parameter
        if (!App.state.db.events) {
            App.state.db.events = [];
        }
        const newId = Math.max(0, ...App.state.db.events.map(e => e.id)) + 1;
        const newEvent = {
            id: newId,
            timestamp: new Date().toISOString(),
            user: api.security.getCurrentUserNameForAudit(),
            action,
            details,
            context // Store the context object
        };
        App.state.db.events.push(newEvent);
    },

    // +++ THIS IS THE CORRECTED FUNCTION +++
    save() {
        // It must pass the entire App.state object to be saved correctly.
        storage.saveState(App.state);
    },

    get(resource, id) {
        if (id) return App.state.db[resource].find(item => item.id == id);
        return App.state.db[resource];
    },

    add(resource, data) {
        const newId = Math.max(0, ...App.state.db[resource].map(i => i.id)) + 1;
        const newItem = { ...data, id: newId };
        App.state.db[resource].push(newItem);
        this.logEvent(`CREATED_${resource.slice(0,-1).toUpperCase()}`, `Created ${resource.slice(0,-1)} #${newId}`);
        // Note: The caller of this function is responsible for saving.
        return newItem;
    },

    update(resource, id, data) {
        const index = App.state.db[resource].findIndex(item => item.id == id);
        if (index !== -1) {
            const originalItem = { ...App.state.db[resource][index] };
            const updatedItem = { ...originalItem, ...data, id: parseInt(id) };
            App.state.db[resource][index] = updatedItem;
            this.logEvent(`UPDATED_${resource.slice(0,-1).toUpperCase()}`, `Updated ${resource.slice(0,-1)} #${id}`);
            // Note: The caller of this function is responsible for saving.
            return updatedItem;
        }
        return null;
    },

    delete(resource, id) {
        const itemToDelete = this.get(resource, id);
        if (!itemToDelete) return;

        App.state.db[resource] = App.state.db[resource].filter(item => item.id != id);
        this.logEvent(`DELETED_${resource.slice(0,-1).toUpperCase()}`, `Deleted ${resource.slice(0,-1)} #${id} (${itemToDelete?.name || itemToDelete?.poNumber || ''})`);
        // Note: The caller of this function is responsible for saving.
    }
};
