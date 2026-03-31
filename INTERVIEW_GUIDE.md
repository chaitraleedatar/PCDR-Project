# TraceWise — Complete Interview Guide & Project Documentation

> A full-stack, AI-powered accessible learning platform for dyslexic CS students.
> Built with Node.js, PostgreSQL, Redis, WebSockets, and Claude AI.

---

## Table of Contents

1. [The Elevator Pitch](#1-the-elevator-pitch)
2. [The Story: How It Started](#2-the-story-how-it-started)
3. [What the App Actually Does (User Flow)](#3-what-the-app-actually-does-user-flow)
4. [System Architecture Diagram](#4-system-architecture-diagram)
5. [Project File Structure Explained](#5-project-file-structure-explained)
6. [The Tech Stack — Plain English](#6-the-tech-stack--plain-english)
7. [The Database — Tables Explained](#7-the-database--tables-explained)
8. [The Backend — Every Route Explained](#8-the-backend--every-route-explained)
9. [The AI Component — How Claude Is Used](#9-the-ai-component--how-claude-is-used)
10. [The Adaptive Engine — Bayesian Knowledge Tracing](#10-the-adaptive-engine--bayesian-knowledge-tracing)
11. [Real-Time Teacher Dashboard — WebSockets](#11-real-time-teacher-dashboard--websockets)
12. [Security — Auth, JWT, and Redis](#12-security--auth-jwt-and-redis)
13. [Docker — What It Does Here](#13-docker--what-it-does-here)
14. [Interview Q&A — AI-Focused Questions](#14-interview-qa--ai-focused-questions)
15. [Interview Q&A — System Design Questions](#15-interview-qa--system-design-questions)
16. [Demo Walkthrough Script (Voiceover)](#16-demo-walkthrough-script-voiceover)
17. [Key Numbers to Remember](#17-key-numbers-to-remember)

---

## 1. The Elevator Pitch

> "TraceWise is an adaptive learning tool that helps dyslexic computer science students
> understand code by breaking it into color-coded, step-by-step guided walkthroughs.
> Students trace through a code problem one color at a time — green to scan the structure,
> purple to read variables, yellow to evaluate expressions, blue to follow branches, red to
> identify the output. When a student gets stuck, the app gives them progressively more
> helpful hints — the second wrong answer triggers an AI-generated, personalized explanation
> using Claude. A teacher dashboard shows live progress across the whole class, and the
> backend tracks every interaction so we can measure what actually helps dyslexic learners."

**One sentence version:**
> "It's an accessibility-first code learning tool, backed by a full production API, that uses
> AI to give personalized hints and a math model to track what each student has actually learned."

---

## 2. The Story: How It Started

### Version 1 — The Single File Prototype

The project began as a single HTML file (`index.html` at the root of the repo). There was no server, no database, no login. It was a proof-of-concept that asked: *can color-coding help students understand logical structures?* The app was called ColorPath at this stage.

The original idea used propositional logic (AND, OR, NOT gates). But after reflection, this was a poor choice for a demo — propositional logic is hard to explain to anyone who isn't already a CS student. The concepts were renamed and re-focused around **code tracing** — reading Python code line by line and understanding what it does.

**Key insight from V1:** Students who used the color system + text-to-speech made significantly fewer errors than those reading plain text. This validated the approach and motivated building V2.

### Version 2 — The Full Platform

The question became: how do we *know* which step trips a student? A yes/no "did they finish" answer isn't enough for research or for personalization. So V2 added:

- A **database** to record every single click, every wrong answer, how long each step took
- A **math model** (Bayesian Knowledge Tracing) to estimate, per student, what they actually know
- **AI hints** that respond to what the student got wrong, not hardcoded text
- A **teacher dashboard** that shows live class progress in real time
- A **research export** so educators can analyze patterns across students

The frontend looks nearly identical to V1 — same colors, same flow. The entire upgrade is in the infrastructure underneath.

---

## 3. What the App Actually Does (User Flow)

### Role-Based Routing

When a user logs in, their role determines where they go:

| Role    | Lands on              | Bounced away from     |
|---------|-----------------------|-----------------------|
| student | `/` (student app)     | `/dashboard` → `/`    |
| teacher | `/dashboard`          | `/` → `/dashboard`    |
| admin   | `/dashboard`          | `/` → `/dashboard`    |

The check in `index.html`: on `cp:logged-in`, if `api.user.role` is `teacher` or `admin`, immediately `window.location.href = '/dashboard'`.
The check in `dashboard.html`: on `cp:logged-in`, if role is not `teacher`/`admin`, silently redirect to `/`.

---

### Student Flow

```
STUDENT OPENS http://localhost:3000
         |
         v
[Login Modal appears — branded "TraceWise"]
  Enter: student@tracewise.edu / password
         |
         v
[Role check: student → stays on student app]
         |
         v
[3-tab navigation loads at the top]
  📚 Problems | 📊 My Progress | 💡 How It Works
         |
         v  (default tab: Problems)
[Dyslexia Mode toggle is ON by default]
  → Lexend font, 21px text, warm cream background (#fdf9f0),
    extra word/letter spacing, warm amber banner:
    "🌟 Dyslexia-Friendly Mode is ON"
  → Toggle switches to Standard Mode: Inter font, 16px,
    white/blue-gray background — a dramatic visual change

[Problem Selector loads from database]
  "Print Statement Trace  ★☆☆☆☆  (4 steps)  ⭐ Start here!"
         |
         v
[Code snippet displays in dark code block]
  name = "Alex"
  score = 95
  print(f"Hi {name}, your score is {score}")

  [Button: "🤖 What does this code do?"]  ← AI FEATURE #1
         |
         v
[Step 1: Student must pick GREEN (Scan)]
  → Picks wrong color → "Try the 🟢 Scan color — it's highlighted now!"
  → Picks GREEN ✓ → Multiple choice question appears:
    "How many variables are assigned before the print?"
    [1]  [2]  [3]

  1st wrong → "Not quite — look at the code again and try another answer."
  2nd wrong → AI hint immediately requested + shown:  ← AI FEATURE #2
              "🤖 AI Hint: Look at the first two lines — what does = do on each line?"
         |
         v
[Steps 2-4 continue: VIOLET → VIOLET → RED]
         |
         v
[Session Complete 🎉 — animated slide-up panel]
  Score: 85    Steps Done: 4    Color Errors: 1    Answer Errors: 1
  Detailed step-by-step table
  Updated mastery bars: code_scan 72%, read_variable 85%, output 60%
  [▶ Try Again button]

[📊 My Progress tab]
  Profile card: avatar, username, role, sessions count, concepts count
  Full mastery bar chart — color-coded labels:
    ● Mastered (green)  ● Proficient (blue)  ● Developing (yellow)  ● Novice (red)
```

### Teacher / Admin Flow

```
TEACHER OPENS http://localhost:3000  (or /dashboard directly)
         |
         v
[Login Modal appears]
  Enter: teacher credentials
         |
         v
[Role check: teacher/admin → auto-redirected to /dashboard]
  (If teacher accidentally opens /, the cp:logged-in handler
   detects role and immediately redirects to /dashboard)
         |
         v
[4 Tabs:]

Tab 1: LIVE CLASS (WebSocket)
  ┌─────────────────────────────────────────────┐
  │ student1  P2  Step 3/4  0 errors  ✅ active │
  │ student2  P1  Step 5/7  2 errors  ⚠️ stuck  │
  └─────────────────────────────────────────────┘
  Updates in real time — no page refresh needed

Tab 2: CONCEPT HEATMAP
  Shows which concepts the class struggles with most
  code_scan:       ████████░░  80%
  evaluate_expr:   █████░░░░░  50%
  follow_branch:   ███░░░░░░░  30%  ← class is struggling here

Tab 3: STUDENT ROSTER
  Click any student → view their mastery profile
  Full mastery bar chart per concept

Tab 4: AUTHOR PROBLEMS
  Create new code tracing problems
  Add steps, choose colors, write questions and choices
  Publish/unpublish toggle
```

---

## 4. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                      │
│                                                              │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │   Student App           │  │   Teacher Dashboard      │  │
│  │   frontend/index.html   │  │   frontend/dashboard.html│  │
│  │                         │  │                          │  │
│  │  • Color rail UI        │  │  • Live class tab (WS)   │  │
│  │  • Code display         │  │  • Concept heatmap       │  │
│  │  • MC questions         │  │  • Student roster        │  │
│  │  • AI explain button    │  │  • Problem authoring     │  │
│  │  • Mastery summary      │  │                          │  │
│  └────────────┬────────────┘  └─────────────┬────────────┘  │
│               │ HTTP REST                   │ WebSocket /ws  │
│  ┌────────────┴────────────────────────────┴────────────┐   │
│  │              frontend/js/api.js                       │   │
│  │   • Token management     • Event batching             │   │
│  │   • Auto token refresh   • Request queue              │   │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────┐
│                    Node.js / Express Server                   │
│                   backend/src/app.js + server.js             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API Routes                         │   │
│  │  POST /api/auth/login      ← bcrypt + JWT            │   │
│  │  GET  /api/problems        ← list published problems  │   │
│  │  POST /api/sessions        ← start a learning session │   │
│  │  POST /api/events          ← log every click (batch)  │   │
│  │  POST /api/hints           ← AI hint (2nd wrong)      │   │
│  │  POST /api/explain         ← AI code explanation      │   │
│  │  GET  /api/mastery/me      ← student's BKT scores     │   │
│  │  GET  /api/dashboard/*     ← teacher analytics        │   │
│  │  GET  /api/export/*        ← anonymized research data  │   │
│  └───────────┬────────────────────────────┬──────────────┘   │
│              │                            │                   │
│  ┌───────────▼──────────┐  ┌─────────────▼──────────────┐   │
│  │   Services Layer     │  │   WebSocket Server          │   │
│  │                      │  │   backend/src/ws/wsServer   │   │
│  │  bkt.js              │  │                             │   │
│  │  Bayesian formula    │  │  • Teacher rooms            │   │
│  │  updates p_know      │  │  • 30s heartbeat            │   │
│  │  after each answer   │  │  • 90s stuck detection      │   │
│  │                      │  │  • Broadcasts session_update│   │
│  │  claude.js           │  └─────────────────────────────┘   │
│  │  Two AI features:    │                                     │
│  │  generateLLMHint()   │                                     │
│  │  explainCode()       │                                     │
│  │  5s timeout + static │                                     │
│  │  fallback on error   │                                     │
│  │                      │                                     │
│  │  anonymizer.js       │                                     │
│  │  HMAC-SHA256 hashes  │                                     │
│  │  user IDs for export │                                     │
│  └───────────┬──────────┘                                     │
└──────────────┼──────────────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼───────────┐  ┌──────▼──────────┐
│  PostgreSQL   │  │     Redis       │
│  Port 5432    │  │   Port 6379     │
│               │  │                 │
│  users        │  │ session:UUID    │
│  problems     │  │  → live state   │
│  sessions     │  │  → TTL 8h       │
│  step_events  │  │                 │
│  mastery      │  │ refresh:uid:*   │
│               │  │  → JWT tokens   │
│  JSONB steps  │  │  → TTL 7 days   │
│  Indexes for  │  │                 │
│  fast lookups │  │ hint_count:sid  │
└───────────────┘  │  → rate limit   │
                   └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Anthropic Claude API                       │
│                  (External, claude-haiku-4-5)                │
│                                                              │
│  Called only when:                                           │
│  1. Student clicks "What does this code do?"                 │
│  2. Student gets a step wrong 3 times                        │
│                                                              │
│  Always has a static fallback — app works without API key   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Project File Structure Explained

```
PCDR-Project/
│
├── docker-compose.yml          ← Starts all 3 services with one command
├── .env                        ← Secret keys (never committed to git)
├── .env.example                ← Template showing what keys are needed
├── .gitignore                  ← Tells git to ignore node_modules, .env
│
├── index.html                  ← Original V1 prototype (standalone, no server, named ColorPath)
│
├── frontend/                   ← Everything the browser downloads and runs
│   ├── index.html              ← TraceWise student app — 3-tab SPA (Problems, My Progress, How It Works)
│   ├── dashboard.html          ← Teacher dashboard
│   └── js/
│       ├── api.js              ← All HTTP calls, token handling, event queue
│       ├── auth-modal.js       ← The login/register popup
│       └── ws-client.js        ← WebSocket with auto-reconnect
│
└── backend/                    ← The server
    ├── Dockerfile              ← Instructions for building the server image
    ├── package.json            ← Lists all npm packages the server needs
    ├── node_modules/           ← Downloaded packages (auto-generated, NOT in git)
    │
    ├── db/
    │   ├── schema.sql          ← Creates all database tables
    │   └── seed.sql            ← Adds demo users and 3 practice problems
    │
    └── src/
        ├── server.js           ← Entry point — starts HTTP + WebSocket together
        ├── app.js              ← Plugs all routes together into Express
        │
        ├── config/
        │   ├── env.js          ← Reads and validates environment variables
        │   ├── db.js           ← PostgreSQL connection pool
        │   └── redis.js        ← Redis client
        │
        ├── middleware/
        │   ├── auth.js         ← Checks JWT token on every protected request
        │   ├── requireRole.js  ← Blocks students from teacher endpoints
        │   ├── rateLimiter.js  ← Prevents login brute-force and hint spam
        │   └── errorHandler.js ← Catches all errors, returns clean JSON
        │
        ├── routes/             ← One file per feature area
        │   ├── auth.js         ← Login, register, refresh, logout
        │   ├── problems.js     ← List, get, create problems
        │   ├── sessions.js     ← Start and complete learning sessions
        │   ├── events.js       ← Receive and store student click data
        │   ├── hints.js        ← Request AI hint (rate limited)
        │   ├── explain.js      ← Request AI code explanation
        │   ├── mastery.js      ← Get student's mastery scores
        │   ├── dashboard.js    ← Teacher analytics endpoints
        │   └── export.js       ← Anonymized CSV/JSON for research
        │
        ├── services/
        │   ├── bkt.js          ← Bayesian Knowledge Tracing math
        │   ├── masteryUpdater.js ← Updates BKT scores after each event
        │   ├── claude.js       ← All Claude AI API calls
        │   └── anonymizer.js   ← HMAC-SHA256 hashing for research export
        │
        └── ws/
            ├── wsAuth.js       ← Authenticates WebSocket connections via JWT
            └── wsServer.js     ← Real-time teacher dashboard logic
```

### What is `node_modules`?

When you run `npm install`, Node.js reads `package.json` and downloads all listed libraries into the `node_modules` folder. Think of it like an app store — instead of writing an encryption library from scratch, you just say "I need bcryptjs" and npm downloads it. The folder can have thousands of files but you never edit them directly. It's excluded from git (listed in `.gitignore`) because it can be recreated any time with one command.

---

## 6. The Tech Stack — Plain English

| Technology | What it is | How it's used here |
|---|---|---|
| **Node.js** | JavaScript that runs on a server (not in a browser) | The entire backend runs on Node. It handles HTTP requests, talks to the database, calls Claude AI. |
| **Express** | A web framework for Node — makes routing easy | Defines what happens when someone hits `/api/login` vs `/api/hints`. Like traffic control for requests. |
| **PostgreSQL** | A relational database | Stores users, problems, sessions, and every single click (step_events). Think of it as a very organized, searchable spreadsheet. |
| **Redis** | An in-memory key-value store | Stores live session state (which step is each student on right now), JWT refresh tokens, and hint rate limits. Much faster than PostgreSQL for temporary data. |
| **JWT (JSON Web Tokens)** | A way to prove who you are without the server remembering you | After login, the server gives you a signed token. You send it with every request. The server can verify it without a database lookup. |
| **WebSocket** | A persistent, two-way connection between browser and server | The teacher dashboard gets live updates the instant a student makes progress — no page refresh needed. Like a phone call vs. sending letters. |
| **Docker / Docker Compose** | Packages apps into portable containers | One command starts PostgreSQL + Redis + the Node server, all configured correctly. No "works on my machine" problems. |
| **Claude AI (Anthropic)** | A large language model API | Generates personalized hints and plain-English code explanations on demand. |
| **bcrypt** | A password hashing library | Passwords are never stored as plain text — only as an irreversible hash. If the database is leaked, passwords are still safe. |
| **HTML/CSS/JavaScript** | The frontend | The student app and teacher dashboard are built with vanilla HTML and JavaScript — no React, no framework. Deliberately kept simple for accessibility. |
| **Google Fonts (Inter + Lexend)** | Typography | Inter is the default clean font. Lexend is loaded for dyslexia mode — it's specifically designed to reduce visual stress and improve reading for dyslexic users. Switching fonts is a core part of the accessibility feature. |
| **CSS Custom Properties** | Design system | All colors, fonts, spacing are defined as CSS variables (`:root { --font: ...; --font-size: ...; }`). Dyslexia mode overrides these variables on `body.dyslexia-mode` — one class change transforms the entire app's typography and color scheme. |
| **SQL** | The language for querying databases | Used to retrieve student mastery, insert events, and generate analytics. |
| **JSONB (PostgreSQL feature)** | Stores JSON inside a database column | Problem steps are stored as a JSONB array in one database column — easy to retrieve the whole problem at once. |

### Why Node.js and not Python or Java?

Node uses the same language (JavaScript) as the frontend. That means the same team member can read and work on both. It's also event-driven and handles many concurrent connections well — important when many students are using the app simultaneously.

### Why Redis alongside PostgreSQL?

PostgreSQL is for permanent data. Redis is for fast, temporary data.

- When a student takes a step, we need to instantly show their teacher an update — checking PostgreSQL under load would be slow
- Redis stores the current session state in RAM — O(1) lookup, essentially instant
- Redis TTL (time-to-live) automatically cleans up data after 8 hours — no cron job needed

---

## 7. The Database — Tables Explained

### `users` — Who can log in

```
id           UUID    → unique identifier (auto-generated)
username     TEXT    → display name
email        TEXT    → used to log in
password_hash TEXT   → bcrypt hash, never plain text
role         TEXT    → 'student', 'teacher', or 'admin'
```

### `problems` — The code tracing exercises

```
id           TEXT    → e.g., 'P1', 'P2', 'P3'
title        TEXT    → "If-Else Branch Trace"
formula      TEXT    → the Python code snippet
difficulty   INT     → 1-5 scale
steps_json   JSONB   → array of {color, question, choices, correct, explain}
targets_json JSONB   → array of {id, label} — the step targets for the progress bar
is_published BOOLEAN → teachers can hide problems from students
```

### `sessions` — One attempt by one student at one problem

```
id           UUID    → unique per attempt
user_id      UUID    → which student
problem_id   TEXT    → which problem (P1, P2, P3)
started_at   TIME    → when they began
completed_at TIME    → null until they finish (used to detect abandoned sessions)
route_errors INT     → how many times they picked wrong color
mc_errors    INT     → how many wrong multiple-choice answers
hints_used   INT     → how many hints they needed
```

### `step_events` — Every single interaction (the research gold mine)

This is the most important table. Every click creates a row here.

```
id           BIGINT  → auto-incrementing row id
session_id   UUID    → which session this belongs to
step_index   INT     → which step (0-6 for a 7-step problem)
phase        TEXT    → 'GREEN', 'VIOLET', 'YELLOW', 'BLUE', or 'RED'
concept_tag  TEXT    → 'code_scan', 'read_variable', 'evaluate_expression', etc.
event_type   TEXT    → 'route_error', 'mc_error', 'mc_correct', 'hint_requested', 'llm_hint_shown'
choice_made  TEXT    → what they actually selected
correct      BOOL    → whether it was right
latency_ms   INT     → how many milliseconds they spent on this step
```

**Why record every click?** Because a raw score (did they finish yes/no) loses all the signal. With `step_events`, we can ask:
- Which step do students spend the most time on? (cognitive load indicator)
- Which wrong answer is chosen most often? (systematic misconception)
- Does seeing an AI hint actually improve the next answer?
- Do students who use more hints end up with higher mastery?

### `student_mastery` — The adaptive model

One row per student per concept. Updated after every interaction.

```
user_id      UUID    → which student
concept_tag  TEXT    → 'read_variable', 'evaluate_expression', etc.
p_know       FLOAT   → probability student knows this (0.0 to 1.0)
p_learn      FLOAT   → learning rate (fixed at 0.09)
p_guess      FLOAT   → probability of lucky guess (fixed at 0.2)
p_slip       FLOAT   → probability of careless mistake (fixed at 0.1)
obs_correct  INT     → total correct answers observed
obs_total    INT     → total answers observed
```

---

## 8. The Backend — Every Route Explained

### Auth Routes (`/api/auth/`)

| Route | What it does |
|---|---|
| `POST /api/auth/register` | Creates a new student account. Hashes the password with bcrypt (10 rounds). Returns a JWT access token (15 min) and a refresh token (7 days). |
| `POST /api/auth/login` | Looks up the user by email, compares password with bcrypt, returns tokens. |
| `POST /api/auth/refresh` | The access token expires every 15 minutes. This endpoint silently gets a new one using the refresh token — students don't get logged out mid-problem. |
| `POST /api/auth/logout` | Deletes the refresh token from Redis — the user can't get new access tokens, so they're effectively logged out even before the access token expires. |

### Problem Routes (`/api/problems/`)

| Route | Who can call it | What it does |
|---|---|---|
| `GET /api/problems` | Anyone logged in | Returns list of published problems with difficulty and step count |
| `GET /api/problems/:id` | Anyone logged in | Returns full problem including all steps and choices |
| `POST /api/problems` | Teacher only | Author a new problem — title, code, steps, choices |
| `PATCH /api/problems/:id/publish` | Teacher only | Toggle published/unpublished |

### Session Routes (`/api/sessions/`)

| Route | Who | What |
|---|---|---|
| `POST /api/sessions` | Student | Starts a new attempt. Creates a session row and stores it in Redis. |
| `PATCH /api/sessions/:id/complete` | Student | Marks the session as done. Stores error counts. Broadcasts to teacher dashboard. |

### Events Route (`POST /api/events`)

This is the most-called endpoint. Every time a student clicks something, the frontend doesn't immediately send an HTTP request (that would be 1 request per click, too expensive). Instead, it **queues events** and flushes them either:
- When the student gets a correct answer, OR
- When the queue reaches 5 events

One batch HTTP call handles multiple events. The backend validates each event (checks the phase and event_type are valid), inserts them all in one SQL query, then:
1. Updates the Redis session cache (so the teacher sees the new step count instantly)
2. Broadcasts to connected teacher WebSocket clients
3. Asynchronously updates Bayesian mastery scores (non-blocking so it doesn't slow the response)

### Hint and Explain Routes

| Route | Trigger | What happens |
|---|---|---|
| `POST /api/hints` | Student gets a step wrong 3 times | Calls Claude AI with the student's wrong answers as context. Rate-limited to 5 AI hints per session per Redis counter. Has a 5-second timeout — falls back to static hint if Claude is slow. |
| `POST /api/explain` | Student clicks "What does this code do?" | Calls Claude AI to explain the code snippet in plain English (2-3 sentences). |

### Dashboard Routes (`/api/dashboard/` — Teacher only)

| Route | Returns |
|---|---|
| `GET /api/dashboard/class` | Live session state from Redis — current step, error counts, stuck status |
| `GET /api/dashboard/heatmap` | Per-concept average mastery across all students — shows which concepts the class is struggling with |
| `GET /api/dashboard/students` | Full student roster |
| `GET /api/dashboard/student/:id` | One student's complete mastery profile |

### Export Routes (`/api/export/` — Admin only)

| Route | Returns |
|---|---|
| `GET /api/export/events.csv` | Every step_event row, with user IDs replaced by HMAC-SHA256 hashes — anonymized for research |
| `GET /api/export/mastery-snapshot.json` | Aggregate mastery stats across all students |

---

## 9. The AI Component — How Claude Is Used

### There are TWO AI features

#### Feature 1: "What does this code do?" button

This is proactive — the student can ask at any time before starting.

**Trigger:** Student clicks the green "🤖 What does this code do?" button
**Call:** `POST /api/explain` → `claude.js: explainCode()`
**Model:** `claude-haiku-4-5-20251001` (the fastest, cheapest Claude model)
**System prompt says:**
- Explain in 2-3 short, simple sentences
- Use plain language — no jargon
- Mention the actual variable names
- End by saying what the output will be

**Example output:**
> "This code stores your name 'Alex' and a score of 95 in two variables. Then it builds a greeting message by putting those values directly into the text using an f-string. It prints: Hi Alex, your score is 95."

#### Feature 2: Personalized hint after 3 wrong answers

**Trigger:** Student answers the same multiple-choice question incorrectly 3 times
**Progression:**
- 1st wrong → "Not quite! Look at the code again and try a different answer."
- 2nd wrong → Static hint (the pre-written `explain` text from the problem definition)
- 3rd wrong → `POST /api/hints` → `claude.js: generateLLMHint()`

**What the AI receives:**
```
The student is tracing through this Python code:
  name = "Alex"
  score = 95
  print(f"Hi {name}, your score is {score}")

Current question: What is the value of name?
The student answered incorrectly with: 95, {name}
Give a gentle, concrete hint. Do not reveal the answer.
```

**Example AI output:**
> "Look at the first line of code — the equals sign assigns the value on the right to the variable on the left. What text is on the right side of `name =`?"

### How hallucination is handled

The system is designed so Claude's output never *controls* anything — it only *explains*.

1. **Claude cannot change the correct answer.** The right answer is hard-coded in the database (`"correct": 1`). Claude only writes a hint text string.

2. **5-second timeout.** If Claude doesn't respond in 5 seconds, the code falls back to the pre-written static hint. The student always gets a hint — they never see an error.

3. **Max tokens: 100-150.** Short prompts mean less room for the model to go off-topic.

4. **Structured prompts.** The system prompt explicitly says "Do NOT reveal the answer directly." The student still has to figure it out.

5. **Static fallback on any error.** Network failure, rate limit, API key missing — any of these trigger the static hint. The app degrades gracefully.

6. **Human-written explanations are the baseline.** Every step already has a teacher-written explanation. The AI layer adds personalization on top — it is never the only source of truth.

### Prompt engineering decisions

**Why Claude Haiku and not GPT-4?**
- Haiku is the fastest, cheapest Claude model — perfect for hint generation where latency matters
- Students shouldn't wait more than a second or two for a hint
- At 100 max tokens, the output is always short and focused

**Why call AI only on the 3rd wrong answer, not the 1st?**
- Latency: the first hint is instant (static text); AI adds ~1-2 seconds
- Cost: fewer calls
- Pedagogy: immediate AI help can short-circuit learning — the student should try on their own first

---

## 10. The Adaptive Engine — Bayesian Knowledge Tracing

### What is BKT?

Bayesian Knowledge Tracing (Corbett & Anderson, 1994) is an algorithm that estimates "does this student actually know this concept?" after each answer. It's smarter than just counting correct answers because it accounts for lucky guesses and careless mistakes.

### The four parameters

| Parameter | Value | Meaning |
|---|---|---|
| `p_know` | Starts at 0.3, updates | 30% chance they already know this — updates with every answer |
| `p_learn` | Fixed at 0.09 | 9% chance of learning from each interaction |
| `p_guess` | Fixed at 0.2 | 20% chance of getting it right by accident |
| `p_slip` | Fixed at 0.1 | 10% chance of getting it wrong even if they know it |

### How it updates

After each answer, `p_know` is recalculated using Bayes' rule:

**If correct:**
```
P(know | correct) = P(know) × (1 - p_slip)
                   ──────────────────────────────────────────────
                   P(know) × (1 - p_slip) + (1 - P(know)) × p_guess
```

**Then:**
```
P(know_next) = P(know | obs) + (1 - P(know | obs)) × p_learn
```

### Why this matters for accessibility research

A dyslexic student might know the concept but get the answer wrong due to reading the question incorrectly — a "slip." A raw score would mark this as "didn't know it." BKT's `p_slip` parameter means a single wrong answer doesn't tank their mastery score. This is more accurate and more fair.

### Mastery labels

```
p_know >= 0.95  →  "mastered"     (green bar)
p_know >= 0.75  →  "proficient"   (blue bar)
p_know >= 0.50  →  "developing"   (yellow bar)
p_know < 0.50   →  "novice"       (red bar)
```

---

## 11. Real-Time Teacher Dashboard — WebSockets

### Why WebSocket instead of just refreshing the page?

A regular page refresh sends a full HTTP request and re-loads everything. For a teacher watching 20 students in real time, you'd need to refresh every second to see progress — that's 20 requests per second.

WebSocket keeps one persistent connection open. The server pushes updates the instant they happen. No polling, no wasted bandwidth.

### How it works

1. When the teacher opens the dashboard, the browser connects to `ws://localhost:3000/ws` with their JWT token
2. The server authenticates the token, sees "role: teacher", adds them to the `teacherClients` map
3. The server immediately sends a snapshot of all active sessions
4. Every time a student submits an event batch, the `events.js` route calls `onStudentEvent()` which calls `broadcastToTeachers()`
5. The teacher's browser receives a `session_update` message and refreshes that student's row — no page reload

### Stuck student detection

Every 30 seconds, the server checks: has this session had any activity in the last 90 seconds? If not, it broadcasts a `student_stuck` alert to teachers. The teacher can then intervene.

### Connection health

Every 30 seconds, the server sends a "ping" to every client. If it doesn't get a "pong" back, it assumes the connection died and cleans it up. This prevents ghost connections from accumulating.

---

## 12. Security — Auth, JWT, and Redis

### Passwords

Never stored in plain text. When you register, your password is run through bcrypt with 10 "rounds" of hashing. bcrypt is intentionally slow — this makes brute-force attacks expensive. The stored hash looks like: `$2b$10$92IXUNpk...` and cannot be reversed to get the original password.

### JWT Access Tokens (15 minutes)

After login, you receive a JWT token. It's a base64-encoded string that encodes your user ID, username, and role, and is cryptographically signed with a secret key. Every API request sends this token in the header. The server verifies the signature without touching the database — fast and stateless.

Access tokens expire in 15 minutes. This limits the damage if a token is stolen.

### Refresh Tokens (7 days) + Redis

A long-lived refresh token lets you silently get a new access token without logging in again. Unlike access tokens, refresh tokens are stored in Redis. This means:

- Logout actually works: deleting the Redis key invalidates the token immediately
- Pure JWT cannot be revoked before expiry — this is a known weakness

### Role-Based Access Control (RBAC)

Every teacher-only route runs `requireRole('teacher')` middleware. Students can't access `/api/dashboard/*` or create problems.

### Rate Limiting

- Login/Register: 20 attempts per 15 minutes per IP (prevents brute force)
- AI hints: 10 requests per minute per IP
- Max 5 AI hints per session (per Redis counter)

### Research Anonymization

The CSV export for researchers never includes real user IDs. Each user ID is replaced with `HMAC-SHA256(userId, SERVER_SECRET).slice(0,16)`. The server can consistently hash the same user to the same anonymous ID, but nobody can reverse it without the secret.

---

## 13. Docker — What It Does Here

### What is Docker?

Docker packages an application and all its dependencies into a "container" — a sealed, portable environment. It's like a virtual machine but much lighter. The container runs the same way on your laptop, your teammate's machine, and a cloud server.

### What is Docker Compose?

Docker Compose lets you define multiple containers and how they connect, in one file. Instead of manually starting PostgreSQL, then Redis, then the Node server in the right order — you run one command:

```bash
docker compose up --build
```

### What happens when you run that command

1. Docker builds the Node.js backend image using `backend/Dockerfile` (installs npm packages, copies code)
2. Docker pulls pre-built images for PostgreSQL 16 and Redis 7
3. All three start in the right order (thanks to `depends_on` + health checks)
4. PostgreSQL runs the schema and seed SQL files on first startup
5. The frontend folder is mounted into the backend container as a read-only volume
6. Everything is accessible on `localhost:3000`

### Health checks

The backend won't start until PostgreSQL says it's ready (`pg_isready`) and Redis responds to a ping. This prevents startup race conditions.

### Port mapping

```
Your laptop port → Container port
3000            → Node.js (app + API)
5432            → PostgreSQL (database)
6379            → Redis (cache)
```

### Environment variables

Secrets (database password, JWT keys, API keys) are never hardcoded in the source code. They're stored in a `.env` file and injected into the containers at runtime. The `.env` file is in `.gitignore` — it never gets pushed to GitHub. The `.env.example` file shows which variables are needed without revealing actual values.

---

## 14. Interview Q&A — AI-Focused Questions

### "How do you use AI in this project?"

> "I use Claude AI for two things. First, there's a button on the problem screen — 'What does this code do?' — that calls the Claude API and returns a plain-English, 2-3 sentence explanation written for a student who finds reading hard. Second, when a student gets a question wrong three times in a row, the app sends their wrong answers to Claude and gets back a personalized hint — not the answer, just guidance to think about it differently. Both calls use the Haiku model, which is fast and cheap. Both have a 5-second timeout and fall back to pre-written static text if the API is slow or unavailable."

### "Have you prompted an LLM? Can you explain your prompts?"

> "Yes. For the hint feature, the system prompt sets context: 'You are a patient tutor for a student with dyslexia learning to read Python code.' Then I tell it the concept being tested, the rules — keep it to 1-2 sentences, do not reveal the answer, use plain language. The user message includes the actual code snippet, the question, and what the student got wrong. This context lets Claude give advice specific to that student's mistake rather than generic advice. For the code explanation feature, the system prompt instructs it to structure the response in three beats: what the code sets up, what it does, and what it outputs."

### "How do you deal with hallucination?"

> "The design explicitly limits what AI can affect. Claude only writes hint text — it has no ability to change what the correct answer is, because correct answers are stored in the database and never touched by the AI. If Claude hallucinates and gives a misleading hint, the student still needs to select the right answer from the fixed multiple-choice options to advance. Beyond that: I use a 5-second timeout so slow or failed calls fall back to human-written hints. I cap tokens at 100-150 words so the model can't go off-topic. And I test edge cases — what happens if the API key is missing, what if it returns garbage. The fallback chain means students always get a hint, and the hint is always contextually relevant."

### "Which AI tools have you used for this project?"

> "For the application itself, I'm using the Anthropic Claude API — specifically the claude-haiku-4-5 model via the @anthropic-ai/sdk Node.js package. For development, I used Claude Code — the AI coding assistant — to help me design the architecture, debug issues like Docker volume path mismatches, and think through security edge cases. Claude Code is different from the in-app AI: it's the tool I used to build the project, whereas the in-app Claude API is a feature for the end users."

### "How have you used AI in the past 30 days?"

> "Daily for coding tasks — writing boilerplate, explaining error messages, debugging SQL queries. I use Claude for architecture questions — asking 'what are the tradeoffs between X and Y' to think through decisions faster. I also use it for writing: structuring documentation, cleaning up technical writing. In this project specifically, I used it to implement the Bayesian Knowledge Tracing algorithm and to reason through the WebSocket architecture. But every design decision was mine — I'd describe the problem, review what the AI suggested, and decide whether it made sense."

### "Pros and cons of AI in software development?"

**Pros:**
> "Speed — especially for boilerplate code I've written before. It's great for 'I know roughly what I want, help me write it fast.' Good for learning — you can ask it to explain code you don't understand. Good for catching bugs you've been staring at too long."

**Cons:**
> "Hallucination is real — it will confidently write incorrect code, especially for APIs it doesn't know well. I've caught it using deprecated methods, made-up function signatures, and logic errors that look plausible. You have to treat its output like a smart intern's first draft — always review it, never ship it blind. It can also make junior engineers skip the learning step — if you always ask AI instead of figuring things out, you don't build the mental model."

### "What AI extensions or plugins have you used?"

> "Claude Code as the primary coding assistant. GitHub Copilot for inline autocomplete. I also use Claude in the browser for research and writing. In VS Code, I use the Claude Code extension which gives me a conversation interface alongside my files — I can share code directly and ask specific questions about the codebase I'm looking at."

### "What is responsible AI use?"

> "In this project, it's the principle of keeping humans in the loop. The AI generates hints, but humans defined what the correct answers are. The AI explains code, but the actual assessment is multiple choice with fixed options. If the AI gives bad advice, the student can ignore it and try the right answer. For the research export, I use anonymization so the AI component never sees real user identities — privacy-first by design."

---

## 15. Interview Q&A — System Design Questions

### "Walk me through what happens when a student answers a question."

> "The student clicks an answer button in the browser. JavaScript immediately adds an event object to a local queue — no network call yet. The event has the step index, the phase color, the concept tag, what they clicked, and whether it was correct. The queue flushes when they get a correct answer, or when it hits 5 events. On flush, one HTTP POST goes to `/api/events` with the whole batch. The server validates each event, inserts them all in one SQL statement, updates the Redis session cache so the teacher's dashboard sees the new step count, broadcasts that to connected WebSocket clients, and asynchronously runs the Bayesian mastery update. The student sees their feedback immediately — the network call is fire-and-mostly-forget."

### "Why did you use event sourcing?"

> "A simple 'sessions' table with a score column would tell you the student got 6/7 right. But it wouldn't tell you which step they got wrong, how long they spent on it, what wrong answer they tried, whether they needed a hint, or whether AI hints actually help. The research angle of this project required fine-grained data. Event sourcing gives you the full replay — you can reconstruct exactly what happened in any session."

### "Why Redis alongside PostgreSQL?"

> "Two different use cases. PostgreSQL is for durable, queryable, relational data — it's the system of record. Redis is for fast, temporary data. The teacher dashboard needs to show live session state — if I queried PostgreSQL for every teacher refresh, I'd be running expensive queries on the sessions and step_events tables every few seconds. Redis stores the live state in RAM. It's O(1) to look up, and I set an 8-hour TTL so completed sessions clean themselves up automatically."

### "How does the JWT refresh flow work?"

> "Access tokens live 15 minutes. When they expire, any API call returns 401. The API client in the browser intercepts that 401, grabs the 7-day refresh token from localStorage, calls `/api/auth/refresh`, gets a new access token, and retries the original request — transparently. The student never sees a login prompt mid-problem. I use a deduplication pattern: if two concurrent requests both hit 401 at the same time, they share one refresh call instead of both trying to refresh simultaneously."

### "How does the teacher know a student is stuck?"

> "Every time a student submits events, the backend records `lastEventAt: Date.now()` in the Redis session cache. The WebSocket server runs a check every 30 seconds. If a session's `lastEventAt` is more than 90 seconds ago and it hasn't been marked complete, it broadcasts a `student_stuck` alert to all teacher WebSocket connections. The teacher sees a warning on the dashboard and can decide to intervene."

---

## 16. Demo Walkthrough Script (Voiceover)

*Use this as a guide when screen-sharing during the interview.*

---

**[0:00 — Opening]**
> "Let me show you TraceWise — a tool I built to help dyslexic CS students learn to read code. I'll walk you through it as a student first, then show you the backend infrastructure."

---

**[0:20 — Dyslexia Mode toggle]**
> "The first thing you'll notice is the app opens in Dyslexia Mode by default — warm cream background, large Lexend font, generous word spacing. Watch what happens when I toggle it off..."

*Click the dyslexia toggle in the nav bar*

> "The font switches to Inter, the background goes white, the text shrinks. It's a complete visual transformation driven by a single CSS class on the body element. All fonts, sizes, colors, and spacing are CSS variables that get overridden instantly. There's also an amber banner at the top confirming the mode for users who need that reassurance."

---

**[0:45 — Log in as student]**
> "The login modal shows our TraceWise branding. I'll use the demo student account."

*Opens modal, enters student@tracewise.edu / password*

> "After login, the server returns two JWT tokens: a 15-minute access token and a 7-day refresh token stored in Redis. When the access token expires mid-problem, it silently refreshes — the student never gets logged out."

---

**[1:05 — Show the 3-tab navigation]**

> "The app has three tabs. Let me quickly show My Progress..."

*Click My Progress tab*

> "This is the profile section — username, role, sessions completed, and full concept mastery bars with labels: Mastered, Proficient, Developing, or Novice. Calculated by Bayesian Knowledge Tracing on the backend and updated after every problem."

*Click Problems tab*

---

**[1:30 — Select a problem]**

> "Problems come from the database — each shows a star difficulty rating. The easiest is auto-selected. The code appears in a clean dark block."

---

**[1:45 — Show the AI Explain button]**
*Click "🤖 What does this code do?"*

> "This calls POST /api/explain on the backend. The server forwards the code to Claude Haiku with a prompt: explain in plain English, 2-3 sentences, no jargon. Here's the live AI response: [read it]. Not a template — actual model output. If Claude is slow or unavailable, there's a 5-second timeout and a static fallback."

---

**[2:10 — Play through steps, show AI hint]**

*Click wrong color first*

> "Wrong color — the correct one is immediately highlighted and read aloud by the built-in text-to-speech engine."

*Pick correct color, answer wrong twice*

> "First wrong answer — just encouragement, no spoilers. Second wrong answer — the app fetches a personalized AI hint from Claude, with the student's specific wrong answers sent as context."

*Second wrong answer — AI hint appears with purple border*

> "Purple border means AI-generated. Claude responded with guidance specific to what this student got wrong. If it times out, the pre-written explanation appears instead. The student always gets a hint either way."

---

**[3:00 — Complete and show summary]**

> "After all steps, an animated summary slides up — a score out of 100, error counts, a step-by-step breakdown table, updated mastery bars, and a Try Again button."

---

**[3:30 — Switch to teacher dashboard]**
*Open new tab at /dashboard, log in as teacher@tracewise.edu*

> "The teacher dashboard is role-guarded. The Live Class tab uses WebSocket — the instant any student submits events, their row updates in real time. The Heatmap tab shows class-wide mastery per concept — if 'follow branch' is red across the board, the teacher knows to revisit that topic."

---

**[4:20 — Quick architecture mention]**
> "Under the hood: Node.js Express, PostgreSQL with a step_events table recording every single click, Redis for live session state and JWT tokens, Docker Compose to run all three with one command, and Claude Haiku for AI hints and explanations — 5-second timeout, static fallback on every call."

---

**[5:00 — Close]**
> "The goal was to build something accessible and simple on the outside, with a full production stack underneath — authentication, real-time data, AI, an adaptive math model, and a research export layer. Any questions?"

---

## 17. Key Numbers to Remember

| Metric | Value | Why it matters |
|---|---|---|
| JWT access token TTL | 15 minutes | Short enough to limit theft damage |
| Refresh token TTL | 7 days | Long enough not to annoy students |
| Max hints per session | 5 LLM calls | Cost control for AI API |
| Claude timeout | 5 seconds | Students never wait more than 5s for a hint |
| Redis session TTL | 8 hours | Auto-cleanup, no cron needed |
| Stuck student threshold | 90 seconds idle | Alerts teacher before student gives up |
| WebSocket heartbeat | Every 30 seconds | Detects dropped connections |
| Event batch max | 50 events | Prevents abuse of batch endpoint |
| BKT mastery threshold | 0.95 (95%) | Standard from Corbett & Anderson 1994 |
| BKT p_learn | 0.09 | 9% learning rate per interaction |
| Password hash rounds | bcrypt 10 | Industry standard — ~100ms per hash |
| Problems in demo | 3 (P1, P2, P3) | Difficulty 2, 1, 3 respectively |
| Auth rate limit | 20 attempts / 15 min | Prevents brute-force login |

---

*This document was written for interview preparation. The project is running at `http://localhost:3000` when Docker is up.*

*Demo credentials: student@tracewise.edu / teacher@tracewise.edu / admin@tracewise.edu — all password: `password`*
