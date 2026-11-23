# Placement Alert Engine — Architecture

[![CI](https://github.com/adity0208/placement-alert-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/adity0208/placement-alert-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-HPA%20%7C%20Worker-326CE5?logo=kubernetes&logoColor=white)](k8s/)
[![Redis](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-DC382D?logo=redis&logoColor=white)](backend/lib/queue.js)
[![Prometheus](https://img.shields.io/badge/Metrics-Prometheus%20%2B%20Grafana-E6522C?logo=prometheus&logoColor=white)](monitoring/)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%7C%2037%20Passed-C21325?logo=jest&logoColor=white)](backend/tests/)

A resilient, event-driven, job and hackathon notification microservice. It monitors Telegram channels using the MTProto binary protocol, buffers payloads in a **BullMQ/Redis queue**, parses unstructured postings with a **3-Tier AI Fallback Engine** (Gemini (gemini-3.8-flash, then gemini-3.7-flash) → Groq (openai/gpt-oss-120b) → Local Regex), enforces deduplication via MongoDB compound indexing, streams alerts in real-time via WebSockets, and exports Prometheus metrics with Grafana dashboards.

Containerized with multi-stage Docker builds, automated by GitHub Actions CI/CD, and orchestrated on Kubernetes with a stateless API tier (auto-scaled via HPA) and a dedicated single-replica stateful ingestion worker.

---

## 🏗️ System Architecture

```
                                  TELEGRAM CHANNELS
                               (Public / Private Groups)
                                          │
                                          │ MTProto Protocol
                                          ▼
                      ┌───────────────────────────────────────┐
                      │   Stateful Ingestion Worker (K8s)     │
                      │  (1 Replica - GramJS Session Client)  │
                      └──────────────────┬────────────────────┘
                                         │
                                         │ Enqueue Job
                                         ▼
                             ┌───────────────────────┐
                             │    Redis 7 + BullMQ   │
                             │  (parse-message Queue)│
                             └───────────┬───────────┘
                                         │
                                         │ Worker Concurrency (3x)
                                         ▼
                      ┌───────────────────────────────────────┐
                      │      3-Tier AI Fallback Engine        │
                      │ 1. Gemini Flash (Google GenAI SDK)    │
                      │ 2. Groq (openai/gpt-oss-120b) (Failover)     │
                      │ 3. Deterministic Local Regex Engine   │
                      └──────────────────┬────────────────────┘
                                         │
                      ┌──────────────────┴────────────────────┐
                      ▼                                       ▼
       ┌─────────────────────────────┐         ┌─────────────────────────────┐
       │     MongoDB Database        │         │   WebSocket Broadcast Hub   │
       │  - Compound Unique Index    │         │  (Real-Time Event Stream)   │
       │  - 3-Day Auto-Purging TTL   │         └──────────────┬──────────────┘
       │  - Sparse applyLink Index   │                        │
       └─────────────────────────────┘                        │
                      ▲                                       ▼
                      │                         ┌───────────────────────────┐
     ┌────────────────┴──────────────┐          │    Frontend Web App       │
     │      Stateless REST API       │◀─────────┤   (React 18 + Vite + PWA) │
     │  (2-6 Pods Scaled by K8s HPA) │          │   (Nginx Multi-Stage)     │
     └──────────────┬────────────────┘          └───────────────────────────┘
                    │
                    │ Scrape /metrics (15s)
                    ▼
     ┌───────────────────────────────┐
     │   Prometheus & Grafana SRE    │
     │  - Latency Histograms (p95)   │
     │  - Queue Backlog & Failovers  │
     └───────────────────────────────┘
```

---

## ⚡ Core Engineering Highlights

### 1. Decoupled Async Message Ingestion (BullMQ + Redis)
* **Separation of Concerns**: Telegram message delivery is asynchronous and bursty. Instead of blocking the listener on synchronous LLM API calls, raw payloads are immediately enqueued to BullMQ (`parse-message` queue) with exponential backoff retries.
* **Idempotent Job Processing**: Jobs are assigned an idempotent key (`${groupId}-${messageId}`) to prevent redundant processing during network retries or listener reconnections.

### 2. Multi-Tier AI Fallback Engine (`backend/aiParser.js`)
* **Tier 1 (Primary)**: Google Gemini API (`gemini-3.8-flash`) with structured JSON schema enforcement.
* **Tier 2 (Failover)**: Groq API (`llama-3.3-70b-versatile`). Automatically absorbs traffic within milliseconds if Gemini encounters HTTP 429 rate limits or quota exhaustion.
* **Tier 3 (Local Offline Fallback)**: Deterministic regex and keyword rules engine. Works with no network access, so ingestion continues when both AI providers are unavailable.

### 3. Kubernetes manifests (validated locally on kind/minikube)
* **API Deployment (`k8s/api/`)**: Fully stateless Express and WebSocket API. Configured with a `HorizontalPodAutoscaler` (HPA) scaling between 2 and 6 pods on 70% CPU / 80% memory utilization. Liveness (`/`) and readiness (`/api/ping`) probes are configured.
* **Ingestion Worker Deployment (`k8s/worker/`)**: Fixed at **exactly 1 replica** with `Recreate` update strategy. The Telegram `SESSION_STRING` authenticates a single MTProto session and cannot be shared across multiple concurrent pods without session invalidation.

### 4. Enterprise Observability (`backend/lib/metrics.js`)
Exposes `/metrics` in Prometheus format scraped every 15 seconds:
* `notices_ingested_total`: Counter tracking saved postings, labelled by `type` (job/hackathon) and `source` (gemini/groq/local).
* `parse_duration_seconds`: Latency histogram tracking parse duration percentiles (p50, p95, p99) per engine tier.
* `parse_failures_total`: Counter tracking error rates per tier.
* `queue_depth`: Gauge reflecting current waiting + delayed jobs in BullMQ.
* `gemini_retries_total`: Counter tracking failover events from Gemini to Groq/local.
* Preconfigured Prometheus alert rules (`monitoring/alerts/rules.yml`) and Grafana SRE dashboard (`monitoring/dashboards/placement-overview.json`).

---

## 📦 Tech Stack

| Domain | Technology |
|---|---|
| **Backend Runtime** | Node.js 20+ (Strict ES Modules) |
| **API Framework** | Express.js, WebSockets (`ws`), `express-rate-limit` |
| **Async Queue & Cache** | BullMQ v5, Redis 7 (ioredis) |
| **Telegram Protocol** | GramJS (MTProto binary protocol) |
| **AI Parsing** | Google GenAI SDK (Gemini (gemini-3.8-flash)) + Groq SDK (Llama 3.3 70B) |
| **Database** | MongoDB Atlas / Mongoose (Compound unique index + 72h TTL) |
| **Testing** | Jest 29, Supertest 7, Mocked AI & In-memory Repositories (37 tests) |
| **Containers** | Docker (multi-stage, non-root users), Docker Compose |
| **Orchestration** | Kubernetes (Deployments, HPA, Services, Ingress, kind/minikube) |
| **CI/CD** | GitHub Actions (Lint, Test, Docker Buildx, Audit, CD push) |
| **Observability** | Prometheus (`prom-client`), Grafana dashboards, Prometheus alert rules |
| **Frontend** | React 18, Vite, Lucide Icons, Nginx reverse proxy |

---

## 🚀 Quick Start (Local Docker Compose)

The entire stack — Redis, Backend, Frontend, Prometheus, and Grafana — spins up with a single command.

### 1. Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
* Copy environment templates:
  ```bash
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
  ```
  *(Fill in your `MONGODB_URI` and optional AI keys in `backend/.env`)*

### 2. Start Services
```bash
docker-compose up --build -d
```

### 3. Verify Endpoints
| Service | URL | Credentials / Notes |
|---|---|---|
| **Frontend Web App** | `http://localhost:80` | React SPA served via Nginx |
| **Backend API Health** | `http://localhost:5000/` | Returns JSON status & WebSocket client count |
| **Backend Readiness** | `http://localhost:5000/api/ping` | Returns `pong` |
| **Prometheus Metrics** | `http://localhost:5000/metrics` | Raw Prometheus metric exposition |
| **Prometheus UI** | `http://localhost:9090` | Targets & scrape health |
| **Grafana Dashboard** | `http://localhost:3001` | User: `admin` / Password: `admin` |

---

## ☸️ Kubernetes Deployment (kind / minikube)

Validating the Kubernetes objects locally with [kind](https://kind.sigs.k8s.io/) or [minikube](https://minikube.sigs.k8s.io/):

### Option A: Using kind (Recommended)

1. **Create multi-node cluster with ingress support:**
   ```bash
   kind create cluster --config k8s/kind-config.yaml --name placement
   ```

2. **Install Nginx Ingress Controller:**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
   kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s
   ```

3. **Deploy the application stack:**
   ```bash
   # 1. Create namespace
   kubectl apply -f k8s/namespace.yaml

   # 2. Apply config and secrets
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secret.yaml

   # 3. Deploy Redis service
   kubectl apply -f k8s/redis/deployment.yaml

   # 4. Deploy stateless API with HPA
   kubectl apply -f k8s/api/deployment.yaml
   kubectl apply -f k8s/api/service.yaml
   kubectl apply -f k8s/api/hpa.yaml

   # 5. Deploy single-replica Ingestion Worker
   kubectl apply -f k8s/worker/deployment.yaml

   # 6. Deploy Frontend & Ingress
   kubectl apply -f k8s/frontend/deployment.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

4. **Verify workloads:**
   ```bash
   kubectl get pods,svc,hpa -n placement
   ```

---

## 🧪 Test Suite & Quality Assurance

The codebase includes comprehensive unit and integration tests covering parser failovers, deduplication, schema contracts, and API routes.

```bash
cd backend
npm test
```

### Test Coverage Highlights (37/37 Tests Passing)
* **`tests/aiParser.test.js` (9 tests)**: Verifies Gemini JSON parsing with mocked responses, validates seamless failover to Groq on rate limits (HTTP 429), verifies deterministic regex fallback when all AI APIs are unreachable, and rejects non-job notifications.
* **`tests/dedupe.test.js` (9 tests)**: Enforces compound unique constraint (`telegramMessageId` + `groupId`), verifies cross-channel `applyLink` deduplication, and tests rejection filters against congratulatory messages.
* **`tests/jobModel.test.js` (11 tests)**: Validates Mongoose schema constraints, enum values (`job`, `hackathon`), 72-hour TTL pre-save calculation, and virtual property calculations.
* **`tests/api.test.js` (8 tests)**: Supertest integration testing for `GET /`, `GET /api/ping`, `GET /jobs` (sorting & expiry filtering), `GET /hackathons`, `GET /stats`, and `GET /metrics`.

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Located in `.github/workflows/`:

* **`ci.yml` (Pull Requests & Main)**:
  1. **Lint Backend**: Syntax and code standards verification.
  2. **Test Backend**: Spawns an ephemeral Redis 7 service container, sets isolated test environments, and executes the full Jest suite.
  3. **Docker Build**: Validates multi-stage Docker builds for backend and frontend.
  4. **Security Audit**: Scans npm dependencies for high/critical vulnerabilities.
* **`cd.yml` (Main Branch Push & Release Tags)**:
  1. Authenticates against Docker Hub / GHCR via repository secrets.
  2. Builds and pushes multi-architecture images with Git commit SHA and semantic version tags.
  3. Triggers rolling rollout restart across the Kubernetes deployment (`kubectl rollout restart deployment/placement-api -n placement`).

---

## 📑 Resume & Interview Talking Points

### For Backend Engineering Roles

### For DevOps & SRE Roles

---

## 🔒 Security & Best Practices
* **No Hardcoded Secrets**: All credentials (`SESSION_STRING`, `API_ID`, `GEMINI_API_KEY`, `MONGODB_URI`) are passed exclusively via environment variables or Kubernetes Secrets.
* **Non-Root Containers**: Docker runner stages create dedicated `nodeuser:nodejs` (UID 1001) to prevent privilege escalation vulnerabilities.
* **Rate Limiting**: `express-rate-limit` guards against client abuse on read endpoints.

---

## 📝 License
MIT
