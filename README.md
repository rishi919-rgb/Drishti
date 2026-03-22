# Drishti - AI-Powered Visual Assistant for the Visually Impaired 👁️✨

Drishti is a cutting-edge, cross-platform visual assistant designed to empower visually impaired individuals through real-time scene analysis, spatial path detection, facial recognition, and intuitive voice feedback. 

Built for hackathons, Drishti integrates multiple AI providers via a custom proxy, utilizes YOLOv8 and MiDaS for spatial awareness, and provides a seamless offline-first experience for basic object recognition. The scanning engine is continuously evaluating the environment to grant users hands-free awareness.

---

## 🏗️ Project Structure

```
drishti/
├── frontend/               # React + Vite UI Experience (Port 5177)
├── backend/                # Node.js + Express API Gateway (Port 5002)
├── proxy/                  # AI LLM Load-Balancing Proxy (Port 3001)
├── path-detection-service/ # Python ML Inference Engine (Port 5003)
└── README.md               # This file
```

---

## 🚀 Quick Start Guide

To run the full Drishti stack locally, follow these steps in order.

### 1. Prerequisites
- **Node.js 18+** & **npm**
- **Python 3.9+** (Standard Windows Python recommended for ML)
- **MongoDB** (Local or Atlas)
- **Google Gemini API Key(s)** (for advanced analysis)

---

### 2. Service Setup Instructions

#### A. AI Proxy Service (Port 3001)
The proxy manages multi-provider load balancing, key rotation for Gemini (to bypass free-tier rate limits), and fallback logic.
```bash
cd proxy
npm install
cp .env.example .env
# Open .env and add your 5 GEMINI_API_KEYs
npm start
```

#### B. Python Path Detection Service (Port 5003)
Provides real-time distance and spatial guidance using YOLOv8 & MiDaS.
```bash
cd path-detection-service
# Install ML dependencies (~3-4GB of models will download on first run)
pip install -r requirements_full.txt
python app_full.py
```

#### C. Backend API (Port 5002)
Standardized API gateway connecting the UI to MongoDB and AI services.
```bash
cd backend
npm install
cp .env.example .env
# Set MONGO_URI to your Atlas Connection String
# Set JWT_SECRET to any secure string
npm start
```

#### D. Frontend UI (Port 5177)
The React-based accessibility-first interface utilizing Tailwind UI glassmorphism.
```bash
cd frontend
npm install
cp .env.example .env
# Edit package.json if you need to strictly bind Vite to port 5177
npm run dev
```

---

## ✨ Key Features

- 🔄 **Continuous Scanning Engine**: 
  - A hands-free recursive loop analyzes the environment (every 1.5 seconds) intelligently avoiding API overlaps.
- 🎥 **Tri-Mode Visual Intelligence**: 
  - **Vision Mode**: Describe the surrounding environment via Gemini AI combined with local TFJS/COCO-SSD tracking.
  - **Path Mode**: Cloud-assisted YOLOv8 + MiDaS for precise spatial distance (e.g., "Chair 1.5m ahead").
  - **Face Mode**: Client-side biometric enrollment and recognition utilizing `@vladmandic/face-api`.
- 🔊 **Voice-First Design**: Web Speech API integration reads out analyses clearly and automatically.
- 🤖 **AI Resilience**: Automatic fallback to Mock-AI if API keys are missing or rate limits are hit.
- 💾 **Personal History**: Securely save scene analyses to your MongoDB profile for later reference.
- ♿ **High Accessibility**: Premium dark mode UI designed with high-contrast tokens, scalable typography, and massive touch targets.

---

## 🔧 Environment Configuration Summary

Detailed `.env.example` templates exist in each service directory.

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: http://localhost:5002

### Backend (`backend/.env`)
- `PORT`: 5002
- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET`: Any secure string
- `PROXY_URL`: http://localhost:3001
- `PATH_SERVICE_URL`: http://localhost:5003

### Proxy (`proxy/.env`)
- `PORT`: 3001
- `GEMINI_API_KEY_1` to `GEMINI_API_KEY_5`: Multiple Google Gemini API Keys for load balancing
- `USE_MOCK_AI`: Set to true to test the UI without exhausting API credits.

---

## 🛠️ Troubleshooting

- **Proxy/Backend Integration**: Ensure the Backend `.env` `PROXY_URL` exactly matches the local Proxy port (e.g., `3001`).
- **Port Conflicts**: Ensure ports 5177, 5002, 3001, and 5003 are available.
- **Python ML Errors**: If `torch` or `cv2` is missing, ensure you are running in a standard Command Prompt (not MSYS2) and using the full Python path.
- **Model Downloads**: First-time startup of `app_full.py` requires high-speed internet to download ~3.5GB of weights.
- **Biometrics (Face API)**: Face descriptors are securely stored client-side in the browser via IndexedDB (`localforage`).

---

## 📄 License
MIT License - 2026 Drishti Team - Hackathon Edition.
