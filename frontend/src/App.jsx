import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import JobsPage from './pages/JobsPage';
import HackathonsPage from './pages/HackathonsPage';
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

    const skeletonCards = Array(6).fill(null);

    return (
        <div className="page relative">
            <div className="page-header">
                <div className="skeleton skeleton-text" style={{ width: '250px', height: '40px', borderRadius: '8px' }}></div>
            </div>
            
            <div className="search-bar-wrapper mb-8">
                <div className="skeleton" style={{ width: '100%', height: '46px', borderRadius: '24px' }}></div>
            </div>

            <div className="jobs-grid">
                {skeletonCards.map((_, index) => (
                    <div key={index} className="job-card" style={{ pointerEvents: 'none' }}>
                        <div className="job-header">
                            <div className="skeleton skeleton-text" style={{ width: '70%', height: '24px', marginBottom: '12px' }}></div>
                            <div className="job-meta">
                                <div className="skeleton" style={{ width: '100px', height: '20px', borderRadius: '4px' }}></div>
                                <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '4px', marginTop: '8px' }}></div>
                        </div>

                        <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px', marginBottom: '8px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '90%', height: '16px', marginBottom: '8px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '60%', height: '16px', marginBottom: '24px' }}></div>

                        <div className="job-actions">
                            <div className="skeleton" style={{ width: '110px', height: '36px', borderRadius: '6px' }}></div>
                            <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '6px' }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="skeleton-banner">
                <div className="loading-spinner banner-spinner"></div>
                <div className="banner-text">
                    <h4 className="banner-title">
                        {isLongWait
                            ? "Taking longer than usual. Try refreshing the page."
                            : "Waking up the server..."}
                    </h4>
                    {!isLongWait && (
                        <p className="banner-subtext">Backend is hosted on Render free tier — it sleeps when inactive.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function App() {
    const [currentPage, setCurrentPage] = useState('jobs');
    const [selectedSource, setSelectedSource] = useState('all');
    const { jobs, hackathons, connectionState } = useWebSocket();

    // Show loading state if we are not connected and have no data
    const isWaiting = connectionState !== 'connected' && jobs.length === 0 && hackathons.length === 0;

    // Dynamically compile the list of unique sources present in jobs and hackathons
    const activeSources = Array.from(
        new Set([
            ...jobs.map(j => j.sourceName).filter(Boolean),
            ...hackathons.map(h => h.sourceName).filter(Boolean)
        ])
    );

    // Filter jobs based on source
    const filteredJobs = selectedSource === 'all'
        ? jobs
        : jobs.filter(j => j.sourceName === selectedSource);

    // Filter hackathons based on source
    const filteredHackathons = selectedSource === 'all'
        ? hackathons
        : hackathons.filter(h => h.sourceName === selectedSource);

    // Reset filtering if current selected source disappears (e.g. cache clearance)
    useEffect(() => {
        if (selectedSource !== 'all' && !activeSources.includes(selectedSource)) {
            setSelectedSource('all');
        }
    }, [jobs, hackathons]);

    return (
        <div className="app">
            <Sidebar
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                jobsCount={filteredJobs.length}
                hackathonsCount={filteredHackathons.length}
                connectionState={connectionState}
                sources={activeSources}
                selectedSource={selectedSource}
                setSelectedSource={setSelectedSource}
            />

            <main className="main-content">
                {isWaiting ? (
                    <ServerLoading connectionState={connectionState} />
                ) : currentPage === 'jobs' ? (
                    <JobsPage jobs={filteredJobs} />
                ) : (
                    <HackathonsPage hackathons={filteredHackathons} />
                )}
            </main>
        </div>
    );
}

export default App;
