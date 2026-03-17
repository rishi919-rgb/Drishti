# Drishti - AI Visual Assistant

Drishti is an AI-powered visual assistant for visually impaired users. It uses the device camera to capture images, analyzes them using Google's Gemini 1.5 Flash API, and speaks the results using the Web Speech API.

## Features

- 🎥 **Live Camera Preview** - Real-time camera feed with automatic startup
- 🤖 **AI Analysis** - Scene description, text extraction, and currency recognition
- 🔊 **Text-to-Speech** - Automatic voice output of analysis results
- 🌐 **Offline Detection** - Shows connectivity status
- ♿ **Accessibility First** - High contrast, large buttons, voice-first design
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** as build tool
- **Tailwind CSS** for styling
- **Google Gemini API** for AI analysis
- **Web Speech API** for text-to-speech
- **WebRTC** for camera access

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Google Gemini API key

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/rishi919-rgb/Drishti.git
   cd Drishti
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env` file and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5174`

## Getting Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env` file

## Usage

1. **Grant camera permissions** when prompted
2. **Point your camera** at what you want to analyze
3. **Tap "Capture & Analyze"** to take a photo and get AI analysis
4. **Listen** to the spoken description
5. **Tap "Repeat Speech"** to hear the analysis again

## Project Structure

```
src/
├── hooks/
│   └── useCamera.ts          # Camera management hook
├── services/
│   ├── gemini.ts            # Gemini API integration
│   └── speech.ts            # Text-to-speech service
├── App.tsx                  # Main application component
├── main.tsx                 # React entry point
└── vite-env.d.ts           # TypeScript environment types
```

## Key Features Explained

### Camera System
- Automatic camera startup on app load
- Environment camera preference (back camera on mobile)
- Graceful error handling for permissions
- Image capture from video stream

### AI Analysis
- Structured prompts for consistent responses
- Scene description in simple language
- Text extraction and reading
- Indian currency recognition
- Error handling for API failures

### Speech System
- Automatic text-to-speech of results
- Preferred voice selection
- Repeat speech functionality
- Fallback handling for speech errors

### Accessibility
- High contrast dark theme
- Large, accessible buttons
- Focus indicators for keyboard navigation
- Screen reader friendly
- Offline status indicator

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

- `VITE_GEMINI_API_KEY` - Your Google Gemini API key

## Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set environment variable: `VITE_GEMINI_API_KEY`
3. Deploy automatically on push to main branch

### Build Commands

- **Build command:** `npm run build`
- **Publish directory:** `dist`

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

**Note:** Requires HTTPS for camera access in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] Face recognition using face-api.js
- [ ] Obstacle detection
- [ ] Voice commands
- [ ] Multiple language support
- [ ] Image history
- [ ] Custom voice settings

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please open an issue on GitHub.
