# TraceWise — Adaptive Code Learning Platform

An end-to-end full-stack platform teaching code tracing to dyslexic CS students via color-coded step workflows, Bayesian Knowledge Tracing, and AI-generated personalized hints.

---

## Quick Start (Docker)

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY for AI hints (optional, app works without it)

# 2. Start all services (PostgreSQL + Redis + Node backend)
docker-compose up --build

# 3. Open the apps
# Student app:       http://localhost:3000
# Teacher dashboard: http://localhost:3000/dashboard
# API health:        http://localhost:3000/api/health
```

**Demo accounts** (password: `password`):
| Role    | Email                      |
|---------|----------------------------|
| Student | student@tracewise.edu      |
| Teacher | teacher@tracewise.edu      |
| Admin   | admin@tracewise.edu        |

---

## Local Dev (without Docker)

Requires: Node.js 20+, PostgreSQL 16, Redis 7

```bash
cd backend
npm install
psql -d tracewise -f db/schema.sql
psql -d tracewise -f db/seed.sql
npm run dev   # serves frontend/ as static files on :3000
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  CLIENT                                                     │
│  Student App (frontend/index.html)                         │
│  Teacher Dashboard (frontend/dashboard.html + WebSocket)   │
└──────────────────────────┬──────────────────────┬──────────┘
                           │ REST                 │ WS /ws
┌──────────────────────────▼──────────────────────▼──────────┐
│  Express API — JWT auth + RBAC                             │
│  /api/auth  /api/problems  /api/sessions  /api/events      │
│  /api/hints  /api/dashboard  /api/export  /api/mastery     │
├────────────────────┬────────────────────────────────────────┤
│  BKT Service       │  Claude API (Haiku)                   │
│  Bayesian mastery  │  Personalized hint synthesis          │
│  update per event  │  5s timeout + static fallback        │
└──────────┬─────────┴─────────────────┬────────────────────┘
           │                           │
     ┌─────▼──────┐             ┌──────▼─────┐
     │ PostgreSQL │             │   Redis    │
     │ users      │             │ Live sess  │
     │ sessions   │             │ cache TTL  │
     │ step_events│             │ Refresh tok│
     │ problems   │             │ Hint counts│
     │ mastery    │             └────────────┘
     └────────────┘
```

---

## Key Design Decisions (Interview-Ready)

**Why event sourcing for step_events?**
Granularity enables BKT updates per concept and research exports with timing/error patterns. A completion flag would lose all the signal.

**Why BKT over a simpler score?**
BKT models `guess` and `slip` separately — critical for accessibility research. A dyslexic student may slip on a known concept due to cognitive load; BKT doesn't penalize that as harshly as a raw score would. (Corbett & Anderson, 1994)

**Why LLM hints only on 2nd wrong answer?**
Latency budget + cost. 1st wrong → static hint at zero latency. 2nd wrong → Claude Haiku with 5s timeout and static fallback. Student always gets a hint; LLM adds value only when the static hint has already failed.

**Why Redis for live session state?**
Polling `MAX(created_at)` on `step_events` per active session under load is expensive. Redis O(1) lookups + TTL-expiry handle session state naturally without a cron job.

**Why WebSocket over polling/SSE?**
Bidirectional (future: teacher pushes hint to student screen). SSE is unidirectional. Polling at intervention-useful frequency (5s) wastes bandwidth. WS gives sub-second updates.

**Why short-lived JWT + Redis refresh tokens?**
Stateless access tokens (15 min) for API scalability. Refresh tokens in Redis enable server-side logout — pure JWT cannot be revoked before expiry.

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Student self-register |
| POST | `/api/auth/login` | — | Get access + refresh tokens |
| POST | `/api/auth/refresh` | — | Refresh access token |
| GET | `/api/problems` | Any | List published problems |
| GET | `/api/problems/:id` | Any | Full problem with steps |
| POST | `/api/problems` | Teacher | Author new problem |
| POST | `/api/sessions` | Student | Start session |
| PATCH | `/api/sessions/:id/complete` | Student | Complete session |
| POST | `/api/events` | Student | Batch post step events |
| POST | `/api/hints` | Student | Request LLM hint |
| GET | `/api/mastery/me` | Student | My BKT mastery scores |
| GET | `/api/dashboard/class` | Teacher | Live class (from Redis) |
| GET | `/api/dashboard/heatmap` | Teacher | Concept mastery heatmap |
| GET | `/api/dashboard/students` | Teacher | Student roster |
| GET | `/api/export/events.csv` | Admin | Anonymized research export |
| GET | `/api/export/mastery-snapshot.json` | Admin | Aggregate mastery stats |

---

## Research Metrics

Export anonymized step-level data for analysis:

```bash
curl -H "Authorization: Bearer <admin_token>" \
  "http://localhost:3000/api/export/events.csv?since=2024-01-01" \
  -o tracewise_data.csv
```

The anonymizer uses HMAC-SHA256 with a server-side secret — user IDs cannot be de-anonymized by guessing.

Key metrics available:
- Per-step timing (`latency_ms`) — identifies cognitively demanding steps
- Error rates per concept × student cohort
- Hint usage and effectiveness (hint_requested vs. subsequent mc_correct)
- BKT mastery progression curves
- Session completion rates (abandoned vs. completed)

---

## V1 → V2 Story

**V1** (`index.html`): Single-file prototype with color-coded step workflows for propositional logic. Validated with pilot participants. Key finding: TTS + color scaffolding together reduced errors vs. standard worksheet.

**V2** (this platform): Same frontend UX, now backed by a full data layer. We now know *which step* trips a student, not just whether they finished. BKT personalizes sequencing. Teacher dashboard enables real-time intervention. Claude generates hints from the student's actual wrong answers, not hardcoded strings.

---

## Project Structure

```
PCDR-Project/
├── docker-compose.yml
├── .env / .env.example
├── frontend/
│   ├── index.html              # Student SPA
│   ├── dashboard.html          # Teacher dashboard
│   └── js/
│       ├── api.js              # JWT client, event queue
│       ├── auth-modal.js       # Login/register overlay
│       └── ws-client.js        # WebSocket with reconnect
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── src/
│       ├── app.js / server.js
│       ├── config/             # db, redis, env
│       ├── middleware/         # auth, rbac, rate limit, error
│       ├── routes/             # 8 route modules
│       ├── services/           # bkt, claude, masteryUpdater, anonymizer
│       └── ws/                 # wsAuth, wsServer
└── index.html                  # Original v1 (standalone, no backend)
```
