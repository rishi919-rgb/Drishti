# Drishti - AI Visual Assistant

Drishti is an AI-powered visual assistant for visually impaired users. It uses the device camera to capture images, analyzes them using Google's Gemini 1.5 Flash API, and speaks the results using the Web Speech API.

## 🏗️ Project Structure

```
drishti/
├── frontend/            # React + TypeScript frontend
├── backend/             # Node.js + Express backend
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys and MongoDB URI
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Gemini API key
npm run dev
```

### 3. Access the Application

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:5001

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

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Google Gemini API** for AI analysis
- **bcryptjs** for password hashing

## 📖 Documentation

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)

## 🌐 Deployment

### Frontend (Netlify)

1. Connect `frontend` folder to Netlify
2. Set environment variables:
   - `VITE_GEMINI_API_KEY`
   - `VITE_API_BASE_URL` (your backend URL)
3. Deploy automatically on push

### Backend (Render)

1. Connect `backend` folder to Render
2. Set environment variables:
   - `MONGO_URI`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
3. Deploy automatically on push

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_BASE_URL=http://localhost:5001
```

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/drishti
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_key_here
PORT=5001
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

## 🆘 Support

For issues and feature requests, please open an issue on GitHub.

## 🙏 Acknowledgments

- Google Gemini API for AI analysis
- Web Speech API for text-to-speech
- React and TypeScript communities
- Accessibility advocates and testers
