// js/api-core.js
import { App } from './state.js';
import { storage } from './storage.js';
import { api } from './api.js';

export const apiCore = {
    logEvent(action, details) {
        if (!App.state.db.events) {
            App.state.db.events = [];
        }
        const newId = Math.max(0, ...App.state.db.events.map(e => e.id)) + 1;
        const newEvent = {
            id: newId,
            timestamp: new Date().toISOString(),
            user: api.security.getCurrentUserNameForAudit(),
            action,
            details
        };
        App.state.db.events.push(newEvent);
    },

    save() {
        storage.saveState(App.state);
    },

    get(resource, id) {
        const idKey = resource === 'currencies' ? 'code' : 'id';
        if (id) return App.state.db[resource].find(item => item[idKey] == id);
        return App.state.db[resource];
    },

    add(resource, data) {
        if (resource === 'currencies') {
            const newItem = { ...data };
            App.state.db[resource].push(newItem);
            this.logEvent(`CREATED_${resource.slice(0,-1).toUpperCase()}`, `Created ${resource.slice(0,-1)} ${data.code}`);
            return newItem;
        }

        const newId = Math.max(0, ...App.state.db[resource].map(i => i.id)) + 1;
        const newItem = { ...data, id: newId };
        App.state.db[resource].push(newItem);
        this.logEvent(`CREATED_${resource.slice(0,-1).toUpperCase()}`, `Created ${resource.slice(0,-1)} #${newId}`);
        return newItem;
    },

    update(resource, id, data) {
        const idKey = resource === 'currencies' ? 'code' : 'id';
        const index = App.state.db[resource].findIndex(item => item[idKey] == id);

        if (index !== -1) {
            const originalItem = { ...App.state.db[resource][index] };
            const updatedItem = { ...originalItem, ...data };
            if (idKey === 'id') {
                updatedItem.id = parseInt(id);
            }

            App.state.db[resource][index] = updatedItem;
            this.logEvent(`UPDATED_${resource.slice(0,-1).toUpperCase()}`, `Updated ${resource.slice(0,-1)} #${id}`);
            return updatedItem;
        }
        return null;
    },

    delete(resource, id) {
        const idKey = resource === 'currencies' ? 'code' : 'id';
        const itemToDelete = this.get(resource, id);
        if (!itemToDelete) return;

        App.state.db[resource] = App.state.db[resource].filter(item => item[idKey] != id);
        const identifier = itemToDelete.name || itemToDelete.poNumber || itemToDelete.code || '';
        this.logEvent(`DELETED_${resource.slice(0,-1).toUpperCase()}`, `Deleted ${resource.slice(0,-1)} #${id} (${identifier})`);
    }
};