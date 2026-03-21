# Drishti - AI Visual Assistant

Drishti is an AI-powered visual assistant for visually impaired users. It uses the device camera to capture images, analyzes them using Google's Gemini 1.5 Flash API, and speaks the results using the Web Speech API.

## 🏗️ Project Structure

```
drishti/
├── frontend/            # React + TypeScript frontend
├── backend/             # Node.js + Express backend
├── proxy/               # Node.js + Express proxy service
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Proxy Setup

```bash
cd proxy
npm install
cp .env.example .env
# Edit .env with your AI API keys
npm start
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys and MongoDB URI
npm start
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Gemini API key
npm run dev
```

### 4. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5001
- **Proxy Server:** http://localhost:3001

## ✨ Features

- 🎥 **Live Camera Preview** - Real-time camera feed with automatic startup
- 🤖 **AI Analysis** - Scene description, text extraction, and currency recognition
- 🔊 **Text-to-Speech** - Automatic voice output of analysis results
- 🔐 **User Authentication** - Secure login and account management
- 💾 **Analysis History** - Save and review past analyses
- 🔗 **Public Sharing** - Share analyses via public links
- ♿ **Accessibility First** - High contrast, large buttons, voice-first design
- 📱 **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** as build tool
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Web Speech API** for text-to-speech
- **WebRTC** for camera access

### Backend & Proxy
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Google Gemini API** for AI analysis
- **bcryptjs** for password hashing

## 🌐 Deployment

### Frontend (Netlify)

1. Connect `frontend` folder to Netlify in the dashboard.
2. Set build command to `npm run build` and publish directory to `dist`.
3. Set environment variables:
   - `VITE_API_BASE_URL` (your deployed backend URL)
4. Deploy automatically on push.

### Backend (Render)

1. Create a new Web Service on Render and connect the repository.
2. Set the Root Directory to `backend`.
3. Set Build Command to `npm install` and Start Command to `npm start`.
4. Set environment variables:
   - `MONGO_URI` (your MongoDB Atlas connection string)
   - `JWT_SECRET`
   - `PROXY_URL` (your deployed proxy URL)
5. Deploy.

### Proxy (Render)

1. Create another Web Service on Render connected to the same repository.
2. Set Root Directory to `proxy`.
3. Set Build Command to `npm install` and Start Command to `npm start`.
4. Set environment variables:
   - `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, etc.
   - `PORT=3001`
5. Deploy.

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5001
```

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/drishti
JWT_SECRET=your_jwt_secret_key_here
PORT=5001
PROXY_URL=http://localhost:3001
```

### Proxy (.env)
```env
GEMINI_API_KEY_1=your_gemini_api_key_1
PORT=3001
```

## 📱 Usage

1. **Grant camera permissions** when prompted
2. **Create an account** or use the app anonymously
3. **Point your camera** at what you want to analyze
4. **Tap "Capture & Analyze"** to take a photo and get AI analysis
5. **Listen** to the spoken description
6. **Save analyses** to your history (if logged in)
7. **Share analyses** via public links

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
