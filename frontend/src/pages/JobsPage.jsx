import { useState } from 'react';
import { Search, X, SearchX, Inbox } from 'lucide-react';
import JobCard from '../components/JobCard';

export default function JobsPage({ jobs }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJobs = searchQuery.trim()
        ? jobs.filter((job) => {
              const q = searchQuery.toLowerCase();
              return (
                  (job.title && job.title.toLowerCase().includes(q)) ||
                  (job.companyName && job.companyName.toLowerCase().includes(q)) ||
                  (job.jobRole && job.jobRole.toLowerCase().includes(q)) ||
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
                <p className="page-subtitle">
                    Live recruitment drives and job openings parsed in real-time.
                </p>
            </div>

            {/* Search bar */}
            <div className="search-bar-wrapper">
                <Search className="search-icon w-4 h-4" />
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Search jobs by role, company, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        className="search-clear"
                        onClick={() => setSearchQuery('')}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {filteredJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon-wrapper">
                        {searchQuery ? <SearchX className="w-10 h-10 text-zinc-400" /> : <Inbox className="w-10 h-10 text-zinc-400" />}
                    </div>
                    <h3>{searchQuery ? 'No matching jobs' : 'No Active Jobs'}</h3>
                    <p>
                        {searchQuery
                            ? `No results for "${searchQuery}"`
                            : 'New placement opportunities will appear here automatically'}
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
