// js/map.js
import { App } from './state.js';
import { api } from './api.js';

export const mapService = {
    map: null,
    markers: { agents: {}, customers: {} },
    icons: {
        agent_idle: L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
            className: 'agent-truck-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        }),
        agent_transit: L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
            className: 'agent-truck-icon in-transit',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        }),
        customer: L.divIcon({ html: `<div class="glowing-customer-marker"></div>`, className: '', iconSize: [16, 16], iconAnchor: [8, 8] })
    },
    init() {
        this.map = L.map('map', { zoomControl: false }).setView(App.config.map.initialCenter, App.config.map.initialZoom);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd', maxZoom: 20
        }).addTo(this.map);
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);
        this.renderMarkers();
        this.startAgentTracking();
    },
    // UPDATED: Added checks to ensure lat/lng exist before creating markers
    renderMarkers() {
        this._clearMarkers();
        
        // Render Customers
        api.get('customers').forEach(customer => {
            if (customer.lat && customer.lng) { // Check for valid coordinates
                const agent = api.get('agents', customer.agentId);
                const tooltipContent = `<b>${customer.name}</b><br>${customer.company}`;
                const popupContent = `
                    <div class="popup-title">${customer.name}</div>
                    <p><b>Company:</b> ${customer.company}</p>
                    <p><b>Phone:</b> ${customer.phone}</p>
                    <p><b>Assigned Agent:</b> ${agent ? agent.name : 'N/A'}</p>
                `;
                const marker = L.marker([customer.lat, customer.lng], { icon: this.icons.customer })
                    .addTo(this.map)
                    .bindTooltip(tooltipContent)
                    .bindPopup(popupContent);
                this.markers.customers[customer.id] = marker;
            }
        });

        // Render Agents
        api.get('agents').forEach(agent => {
            if (agent.lat && agent.lng) { // Check for valid coordinates
                const icon = agent.status === 'in_transit' ? this.icons.agent_transit : this.icons.agent_idle;
                const popupContent = `<div class="popup-title">${agent.name}</div><p>Role: ${agent.role}</p>`;
                const marker = L.marker([agent.lat, agent.lng], { icon: icon })
                    .addTo(this.map)
                    .bindPopup(popupContent);
                this.markers.agents[agent.id] = marker;
            }
        });
    },
startAgentTracking() {
        const agentState = {}; // Object to hold the state for each agent's journey

        setInterval(() => {
            api.get('agents').forEach(agent => {
                const marker = this.markers.agents[agent.id];
                if (!marker) return;

                // Initialize state for the agent if it doesn't exist
                if (!agentState[agent.id]) {
                    const route = api.get('customers').filter(c => c.agentId === agent.id);
                    agentState[agent.id] = {
                        route: route,
                        targetIndex: 0,
                        isPaused: false,
                        pauseCounter: 0
                    };
                }
                
                const state = agentState[agent.id];
                if (state.route.length === 0) return; // No customers assigned

                // Handle pausing at a destination
                if (state.isPaused) {
                    state.pauseCounter++;
                    if (state.pauseCounter > 15) { // Pause for 30 seconds (15 * 2s interval)
                        state.isPaused = false;
                        state.pauseCounter = 0;
                        state.targetIndex = (state.targetIndex + 1) % state.route.length; // Move to next target
                    }
                    return; // Skip movement while paused
                }

                const targetCustomer = state.route[state.targetIndex];
                if (!targetCustomer || !targetCustomer.lat || !targetCustomer.lng) return;

                const currentPos = marker.getLatLng();
                const targetPos = L.latLng(targetCustomer.lat, targetCustomer.lng);
                
                const distance = currentPos.distanceTo(targetPos);

                if (distance < 200) { // If agent is very close to the target
                    state.isPaused = true;
                    agent.status = 'idle';
                    marker.setIcon(this.icons.agent_idle);
                } else {
                    agent.status = 'in_transit';
                    marker.setIcon(this.icons.agent_transit);
                    // Move 1/20th of the distance towards the target each interval
                    const newLat = currentPos.lat + (targetPos.lat - currentPos.lat) / 20;
                    const newLng = currentPos.lng + (targetPos.lng - currentPos.lng) / 20;
                    
                    agent.lat = newLat; // Update agent's position in the main state
                    agent.lng = newLng;
                    marker.setLatLng([newLat, newLng]);
                }
            });
        }, 2000);
    },
    _clearMarkers() {
        Object.values(this.markers.customers).forEach(marker => this.map.removeLayer(marker));
        Object.values(this.markers.agents).forEach(marker => this.map.removeLayer(marker));
        this.markers = { agents: {}, customers: {} };
    }
};