# 🎯 Placement Alert System

A production-ready real-time job alert system that monitors a specific Telegram group, filters job-related messages with duplicate protection, stores them in MongoDB with auto-expiry (24 hours), and broadcasts notifications to connected clients via WebSocket.

## 🏗 Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Telegram Group │─────▶│  Backend Server  │─────▶│  Frontend App   │
│   (Private)     │      │  (Express + WS)  │      │  (React + Vite) │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  MongoDB Atlas   │
                         │  (TTL Indexing)  │
                         └──────────────────┘
```

### Key Features

✅ **Telegram Group Targeting** - Listens only to specified `TELEGRAM_GROUP_ID`  
✅ **Duplicate Protection** - Compound unique index prevents re-processing  
✅ **Auto-Expiry** - MongoDB TTL index auto-deletes jobs after 24 hours  
✅ **WebSocket Safety** - readyState checks, error handling, dead connection cleanup  
✅ **Rate Limiting** - 10 req/min per IP on `/jobs` endpoint  
✅ **Auto-Reconnect** - Exponential backoff for both Telegram and WebSocket  
✅ **Structured Logging** - Color-coded logs with timestamps  
✅ **Browser Notifications** - Real-time popup alerts for new jobs  
✅ **Graceful Shutdown** - Proper cleanup of all connections  

## 📦 Tech Stack

### Backend
- **Express** - REST API server
- **telegram** - Telegram client library (MTProto API)
- **ws** - WebSocket server
- **Mongoose** - MongoDB ODM
- **express-rate-limit** - API protection

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Vanilla CSS** - Minimal styling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier)
- Telegram account
- GitHub account (for deployment)

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd Placment_reminder
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Get Telegram Credentials

1. Visit https://my.telegram.org/apps
2. Create a new application
3. Copy `API_ID` and `API_HASH`

#### Generate Session String

```bash
npm run generate-session
```

Follow the prompts to authenticate with your Telegram account. Copy the session string.

#### Get Telegram Group ID

1. Add bot [@getidsbot](https://t.me/getidsbot) to your private group
2. Copy the group ID (format: `-1001234567890`)

#### Configure Environment

Create `.env` file in `backend/`:

```env
API_ID=your_api_id
API_HASH=your_api_hash
SESSION_STRING=your_session_string_here
TELEGRAM_GROUP_ID=-1001234567890
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/placement-alerts
PORT=3000
```

### 3. MongoDB Atlas Setup

1. Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free M0 cluster
3. **Database Access** → Add user (username/password)
4. **Network Access** → Add IP: `0.0.0.0/0` (allow all for Render compatibility)
5. Copy connection string → Add to `.env` as `MONGODB_URI`

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` file in `frontend/`:

```env
VITE_WS_URL=ws://localhost:3000
VITE_API_URL=http://localhost:3000
```

### 5. Run Locally

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` and send a test message to your Telegram group!

## 🌐 Deployment

### Deploy Backend to Render

1. Push code to GitHub
2. Create account at [render.com](https://render.com)
3. **New Web Service** → Connect repository
4. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**: Add all from `.env`
5. Deploy → Copy URL (e.g., `https://your-app.onrender.com`)

### Deploy Frontend to Vercel

1. Create account at [vercel.com](https://vercel.com)
2. **Import repository**
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Environment Variables**:
     - `VITE_WS_URL=wss://your-backend.onrender.com`
     - `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

### Keep Render Alive (Free Tier)

Render free tier sleeps after 15 minutes of inactivity.

1. Visit [cron-job.org](https://cron-job.org)
2. Create free account
3. Create new cron job:
   - **URL**: `https://your-backend.onrender.com/`
   - **Interval**: Every 10 minutes
4. Save

## 📊 API Endpoints

### `GET /`
Health check endpoint

**Response:**
```json
{
  "status": "online",
  "service": "Placement Alert System",
  "timestamp": "2026-02-11T15:00:00.000Z",
  "connectedClients": 5
}
```

### `GET /jobs`
Get all active jobs (rate limited: 10 req/min per IP)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "jobs": [
    {
      "_id": "...",
      "title": "Software Engineer Opening",
      "message": "Apply now at...",
      "link": "https://...",
      "createdAt": "2026-02-11T14:00:00.000Z",
      "expiresAt": "2026-02-12T14:00:00.000Z"
    }
  ]
}
```

### `GET /stats`
Get system statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "activeJobs": 3,
    "totalJobs": 15,
    "connectedClients": 5
  }
}
```

## 🔧 Configuration

### Message Filtering

Jobs are accepted if:
- Contains URL **OR**
- Contains keywords: `apply`, `portal`, `deadline`, `drive`, `registration`, `hiring`, `opportunity`, `vacancy`

Jobs are rejected if:
- Contains: `selected`, `shortlisted`, `congratulations`, `congrats`, `rejected`, `not selected`

Edit `backend/utils/filter.js` to customize.

### MongoDB Indexes

- **TTL Index**: `expiresAt` (auto-delete after 24h)
- **Compound Unique**: `{telegramMessageId: 1, groupId: 1}` (prevent duplicates)
- **Sort Index**: `createdAt: -1` (fast queries)

### WebSocket Reconnection

**Frontend**: Exponential backoff (1s → 2s → 4s → 8s → 16s → 30s max)  
**Backend**: Exponential backoff (1s → 2s → 4s → ... → 60s max)

## 📈 Scalability

### Current Capacity (50-200 users)
- WebSocket: 200 concurrent connections
- MongoDB: TTL index auto-cleanup, indexed queries
- Memory: ~100MB baseline (Render free tier: 512MB)
- Rate limiting: 10 req/min per IP

### Scale to 1000+ users
- Add Redis for pub/sub (multiple backend instances)
- Increase rate limits
- Use MongoDB connection pooling
- Implement horizontal scaling on Render

## 🐛 Troubleshooting

### Backend won't start
- Check all environment variables are set
- Verify `TELEGRAM_GROUP_ID` is a valid number
- Ensure MongoDB URI is correct

### Telegram not connecting
- Regenerate session string
- Check API_ID and API_HASH
- Verify group ID is correct (negative number)

### Jobs not appearing
- Check Telegram group ID matches
- Send message with job keywords
- Check backend logs for filtering

### WebSocket disconnecting
- Check CORS settings
- Verify WebSocket URL uses `wss://` for production
- Check Render logs for errors

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ for placement season**
