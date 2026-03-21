# Drishti - AI Visual Assistant

Drishti is an AI-powered visual assistant designed for visually impaired users. It uses the device camera to capture images, analyzes them using Google's Gemini 1.5 Flash API, and provides spoken feedback via the Web Speech API.

---

## 🏗️ Project Structure

```
drishti/
├── frontend/            # React + TypeScript frontend
├── backend/             # Node.js + Express backend
└── README.md            # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Google Gemini API key

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Update .env with your API keys and MongoDB URI
npm start
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Update .env with your Gemini API key
npm run dev
```

---

### 3. Access the Application

- **Frontend:** http://localhost:5174  
- **Backend API:** http://localhost:5001  

---

## ✨ Features

- 🎥 **Live Camera Preview** – Real-time camera feed with automatic startup  
- 🤖 **AI Analysis** – Scene description, text extraction, and currency recognition  
- 🔊 **Text-to-Speech** – Automatic voice output of results  
- 🔐 **User Authentication** – Secure login and account management  
- 💾 **Analysis History** – Save and review previous analyses  
- 🔗 **Public Sharing** – Share results via public links  
- ♿ **Accessibility First** – High contrast UI, large buttons, voice-first design  
- 📱 **Responsive Design** – Works on both desktop and mobile devices  

---

## 🛠️ Tech Stack

### Frontend

- React 18 (TypeScript)
- Vite
- Tailwind CSS
- React Router
- Web Speech API (Text-to-Speech)
- WebRTC (Camera access)

---

### Backend

- Node.js with Express.js
- MongoDB with Mongoose
- JWT (Authentication)
- Google Gemini API (AI processing)
- bcryptjs (Password hashing)

---

## 🧠 Architecture Overview

```
Frontend (React + TypeScript)
 ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
 │   Camera    │───▶│ YOLO (TFJS)     │───▶│ Web Speech API  │
 │   Frame     │    │ Local Detection │    │ Voice Output    │
 └─────────────┘    └─────────────────┘    └─────────────────┘
        │                    │
        │                    ▼ (every 2–3 sec)
        │           ┌─────────────────┐
        └──────────▶│ Send to Backend │
                    └────────┬────────┘
                             │
                             ▼
Backend (Node.js + MongoDB)
 ┌─────────────────┐    ┌─────────────────┐
 │ Auth / History  │    │ AI Proxy Layer  │
 │ Save / Share    │    │ (in-memory)     │
 └─────────────────┘    └────────┬────────┘
                                 │
                                 ▼
Multi-Provider AI
 Gemini 1.5 Flash | Groq | DeepSeek
```

---

## 📖 Documentation

- [Backend Documentation](./backend/README.md)  
- [Frontend Documentation](./frontend/README.md)  

---

## 🌐 Deployment

### Frontend (Netlify)

1. Connect the `frontend` folder to Netlify  
2. Set environment variables:
   - `VITE_GEMINI_API_KEY`
   - `VITE_API_BASE_URL` (your backend URL)  
3. Deploy automatically on push  

---

### Backend (Render)

1. Connect the `backend` folder to Render  
2. Set environment variables:
   - `MONGO_URI`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`  
3. Deploy automatically on push  

---

## 🔧 Environment Variables

### Frontend (.env)

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_BASE_URL=http://localhost:5001
```

---

### Backend (.env)

```env
MONGO_URI=mongodb://localhost:27017/drishti
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_key_here
PORT=5001
```

---

## 📱 Usage

1. Grant camera permissions when prompted  
2. Create an account or continue anonymously  
3. Point your camera at the object or scene  
4. Tap **"Capture & Analyze"**  
5. Listen to the generated description  
6. Save results (if logged in)  
7. Share results via public links  

---

## 🤝 Contributing

1. Fork the repository  
2. Create a new feature branch  
3. Make your changes  
4. Test thoroughly  
5. Submit a pull request  

---

## 📄 License

MIT License – see the LICENSE file for details  

---

## 🆘 Support

For issues or feature requests, please open an issue on GitHub.

---

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities  
- Web Speech API for voice output  
- React & TypeScript communities  
- Accessibility advocates and testers  
