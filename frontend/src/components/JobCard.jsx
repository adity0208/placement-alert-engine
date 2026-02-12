import { useState, useEffect } from 'react';

export default function JobCard({ job }) {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isExpiringSoon, setIsExpiringSoon] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(job.expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                setIsExpiringSoon(false);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeRemaining(`${hours}h ${minutes}m`);
            setIsExpiringSoon(hours < 6); // Highlight if less than 6 hours
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);

        return () => clearInterval(interval);
    }, [job.expiresAt]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`job-card ${isExpiringSoon ? 'expiring-soon' : ''}`}>
            <div className="job-header">
                <h3 className="job-title">{job.title}</h3>
                <div className="job-meta">
                    <span className="meta-item">
                        🕒 {formatDate(job.createdAt)}
                    </span>
                    <span className={`meta-item timer ${timeRemaining === 'Expired' ? 'expired' : ''}`}>
                        ⚡ {timeRemaining}
                    </span>
                </div>
            </div>

            <p className="job-message">{job.message}</p>

            <div className="job-actions">
                {job.link && (
                    <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        🔗 Apply Now
                    </a>
                )}
                <button
                    onClick={() => navigator.clipboard.writeText(job.message)}
                    className="btn btn-secondary"
                >
                    📋 Copy
                </button>
            </div>
        </div>
    );
}
