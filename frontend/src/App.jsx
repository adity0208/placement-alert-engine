import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import JobsPage from './pages/JobsPage';
import NoticesPage from './pages/NoticesPage';
import { useWebSocket } from './hooks/useWebSocket';
import './index.css';

function ServerLoading({ connectionState }) {
    const [isLongWait, setIsLongWait] = useState(false);

    useEffect(() => {
        let timer;
        if (connectionState !== 'connected') {
            timer = setTimeout(() => setIsLongWait(true), 90000);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [connectionState]);

    return (
        <div className="page">
            <div className="empty-state loading-state" style={{ marginTop: '10vh' }}>
                <div className="loading-spinner"></div>
                <h3>
                    {isLongWait
                        ? "Taking longer than usual. Try refreshing the page."
                        : "Waking up the server..."}
                </h3>
                {!isLongWait && (
                    <>
                        <p>This takes about 30–60 seconds on first load. Hang tight.</p>
                        <p className="loading-subtext">Backend is hosted on Render free tier — it sleeps when inactive.</p>
                    </>
                )}
            </div>
        </div>
    );
}

function App() {
    const [currentPage, setCurrentPage] = useState('jobs');
    const { jobs, notices, connectionState } = useWebSocket();

    // Show loading state if we are not connected and have no data
    const isWaiting = connectionState !== 'connected' && jobs.length === 0;

    return (
        <div className="app">
            <Sidebar
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                jobsCount={jobs.length}
                noticesCount={notices.length}
                connectionState={connectionState}
            />

            <main className="main-content">
                {isWaiting ? (
                    <ServerLoading connectionState={connectionState} />
                ) : currentPage === 'jobs' ? (
                    <JobsPage jobs={jobs} />
                ) : (
                    <NoticesPage notices={notices} />
                )}
            </main>
        </div>
    );
}

export default App;
