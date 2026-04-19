import NoticeCard from '../components/NoticeCard';

export default function NoticesPage({ notices }) {
    return (
        <div className="page">
            <div className="page-header">
                <h2 className="page-title">Recent Notices</h2>
                <p className="page-subtitle">
                    Announcements from your placement cell · Updated in real-time
                </p>
            </div>

            {notices.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📢</div>
                    <h3>No Notices Yet</h3>
                    <p>Recent group messages will appear here</p>
                </div>
            ) : (
                <div className="notices-list">
                    {notices.map((notice) => (
                        <NoticeCard key={notice._id} notice={notice} />
                    ))}
                </div>
            )}
        </div>
    );
}
