import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Cold-Start Mitigation: The Ping Hack
// Fire an immediate, non-blocking request to wake up the Render backend 
// the absolute second the JS bundle executes.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
fetch(`${API_URL}/api/ping`).catch(() => { /* ignore errors */ });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
