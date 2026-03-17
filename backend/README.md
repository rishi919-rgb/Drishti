# Drishti Backend API

Backend server for the Drishti AI Visual Assistant application. Provides user authentication, image analysis, and data persistence.

## Features

- 🤖 **Gemini AI Integration** - Image analysis with scene description, text extraction, and currency recognition
- 🔐 **User Authentication** - JWT-based user registration and login
- 📊 **Analysis Storage** - Persistent storage of user analysis history
- 🔗 **Public Sharing** - Generate shareable links for analyses
- 📱 **CORS Support** - Configured for frontend integration

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Google Gemini API** for AI analysis
- **bcryptjs** for password hashing

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Drishti Analysis
- `POST /api/drishti/analyze` - Analyze image (no auth required)
- `POST /api/drishti/save` - Save analysis to history (auth required)
- `GET /api/drishti/history` - Get user's analysis history (auth required)
- `GET /api/drishti/report/:publicId` - Get public analysis (no auth)
- `GET /api/drishti/analysis/:id` - Get full analysis (auth required)
- `DELETE /api/drishti/analysis/:id` - Delete analysis (auth required)

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd drishti-backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGO_URI=mongodb://localhost:27017/drishti
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=your_jwt_secret_key_here
   PORT=5001
   ```

3. **Start the server:**
   ```bash
   # Production
   npm start
   
   # Development with auto-reload
   npm run dev
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `PORT` | Server port (default: 5001) | No |

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### DrishtiAnalysis Model
```javascript
{
  user: ObjectId (ref: 'User', optional),
  imageBase64: String,
  description: String,
  detectedText: String,
  currency: String,
  prompt: String,
  publicId: String (unique),
  analysisTime: Number,
  ipAddress: String,
  userAgent: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Deployment

### Render
1. Connect your GitHub repository to Render
2. Set environment variables in the Render dashboard
3. Deploy automatically on push

### Docker
```bash
# Build
docker build -t drishti-backend .

# Run
docker run -p 5001:5001 --env-file .env drishti-backend
```

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- CORS configured for allowed origins
- Input validation and sanitization
- Rate limiting (recommended for production)

## Testing

```bash
# Test server is running
curl http://localhost:5001

# Test analysis endpoint
curl -X POST http://localhost:5001/api/drishti/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"base64_image_data"}'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
