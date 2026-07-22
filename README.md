# Placement Alert Engine

A production-ready, real-time event-driven job & hackathon notification system. It monitors specified Telegram channels using the MTProto API, parses unstructured text with a **Multi-Tier AI Fallback Engine** (Gemini 2.0 Flash + Groq Llama 3.3 70B + Local Regex), prevents duplicates via MongoDB compound indexing, auto-expires stale alerts, and streams updates instantly to active clients via WebSockets.

---

## 🏗️ System Architecture

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  Telegram Channels     │─────▶│  GramJS Listener       │─────▶│ Multi-Tier AI Engine   │
│  (Public / Private)    │      │  (Node.js / MTProto)   │      │ (Gemini ➔ Groq ➔ Regex) │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                             │
                                                                             ▼
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  Frontend App          │◀─────│  WebSocket Server      │◀─────│ MongoDB Atlas          │
│  (React + Lucide + PWA)│      │  (Express + WS)        │      │ (TTL & Compound Index) │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

---

## ⚡ Core Engineering Highlights

### 1. Multi-Tier AI Fallback Engine (`backend/aiParser.js`)
To guarantee $0-downtime parsing reliability even when free-tier AI quotas are exhausted:
* **Tier 1 (Primary AI)**: Google Gemini API (`gemini-2.0-flash` via `@google/genai`).
* **Tier 2 (Failover AI)**: Groq API (`llama-3.3-70b-versatile` via `groq-sdk`). If Gemini returns an HTTP 429 rate limit or quota error, the system automatically routes the payload to Groq within milliseconds.
* **Tier 3 (Local Fallback)**: Deterministic regex and keyword rules engine. If both AI services are unavailable, the local parser extracts job links, eligibility criteria, and classifications to guarantee zero data loss.

### 2. High-Contrast shadcn/ui Design System
* **Iconography**: Complete integration of `lucide-react` SVG icons. All raw inline emojis have been replaced with vector icons (`Target`, `Briefcase`, `Trophy`, `Radio`, `Zap`, `Clock`, `Building2`, `GraduationCap`, `Calendar`, `Award`, `ExternalLink`, `Copy`, `Check`).
* **Persistent Light / Dark Mode**:
  * **Light Mode (Default)**: Solid warm off-white background (`#FAF8F5`), deep charcoal typography (`#18181B`), and strict 1px neutral gray borders (`#E4E4E7`).
  * **Dark Mode**: Complete pitch-black dark mode (`#000000` background, `#FAFAFA` text, `#27272A` borders) with `localStorage` persistence (`placement_theme`).
* **Title Sanitization**: Clean title processing that strips prompt prefix residue (e.g. `"Company name:"`, `"Role:"`, `"Title:"`) via regular expressions.
* **PWA & Mobile Navigation Drawer**: Responsive top bar and slide-over navigation drawer with backdrop blur overlay (`.mobile-backdrop`) for small-screen compliance.
* **UX Micro-Interactions**: Interactive 2-second copy button feedback state (`<Check /> Copied`).

### 3. Data Integrity & Storage Strategy
* **Duplicate Prevention**: Compound unique indexing (`{ telegramMessageId: 1, groupId: 1 }`) prevents re-processing the same announcement.
* **Auto-Purging TTL Index**: MongoDB TTL index (`expiresAt`) automatically deletes postings after 24-48 hours to ensure a fresh feed.

---

## 📦 Tech Stack

### Backend
* **Runtime**: Node.js (ES Modules)
* **Framework**: Express.js
* **Real-time Protocol**: WebSockets (`ws`)
* **Telegram Client**: GramJS (`telegram` MTProto API)
* **AI Provider 1**: `@google/genai` (Gemini 2.0 Flash)
* **AI Provider 2**: `groq-sdk` (Llama 3.3 70B Versatile)
* **Database**: MongoDB Atlas via Mongoose ODM
* **Security & Rate Limiting**: `express-rate-limit`

### Frontend
* **UI Framework**: React 18
* **Build Tool**: Vite
* **Icon System**: `lucide-react`
* **Styling**: Vanilla CSS (TailwindCSS integration ready)

---

## 🔑 Environment Configuration

Create `.env` files in both `backend/` and `frontend/` directories using the parameters listed below.

### `backend/.env`

```env
# Telegram MTProto Credentials (https://my.telegram.org/apps)
API_ID=your_api_id
API_HASH=your_api_hash
SESSION_STRING=your_gramjs_session_string

# Telegram Target Channels/Groups (comma-separated IDs or handles)
TELEGRAM_TARGETS=-1001234567890,@react_jobs

# MongoDB Database URI
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/placement-alerts?retryWrites=true&w=majority

# Backend Port
PORT=5000

# Primary AI Provider (Google AI Studio: https://aistudio.google.com)
GEMINI_API_KEY=your_gemini_api_key

# Secondary Failover AI Provider (Groq Console: https://console.groq.com)
GROQ_API_KEY=your_groq_api_key
```

### `frontend/.env`

```env
VITE_WS_URL=ws://localhost:5000
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/adity0208/placement-alert-engine.git
cd placement-alert-engine

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Generate Telegram Session String

If you need a new GramJS session string:

```bash
cd backend
npm run generate-session
```

Follow the command-line authentication prompts and copy the generated string into `SESSION_STRING` in `backend/.env`.

### 3. Run Development Servers

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

Visit `http://localhost:5173` in your browser.

---

## 📊 API & System Endpoints

### `GET /`
Health check endpoint returning system status and connected WebSocket clients.

**Response:**
```json
{
  "status": "online",
  "service": "Placement Alert System",
  "timestamp": "2026-07-22T14:00:00.000Z",
  "connectedClients": 3
}
```

### `GET /jobs`
Returns all active job listings (Rate-limited: 10 requests/min per IP).

### `GET /stats`
Returns current system metrics (active jobs, total ingested jobs, and active WebSocket connections).

---

## 📝 License

MIT
