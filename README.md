# Drishti - AI-Powered Visual Assistant for the Visually Impaired 👁️✨

Drishti is a cutting-edge, cross-platform visual assistant designed to empower visually impaired individuals through real-time scene analysis, spatial path detection, and intuitive voice feedback. 

Built for hackathons, Drishti integrates multiple AI providers via a custom proxy, utilizes YOLOv8 and MiDaS for spatial awareness, and provides a seamless offline-first experience for basic object recognition.

---

## 🏗️ Project Structure

```
drishti/
├── frontend/             # React + Vite (Port 5177)
├── backend/              # Node.js + Express API (Port 5002)
├── proxy/                # AI Provider Routing Service (Port 3001)
├── path-detection-service/ # Python ML Inference Engine (Port 5003)
└── README.md             # This file
```

---

## 🚀 Quick Start Guide

To run the full Drishti stack, follow these steps in order.

### 1. Prerequisites
- **Node.js 18+** & **npm**
- **Python 3.9+** (Standard Windows Python recommended for ML)
- **MongoDB** (Local or Atlas)
- **Google Gemini API Key** (for advanced analysis)

---

### 2. Service Setup Instructions

#### A. AI Proxy Service (Port 3001)
The proxy manages multi-provider load balancing and fallback logic.
```bash
cd proxy
npm install
cp .env.example .env
# Add your GEMINI_API_KEY_1 to .env
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
# Set MONGO_URI and JWT_SECRET
npm start
```

#### D. Frontend UI (Port 5177)
The React-based accessibility-first interface.
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## ✨ Key Features

- 🎥 **Dual-Mode Visuals**: 
  - **Object Mode**: Local TFJS/COCO-SSD detection for zero-latency object labeling.
  - **Path Mode**: Cloud-assisted YOLOv8 + MiDaS for precise spatial distance (e.g., "Chair 1.5m ahead").
- 🔊 **Voice-First Design**: Web Speech API integration with a non-blocking message queue for smooth audio feedback.
- 🤖 **AI Resilience**: Automatic fallback to Mock-AI if API keys are missing or services are down.
- 💾 **Personal History**: Securely save scene analyses to your MongoDB profile for later reference.
- ♿ **High Accessibility**: Designed with high-contrast UI tokens and massive touch targets.

---

## 🔧 Environment Configuration

### Frontend (.env)
- `VITE_API_BASE_URL`: http://localhost:5002

### Backend (.env)
- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET`: Any secure string
- `PROXY_URL`: http://localhost:3001
- `PATH_SERVICE_URL`: http://localhost:5003

### Proxy (.env)
- `GEMINI_API_KEY_1`: Your Google Gemini API Key
- `PORT`: 3001

---

## 🛠️ Troubleshooting

- **Port Conflicts**: Ensure ports 5177, 5002, 3001, and 5003 are available.
- **Python ML Errors**: If `torch` or `cv2` is missing, ensure you are running in a standard Command Prompt (not MSYS2) and using the full Python path.
- **Model Downloads**: First-time startup of `app_full.py` requires high-speed internet to download ~3.5GB of weights.

---

## 📄 License
MIT License - 2026 Drishti Team - Hackathon Edition.
