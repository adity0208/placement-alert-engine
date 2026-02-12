import JobCard from '../components/JobCard';

export default function JobsPage({ jobs }) {
    return (
        <div className="page">
            <div className="page-header">
                <h2 className="page-title">
                    Active Jobs <span className="count-badge">{jobs.length}</span>
                </h2>
            </div>

            {jobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No Active Jobs</h3>
                    <p>New placement opportunities will appear here</p>
                </div>
            ) : (
                <div className="jobs-grid">
                    {jobs.map((job) => (
                        <JobCard key={job._id} job={job} />
                    ))}
                </div>
            )}
        </div>
    );
}
