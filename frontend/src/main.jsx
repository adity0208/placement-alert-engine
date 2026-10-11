import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Validate required environment variables
function validateEnvironment() {
    const requiredVars = ['VITE_API_URL', 'VITE_WS_URL'];
    const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

    if (missingVars.length > 0) {
        console.warn(`Missing frontend environment variables: ${missingVars.join(', ')}`);
        console.warn('Some features may not work correctly. Please check your .env file.');
    }

    // Validate URL formats
    const apiUrl = import.meta.env.VITE_API_URL;
    const wsUrl = import.meta.env.VITE_WS_URL;

    if (apiUrl && !apiUrl.startsWith('http')) {
        console.warn('VITE_API_URL should be a valid HTTP URL');
    }

    if (wsUrl && !wsUrl.startsWith('ws') && !wsUrl.startsWith('wss')) {
        console.warn('VITE_WS_URL should be a valid WebSocket URL (ws:// or wss://)');
    }
}

// Run validation
validateEnvironment();

// Cold-Start Mitigation: The Ping Hack
// Fire an immediate, non-blocking request to wake up the Render backend
// the absolute second the JS bundle executes.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
fetch(`${API_URL}/api/ping`).catch(() => { /* ignore errors */ });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
