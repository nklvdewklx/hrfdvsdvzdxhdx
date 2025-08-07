// js/api.js
import { apiCore } from './api-core.js';
import { apiBusiness } from './api-business.js';
import { apiReports } from './api-reports.js';
import { apiNotifications } from './api-notifications.js';
import { security } from './security.js'; // NEW: Import security API

// Combine all API modules into a single export
export const api = {
    ...apiCore,
    ...apiBusiness,
    reports: {
        ...apiReports
    },
    notifications: {
        ...apiNotifications
    },
    security: { // NEW: Add security as a sub-module
        ...security
    }
};