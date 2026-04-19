import { useState } from 'react';
import JobCard from '../components/JobCard';

export default function JobsPage({ jobs }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJobs = searchQuery.trim()
        ? jobs.filter((job) => {
              const q = searchQuery.toLowerCase();
              return (
                  (job.title && job.title.toLowerCase().includes(q)) ||
                  (job.message && job.message.toLowerCase().includes(q))
              );
          })
        : jobs;

    return (
        <div className="page">
            <div className="page-header">
                <h2 className="page-title">
                    Active Jobs <span className="count-badge">{jobs.length}</span>
                </h2>
            </div>

            {/* Search bar */}
            <div className="search-bar-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Search jobs by keyword, company…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        className="search-clear"
                        onClick={() => setSearchQuery('')}
                        title="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {filteredJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">{searchQuery ? '🔎' : '📭'}</div>
                    <h3>{searchQuery ? 'No matching jobs' : 'No Active Jobs'}</h3>
                    <p>
                        {searchQuery
                            ? `No results for "${searchQuery}"`
                            : 'New placement opportunities will appear here'}
                    </p>
                </div>
            ) : (
                <div className="jobs-grid">
                    {filteredJobs.map((job) => (
                        <JobCard key={job._id} job={job} />
                    ))}
                </div>
            )}
        </div>
    );
}
