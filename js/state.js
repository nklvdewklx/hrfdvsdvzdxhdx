// js/state.js
import { storage } from './storage.js';

const defaultDb = {
    agents: [
        { id: 1, name: 'John Doe', email: 'john.doe@roctec.com', phone: '+31 6 12345678', role: 'Agent', lat: 52.370216, lng: 4.895115 },
        { id: 2, name: 'Jane Smith', email: 'jane.smith@roctec.com', phone: '+31 6 87654321', role: 'Agent', lat: 52.090737, lng: 5.121420 },
    ],
    leads: [
        { id: 1, name: 'Alina Popescu', company: 'Gourmet Imports SRL', email: 'alina.p@gourmet.ro', phone: '0722 123 456', status: 'new', agentId: 1 },
        { id: 2, name: 'Mihai Ionescu', company: 'Delicii Rapide', email: 'mihai@delicii.ro', phone: '0745 987 654', status: 'contacted', agentId: 2 },
        { id: 3, name: 'Elena Constantinescu', company: 'Bio Fresh Market', email: 'elena.c@biofresh.ro', phone: '0733 555 888', status: 'qualified', agentId: 1 }
    ],
    quotes: [
        { id: 1, quoteNumber: 'Q-2025-001', leadId: 3, customerId: null, date: '2025-08-06', expiryDate: '2025-09-05', status: 'sent', items: [{ productId: 201, quantity: 200 }]},
        { id: 2, quoteNumber: 'Q-2025-002', leadId: null, customerId: 101, date: '2025-08-07', expiryDate: '2025-09-06', status: 'accepted', items: [{ productId: 201, quantity: 50 }, { productId: 202, quantity: 100 }]}
    ],
    customers: [
        { id: 101, name: 'GrocerChoice B.V.', company: 'GrocerChoice B.V.', email: 'purchase@grocerchoice.com', phone: '+31 174 123456', agentId: 1, lat: 52.379189, lng: 4.899431, notes: [], visitSchedule: { day: 'Sunday', frequency: 'weekly' } },
        { id: 102, name: 'EuroFood Imports', company: 'EuroFood Imports', email: 'ben.j@eurofood.com', phone: '+31 20 87654321', agentId: 2, lat: 52.0812, lng: 5.1252, notes: [], visitSchedule: { day: 'Sunday', frequency: 'weekly' } },
        { id: 103, name: 'Amsterdam Deli', company: 'Amsterdam Deli', email: 'orders@amdeli.com', phone: '+31 20 12345678', agentId: 1, lat: 52.3676, lng: 4.9041, notes: [], visitSchedule: { day: 'Sunday', frequency: 'weekly' } }
    ],
    customerContracts: [
        { id: 1, customerId: 101, productId: 201, contractPrice: 1.95, startDate: "2025-01-01", endDate: "2025-12-31" },
        { id: 2, customerId: 102, productId: 201, contractPrice: 2.10, startDate: "2025-06-01", endDate: "2025-08-31" }
    ],
    suppliers: [
        { id: 501, name: 'Fresh Veggie Farms', contactPerson: 'David Chen', email: 'sales@freshveg.farm', phone: '+31 6 11112222' },
        { id: 502, name: 'Packaging Solutions B.V.', contactPerson: 'Maria Garcia', email: 'maria.g@packagingsolutions.com', phone: '+31 10 9998888' },
        { id: 503, name: 'Spice & Herb Traders', contactPerson: 'Klaus Schmidt', email: 'k.schmidt@spice-traders.de', phone: '+49 30 123456' },
    ],
    components: [
        { id: 701, name: 'Cucumbers (kg)', cost: 1.50, stockBatches: [] },
        { id: 702, name: 'Vinegar (L)', cost: 0.80, stockBatches: [] },
        { id: 703, name: 'Dill (g)', cost: 0.05, stockBatches: [] },
        { id: 704, name: 'Glass Jar (500g)', cost: 0.25, stockBatches: [] },
        { id: 705, name: 'Jar Lid', cost: 0.05, stockBatches: [] },
        { id: 706, name: 'Kalamata Olives (kg)', cost: 4.50, stockBatches: [] },
        { id: 707, name: 'Olive Oil (L)', cost: 3.50, stockBatches: [] },
    ],
    inventory: [
        {
            id: 201, name: 'Dill Pickles (500g Jar)', sku: 'PIC-DIL-500G', cost: 1.25,
            stockBatches: [],
            pricingTiers: [ { minQty: 1, price: 2.50 }, { minQty: 100, price: 2.20 }, { minQty: 500, price: 2.00 } ],
            bom: [
                { componentId: 701, quantity: 0.4 }, { componentId: 702, quantity: 0.2 },
                { componentId: 703, quantity: 10 }, { componentId: 704, quantity: 1 }, { componentId: 705, quantity: 1 }
            ],
            shelfLifeDays: 365
        },
        {
            id: 202, name: 'Marinated Olives (250g Jar)', sku: 'OLV-MAR-250G', cost: 2.10,
            stockBatches: [],
            pricingTiers: [ { minQty: 1, price: 4.00 }, { minQty: 100, price: 3.75 } ],
            bom: [
                { componentId: 706, quantity: 0.2 }, { componentId: 707, quantity: 0.1 },
                { componentId: 704, quantity: 1 }, { componentId: 705, quantity: 1 }
            ],
            shelfLifeDays: 240
        },
    ],
    orders: [
        { id: 301, customerId: 101, agentId: 1, date: '2025-07-25', status: 'completed', items: [ { productId: 201, quantity: 50 } ], signature: null, shippingCarrier: null, trackingNumber: null },
        { id: 302, customerId: 102, agentId: 2, date: '2025-07-24', status: 'shipped', items: [ { productId: 202, quantity: 100 } ], signature: null, shippingCarrier: 'DHL', trackingNumber: 'JD0123456789' },
    ],
    invoices: [],
    creditNotes: [],
    purchaseOrders: [
        { id: 601, poNumber: 'PO-2025-001', supplierId: 501, issueDate: '2025-07-20', status: 'sent', items: [ { componentId: 701, quantity: 500, supplierLotNumber: null } ] },
        { id: 602, poNumber: 'PO-2025-002', supplierId: 502, issueDate: '2025-07-22', status: 'sent', items: [ { componentId: 704, quantity: 2000, supplierLotNumber: null }, { componentId: 705, quantity: 2000, supplierLotNumber: null } ] }
    ],
    productionOrders: [],
    events: [],
    notifications: [],
    taxRates: [
        { id: 1, name: 'TVA Standard', rate: 0.19, isDefault: true },
        { id: 2, name: 'TVA Redusă (Alimente)', rate: 0.09, isDefault: false }
    ],
    users: [
        { id: 1, username: 'admin', password: '$2a$12$fD.g9b.ExU39Y5R..2535uR4D0n6oBCDRV3b2s.2s.3b4s.5s.6b7', role: 'admin', name: 'System Admin' },
        { id: 2, username: 'john.doe', password: '$2a$12$eI.g8c.FxU38Y6R..1234uR5D0n6oACDRV3b2s.2s.3b4s.5s.6b7', role: 'sales', name: 'John Doe' },
        { id: 3, username: 'jane.inv', password: '$2a$12$dO.g7b.GxU37Y5R..5678uR6D0n6oBCDRV3b2s.2s.3b4s.5s.6b7', role: 'inventory', name: 'Jane Inventory' },
        { id: 4, username: 'finance.user', password: '$2a$12$cK.g6b.HxU36Y5R..9012uR7D0n6oBCDRV3b2s.2s.3b4s.5s.6b7', role: 'finance', name: 'Finance User' }
    ]
};

const loadedState = storage.loadState();

export const App = {
    charts: {
        salesTrend: null,
    },
    config: {
        map: {
            initialCenter: [52.21, 5.29],
            initialZoom: 8,
        },
        notifications: {
            lowStockThreshold: 20,
            expiryWarningDays: 15,
        }
    },
    state: {
        currentPage: '',
        currentEditId: null,
        db: loadedState?.db ? { ...defaultDb, ...loadedState.db } : defaultDb,
        currentUser: loadedState?.currentUser || null,
        todaysVisits: []
    },
};
