import { useState } from 'react';
import Sidebar from './components/Sidebar';
import JobsPage from './pages/JobsPage';
import NoticesPage from './pages/NoticesPage';
import { useWebSocket } from './hooks/useWebSocket';
import './index.css';

function App() {
    const [currentPage, setCurrentPage] = useState('jobs');
    const { jobs, notices, connected } = useWebSocket();

    return (
        <div className="app">
            <Sidebar
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                jobsCount={jobs.length}
                noticesCount={notices.length}
                connected={connected}
            />

            <main className="main-content">
                {currentPage === 'jobs' ? (
                    <JobsPage jobs={jobs} />
                ) : (
                    <NoticesPage notices={notices} />
                )}
            </main>
        </div>
    );
}

export default App;
