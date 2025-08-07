// js/api-reports.js
import { apiCore } from './api-core.js';
import { apiBusiness } from './api-business.js';

export const apiReports = {
    getSalesSummary(startDate, endDate) {
        let completedOrders = apiCore.get('orders').filter(o => o.status === 'completed');

        if (startDate && endDate) {
            completedOrders = completedOrders.filter(order => {
                return order.date >= startDate && order.date <= endDate;
            });
        }

        const summary = {
            totalRevenue: 0,
            totalProfit: 0,
            completedOrders: completedOrders.length
        };

        completedOrders.forEach(order => {
            let orderRevenue = 0;
            let orderProfit = 0;
            if (order.items) {
                order.items.forEach(item => {
                    const product = apiCore.get('inventory', item.productId);
                    if (product) {
                        const price = apiBusiness.getProductPriceForQuantity(product, item.quantity);
                        orderRevenue += price * item.quantity;
                        orderProfit += (price - product.cost) * item.quantity;
                    }
                });
            }
            summary.totalRevenue += orderRevenue;
            summary.totalProfit += orderProfit;
        });
        return summary;
    },
    getTopProductsByRevenue(limit = 3, startDate, endDate) {
        let completedOrders = apiCore.get('orders').filter(o => o.status === 'completed');

        if (startDate && endDate) {
            completedOrders = completedOrders.filter(order => {
                return order.date >= startDate && order.date <= endDate;
            });
        }

        const productRevenue = {};
        completedOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const product = apiCore.get('inventory', item.productId);
                    if (product) {
                        const price = apiBusiness.getProductPriceForQuantity(product, item.quantity);
                        const revenue = price * item.quantity;
                        if (!productRevenue[product.id]) {
                            productRevenue[product.id] = {
                                productId: product.id,
                                productName: product.name,
                                totalRevenue: 0
                            };
                        }
                        productRevenue[product.id].totalRevenue += revenue;
                    }
                });
            }
        });
        return Object.values(productRevenue)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    },
    getAccountsReceivableAging() {
        const buckets = { current: 0, '31-60': 0, '61-90': 0, '90+': 0 };
        const unpaidInvoices = apiCore.get('invoices').filter(inv => inv.status === 'sent');
        const today = new Date();
        unpaidInvoices.forEach(invoice => {
            const dueDate = new Date(invoice.dueDate);
            const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            const total = apiBusiness.calculateOrderTotal(apiCore.get('orders', invoice.orderId));
            if (daysOverdue <= 30) {
                buckets.current += total;
            } else if (daysOverdue <= 60) {
                buckets['31-60'] += total;
            } else if (daysOverdue <= 90) {
                buckets['61-90'] += total;
            } else {
                buckets['90+'] += total;
            }
        });
        return buckets;
    },
    getInventorySummary() {
        const inventory = apiCore.get('inventory');
        const allStock = inventory.map(p => ({...p, totalStock: apiBusiness.getTotalStock(p.id)}));
        return {
            totalProducts: inventory.length,
            itemsInStock: allStock.reduce((sum, item) => sum + item.totalStock, 0),
            lowStock: allStock.filter(item => item.totalStock > 0 && item.totalStock < 10).length,
            outOfStock: allStock.filter(item => item.totalStock === 0).length
        };
    },
    getTopAgentsByRevenue(limit = 4) {
        const agentSales = {};
        const completedOrders = apiCore.get('orders').filter(o => o.status === 'completed');
        completedOrders.forEach(order => {
            if (order.agentId) {
                const total = apiBusiness.calculateOrderTotal(order);
                if (!agentSales[order.agentId]) {
                    agentSales[order.agentId] = { agentId: order.agentId, totalRevenue: 0 };
                }
                agentSales[order.agentId].totalRevenue += total;
            }
        });
        return Object.values(agentSales)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit)
            .map(agentData => {
                const agentInfo = apiCore.get('agents', agentData.agentId);
                return { ...agentData, name: agentInfo ? agentInfo.name : 'Unknown' };
            });
    },
    getRecentOrders(limit = 3) {
        return [...apiCore.get('orders')].sort((a, b) => b.id - a.id).slice(0, limit);
    },
    getTopCustomersByRevenue(limit = 3, startDate, endDate) {
        let completedOrders = apiCore.get('orders').filter(o => o.status === 'completed');

        if (startDate && endDate) {
            completedOrders = completedOrders.filter(order => {
                return order.date >= startDate && order.date <= endDate;
            });
        }

        const customerRevenue = {};
        completedOrders.forEach(order => {
            const total = apiBusiness.calculateOrderTotal(order);
            if (!customerRevenue[order.customerId]) {
                customerRevenue[order.customerId] = {
                    customerId: order.customerId,
                    totalRevenue: 0
                };
            }
            customerRevenue[order.customerId].totalRevenue += total;
        });
        return Object.values(customerRevenue)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit)
            .map(custData => {
                const customerInfo = apiCore.get('customers', custData.customerId);
                return { ...custData, name: customerInfo ? customerInfo.name : 'Unknown' };
            });
    },
    getDailySalesForLastXDays(days = 7) {
        const today = new Date();
        const labels = [];
        const data = [];
        const completedOrders = apiCore.get('orders').filter(o => o.status === 'completed');
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dayStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.toLocaleString('en-US', { weekday: 'short' });
            labels.push(dayOfWeek);
            const salesForDay = completedOrders
                .filter(order => order.date === dayStr)
                .reduce((sum, order) => sum + apiBusiness.calculateOrderTotal(order), 0);
            data.push(salesForDay);
        }
        return { labels, data };
    },
    getBatchesNearingExpiry(days = 30) {
        const nearingExpiry = [];
        const today = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(today.getDate() + days);

        apiCore.get('inventory').forEach(product => {
            if (product.stockBatches) {
                product.stockBatches.forEach(batch => {
                    const expiryDate = new Date(batch.expiryDate);
                    if (expiryDate <= thresholdDate && expiryDate >= today) {
                        nearingExpiry.push({
                            productName: product.name,
                            ...batch
                        });
                    }
                });
            }
        });
        return nearingExpiry.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    },
    getLowStockComponents(threshold = 50) {
        return apiCore.get('components').filter(component => {
            const totalStock = apiBusiness.getComponentTotalStock(component.id);
            return totalStock > 0 && totalStock < threshold;
        });
    },
    getTraceabilityReport(lotNumber) {
        if (!lotNumber || lotNumber.trim() === '') return { type: 'empty' };
        const searchTerm = lotNumber.toLowerCase();

        const productionOrder = apiCore.get('productionOrders').find(po => po.lotNumber.toLowerCase() === searchTerm);
        if (productionOrder) {
            const product = apiCore.get('inventory', productionOrder.productId);
            return {
                type: 'backward',
                searchedLot: lotNumber,
                product: { name: product.name, quantity: productionOrder.quantityProduced },
                components: productionOrder.componentsUsed.map(c => {
                    const component = apiCore.get('components', c.componentId);
                    return {
                        name: component.name,
                        supplierLotNumber: c.supplierLotNumber,
                        quantityUsed: c.quantityUsed
                    };
                })
            };
        }

        const affectedProducts = [];
        let sourcePO = null;
        
        apiCore.get('purchaseOrders').forEach(po => {
            if (po.items.find(item => item.supplierLotNumber && item.supplierLotNumber.toLowerCase() === searchTerm)) {
                sourcePO = po;
            }
        });

        apiCore.get('productionOrders').forEach(po => {
            if (po.componentsUsed && Array.isArray(po.componentsUsed)) {
                const usedComponent = po.componentsUsed.find(c => c.supplierLotNumber && c.supplierLotNumber.toLowerCase() === searchTerm);
                if (usedComponent) {
                    const product = apiCore.get('inventory', po.productId);
                    const component = apiCore.get('components', usedComponent.componentId);
                    affectedProducts.push({
                        productName: product.name,
                        productLotNumber: po.lotNumber,
                        componentName: component.name
                    });
                }
            }
        });

        if (affectedProducts.length > 0) {
            return {
                type: 'forward',
                searchedLot: lotNumber,
                componentName: affectedProducts[0].componentName,
                sourcePurchaseOrder: sourcePO ? sourcePO.poNumber : 'N/A',
                products: affectedProducts
            };
        }

        return { type: 'notFound', searchedLot: lotNumber };
    },
    getProfitAndLoss(startDate, endDate) {
        const completedOrders = apiCore.get('orders').filter(order => {
            return order.status === 'completed' &&
                   order.date >= startDate &&
                   order.date <= endDate;
        });

        let cogs = 0;
        const totalRevenue = completedOrders.reduce((sum, order) => sum + apiBusiness.calculateOrderTotal(order), 0);

        completedOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const product = apiCore.get('inventory', item.productId);
                    if (product && product.cost) {
                        cogs += product.cost * item.quantity;
                    }
                });
            }
        });

        return {
            totalRevenue,
            cogs,
            grossProfit: totalRevenue - cogs
        };
    },
    // NEW: Gathers all data for a specific customer
    getCustomerDetails(customerId) {
        const customer = apiCore.get('customers', customerId);
        if (!customer) return null;

        const orders = apiCore.get('orders').filter(o => o.customerId == customerId);
        const invoices = apiCore.get('invoices').filter(i => i.customerId == customerId);
        const completedOrders = orders.filter(o => o.status === 'completed');
        
        const lifetimeRevenue = completedOrders.reduce((sum, order) => sum + apiBusiness.calculateOrderTotal(order), 0);
        
        return {
            customer,
            stats: {
                lifetimeRevenue,
                totalOrders: orders.length,
                avgOrderValue: orders.length > 0 ? lifetimeRevenue / completedOrders.length : 0,
                lastOrderDate: orders.length > 0 ? [...orders].sort((a,b) => new Date(b.date) - new Date(a.date))[0].date : 'N/A'
            },
            history: {
                orders,
                invoices
            }
        };
    },
    // NEW: Gathers all data for a specific agent
    getAgentDetails(agentId) {
        const agent = apiCore.get('agents', agentId);
        if (!agent) return null;

        const assignedCustomers = apiCore.get('customers').filter(c => c.agentId == agentId);
        const orders = apiCore.get('orders').filter(o => o.agentId == agentId);
        const completedOrders = orders.filter(o => o.status === 'completed');

        const totalRevenue = completedOrders.reduce((sum, order) => sum + apiBusiness.calculateOrderTotal(order), 0);
        
        return {
            agent,
            stats: {
                totalRevenue,
                managedCustomers: assignedCustomers.length,
                completedOrders: completedOrders.length
            },
            history: {
                orders,
                customers: assignedCustomers
            }
        };
    },
    // NEW: Gathers all data for a specific product (inventory item)
    getProductDetails(productId) {
        const product = apiCore.get('inventory', productId);
        if (!product) return null;

        const productionOrders = apiCore.get('productionOrders').filter(po => po.productId == productId);
        const salesOrders = apiCore.get('orders').filter(order => order.items.some(item => item.productId == productId));

        const totalProduced = productionOrders.reduce((sum, po) => sum + po.quantityProduced, 0);
        const totalSold = salesOrders.reduce((sum, order) => {
            const productItem = order.items.find(item => item.productId == productId);
            return sum + (productItem ? productItem.quantity : 0);
        }, 0);

        return {
            product,
            stats: {
                totalStock: apiBusiness.getTotalStock(productId),
                totalProduced,
                totalSold,
            },
            history: {
                productionOrders,
                salesOrders
            }
        };
    },

    // +++ NEW FUNCTION: Gathers daily stats for a specific agent +++
    getAgentDailySummary(agentId) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const myOrders = apiCore.get('orders').filter(o => o.agentId == agentId);
        const myCustomers = apiCore.get('customers').filter(c => c.agentId == agentId);

        const ordersToday = myOrders.filter(o => o.date === todayStr);

        const salesToday = ordersToday.reduce((sum, order) => {
            return sum + apiBusiness.calculateOrderTotal(order);
        }, 0);

        return {
            ordersTodayCount: ordersToday.length,
            salesToday: salesToday,
            totalVisits: myCustomers.length
        };
    },

};