Drishti – Internal Team Development Plan

This document outlines the complete development roadmap, technical architecture, and team workflow for building Drishti – an AI‑powered visual assistant for visually impaired users. Use this as our single source of truth.

---

🎯 Project Goal

Build a progressive web app (PWA) that helps visually impaired users understand their surroundings via smartphone camera. Key outcomes:

· Real‑time scene description, text reading, currency recognition, face recognition, object finding.
· User accounts, analysis history, public sharing.
· Robust handling of AI rate limits via multi‑provider proxy.
· Fast, accessible, and deployable on free tiers.

---

✅ MVP Features (Must Have)

Feature Priority Description
Live camera preview P0 Access device camera, show preview
Capture & analyze P0 Take photo, send to backend, get AI description
Text‑to‑speech P0 Speak analysis results aloud
Currency recognition P1 Identify Indian rupee notes
Object finder P1 Search for specific objects (client‑side + AI)
User authentication P1 Signup/login with JWT
Save analysis to history P1 Store scans for logged‑in users
History page P1 View past analyses
Public shareable report P1 Generate public link for any analysis
Face recognition P2 Enroll and recognize known faces
Obstacle detection P2 Basic depth‑based warnings

---

🧱 Tech Stack

Frontend

· React 18 + TypeScript
· Vite – build tool
· Tailwind CSS – styling
· React Router – navigation
· WebRTC – camera access
· Web Speech API – text‑to‑speech
· TensorFlow.js + face‑api.js – client‑side ML (object detection, face recog)
· Axios – API calls
· Zustand/Context API – state management

Backend (Separate from TruthStorm)

· Node.js + Express
· MongoDB Atlas (free tier)
· Mongoose ODM
· JWT for authentication
· bcryptjs for password hashing
· Helmet, CORS for security

Multi‑Provider Proxy

· Node.js + Express
· Redis (Upstash free tier) – rate‑limit tracking
· Axios – forward requests
· Supports Gemini, Groq, DeepSeek (others optional)

AI Providers (Free Tiers)

· Google Gemini 1.5 Flash – 15 RPM, 1,000 RPD per key (use 2‑3 keys)
· Groq – 30 RPM, fast inference (text only for now)
· DeepSeek – free tier, good for reasoning
· Optionally Mistral, Claude (if credits)

DevOps

· GitHub – code hosting
· Netlify – frontend hosting
· Render – backend + proxy hosting
· GitHub Projects – task tracking

---

🏗 Architecture Overview

```
[Frontend (React PWA)]  ⇄  [Backend (Node.js)]  ⇄  [Proxy (Node.js)]  ⇄  [Gemini/Grok/DeepSeek]
         ↓                                ↓
[Client‑Side ML (TF.js)]           [MongoDB Atlas]
```

· Frontend handles camera, UI, client‑side ML (object finder, face recog), and TTS.
· Backend manages users, authentication, stores analyses, and communicates with proxy for AI tasks.
· Proxy maintains multiple API keys, tracks rate limits via Redis, and routes requests intelligently.
· AI Providers provide image analysis and text generation.

---

📅 Phased Development Plan

We will work in 2‑week sprints (adjust based on team velocity).

Phase 1: Foundation (Week 1)

Task Owner Est. Hours Details
Set up GitHub repo with folders: frontend, backend, proxy Team 1 Initial structure, README
Backend: Initialize Node.js + Express, connect MongoDB Atlas Backend dev 2 Copy auth from TruthStorm, set up .env
Backend: User model, JWT middleware, /auth/register, /auth/login Backend dev 4 Use bcrypt, return JWT
Backend: Analysis model Backend dev 2 Fields: userId, imageUrl, description, detectedText, currency, timestamp, publicId
Backend: /analyze (direct Gemini call for testing) Backend dev 3 Integrate Gemini API, return description
Frontend: Vite + React + TypeScript + Tailwind setup Frontend dev 2 Install deps, configure
Frontend: Camera access (WebRTC) with capture button Frontend dev 3 Use navigator.mediaDevices, show preview
Frontend: Web Speech API integration Frontend dev 2 Function to speak text
Frontend: Connect to backend /analyze Frontend dev 3 Send image, display response, speak
Milestone: Basic app working: capture → AI → speech   

Phase 2: Multi‑Provider Proxy (Week 2)

Task Owner Hours Details
Register multiple API keys (2 Gemini, 1 Groq, 1 DeepSeek) Team 1 Create accounts, save in secure place
Proxy service: initialize Node.js + Express Proxy dev 2 Separate folder, install axios, redis
Set up Upstash Redis (free) and integrate Proxy dev 2 Store RPM counters per provider
Define provider config (name, type, key, endpoint, RPM, tasks) Proxy dev 2 In config file
Implement provider selection logic (based on current RPM and task) Proxy dev 4 Use Redis counters, select least used
Modify backend /analyze to call proxy instead of direct Gemini Backend dev 2 Update URL, handle new response format
Test with multiple concurrent requests Team 3 Simulate load, verify rotation and fallback
Milestone: Proxy working, backend resilient to rate limits   

Phase 3: Core Features (Week 3‑4)

Task Owner Hours Details
Frontend: Login/Signup UI (forms, validation) Frontend dev 4 Store JWT in localStorage
Backend: /save endpoint (store analysis with user) Backend dev 3 Generate publicId
Frontend: "Save to History" button after analysis Frontend dev 2 Visible only if logged in
Frontend: History page (list user's analyses) Frontend dev 4 Fetch from /history, display cards
Backend: /history endpoint (paginated) Backend dev 2 Return user's analyses
Backend: /share/:publicId endpoint (public) Backend dev 2 No auth required
Frontend: Public report page (/report/:publicId) Frontend dev 3 Show analysis details, no edit
Frontend: Share button (copy public link) Frontend dev 2 Use Clipboard API
Enhance prompt for currency recognition AI/Backend 3 Test with real notes, tune prompt
Integrate face‑api.js for face enrollment/recognition Frontend dev 5 Client‑side, store descriptors in IndexedDB
Implement object finder with TensorFlow.js (COCO‑SSD) Frontend dev 5 Real‑time detection, voice feedback
Milestone: All core features functional   

Phase 4: Polish & Optimization (Week 5)

Task Owner Hours Details
Image compression before sending (reduce size) Frontend dev 3 Canvas resize, lower quality
Caching for identical images (backend + proxy) Backend/Proxy 4 Redis cache, skip AI for duplicates
Loading states, error handling, retry logic Frontend dev 4 Spinners, error messages
Accessibility audit (keyboard nav, screen reader, contrast) All 4 Use Lighthouse, axe, test with NVDA
Unit tests for critical backend routes Backend dev 5 Jest + supertest
Cross‑device testing (Android, iOS, desktop) All 4 Fix responsive issues
Prepare demo script and rehearse Team 3 3‑minute flow, backup plans
Milestone: Polished, tested app ready for deployment   

Phase 5: Deployment & Final Prep (Week 6)

Task Owner Hours Details
Deploy backend on Render Backend dev 2 Connect GitHub, set env vars
Deploy proxy on Render (separate service) Proxy dev 2 Same steps
Deploy frontend on Netlify Frontend dev 2 Build settings, env vars
Update frontend .env.production with live URLs Frontend dev 1 Test live
End‑to‑end testing on production Team 3 Verify all flows
Create presentation slides All 4 Problem, solution, demo, impact
Final rehearsal with slide sync Team 2 Record if possible
Milestone: Live app, presentation ready   

---

🔥 Handling Key Challenges

1. AI Rate Limits

· Strategy: Multi‑provider proxy with Redis tracking.
· Implementation: Proxy checks Redis for current minute usage per provider, selects provider with available capacity. If all are busy, it waits and retries or returns friendly error.
· Provider list: 2‑3 Gemini keys (15 RPM each), 1 Groq (30 RPM), 1 DeepSeek (20 RPM) – total ~80 RPM.
· Fallback: If proxy fails, backend can fallback to direct Gemini (only if critical).

2. Real‑Time Performance

· Client‑side ML: Use TensorFlow.js for object detection (instant feedback, no network latency).
· Caching: Store frequent descriptions (e.g., common objects) in IndexedDB.
· Image compression: Resize image to 640x480, reduce quality to 0.8 – cuts upload time.
· Edge deployment: Host backend and proxy in same region (Render Singapore/Mumbai).
· Streaming TTS: Use Web Speech API – starts speaking immediately as text arrives.

3. Offline Functionality

· Object detection: COCO‑SSD model cached in IndexedDB, works offline.
· Face recognition: Models and descriptors stored locally – works offline.
· Text‑to‑speech: Web Speech API works offline (browser dependent).
· Currency recognition: Falls back to client‑side template matching if offline (simplified).

4. Data Privacy

· No images stored permanently unless user saves.
· Face descriptors stored locally (IndexedDB), not sent to server.
· All API calls over HTTPS.
· JWT stored in localStorage (consider httpOnly cookies for production).

5. Team Coordination

· Git workflow: feature branches, PRs, require at least one reviewer.
· Daily stand‑up: 15 min at 10 AM (what I did, what I'll do, blockers).
· Task tracking: GitHub Projects with columns: To Do, In Progress, Done.
· Documentation: Keep this plan updated; use comments in code.

---

🧪 Testing Strategy

· Unit tests: Jest for backend (routes, models, utils). React Testing Library for frontend components.
· Integration tests: Test key user flows (login → analyze → save → history → share) using Cypress or Playwright.
· Manual testing: On real devices (Android, iOS) and browsers (Chrome, Safari, Firefox).
· Accessibility: Use axe DevTools, screen reader testing.

---

🚀 Deployment Pipeline

· Frontend: Auto‑deploy on Netlify from main branch.
· Backend & Proxy: Auto‑deploy on Render from main branch (each service points to its subdirectory).
· Environment variables: Stored securely in respective dashboards.

---

🔐 Environment Variables

Backend .env

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PROXY_URL=http://localhost:3001  # or production URL
```

Proxy .env

```
PORT=3001
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
GEMINI_KEY1=...
GEMINI_KEY2=...
GROQ_KEY=...
DEEPSEEK_KEY=...
```

Frontend .env

```
VITE_API_BASE_URL=http://localhost:5000
VITE_GEMINI_API_KEY=optional_fallback_key
```

---

📋 Team Responsibilities (Assign as needed)

Role Responsibilities
Frontend Lead UI components, camera, speech, client‑side ML, state management
Backend Lead User auth, MongoDB, API design, integration with proxy
Proxy/DevOps Multi‑provider proxy, Redis, deployment, monitoring
AI/ML Specialist Prompt engineering, model selection, testing accuracy
QA/Tester Testing across devices, accessibility, bug tracking

All team members contribute to planning, code reviews, and demos.

---

📅 Timeline Summary

Phase Duration Focus
Phase 1 Week 1 Foundation (camera → AI → speech)
Phase 2 Week 2 Multi‑provider proxy
Phase 3 Weeks 3‑4 Core features (auth, history, sharing, face/object)
Phase 4 Week 5 Polish, optimization, testing
Phase 5 Week 6 Deployment, presentation prep

Total: 6 weeks – we have enough time, but stay on track.

---

🆘 Communication & Support

· Use Discord/Slack for daily chat.
· GitHub Issues for bugs.
· This document is living – update as we learn.

Let's build something amazing! 🚀
