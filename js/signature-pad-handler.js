// js/signature-pad-handler.js
import { api } from './api.js';
import { showToast } from './toast.js';

export const signatureHandler = {
    canvas: null,
    ctx: null,
    drawing: false,

    show(orderId) {
        // First, render the modal using the UI function
        agentUI.renderSignatureModal(orderId);

        // Then, initialize the functionality
        this.canvas = document.getElementById('signature-pad');
        this.ctx = this.canvas.getContext('2d');
        this.drawing = false;

        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        this.addEventListeners();

        document.getElementById('clear-signature-btn').addEventListener('click', this.clearCanvas.bind(this));
        document.getElementById('save-signature-btn').addEventListener('click', this.saveSignature.bind(this));
    },

    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 2;
    },

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const event = e.touches ? e.touches[0] : e;
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },

    startDrawing(e) {
        this.drawing = true;
        const pos = this.getPos(e);
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
    },

    draw(e) {
        if (!this.drawing) return;
        e.preventDefault(); // Prevent scrolling on touch devices
        const pos = this.getPos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    },

    stopDrawing() {
        this.drawing = false;
    },

    addEventListeners() {
        const start = this.startDrawing.bind(this);
        const move = this.draw.bind(this);
        const stop = this.stopDrawing.bind(this);

        this.canvas.addEventListener('mousedown', start);
        this.canvas.addEventListener('mousemove', move);
        this.canvas.addEventListener('mouseup', stop);
        this.canvas.addEventListener('mouseout', stop);

        this.canvas.addEventListener('touchstart', start, { passive: false });
        this.canvas.addEventListener('touchmove', move, { passive: false });
        this.canvas.addEventListener('touchend', stop);
    },

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    saveSignature(e) {
        const orderId = e.currentTarget.dataset.orderId;
        
        // Check if the canvas is empty
        const isCanvasBlank = !this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.some(channel => channel !== 0);
        if (isCanvasBlank) {
            showToast('Please provide a signature.', 'error');
            return;
        }

        const signatureDataUrl = this.canvas.toDataURL('image/png');

        const order = api.get('orders', orderId);
        order.signature = signatureDataUrl;
        // The order is now complete!
        order.status = 'completed'; 
        
        api.update('orders', orderId, order);
        api.adjustStockForOrder(orderId); // Adjust stock after completion
        api.save();
        
        this.closeModal();
        showToast('Order confirmed and signature saved!', 'success');
        window.location.hash = `#order/${orderId}`;
    },

    closeModal() {
        document.getElementById('signature-modal-overlay')?.remove();
        // Clean up event listeners to prevent memory leaks
        window.removeEventListener('resize', this.resizeCanvas.bind(this));
    }
};

// We need to import agentUI here, but it also imports us, creating a circular dependency.
// A simple solution is to attach the signature handler to the window or pass it around.
// For now, let's just re-import it, but be aware this can be fragile.
import { agentUI } from './agent-ui.js';