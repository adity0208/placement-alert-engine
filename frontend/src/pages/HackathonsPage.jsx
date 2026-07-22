import { useState } from 'react';
import HackathonCard from '../components/HackathonCard';

export default function HackathonsPage({ hackathons }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHackathons = searchQuery.trim()
        ? hackathons.filter((hack) => {
              const q = searchQuery.toLowerCase();
              return (
                  (hack.title && hack.title.toLowerCase().includes(q)) ||
                  (hack.organizer && hack.organizer.toLowerCase().includes(q)) ||
                  (hack.message && hack.message.toLowerCase().includes(q))
              );
          })
		: hackathons;

    return (
        <div className="page">
            <div className="page-header">
                <h2 className="page-title">
                    Active Hackathons <span className="count-badge">{hackathons.length}</span>
                </h2>
                <p className="page-subtitle">
                    Coding contests, hackathons, and ideathons compiled in real-time.
                </p>
            </div>

            {/* Search bar */}
            <div className="search-bar-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Search hackathons by title, host..."
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

            {filteredHackathons.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">{searchQuery ? '🔎' : '🏆'}</div>
                    <h3>{searchQuery ? 'No matching hackathons' : 'No Active Hackathons'}</h3>
                    <p>
                        {searchQuery
                            ? `No results for "${searchQuery}"`
                            : 'New contests and challenges will appear here'}
                    </p>
                </div>
            ) : (
                <div className="jobs-grid">
                    {filteredHackathons.map((hack) => (
                        <HackathonCard key={hack._id} hackathon={hack} />
                    ))}
                </div>
            )}
        </div>
    );
}
