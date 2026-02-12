import { useState, useEffect, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useWebSocket() {
    const [jobs, setJobs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [connected, setConnected] = useState(false);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_DELAY = 30000; // 30 seconds

    // Fetch initial data
    const fetchInitialData = async () => {
        try {
            const [jobsRes, noticesRes] = await Promise.all([
                fetch(`${API_URL}/jobs`),
                fetch(`${API_URL}/notices`)
            ]);

            const jobsData = await jobsRes.json();
            const noticesData = await noticesRes.json();

            if (jobsData.success) setJobs(jobsData.jobs);
            if (noticesData.success) setNotices(noticesData.notices);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    // Connect to WebSocket with exponential backoff
    const connectWebSocket = () => {
        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                setConnected(true);
                reconnectAttemptsRef.current = 0;

                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'new_job') {
                        console.log('📨 New job received:', data.data);
                        setJobs((prevJobs) => [data.data, ...prevJobs]);
                    } else if (data.type === 'new_notice') {
                        console.log('📨 New notice received:', data.data);
                        setNotices((prevNotices) => {
                            const updated = [data.data, ...prevNotices];
                            return updated.slice(0, 7); // Keep only last 7
                        });
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                setConnected(false);

                const delay = Math.min(
                    1000 * Math.pow(2, reconnectAttemptsRef.current),
                    MAX_RECONNECT_DELAY
                );

                reconnectAttemptsRef.current++;

                console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${reconnectAttemptsRef.current})...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, delay);
            };

            // Send ping every 30 seconds
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);

            ws.addEventListener('close', () => {
                clearInterval(pingInterval);
            });

        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
        }
    };

    // Initialize on mount
    useEffect(() => {
        fetchInitialData();
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // Remove expired jobs every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setJobs((prevJobs) =>
                prevJobs.filter(job => new Date(job.expiresAt) > new Date())
            );
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    return { jobs, notices, connected, wsRef };
}
