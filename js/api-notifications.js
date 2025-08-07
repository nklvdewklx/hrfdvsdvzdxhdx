// js/api-notifications.js
import { App } from './state.js';
import { apiCore } from './api-core.js';
import { apiBusiness } from './api-business.js';
import { showToast } from './toast.js'; // Assuming showToast is globally available or imported

export const apiNotifications = {
    /**
     * Adds a new notification to the system.
     * @param {string} type - 'info', 'warning', 'error', 'success'
     * @param {string} message - The notification message.
     * @param {object} [details={}] - Optional additional details for the notification.
     */
    addNotification(type, message, details = {}) {
        if (!App.state.db.notifications) {
            App.state.db.notifications = [];
        }
        const newId = Math.max(0, ...App.state.db.notifications.map(n => n.id)) + 1;
        const newNotification = {
            id: newId,
            timestamp: new Date().toISOString(),
            type,
            message,
            details,
            read: false
        };
        App.state.db.notifications.push(newNotification);
        apiCore.logEvent(`NOTIFICATION_GENERATED_${type.toUpperCase()}`, message);
        apiCore.save(); // Save state immediately after adding a notification

        // Optionally show a toast for critical notifications
        if (type === 'error' || type === 'warning' || type === 'success') {
            showToast(message, type);
        }
    },

    /**
     * Retrieves all notifications, optionally filtered by read status.
     * @param {boolean} [unreadOnly=false] - If true, only returns unread notifications.
     * @returns {Array} - List of notifications.
     */
    getNotifications(unreadOnly = false) {
        let notifications = App.state.db.notifications || [];
        if (unreadOnly) {
            notifications = notifications.filter(n => !n.read);
        }
        // Sort by timestamp, newest first
        return [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    /**
     * Marks a specific notification or all notifications as read.
     * @param {number|null} [id=null] - The ID of the notification to mark as read. If null, marks all as read.
     */
    markNotificationAsRead(id = null) {
        if (!App.state.db.notifications) return;

        if (id) {
            const notification = App.state.db.notifications.find(n => n.id == id);
            if (notification) {
                notification.read = true;
                apiCore.logEvent('NOTIFICATION_MARKED_READ', `Marked notification #${id} as read.`);
            }
        } else {
            App.state.db.notifications.forEach(n => n.read = true);
            apiCore.logEvent('ALL_NOTIFICATIONS_MARKED_READ', 'All notifications marked as read.');
        }
        apiCore.save();
    },

    /**
     * Clears all notifications (for a cleanup function, not typically exposed to users directly).
     */
    clearAllNotifications() {
        App.state.db.notifications = [];
        apiCore.logEvent('NOTIFICATIONS_CLEARED', 'All notifications cleared from history.');
        apiCore.save();
    },

    // NEW: Proactive checks for notifications
    checkAndGenerateProactiveNotifications() {
        const today = new Date();

        // 1. Low Stock Products
        apiCore.get('inventory').forEach(product => {
            const totalStock = apiBusiness.getTotalStock(product.id);
            if (totalStock > 0 && totalStock <= App.config.notifications.lowStockThreshold) {
                const existingNotification = this.getNotifications().find(n =>
                    n.type === 'warning' &&
                    n.message.includes('low stock') &&
                    n.details.productId === product.id &&
                    !n.read // Only generate if the previous one is read
                );
                if (!existingNotification) {
                     this.addNotification('warning', `Product "${product.name}" is low in stock! (${totalStock} units left)`, { productId: product.id, type: 'product_low_stock' });
                }
            }
        });

        // 2. Low Stock Components
        apiCore.get('components').forEach(component => {
            const totalStock = apiBusiness.getComponentTotalStock(component.id);
            if (totalStock > 0 && totalStock <= App.config.notifications.lowStockThreshold) {
                const existingNotification = this.getNotifications().find(n =>
                    n.type === 'warning' &&
                    n.message.includes('low stock') &&
                    n.details.componentId === component.id &&
                    !n.read
                );
                if (!existingNotification) {
                     this.addNotification('warning', `Component "${component.name}" is low in stock! (${totalStock} units left)`, { componentId: component.id, type: 'component_low_stock' });
                }
            }
        });

        // 3. Batches Nearing Expiry
        apiCore.get('inventory').forEach(product => {
            if (product.stockBatches) {
                product.stockBatches.forEach(batch => {
                    const expiryDate = new Date(batch.expiryDate);
                    const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                    if (daysToExpiry > 0 && daysToExpiry <= App.config.notifications.expiryWarningDays) {
                        const existingNotification = this.getNotifications().find(n =>
                            n.type === 'warning' &&
                            n.message.includes('nearing expiry') &&
                            n.details.lotNumber === batch.lotNumber &&
                            !n.read
                        );
                        if (!existingNotification) {
                             this.addNotification('warning', `Product "${product.name}" (Lot: ${batch.lotNumber}) is nearing expiry in ${daysToExpiry} days!`, { productId: product.id, lotNumber: batch.lotNumber, type: 'product_expiry' });
                        }
                    }
                });
            }
        });

        // 4. Overdue Invoices
        apiCore.get('invoices').filter(inv => inv.status === 'sent').forEach(invoice => {
            const dueDate = new Date(invoice.dueDate);
            if (dueDate < today) {
                const existingNotification = this.getNotifications().find(n =>
                    n.type === 'warning' &&
                    n.message.includes('overdue') &&
                    n.details.invoiceId === invoice.id &&
                    !n.read
                );
                if (!existingNotification) {
                     const customer = apiCore.get('customers', invoice.customerId);
                     this.addNotification('warning', `Invoice ${invoice.invoiceNumber} for ${customer?.company || 'N/A'} is overdue!`, { invoiceId: invoice.id, type: 'invoice_overdue' });
                }
            }
        });

        // 5. Pending Orders (if they've been pending for too long, or just as a general reminder)
        apiCore.get('orders').filter(o => o.status === 'pending').forEach(order => {
            const orderDate = new Date(order.date);
            const daysSinceOrder = Math.ceil((today - orderDate) / (1000 * 60 * 60 * 24));
            // Example: Notify if order is pending for more than 3 days
            if (daysSinceOrder > 3) {
                 const existingNotification = this.getNotifications().find(n =>
                    n.type === 'info' &&
                    n.message.includes('pending') &&
                    n.details.orderId === order.id &&
                    !n.read
                );
                if (!existingNotification) {
                     const customer = apiCore.get('customers', order.customerId);
                     this.addNotification('info', `Order #${order.id} for ${customer?.company || 'N/A'} is still pending after ${daysSinceOrder} days.`, { orderId: order.id, type: 'order_pending' });
                }
            }
        });
    }
};