import { useState, useEffect } from 'react';
import {
  BarChart2,
  Clock,
  Radio,
  Trophy,
  Briefcase,
  Search,
  Loader2,
  TrendingUp
} from 'lucide-react';

export default function DashboardPage({ jobs, hackathons }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for charts - in a real app, this would come from API/backend
  const jobsData = prepareJobsChartData(jobs);
  const hackathonsData = prepareHackathonsChartData(hackathons);
  const sourceData = prepareSourceDistributionData(jobs, hackathons);
  const timelineData = prepareTimelineData(jobs, hackathons);

  useEffect(() => {
    // Simulate loading state
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, [jobs, hackathons, selectedTimeframe]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleTimeframeChange = (e) => {
    setSelectedTimeframe(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="page-title">
            Dashboard <TrendingUp className="w-4 h-4" />
          </h2>
          <p className="page-subtitle">
            Real-time analytics and insights from the placement alert system
          </p>
        </div>
        <div className="dashboard-grid">
          <div className="skeleton-card w-full h-64"></div>
          <div className="skeleton-card w-full h-64"></div>
          <div className="skeleton-card w-full h-64"></div>
          <div className="skeleton-card w-full h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">
          Dashboard <TrendingUp className="w-4 h-4" />
        </h2>
        <p className="page-subtitle">
          Real-time analytics and insights from the placement alert system
        </p>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="search-bar-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            className="search-bar"
            placeholder="Search insights..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <div className="timeframe-selector">
          <label className="timeframe-label">Timeframe:</label>
          <select
            className="timeframe-select"
            value={selectedTimeframe}
            onChange={handleTimeframeChange}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <h3 className="stat-title">Active Jobs</h3>
          <p className="stat-value">{jobs.length}</p>
          <p className="stat-change positive">
            <BarChart2 className="w-3 h-3 inline-block" /> +12% vs last week
          </p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Active Hackathons</h3>
          <p className="stat-value">{hackathons.length}</p>
          <p className="stat-change positive">
            <Trophy className="w-3 h-3 inline-block" /> +8% vs last week
          </p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Total Sources</h3>
          <p className="stat-value">{sourceData.length}</p>
          <p className="stat-change positive">
            <Radio className="w-3 h-3 inline-block" /> Monitoring {sourceData.length} channels
          </p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Avg. Time to Expiry</h3>
          <p className="stat-value">{calculateAvgTimeToExpiry(jobs, hackathons)}</p>
          <p className="stat-change neutral">
            <Clock className="w-3 h-3 inline-block" /> Average lifespan
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Jobs Trend Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Job Postings Trend</h3>
          <div className="chart-container">
            {!isLoading && jobsData.length > 0 ? (
              <BarChart2Chart data={jobsData} />
            ) : (
              <div className="chart-placeholder">
                <Loader2 className="w-6 h-6 mx-auto mb-3" />
                <p className="text-center text-muted">Loading job trends...</p>
              </div>
            )}
          </div>
        </div>

        {/* Source Distribution Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Opportunities by Source</h3>
          <div className="chart-container">
            {!isLoading && sourceData.length > 0 ? (
              <PieChart data={sourceData} />
            ) : (
              <div className="chart-placeholder">
                <Loader2 className="w-6 h-6 mx-auto mb-3" />
                <p className="text-center text-muted">Loading source data...</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Activity Timeline</h3>
          <div className="chart-container">
            {!isLoading && timelineData.length > 0 ? (
              <TimelineChart data={timelineData} />
            ) : (
              <div className="chart-placeholder">
                <Loader2 className="w-6 h-6 mx-auto mb-3" />
                <p className="text-center text-muted">Loading timeline...</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Job vs Hackathon Ratio</h3>
          <div className="chart-container">
            {!isLoading ? (
              <CategoryBreakdownChart
                jobsCount={jobs.length}
                hackathonsCount={hackathons.length}
              />
            ) : (
              <div className="chart-placeholder">
                <Loader2 className="w-6 h-6 mx-auto mb-3" />
                <p className="text-center text-muted">Loading category data...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3 className="section-title">Recent Activity</h3>
        <div className="activity-list">
          {renderRecentActivity([...jobs, ...hackathons])}
        </div>
      </div>
    </div>
  );
}

// Helper functions for data preparation
function prepareJobsChartData(jobs) {
  // Group jobs by date for the last 7 days
  const grouped = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    grouped[dateStr] = 0;
  }

  jobs.forEach(job => {
    const jobDate = new Date(job.createdAt).toISOString().split('T')[0];
    if (grouped[jobDate] !== undefined) {
      grouped[jobDate]++;
    }
  });

  return Object.keys(grouped)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: grouped[date]
    }));
}

function prepareHackathonsChartData(hackathons) {
  // Similar to jobs but for hackathons
  const grouped = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    grouped[dateStr] = 0;
  }

  hackathons.forEach(hack => {
    const hackDate = new Date(hack.createdAt).toISOString().split('T')[0];
    if (grouped[hackDate] !== undefined) {
      grouped[hackDate]++;
    }
  });

  return Object.keys(grouped)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: grouped[date]
    }));
}

function prepareSourceDistributionData(jobs, hackathons) {
  const sourceCounts = {};

  jobs.forEach(job => {
    const source = job.sourceName || 'Unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  hackathons.forEach(hack => {
    const source = hack.sourceName || 'Unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  return Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); // Top 6 sources
}

function prepareTimelineData(jobs, hackathons) {
  const allItems = [...jobs, ...hackathons];
  const grouped = {};

  allItems.forEach(item => {
    const date = new Date(item.createdAt).toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });

  return Object.keys(grouped)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: grouped[date]
    }));
}

function calculateAvgTimeToExpiry(jobs, hackathons) {
  const allItems = [...jobs, ...hackathons];
  if (allItems.length === 0) return 'N/A';

  const totalTime = allItems.reduce((sum, item) => {
    if (!item.expiresAt) return sum;
    const expiry = new Date(item.expiresAt);
    const created = new Date(item.createdAt);
    const diffHours = (expiry - created) / (1000 * 60 * 60);
    return sum + diffHours;
  }, 0);

  const avgHours = totalTime / allItems.length;
  const days = Math.floor(avgHours / 24);
  const hours = Math.floor(avgHours % 24);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function renderRecentActivity(items) {
  const sorted = [...items]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return sorted.map(item => (
    <div key={item._id} className="activity-item">
      <div className="activity-icon">
        {item.type === 'job' ? (
          <Briefcase className="w-4 h-4" />
        ) : (
          <Trophy className="w-4 h-4" />
        )}
      </div>
      <div className="activity-content">
        <h4 className="activity-title">
          {item.type === 'job'
            ? `${item.companyName || 'Company'} is hiring for ${item.jobRole || 'Role'}`
            : item.title || 'Hackathon Event'
          }
        </h4>
        <p className="activity-time">
          {new Date(item.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  ));
}

// Chart Components
function BarChart2Chart({ data }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const barHeight = 20;
  const barSpacing = 8;
  const chartHeight = data.length * (barHeight + barSpacing) + 20;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 200 ${chartHeight}`}
      aria-label="Bar chart showing trends"
      role="img"
    >
      {data.map((item, index) => {
        const barWidth = (item.count / maxCount) * 180;
        const y = index * (barHeight + barSpacing) + 10;

        return (
          <g key={item.date}>
            <rect
              x="10"
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#18181B"
              rx="2"
            />
            <text
              x="200"
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              fill="#71717A"
              fontSize="10"
              alignmentBaseline="middle"
            >
              {item.count}
            </text>
            <text
              x="5"
              y={y + barHeight / 2 + 4}
              textAnchor="start"
              fill="#71717A"
              fontSize="10"
              alignmentBaseline="middle"
            >
              {item.date}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ data }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const cx = 100;
  const cy = 100;
  const radius = 80;

  return (
    <svg
      className="chart-svg"
      viewBox="0 0 200 200"
      aria-label="Pie chart showing source distribution"
      role="img"
    >
      {data.map((item, index) => {
        const percentage = (item.count / total) * 100;
        const angle = (item.count / total) * 360;
        const endAngle = index === 0 ? angle :
          data.slice(0, index + 1).reduce((sum, d) => sum + (d.count / total) * 360, 0);
        const startAngle = index === 0 ? 0 :
          data.slice(0, index).reduce((sum, d) => sum + (d.count / total) * 360, 0);

        // Calculate coordinates for the arc
        const startX = cx + radius * Math.cos(startAngle * Math.PI / 180);
        const startY = cy + radius * Math.sin(startAngle * Math.PI / 180);
        const endX = cx + radius * Math.cos(endAngle * Math.PI / 180);
        const endY = cy + radius * Math.sin(endAngle * Math.PI / 180);

        const largeArc = angle > 180 ? "1" : "0";
        const pathData = [
          "M", startX, startY,
          "A", radius, radius, 0, largeArc, 1, endX, endY,
          "L", cx, cy,
          "Z"
        ].join(" ");

        // Generate distinct colors for each slice
        const hue = (index * 40) % 360; // Spread colors around the wheel
        const color = `hsl(${hue}, 70%, 45%)`;

        return (
          <g key={item.source}>
            <path
              d={pathData}
              fill={color}
              cursor="pointer"
            >
              <title>{`${item.source}: ${item.count} opportunities`}</title>
            </path>
            {/* Label with line */}
            <g transform={`translate(${cx}, ${cy})`}>
              <text
                x={radius + 10}
                y={-10 + index * 20}
                fill="#18181B"
                fontSize="11"
                fontWeight="500"
              >
                {/* Truncate long source names to prevent overflow */}
                {item.source.length > 15 ? item.source.substring(0, 15) + '...' : item.source}: {item.count}
              </text>
            </g>
          </g>
        );
      })}
      {/* Center label */}
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fill="#18181B"
        fontSize="14"
        fontWeight="600"
      >
        Sources
      </text>
    </svg>
  );
}

function TimelineChart({ data }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const chartWidth = 280;
  const chartHeight = 120;
  const padding = 20;

  // Handle edge case where maxCount is 0 or all data points have count 0
  const safeMaxCount = maxCount > 0 ? maxCount : 1;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      aria-label="Line chart showing activity timeline"
      role="img"
    >
      {/* Grid lines */}
      {[1, 2, 3, 4].map(level => (
        <line
          key={level}
          x1={padding}
          y1={chartHeight - padding - (level * (chartHeight - 2 * padding) / 5)}
          x2={chartWidth - padding}
          y2={chartHeight - padding - (level * (chartHeight - 2 * padding) / 5)}
          stroke="#F4F3F0"
          strokeWidth="1"
        />
      ))}

      {/* Line path */}
      <path
        d={generateLinePath(data, chartWidth, chartHeight, padding, safeMaxCount)}
        stroke="#18181B"
        strokeWidth="2"
        fill="none"
      >
        <title>Activity over time</title>
      </path>

      {/* Points */}
      {data.map((point, index) => {
        // Handle edge case where we only have one data point (avoid division by zero)
        const x = data.length === 1
          ? padding + (chartWidth - 2 * padding) / 2
          : padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);

        // Handle edge case where maxCount is 0
        const y = chartHeight - padding - ((point.count / safeMaxCount) * (chartHeight - 2 * padding));

        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={4}
            fill="#18181B"
            cursor="pointer"
          >
            <title>{`${point.date}: ${point.count} activities`}</title>
          </circle>
        );
      })}

      {/* X-axis labels */}
      {data.map((point, index) => {
        // Handle edge case where we only have one data point (avoid division by zero)
        const x = data.length === 1
          ? padding + (chartWidth - 2 * padding) / 2
          : padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
        return (
          <text
            key={`x-${index}`}
            x={x}
            y={chartHeight - 5}
            textAnchor="middle"
            fill="#71717A"
            fontSize="10"
          >
            {point.date}
          </text>
        );
      })}

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding));
        const value = Math.round(safeMaxCount * ratio);
        return (
          <text
            key={`y-${ratio}`}
            x={padding - 10}
            y={y + 4}
            textAnchor="end"
            fill="#71717A"
            fontSize="9"
          >
            {value}
          </text>
        );
      })}
    </svg>
  );
}

function generateLinePath(data, width, height, padding, maxCount) {
  if (data.length === 0) return "M0 0";

  // Handle edge case where maxCount is 0 or all data points have count 0
  const safeMaxCount = maxCount > 0 ? maxCount : 1;

  const points = data.map((point, index) => {
    // Handle edge case where we only have one data point (avoid division by zero)
    const x = data.length === 1
      ? padding + (width - 2 * padding) / 2
      : padding + (index / (data.length - 1)) * (width - 2 * padding);

    const y = height - padding - ((point.count / safeMaxCount) * (height - 2 * padding));
    return `${x},${y}`;
  });

  return `M${points.join(" L")}`;
}

function CategoryBreakdownChart({ jobsCount, hackathonsCount }) {
  const total = jobsCount + hackathonsCount;
  if (total === 0) return null;

  const jobsPercentage = (jobsCount / total) * 100;
  const hackathonsPercentage = (hackathonsCount / total) * 100;

  return (
    <div className="category-breakdown">
      <div className="category-bar">
        <div
          className="category-bar-segment jobs"
          style={{ width: `${jobsPercentage}%` }}
        >
          <span className="category-label">Jobs ({jobsCount})</span>
        </div>
        <div
          className="category-bar-segment hackathons"
          style={{ width: `${hackathonsPercentage}%` }}
        >
          <span className="category-label">Hackathons ({hackathonsCount})</span>
        </div>
      </div>
      <div className="category-labels">
        <div className="category-label-item">
          <span className="category-label-name">Jobs</span>
          <span className="category-label-value">{jobsPercentage.toFixed(1)}%</span>
        </div>
        <div className="category-label-item">
          <span className="category-label-name">Hackathons</span>
          <span className="category-label-value">{hackathonsPercentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}