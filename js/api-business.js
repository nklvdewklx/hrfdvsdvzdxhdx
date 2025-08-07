// js/api-business.js
import { showToast } from './toast.js';
import { apiCore } from './api-core.js';
import { api } from './api.js';
import { App } from './state.js';

export const apiBusiness = {
    // --- NEW: CREATE ORDER FROM QUOTE LOGIC ---
    createOrderFromQuote(quoteId) {
        const quote = apiCore.get('quotes', quoteId);
        if (!quote) {
            showToast('Quote not found.', 'error');
            return null;
        }
        if (quote.status !== 'accepted') {
            showToast('Only accepted quotes can be converted to orders.', 'warning');
            return null;
        }

        let customerId = quote.customerId;

        // If the quote was for a lead, we must convert the lead to a customer first.
        if (quote.leadId) {
            const newCustomer = this.convertLeadToCustomer(quote.leadId);
            if (!newCustomer) {
                showToast('Failed to convert the lead to a customer.', 'error');
                return null;
            }
            customerId = newCustomer.id;
        }

        if (!customerId) {
            showToast('No valid customer associated with this quote.', 'error');
            return null;
        }

        // Create a new order based on the quote's data
        const newOrderData = {
            customerId: customerId,
            agentId: App.state.currentUser?.id || 1, // Assign to current user
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            items: quote.items,
            signature: null
        };
        const newOrder = apiCore.add('orders', newOrderData);

        // Update the quote's status to prevent re-use
        quote.status = 'converted';
        apiCore.update('quotes', quote.id, quote);

        apiCore.logEvent(
            'QUOTE_CONVERTED', 
            `Converted quote #${quote.id} to order #${newOrder.id}`,
            { customerId: newOrder.customerId, orderId: newOrder.id } // Add context
        );
        apiCore.save();
        api.notifications.addNotification('success', `Quote "${quote.quoteNumber}" converted to Order #${newOrder.id}.`, { orderId: newOrder.id });

        return newOrder;
    },

    convertLeadToCustomer(leadId) {
        const lead = apiCore.get('leads', leadId);
        if (!lead) {
            showToast('Lead not found.', 'error');
            return null;
        }

        const newCustomerData = {
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            agentId: lead.agentId,
            lat: 52.3676,
            lng: 4.9041,
            notes: [],
            visitSchedule: { day: 'Monday', frequency: 'weekly' }
        };
        const newCustomer = apiCore.add('customers', newCustomerData);

        apiCore.delete('leads', leadId);

        apiCore.logEvent('LEAD_CONVERTED', `Converted lead #${leadId} (${lead.name}) to customer #${newCustomer.id}`);
        apiCore.save();
        api.notifications.addNotification('success', `Lead "${lead.name}" has been converted to a customer.`, { customerId: newCustomer.id, type: 'lead_converted' });

        return newCustomer;
    },

    createCreditNoteForReturn(orderId, reason, returnedItems) {
        const order = apiCore.get('orders', orderId);
        if (!order) {
            showToast('Original order not found.', 'error');
            return null;
        }

        let totalCreditValue = 0;
        returnedItems.forEach(returnedItem => {
            const product = apiCore.get('inventory', returnedItem.productId);
            const originalOrderItem = order.items.find(i => i.productId === returnedItem.productId);
            if (product && originalOrderItem) {
                const pricePerUnit = this.getProductPriceForQuantity(product, originalOrderItem.quantity);
                totalCreditValue += pricePerUnit * returnedItem.quantity;
            }
        });

        const creditNoteCount = apiCore.get('creditNotes').length + 1;
        const newCreditNote = {
            orderId: order.id,
            customerId: order.customerId,
            issueDate: new Date().toISOString().split('T')[0],
            total: totalCreditValue,
            reason: reason,
            status: 'applied',
            returnedItems: returnedItems,
            creditNoteNumber: `CN-2025-${String(creditNoteCount).padStart(3, '0')}`
        };
        const savedCreditNote = apiCore.add('creditNotes', newCreditNote);

        returnedItems.forEach(returnedItem => {
            const product = apiCore.get('inventory', returnedItem.productId);
            if (product) {
                const newBatch = {
                    lotNumber: `RETURN-CN-${savedCreditNote.id}`,
                    quantity: returnedItem.quantity,
                    expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)).toISOString().split('T')[0]
                };
                if (!product.stockBatches) {
                    product.stockBatches = [];
                }
                product.stockBatches.push(newBatch);
            }
        });

        apiCore.logEvent('CREDIT_NOTE_CREATED', `Created credit note ${savedCreditNote.creditNoteNumber} for order #${order.id}`);
        apiCore.save();
        showToast(`Credit Note ${savedCreditNote.creditNoteNumber} created successfully.`, 'success');
        api.notifications.addNotification('success', `Return processed for order #${order.id}. Credit Note ${savedCreditNote.creditNoteNumber} issued.`, { orderId: order.id, creditNoteId: savedCreditNote.id, type: 'return_processed' });

        return savedCreditNote;
    },
    
    getTotalStock(productId) {
        const product = apiCore.get('inventory', productId);
        if (!product || !product.stockBatches) return 0;
        return product.stockBatches.reduce((sum, batch) => sum + batch.quantity, 0);
    },

    getComponentTotalStock(componentId) {
        const component = apiCore.get('components', componentId);
        if (!component || !component.stockBatches) return 0;
        return component.stockBatches.reduce((sum, batch) => sum + batch.quantity, 0);
    },

    getProductPriceForQuantity(product, quantity, customerId = null) {
        if (customerId && product) {
            const today = new Date();
            const contract = api.get('customerContracts').find(c => 
                c.customerId == customerId && 
                c.productId == product.id &&
                today >= new Date(c.startDate) &&
                today <= new Date(c.endDate)
            );
            if (contract) {
                return contract.contractPrice;
            }
        }

        if (!product || !product.pricingTiers || product.pricingTiers.length === 0) {
            return 0;
        }
        const sortedTiers = [...product.pricingTiers].sort((a, b) => b.minQty - a.minQty);
        const applicableTier = sortedTiers.find(tier => quantity >= tier.minQty);
        return applicableTier ? applicableTier.price : sortedTiers[sortedTiers.length - 1]?.price || 0;
    },

    getOrderTotals(order) {
        const defaultTaxRate = api.get('taxRates').find(t => t.isDefault) || { rate: 0, name: 'No Tax' };

        if (!order || !order.items) {
            return { subtotal: 0, taxAmount: 0, total: 0, taxRate: defaultTaxRate };
        }

        const subtotal = order.items.reduce((total, item) => {
            const product = api.get('inventory', item.productId);
            if (product) {
                const price = this.getProductPriceForQuantity(product, item.quantity, order.customerId);
                return total + (price * item.quantity);
            }
            return total;
        }, 0);
        
        const taxAmount = subtotal * defaultTaxRate.rate;
        const total = subtotal + taxAmount;

        return { subtotal, taxAmount, total, taxRate: defaultTaxRate };
    },

    calculateOrderTotal(order) {
        return this.getOrderTotals(order).total;
    },

    executeProductionOrder(productId, quantityToProduce) {
        const product = apiCore.get('inventory', productId);
        if (!product || !product.bom || product.bom.length === 0) {
            showToast('This product cannot be produced (no Bill of Materials).', 'error');
            api.notifications.addNotification('error', `Failed to produce "${product?.name || 'Unknown Product'}": No Bill of Materials defined.`, { productId: productId });
            return;
        }

        for (const item of product.bom) {
            const requiredStock = item.quantity * quantityToProduce;
            if (this.getComponentTotalStock(item.componentId) < requiredStock) {
                const component = apiCore.get('components', item.componentId);
                showToast(`Not enough ${component?.name || 'component'} in stock.`, 'error');
                api.notifications.addNotification('error', `Failed to produce "${product.name}": Insufficient stock of "${component?.name || 'Unknown Component'}".`, { productId: productId, componentId: component.id });
                return;
            }
        }
        
        const componentsUsedLog = [];
        for (const bomItem of product.bom) {
            const component = apiCore.get('components', bomItem.componentId);
            let quantityToDeduct = bomItem.quantity * quantityToProduce;
            
            const sortedBatches = component.stockBatches.sort((a,b) => new Date(a.receivedDate) - new Date(b.receivedDate));

            for(const batch of sortedBatches) {
                if (quantityToDeduct <= 0) break;
                const amountToTake = Math.min(quantityToDeduct, batch.quantity);
                
                componentsUsedLog.push({
                    componentId: component.id,
                    quantityUsed: amountToTake,
                    supplierLotNumber: batch.supplierLotNumber
                });

                batch.quantity -= amountToTake;
                quantityToDeduct -= amountToTake;
            }
            component.stockBatches = component.stockBatches.filter(b => b.quantity > 0);
        }

        const newProdId = Math.max(0, ...apiCore.get('productionOrders').map(i => i.id)) + 1;
        const today = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(today.getDate() + (product.shelfLifeDays || 90));

        const newBatch = {
            lotNumber: `LOT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${newProdId}`,
            quantity: quantityToProduce,
            expiryDate: expiryDate.toISOString().split('T')[0]
        };
        
        if (!product.stockBatches) {
            product.stockBatches = [];
        }
        product.stockBatches.push(newBatch);

        apiCore.get('productionOrders').push({
            id: newProdId,
            productId: product.id,
            lotNumber: newBatch.lotNumber,
            quantityProduced: quantityToProduce,
            date: today.toISOString().split('T')[0],
            componentsUsed: componentsUsedLog
        });

        apiCore.logEvent('PRODUCTION_ORDER_EXECUTED', `Produced ${quantityToProduce} of ${product.name} (Lot: ${newBatch.lotNumber})`);
        apiCore.save();
        showToast(`${quantityToProduce} units of "${product.name}" produced successfully.`, 'success');
        api.notifications.addNotification('success', `${quantityToProduce} units of "${product.name}" (Lot: ${newBatch.lotNumber}) produced.`, { productId: product.id, lotNumber: newBatch.lotNumber, type: 'production_complete' });
    },

    adjustStockForOrder(orderId) {
        const order = apiCore.get('orders', orderId);
        if (!order || !order.items) return;

        let stockIssues = [];
        for (const item of order.items) {
            const product = apiCore.get('inventory', item.productId);
            let quantityToFulfill = item.quantity;

            if (this.getTotalStock(product.id) < quantityToFulfill) {
                stockIssues.push(`${product.name} (Needed: ${quantityToFulfill}, Available: ${this.getTotalStock(product.id)})`);
                showToast(`Not enough stock for ${product.name}.`, 'error');
                api.notifications.addNotification('warning', `Insufficient stock for order #${order.id}. Product "${product.name}" is short by ${quantityToFulfill - this.getTotalStock(product.id)} units.`, { orderId: order.id, productId: product.id, type: 'order_stock_shortage' });
                continue;
            }
            const sortedBatches = product.stockBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

            for (const batch of sortedBatches) {
                if (quantityToFulfill <= 0) break;
                const amountToTake = Math.min(quantityToFulfill, batch.quantity);
                batch.quantity -= amountToTake;
                quantityToFulfill -= amountToTake;
            }
            product.stockBatches = product.stockBatches.filter(batch => batch.quantity > 0);
        }

        if (stockIssues.length > 0) {
            order.status = 'pending';
            showToast(`Order #${order.id} partially fulfilled or could not be completed due to stock issues.`, 'warning');
        } else {
            showToast(`Stock adjusted for Order #${order.id}.`, 'success');
            api.notifications.addNotification('info', `Stock adjusted for Order #${order.id}.`, { orderId: order.id, type: 'order_stock_adjusted' });
        }
        apiCore.save();
    },

    receivePurchaseOrderStock(poId, itemsWithLots) {
        const po = apiCore.get('purchaseOrders', poId);
        if (!po || po.status === 'fulfilled') {
            showToast('This P.O. has already been fulfilled.', 'error');
            api.notifications.addNotification('error', `Failed to receive stock: P.O. #${po?.poNumber || 'N/A'} has already been fulfilled.`, { poId: poId, type: 'po_already_fulfilled' });
            return;
        }

        itemsWithLots.forEach(itemWithLot => {
            const component = apiCore.get('components', itemWithLot.componentId);
            if(component) {
                if (!component.stockBatches) {
                    component.stockBatches = [];
                }
                
                const newBatch = {
                    quantity: itemWithLot.quantity,
                    supplierLotNumber: itemWithLot.supplierLotNumber,
                    receivedDate: new Date().toISOString().split('T')[0]
                };
                component.stockBatches.push(newBatch);
                
                const poItem = po.items.find(i => i.componentId === itemWithLot.componentId);
                if (poItem) {
                    poItem.supplierLotNumber = itemWithLot.supplierLotNumber;
                }
            }
        });

        po.status = 'fulfilled';
        apiCore.logEvent('PO_STOCK_RECEIVED', `Received stock for P.O. #${po.poNumber}`);
        apiCore.save();
        showToast(`Stock received for P.O. #${po.poNumber}.`, 'success');
        api.notifications.addNotification('success', `Stock received for Purchase Order #${po.poNumber}.`, { poId: poId, type: 'po_stock_received' });
    },

    generateInvoice(orderId) {
        const existingInvoice = apiCore.get('invoices').find(inv => inv.orderId == orderId);
        if (existingInvoice) {
            showToast(`Invoice already exists for this order.`, 'error');
            api.notifications.addNotification('info', `Invoice for Order #${orderId} already exists (${existingInvoice.invoiceNumber}).`, { orderId: orderId, invoiceId: existingInvoice.id, type: 'invoice_exists' });
            return null;
        }
        const order = apiCore.get('orders', orderId);
        if (!order) {
            showToast('Error: Original order not found.', 'error');
            api.notifications.addNotification('error', `Failed to generate invoice: Original order #${orderId} not found.`, { orderId: orderId, type: 'order_not_found' });
            return null;
        }
        
        const newInvoice = {
            orderId: order.id,
            customerId: order.customerId,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            total: this.calculateOrderTotal(order),
            status: 'sent'
        };

        const invoiceCount = apiCore.get('invoices').length + 1;
        newInvoice.invoiceNumber = `INV-2025-${String(invoiceCount).padStart(3, '0')}`;
        
        const savedInvoice = apiCore.add('invoices', newInvoice);
        apiCore.logEvent(
            'INVOICE_GENERATED', 
            `Generated invoice ${savedInvoice.invoiceNumber} for Order #${orderId}`,
            { customerId: savedInvoice.customerId, orderId: orderId, invoiceId: savedInvoice.id } 
        );
        apiCore.save();

        showToast(`Invoice ${savedInvoice.invoiceNumber} created!`, 'success');
        api.notifications.addNotification('success', `Invoice ${savedInvoice.invoiceNumber} generated for Order #${orderId}.`, { orderId: orderId, invoiceId: savedInvoice.id, type: 'invoice_generated' });
        return savedInvoice;
    },

    markInvoiceAsPaid(invoiceId) {
        const invoice = apiCore.get('invoices', invoiceId);
        if (invoice) {
            invoice.status = 'paid';
            apiCore.logEvent(
                'INVOICE_PAID', 
                `Marked invoice #${invoice.invoiceNumber} as paid.`,
                { customerId: invoice.customerId, orderId: invoice.orderId, invoiceId: invoice.id } // Add context
            );
            apiCore.save();
            showToast(`Invoice ${invoice.invoiceNumber} marked as paid.`, 'success');
            api.notifications.addNotification('info', `Invoice ${invoice.invoiceNumber} has been marked as paid.`, { invoiceId: invoice.id, type: 'invoice_paid' });
            return invoice;
        }
        return null;
    },

    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    getAgentRoute(agent) {
        if (!agent) return [];
        const myCustomers = App.state.db.customers.filter(c => c.agentId === agent.id);
        const unvisitedCustomers = myCustomers.filter(c => !App.state.todaysVisits.includes(c.id));

        return unvisitedCustomers.sort((a, b) => {
            const distA = this.haversineDistance(agent.lat, agent.lng, a.lat, a.lng);
            const distB = this.haversineDistance(agent.lat, agent.lng, b.lat, b.lng);
            return distA - distB;
        });
    },
    
    getTodaysSchedule(agent) {
        if (!agent) return [];
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const myCustomers = App.state.db.customers.filter(c => c.agentId === agent.id);

        const scheduledCustomers = myCustomers.filter(c => c.visitSchedule && c.visitSchedule.day === today);

        return scheduledCustomers.sort((a, b) => {
            const distA = this.haversineDistance(agent.lat, agent.lng, a.lat, a.lng);
            const distB = this.haversineDistance(agent.lat, agent.lng, b.lat, b.lng);
            return distA - distB;
        });
    },
};