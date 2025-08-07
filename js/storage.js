// js/storage.js

const STORAGE_KEY = 'roctecState'; // Changed key to reflect saving entire state

export const storage = {
    saveState(state) { // Accepts the entire App.state now
        try {
            const serializedState = JSON.stringify({
                db: state.db,
                currentUser: state.currentUser // NEW: Save currentUser
            });
            localStorage.setItem(STORAGE_KEY, serializedState);
        } catch (e) {
            console.error("Could not save state to localStorage", e);
        }
    },

    loadState() {
        try {
            const serializedState = localStorage.getItem(STORAGE_KEY);
            if (serializedState === null) {
                return null; // No state saved
            }
            const loadedData = JSON.parse(serializedState);
            // NEW: Return both db and currentUser
            return {
                db: loadedData.db,
                currentUser: loadedData.currentUser || null // Ensure it's null if not found
            };
        } catch (e) {
            console.error("Could not load state from localStorage", e);
            return null;
        }
    }
};