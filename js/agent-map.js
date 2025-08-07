// js/agent-map.js
import { App } from './state.js';
import { api } from './api.js';

export const agentMapService = {
    map: null,
    markers: [],
    agentMarker: null, // Dedicated property for the agent's marker
    routeLayer: null, // Property to hold the route line
    icons: {
        agent: L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 5px #60a5fa);"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        }),
        customer: L.divIcon({ html: `<div class="agent-customer-marker"></div>`, className: '', iconSize: [16, 16], iconAnchor: [8, 8] }),
           // --- NEW: Icon for visited customers ---
        customerVisited: L.divIcon({ html: `<div class="agent-customer-marker visited"></div>`, className: '', iconSize: [16, 16], iconAnchor: [8, 8] })
     },

    init(agent, customers) {
        if (this.map) {
            this.map.remove();
        }
        
        const mapContainer = document.getElementById('agent-map');
        if (!mapContainer) return;

        this.map = L.map('agent-map', { zoomControl: false }).setView(App.config.map.initialCenter, App.config.map.initialZoom);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd', maxZoom: 20
        }).addTo(this.map);

        this.renderMarkers(agent, customers);

        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.3));
        }
    },

    renderMarkers(agent, customers) {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
        this.agentMarker = null; // Reset the agent marker

        if (agent && agent.lat && agent.lng) {
            // Store the agent marker so we can move it later
            this.agentMarker = L.marker([agent.lat, agent.lng], { icon: this.icons.agent }).addTo(this.map);
            this.markers.push(this.agentMarker);
        }

        customers.forEach(customer => {
            if (customer.lat && customer.lng) {
                // --- NEW: Check if visited and choose the correct icon ---
                const isVisited = App.state.todaysVisits.includes(customer.id);
                const icon = isVisited ? this.icons.customerVisited : this.icons.customer;

                const marker = L.marker([customer.lat, customer.lng], { icon: icon })
                    .addTo(this.map)
                    .bindTooltip(customer.name);
                this.markers.push(marker);
            }
        });
    },

    updateAgentPosition(lat, lng) {
        if (this.agentMarker && this.map) {
            const newLatLng = L.latLng(lat, lng);
            this.agentMarker.setLatLng(newLatLng);
            // Optionally, center the map on the agent's new location
            this.map.panTo(newLatLng); 
        }
    },

    drawRoute(routeGeoJson) {
        if (!this.map || !routeGeoJson) return;

        if (this.routeLayer) {
            this.routeLayer.remove();
        }

        // Use L.geoJSON to draw the complex route from the routing service
        this.routeLayer = L.geoJSON(routeGeoJson, {
            style: {
                color: '#a2d2ff', // custom-light-blue
                weight: 5,
                opacity: 0.8,
            }
        }).addTo(this.map);

        // Fit the map to the bounds of the newly drawn route
        this.map.fitBounds(this.routeLayer.getBounds().pad(0.1));
    },

    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.remove();
            this.routeLayer = null;
        }
        // Also clear the ETA display
        const etaDisplay = document.getElementById('route-eta-display');
        if (etaDisplay) {
            etaDisplay.innerHTML = '';
        }
    }
};